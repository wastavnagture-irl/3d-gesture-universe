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

// Per-hand state trackers for velocity and snap detection
const handStates = [
  { snapCharged: false, snapTime: 0, lastAngle: null, lastMid: null },
  { snapCharged: false, snapTime: 0, lastAngle: null, lastMid: null },
];
let lastSteerAngle = null;
let lastDualFistTime = 0;
let lastTrackedDistance = 0.5;
let lastTrackedDistanceTime = 0;

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
      numHands: 2,
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

// Analyze single hand 21 landmarks with Phase 4 JARVIS mechanics
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
      isCosmicRay: false,
      isCosmicSnap: false,
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

  // Palm center
  const palmCenter = {
    x: (wrist.x + indexMcp.x + middleMcp.x) / 3,
    y: (wrist.y + indexMcp.y + middleMcp.y) / 3,
    z: ((wrist.z || 0) + (indexMcp.z || 0) + (middleMcp.z || 0)) / 3,
  };

  // Mirrored screen coordinates (-1 to 1) for Three.js
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

  // Distances for gestures
  const pinchDist = dist3D(thumbTip, indexTip) / handScale;
  const snapDist = dist3D(thumbTip, middleTip) / handScale;

  // Phase 4: Index Finger Trace (Cosmic Ray) coordinates and direction
  const indexMirroredX = 1.0 - indexTip.x;
  const indexScreenX = (indexMirroredX - 0.5) * 2.0;
  const indexScreenY = -(indexTip.y - 0.5) * 2.0;

  // Vector from PIP to Tip
  const rawDirX = -(indexTip.x - indexPip.x);
  const rawDirY = -(indexTip.y - indexPip.y);
  const rawDirZ = -((indexTip.z || 0) - (indexPip.z || 0));
  const dirLen = Math.sqrt(rawDirX * rawDirX + rawDirY * rawDirY + rawDirZ * rawDirZ) || 1;
  const indexRayDir = {
    x: rawDirX / dirLen,
    y: rawDirY / dirLen,
    z: rawDirZ / dirLen,
  };

  const state = handStates[handIndex] || handStates[0];
  const now = performance.now();
  let isCosmicSnap = false;

  // Snap State Machine: Thumb (4) and Middle (12) collide and rapidly release
  if (snapDist < 0.32) {
    state.snapCharged = true;
    state.snapTime = now;
  } else if (state.snapCharged && now - state.snapTime < 320 && snapDist > 0.52) {
    isCosmicSnap = true;
    state.snapCharged = false;
  }

  // --- Phase 4 Gesture Recognition ---
  let gesture = 'SWIPE';
  let label = 'Cosmic Tilt (Hand Move)';
  let icon = '👋';
  let isCosmicRay = false;

  // 1. The Cosmic Snap
  if (isCosmicSnap) {
    gesture = 'COSMIC_SNAP';
    label = 'JARVIS OVERRIDE: The Cosmic Snap';
    icon = '🫰';
  }
  // 2. Cosmic Ray: ONLY Index finger extended, others curled
  else if (isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
    gesture = 'COSMIC_RAY';
    label = 'JARVIS OVERRIDE: Cosmic Ray';
    icon = '⚡';
    isCosmicRay = true;
  }
  // 3. Pinch
  else if (pinchDist < 0.42 && (!isMiddleExt || !isRingExt || pinchDist < 0.28)) {
    gesture = 'PINCH';
    label = 'Orbital Condensation (Pinch)';
    icon = '🤏';
  }
  // 4. Fist
  else if (extendedCount <= 1 || (dist3D(wrist, middleTip) < handScale * 1.1 && dist3D(wrist, indexTip) < handScale * 1.1)) {
    gesture = 'FIST';
    label = 'Black Hole Singularity (Fist)';
    icon = '🕳️';
  }
  // 5. Open Palm
  else if (extendedCount >= 4) {
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
    indexScreenX,
    indexScreenY,
    indexRayDir,
    pinchDist,
    snapDist,
    extendedFingers: extendedCount,
    isCosmicRay,
    isCosmicSnap,
    landmarks,
  };
}

// Phase 4: Advanced Dual-Hand JARVIS Gesture Analysis
export function analyzeDualHandGestures(multiLandmarks) {
  if (!multiLandmarks || multiLandmarks.length === 0) {
    lastSteerAngle = null;
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
      steerAngleDelta: 0,
      isCosmicSnap: false,
    };
  }

  // Single Hand Detected
  if (multiLandmarks.length === 1) {
    lastSteerAngle = null;
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
      steerAngleDelta: 0,
      isCosmicSnap: hand1.isCosmicSnap,
    };
  }

  // Dual Hands Detected
  const hA = analyzeSingleHand(multiLandmarks[0], 0);
  const hB = analyzeSingleHand(multiLandmarks[1], 1);
  const [hand1, hand2] = hA.mirroredX <= hB.mirroredX ? [hA, hB] : [hB, hA];
  hand1.handIndex = 0;
  hand2.handIndex = 1;

  const handDistance = dist3D(hand1.palmCenter, hand2.palmCenter);
  const now = performance.now();

  // Track Fists for rapid Supernova Blast transition
  const isBothFists =
    (hand1.gesture === 'FIST' || hand1.extendedFingers <= 1) &&
    (hand2.gesture === 'FIST' || hand2.extendedFingers <= 1);
  if (isBothFists) {
    lastDualFistTime = now;
  }

  // Calculate outward separation velocity
  const dtDist = Math.max(0.016, (now - lastTrackedDistanceTime) / 1000);
  const outwardVelocity = (handDistance - lastTrackedDistance) / dtDist;
  lastTrackedDistance = handDistance;
  lastTrackedDistanceTime = now;

  // Elastic Scale mapping: Distance mapped to global universe multiplier
  const elasticScale = Math.max(0.35, Math.min(2.6, handDistance / 0.45));

  // Midpoints for centered kinetic forces
  const collapseMidScreen = {
    screenX: (hand1.screenX + hand2.screenX) / 2,
    screenY: (hand1.screenY + hand2.screenY) / 2,
  };

  // Check for Cosmic Snap on either hand
  if (hand1.isCosmicSnap || hand2.isCosmicSnap) {
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'COSMIC_SNAP',
      label: 'JARVIS OVERRIDE: The Cosmic Snap',
      sublabel: 'Massive Radial Supernova Shockwave Detonated',
      icon: '🫰',
      themeClass: 'cosmic-snap',
      hand1,
      hand2,
      handDistance,
      steerAngleDelta: 0,
      isCosmicSnap: true,
      elasticScale,
    };
  }

  // 1. SHAPE-SHIFTING MORPH (Two-Hand Heart Formation):
  // Thumbs pointing down and touching, index fingers curved and touching at top
  const thumbDist = dist3D(hand1.landmarks[4], hand2.landmarks[4]);
  const indexDist = dist3D(hand1.landmarks[8], hand2.landmarks[8]);
  const isHeartGesture =
    thumbDist < 0.16 &&
    indexDist < 0.16 &&
    hand1.landmarks[8].y < hand1.landmarks[4].y - 0.035 &&
    hand2.landmarks[8].y < hand2.landmarks[4].y - 0.035;

  if (isHeartGesture) {
    lastSteerAngle = null;
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'HEART_MORPH',
      label: 'Heart Morph',
      sublabel: 'Two-Hand Heart: 3D Crystalline Geometry Formed',
      icon: '💖',
      themeClass: 'heart-morph',
      hand1,
      hand2,
      handDistance,
      steerAngleDelta: 0,
      isCosmicSnap: false,
      isHeartMorph: true,
      elasticScale,
    };
  }

  // 2. SUPERNOVA BLAST (Sudden Outward Repulsion):
  // Rapid state change (Fists -> Open Palms in < 0.5s) OR high outward separation velocity
  const isBothWideOpen = hand1.extendedFingers >= 4 && hand2.extendedFingers >= 4;
  const isRapidFistToPalm = (now - lastDualFistTime < 500) && (now - lastDualFistTime > 40) && isBothWideOpen;
  const isHighOutwardSpeed = outwardVelocity > 1.8 && handDistance > 0.35;

  if (isRapidFistToPalm || isHighOutwardSpeed) {
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'SUPERNOVA_BLAST',
      label: 'Supernova Blast',
      sublabel: 'Sudden Outward Repulsion Shockwave Detonated',
      icon: '🌋',
      themeClass: 'supernova-blast',
      hand1,
      hand2,
      handDistance,
      steerAngleDelta: 0,
      isCosmicSnap: false,
      isSupernovaBlast: true,
      elasticScale,
    };
  }

  // 3. VORTEX TORNADO (Swirling Index Fingers):
  // Detect when both hands have ONLY their Index Fingers extended
  const isH1IndexOnly =
    (hand1.extendedFingers === 1 && hand1.landmarks[8].y < hand1.landmarks[6].y) || hand1.isCosmicRay;
  const isH2IndexOnly =
    (hand2.extendedFingers === 1 && hand2.landmarks[8].y < hand2.landmarks[6].y) || hand2.isCosmicRay;

  if (isH1IndexOnly && isH2IndexOnly) {
    lastSteerAngle = null;
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'VORTEX_TORNADO',
      label: 'Vortex Tornado',
      sublabel: 'Dual Index Fingers: High-Speed Rotational Funnel Active',
      icon: '🌪️',
      themeClass: 'vortex-tornado',
      hand1,
      hand2,
      handDistance,
      collapseMid: collapseMidScreen,
      steerAngleDelta: 0,
      isCosmicSnap: false,
      isVortexTornado: true,
      elasticScale,
    };
  }

  // 4. COSMIC COLLAPSE (Hands Close Together):
  // When hands move very close (distance < 0.22) and not in Fists or Heart
  if (handDistance < 0.22 && !isBothFists && !isHeartGesture) {
    lastSteerAngle = null;
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'COSMIC_COLLAPSE',
      label: 'Cosmic Collapse',
      sublabel: 'Hands Close: Gravitational Implosion into Dense Core',
      icon: '💥',
      themeClass: 'cosmic-collapse',
      hand1,
      hand2,
      handDistance,
      collapseMid: collapseMidScreen,
      steerAngleDelta: 0,
      isCosmicSnap: false,
      isCosmicCollapse: true,
      elasticScale,
    };
  }

  // ===================================================================
  // --- PHASE 5: CINEMATIC QUANTUM GESTURES ---
  // ===================================================================

  // 1. DIMENSIONAL PORTAL (Doctor Strange Rift):
  // Detect Diamond/Triangle aperture where Thumb tips touch AND Index tips touch
  const avgHandScale = (dist3D(hand1.landmarks[0], hand1.landmarks[9]) + dist3D(hand2.landmarks[0], hand2.landmarks[9])) / 2 || 0.15;
  const isDimensionalPortal =
    (thumbDist < 0.14 || thumbDist / avgHandScale < 0.88) &&
    (indexDist < 0.14 || indexDist / avgHandScale < 0.88) &&
    hand1.extendedFingers >= 2 &&
    hand2.extendedFingers >= 2;

  if (isDimensionalPortal) {
    lastSteerAngle = null;
    const p1 = hand1.landmarks[4];
    const p2 = hand2.landmarks[4];
    const p3 = hand1.landmarks[8];
    const p4 = hand2.landmarks[8];
    const portalNormX = (p1.x + p2.x + p3.x + p4.x) / 4;
    const portalNormY = (p1.y + p2.y + p3.y + p4.y) / 4;
    const portalMirroredX = 1.0 - portalNormX;
    const portalScreenX = (portalMirroredX - 0.5) * 2.0;
    const portalScreenY = -(portalNormY - 0.5) * 2.0;

    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'DIMENSIONAL_PORTAL',
      label: 'DIMENSIONAL PORTAL OPENED',
      sublabel: 'Doctor Strange Rift: High-Speed Swirling Ring Vortex Active',
      icon: '🌀',
      themeClass: 'dimensional-portal',
      hand1,
      hand2,
      handDistance,
      steerAngleDelta: 0,
      isCosmicSnap: false,
      isDimensionalPortal: true,
      portalCenter: {
        screenX: portalScreenX,
        screenY: portalScreenY,
        normX: portalMirroredX,
        normY: portalNormY,
      },
    };
  }

  // 2. QUANTUM TIME FREEZE (Matrix Protocol):
  // Detect both hands Open Palms facing completely DOWNWARDS (fingertips significantly lower than wrist in 2D image)
  const isHand1PointingDown =
    hand1.extendedFingers >= 4 &&
    hand1.landmarks[8].y > hand1.landmarks[0].y + 0.06 &&
    hand1.landmarks[12].y > hand1.landmarks[0].y + 0.06;
  const isHand2PointingDown =
    hand2.extendedFingers >= 4 &&
    hand2.landmarks[8].y > hand2.landmarks[0].y + 0.06 &&
    hand2.landmarks[12].y > hand2.landmarks[0].y + 0.06;

  if (isHand1PointingDown && isHand2PointingDown) {
    lastSteerAngle = null;
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'QUANTUM_FREEZE',
      label: 'QUANTUM FREEZE ACTIVE',
      sublabel: 'Matrix Protocol: Global Velocity Dilated to 5% Slow-Motion',
      icon: '❄️',
      themeClass: 'quantum-freeze',
      hand1,
      hand2,
      handDistance,
      steerAngleDelta: 0,
      isCosmicSnap: false,
      isQuantumTimeFreeze: true,
    };
  }

  // 3. JEDI LEVITATION (Anti-Gravity Field):
  // Detect both hands Open Palms facing flat UPWARDS (fingertips pointing away/up, palms flat, wrists lower than palm center)
  const isHand1Levitating =
    hand1.extendedFingers >= 4 &&
    hand1.landmarks[0].y > hand1.landmarks[9].y + 0.03 &&
    Math.abs(hand1.landmarks[8].y - hand1.landmarks[16].y) < 0.12 &&
    (hand1.landmarks[0].y - hand1.landmarks[8].y) < 0.18; // Flat or moderate upward angle, not full vertical wall
  const isHand2Levitating =
    hand2.extendedFingers >= 4 &&
    hand2.landmarks[0].y > hand2.landmarks[9].y + 0.03 &&
    Math.abs(hand2.landmarks[8].y - hand2.landmarks[16].y) < 0.12 &&
    (hand2.landmarks[0].y - hand2.landmarks[8].y) < 0.18;

  if (isHand1Levitating && isHand2Levitating) {
    lastSteerAngle = null;
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'JEDI_LEVITATION',
      label: 'JEDI LEVITATION ACTIVE',
      sublabel: 'Anti-Gravity Field: Inverted Gravitational Y-Axis Force',
      icon: '🛸',
      themeClass: 'jedi-levitation',
      hand1,
      hand2,
      handDistance,
      steerAngleDelta: 0,
      isCosmicSnap: false,
      isJediLevitation: true,
    };
  }

  // --- Phase 4 Gesture 1: DEFLECTOR SHIELD (Dual Palms Forward) ---
  // Both hands have Open Palms (>= 4 fingers), pointing vertically upward, facing camera
  const isHand1PointingUp = hand1.landmarks[0].y > hand1.landmarks[8].y + 0.14 && hand1.extendedFingers >= 4;
  const isHand2PointingUp = hand2.landmarks[0].y > hand2.landmarks[8].y + 0.14 && hand2.extendedFingers >= 4;

  if (isHand1PointingUp && isHand2PointingUp) {
    lastSteerAngle = null;
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'DEFLECTOR_SHIELD',
      label: 'JARVIS OVERRIDE: Deflector Shield',
      sublabel: '2D Quantum Energy Barrier Matrix Active',
      icon: '🛡️',
      themeClass: 'deflector-shield',
      hand1,
      hand2,
      handDistance,
      steerAngleDelta: 0,
      isCosmicSnap: false,
    };
  }

  // --- Phase 4 Gesture 2: HOLOGRAPHIC GLOBE ROTATION (Dual Hand Steer) ---
  // Both hands are partially relaxed/steering, calculating rotation angle
  const currentAngle = Math.atan2(
    hand2.palmCenter.y - hand1.palmCenter.y,
    hand2.mirroredX - hand1.mirroredX
  );

  let steerAngleDelta = 0;
  if (lastSteerAngle !== null) {
    let diff = currentAngle - lastSteerAngle;
    // Normalize angle delta across [-PI, PI]
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    steerAngleDelta = diff;
  }
  lastSteerAngle = currentAngle;

  const isSteeringPosture =
    hand1.extendedFingers >= 2 &&
    hand2.extendedFingers >= 2 &&
    hand1.gesture !== 'FIST' &&
    hand2.gesture !== 'FIST' &&
    hand1.gesture !== 'PINCH' &&
    hand2.gesture !== 'PINCH';

  if (isSteeringPosture && (Math.abs(steerAngleDelta) > 0.015 || Math.abs(currentAngle) > 0.15)) {
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'HOLO_STEER',
      label: 'JARVIS OVERRIDE: Holographic Rotation',
      sublabel: 'Circular Kinetic Axis Steering Universe Rotation',
      icon: '🌐',
      themeClass: 'holo-steer',
      hand1,
      hand2,
      handDistance,
      steerAngleDelta,
      currentAngle,
      isCosmicSnap: false,
    };
  }

  // Cosmic Ray from Hand 1 or Hand 2
  if (hand1.isCosmicRay || hand2.isCosmicRay) {
    const activeRayHand = hand1.isCosmicRay ? hand1 : hand2;
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'COSMIC_RAY',
      label: 'JARVIS OVERRIDE: Cosmic Ray',
      sublabel: 'High-Velocity Focused Particle Beam Trace',
      icon: '⚡',
      themeClass: 'cosmic-ray',
      hand1,
      hand2,
      handDistance,
      steerAngleDelta: 0,
      isCosmicSnap: false,
      activeRayHand,
    };
  }

  // Twin Singularities (Dual Fists)
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
      steerAngleDelta: 0,
      isCosmicSnap: false,
    };
  }

  // Energy Bridge Portal (Dual Palms)
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
      steerAngleDelta: 0,
      isCosmicSnap: false,
    };
  }

  // 5. ELASTIC SCALE / COSMIC STRETCH (Continuous Distance Mapping)
  if (
    (hand1.gesture === 'PINCH' && hand2.gesture === 'PINCH') ||
    (hand1.gesture === 'PINCH' && hand2.gesture === 'OPEN_PALM') ||
    (hand2.gesture === 'PINCH' && hand1.gesture === 'OPEN_PALM') ||
    Math.abs(elasticScale - 1.0) > 0.22
  ) {
    return {
      count: 2,
      hands: [hand1, hand2],
      dualGesture: 'ELASTIC_SCALE',
      label: 'Elastic Scale',
      sublabel: `Universe Scale: ${elasticScale.toFixed(2)}x (Dynamic Distance Mapping)`,
      icon: '📏',
      themeClass: 'elastic-scale',
      hand1,
      hand2,
      handDistance,
      steerAngleDelta: 0,
      isCosmicSnap: false,
      elasticScale,
    };
  }

  // Default Dual Tracking
  return {
    count: 2,
    hands: [hand1, hand2],
    dualGesture: 'DUAL_TRACKING',
    label: 'Dual Hand Flight Mode',
    sublabel: `Universe Scale: ${elasticScale.toFixed(2)}x · Kinetic 3D Influence`,
    icon: '👐',
    themeClass: 'dual-tracking',
    hand1,
    hand2,
    handDistance,
    steerAngleDelta,
    isCosmicSnap: false,
    elasticScale,
  };
}

// Phase 4: Draw Skeletons with JARVIS visuals on PiP 2D Canvas
export function drawDualHandSkeletons(ctx, multiLandmarks, width, height, dualInfo) {
  ctx.clearRect(0, 0, width, height);
  if (!multiLandmarks || multiLandmarks.length === 0) return;

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

  for (let h = 0; h < multiLandmarks.length && h < 2; h++) {
    const landmarks = multiLandmarks[h];
    const theme = THEMES[h] || THEMES[0];

    const points = landmarks.map(lm => ({
      x: (1.0 - lm.x) * width,
      y: lm.y * height,
    }));

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

    // Phase 4: Cosmic Ray Laser Trace from Index Tip (Landmark 8)
    const activeHand = dualInfo?.hands?.[h] || dualInfo?.hand1;
    if (activeHand?.isCosmicRay) {
      const tip = points[8];
      const pip = points[6];
      const dirX = tip.x - pip.x;
      const dirY = tip.y - pip.y;
      const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
      const beamLen = 85;

      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(tip.x + (dirX / len) * beamLen, tip.y + (dirY / len) * beamLen);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.stroke();

      // Energy beam pulse head
      ctx.beginPath();
      ctx.arc(tip.x + (dirX / len) * beamLen, tip.y + (dirY / len) * beamLen, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    // Phase 4: Cosmic Snap Contact Circle between Thumb (4) and Middle (12)
    const thumbPt = points[4];
    const middlePt = points[12];
    const snapPixelDist = Math.hypot(thumbPt.x - middlePt.x, thumbPt.y - middlePt.y);
    if (snapPixelDist < 25) {
      ctx.beginPath();
      ctx.arc((thumbPt.x + middlePt.x) / 2, (thumbPt.y + middlePt.y) / 2, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(236, 72, 153, 0.45)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f472b6';
      ctx.stroke();
    }

    // Hand Tag
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.tagColor;
    ctx.fillText(theme.name, points[0].x - 18, points[0].y + 16);
  }

  // --- Phase 5 & 6: Kinetic & Quantum Overlays on PiP Preview ---
  if (handScreenCenters.length === 2) {
    const c1 = handScreenCenters[0];
    const c2 = handScreenCenters[1];

    if (dualInfo?.dualGesture === 'HEART_MORPH') {
      // 2D Glowing Pink Heart Contour
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2 - 8;
      ctx.save();
      ctx.translate(midX, midY);
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-14, -12, -26, 4, 0, 24);
      ctx.bezierCurveTo(26, 4, 14, -12, 0, 8);
      ctx.lineWidth = 3.0;
      ctx.strokeStyle = '#ec4899';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(236, 72, 153, 0.25)';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (dualInfo?.dualGesture === 'COSMIC_COLLAPSE') {
      // Concentrated Inward Gravitational Suction Rings
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2;
      ctx.beginPath();
      ctx.arc(midX, midY, 18, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 16;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(midX, midY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (dualInfo?.dualGesture === 'SUPERNOVA_BLAST') {
      // High-velocity Radial Explosion Wavefront
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2;
      ctx.beginPath();
      ctx.arc(midX, midY, 32, 0, Math.PI * 2);
      ctx.lineWidth = 4.0;
      ctx.strokeStyle = '#f43f5e';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 22;
      ctx.stroke();
    } else if (dualInfo?.dualGesture === 'VORTEX_TORNADO') {
      // Swirling Double Tornado Vortex Lines
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2;
      ctx.beginPath();
      ctx.ellipse(midX, midY, 28, 10, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (dualInfo?.dualGesture === 'ELASTIC_SCALE') {
      // Metric Ruler with Dynamic Multiplier
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.setLineDash([]);

      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2 - 8;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`${(dualInfo.elasticScale || 1.0).toFixed(2)}x SCALE`, midX - 22, midY);
    } else if (dualInfo?.dualGesture === 'DIMENSIONAL_PORTAL') {
      // Doctor Strange Mystic Aperture Portal Rings
      const portX = dualInfo.portalCenter ? dualInfo.portalCenter.normX * width : (c1.x + c2.x) / 2;
      const portY = dualInfo.portalCenter ? dualInfo.portalCenter.normY * height : (c1.y + c2.y) / 2;

      // Outer Golden Spark Ring
      ctx.beginPath();
      ctx.arc(portX, portY, 26, 0, Math.PI * 2);
      ctx.lineWidth = 3.0;
      ctx.strokeStyle = '#f59e0b';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 18;
      ctx.stroke();

      // Inner Rotating Mystic Ring
      ctx.beginPath();
      ctx.arc(portX, portY, 16, 0, Math.PI * 2);
      ctx.lineWidth = 2.0;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#fef08a';
      ctx.stroke();
      ctx.setLineDash([]);

      // Portal Core
      ctx.beginPath();
      ctx.arc(portX, portY, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.fill();
    } else if (dualInfo?.dualGesture === 'QUANTUM_FREEZE') {
      // Matrix Time-Freeze Bullet-Time Scanlines & Cyan Frost
      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
      ctx.setLineDash([3, 6]);
      for (let y = 15; y < height; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.fillText('⚡ MATRIX DILATION: 0.05x', 8, 18);
    } else if (dualInfo?.dualGesture === 'JEDI_LEVITATION') {
      // Ethereal Upward Anti-Gravity Forcefield Vectors
      for (const c of [c1, c2]) {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x, c.y - 42);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.9)';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Arrow head pointing upward
        ctx.beginPath();
        ctx.moveTo(c.x - 6, c.y - 34);
        ctx.lineTo(c.x, c.y - 44);
        ctx.lineTo(c.x + 6, c.y - 34);
        ctx.fillStyle = '#c084fc';
        ctx.fill();
      }
    } else if (dualInfo?.dualGesture === 'DEFLECTOR_SHIELD') {
      // Hexagonal Deflector Shield Grid
      ctx.beginPath();
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2;
      const shieldW = Math.abs(c2.x - c1.x) + 50;
      const shieldH = 65;
      ctx.roundRect(midX - shieldW / 2, midY - shieldH / 2, shieldW, shieldH, 12);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(52, 211, 153, 0.15)';
      ctx.fill();
      ctx.stroke();
    } else if (dualInfo?.dualGesture === 'HOLO_STEER') {
      // Holographic Steering Ring
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2;
      const r = Math.hypot(c2.x - c1.x, c2.y - c1.y) / 2;
      ctx.beginPath();
      ctx.arc(midX, midY, r, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (dualInfo?.dualGesture === 'ENERGY_BRIDGE') {
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.9)';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 14;
      ctx.stroke();
    } else if (dualInfo?.dualGesture === 'COSMIC_STRETCH') {
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
