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

// Initialize MediaPipe HandLandmarker with WASM (Configured for 2 hands)
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
      numHands: 2, // Phase 3: Track up to two hands simultaneously
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
        numHands: 2,
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
export function dist3D(p1, p2) {
  if (!p1 || !p2) return 0;
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Analyze single hand 21 landmarks
export function analyzeSingleHand(landmarks, handIndex = 0) {
  if (!landmarks || landmarks.length < 21) {
    return {
      gesture: 'NONE',
      label: 'Searching for hand...',
      icon: '🔍',
      confidence: 0,
      palmCenter: { x: 0.5, y: 0.5, z: 0 },
      screenX: 0,
      screenY: 0,
      pinchDist: 1,
      extendedFingers: 0,
      handIndex,
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

  // Palm center: weighted average of wrist, index MCP, and middle MCP
  const palmCenter = {
    x: (wrist.x + indexMcp.x + middleMcp.x) / 3,
    y: (wrist.y + indexMcp.y + middleMcp.y) / 3,
    z: ((wrist.z || 0) + (indexMcp.z || 0) + (middleMcp.z || 0)) / 3,
  };

  // Mirrored screen coordinates (-1 to 1) for Three.js 3D raycasting
  const mirroredX = 1.0 - palmCenter.x;
  const screenX = (mirroredX - 0.5) * 2.0;
  const screenY = -(palmCenter.y - 0.5) * 2.0;

  // Hand scale reference unit (wrist to middle MCP)
  const handScale = Math.max(0.08, dist3D(wrist, middleMcp));

  // Determine if each finger is extended
  const isIndexExt = dist3D(wrist, indexTip) > dist3D(wrist, indexPip) * 1.18;
  const isMiddleExt = dist3D(wrist, middleTip) > dist3D(wrist, middlePip) * 1.18;
  const isRingExt = dist3D(wrist, ringTip) > dist3D(wrist, ringPip) * 1.18;
  const isPinkyExt = dist3D(wrist, pinkyTip) > dist3D(wrist, pinkyPip) * 1.18;
  const isThumbExt = dist3D(thumbTip, pinkyMcp) > dist3D(thumbIp, pinkyMcp) * 1.15;

  let extendedCount = 0;
  if (isThumbExt) extendedCount++;
  if (isIndexExt) extendedCount++;
  if (isMiddleExt) extendedCount++;
  if (isRingExt) extendedCount++;
  if (isPinkyExt) extendedCount++;

  // Pinch distance
  const pinchDist = dist3D(thumbTip, indexTip) / handScale;

  let gesture = 'SWIPE';
  let label = 'Cosmic Tilt (Hand Move)';
  let icon = '👋';

  if (pinchDist < 0.42 && (!isMiddleExt || !isRingExt || pinchDist < 0.28)) {
    gesture = 'PINCH';
    label = 'Orbital Condensation (Pinch)';
    icon = '🤏';
  } else if (extendedCount <= 1 || (dist3D(wrist, middleTip) < handScale * 1.1 && dist3D(wrist, indexTip) < handScale * 1.1)) {
    gesture = 'FIST';
    label = 'Black Hole Singularity (Fist)';
    icon = '🕳️';
  } else if (extendedCount >= 4) {
    gesture = 'OPEN_PALM';
    label = 'Cosmic Wind Repel (Open Palm)';
    icon = '🖐️';
  }

  return {
    handIndex,
    gesture,
    label,
    icon,
    palmCenter,
    mirroredX,
    screenX,
    screenY,
    pinchDist,
    extendedFingers: extendedCount,
    landmarks,
  };
}

// Phase 3: Comprehensive Dual-Hand Analysis
export function analyzeDualHandGestures(multiLandmarks) {
  if (!multiLandmarks || multiLandmarks.length === 0) {
    return {
      count: 0,
      hands: [],
      dualGesture: 'NONE',
      label: 'Searching for hands...',
      sublabel: 'Align 1 or 2 hands within webcam frame',
      icon: '🔍',
      themeClass: 'searching',
      hand1: null,
      hand2: null,
      handDistance: 0,
    };
  }

  // Single Hand Detected
  if (multiLandmarks.length === 1) {
    const hand1 = analyzeSingleHand(multiLandmarks[0], 0);
    return {
      count: 1,
      hands: [hand1],
      dualGesture: hand1.gesture,
      label: hand1.label,
      sublabel: `Hand 1 Active (${hand1.extendedFingers} Fingers)`,
      icon: hand1.icon,
      themeClass: hand1.gesture.toLowerCase(),
      hand1,
      hand2: null,
      handDistance: 0,
    };
  }

  // Dual Hands Detected
  // Sort so hand1 is on the left in mirrored space and hand2 is on the right
  const hA = analyzeSingleHand(multiLandmarks[0], 0);
  const hB = analyzeSingleHand(multiLandmarks[1], 1);
  const [hand1, hand2] = hA.mirroredX <= hB.mirroredX ? [hA, hB] : [hB, hA];
  hand1.handIndex = 0;
  hand2.handIndex = 1;

  // 3D Distance between the two palm centers in normalized camera space
  const handDistance = dist3D(hand1.palmCenter, hand2.palmCenter);

  // --- Phase 3 Dual-Hand Combinations ---
  // 1. Dual Singularity (Twin Black Holes): Both hands are Closed Fists
  if (hand1.gesture === 'FIST' && hand2.gesture === 'FIST') {
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'TWIN_SINGULARITIES',
      label: 'Twin Singularities (Dual Fists)',
      sublabel: 'Binary Black Holes Gravitational Collapse',
      icon: '🕳️🕳️',
      themeClass: 'twin-fists',
      hand1,
      hand2,
      handDistance,
    };
  }

  // 2. Energy Bridge / Portal: Both hands are Open Palms
  if (hand1.gesture === 'OPEN_PALM' && hand2.gesture === 'OPEN_PALM') {
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'ENERGY_BRIDGE',
      label: 'Energy Bridge Portal (Dual Palms)',
      sublabel: 'High-Density Particle Conduit Linking Hands',
      icon: '⚡',
      themeClass: 'energy-bridge',
      hand1,
      hand2,
      handDistance,
    };
  }

  // 3. Cosmic Stretch / Scale: Both hands are Pinching or Pinch + Open Stretch
  if (
    (hand1.gesture === 'PINCH' && hand2.gesture === 'PINCH') ||
    (hand1.gesture === 'PINCH' && hand2.gesture === 'OPEN_PALM') ||
    (hand2.gesture === 'PINCH' && hand1.gesture === 'OPEN_PALM')
  ) {
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'COSMIC_STRETCH',
      label: 'Cosmic Stretch / Universe Scale',
      sublabel: 'Move Hands Apart to Expand · Bring Together to Condense',
      icon: '✨',
      themeClass: 'cosmic-stretch',
      hand1,
      hand2,
      handDistance,
    };
  }

  // 4. Asymmetric Hybrid: One Fist (Gravity Well) + One Open Palm (Cosmic Wind)
  if (
    (hand1.gesture === 'FIST' && hand2.gesture === 'OPEN_PALM') ||
    (hand2.gesture === 'FIST' && hand1.gesture === 'OPEN_PALM')
  ) {
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'HYBRID_VORTEX',
      label: 'Singularity & Cosmic Wind Hybrid',
      sublabel: 'Simultaneous Inward Pull and Outward Scatter',
      icon: '🌀',
      themeClass: 'hybrid-vortex',
      hand1,
      hand2,
      handDistance,
    };
  }

  // 5. Default Dual Hand Motion
  return {
    count: 2,
    hands: [hand1, hand2],
    dualGesture: 'DUAL_TRACKING',
    label: 'Dual Hand Flight Mode',
    sublabel: 'Simultaneous Kinetic 3D Influence',
    icon: '👐',
    themeClass: 'dual-tracking',
    hand1,
    hand2,
    handDistance,
  };
}

// Phase 3: Draw Dual Hand Skeletons with distinct neon colors
export function drawDualHandSkeletons(ctx, multiLandmarks, width, height, dualInfo) {
  ctx.clearRect(0, 0, width, height);
  if (!multiLandmarks || multiLandmarks.length === 0) return;

  // Hand Color Themes:
  // Hand 1 = Electric Neon Cyan
  // Hand 2 = Neon Magenta / Violet
  const THEMES = [
    {
      bone: 'rgba(6, 182, 212, 0.85)',
      joint: '#38bdf8',
      tip: '#ffffff',
      glow: 'rgba(6, 182, 212, 0.9)',
      tagColor: '#06b6d4',
      name: 'HAND 1 (L)',
    },
    {
      bone: 'rgba(217, 70, 239, 0.85)',
      joint: '#f472b6',
      tip: '#ffffff',
      glow: 'rgba(217, 70, 239, 0.9)',
      tagColor: '#d946ef',
      name: 'HAND 2 (R)',
    },
  ];

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const handScreenCenters = [];

  // Draw each hand
  for (let h = 0; h < multiLandmarks.length && h < 2; h++) {
    const landmarks = multiLandmarks[h];
    const theme = THEMES[h] || THEMES[0];

    const points = landmarks.map(lm => ({
      x: (1.0 - lm.x) * width,
      y: lm.y * height,
    }));

    // Record palm center for connection beams
    const pCenter = {
      x: (points[0].x + points[5].x + points[9].x) / 3,
      y: (points[0].y + points[5].y + points[9].y) / 3,
    };
    handScreenCenters.push(pCenter);

    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 10;

    // 1. Bones
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = theme.bone;
    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const p1 = points[startIdx];
      const p2 = points[endIdx];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // 2. Joints
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
      const isWrist = i === 0;
      const radius = isTip ? 4.5 : isWrist ? 5.0 : 3.0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? theme.tip : theme.joint;
      ctx.fill();

      if (isTip) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = theme.bone;
        ctx.stroke();
      }
    }

    // Hand Identifier Tag above wrist
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.tagColor;
    ctx.fillText(theme.name, points[0].x - 18, points[0].y + 16);
  }

  // 3. Dual Hand Interactive Beams on PiP Preview
  if (handScreenCenters.length === 2) {
    const c1 = handScreenCenters[0];
    const c2 = handScreenCenters[1];

    if (dualInfo?.dualGesture === 'ENERGY_BRIDGE') {
      // Glowing electric stream between palms
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.9)';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 14;
      ctx.stroke();

      // Energy pulse dot
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2;
      ctx.beginPath();
      ctx.arc(midX, midY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (dualInfo?.dualGesture === 'COSMIC_STRETCH') {
      // Cosmic stretch laser line
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (dualInfo?.dualGesture === 'TWIN_SINGULARITIES') {
      // Twin vortex circles
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#d946ef';
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(c1.x, c1.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c2.x, c2.y, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}
