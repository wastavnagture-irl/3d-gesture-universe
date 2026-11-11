// Web Audio API synthesized cosmic sound effects (zero external assets needed)

let audioCtx = null;
let isMuted = true;
let gravityOsc = null;
let gravityGain = null;

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
  // Sub-bass impact
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

  // Noise burst for shockwave texture
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
