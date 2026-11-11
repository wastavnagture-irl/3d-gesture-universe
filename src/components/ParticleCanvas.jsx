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
  interactionMode = 'gravity',
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
    prevDualGesture: 'NONE',
    universeScale: 1.0,
  });

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

    // --- Singularity 1 & Singularity 2 (Twin Black Holes) Visual Meshes ---
    const createSingularityMesh = (color1, color2) => {
      const geo = new THREE.RingGeometry(0.1, 1.6, 48);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uCharge: { value: 0 },
          uCol1: { value: new THREE.Color(color1) },
          uCol2: { value: new THREE.Color(color2) },
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
          uniform vec3 uCol1;
          uniform vec3 uCol2;
          void main() {
            float dist = distance(vUv, vec2(0.5));
            float ring = sin(dist * 20.0 - uTime * 6.0) * 0.5 + 0.5;
            float alpha = smoothstep(0.5, 0.2, dist) * uCharge * 0.85;
            vec3 col = mix(uCol1, uCol2, ring);
            gl_FragColor = vec4(col, alpha);
          }
        `,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    };

    const singularityMesh1 = createSingularityMesh('#6366f1', '#06b6d4'); // Hand 1 (Cyan / Indigo)
    const singularityMesh2 = createSingularityMesh('#d946ef', '#f43f5e'); // Hand 2 (Magenta / Crimson)

    // --- 3D Dual Hand Reticles (Cyan for Hand 1, Magenta for Hand 2) ---
    const createReticleMesh = (colorHex) => {
      const geo = new THREE.RingGeometry(0.2, 0.8, 36);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uColor: { value: new THREE.Color(colorHex) },
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
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    };

    const reticle1 = createReticleMesh('#06b6d4'); // Hand 1 Cyan
    const reticle2 = createReticleMesh('#d946ef'); // Hand 2 Magenta

    // --- Phase 3: Energy Bridge 3D Visual Mesh ---
    const bridgeGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 16, 1, true);
    const bridgeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
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
        uniform float uTime;
        uniform float uAlpha;
        void main() {
          float pulse = sin(vUv.y * 18.0 - uTime * 8.0) * 0.5 + 0.5;
          vec3 col = mix(vec3(0.02, 0.75, 0.85), vec3(0.2, 0.95, 0.65), pulse);
          float edge = sin(vUv.x * 3.14159);
          gl_FragColor = vec4(col, edge * uAlpha * (0.6 + 0.4 * pulse));
        }
      `,
    });
    const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridgeMesh.visible = false;
    scene.add(bridgeMesh);

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

    // --- 3D Coordinates & Smoothing ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(999, 999);
    const pointerWorld = new THREE.Vector3();
    const planeHit = new THREE.Vector3();

    // Hand 1 & Hand 2 3D targets & lerped positions
    const hand1Target = new THREE.Vector3();
    const hand1Smoothed = new THREE.Vector3();
    const hand2Target = new THREE.Vector3();
    const hand2Smoothed = new THREE.Vector3();

    const unprojectToPlane = (screenX, screenY, outVec) => {
      const ndc = new THREE.Vector2(screenX, screenY);
      raycaster.setFromCamera(ndc, camera);
      const camDir = camera.getWorldDirection(new THREE.Vector3()).negate();
      const plane = new THREE.Plane(camDir, 0);
      if (raycaster.ray.intersectPlane(plane, planeHit)) {
        outVec.copy(planeHit);
      }
    };

    const updatePointerWorld = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      stateRef.current.pointerActive = true;
      unprojectToPlane(pointer.x, pointer.y, pointerWorld);
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

    const onPointerMove = (e) => updatePointerWorld(e.clientX, e.clientY);

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
    let curScale = 1.0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const dt = Math.min(clock.getDelta(), 0.033);
      const elapsedTime = clock.getElapsedTime();
      const currentSpeed = stateRef.current.speed;

      particleMaterial.uniforms.uTime.value = elapsedTime * currentSpeed;
      particleMaterial.uniforms.uParticleScale.value = stateRef.current.particleSize;

      // Check shape or theme change
      if (prevShape !== stateRef.current.shape) {
        prevShape = stateRef.current.shape;
        currentTargets = generateShapeTargets(prevShape, count);
        const newColors = generateParticleColors(stateRef.current.theme, currentTargets, count);
        colorAttribute.copyArray(newColors);
        colorAttribute.needsUpdate = true;
      }
      if (prevTheme !== stateRef.current.theme) {
        prevTheme = stateRef.current.theme;
        const newColors = generateParticleColors(prevTheme, currentTargets, count);
        colorAttribute.copyArray(newColors);
        colorAttribute.needsUpdate = true;
      }

      // --- PHASE 3: Dual Hand Tracking Logic ---
      const hand = stateRef.current.handData;
      const hasHandTracking = hand && hand.isActive && (hand.count > 0 || hand.hand1);
      const isDualHands = hasHandTracking && hand.count === 2 && hand.hand1 && hand.hand2;

      let isTwinSingularities = false;
      let isEnergyBridge = false;
      let isCosmicStretch = false;

      if (hasHandTracking) {
        // Project Hand 1
        if (hand.hand1) {
          unprojectToPlane(hand.hand1.screenX, hand.hand1.screenY, hand1Target);
          hand1Smoothed.lerp(hand1Target, 0.16);

          reticle1.position.copy(hand1Smoothed);
          reticle1.quaternion.copy(camera.quaternion);
          reticle1.visible = true;
        } else {
          reticle1.visible = false;
        }

        // Project Hand 2 (Dual Hands)
        if (isDualHands && hand.hand2) {
          unprojectToPlane(hand.hand2.screenX, hand.hand2.screenY, hand2Target);
          hand2Smoothed.lerp(hand2Target, 0.16);

          reticle2.position.copy(hand2Smoothed);
          reticle2.quaternion.copy(camera.quaternion);
          reticle2.visible = true;
        } else {
          reticle2.visible = false;
        }

        // Detect Dual Modes
        isTwinSingularities = isDualHands && (hand.dualGesture === 'TWIN_SINGULARITIES' || (hand.hand1?.gesture === 'FIST' && hand.hand2?.gesture === 'FIST'));
        isEnergyBridge = isDualHands && (hand.dualGesture === 'ENERGY_BRIDGE' || (hand.hand1?.gesture === 'OPEN_PALM' && hand.hand2?.gesture === 'OPEN_PALM'));
        isCosmicStretch = isDualHands && (hand.dualGesture === 'COSMIC_STRETCH');

        // 1. Cosmic Stretch Universe Scale modulation
        if (isCosmicStretch) {
          const dist3D = hand1Smoothed.distanceTo(hand2Smoothed);
          // Map distance ~6-24 to scale ~0.5x - 2.2x
          const targetScale = Math.max(0.45, Math.min(2.4, dist3D / 11.0));
          curScale += (targetScale - curScale) * 0.12;
        } else {
          // Gently return to 1.0 when not stretching
          curScale += (1.0 - curScale) * 0.05;
        }

        // 2. Hand Swipe Tilt
        if (hand.deltaX || hand.deltaY) {
          const tiltX = (hand.deltaX || 0) * 1.5;
          const tiltY = (hand.deltaY || 0) * 1.0;
          particleSystem.rotation.y += tiltX;
          particleSystem.rotation.x = Math.max(-0.6, Math.min(0.6, particleSystem.rotation.x + tiltY));
        }

        // 3. Shockwave trigger on fist release
        if (stateRef.current.prevDualGesture === 'TWIN_SINGULARITIES' && !isTwinSingularities) {
          triggerShockwave(hand1Smoothed, 1.2);
          triggerShockwave(hand2Smoothed, 1.2);
          stateRef.current.gravityCharge = 0;
          stopGravitySound();
        } else if (stateRef.current.prevDualGesture === 'FIST' && hand.dualGesture !== 'FIST' && !isTwinSingularities) {
          triggerShockwave(hand1Smoothed, 1.0);
          stateRef.current.gravityCharge = 0;
          stopGravitySound();
        }
        stateRef.current.prevDualGesture = hand.dualGesture;
      } else {
        reticle1.visible = false;
        reticle2.visible = false;
        curScale += (1.0 - curScale) * 0.05;
        stateRef.current.prevDualGesture = 'NONE';
      }

      stateRef.current.universeScale = curScale;

      // Handle Singularity Event Horizons
      const isSingleFist = hasHandTracking && !isDualHands && (hand.hand1?.gesture === 'FIST' || hand.dualGesture === 'FIST');
      const isMouseHold = !hasHandTracking && stateRef.current.isPointerDown;

      if (isTwinSingularities) {
        stateRef.current.gravityCharge = Math.min(1.0, stateRef.current.gravityCharge + dt * 0.95);
        onChargeUpdate?.(stateRef.current.gravityCharge);
        updateGravitySound(stateRef.current.gravityCharge);

        singularityMesh1.position.copy(hand1Smoothed);
        singularityMesh1.quaternion.copy(camera.quaternion);
        const s1 = 0.6 + stateRef.current.gravityCharge * 2.0;
        singularityMesh1.scale.set(s1, s1, s1);
        singularityMesh1.material.uniforms.uTime.value = elapsedTime;
        singularityMesh1.material.uniforms.uCharge.value = stateRef.current.gravityCharge;
        singularityMesh1.visible = true;

        singularityMesh2.position.copy(hand2Smoothed);
        singularityMesh2.quaternion.copy(camera.quaternion);
        const s2 = 0.6 + stateRef.current.gravityCharge * 2.0;
        singularityMesh2.scale.set(s2, s2, s2);
        singularityMesh2.material.uniforms.uTime.value = elapsedTime;
        singularityMesh2.material.uniforms.uCharge.value = stateRef.current.gravityCharge;
        singularityMesh2.visible = true;
      } else if (isSingleFist || isMouseHold) {
        const center = isSingleFist ? hand1Smoothed : pointerWorld;
        stateRef.current.gravityCharge = Math.min(1.0, stateRef.current.gravityCharge + dt * 0.95);
        onChargeUpdate?.(stateRef.current.gravityCharge);
        updateGravitySound(stateRef.current.gravityCharge);

        singularityMesh1.position.copy(center);
        singularityMesh1.quaternion.copy(camera.quaternion);
        const s1 = 0.6 + stateRef.current.gravityCharge * 2.2;
        singularityMesh1.scale.set(s1, s1, s1);
        singularityMesh1.material.uniforms.uTime.value = elapsedTime;
        singularityMesh1.material.uniforms.uCharge.value = stateRef.current.gravityCharge;
        singularityMesh1.visible = true;
        singularityMesh2.visible = false;
      } else {
        singularityMesh1.visible = false;
        singularityMesh2.visible = false;
      }

      // Handle Energy Bridge 3D Visual Mesh
      if (isEnergyBridge && hasHandTracking) {
        const bridgeVec = new THREE.Vector3().subVectors(hand2Smoothed, hand1Smoothed);
        const bridgeLen = bridgeVec.length();
        const bridgeMid = new THREE.Vector3().addVectors(hand1Smoothed, hand2Smoothed).multiplyScalar(0.5);

        bridgeMesh.position.copy(bridgeMid);
        bridgeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bridgeVec.clone().normalize());
        bridgeMesh.scale.set(1.5, bridgeLen, 1.5);
        bridgeMat.uniforms.uTime.value = elapsedTime;
        bridgeMat.uniforms.uAlpha.value = 0.85;
        bridgeMesh.visible = true;
      } else {
        bridgeMesh.visible = false;
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

      // Physics loop setup
      const gravityMult = stateRef.current.gravityStrength;
      const posArray = posAttribute.array;
      const springK = 2.4 * currentSpeed;
      const damping = 1.65;
      const noiseAmp = 0.08 * currentSpeed;

      // Energy Bridge Vector Cache
      let bridgeDir = null;
      let bridgeLength = 0;
      if (isEnergyBridge) {
        const bv = new THREE.Vector3().subVectors(hand2Smoothed, hand1Smoothed);
        bridgeLength = bv.length();
        bridgeDir = bv.normalize();
      }

      // Main Particle Physics Update Loop
      for (let i = 0; i < count; i++) {
        const k = i * 3;
        const x = posArray[k];
        const y = posArray[k + 1];
        const z = posArray[k + 2];

        // Scaled target position based on cosmic stretch
        const tx = currentTargets[k] * curScale;
        const ty = currentTargets[k + 1] * curScale;
        const tz = currentTargets[k + 2] * curScale;
        const phase = phases[i];

        // 1. Spring-damped pull toward morph target geometry
        let ax = (tx - x) * springK - velocities[k] * damping;
        let ay = (ty - y) * springK - velocities[k + 1] * damping;
        let az = (tz - z) * springK - velocities[k + 2] * damping;

        // 2. Ambient orbital rotation
        const r2D = Math.sqrt(x * x + z * z) + 1.2;
        const orbitTorque = (0.28 * currentSpeed) / r2D;
        ax += -z * orbitTorque;
        az += x * orbitTorque;

        // 3. Multi-frequency organic curl noise
        ax += Math.sin(elapsedTime * 0.7 + phase) * noiseAmp;
        ay += Math.cos(elapsedTime * 0.55 + phase * 1.3) * noiseAmp;
        az += Math.sin(elapsedTime * 0.65 + phase * 0.8) * noiseAmp;

        // 4. DUAL-HAND / SINGLE-HAND / MOUSE INTERACTIONS
        if (isTwinSingularities) {
          // --- DUAL SINGULARITY (TWIN BLACK HOLES) ---
          const pullR = 12.0;

          // Black Hole 1 (Hand 1)
          const dx1 = x - hand1Smoothed.x, dy1 = y - hand1Smoothed.y, dz1 = z - hand1Smoothed.z;
          const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1 + dz1 * dz1 + 0.35);
          if (d1 < pullR) {
            const f1 = (1.0 - d1 / pullR);
            const p1 = (32.0 + stateRef.current.gravityCharge * 36.0) * gravityMult * (f1 / d1);
            ax -= dx1 * p1; ay -= dy1 * p1; az -= dz1 * p1;
            // Vortex swirl
            ax += -dy1 * p1 * 0.35; ay += dx1 * p1 * 0.35;
          }

          // Black Hole 2 (Hand 2)
          const dx2 = x - hand2Smoothed.x, dy2 = y - hand2Smoothed.y, dz2 = z - hand2Smoothed.z;
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2 + 0.35);
          if (d2 < pullR) {
            const f2 = (1.0 - d2 / pullR);
            const p2 = (32.0 + stateRef.current.gravityCharge * 36.0) * gravityMult * (f2 / d2);
            ax -= dx2 * p2; ay -= dy2 * p2; az -= dz2 * p2;
            // Counter-vortex swirl for binary orbit!
            ax += dy2 * p2 * 0.35; ay += -dx2 * p2 * 0.35;
          }
        } else if (isEnergyBridge && bridgeDir) {
          // --- ENERGY BRIDGE / PORTAL (DUAL PALMS) ---
          const px = x - hand1Smoothed.x;
          const py = y - hand1Smoothed.y;
          const pz = z - hand1Smoothed.z;

          // Project particle onto bridge line
          const t = px * bridgeDir.x + py * bridgeDir.y + pz * bridgeDir.z;

          if (t >= -1.0 && t <= bridgeLength + 1.0) {
            // Closest point on line
            const cx = hand1Smoothed.x + bridgeDir.x * t;
            const cy = hand1Smoothed.y + bridgeDir.y * t;
            const cz = hand1Smoothed.z + bridgeDir.z * t;

            const perpX = x - cx;
            const perpY = y - cy;
            const perpZ = z - cz;
            const perpDist = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ + 0.1);

            const bridgeRadius = 7.5;
            if (perpDist < bridgeRadius) {
              const falloff = 1.0 - perpDist / bridgeRadius;
              // Magnetic confinement toward bridge core
              const pinchForce = 26.0 * gravityMult * (falloff / perpDist);
              ax -= perpX * pinchForce;
              ay -= perpY * pinchForce;
              az -= perpZ * pinchForce;

              // High-velocity stream acceleration along bridge
              const flowSpeed = (Math.sin(elapsedTime * 6.0 + phase) > 0 ? 32.0 : -32.0) * falloff;
              ax += bridgeDir.x * flowSpeed;
              ay += bridgeDir.y * flowSpeed;
              az += bridgeDir.z * flowSpeed;
            }
          }
        } else if (hasHandTracking) {
          // --- SINGLE HAND OR STANDARD DUAL TRACKING ---
          const activeHand = hand.hand1 || hand;
          const hPos = hand1Smoothed;

          const dx = x - hPos.x;
          const dy = y - hPos.y;
          const dz = z - hPos.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + 0.35);

          if (isSingleFist) {
            // Singularity
            const pullR = 10.5 + stateRef.current.gravityCharge * 7.5;
            if (dist < pullR) {
              const falloff = 1.0 - dist / pullR;
              const pull = (30.0 + stateRef.current.gravityCharge * 45.0) * gravityMult * (falloff / dist);
              ax -= dx * pull; ay -= dy * pull; az -= dz * pull;
              ax += -dy * pull * 0.35; ay += dx * pull * 0.35;
            }
          } else if (activeHand.gesture === 'OPEN_PALM') {
            // Cosmic Repel Wind
            const repelR = 13.0;
            if (dist < repelR) {
              const falloff = 1.0 - dist / repelR;
              const scatter = 22.0 * gravityMult * (falloff / (dist + 0.4));
              ax += dx * scatter; ay += dy * scatter; az += dz * scatter;
              ax += Math.sin(elapsedTime * 5.0 + y) * 2.5;
              ay += Math.cos(elapsedTime * 5.0 + x) * 2.5;
            }
          } else if (activeHand.gesture === 'PINCH') {
            // Single pinch condense
            const cRadius = 14.0;
            if (dist < cRadius) {
              const falloff = 1.0 - dist / cRadius;
              const pull = 32.0 * gravityMult * (falloff / (dist + 0.2));
              ax -= dx * pull; ay -= dy * pull; az -= dz * pull;
            }
          } else {
            // Gentle Hover swirl
            const hoverR = 6.0;
            if (dist < hoverR) {
              const falloff = 1.0 - dist / hoverR;
              const repel = 9.0 * gravityMult * (falloff / dist);
              const swirl = 4.5 * gravityMult * falloff;
              ax += dx * repel - dy * swirl;
              ay += dy * repel + dx * swirl;
              az += dz * repel;
            }
          }
        } else if (stateRef.current.pointerActive) {
          // --- MOUSE / TOUCH FALLBACK ---
          const dx = x - pointerWorld.x;
          const dy = y - pointerWorld.y;
          const dz = z - pointerWorld.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + 0.35);

          if (isMouseHold) {
            const pullR = 10.5 + stateRef.current.gravityCharge * 7.5;
            if (dist < pullR) {
              const falloff = 1.0 - dist / pullR;
              const pull = (30.0 + stateRef.current.gravityCharge * 45.0) * gravityMult * (falloff / dist);
              ax -= dx * pull; ay -= dy * pull; az -= dz * pull;
              ax += -dy * pull * 0.35; ay += dx * pull * 0.35;
            }
          } else {
            const hoverR = 6.0;
            if (dist < hoverR) {
              const falloff = 1.0 - dist / hoverR;
              const repel = 9.0 * gravityMult * (falloff / dist);
              const swirl = 4.5 * gravityMult * falloff;
              ax += dx * repel - dy * swirl;
              ay += dy * repel + dx * swirl;
              az += dz * repel;
            }
          }
        }

        // 5. Shockwave Wave Front
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

        // Integrate
        velocities[k] = (velocities[k] + ax * dt) * 0.982;
        velocities[k + 1] = (velocities[k + 1] + ay * dt) * 0.982;
        velocities[k + 2] = (velocities[k + 2] + az * dt) * 0.982;

        posArray[k] = x + velocities[k] * dt;
        posArray[k + 1] = y + velocities[k + 1] * dt;
        posArray[k + 2] = z + velocities[k + 2] * dt;
      }

      posAttribute.needsUpdate = true;

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
          handCount: hasHandTracking ? (isDualHands ? 2 : 1) : 0,
          dualGesture: hasHandTracking ? hand.dualGesture : 'NONE',
          scale: curScale.toFixed(2),
        });
        fpsFrames = 0;
        lastFpsTime = now;
      }
    };

    animate();

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
      singularityMesh1.geometry.dispose();
      singularityMesh1.material.dispose();
      singularityMesh2.geometry.dispose();
      singularityMesh2.material.dispose();
      reticle1.geometry.dispose();
      reticle1.material.dispose();
      reticle2.geometry.dispose();
      reticle2.material.dispose();
      bridgeGeo.dispose();
      bridgeMat.dispose();
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
