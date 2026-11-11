# 3D Gesture Particle Universe · Interactive Cosmic Engine

An interactive 3D particle universe simulation powered by **React 19**, **Three.js (WebGL 2)**, and **Google MediaPipe AI Vision Dual-Hand Tracking** (`@mediapipe/tasks-vision`).

---

## 🌟 Evolution & Phases

### Phase 1: Core 3D Particle Galaxy Engine & Physics
- **40,000+ Glowing Particles:** Custom GLSL shaders with distance attenuation, glowing cores, exponential halos, and additive blending (`THREE.AdditiveBlending`).
- **Cosmic Shapes & Morphing:**
  - `Spiral Galaxy` (Key `1`): Logarithmic multi-arm galactic disk with dense stellar core.
  - `Sphere / Nebula` (Key `2`): Volumetric gas nebula with turbulent filament ripples.
  - `DNA Helix` (Key `3`): Double intertwined strands with ladder base-pair rungs.
  - `Chaos Cube` (Key `4`): Hypercube lattice with fluctuating kinetic sub-clusters.
  - `Ringed Planet` (Key `5`): Celestial orb encircled by tilted rings with Cassini division.
  - `Cosmic Torus` (Key `6`): Relativistic magnetic donut vortex.
- **Cosmic Color Spectra:** 4 dynamic vertex color palettes (Cosmic Odyssey, Supernova Fire, Cyber Neon, Emerald Astral).
- **Physics Engine:** Dynamic spring interpolation, differential orbital rotation, and multi-frequency curl noise drift at 60+ FPS.

### Phase 2: AI Single-Hand Tracking
- **21-Landmark Skeleton Overlay:** Real-time MediaPipe HandLandmarker in Picture-in-Picture (PiP) view.
- **Gesture Mappings:** Open Palm (Cosmic Wind Repel), Closed Fist (Black Hole Gravity Well), Pinch (Orbital Condensation), Hand Swipe (Cosmic Tilt).
- **Interpolation & HUD:** Linear interpolation (`lerp`) eliminating camera jitter and dynamic gesture banners.

### Phase 3: Dual-Hand Kinetic Gesture Control
- **Simultaneous Two-Hand Tracking (`numHands: 2`):**
  - Independent 21-landmark tracking for both hands.
  - Distinct PiP visual themes: **Neon Cyan** for Hand 1 and **Neon Magenta** for Hand 2 with live skeleton rendering and connector telemetry.
- **Dual-Hand 3D Physics Interactions:**
  - **🕳️🕳️ Twin Singularities (Dual Fists):** Spawns two independent gravitational black holes with twin event horizons, pulling particles into a binary accretion disk.
  - **⚡ Energy Bridge / Portal (Dual Open Palms):** Forms an electric, high-density particle conduit and magnetic containment beam streaming matter directly between both hands.
  - **✨ Cosmic Stretch & Scale (Dual Pinch / Move):** Dynamically scales the entire universe—moving hands apart expands the galaxy outward (up to 2.4x), and bringing them together condenses the galaxy into an intense glowing nucleus (down to 0.45x).
  - **🌀 Singularity & Wind Hybrid (One Fist + One Palm):** Simultaneously sucks particles into a singularity while scattering matter with cosmic wind.
- **HUD & Fallback Matrix:**
  - Top bar displays `DUAL HAND MODE ACTIVE` with dual cyan/magenta status dots.
  - Live HUD badge dynamically reports dual-gesture states.
  - Seamless fallback to single-hand tracking if only 1 hand is present, and to mouse/touch pointer physics when hands are away.
  - Integrated dual-hand simulation buttons for rapid testing on any workstation.

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

## 🎮 Dual-Hand & Keyboard Controls

| Input | Action |
| :--- | :--- |
| **`W`** | Toggle Webcam Hand Tracking ON / OFF |
| **🕳️🕳️ Dual Fists** | **Twin Singularities:** Dual binary black hole gravity wells |
| **⚡ Dual Open Palms** | **Energy Bridge Portal:** High-density particle conduit linking hands |
| **✨ Dual Pinch / Move** | **Cosmic Stretch:** Move hands apart to expand universe, together to condense |
| **🖐️ Single Open Palm** | **Cosmic Wind:** Scatter particles outward |
| **🕳️ Single Closed Fist** | **Single Singularity:** Pull particles inward |
| **Left Click & Hold** (or **Space**) | Mouse Singularity (fallback) |
| **Release Click / Space** | Detonate Gravitational Shockwave |
| **Right Drag / Shift + Drag** | Orbit 3D Camera |
| **Mouse Wheel / Pinch** | Zoom in / out |
| **`1` – `6`** | Morph Particle Formations |
| **`T`** | Toggle Interaction Mode (`Gravity Well` ↔ `Orbit Cam`) |
| **`M`** | Toggle Synthesized Cosmic Audio |
| **`F`** | Toggle Fullscreen |
| **`?`** or **`H`** | Open Universe Flight & Dual-Hand Guide |
