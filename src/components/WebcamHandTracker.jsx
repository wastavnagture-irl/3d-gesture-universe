import React, { useEffect, useRef, useState } from 'react';
import {
  createHandLandmarker,
  analyzeHandGestures,
  drawHandSkeleton,
} from '../utils/handDetection';
import {
  Camera,
  CameraOff,
  Minimize2,
  Maximize2,
  RefreshCw,
  Sparkles,
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
    gesture: 'NONE',
    label: 'Place hand in webcam view',
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
        hasHand: false,
        gesture: 'NONE',
        screenX: 0,
        screenY: 0,
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
          width: { ideal: 480 },
          height: { ideal: 360 },
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

  // Main Detection Loop
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
            const landmarks = results.landmarks[0];
            const gestureInfo = analyzeHandGestures(landmarks);
            setDetectedGesture(gestureInfo);

            // Draw 21-landmark skeleton on mirrored PiP canvas
            drawHandSkeleton(ctx, landmarks, canvas.width, canvas.height, gestureInfo);

            // Calculate mirrored coordinates (-1 to 1) for Three.js
            const mirroredX = 1.0 - gestureInfo.palmCenter.x; // Webcam mirror
            const screenX = (mirroredX - 0.5) * 2.0;
            const screenY = -(gestureInfo.palmCenter.y - 0.5) * 2.0;

            // Calculate movement velocity delta
            const deltaX = mirroredX - prevPalmRef.current.x;
            const deltaY = gestureInfo.palmCenter.y - prevPalmRef.current.y;
            prevPalmRef.current = { x: mirroredX, y: gestureInfo.palmCenter.y };

            onHandUpdate?.({
              isActive: true,
              hasHand: true,
              gesture: gestureInfo.gesture,
              label: gestureInfo.label,
              icon: gestureInfo.icon,
              screenX,
              screenY,
              zDepth: gestureInfo.palmCenter.z,
              deltaX,
              deltaY,
              pinchDist: gestureInfo.pinchDist,
              extendedFingers: gestureInfo.extendedFingers,
            });
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setDetectedGesture({
              gesture: 'NONE',
              label: 'Place hand in webcam view',
              icon: '🔍',
            });
            onHandUpdate?.({
              isActive: true,
              hasHand: false,
              gesture: 'NONE',
              screenX: 0,
              screenY: 0,
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

  // Simulation fallback triggers (useful for testing gestures even if camera is off)
  const triggerSimulatedGesture = (gestureType) => {
    let label = 'Simulated Gesture';
    let icon = '🖐️';
    if (gestureType === 'OPEN_PALM') {
      label = 'Cosmic Wind Repel (Open Palm)';
      icon = '🖐️';
    } else if (gestureType === 'FIST') {
      label = 'Black Hole Singularity (Fist)';
      icon = '🕳️';
    } else if (gestureType === 'PINCH') {
      label = 'Orbital Condensation (Pinch)';
      icon = '🤏';
    } else if (gestureType === 'SWIPE') {
      label = 'Cosmic Tilt (Swipe)';
      icon = '👋';
    }

    setDetectedGesture({ gesture: gestureType, label, icon });
    onHandUpdate?.({
      isActive: true,
      hasHand: true,
      gesture: gestureType,
      label,
      icon,
      screenX: (Math.random() - 0.5) * 0.4,
      screenY: (Math.random() - 0.5) * 0.4,
      deltaX: gestureType === 'SWIPE' ? 0.08 : 0,
      deltaY: 0,
      pinchDist: gestureType === 'PINCH' ? 0.1 : 0.8,
      extendedFingers: gestureType === 'OPEN_PALM' ? 5 : gestureType === 'FIST' ? 0 : 2,
    });
  };

  if (!enabled) return null;

  return (
    <div className={`pip-webcam-container glassmorphism ${isMinimized ? 'minimized' : ''}`}>
      {/* PiP Header */}
      <div className="pip-header">
        <div className="pip-status-group">
          <span className={`pip-status-dot ${cameraError ? 'error' : modelReady ? 'active' : 'loading'}`} />
          <span className="pip-title">AI VISION SENSOR</span>
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
                <span>Loading Vision AI...</span>
              </div>
            )}

            {cameraError && (
              <div className="pip-overlay-message error">
                <CameraOff size={20} />
                <p>{cameraError}</p>
                <div className="demo-sim-hint">Try Demo Gesture Buttons Below:</div>
              </div>
            )}

            {/* Gesture Badge Overlaid on Bottom of PiP */}
            <div className={`pip-gesture-badge gesture-${detectedGesture.gesture.toLowerCase()}`}>
              <span className="gesture-badge-icon">{detectedGesture.icon}</span>
              <span className="gesture-badge-text">
                {detectedGesture.gesture === 'NONE'
                  ? 'SEARCHING HAND'
                  : detectedGesture.gesture}
              </span>
            </div>
          </div>

          {/* Quick Demo Gesture Buttons (Always handy for testing) */}
          <div className="pip-sim-buttons">
            <button
              className="sim-btn"
              onClick={() => triggerSimulatedGesture('OPEN_PALM')}
              title="Simulate Open Palm Repel"
            >
              🖐️ Repel
            </button>
            <button
              className="sim-btn"
              onClick={() => triggerSimulatedGesture('FIST')}
              title="Simulate Black Hole Fist"
            >
              🕳️ Fist
            </button>
            <button
              className="sim-btn"
              onClick={() => triggerSimulatedGesture('PINCH')}
              title="Simulate Pinch Condense"
            >
              🤏 Pinch
            </button>
            <button
              className="sim-btn"
              onClick={() => triggerSimulatedGesture('SWIPE')}
              title="Simulate Hand Swipe Tilt"
            >
              👋 Tilt
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default WebcamHandTracker;
