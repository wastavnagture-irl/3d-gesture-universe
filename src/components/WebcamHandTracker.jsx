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

  // Position history for smoothing and delta calculation
  const prevPalmRef = useRef({ x: 0.5, y: 0.5 });
  const fpsCountRef = useRef({ frames: 0, lastTime: performance.now() });

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
            // Phase 3: Dual-Hand Analysis
            const dualInfo = analyzeDualHandGestures(results.landmarks);
            setDetectedGesture(dualInfo);

            // Draw both skeletons with distinct Cyan (Hand 1) & Magenta (Hand 2)
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
              deltaX,
              deltaY,
            });
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

  // Phase 3 Simulation triggers for testing Dual-Hand modes
  const triggerSimulatedDualGesture = (mode) => {
    let update = null;

    if (mode === 'TWIN_SINGULARITIES') {
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
      };
    } else if (mode === 'COSMIC_STRETCH') {
      // Toggle expanded vs condensed scale
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
      };
    } else if (mode === 'OPEN_PALM') {
      update = {
        isActive: true,
        count: 1,
        dualGesture: 'OPEN_PALM',
        label: 'Cosmic Wind Repel (Open Palm)',
        sublabel: 'Single Hand Active',
        icon: '🖐️',
        themeClass: 'open_palm',
        hand1: {
          screenX: 0,
          screenY: 0,
          gesture: 'OPEN_PALM',
          handIndex: 0,
        },
        hand2: null,
        handDistance: 0,
        deltaX: 0,
        deltaY: 0,
      };
    } else if (mode === 'FIST') {
      update = {
        isActive: true,
        count: 1,
        dualGesture: 'FIST',
        label: 'Black Hole Singularity (Fist)',
        sublabel: 'Single Hand Active',
        icon: '🕳️',
        themeClass: 'fist',
        hand1: {
          screenX: 0,
          screenY: 0,
          gesture: 'FIST',
          handIndex: 0,
        },
        hand2: null,
        handDistance: 0,
        deltaX: 0,
        deltaY: 0,
      };
    }

    if (update) {
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
          <span className="pip-title">AI VISION (DUAL HAND)</span>
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
                <span>Loading Dual-Hand Vision AI...</span>
              </div>
            )}

            {cameraError && (
              <div className="pip-overlay-message error">
                <CameraOff size={20} />
                <p>{cameraError}</p>
                <div className="demo-sim-hint">Test Dual-Hand Features Below:</div>
              </div>
            )}

            {/* Gesture Badge Overlaid on Bottom of PiP */}
            <div className={`pip-gesture-badge ${detectedGesture.count === 2 ? 'dual-hands-badge' : ''}`}>
              <span className="gesture-badge-icon">{detectedGesture.icon}</span>
              <span className="gesture-badge-text">
                {detectedGesture.count === 2 ? `DUAL HANDS: ${detectedGesture.dualGesture}` : detectedGesture.dualGesture || 'SEARCHING'}
              </span>
            </div>
          </div>

          {/* Quick Dual-Hand Simulation Buttons */}
          <div className="pip-sim-buttons dual-buttons">
            <button
              className="sim-btn twin-btn"
              onClick={() => triggerSimulatedDualGesture('TWIN_SINGULARITIES')}
              title="Simulate Twin Black Holes (Both Fists)"
            >
              🕳️🕳️ Twin Black Holes
            </button>
            <button
              className="sim-btn bridge-btn"
              onClick={() => triggerSimulatedDualGesture('ENERGY_BRIDGE')}
              title="Simulate Energy Bridge Portal (Both Palms)"
            >
              ⚡ Energy Bridge
            </button>
            <button
              className="sim-btn stretch-btn"
              onClick={() => triggerSimulatedDualGesture('COSMIC_STRETCH')}
              title="Simulate Cosmic Stretch / Scale"
            >
              ✨ Stretch / Scale
            </button>
            <button
              className="sim-btn"
              onClick={() => triggerSimulatedDualGesture('OPEN_PALM')}
              title="Simulate Single Open Palm"
            >
              🖐️ Single Repel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default WebcamHandTracker;
