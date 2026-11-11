# 3D Gesture Particle Universe · Interactive Cosmic Engine

An interactive 3D particle universe simulation powered by **React 19**, **Three.js (WebGL 2)**, and **Google MediaPipe AI Vision Hand Tracking** (`@mediapipe/tasks-vision`).

---

## 🌟 Key Features

### Phase 1: Core 3D Particle Engine & Physics
- **40,000+ Glowing Particles:** Custom GLSL shaders with distance attenuation, glowing cores, exponential halos, and additive blending.
- **Cosmic Shapes & Morphing:**
  - `Spiral Galaxy` (Key `1`): Logarithmic multi-arm galactic disk with dense stellar core.
  - `Sphere / Nebula` (Key `2`): Volumetric gas nebula with turbulent filament ripples.
  - `DNA Helix` (Key `3`): Double intertwined strands with ladder base-pair rungs.
  - `Chaos Cube` (Key `4`): Hypercube lattice with fluctuating kinetic sub-clusters.
  - `Ringed Planet` (Key `5`): Celestial orb encircled by tilted rings with Cassini division.
  - `Cosmic Torus` (Key `6`): Relativistic magnetic donut vortex.
- **Cosmic Color Spectra:** 4 dynamic vertex color palettes (Cosmic Odyssey, Supernova Fire, Cyber Neon, Emerald Astral).
- **Smooth 60 FPS Physics:** Dynamic spring interpolation, differential orbital motion, and multi-frequency curl noise drift.

### Phase 2: AI Hand Gesture Tracking (MediaPipe Vision)
- **Webcam AI Sensor & Skeleton Overlay:**
  - Real-time 21-hand-landmark tracking powered by `@mediapipe/tasks-vision`.
  - Picture-in-Picture (PiP) mirrored preview in the bottom corner with glowing 2D bone overlays and tip joints.
- **3D Gesture-to-Particle Mappings:**
  - **🖐️ Open Palm (5 fingers extended):** Cosmic Wind Repel that scatters particles outward.
  - **🕳️ Closed Fist:** Black Hole Gravity Well that pulls particles inward into an accretion vortex; opening the hand detonates an explosive shockwave!
  - **🤏 Pinch (Thumb + Index touching):** Orbital Condensation field that compresses particles into a tight glowing orb.
  - **👋 Hand Swipe / Movement:** Smoothly banks and tilts the entire 3D galaxy following hand trajectory.
- **HUD Telemetry & Smoothing:**
  - 3D linear interpolation (`lerp`) eliminates camera sensor micro-jitter.
  - Prominent live HUD gesture banner displays active gesture recognition in real time.
  - Seamless mouse and touch fallback when webcam is disabled.
  - Quick-test demo buttons to simulate gestures on any system.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v24)
- Modern browser with WebGL 2 support

### Installation & Local Development

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open [http://localhost:4173/](http://localhost:4173/) in your browser.

---

## 🎮 Controls & Keyboard Shortcuts

| Input | Action |
| :--- | :--- |
| **`W`** | Toggle Webcam AI Hand Control |
| **🖐️ Open Palm** | Scatter & repel particles with cosmic wind |
| **🕳️ Closed Fist** | Singularity Black Hole (release to detonate shockwave) |
| **🤏 Pinch** | Compress universe into dense glowing orb |
| **👋 Hand Swipe** | Rotate & tilt galaxy orientation |
| **Left Click & Hold** (or **Space**) | Singularity Gravity Well (fallback) |
| **Release Left Click / Space** | Detonate Gravitational Shockwave |
| **Right Drag / Shift + Drag** | Orbit 3D Camera |
| **Mouse Wheel / Pinch** | Zoom in / out |
| **`1` – `6`** | Morph Particle Formations |
| **`T`** | Toggle Interaction Mode (`Gravity Well` ↔ `Orbit Cam`) |
| **`M`** | Toggle Synthesized Cosmic Audio |
| **`F`** | Toggle Fullscreen |
| **`?`** or **`H`** | Open Universe Flight Guide |
