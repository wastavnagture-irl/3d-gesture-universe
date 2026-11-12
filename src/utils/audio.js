// Web Audio API synthesized cosmic sound effects (zero external assets needed)

let audioCtx = null;
let isMuted = true;
let gravityOsc = null;
let gravityGain = null;
let rayOsc = null;
let rayGain = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function toggleAudio() {
  isMuted = !isMuted;
  if (!isMuted) {
    getAudioContext();
  } else if (gravityGain) {
    gravityGain.gain.setValueAtTime(0, audioCtx ? audioCtx.currentTime : 0);
  }
  return !isMuted;
}

export function getAudioMuted() {
  return isMuted;
}

export function playMorphSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.4);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.8);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(2400, now + 0.4);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.9);
}

export function startGravitySound(intensity = 0.5) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  if (!gravityOsc) {
    gravityOsc = ctx.createOscillator();
    gravityGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    gravityOsc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.value = 160;

    gravityGain.gain.setValueAtTime(0.001, now);
    gravityGain.gain.linearRampToValueAtTime(0.07 * intensity, now + 0.15);

    gravityOsc.connect(filter);
    filter.connect(gravityGain);
    gravityGain.connect(ctx.destination);

    gravityOsc.start();
  }

  if (gravityOsc && gravityGain) {
    gravityOsc.frequency.cancelScheduledValues(now);
    gravityOsc.frequency.setValueAtTime(gravityOsc.frequency.value || 55, now);
    gravityOsc.frequency.exponentialRampToValueAtTime(35 + intensity * 40, now + 0.2);
  }
}

export function updateGravitySound(charge = 0) {
  if (isMuted || !gravityOsc || !gravityGain || !audioCtx) return;
  const now = audioCtx.currentTime;
  const targetFreq = 40 + charge * 80;
  gravityOsc.frequency.setValueAtTime(targetFreq, now);
  gravityGain.gain.setValueAtTime(Math.min(0.12, 0.03 + charge * 0.08), now);
}

export function stopGravitySound() {
  if (!gravityGain || !audioCtx) return;
  const now = audioCtx.currentTime;
  gravityGain.gain.linearRampToValueAtTime(0.0001, now + 0.1);
  setTimeout(() => {
    if (gravityOsc) {
      try {
        gravityOsc.stop();
        gravityOsc.disconnect();
      } catch (e) {}
      gravityOsc = null;
      gravityGain = null;
    }
  }, 120);
}

export function playShockwaveSound(strength = 1.0) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 0.6);

  gain.gain.setValueAtTime(0.25 * strength, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.75);

  try {
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(900, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(140, now + 0.4);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12 * strength, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  } catch (e) {}
}

// Phase 4: Cosmic Ray Laser Beam Sound
export function playCosmicRaySound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.33);
}

// Phase 4: Deflector Shield Energy Hum
export function playDeflectorShieldSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.2);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.6);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.75);
}

// Phase 4: The Cosmic Snap Shockwave Detonation
export function playCosmicSnapSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // High-frequency snap click
  const snapOsc = ctx.createOscillator();
  const snapGain = ctx.createGain();
  snapOsc.type = 'square';
  snapOsc.frequency.setValueAtTime(2400, now);
  snapOsc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
  snapGain.gain.setValueAtTime(0.35, now);
  snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  snapOsc.connect(snapGain);
  snapGain.connect(ctx.destination);
  snapOsc.start(now);
  snapOsc.stop(now + 0.09);

  // Massive deep sub-bass supernova burst
  playShockwaveSound(2.2);
}

// Phase 5: Quantum Time Freeze (Matrix Protocol Slowdown)
export function playTimeFreezeSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(340, now);
  osc.frequency.exponentialRampToValueAtTime(32, now + 0.85);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(120, now + 0.85);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 1.0);
}

// Phase 5: Dimensional Portal (Doctor Strange Mystic Rift)
export function playDimensionalPortalSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'triangle';

  osc1.frequency.setValueAtTime(432, now);
  osc1.frequency.exponentialRampToValueAtTime(576, now + 0.35);
  osc1.frequency.exponentialRampToValueAtTime(432, now + 0.75);

  osc2.frequency.setValueAtTime(648, now);
  osc2.frequency.exponentialRampToValueAtTime(864, now + 0.35);
  osc2.frequency.exponentialRampToValueAtTime(648, now + 0.75);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.09, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.85);
  osc2.stop(now + 0.85);
}

// Phase 5: Jedi Levitation (Anti-Gravity Harmonic Hum)
export function playLevitationSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(260, now + 0.4);
  osc.frequency.exponentialRampToValueAtTime(330, now + 0.9);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.09, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 1.15);
}

// Phase 6: Cosmic Collapse (Concentrated Gravitational Implosion)
export function playCosmicCollapseSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.6);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(80, now + 0.6);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.75);
}

// Phase 6: Vortex Tornado Swirling Wind
export function playVortexTornadoSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.linearRampToValueAtTime(540, now + 0.2);
  osc.frequency.linearRampToValueAtTime(320, now + 0.5);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.58);
}

// Phase 6: Crystalline Heart Morph Harmonic Chime
export function playHeartMorphSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.04);

    gain.gain.setValueAtTime(0.001, now + idx * 0.04);
    gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.04 + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.04);
    osc.stop(now + idx * 0.04 + 0.95);
  });
}
