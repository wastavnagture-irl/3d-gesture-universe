import React, { useEffect, useRef, useState } from 'react';
import {
  createHandLandmarker,
  analyzeDualHandGestures,
  drawDualHandSkeletons,
} from '../utils/handDetection';
import {
  Camera,
  CameraOff,
  Minimize2,
  Maximize2,
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react';

const WebcamHandTracker = ({
  enabled = false,
  onToggleEnabled,
  onHandUpdate,
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const handLandmarkerRef = useRef(null);

  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState({
    count: 0,
    dualGesture: 'NONE',
    label: 'Place hand(s) in webcam view',
    icon: '🔍',
  });
  const [visionFps, setVisionFps] = useState(0);
  const [activeSimMode, setActiveSimMode] = useState(null);

  // Position history for smoothing and delta calculation
  const prevPalmRef = useRef({ x: 0.5, y: 0.5 });
  const fpsCountRef = useRef({ frames: 0, lastTime: performance.now() });
  const simulatedModeRef = useRef(null);
  const lastSimUpdateRef = useRef(null);

  // Initialize MediaPipe Model when enabled
  useEffect(() => {
    let isCancelled = false;

    if (enabled && !modelReady) {
      setIsLoadingModel(true);
      setCameraError(null);
      createHandLandmarker()
        .then((landmarker) => {
          if (!isCancelled) {
            handLandmarkerRef.current = landmarker;
            setModelReady(true);
            setIsLoadingModel(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error('HandLandmarker init error:', err);
            setCameraError('Failed to load AI model. Check network or GPU.');
            setIsLoadingModel(false);
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [enabled, modelReady]);

  // Start / Stop Webcam Stream
  useEffect(() => {
    if (!enabled) {
      stopCamera();
      onHandUpdate?.({
        isActive: false,
        count: 0,
        hands: [],
        dualGesture: 'NONE',
      });
      return;
    }

    if (modelReady) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [enabled, modelReady]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startPredictionLoop();
        };
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Enable camera access in your browser settings.'
          : 'No webcam found or camera is in use by another application.'
      );
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Main Detection Loop with Dual Hand Support
  const startPredictionLoop = () => {
    let lastVideoTime = -1;

    const predict = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = handLandmarkerRef.current;

      if (!video || !canvas || !landmarker || video.paused || video.ended) {
        animFrameRef.current = requestAnimationFrame(predict);
        return;
      }

      if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
        lastVideoTime = video.currentTime;
        const startTimeMs = performance.now();

        try {
          const results = landmarker.detectForVideo(video, startTimeMs);
          const ctx = canvas.getContext('2d');

          // Sync canvas dimensions to video
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 240;
          }

          if (results.landmarks && results.landmarks.length > 0) {
            // Real hands detected: deactivate simulation latch
            if (simulatedModeRef.current) {
              simulatedModeRef.current = null;
              lastSimUpdateRef.current = null;
              setActiveSimMode(null);
            }

            // Phase 4 & 5: Quantum & JARVIS Dual-Hand Analysis
            const dualInfo = analyzeDualHandGestures(results.landmarks);
            setDetectedGesture(dualInfo);

            // Draw both skeletons with distinct Cyan (Hand 1) & Magenta (Hand 2) + JARVIS Overlays
            drawDualHandSkeletons(ctx, results.landmarks, canvas.width, canvas.height, dualInfo);

            // Compute velocities / deltas
            const primaryHand = dualInfo.hand1 || dualInfo.hands[0];
            const deltaX = primaryHand.mirroredX - prevPalmRef.current.x;
            const deltaY = primaryHand.palmCenter.y - prevPalmRef.current.y;
            prevPalmRef.current = { x: primaryHand.mirroredX, y: primaryHand.palmCenter.y };

            onHandUpdate?.({
              isActive: true,
              count: dualInfo.count,
              dualGesture: dualInfo.dualGesture,
              label: dualInfo.label,
              sublabel: dualInfo.sublabel,
              icon: dualInfo.icon,
              themeClass: dualInfo.themeClass,
              hand1: dualInfo.hand1,
              hand2: dualInfo.hand2,
              handDistance: dualInfo.handDistance,
              steerAngleDelta: dualInfo.steerAngleDelta,
              isCosmicSnap: dualInfo.isCosmicSnap,
              activeRayHand: dualInfo.activeRayHand,
              deltaX,
              deltaY,
            });
          } else {
            // If simulation mode is active, maintain it continuously
            if (simulatedModeRef.current && lastSimUpdateRef.current) {
              onHandUpdate?.(lastSimUpdateRef.current);
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              setDetectedGesture({
                count: 0,
                dualGesture: 'NONE',
                label: 'Place hand(s) in webcam view',
                icon: '🔍',
              });
              onHandUpdate?.({
                isActive: true,
                count: 0,
                hands: [],
                dualGesture: 'NONE',
              });
            }
          }
        } catch (e) {
          console.warn('Frame detection exception:', e);
        }

        // Calculate AI vision FPS
        fpsCountRef.current.frames++;
        const now = performance.now();
        if (now - fpsCountRef.current.lastTime >= 1000) {
          setVisionFps(fpsCountRef.current.frames);
          fpsCountRef.current.frames = 0;
          fpsCountRef.current.lastTime = now;
        }
      }

      animFrameRef.current = requestAnimationFrame(predict);
    };

    animFrameRef.current = requestAnimationFrame(predict);
  };

  // Phase 4, Phase 5 & Phase 6 Simulation triggers
  const triggerSimulatedDualGesture = (mode) => {
    if (activeSimMode === mode) {
      simulatedModeRef.current = null;
      lastSimUpdateRef.current = null;
      setActiveSimMode(null);
      const reset = {
        isActive: true,
        count: 0,
        hands: [],
        dualGesture: 'NONE',
        label: 'Simulation Disengaged',
        icon: '🔍',
      };
      setDetectedGesture(reset);
      onHandUpdate?.(reset);
      return;
    }

    setActiveSimMode(mode);
    simulatedModeRef.current = mode;
    let update = null;

    if (mode === 'QUANTUM_FREEZE') {
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'QUANTUM_FREEZE',
        label: 'QUANTUM FREEZE ACTIVE',
        sublabel: 'Matrix Protocol: Global Velocity Dilated to 5% Slow-Motion',
        icon: '❄️',
        themeClass: 'quantum-freeze',
        hand1: {
          screenX: -0.35,
          screenY: -0.35,
          gesture: 'OPEN_PALM',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.35,
          screenY: -0.35,
          gesture: 'OPEN_PALM',
          handIndex: 1,
        },
        handDistance: 0.45,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
        isQuantumTimeFreeze: true,
      };
    } else if (mode === 'DIMENSIONAL_PORTAL') {
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'DIMENSIONAL_PORTAL',
        label: 'DIMENSIONAL PORTAL OPENED',
        sublabel: 'Doctor Strange Rift: High-Speed Swirling Ring Vortex Active',
        icon: '🌀',
        themeClass: 'dimensional-portal',
        hand1: {
          screenX: -0.1,
          screenY: 0.05,
          gesture: 'OPEN_PALM',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.1,
          screenY: 0.05,
          gesture: 'OPEN_PALM',
          handIndex: 1,
        },
        portalCenter: {
          screenX: 0.0,
          screenY: 0.05,
          normX: 0.5,
          normY: 0.45,
        },
        handDistance: 0.2,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
        isDimensionalPortal: true,
      };
    } else if (mode === 'JEDI_LEVITATION') {
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'JEDI_LEVITATION',
        label: 'JEDI LEVITATION ACTIVE',
        sublabel: 'Anti-Gravity Field: Inverted Gravitational Y-Axis Force',
        icon: '🛸',
        themeClass: 'jedi-levitation',
        hand1: {
          screenX: -0.4,
          screenY: 0.2,
          gesture: 'OPEN_PALM',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.4,
          screenY: 0.2,
          gesture: 'OPEN_PALM',
          handIndex: 1,
        },
        handDistance: 0.5,
        deltaX: 0,
        deltaY: 0.12,
        isCosmicSnap: false,
        isJediLevitation: true,
      };
    } else if (mode === 'COSMIC_RAY') {
      update = {
        isActive: true,
        count: 1,
        dualGesture: 'COSMIC_RAY',
        label: 'JARVIS OVERRIDE: Cosmic Ray',
        sublabel: 'Concentrated High-Velocity Particle Beam',
        icon: '⚡',
        themeClass: 'cosmic-ray',
        hand1: {
          screenX: 0.1,
          screenY: -0.15,
          gesture: 'COSMIC_RAY',
          isCosmicRay: true,
          indexScreenX: 0.1,
          indexScreenY: -0.15,
          indexRayDir: { x: 0.1, y: 0.8, z: -1.0 },
          handIndex: 0,
        },
        hand2: null,
        handDistance: 0,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
      };
    } else if (mode === 'DEFLECTOR_SHIELD') {
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'DEFLECTOR_SHIELD',
        label: 'JARVIS OVERRIDE: Deflector Shield',
        sublabel: '2D Quantum Energy Barrier Matrix Active',
        icon: '🛡️',
        themeClass: 'deflector-shield',
        hand1: {
          screenX: -0.4,
          screenY: 0.1,
          gesture: 'OPEN_PALM',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.4,
          screenY: 0.1,
          gesture: 'OPEN_PALM',
          handIndex: 1,
        },
        handDistance: 0.5,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
      };
    } else if (mode === 'HOLO_STEER') {
      // Toggle steering rotation angle
      const deltaAngle = (Math.random() - 0.5) * 0.35 + 0.15;
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'HOLO_STEER',
        label: 'JARVIS OVERRIDE: Holographic Rotation',
        sublabel: 'Kinetic Hologram Axis Steering Universe Rotation',
        icon: '🌐',
        themeClass: 'holo-steer',
        hand1: {
          screenX: -0.45,
          screenY: -0.15,
          gesture: 'SWIPE',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.45,
          screenY: 0.15,
          gesture: 'SWIPE',
          handIndex: 1,
        },
        handDistance: 0.55,
        steerAngleDelta: deltaAngle,
        deltaX: 0.08,
        deltaY: 0.04,
        isCosmicSnap: false,
      };
    } else if (mode === 'COSMIC_SNAP') {
      update = {
        isActive: true,
        count: 1,
        dualGesture: 'COSMIC_SNAP',
        label: 'JARVIS OVERRIDE: The Cosmic Snap',
        sublabel: 'Massive Radial Supernova Shockwave Detonated',
        icon: '🫰',
        themeClass: 'cosmic-snap',
        hand1: {
          screenX: 0,
          screenY: 0,
          gesture: 'COSMIC_SNAP',
          isCosmicSnap: true,
          handIndex: 0,
        },
        hand2: null,
        handDistance: 0,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: true,
      };
    } else if (mode === 'TWIN_SINGULARITIES') {
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'TWIN_SINGULARITIES',
        label: 'Twin Singularities (Dual Fists)',
        sublabel: 'Binary Black Holes Gravitational Collapse',
        icon: '🕳️🕳️',
        themeClass: 'twin-fists',
        hand1: {
          screenX: -0.45,
          screenY: 0.1,
          gesture: 'FIST',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.45,
          screenY: -0.1,
          gesture: 'FIST',
          handIndex: 1,
        },
        handDistance: 0.48,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
      };
    } else if (mode === 'ENERGY_BRIDGE') {
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'ENERGY_BRIDGE',
        label: 'Energy Bridge Portal (Dual Palms)',
        sublabel: 'High-Density Particle Conduit Linking Hands',
        icon: '⚡',
        themeClass: 'energy-bridge',
        hand1: {
          screenX: -0.5,
          screenY: 0.0,
          gesture: 'OPEN_PALM',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.5,
          screenY: 0.0,
          gesture: 'OPEN_PALM',
          handIndex: 1,
        },
        handDistance: 0.55,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
      };
    } else if (mode === 'COSMIC_STRETCH') {
      const dist = Math.random() > 0.5 ? 0.75 : 0.25;
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'COSMIC_STRETCH',
        label: 'Cosmic Stretch / Universe Scale',
        sublabel: dist > 0.5 ? 'Cosmic Expansion Active (1.8x Scale)' : 'Cosmic Condensation Active (0.6x Scale)',
        icon: '✨',
        themeClass: 'cosmic-stretch',
        hand1: {
          screenX: -dist / 2,
          screenY: 0.1,
          gesture: 'PINCH',
          handIndex: 0,
        },
        hand2: {
          screenX: dist / 2,
          screenY: -0.1,
          gesture: 'PINCH',
          handIndex: 1,
        },
        handDistance: dist,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
      };
    } else if (mode === 'COSMIC_COLLAPSE') {
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'COSMIC_COLLAPSE',
        label: 'COSMIC COLLAPSE ACTIVE',
        sublabel: 'Massive Gravitational Midpoint Pull Condensing Core',
        icon: '💥',
        themeClass: 'cosmic-collapse',
        hand1: {
          screenX: -0.06,
          screenY: 0.0,
          gesture: 'PINCH',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.06,
          screenY: 0.0,
          gesture: 'PINCH',
          handIndex: 1,
        },
        collapseMid: {
          screenX: 0.0,
          screenY: 0.0,
        },
        handDistance: 0.12,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
        isCosmicCollapse: true,
      };
    } else if (mode === 'SUPERNOVA_BLAST') {
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'SUPERNOVA_BLAST',
        label: 'SUPERNOVA BLAST DETONATED',
        sublabel: 'High-Magnitude Outward Radial Shockwave Repelling All Particles',
        icon: '💥',
        themeClass: 'supernova-blast',
        hand1: {
          screenX: -0.65,
          screenY: -0.1,
          gesture: 'OPEN_PALM',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.65,
          screenY: 0.1,
          gesture: 'OPEN_PALM',
          handIndex: 1,
        },
        handDistance: 1.3,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
        isSupernovaBlast: true,
      };
    } else if (mode === 'VORTEX_TORNADO') {
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'VORTEX_TORNADO',
        label: 'VORTEX TORNADO ENGAGED',
        sublabel: 'Dual Index Fingers: High-Velocity Rotational Updraft Funnel',
        icon: '🌪️',
        themeClass: 'vortex-tornado',
        hand1: {
          screenX: -0.15,
          screenY: 0.0,
          gesture: 'POINTING',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.15,
          screenY: 0.0,
          gesture: 'POINTING',
          handIndex: 1,
        },
        collapseMid: {
          screenX: 0.0,
          screenY: 0.0,
        },
        handDistance: 0.3,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
        isVortexTornado: true,
      };
    } else if (mode === 'ELASTIC_SCALE') {
      const scaleVal = Math.random() > 0.5 ? 2.1 : 0.45;
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'ELASTIC_SCALE',
        label: 'ELASTIC UNIVERSE SCALING',
        sublabel: `Dynamic 3D Distance Multiplier: ${scaleVal.toFixed(2)}x Scale`,
        icon: '📏',
        themeClass: 'elastic-scale',
        hand1: {
          screenX: -0.4,
          screenY: 0.0,
          gesture: 'OPEN_PALM',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.4,
          screenY: 0.0,
          gesture: 'OPEN_PALM',
          handIndex: 1,
        },
        handDistance: scaleVal * 0.28,
        elasticScale: scaleVal,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
        isElasticScale: true,
      };
    } else if (mode === 'HEART_MORPH') {
      update = {
        isActive: true,
        count: 2,
        dualGesture: 'HEART_MORPH',
        label: 'SHAPE-SHIFT: 3D HEART MORPH',
        sublabel: 'Two-Hand Heart Pose: 40,000 Particles Forming Crystalline Heart',
        icon: '❤️',
        themeClass: 'heart-morph',
        hand1: {
          screenX: -0.12,
          screenY: 0.05,
          gesture: 'PINCH',
          handIndex: 0,
        },
        hand2: {
          screenX: 0.12,
          screenY: 0.05,
          gesture: 'PINCH',
          handIndex: 1,
        },
        handDistance: 0.24,
        deltaX: 0,
        deltaY: 0,
        isCosmicSnap: false,
        isHeartMorph: true,
      };
    }

    if (update) {
      lastSimUpdateRef.current = update;
      setDetectedGesture(update);
      onHandUpdate?.(update);
    }
  };

  if (!enabled) return null;

  return (
    <div className={`pip-webcam-container glassmorphism ${isMinimized ? 'minimized' : ''}`}>
      {/* PiP Header */}
      <div className="pip-header">
        <div className="pip-status-group">
          <span className={`pip-status-dot ${cameraError ? 'error' : modelReady ? 'active' : 'loading'}`} />
          <span className="pip-title">JARVIS AI SENSOR</span>
          {modelReady && !cameraError && (
            <span className="pip-fps-badge">{visionFps} FPS</span>
          )}
        </div>
        <div className="pip-actions">
          <button
            className="pip-action-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Camera View' : 'Minimize Camera View'}
            aria-label="Toggle camera view size"
          >
            {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          <button
            className="pip-action-btn close"
            onClick={onToggleEnabled}
            title="Disable Hand Control"
            aria-label="Disable Hand Control"
          >
            <CameraOff size={12} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Video Feed & Skeleton Overlay */}
          <div className="pip-viewport">
            <video
              ref={videoRef}
              className="pip-video mirrored"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="pip-canvas"
            />

            {isLoadingModel && (
              <div className="pip-overlay-message">
                <RefreshCw size={18} className="spin-icon" />
                <span>Loading JARVIS Vision AI...</span>
              </div>
            )}

            {cameraError && (
              <div className="pip-overlay-message error">
                <CameraOff size={20} />
                <p>{cameraError}</p>
                <div className="demo-sim-hint">Trigger JARVIS Gestures Below:</div>
              </div>
            )}

            {/* Gesture Badge Overlaid on Bottom of PiP */}
            <div className={`pip-gesture-badge ${detectedGesture.count === 2 ? 'dual-hands-badge' : ''}`}>
              <span className="gesture-badge-icon">{detectedGesture.icon}</span>
              <span className="gesture-badge-text">
                {detectedGesture.label ? detectedGesture.label.replace('JARVIS OVERRIDE: ', '').replace(' ACTIVE', '') : 'SEARCHING'}
              </span>
            </div>
          </div>

          <div className="pip-sim-scroll-area">
            {/* Phase 6 Kinetic & Morph Gestures */}
            <div className="pip-sim-section-label">KINETIC & MORPH:</div>
            <div className="pip-sim-buttons kinetic-grid">
              <button
                className={`sim-btn kinetic-btn heart-btn ${activeSimMode === 'HEART_MORPH' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('HEART_MORPH')}
                title="Shape-Shifting Morph (3D Crystalline Heart)"
              >
                ❤️ Heart
              </button>
              <button
                className={`sim-btn kinetic-btn collapse-btn ${activeSimMode === 'COSMIC_COLLAPSE' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('COSMIC_COLLAPSE')}
                title="Cosmic Collapse (Midpoint Pull to Dense Core)"
              >
                💥 Collapse
              </button>
              <button
                className={`sim-btn kinetic-btn supernova-btn ${activeSimMode === 'SUPERNOVA_BLAST' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('SUPERNOVA_BLAST')}
                title="Supernova Blast (Sudden Outward Radial Repulsion)"
              >
                🌟 Supernova
              </button>
              <button
                className={`sim-btn kinetic-btn tornado-btn ${activeSimMode === 'VORTEX_TORNADO' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('VORTEX_TORNADO')}
                title="Vortex Tornado (Dual Index Tangential Spin & Updraft)"
              >
                🌪️ Tornado
              </button>
              <button
                className={`sim-btn kinetic-btn elastic-btn ${activeSimMode === 'ELASTIC_SCALE' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('ELASTIC_SCALE')}
                title="Elastic Universe (Dynamic 3D Distance Scale)"
              >
                📏 Elastic
              </button>
            </div>

            {/* Phase 5 Cinematic Quantum Gestures */}
            <div className="pip-sim-section-label">QUANTUM MATRIX:</div>
            <div className="pip-sim-buttons quantum-grid">
              <button
                className={`sim-btn quantum-btn freeze-btn ${activeSimMode === 'QUANTUM_FREEZE' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('QUANTUM_FREEZE')}
                title="Quantum Time Freeze (Matrix Protocol 0.05x)"
              >
                ❄️ Freeze
              </button>
              <button
                className={`sim-btn quantum-btn portal-btn ${activeSimMode === 'DIMENSIONAL_PORTAL' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('DIMENSIONAL_PORTAL')}
                title="Dimensional Portal (Doctor Strange Swirling Rift)"
              >
                🌀 Portal
              </button>
              <button
                className={`sim-btn quantum-btn levitate-btn ${activeSimMode === 'JEDI_LEVITATION' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('JEDI_LEVITATION')}
                title="Jedi Levitation (Anti-Gravity Field)"
              >
                🛸 Levitate
              </button>
              <button
                className={`sim-btn jarvis-btn ray-btn ${activeSimMode === 'COSMIC_RAY' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('COSMIC_RAY')}
                title="Cosmic Ray (Index Finger Trace)"
              >
                ⚡ Ray
              </button>
            </div>

            {/* Phase 4 JARVIS Gesture Simulation Buttons */}
            <div className="pip-sim-section-label">JARVIS DYNAMICS:</div>
            <div className="pip-sim-buttons jarvis-grid">
              <button
                className={`sim-btn jarvis-btn shield-btn ${activeSimMode === 'DEFLECTOR_SHIELD' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('DEFLECTOR_SHIELD')}
                title="Deflector Shield (Dual Palms Forward)"
              >
                🛡️ Shield
              </button>
              <button
                className={`sim-btn jarvis-btn steer-btn ${activeSimMode === 'HOLO_STEER' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('HOLO_STEER')}
                title="Holographic Globe Rotation (Dual Hand Steer)"
              >
                🌐 Steer
              </button>
              <button
                className={`sim-btn jarvis-btn snap-btn ${activeSimMode === 'COSMIC_SNAP' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('COSMIC_SNAP')}
                title="The Cosmic Snap (Thumb + Middle Finger Release)"
              >
                🫰 Snap
              </button>
              <button
                className={`sim-btn twin-btn ${activeSimMode === 'TWIN_SINGULARITIES' ? 'active' : ''}`}
                onClick={() => triggerSimulatedDualGesture('TWIN_SINGULARITIES')}
                title="Twin Black Holes (Both Fists)"
              >
                🕳️ Twin
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WebcamHandTracker;
