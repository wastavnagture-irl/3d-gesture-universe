import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Standard 21-landmark hand connections for skeleton rendering
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],          // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],          // Index finger
  [9, 10], [10, 11], [11, 12],             // Middle finger
  [13, 14], [14, 15], [15, 16],            // Ring finger
  [0, 17], [17, 18], [18, 19], [19, 20],   // Pinky finger
  [5, 9], [9, 13], [13, 17],                // Palm knuckle ridge
];

let handLandmarkerInstance = null;
let isInitializing = false;

// Initialize MediaPipe HandLandmarker with WASM
export async function createHandLandmarker() {
  if (handLandmarkerInstance) return handLandmarkerInstance;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    return handLandmarkerInstance;
  }

  isInitializing = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    return handLandmarkerInstance;
  } catch (error) {
    console.warn('GPU delegate failed or network slow, retrying with CPU delegate...', error);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.4,
        minHandPresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      });
      return handLandmarkerInstance;
    } catch (fallbackErr) {
      console.error('Failed to initialize HandLandmarker:', fallbackErr);
      throw fallbackErr;
    }
  } finally {
    isInitializing = false;
  }
}

// 3D Euclidean distance between two landmarks
function dist3D(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Analyze 21 landmarks to detect gesture, palm center, and hand orientation
export function analyzeHandGestures(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return {
      gesture: 'NONE',
      label: 'Searching for hand...',
      icon: '🔍',
      confidence: 0,
      palmCenter: { x: 0.5, y: 0.5, z: 0 },
      pinchDist: 1,
      extendedFingers: 0,
    };
  }

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexTip = landmarks[8];
  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleTip = landmarks[12];
  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringTip = landmarks[16];
  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyTip = landmarks[20];

  // Palm center: average of wrist, index MCP, and middle MCP
  const palmCenter = {
    x: (wrist.x + indexMcp.x + middleMcp.x) / 3,
    y: (wrist.y + indexMcp.y + middleMcp.y) / 3,
    z: ((wrist.z || 0) + (indexMcp.z || 0) + (middleMcp.z || 0)) / 3,
  };

  // Hand scale / reference unit (wrist to middle MCP)
  const handScale = Math.max(0.08, dist3D(wrist, middleMcp));

  // Determine if each finger is extended:
  // A finger is extended if distance from wrist to tip is greater than wrist to PIP
  const isIndexExt = dist3D(wrist, indexTip) > dist3D(wrist, indexPip) * 1.18;
  const isMiddleExt = dist3D(wrist, middleTip) > dist3D(wrist, middlePip) * 1.18;
  const isRingExt = dist3D(wrist, ringTip) > dist3D(wrist, ringPip) * 1.18;
  const isPinkyExt = dist3D(wrist, pinkyTip) > dist3D(wrist, pinkyPip) * 1.18;

  // Thumb extended if thumb tip is far from pinky base
  const isThumbExt = dist3D(thumbTip, pinkyMcp) > dist3D(thumbIp, pinkyMcp) * 1.15;

  let extendedCount = 0;
  if (isThumbExt) extendedCount++;
  if (isIndexExt) extendedCount++;
  if (isMiddleExt) extendedCount++;
  if (isRingExt) extendedCount++;
  if (isPinkyExt) extendedCount++;

  // Pinch distance: normalized distance between thumb tip and index tip
  const pinchDist = dist3D(thumbTip, indexTip) / handScale;

  // --- Classification Rules ---
  // 1. PINCH Gesture: Thumb and Index tips touching / very close (< 0.35 of handScale)
  if (pinchDist < 0.42 && (!isMiddleExt || !isRingExt || pinchDist < 0.28)) {
    return {
      gesture: 'PINCH',
      label: 'Orbital Condensation (Pinch)',
      icon: '🤏',
      palmCenter,
      pinchDist,
      extendedFingers: extendedCount,
      confidence: Math.max(0.7, 1 - pinchDist),
    };
  }

  // 2. CLOSED FIST: At most 1 finger extended (or 0)
  if (extendedCount <= 1 || (dist3D(wrist, middleTip) < handScale * 1.1 && dist3D(wrist, indexTip) < handScale * 1.1 && dist3D(wrist, ringTip) < handScale * 1.1)) {
    return {
      gesture: 'FIST',
      label: 'Black Hole Singularity (Fist)',
      icon: '🕳️',
      palmCenter,
      pinchDist,
      extendedFingers: extendedCount,
      confidence: 0.95,
    };
  }

  // 3. OPEN PALM: 4 or 5 fingers fully extended
  if (extendedCount >= 4) {
    return {
      gesture: 'OPEN_PALM',
      label: 'Cosmic Wind Repel (Open Palm)',
      icon: '🖐️',
      palmCenter,
      pinchDist,
      extendedFingers: extendedCount,
      confidence: 0.92,
    };
  }

  // 4. POINTING / SWIPE: 2 or 3 fingers extended
  return {
    gesture: 'SWIPE',
    label: 'Cosmic Universe Tilt (Hand Swipe)',
    icon: '👋',
    palmCenter,
    pinchDist,
    extendedFingers: extendedCount,
    confidence: 0.85,
  };
}

// Draw 21 landmarks and skeleton on 2D PiP Canvas
export function drawHandSkeleton(ctx, landmarks, width, height, gestureInfo) {
  ctx.clearRect(0, 0, width, height);

  if (!landmarks || landmarks.length < 21) return;

  // Mirrored X coordinates for natural webcam preview
  const points = landmarks.map(lm => ({
    x: (1.0 - lm.x) * width,
    y: lm.y * height,
    z: lm.z || 0,
  }));

  // Theme colors based on active gesture
  let boneColor = 'rgba(6, 182, 212, 0.7)';
  let jointColor = '#38bdf8';
  let glowColor = 'rgba(6, 182, 212, 0.8)';

  if (gestureInfo.gesture === 'FIST') {
    boneColor = 'rgba(217, 70, 239, 0.85)';
    jointColor = '#e879f9';
    glowColor = 'rgba(217, 70, 239, 0.9)';
  } else if (gestureInfo.gesture === 'PINCH') {
    boneColor = 'rgba(251, 191, 36, 0.85)';
    jointColor = '#fde047';
    glowColor = 'rgba(251, 191, 36, 0.9)';
  } else if (gestureInfo.gesture === 'OPEN_PALM') {
    boneColor = 'rgba(52, 211, 153, 0.85)';
    jointColor = '#6ee7b7';
    glowColor = 'rgba(52, 211, 153, 0.9)';
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;

  // 1. Draw Skeleton Bones
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = boneColor;
  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const p1 = points[startIdx];
    const p2 = points[endIdx];
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // 2. Draw Joints / Landmarks
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
    const isWrist = i === 0;

    const radius = isTip ? 4.5 : isWrist ? 5.0 : 3.0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? '#ffffff' : jointColor;
    ctx.fill();

    // Outer ring for tips
    if (isTip) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = boneColor;
      ctx.stroke();
    }
  }

  // 3. Draw Pinch Connection indicator if Pinching
  if (gestureInfo.gesture === 'PINCH') {
    const thumb = points[4];
    const index = points[8];
    ctx.beginPath();
    ctx.arc((thumb.x + index.x) / 2, (thumb.y + index.y) / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();
  }

  ctx.restore();
}
