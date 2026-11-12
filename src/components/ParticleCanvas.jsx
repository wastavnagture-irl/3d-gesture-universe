import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  generateShapeTargets,
  generateDeflectorShieldTargets,
  generateHeartTargets,
  generateParticleColors,
  randomInSphere,
} from '../utils/shapeGenerators';
import {
  startGravitySound,
  updateGravitySound,
  stopGravitySound,
  playShockwaveSound,
  playCosmicRaySound,
  playDeflectorShieldSound,
  playCosmicSnapSound,
  playTimeFreezeSound,
  playDimensionalPortalSound,
  playLevitationSound,
  playCosmicCollapseSound,
  playVortexTornadoSound,
  playHeartMorphSound,
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
    lastRaySoundTime: 0,
    lastShieldSoundTime: 0,
    lastFreezeSoundTime: 0,
    lastPortalSoundTime: 0,
    lastLevitateSoundTime: 0,
    lastCollapseSoundTime: 0,
    lastTornadoSoundTime: 0,
    lastHeartSoundTime: 0,
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
    const shieldTargets = generateDeflectorShieldTargets(count); // Phase 4: Deflector Shield 2D Wall
    const heartTargets = generateHeartTargets(count); // Phase 6: 3D Heart Formation Morph Targets
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

    // --- Singularity 1 & Singularity 2 (Twin Black Holes) Meshes ---
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

    const singularityMesh1 = createSingularityMesh('#6366f1', '#06b6d4');
    const singularityMesh2 = createSingularityMesh('#d946ef', '#f43f5e');

    // --- 3D Dual Hand Reticles ---
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

    const reticle1 = createReticleMesh('#06b6d4');
    const reticle2 = createReticleMesh('#d946ef');

    // --- Energy Bridge 3D Visual Mesh ---
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

    // --- Phase 4: Cosmic Ray Laser Beam 3D Mesh ---
    const rayBeamGeo = new THREE.CylinderGeometry(0.06, 0.45, 45, 16, 1, true);
    const rayBeamMat = new THREE.ShaderMaterial({
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
          float pulse = sin(vUv.y * 30.0 - uTime * 14.0) * 0.5 + 0.5;
          vec3 col = mix(vec3(0.0, 0.85, 1.0), vec3(1.0, 0.9, 0.4), pulse * 0.6);
          float core = exp(-abs(vUv.x - 0.5) * 8.0);
          gl_FragColor = vec4(col, core * uAlpha * (0.7 + 0.3 * pulse));
        }
      `,
    });
    const rayBeamMesh = new THREE.Mesh(rayBeamGeo, rayBeamMat);
    rayBeamMesh.visible = false;
    scene.add(rayBeamMesh);

    // --- Phase 4: Holographic Globe Steer Gimbal Ring Mesh ---
    const holoRingGeo = new THREE.TorusGeometry(17.5, 0.08, 16, 80);
    const holoRingMat = new THREE.MeshBasicMaterial({
      color: '#a855f7',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const holoRingMesh = new THREE.Mesh(holoRingGeo, holoRingMat);
    holoRingMesh.visible = false;
    scene.add(holoRingMesh);

    // --- Phase 5: Doctor Strange Dimensional Portal 3D Mesh ---
    const portalRingGeo = new THREE.RingGeometry(0.2, 7.8, 64);
    const portalRingMat = new THREE.ShaderMaterial({
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
          vec2 centered = vUv - vec2(0.5);
          float dist = length(centered);
          float angle = atan(centered.y, centered.x);

          // Fiery swirling spark filaments
          float sparks = sin(angle * 14.0 + uTime * 12.0) * sin(dist * 35.0 - uTime * 8.0);
          float ringBand = smoothstep(0.24, 0.44, dist) * (1.0 - smoothstep(0.44, 0.5, dist));
          
          vec3 goldenAmber = vec3(1.0, 0.75, 0.18);
          vec3 fieryOrange = vec3(0.96, 0.38, 0.06);
          vec3 col = mix(fieryOrange, goldenAmber, sparks * 0.5 + 0.5);

          float edgeGlow = ringBand * (0.75 + 0.25 * sparks);
          gl_FragColor = vec4(col, edgeGlow * uAlpha);
        }
      `,
    });
    const portalRingMesh = new THREE.Mesh(portalRingGeo, portalRingMat);
    portalRingMesh.visible = false;
    scene.add(portalRingMesh);

    // --- Phase 5: Quantum Time Freeze Matrix Field Mesh ---
    const matrixFieldGeo = new THREE.PlaneGeometry(85, 65);
    const matrixFieldMat = new THREE.ShaderMaterial({
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
          float scan = sin(vUv.y * 140.0 + uTime * 4.0) * 0.5 + 0.5;
          float grid = step(0.94, fract(vUv.x * 45.0)) + step(0.94, fract(vUv.y * 35.0));
          vec3 matrixCyan = vec3(0.04, 0.88, 0.68);
          gl_FragColor = vec4(matrixCyan, (scan * 0.35 + grid * 0.55) * uAlpha);
        }
      `,
    });
    const matrixFieldMesh = new THREE.Mesh(matrixFieldGeo, matrixFieldMat);
    matrixFieldMesh.visible = false;
    scene.add(matrixFieldMesh);

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

    const hand1Target = new THREE.Vector3();
    const hand1Smoothed = new THREE.Vector3();
    const hand2Target = new THREE.Vector3();
    const hand2Smoothed = new THREE.Vector3();

    const indexTipTarget = new THREE.Vector3();
    const indexTipSmoothed = new THREE.Vector3();
    const rayDirSmoothed = new THREE.Vector3(0, 0, -1);
    const portalTarget = new THREE.Vector3();
    const portalSmoothed = new THREE.Vector3();
    const collapseMidTarget = new THREE.Vector3();
    const collapseMidSmoothed = new THREE.Vector3();

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
        maxRadius: 28 + energy * 14,
        speed: 26 + energy * 12,
        strength: energy,
        life: 1.0,
      };
      playShockwaveSound(energy);
    };

    if (triggerSupernovaRef) {
      triggerSupernovaRef.current = () => {
        triggerShockwave(new THREE.Vector3(0, 0, 0), 1.6);
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
    let deflectorShieldBlend = 0.0;
    let timeDilationBlend = 1.0; // Phase 5: Quantum Time Freeze (1.0 down to 0.05)
    let portalBlend = 0.0;       // Phase 5: Doctor Strange Dimensional Portal (0.0 to 1.0)
    let levitationBlend = 0.0;   // Phase 5: Jedi Levitation Anti-Gravity Field (0.0 to 1.0)
    let heartMorphBlend = 0.0;   // Phase 6: Shape-Shifting Morph (3D Heart)
    let cosmicCollapseBlend = 0.0; // Phase 6: Cosmic Collapse (Midpoint pull)
    let vortexTornadoBlend = 0.0;  // Phase 6: Vortex Tornado (Swirling fingers)
    let totalShaderTime = 0.0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const dt = Math.min(clock.getDelta(), 0.033);
      const elapsedTime = clock.getElapsedTime();
      const currentSpeed = stateRef.current.speed;

      // --- PHASE 4, 5 & 6: Gesture State Tracking ---
      const hand = stateRef.current.handData;
      const hasHandTracking = hand && hand.isActive && (hand.count > 0 || hand.hand1);
      const isDualHands = hasHandTracking && hand.count === 2 && hand.hand1 && hand.hand2;

      // Phase 6 Kinetic & Morph Gesture Flags
      const isHeartMorph = isDualHands && (hand.dualGesture === 'HEART_MORPH' || hand.isHeartMorph);
      const isSupernovaBlast = hasHandTracking && (hand.dualGesture === 'SUPERNOVA_BLAST' || hand.isSupernovaBlast);
      const isCosmicCollapse = isDualHands && (hand.dualGesture === 'COSMIC_COLLAPSE' || hand.isCosmicCollapse);
      const isVortexTornado = isDualHands && (hand.dualGesture === 'VORTEX_TORNADO' || hand.isVortexTornado);
      const isElasticScale = isDualHands && (hand.dualGesture === 'ELASTIC_SCALE' || hand.isElasticScale);

      // Phase 5 Quantum Gesture Flags
      const isDimensionalPortal = isDualHands && (hand.dualGesture === 'DIMENSIONAL_PORTAL' || hand.isDimensionalPortal);
      const isQuantumTimeFreeze = isDualHands && (hand.dualGesture === 'QUANTUM_FREEZE' || hand.isQuantumTimeFreeze);
      const isJediLevitation = isDualHands && (hand.dualGesture === 'JEDI_LEVITATION' || hand.isJediLevitation);

      // Phase 4 Gesture Flags
      const isCosmicRay = hasHandTracking && (hand.dualGesture === 'COSMIC_RAY' || hand.hand1?.isCosmicRay || hand.hand2?.isCosmicRay);
      const isDeflectorShield = isDualHands && hand.dualGesture === 'DEFLECTOR_SHIELD';
      const isHoloSteer = isDualHands && hand.dualGesture === 'HOLO_STEER';
      const isCosmicSnap = hasHandTracking && (hand.isCosmicSnap || hand.dualGesture === 'COSMIC_SNAP');

      // --- PHASE 5 MECHANIC 1: QUANTUM TIME FREEZE (Matrix Protocol) ---
      if (isQuantumTimeFreeze) {
        timeDilationBlend = THREE.MathUtils.lerp(timeDilationBlend, 0.05, dt * 5.0);
        const nowMs = performance.now();
        if (nowMs - stateRef.current.lastFreezeSoundTime > 1100) {
          playTimeFreezeSound();
          stateRef.current.lastFreezeSoundTime = nowMs;
        }
      } else {
        timeDilationBlend = THREE.MathUtils.lerp(timeDilationBlend, 1.0, dt * 3.2);
      }

      // Matrix scanline backdrop
      const freezeIntensity = (1.0 - timeDilationBlend) / 0.95;
      if (freezeIntensity > 0.02) {
        matrixFieldMesh.quaternion.copy(camera.quaternion);
        matrixFieldMesh.position.copy(camera.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 26.0);
        matrixFieldMat.uniforms.uTime.value = elapsedTime;
        matrixFieldMat.uniforms.uAlpha.value = freezeIntensity * 0.45;
        matrixFieldMesh.visible = true;
      } else {
        matrixFieldMesh.visible = false;
      }

      // Effective time dilation step
      const effectiveDt = dt * timeDilationBlend;
      totalShaderTime += effectiveDt * currentSpeed;

      particleMaterial.uniforms.uTime.value = totalShaderTime;
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

      let isTwinSingularities = false;
      let isEnergyBridge = false;
      let isCosmicStretch = false;

      if (hasHandTracking) {
        if (hand.hand1) {
          unprojectToPlane(hand.hand1.screenX, hand.hand1.screenY, hand1Target);
          hand1Smoothed.lerp(hand1Target, 0.16);
          reticle1.position.copy(hand1Smoothed);
          reticle1.quaternion.copy(camera.quaternion);
          reticle1.visible = true;
        } else {
          reticle1.visible = false;
        }

        if (isDualHands && hand.hand2) {
          unprojectToPlane(hand.hand2.screenX, hand.hand2.screenY, hand2Target);
          hand2Smoothed.lerp(hand2Target, 0.16);
          reticle2.position.copy(hand2Smoothed);
          reticle2.quaternion.copy(camera.quaternion);
          reticle2.visible = true;
        } else {
          reticle2.visible = false;
        }

        isTwinSingularities = isDualHands && (hand.dualGesture === 'TWIN_SINGULARITIES' || (hand.hand1?.gesture === 'FIST' && hand.hand2?.gesture === 'FIST'));
        isEnergyBridge = isDualHands && (hand.dualGesture === 'ENERGY_BRIDGE' || (hand.hand1?.gesture === 'OPEN_PALM' && hand.hand2?.gesture === 'OPEN_PALM'));
        isCosmicStretch = isDualHands && (hand.dualGesture === 'COSMIC_STRETCH');

        // --- MECHANIC 1: THE COSMIC SNAP (Supernova Blast) ---
        if (isCosmicSnap) {
          triggerShockwave(hand1Smoothed, 2.6);
          playCosmicSnapSound();
        }

        // --- MECHANIC 2: HOLOGRAPHIC GLOBE ROTATION (Dual Hand Steer) ---
        if (isHoloSteer) {
          const steerDelta = hand.steerAngleDelta || 0;
          particleSystem.rotation.z += steerDelta * 1.8;
          particleSystem.rotation.y += (hand.deltaX || 0) * 2.8;
          particleSystem.rotation.x = Math.max(-0.9, Math.min(0.9, particleSystem.rotation.x + (hand.deltaY || 0) * 2.2));

          holoRingMesh.position.set(0, 0, 0);
          holoRingMesh.rotation.copy(particleSystem.rotation);
          holoRingMat.opacity = Math.min(0.75, holoRingMat.opacity + dt * 3.0);
          holoRingMesh.visible = true;
        } else {
          holoRingMat.opacity = Math.max(0, holoRingMat.opacity - dt * 3.0);
          if (holoRingMat.opacity <= 0.01) holoRingMesh.visible = false;
        }

        // --- MECHANIC 3: COSMIC RAY (Index Finger Trace) ---
        if (isCosmicRay) {
          const rayHand = hand.activeRayHand || (hand.hand1?.isCosmicRay ? hand.hand1 : hand.hand2) || hand.hand1 || hand;
          if (rayHand.indexScreenX !== undefined) {
            unprojectToPlane(rayHand.indexScreenX, rayHand.indexScreenY, indexTipTarget);
            indexTipSmoothed.lerp(indexTipTarget, 0.2);

            const camDir = camera.getWorldDirection(new THREE.Vector3());
            const rawDir = rayHand.indexRayDir;
            const targetDir = new THREE.Vector3(rawDir?.x || 0, rawDir?.y || 0, -1).normalize();
            targetDir.applyQuaternion(camera.quaternion);
            rayDirSmoothed.lerp(targetDir, 0.15).normalize();

            // Position beam from tip extending forward
            const beamLength = 45;
            const beamMid = indexTipSmoothed.clone().addScaledVector(rayDirSmoothed, beamLength * 0.5);
            rayBeamMesh.position.copy(beamMid);
            rayBeamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rayDirSmoothed);
            rayBeamMesh.scale.set(1.0, beamLength, 1.0);
            rayBeamMat.uniforms.uTime.value = elapsedTime;
            rayBeamMat.uniforms.uAlpha.value = 0.95;
            rayBeamMesh.visible = true;

            const nowMs = performance.now();
            if (nowMs - stateRef.current.lastRaySoundTime > 260) {
              playCosmicRaySound();
              stateRef.current.lastRaySoundTime = nowMs;
            }
          }
        } else {
          rayBeamMesh.visible = false;
        }

        // --- MECHANIC 4: DEFLECTOR SHIELD (Dual Palms Forward) ---
        if (isDeflectorShield) {
          deflectorShieldBlend = Math.min(1.0, deflectorShieldBlend + dt * 2.8);
          const nowMs = performance.now();
          if (nowMs - stateRef.current.lastShieldSoundTime > 650) {
            playDeflectorShieldSound();
            stateRef.current.lastShieldSoundTime = nowMs;
          }
        } else {
          deflectorShieldBlend = Math.max(0.0, deflectorShieldBlend - dt * 2.2);
        }

        // --- PHASE 5 MECHANIC 2: DIMENSIONAL PORTAL (Doctor Strange Rift) ---
        if (isDimensionalPortal) {
          portalBlend = THREE.MathUtils.lerp(portalBlend, 1.0, dt * 4.0);
          const portScreen = hand.portalCenter || {
            screenX: (hand.hand1.screenX + hand.hand2.screenX) / 2,
            screenY: (hand.hand1.screenY + hand.hand2.screenY) / 2,
          };
          unprojectToPlane(portScreen.screenX, portScreen.screenY, portalTarget);
          portalSmoothed.lerp(portalTarget, 0.22);

          portalRingMesh.position.copy(portalSmoothed);
          portalRingMesh.quaternion.copy(camera.quaternion);
          const pScale = 0.85 + 0.35 * portalBlend + 0.06 * Math.sin(elapsedTime * 9.0);
          portalRingMesh.scale.set(pScale, pScale, pScale);
          portalRingMat.uniforms.uTime.value = elapsedTime;
          portalRingMat.uniforms.uAlpha.value = portalBlend * 0.95;
          portalRingMesh.visible = true;

          const nowMs = performance.now();
          if (nowMs - stateRef.current.lastPortalSoundTime > 750) {
            playDimensionalPortalSound();
            stateRef.current.lastPortalSoundTime = nowMs;
          }
        } else {
          portalBlend = THREE.MathUtils.lerp(portalBlend, 0.0, dt * 3.0);
          if (portalBlend > 0.01) {
            portalRingMat.uniforms.uAlpha.value = portalBlend * 0.95;
            portalRingMesh.visible = true;
          } else {
            portalRingMesh.visible = false;
          }
        }

        // --- PHASE 5 MECHANIC 3: JEDI LEVITATION (Anti-Gravity Field) ---
        if (isJediLevitation) {
          levitationBlend = THREE.MathUtils.lerp(levitationBlend, 1.0, dt * 2.8);
          const nowMs = performance.now();
          if (nowMs - stateRef.current.lastLevitateSoundTime > 1100) {
            playLevitationSound();
            stateRef.current.lastLevitateSoundTime = nowMs;
          }
        } else {
          levitationBlend = THREE.MathUtils.lerp(levitationBlend, 0.0, dt * 2.2);
        }

        // --- PHASE 6 MECHANIC 1: COSMIC COLLAPSE (Hands Close Together) ---
        if (isCosmicCollapse) {
          cosmicCollapseBlend = THREE.MathUtils.lerp(cosmicCollapseBlend, 1.0, dt * 4.0);
          const cMid = hand.collapseMid || {
            screenX: (hand.hand1.screenX + hand.hand2.screenX) / 2,
            screenY: (hand.hand1.screenY + hand.hand2.screenY) / 2,
          };
          unprojectToPlane(cMid.screenX, cMid.screenY, collapseMidTarget);
          collapseMidSmoothed.lerp(collapseMidTarget, 0.22);

          const nowMs = performance.now();
          if (nowMs - stateRef.current.lastCollapseSoundTime > 700) {
            playCosmicCollapseSound();
            stateRef.current.lastCollapseSoundTime = nowMs;
          }
        } else {
          cosmicCollapseBlend = THREE.MathUtils.lerp(cosmicCollapseBlend, 0.0, dt * 3.0);
        }

        // --- PHASE 6 MECHANIC 2: SUPERNOVA BLAST (Sudden Outward Repulsion) ---
        if (isSupernovaBlast && !stateRef.current.supernovaFired) {
          stateRef.current.supernovaFired = true;
          const blastCenter = isDualHands ? new THREE.Vector3().addVectors(hand1Smoothed, hand2Smoothed).multiplyScalar(0.5) : hand1Smoothed;
          triggerShockwave(blastCenter, 3.2);
        } else if (!isSupernovaBlast) {
          stateRef.current.supernovaFired = false;
        }

        // --- PHASE 6 MECHANIC 3: VORTEX TORNADO (Swirling Index Fingers) ---
        if (isVortexTornado) {
          vortexTornadoBlend = THREE.MathUtils.lerp(vortexTornadoBlend, 1.0, dt * 3.8);
          const cMid = hand.collapseMid || {
            screenX: (hand.hand1.screenX + hand.hand2.screenX) / 2,
            screenY: (hand.hand1.screenY + hand.hand2.screenY) / 2,
          };
          unprojectToPlane(cMid.screenX, cMid.screenY, collapseMidTarget);
          collapseMidSmoothed.lerp(collapseMidTarget, 0.22);

          const nowMs = performance.now();
          if (nowMs - stateRef.current.lastTornadoSoundTime > 600) {
            playVortexTornadoSound();
            stateRef.current.lastTornadoSoundTime = nowMs;
          }
        } else {
          vortexTornadoBlend = THREE.MathUtils.lerp(vortexTornadoBlend, 0.0, dt * 2.8);
        }

        // --- PHASE 6 MECHANIC 5: SHAPE-SHIFTING MORPH (Heart Formation) ---
        if (isHeartMorph) {
          heartMorphBlend = THREE.MathUtils.lerp(heartMorphBlend, 1.0, dt * 3.5);
          const nowMs = performance.now();
          if (nowMs - stateRef.current.lastHeartSoundTime > 900) {
            playHeartMorphSound();
            stateRef.current.lastHeartSoundTime = nowMs;
          }
        } else {
          heartMorphBlend = THREE.MathUtils.lerp(heartMorphBlend, 0.0, dt * 2.8);
        }

        // --- PHASE 6 MECHANIC 4: ELASTIC UNIVERSE (Dynamic Distance Mapping) & COSMIC STRETCH ---
        if (isElasticScale && hand.elasticScale !== undefined) {
          curScale += (hand.elasticScale - curScale) * 0.15;
        } else if (isCosmicStretch) {
          const dist3D = hand1Smoothed.distanceTo(hand2Smoothed);
          const targetScale = Math.max(0.45, Math.min(2.4, dist3D / 11.0));
          curScale += (targetScale - curScale) * 0.12;
        } else {
          curScale += (1.0 - curScale) * 0.05;
        }

        // Shockwave trigger on fist release
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
        rayBeamMesh.visible = false;
        holoRingMesh.visible = false;
        portalRingMesh.visible = false;
        matrixFieldMesh.visible = false;
        deflectorShieldBlend = Math.max(0.0, deflectorShieldBlend - dt * 2.2);
        portalBlend = Math.max(0.0, portalBlend - dt * 3.0);
        levitationBlend = Math.max(0.0, levitationBlend - dt * 2.2);
        heartMorphBlend = Math.max(0.0, heartMorphBlend - dt * 2.8);
        cosmicCollapseBlend = Math.max(0.0, cosmicCollapseBlend - dt * 3.0);
        vortexTornadoBlend = Math.max(0.0, vortexTornadoBlend - dt * 2.8);
        curScale += (1.0 - curScale) * 0.05;
        stateRef.current.prevDualGesture = 'NONE';
        stateRef.current.supernovaFired = false;
      }

      stateRef.current.universeScale = curScale;

      // Singularity Meshes
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

      // Energy Bridge Mesh
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

      // Shockwave Mesh
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

        // Normal morphology target coordinates
        let baseTx = currentTargets[k] * curScale;
        let baseTy = currentTargets[k + 1] * curScale;
        let baseTz = currentTargets[k + 2] * curScale;

        // Phase 6: Shape-Shifting Morph (3D Heart Formation)
        if (heartMorphBlend > 0.001) {
          const hTx = heartTargets[k];
          const hTy = heartTargets[k + 1];
          const hTz = heartTargets[k + 2];
          baseTx = baseTx * (1.0 - heartMorphBlend) + hTx * heartMorphBlend;
          baseTy = baseTy * (1.0 - heartMorphBlend) + hTy * heartMorphBlend;
          baseTz = baseTz * (1.0 - heartMorphBlend) + hTz * heartMorphBlend;
        }

        // Deflector Shield 2D planar targets
        let sTx = shieldTargets[k];
        let sTy = shieldTargets[k + 1];
        let sTz = shieldTargets[k + 2] + Math.sin(elapsedTime * 8.0 + sTx * 0.45 + sTy * 0.45) * 0.4;

        // Smooth Lerp Transition between Morphology and Deflector Shield Matrix
        const tx = baseTx * (1.0 - deflectorShieldBlend) + sTx * deflectorShieldBlend;
        const ty = baseTy * (1.0 - deflectorShieldBlend) + sTy * deflectorShieldBlend;
        const tz = baseTz * (1.0 - deflectorShieldBlend) + sTz * deflectorShieldBlend;

        const phase = phases[i];

        // 1. Spring-damped pull toward morph/shield target geometry
        const effectiveSpring = springK * (1.0 + deflectorShieldBlend * 1.5 + heartMorphBlend * 2.5);
        const effectiveDamping = damping * (1.0 + heartMorphBlend * 1.2);
        let ax = (tx - x) * effectiveSpring - velocities[k] * effectiveDamping;
        let ay = (ty - y) * effectiveSpring - velocities[k + 1] * effectiveDamping;
        let az = (tz - z) * effectiveSpring - velocities[k + 2] * effectiveDamping;

        // 2. Ambient orbital rotation (reduced in shield mode and heart morph mode)
        if (deflectorShieldBlend < 0.6 && heartMorphBlend < 0.95) {
          const r2D = Math.sqrt(x * x + z * z) + 1.2;
          const blendDamp = Math.max(0, 1.0 - heartMorphBlend * 1.5);
          const orbitTorque = (0.28 * currentSpeed * (1.0 - deflectorShieldBlend) * blendDamp) / r2D;
          ax += -z * orbitTorque;
          az += x * orbitTorque;

          // Multi-frequency organic curl noise
          const noiseDamp = Math.max(0, 1.0 - heartMorphBlend * 1.5);
          ax += Math.sin(elapsedTime * 0.7 + phase) * noiseAmp * noiseDamp;
          ay += Math.cos(elapsedTime * 0.55 + phase * 1.3) * noiseAmp * noiseDamp;
          az += Math.sin(elapsedTime * 0.65 + phase * 0.8) * noiseAmp * noiseDamp;
        }

        // 3. PHASE 4: COSMIC RAY (Concentrated Particle Stream)
        if (isCosmicRay) {
          const rx = x - indexTipSmoothed.x;
          const ry = y - indexTipSmoothed.y;
          const rz = z - indexTipSmoothed.z;

          // Projection onto ray direction
          const tRay = rx * rayDirSmoothed.x + ry * rayDirSmoothed.y + rz * rayDirSmoothed.z;
          if (tRay > 0 && tRay < 45.0) {
            const perpX = rx - rayDirSmoothed.x * tRay;
            const perpY = ry - rayDirSmoothed.y * tRay;
            const perpZ = rz - rayDirSmoothed.z * tRay;
            const perpDist = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ + 0.1);

            const rayRadius = 4.2;
            if (perpDist < rayRadius) {
              const falloff = 1.0 - perpDist / rayRadius;
              // Magnetic constriction toward ray axis
              const pinch = 30.0 * (falloff / perpDist);
              ax -= perpX * pinch;
              ay -= perpY * pinch;
              az -= perpZ * pinch;

              // Hyper-velocity propulsion forward along ray
              const shootSpeed = 65.0 * falloff;
              ax += rayDirSmoothed.x * shootSpeed;
              ay += rayDirSmoothed.y * shootSpeed;
              az += rayDirSmoothed.z * shootSpeed;
            }
          }
        }

        // 4. DUAL-HAND / SINGLE-HAND INTERACTIONS
        if (isTwinSingularities && heartMorphBlend < 0.2) {
          // Twin Black Holes
          const pullR = 12.0;

          const dx1 = x - hand1Smoothed.x, dy1 = y - hand1Smoothed.y, dz1 = z - hand1Smoothed.z;
          const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1 + dz1 * dz1 + 0.35);
          if (d1 < pullR) {
            const f1 = 1.0 - d1 / pullR;
            const p1 = (32.0 + stateRef.current.gravityCharge * 36.0) * gravityMult * (f1 / d1);
            ax -= dx1 * p1; ay -= dy1 * p1; az -= dz1 * p1;
            ax += -dy1 * p1 * 0.35; ay += dx1 * p1 * 0.35;
          }

          const dx2 = x - hand2Smoothed.x, dy2 = y - hand2Smoothed.y, dz2 = z - hand2Smoothed.z;
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2 + 0.35);
          if (d2 < pullR) {
            const f2 = 1.0 - d2 / pullR;
            const p2 = (32.0 + stateRef.current.gravityCharge * 36.0) * gravityMult * (f2 / d2);
            ax -= dx2 * p2; ay -= dy2 * p2; az -= dz2 * p2;
            ax += dy2 * p2 * 0.35; ay += -dx2 * p2 * 0.35;
          }
        } else if (isEnergyBridge && bridgeDir && heartMorphBlend < 0.2) {
          // Energy Bridge Portal
          const px = x - hand1Smoothed.x;
          const py = y - hand1Smoothed.y;
          const pz = z - hand1Smoothed.z;

          const t = px * bridgeDir.x + py * bridgeDir.y + pz * bridgeDir.z;
          if (t >= -1.0 && t <= bridgeLength + 1.0) {
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
              const pinchForce = 26.0 * gravityMult * (falloff / perpDist);
              ax -= perpX * pinchForce;
              ay -= perpY * pinchForce;
              az -= perpZ * pinchForce;

              const flowSpeed = (Math.sin(elapsedTime * 6.0 + phase) > 0 ? 32.0 : -32.0) * falloff;
              ax += bridgeDir.x * flowSpeed;
              ay += bridgeDir.y * flowSpeed;
              az += bridgeDir.z * flowSpeed;
            }
          }
        } else if (hasHandTracking && !isDeflectorShield && !isHoloSteer && heartMorphBlend < 0.95) {
          // Single hand or standard flight (damped when morphing to heart)
          const handDamp = Math.max(0, 1.0 - heartMorphBlend * 1.5);
          const activeHand = hand.hand1 || hand;
          const hPos = hand1Smoothed;

          const dx = x - hPos.x;
          const dy = y - hPos.y;
          const dz = z - hPos.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + 0.35);

          if (isSingleFist) {
            const pullR = 10.5 + stateRef.current.gravityCharge * 7.5;
            if (dist < pullR) {
              const falloff = 1.0 - dist / pullR;
              const pull = (30.0 + stateRef.current.gravityCharge * 45.0) * gravityMult * (falloff / dist) * handDamp;
              ax -= dx * pull; ay -= dy * pull; az -= dz * pull;
              ax += -dy * pull * 0.35; ay += dx * pull * 0.35;
            }
          } else if (activeHand.gesture === 'OPEN_PALM') {
            const repelR = 13.0;
            if (dist < repelR) {
              const falloff = 1.0 - dist / repelR;
              const scatter = 22.0 * gravityMult * (falloff / (dist + 0.4)) * handDamp;
              ax += dx * scatter; ay += dy * scatter; az += dz * scatter;
              ax += Math.sin(elapsedTime * 5.0 + y) * 2.5 * handDamp;
              ay += Math.cos(elapsedTime * 5.0 + x) * 2.5 * handDamp;
            }
          } else if (activeHand.gesture === 'PINCH') {
            const cRadius = 14.0;
            if (dist < cRadius) {
              const falloff = 1.0 - dist / cRadius;
              const pull = 32.0 * gravityMult * (falloff / (dist + 0.2)) * handDamp;
              ax -= dx * pull; ay -= dy * pull; az -= dz * pull;
            }
          } else {
            const hoverR = 6.0;
            if (dist < hoverR) {
              const falloff = 1.0 - dist / hoverR;
              const repel = 9.0 * gravityMult * (falloff / dist) * handDamp;
              const swirl = 4.5 * gravityMult * falloff * handDamp;
              ax += dx * repel - dy * swirl;
              ay += dy * repel + dx * swirl;
              az += dz * repel;
            }
          }
        } else if (stateRef.current.pointerActive) {
          // Mouse fallback
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

          if (distDiff < 3.2) {
            const waveIntensity = Math.exp(-Math.pow(distDiff / 1.2, 2)) * sw.life * sw.strength * 85.0;
            ax += (sdx / sDist) * waveIntensity;
            ay += (sdy / sDist) * waveIntensity;
            az += (sdz / sDist) * waveIntensity;
          }
        }

        // --- PHASE 5: DIMENSIONAL PORTAL PHYSICS (Doctor Strange Swirling Ring Vortex) ---
        if (portalBlend > 0.01) {
          const pdx = x - portalSmoothed.x;
          const pdy = y - portalSmoothed.y;
          const pdz = z - portalSmoothed.z;
          const pDist = Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz + 0.15);
          const portalRadius = 24.0;

          if (pDist < portalRadius) {
            const pFalloff = (1.0 - pDist / portalRadius) * portalBlend;
            // Harmonic radial lock to glowing spark ring radius (7.0 units)
            const ringRadius = 7.0;
            const ringDelta = pDist - ringRadius;
            const radialPull = 38.0 * gravityMult * pFalloff * (ringDelta / (pDist + 0.1));
            ax -= pdx * radialPull;
            ay -= pdy * radialPull;
            az -= pdz * radialPull;

            // Relativistic tangential swirl in camera plane around portal normal
            const camDir = camera.getWorldDirection(new THREE.Vector3());
            const tangX = (camDir.y * (pdz / pDist) - camDir.z * (pdy / pDist));
            const tangY = (camDir.z * (pdx / pDist) - camDir.x * (pdz / pDist));
            const tangZ = (camDir.x * (pdy / pDist) - camDir.y * (pdx / pDist));

            const swirlSpeed = 64.0 * pFalloff;
            ax += tangX * swirlSpeed;
            ay += tangY * swirlSpeed;
            az += tangZ * swirlSpeed;
          }
        }

        // --- PHASE 5: JEDI LEVITATION PHYSICS (Anti-Gravity Y-Axis Force) ---
        if (levitationBlend > 0.01) {
          const antiGravityLift = 44.0 * levitationBlend * (1.0 + 0.25 * Math.sin(elapsedTime * 3.0 + x * 0.15 + z * 0.15));
          ay += antiGravityLift;
        }

        // --- PHASE 6: COSMIC COLLAPSE PHYSICS (Dense Core Midpoint Suction) ---
        if (cosmicCollapseBlend > 0.01 && heartMorphBlend < 0.2) {
          const cdx = x - collapseMidSmoothed.x;
          const cdy = y - collapseMidSmoothed.y;
          const cdz = z - collapseMidSmoothed.z;
          const cDist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz + 0.15);
          const collapseRadius = 38.0;

          if (cDist < collapseRadius) {
            const falloff = (1.0 - cDist / collapseRadius) * cosmicCollapseBlend;
            const pull = (60.0 * gravityMult * falloff) / (cDist * 0.45 + 0.25);
            ax -= cdx * pull;
            ay -= cdy * pull;
            az -= cdz * pull;

            // Relativistic spiral compression
            ax += -cdy * pull * 0.3;
            ay += cdx * pull * 0.3;
          }
        }

        // --- PHASE 6: VORTEX TORNADO PHYSICS (Swirling Index Fingers Tornado Force) ---
        if (vortexTornadoBlend > 0.01 && heartMorphBlend < 0.2) {
          const vdx = x - collapseMidSmoothed.x;
          const vdy = y - collapseMidSmoothed.y;
          const vdz = z - collapseMidSmoothed.z;
          const r2D = Math.sqrt(vdx * vdx + vdz * vdz + 0.1);
          const tornadoRadius = 26.0;

          if (r2D < tornadoRadius && Math.abs(vdy) < 28.0) {
            const falloff = (1.0 - r2D / tornadoRadius) * vortexTornadoBlend;
            
            // High-speed tangential vortex spin around Y-axis
            const spinForce = 58.0 * falloff;
            ax += (-vdz / r2D) * spinForce;
            az += (vdx / r2D) * spinForce;

            // Centripetal inward suction towards tornado column
            const centripetal = 24.0 * gravityMult * (falloff / (r2D + 0.2));
            ax -= vdx * centripetal;
            az -= vdz * centripetal;

            // Updraft spiral force
            const updraft = 34.0 * falloff * (1.0 + 0.3 * Math.sin(elapsedTime * 6.0 + phase));
            ay += updraft;
          }
        }

        // Integrate with Quantum Matrix Time Dilation
        const dampingFactor = Math.pow(0.982, timeDilationBlend);
        velocities[k] = (velocities[k] + ax * effectiveDt) * dampingFactor;
        velocities[k + 1] = (velocities[k + 1] + ay * effectiveDt) * dampingFactor;
        velocities[k + 2] = (velocities[k + 2] + az * effectiveDt) * dampingFactor;

        let nextX = x + velocities[k] * effectiveDt;
        let nextY = y + velocities[k + 1] * effectiveDt;
        let nextZ = z + velocities[k + 2] * effectiveDt;

        // Smooth direct lerp to exact targetPositions during Heart Morph
        if (heartMorphBlend > 0.001) {
          const lerpFactor = Math.min(1.0, dt * 5.5 * heartMorphBlend);
          nextX = THREE.MathUtils.lerp(nextX, tx, lerpFactor);
          nextY = THREE.MathUtils.lerp(nextY, ty, lerpFactor);
          nextZ = THREE.MathUtils.lerp(nextZ, tz, lerpFactor);
          const velDamp = Math.max(0.0, 1.0 - heartMorphBlend * 0.1);
          velocities[k] *= velDamp;
          velocities[k + 1] *= velDamp;
          velocities[k + 2] *= velDamp;
        }

        // Jedi Levitation Endless Ascension: Wrap particles ascending past upper void
        if (levitationBlend > 0.2 && nextY > 40.0) {
          nextY = -28.0;
          velocities[k + 1] *= 0.25;
        }

        posArray[k] = nextX;
        posArray[k + 1] = nextY;
        posArray[k + 2] = nextZ;
      }

      posAttribute.needsUpdate = true;

      controls.autoRotate = stateRef.current.autoRotate && !hasHandTracking && heartMorphBlend < 0.2;
      controls.update();
      starField.rotation.y -= effectiveDt * 0.012;

      if (heartMorphBlend > 0.05) {
        particleSystem.rotation.x = THREE.MathUtils.lerp(particleSystem.rotation.x, 0, dt * 2.5);
        particleSystem.rotation.z = THREE.MathUtils.lerp(particleSystem.rotation.z, 0, dt * 2.5);
        particleSystem.rotation.y = THREE.MathUtils.lerp(particleSystem.rotation.y, 0, dt * 2.0);
      } else if (!isHoloSteer) {
        particleSystem.rotation.y += effectiveDt * 0.015;
      }

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
          timeDilation: timeDilationBlend.toFixed(2),
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
      rayBeamGeo.dispose();
      rayBeamMat.dispose();
      holoRingGeo.dispose();
      holoRingMat.dispose();
      portalRingGeo.dispose();
      portalRingMat.dispose();
      matrixFieldGeo.dispose();
      matrixFieldMat.dispose();
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
