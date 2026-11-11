import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  generateShapeTargets,
  generateParticleColors,
  randomInSphere,
} from '../utils/shapeGenerators';
import {
  startGravitySound,
  updateGravitySound,
  stopGravitySound,
  playShockwaveSound,
} from '../utils/audio';

const ParticleCanvas = ({
  shape = 'galaxy',
  theme = 'cosmic',
  particleCount = 40000,
  interactionMode = 'gravity', // 'gravity' | 'orbit'
  particleSize = 1.0,
  speed = 1.0,
  gravityStrength = 1.0,
  autoRotate = true,
  handData = null,
  onStatsUpdate,
  onChargeUpdate,
  triggerSupernovaRef,
}) => {
  const containerRef = useRef(null);

  // References to preserve state across render cycles
  const stateRef = useRef({
    shape,
    theme,
    particleCount,
    interactionMode,
    particleSize,
    speed,
    gravityStrength,
    autoRotate,
    isPointerDown: false,
    pointerActive: false,
    gravityCharge: 0,
    shockwave: null,
    handData: null,
    prevHandGesture: 'NONE',
  });

  // Keep stateRef synchronized
  useEffect(() => {
    stateRef.current.shape = shape;
    stateRef.current.theme = theme;
    stateRef.current.particleCount = particleCount;
    stateRef.current.interactionMode = interactionMode;
    stateRef.current.particleSize = particleSize;
    stateRef.current.speed = speed;
    stateRef.current.gravityStrength = gravityStrength;
    stateRef.current.autoRotate = autoRotate;
    stateRef.current.handData = handData;
  }, [shape, theme, particleCount, interactionMode, particleSize, speed, gravityStrength, autoRotate, handData]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712');
    scene.fog = new THREE.FogExp2('#030712', 0.011);

    const camera = new THREE.PerspectiveCamera(
      58,
      container.clientWidth / container.clientHeight,
      0.1,
      250
    );
    camera.position.set(0, 8, 32);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 6;
    controls.maxDistance = 85;
    controls.autoRotate = stateRef.current.autoRotate;
    controls.autoRotateSpeed = 0.35;
    controls.target.set(0, 0, 0);

    // Deep cosmic background stars (3,000 stellar nodes)
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starPalette = ['#6366f1', '#38bdf8', '#c084fc', '#fde047', '#ffffff'].map(c => new THREE.Color(c));

    for (let i = 0; i < starCount; i++) {
      const [sx, sy, sz] = randomInSphere(75);
      starPositions[i * 3] = sx;
      starPositions[i * 3 + 1] = sy;
      starPositions[i * 3 + 2] = sz;
      const c = starPalette[Math.floor(Math.random() * starPalette.length)];
      starColors[i * 3] = c.r;
      starColors[i * 3 + 1] = c.g;
      starColors[i * 3 + 2] = c.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // --- Particle Field Setup ---
    const count = particleCount;
    let currentTargets = generateShapeTargets(shape, count);
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    // Initial positions randomized in sphere
    for (let i = 0; i < count; i++) {
      const [ix, iy, iz] = randomInSphere(12);
      positions[i * 3] = ix;
      positions[i * 3 + 1] = iy;
      positions[i * 3 + 2] = iz;

      sizes[i] = 0.8 + Math.random() * 1.8;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const colors = generateParticleColors(theme, currentTargets, count);

    const particleGeometry = new THREE.BufferGeometry();
    const posAttribute = new THREE.BufferAttribute(positions, 3);
    posAttribute.setUsage(THREE.DynamicDrawUsage);
    particleGeometry.setAttribute('position', posAttribute);

    const colorAttribute = new THREE.BufferAttribute(colors, 3);
    colorAttribute.setUsage(THREE.DynamicDrawUsage);
    particleGeometry.setAttribute('color', colorAttribute);

    particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    particleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    // Custom Shader Material for Glowing Volumetric Particles
    const particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uParticleScale: { value: particleSize },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2.0) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uParticleScale;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pulse = 0.84 + 0.16 * sin(uTime * 2.4 + aPhase);
          gl_PointSize = aSize * uParticleScale * pulse * (270.0 / -mvPosition.z) * uPixelRatio;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          float core = 1.0 - smoothstep(0.0, 0.22, d);
          float halo = exp(-d * 7.5) * 0.6;
          float alpha = core * 0.88 + halo;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // --- Singularity / Black Hole Visual Effect Mesh ---
    const singularityGeo = new THREE.RingGeometry(0.1, 1.6, 48);
    const singularityMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uCharge: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uCharge;
        void main() {
          float dist = distance(vUv, vec2(0.5));
          float ring = sin(dist * 20.0 - uTime * 6.0) * 0.5 + 0.5;
          float alpha = smoothstep(0.5, 0.2, dist) * uCharge * 0.85;
          vec3 col = mix(vec3(0.5, 0.2, 1.0), vec3(0.1, 0.9, 1.0), ring);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const singularityMesh = new THREE.Mesh(singularityGeo, singularityMat);
    singularityMesh.visible = false;
    scene.add(singularityMesh);

    // --- 3D Hand Energy Reticle ---
    const handReticleGeo = new THREE.RingGeometry(0.2, 0.8, 36);
    const handReticleMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color('#06b6d4') },
        uAlpha: { value: 0.8 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uAlpha;
        void main() {
          float dist = distance(vUv, vec2(0.5));
          float edge = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(uColor, edge * uAlpha);
        }
      `,
    });
    const handReticleMesh = new THREE.Mesh(handReticleGeo, handReticleMat);
    handReticleMesh.visible = false;
    scene.add(handReticleMesh);

    // --- Shockwave Visual Ring Mesh ---
    const shockwaveGeo = new THREE.RingGeometry(0.05, 0.6, 64);
    const shockwaveMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uAlpha: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uAlpha;
        void main() {
          float dist = distance(vUv, vec2(0.5));
          float edge = 1.0 - abs(dist - 0.35) * 4.0;
          edge = clamp(edge, 0.0, 1.0);
          gl_FragColor = vec4(0.3, 0.85, 1.0, edge * uAlpha);
        }
      `,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveMesh.visible = false;
    scene.add(shockwaveMesh);

    // --- Pointer & Raycaster Setup ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(999, 999);
    const pointerWorld = new THREE.Vector3();
    const handWorldTarget = new THREE.Vector3();
    const handWorldSmoothed = new THREE.Vector3();
    const planeHit = new THREE.Vector3();

    const updatePointerWorld = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      stateRef.current.pointerActive = true;

      raycaster.setFromCamera(pointer, camera);
      const camDir = camera.getWorldDirection(new THREE.Vector3()).negate();
      const plane = new THREE.Plane(camDir, 0);
      if (raycaster.ray.intersectPlane(plane, planeHit)) {
        pointerWorld.copy(planeHit);
      }
    };

    // Event handlers
    const onPointerMove = (e) => {
      updatePointerWorld(e.clientX, e.clientY);
    };

    const triggerShockwave = (origin, energy = 1.0) => {
      stateRef.current.shockwave = {
        origin: origin.clone(),
        radius: 0.2,
        maxRadius: 28 + energy * 12,
        speed: 26 + energy * 8,
        strength: energy,
        life: 1.0,
      };
      playShockwaveSound(energy);
    };

    if (triggerSupernovaRef) {
      triggerSupernovaRef.current = () => {
        triggerShockwave(new THREE.Vector3(0, 0, 0), 1.5);
      };
    }

    const onPointerDown = (e) => {
      if (e.button === 0) {
        updatePointerWorld(e.clientX, e.clientY);
        if (stateRef.current.interactionMode === 'gravity') {
          stateRef.current.isPointerDown = true;
          stateRef.current.gravityCharge = 0.1;
          controls.enabled = false;
          startGravitySound(0.5);
        }
      }
    };

    const onPointerUp = (e) => {
      if (stateRef.current.isPointerDown) {
        stateRef.current.isPointerDown = false;
        controls.enabled = true;
        stopGravitySound();

        const charge = Math.max(0.3, stateRef.current.gravityCharge);
        triggerShockwave(pointerWorld, charge);
        stateRef.current.gravityCharge = 0;
        onChargeUpdate?.(0);
      }
    };

    const onPointerLeave = () => {
      stateRef.current.pointerActive = false;
      if (stateRef.current.isPointerDown) {
        onPointerUp();
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointerleave', onPointerLeave);

    const onKeyDown = (e) => {
      if (e.code === 'Space' && !stateRef.current.isPointerDown && !e.repeat) {
        e.preventDefault();
        stateRef.current.isPointerDown = true;
        stateRef.current.gravityCharge = 0.1;
        startGravitySound(0.6);
      }
    };

    const onKeyUp = (e) => {
      if (e.code === 'Space' && stateRef.current.isPointerDown) {
        e.preventDefault();
        onPointerUp();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      particleMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2.0);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation & Physics Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let fpsFrames = 0;
    let lastFpsTime = performance.now();
    let prevShape = shape;
    let prevTheme = theme;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const dt = Math.min(clock.getDelta(), 0.033);
      const elapsedTime = clock.getElapsedTime();
      const currentSpeed = stateRef.current.speed;

      // Update uniforms
      particleMaterial.uniforms.uTime.value = elapsedTime * currentSpeed;
      particleMaterial.uniforms.uParticleScale.value = stateRef.current.particleSize;

      // Check shape change
      if (prevShape !== stateRef.current.shape) {
        prevShape = stateRef.current.shape;
        currentTargets = generateShapeTargets(prevShape, count);
        const newColors = generateParticleColors(stateRef.current.theme, currentTargets, count);
        colorAttribute.copyArray(newColors);
        colorAttribute.needsUpdate = true;
      }

      // Check theme change
      if (prevTheme !== stateRef.current.theme) {
        prevTheme = stateRef.current.theme;
        const newColors = generateParticleColors(prevTheme, currentTargets, count);
        colorAttribute.copyArray(newColors);
        colorAttribute.needsUpdate = true;
      }

      // --- Process AI Hand Gesture Tracking ---
      const hand = stateRef.current.handData;
      const hasHandTracking = hand && hand.isActive && hand.hasHand;

      if (hasHandTracking) {
        // Project normalized mirrored coordinates (-1 to 1) into 3D camera plane
        const handNDC = new THREE.Vector2(hand.screenX, hand.screenY);
        raycaster.setFromCamera(handNDC, camera);
        const camDir = camera.getWorldDirection(new THREE.Vector3()).negate();
        const plane = new THREE.Plane(camDir, 0);

        if (raycaster.ray.intersectPlane(plane, planeHit)) {
          handWorldTarget.copy(planeHit);
        }

        // LERP: Linear interpolation for smooth tracking without jitter
        handWorldSmoothed.lerp(handWorldTarget, 0.16);

        // Update Hand 3D Energy Reticle
        handReticleMesh.position.copy(handWorldSmoothed);
        handReticleMesh.quaternion.copy(camera.quaternion);

        if (hand.gesture === 'OPEN_PALM') {
          handReticleMat.uniforms.uColor.value.set('#34d399');
          handReticleMesh.scale.set(1.6, 1.6, 1.6);
          handReticleMesh.visible = true;
        } else if (hand.gesture === 'FIST') {
          handReticleMat.uniforms.uColor.value.set('#d946ef');
          handReticleMesh.scale.set(1.2, 1.2, 1.2);
          handReticleMesh.visible = true;
        } else if (hand.gesture === 'PINCH') {
          handReticleMat.uniforms.uColor.value.set('#fbbf24');
          handReticleMesh.scale.set(0.7, 0.7, 0.7);
          handReticleMesh.visible = true;
        } else {
          handReticleMat.uniforms.uColor.value.set('#38bdf8');
          handReticleMesh.scale.set(1.0, 1.0, 1.0);
          handReticleMesh.visible = true;
        }

        // Gesture: Hand Swipe / Movement rotates and tilts the 3D Universe
        if (hand.deltaX || hand.deltaY) {
          const tiltX = (hand.deltaX || 0) * 1.5;
          const tiltY = (hand.deltaY || 0) * 1.0;
          particleSystem.rotation.y += tiltX;
          particleSystem.rotation.x = Math.max(-0.6, Math.min(0.6, particleSystem.rotation.x + tiltY));
        }

        // Transition check: If fist was closed and then opened, detonate shockwave!
        if (stateRef.current.prevHandGesture === 'FIST' && hand.gesture !== 'FIST') {
          const charge = Math.max(0.4, stateRef.current.gravityCharge);
          triggerShockwave(handWorldSmoothed, charge);
          stateRef.current.gravityCharge = 0;
          onChargeUpdate?.(0);
          stopGravitySound();
        }

        stateRef.current.prevHandGesture = hand.gesture;
      } else {
        handReticleMesh.visible = false;
        stateRef.current.prevHandGesture = 'NONE';
      }

      // Determine active interaction point (Hand overrides Mouse when active)
      const activeInteractPoint = hasHandTracking ? handWorldSmoothed : pointerWorld;
      const isInteractionActive = hasHandTracking ? true : stateRef.current.pointerActive;

      // Handle Singularity Gravity Charge (either via Hand Fist or Mouse/Space Hold)
      const isHandFist = hasHandTracking && hand.gesture === 'FIST';
      const isBlackHoleActive = isHandFist || stateRef.current.isPointerDown;

      if (isBlackHoleActive) {
        stateRef.current.gravityCharge = Math.min(1.0, stateRef.current.gravityCharge + dt * 0.95);
        onChargeUpdate?.(stateRef.current.gravityCharge);
        updateGravitySound(stateRef.current.gravityCharge);

        singularityMesh.position.copy(activeInteractPoint);
        singularityMesh.quaternion.copy(camera.quaternion);
        const scale = 0.6 + stateRef.current.gravityCharge * 2.2;
        singularityMesh.scale.set(scale, scale, scale);
        singularityMat.uniforms.uTime.value = elapsedTime;
        singularityMat.uniforms.uCharge.value = stateRef.current.gravityCharge;
        singularityMesh.visible = true;
      } else {
        singularityMesh.visible = false;
      }

      // Handle Shockwave Mesh
      const sw = stateRef.current.shockwave;
      if (sw && sw.life > 0.01) {
        sw.radius += sw.speed * dt;
        sw.life -= dt * 1.35;
        shockwaveMesh.position.copy(sw.origin);
        shockwaveMesh.quaternion.copy(camera.quaternion);
        const rScale = sw.radius;
        shockwaveMesh.scale.set(rScale, rScale, rScale);
        shockwaveMat.uniforms.uAlpha.value = sw.life * sw.strength;
        shockwaveMesh.visible = true;
      } else {
        shockwaveMesh.visible = false;
        stateRef.current.shockwave = null;
      }

      // Physics variables
      const gravityMult = stateRef.current.gravityStrength;
      const isPinchActive = hasHandTracking && hand.gesture === 'PINCH';
      const isOpenPalmActive = hasHandTracking && hand.gesture === 'OPEN_PALM';

      const posArray = posAttribute.array;
      const springK = 2.4 * currentSpeed;
      const damping = 1.65;
      const noiseAmp = 0.08 * currentSpeed;

      // Main Particle Physics Update Loop
      for (let i = 0; i < count; i++) {
        const k = i * 3;
        const x = posArray[k];
        const y = posArray[k + 1];
        const z = posArray[k + 2];

        const tx = currentTargets[k];
        const ty = currentTargets[k + 1];
        const tz = currentTargets[k + 2];
        const phase = phases[i];

        // 1. Spring-damped pull toward target geometry
        let ax = (tx - x) * springK - velocities[k] * damping;
        let ay = (ty - y) * springK - velocities[k + 1] * damping;
        let az = (tz - z) * springK - velocities[k + 2] * damping;

        // 2. Ambient orbital rotation around Y-axis
        const r2D = Math.sqrt(x * x + z * z) + 1.2;
        const orbitTorque = (0.28 * currentSpeed) / r2D;
        ax += -z * orbitTorque;
        az += x * orbitTorque;

        // 3. Multi-frequency organic noise drift
        ax += Math.sin(elapsedTime * 0.7 + phase) * noiseAmp;
        ay += Math.cos(elapsedTime * 0.55 + phase * 1.3) * noiseAmp;
        az += Math.sin(elapsedTime * 0.65 + phase * 0.8) * noiseAmp;

        // 4. Interactive Physics (Hand Gestures or Mouse Pointer)
        if (isInteractionActive) {
          const dx = x - activeInteractPoint.x;
          const dy = y - activeInteractPoint.y;
          const dz = z - activeInteractPoint.z;
          const distSq = dx * dx + dy * dy + dz * dz + 0.35;
          const dist = Math.sqrt(distSq);

          // GESTURE 1: PINCH (Orbital Condensation into glowing dense nucleus)
          if (isPinchActive) {
            const condenseRadius = 14.0;
            if (dist < condenseRadius) {
              const condenseFalloff = (1.0 - dist / condenseRadius);
              const magneticPull = 32.0 * gravityMult * (condenseFalloff / (dist + 0.2));
              ax -= dx * magneticPull;
              ay -= dy * magneticPull;
              az -= dz * magneticPull;
              // Swirl compression
              ax += -dy * magneticPull * 0.4;
              ay += dx * magneticPull * 0.4;
            }
          }
          // GESTURE 2: CLOSED FIST (Black Hole / Singularity Gravity Well)
          else if (isBlackHoleActive) {
            const pullRadius = 10.5 + stateRef.current.gravityCharge * 7.5;
            if (dist < pullRadius) {
              const falloff = 1.0 - dist / pullRadius;
              const pullForce = (30.0 + stateRef.current.gravityCharge * 45.0) * gravityMult * (falloff / dist);
              ax -= dx * pullForce;
              ay -= dy * pullForce;
              az -= dz * pullForce;

              // Accretion vortex swirl
              const swirlStrength = pullForce * 0.35;
              ax += -dy * swirlStrength;
              ay += dx * swirlStrength;
            }
          }
          // GESTURE 3: OPEN PALM (Cosmic Wind Repel / Scattering)
          else if (isOpenPalmActive) {
            const repelRadius = 13.0;
            if (dist < repelRadius) {
              const falloff = 1.0 - dist / repelRadius;
              const scatterForce = 22.0 * gravityMult * (falloff / (dist + 0.4));
              ax += dx * scatterForce;
              ay += dy * scatterForce;
              az += dz * scatterForce;

              // Cosmic wind turbulence
              ax += Math.sin(elapsedTime * 5.0 + y) * 2.5;
              ay += Math.cos(elapsedTime * 5.0 + x) * 2.5;
            }
          }
          // GESTURE 4 / MOUSE HOVER: Gentle Swirl & Liquid Repel
          else {
            const hoverRadius = 6.0;
            if (dist < hoverRadius) {
              const falloff = 1.0 - dist / hoverRadius;
              const repel = 9.0 * gravityMult * (falloff / dist);
              const swirl = 4.5 * gravityMult * falloff;
              ax += dx * repel - dy * swirl;
              ay += dy * repel + dx * swirl;
              az += dz * repel;
            }
          }
        }

        // 5. Shockwave Blast Wave Front
        if (sw && sw.life > 0.01) {
          const sdx = x - sw.origin.x;
          const sdy = y - sw.origin.y;
          const sdz = z - sw.origin.z;
          const sDist = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz) + 0.001;
          const distDiff = Math.abs(sDist - sw.radius);

          if (distDiff < 2.8) {
            const waveIntensity = Math.exp(-Math.pow(distDiff / 1.1, 2)) * sw.life * sw.strength * 70.0;
            ax += (sdx / sDist) * waveIntensity;
            ay += (sdy / sDist) * waveIntensity;
            az += (sdz / sDist) * waveIntensity;
          }
        }

        // Velocity & Position Integration
        velocities[k] = (velocities[k] + ax * dt) * 0.982;
        velocities[k + 1] = (velocities[k + 1] + ay * dt) * 0.982;
        velocities[k + 2] = (velocities[k + 2] + az * dt) * 0.982;

        posArray[k] = x + velocities[k] * dt;
        posArray[k + 1] = y + velocities[k + 1] * dt;
        posArray[k + 2] = z + velocities[k + 2] * dt;
      }

      posAttribute.needsUpdate = true;

      // Controls update & subtle scene rotation
      controls.autoRotate = stateRef.current.autoRotate && !hasHandTracking;
      controls.update();
      starField.rotation.y -= dt * 0.012;
      particleSystem.rotation.y += dt * 0.015;

      renderer.render(scene, camera);

      // FPS Telemetry
      fpsFrames++;
      const now = performance.now();
      if (now - lastFpsTime >= 500) {
        const fps = Math.round((fpsFrames * 1000) / (now - lastFpsTime));
        onStatsUpdate?.({
          fps,
          particles: count,
          handActive: hasHandTracking,
          gesture: hasHandTracking ? hand.gesture : 'NONE',
        });
        fpsFrames = 0;
        lastFpsTime = now;
      }
    };

    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);

      stopGravitySound();
      controls.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      starGeo.dispose();
      starMat.dispose();
      singularityGeo.dispose();
      singularityMat.dispose();
      handReticleGeo.dispose();
      handReticleMat.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [particleCount]);

  return <div ref={containerRef} className="scene-mount" />;
};

export default ParticleCanvas;
