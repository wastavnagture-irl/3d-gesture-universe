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

### Phase 4: Advanced JARVIS-Level Dynamic Gestures
- **⚡ Cosmic Ray (Index Finger Trace):**
  - Detects when *only* the Index Finger is extended (Thumb, Middle, Ring, Pinky curled).
  - Emits a high-velocity, concentrated stream of glowing particles along the 3D pointing vector from Index Tip (Landmark 8) with magnetic pinch corridor physics, dynamic 3D laser beam mesh, and synthesized plasma audio.
- **🛡️ Deflector Shield (Dual Palms Forward):**
  - Detects both hands with open palms facing camera and fingers pointing upward.
  - Morphologically flattens 40,000 particles into a dense, glowing 2D curved hexagonal energy barrier directly in front of the hands with electromagnetic ripple oscillations and forcefield shield audio.
- **🌐 Holographic Globe Rotation (Dual Hand Steer):**
  - Detects both hands open/relaxed in circular spatial motion.
  - Computes the dynamic angle delta ($\Delta \theta$) between Hand 1 and Hand 2 to steer `rotation.z` and center translation to steer `rotation.y`/`rotation.x`, enabling physical holographic spinning of the galaxy with interactive gimbal visualization rings.
- **🫰 The Cosmic Snap (Thumb + Middle Finger Velocity):**
  - High-precision velocity state machine detecting rapid collision ($d < 0.32$) and instant release ($d > 0.52$) between Thumb Tip (Landmark 4) and Middle Finger Tip (Landmark 12) within $\le 320\text{ms}$.
  - Detonates an instant, violent supernova shockwave scattering all particles radially into deep space before gently pulling them back via harmonic spring restoration.

### Phase 5: Cinematic Quantum Gestures
- **❄️ Quantum Time Freeze (Matrix Protocol):**
  - Detects both hands with Open Palms facing completely downwards (fingertips significantly lower than wrist in 2D image coordinates).
  - Smoothly dilates global particle time-step/velocity down to 5% (`timeDilation = 0.05`), inducing a cinematic Matrix bullet-time slow-motion effect with synthesized audio pitch slowdown and cyan scanline backdrop.
- **🌀 Dimensional Portal (Doctor Strange Rift):**
  - Detects a Diamond/Triangle aperture where Hand 1 Thumb Tip (4) touches Hand 2 Thumb Tip (4) AND Hand 1 Index Tip (8) touches Hand 2 Index Tip (8).
  - Triggers a massive, high-speed swirling fiery ring vortex centered between hands with dynamic golden spark filaments mesh, pulling nearby particles into a glowing orbital accretion disk.
- **🛸 Jedi Levitation (Anti-Gravity Field):**
  - Detects both hands with Open Palms facing upwards (fingertips pointing away, palms held flat).
  - Inverts the gravitational Y-axis force with continuous upward acceleration, causing the entire particle universe to float and ascend into the infinite void with continuous cyclic wrapping.

### Phase 6: Kinetic-Force Gestures & Shape-Shifting Morphs
- **❤️ Shape-Shifting Morph (Heart Formation):**
  - Detects a two-hand 'Heart' shape (Thumbs pointing down and touching at tips, Index fingers curved with tips touching at the top).
  - Parametric 3D cardioid geometry ($x = 16\sin^3(t)$, $y = 13\cos(t) - 5\cos(2t) - 2\cos(3t) - \cos(4t)$) with parabolic $z$-depth tapering and harmonic spring locking ($1.8\times$).
  - Smoothly lerps all 40,000 particle targets into a crystalline glowing 3D heart, returning to standard physics when the gesture breaks.
- **💥 Cosmic Collapse (Hands Close Together):**
  - Continuously calculates 3D distance between Hand 1 and Hand 2 centers.
  - When distance drops below $0.22$, midpoint coordinate $P_{\text{mid}}$ is unprojected into 3D world space.
  - Applies a massive concentrated gravitational suction ($60.0 \times \text{gravity}$) toward $P_{\text{mid}}$, condensing all 40,000 particles into a tight, super-dense glowing core with relativistic spiral compression.
- **🌟 Supernova Blast (Sudden Outward Repulsion):**
  - Detects rapid state transition (e.g., Closed Fists to Wide Open Palms in $< 0.5$s) or high outward separation velocity ($> 1.8$).
  - Detonates an instantaneous, high-magnitude outward radial shockwave ($3.2$ energy) violently repelling all particles into deep space before harmonic spring recovery.
- **🌪️ Vortex Tornado (Swirling Index Fingers):**
  - Detects both hands with *only* their Index Fingers extended.
  - Engages a powerful tangential vortex spin ($58.0$ force) around the Y-axis centered between the hands, coupled with centripetal inward suction and vertical spiral updraft.
- **📏 Elastic Universe (Dynamic Distance Mapping):**
  - Continuously maps 3D inter-hand distance to global spread/scale multiplier ($0.35\times$ to $2.6\times$). Moving closer condenses the cosmos, pulling apart expands it proportionally.
- **PiP Controls Expansion & Scroll Area:**
  - Modern, compact categorized PiP simulation panel (`KINETIC & MORPH`, `QUANTUM MATRIX`, `JARVIS DEFENSE`) with sleek scrollable container accommodating 13+ gestures.
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

## 🎮 Quantum & Dual-Hand Controls

| Input / Gesture | System Action |
| :--- | :--- |
| **`W`** | Toggle Webcam Hand Tracking ON / OFF |
| **❤️ 3D Heart Morph** (Two-Hand Heart Pose) | **Shape-Shifting Morph:** 40,000 particles morph into 3D volumetric heart |
| **💥 Cosmic Collapse** (Hands Close Together) | **Midpoint Singularity:** Massive gravitational suction condensing into core |
| **🌟 Supernova Blast** (Rapid Outward Burst) | **Radial Explosion:** Instant 3.2-energy shockwave scattering all particles |
| **🌪️ Vortex Tornado** (Dual Index Fingers) | **Swirling Funnel:** High-speed tangential vortex spin and spiral updraft |
| **📏 Elastic Scale** (Distance Modulation) | **Dynamic Distance Mapping:** Maps hand separation to universe scale (0.35x - 2.6x) |
| **❄️ Time Freeze** (Dual Palms Down) | **Matrix Protocol:** Dilates global universe velocity down to 5% |
| **🌀 Dimensional Portal** (Diamond Aperture) | **Doctor Strange Rift:** High-speed swirling ring vortex pulling particles |
| **🛸 Jedi Levitation** (Dual Palms Up) | **Anti-Gravity Field:** Inverts Y-axis gravity, particles float into the void |
| **⚡ Cosmic Ray** (Index Finger Only) | **Particle Beam:** High-velocity particle stream projected from Index Tip |
| **🛡️ Deflector Shield** (Dual Palms Forward) | **Energy Barrier:** Morphs particles into 2D glowing hexagonal shield |
| **🌐 Holo Steer** (Dual Hands Relaxed) | **Holographic Rotation:** Steer galaxy rotation along 3 axes like a hologram |
| **🫰 The Cosmic Snap** (Thumb + Middle Snap) | **Supernova Blast:** Violent radial shockwave explosion & spring recovery |
| **🕳️🕳️ Dual Fists** | **Twin Singularities:** Dual binary black hole gravity wells |
| **⚡ Dual Open Palms** | **Energy Bridge Portal:** High-density particle conduit linking hands |
| **✨ Dual Pinch / Move** | **Cosmic Stretch:** Move hands apart to expand universe, together to condense |
| **🖐️ Single Open Palm** | **Cosmic Wind:** Scatter particles outward |
| **🕳️ Single Closed Fist** | **Single Singularity:** Pull particles inward |
| **Left Click & Hold** (or **Space**) | Mouse Singularity (fallback) |
| **Release Click / Space** | Detonate Gravitational Shockwave |
| **Right Drag / Shift + Drag** | Orbit 3D Camera |
| **Mouse Wheel / Pinch** | Zoom in / out |
| **`1` – `7`** | Morph Particle Formations (Galaxy, Nebula, Helix, Cube, Planet, Torus, Heart) |
| **`T`** | Toggle Interaction Mode (`Gravity Well` ↔ `Orbit Cam`) |
| **`M`** | Toggle Synthesized Cosmic Audio |
| **`F`** | Toggle Fullscreen |
| **`?`** or **`H`** | Open Universe Flight & Quantum Gesture Guide |
