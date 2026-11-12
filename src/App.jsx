import React, { useState, useEffect, useRef } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import GlassPanel from './components/GlassPanel';
import WebcamHandTracker from './components/WebcamHandTracker';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  HelpCircle,
  X,
  MousePointer,
  Rotate3d,
  Compass,
  Activity,
  Layers,
  Hand,
  Camera,
  Users,
  Shield,
  Zap,
} from 'lucide-react';
import { toggleAudio, getAudioMuted, playMorphSound } from './utils/audio';
import { SHAPES } from './utils/shapeGenerators';

export default function App() {
  const [shape, setShape] = useState('galaxy');
  const [theme, setTheme] = useState('cosmic');
  const [particleCount, setParticleCount] = useState(40000);
  const [particleSize, setParticleSize] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [gravityStrength, setGravityStrength] = useState(1.0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [interactionMode, setInteractionMode] = useState('gravity');
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [stats, setStats] = useState({ fps: 60, particles: 40000, handCount: 0, dualGesture: 'NONE', scale: '1.00' });
  const [gravityCharge, setGravityCharge] = useState(0);

  // Phase 4: JARVIS-Level Hand Tracking State
  const [handControlEnabled, setHandControlEnabled] = useState(false);
  const [handData, setHandData] = useState(null);

  const triggerSupernovaRef = useRef(null);

  const handleShapeChange = (newShape) => {
    if (newShape !== shape) {
      setShape(newShape);
      playMorphSound();
    }
  };

  const handleToggleAudio = () => {
    const active = toggleAudio();
    setIsMuted(!active);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key, 10) - 1;
        if (SHAPES[index]) {
          handleShapeChange(SHAPES[index].id);
        }
      } else if (e.key.toLowerCase() === 'h' || e.key === '?') {
        setShowHelp((prev) => !prev);
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleAudio();
      } else if (e.key.toLowerCase() === 'f') {
        handleToggleFullscreen();
      } else if (e.key.toLowerCase() === 't') {
        setInteractionMode((prev) => (prev === 'gravity' ? 'orbit' : 'gravity'));
      } else if (e.key.toLowerCase() === 'w') {
        setHandControlEnabled((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shape]);

  const activeShapeObj = SHAPES.find((s) => s.id === shape) || SHAPES[0];

  // Helper for dynamic Phase 4 JARVIS gesture HUD
  const getGestureHUD = () => {
    if (!handControlEnabled) return null;
    if (!handData || (!handData.count && !handData.hand1)) {
      return {
        label: 'Searching for hands...',
        sublabel: 'Align hand(s) within webcam frame',
        icon: '🔍',
        themeClass: 'searching',
        isJarvis: false,
      };
    }

    const isDual = handData.count === 2;

    switch (handData.dualGesture) {
      // Phase 6 Kinetic-Force & Morph Gestures
      case 'HEART_MORPH':
        return {
          label: 'SHAPE-SHIFT: 3D HEART MORPH',
          sublabel: 'Two-Hand Heart Pose: 40,000 Particles Forming Crystalline Heart',
          icon: '❤️',
          themeClass: 'heart-morph',
          isJarvis: true,
        };
      case 'COSMIC_COLLAPSE':
        return {
          label: 'COSMIC COLLAPSE ACTIVE',
          sublabel: 'Hands Close Together: Gravitational Pull Towards Dense Core Midpoint',
          icon: '💥',
          themeClass: 'cosmic-collapse',
          isJarvis: true,
        };
      case 'SUPERNOVA_BLAST':
        return {
          label: 'SUPERNOVA BLAST DETONATED',
          sublabel: 'Sudden Outward Repulsion: High-Magnitude Radial Particle Shockwave',
          icon: '🌟',
          themeClass: 'supernova-blast',
          isJarvis: true,
        };
      case 'VORTEX_TORNADO':
        return {
          label: 'VORTEX TORNADO ENGAGED',
          sublabel: 'Swirling Index Fingers: Powerful Rotational Updraft & Inward Funnel',
          icon: '🌪️',
          themeClass: 'vortex-tornado',
          isJarvis: true,
        };
      case 'ELASTIC_SCALE':
        return {
          label: 'ELASTIC UNIVERSE ACTIVE',
          sublabel: `Dynamic 3D Distance Multiplier: ${stats.scale}x Scale`,
          icon: '📏',
          themeClass: 'elastic-scale',
          isJarvis: true,
        };

      // Phase 5 Cinematic Quantum Gestures
      case 'QUANTUM_FREEZE':
        return {
          label: 'QUANTUM FREEZE ACTIVE',
          sublabel: 'Matrix Protocol: Global Velocity Dilated to 5% Slow-Motion',
          icon: '❄️',
          themeClass: 'quantum-freeze',
          isJarvis: true,
        };
      case 'DIMENSIONAL_PORTAL':
        return {
          label: 'DIMENSIONAL PORTAL OPENED',
          sublabel: 'Doctor Strange Rift: High-Speed Swirling Ring Vortex Active',
          icon: '🌀',
          themeClass: 'dimensional-portal',
          isJarvis: true,
        };
      case 'JEDI_LEVITATION':
        return {
          label: 'JEDI LEVITATION ACTIVE',
          sublabel: 'Anti-Gravity Field: Inverted Gravitational Y-Axis Force',
          icon: '🛸',
          themeClass: 'jedi-levitation',
          isJarvis: true,
        };

      // Phase 4 JARVIS Gestures
      case 'DEFLECTOR_SHIELD':
        return {
          label: 'JARVIS OVERRIDE: Deflector Shield',
          sublabel: 'Dual Palms Forward: 2D Quantum Energy Barrier Matrix Active',
          icon: '🛡️',
          themeClass: 'deflector-shield',
          isJarvis: true,
        };
      case 'HOLO_STEER':
        return {
          label: 'JARVIS OVERRIDE: Holographic Rotation',
          sublabel: 'Dual Hand Steering: Kinetic Axis Spinning Universe',
          icon: '🌐',
          themeClass: 'holo-steer',
          isJarvis: true,
        };
      case 'COSMIC_RAY':
        return {
          label: 'JARVIS OVERRIDE: Cosmic Ray',
          sublabel: 'Index Finger Trace: High-Velocity Particle Beam Emission',
          icon: '⚡',
          themeClass: 'cosmic-ray',
          isJarvis: true,
        };
      case 'COSMIC_SNAP':
        return {
          label: 'JARVIS OVERRIDE: The Cosmic Snap',
          sublabel: 'Thumb + Middle Velocity: Massive Radial Supernova Blast',
          icon: '🫰',
          themeClass: 'cosmic-snap',
          isJarvis: true,
        };

      // Phase 3 & Dual Hand Gestures
      case 'TWIN_SINGULARITIES':
        return {
          label: 'Twin Singularities',
          sublabel: 'Dual Fists: Binary Black Holes Gravitational Collapse',
          icon: '🕳️🕳️',
          themeClass: 'twin-fists',
          isJarvis: false,
        };
      case 'ENERGY_BRIDGE':
        return {
          label: 'Energy Bridge Portal',
          sublabel: 'Dual Palms: High-Density Particle Conduit Linking Hands',
          icon: '⚡',
          themeClass: 'energy-bridge',
          isJarvis: false,
        };
      case 'COSMIC_STRETCH':
        return {
          label: 'Cosmic Stretch & Scale',
          sublabel: `Universe Scale: ${stats.scale}x (Pinch & Move Apart/Together)`,
          icon: '✨',
          themeClass: 'cosmic-stretch',
          isJarvis: false,
        };
      case 'OPEN_PALM':
        return {
          label: 'Cosmic Repel Wind',
          sublabel: isDual ? 'Dual Open Palms Repelling Space' : 'Open Palm (5 Fingers Extended)',
          icon: '🖐️',
          themeClass: 'open-palm',
          isJarvis: false,
        };
      case 'FIST':
        return {
          label: 'Black Hole Singularity',
          sublabel: 'Closed Fist: Pulling matter into accretion vortex',
          icon: '🕳️',
          themeClass: 'fist',
          isJarvis: false,
        };
      case 'PINCH':
        return {
          label: 'Orbital Condensation',
          sublabel: 'Pinch: Compressing matter into dense nucleus',
          icon: '🤏',
          themeClass: 'pinch',
          isJarvis: false,
        };
      case 'SWIPE':
      case 'DUAL_TRACKING':
        return {
          label: isDual ? 'Dual Hand Flight Mode' : 'Cosmic Galaxy Tilt',
          sublabel: isDual ? 'Two Hands Orbiting & Tilting Universe' : 'Hand Movement Across Axes',
          icon: isDual ? '👐' : '👋',
          themeClass: 'dual-tracking',
          isJarvis: false,
        };
      default:
        return {
          label: isDual ? 'Dual Hand Tracking' : 'Tracking Hand',
          sublabel: `${handData.count || 1} Hand(s) Active in Scene`,
          icon: '✨',
          themeClass: 'neutral',
          isJarvis: false,
        };
    }
  };

  const gestureHUD = getGestureHUD();

  return (
    <main className="app-shell">
      {/* 3D Particle Canvas with Phase 4 JARVIS Physics Input */}
      <ParticleCanvas
        shape={shape}
        theme={theme}
        particleCount={particleCount}
        interactionMode={interactionMode}
        particleSize={particleSize}
        speed={speed}
        gravityStrength={gravityStrength}
        autoRotate={autoRotate}
        handData={handData}
        onStatsUpdate={setStats}
        onChargeUpdate={setGravityCharge}
        triggerSupernovaRef={triggerSupernovaRef}
      />

      <div className="vignette" />

      {/* Top Navigation Bar */}
      <header className="topbar glassmorphism-header">
        <div className="brand-group">
          <a href="#" className="brand" aria-label="Particle Universe Home">
            <span className="brand-mark">⚛</span>
            <div className="brand-titles">
              <span className="brand-main">ORBITAL</span>
              <span className="brand-sub">PARTICLE LAB</span>
            </div>
          </a>
          <div className="top-system-badge jarvis-badge quantum-badge">
            <span className="live-dot" />
            <span className="system-text">PHASE 05</span>
            <i className="badge-divider" />
            <span className="system-phase">CINEMATIC QUANTUM MATRIX</span>
          </div>
        </div>

        {/* Center: Hand Control Toggle & Mode Switch */}
        <div className="top-center-controls">
          <button
            className={`hand-control-toggle-btn ${handControlEnabled ? 'active' : ''}`}
            onClick={() => setHandControlEnabled(!handControlEnabled)}
            title="Enable AI Hand Tracking (W)"
          >
            {handControlEnabled ? <Users size={14} className="pulse-icon" /> : <Hand size={14} />}
            <span>{handControlEnabled ? 'JARVIS AI: ON' : 'Enable Hand Control'}</span>
            <span className="shortcut-mini-tag">W</span>
          </button>

          {/* Dual Hand Active Badge */}
          {handControlEnabled && stats.handCount === 2 && (
            <div className="dual-active-pill">
              <span className="dual-dot cyan" />
              <span className="dual-dot magenta" />
              <span>DUAL HAND MODE ACTIVE</span>
            </div>
          )}

          <div className="interaction-mode-pill">
            <button
              className={`mode-btn ${interactionMode === 'gravity' ? 'active' : ''}`}
              onClick={() => setInteractionMode('gravity')}
              title="Left Click & Hold creates a Black Hole Gravity Well"
            >
              <MousePointer size={13} />
              <span>Gravity Well</span>
            </button>
            <button
              className={`mode-btn ${interactionMode === 'orbit' ? 'active' : ''}`}
              onClick={() => setInteractionMode('orbit')}
              title="Left Click drags camera in 3D space"
            >
              <Rotate3d size={13} />
              <span>Orbit Cam</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="top-actions">
          <button
            className={`icon-button ${!isMuted ? 'active-audio' : ''}`}
            onClick={handleToggleAudio}
            aria-label="Toggle Cosmic Audio"
            title={isMuted ? 'Unmute Cosmic Audio (M)' : 'Mute Audio (M)'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            className="icon-button"
            onClick={handleToggleFullscreen}
            aria-label="Toggle Fullscreen"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            className="icon-button help-toggle-btn"
            onClick={() => setShowHelp((v) => !v)}
            aria-label="Toggle Interaction Help"
            title="Help & Shortcuts (?)"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      {/* Hero Typography & Mission Statement */}
      <section className="hero-copy">
        <div className="eyebrow">
          <span className="pulsing-cyan-dot" />
          <span>PHASE 4 · JARVIS DYNAMIC KINETICS</span>
        </div>
        <h1>
          Shape the <em>infinite.</em>
        </h1>
        <p>A living 3D particle universe sculpted by JARVIS-level gesture mechanics and quantum forcefields.</p>
        <div className="active-form-tag">
          <Layers size={12} />
          <span>CURRENT FORM:</span>
          <strong>{activeShapeObj.name.toUpperCase()}</strong>
        </div>
      </section>

      {/* Live HUD Phase 4 Gesture Badge */}
      {gestureHUD && (
        <div className={`live-gesture-hud-badge glassmorphism ${gestureHUD.themeClass} ${gestureHUD.isJarvis ? 'jarvis-override-pulse' : ''}`}>
          <div className="hud-gesture-icon-wrap">
            <span className="hud-gesture-emoji">{gestureHUD.icon}</span>
          </div>
          <div className="hud-gesture-text-wrap">
            <div className="hud-gesture-header">
              <span className="hud-live-tag">
                {gestureHUD.isJarvis ? 'JARVIS AI PROTOCOL' : 'GESTURE DETECTED'}
              </span>
              {(handData?.count > 0 || handData?.hand1) && <span className="hud-live-pulse-dot" />}
            </div>
            <strong className="hud-gesture-name">{gestureHUD.label}</strong>
            <span className="hud-gesture-desc">{gestureHUD.sublabel}</span>
          </div>
        </div>
      )}

      {/* Glassmorphism Floating Control Panel */}
      <GlassPanel
        shape={shape}
        setShape={handleShapeChange}
        theme={theme}
        setTheme={setTheme}
        particleSize={particleSize}
        setParticleSize={setParticleSize}
        speed={speed}
        setSpeed={setSpeed}
        gravityStrength={gravityStrength}
        setGravityStrength={setGravityStrength}
        particleCount={particleCount}
        setParticleCount={setParticleCount}
        autoRotate={autoRotate}
        setAutoRotate={setAutoRotate}
        onTriggerSupernova={() => triggerSupernovaRef.current?.()}
        isMuted={isMuted}
        onToggleAudio={handleToggleAudio}
      />

      {/* Picture-in-Picture Webcam AI Hand Tracker (JARVIS Overlays) */}
      <WebcamHandTracker
        enabled={handControlEnabled}
        onToggleEnabled={() => setHandControlEnabled(false)}
        onHandUpdate={setHandData}
      />

      {/* Gravity Well Charge HUD Bar */}
      {gravityCharge > 0.02 && (
        <div className="gravity-charge-hud">
          <div className="charge-title-wrap">
            <span className="charge-indicator-dot" />
            <span className="charge-label">
              {stats.handCount === 2 ? 'TWIN SINGULARITIES ACCRETION' : 'SINGULARITY CHARGE'}
            </span>
            <span className="charge-percent">{Math.round(gravityCharge * 100)}%</span>
          </div>
          <div className="charge-progress-bar-bg">
            <div
              className="charge-progress-fill"
              style={{ width: `${Math.min(100, gravityCharge * 100)}%` }}
            />
          </div>
          <div className="charge-hint">
            {handControlEnabled ? 'OPEN HAND(S) TO DETONATE SHOCKWAVE' : 'RELEASE TO DETONATE SHOCKWAVE'}
          </div>
        </div>
      )}

      {/* Interactive Quick Help Modal */}
      {showHelp && (
        <div className="help-modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="help-card glassmorphism-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-help-btn"
              onClick={() => setShowHelp(false)}
              aria-label="Close Help"
            >
              <X size={18} />
            </button>
            <div className="help-header">
              <Compass size={20} className="help-compass-icon" />
              <div>
                <h3>Universe Flight &amp; Quantum Gesture Guide</h3>
                <span className="help-subtitle">Phase 6 Kinetic Forces, Morph &amp; Quantum Matrix</span>
              </div>
            </div>

            <div className="help-section-title">PHASE 6 KINETIC FORCE &amp; MORPH GESTURES</div>
            <div className="help-grid">
              <div className="help-item">
                <span className="help-glyph">❤️</span>
                <div>
                  <strong>Shape-Shifting Morph (3D Heart)</strong>
                  <p>Two-hand heart formation (thumbs down &amp; touching, index fingers curved &amp; touching at top). Smoothly morphs 40,000 particles into a glowing 3D volumetric cardioid heart.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">💥</span>
                <div>
                  <strong>Cosmic Collapse (Hands Close Together)</strong>
                  <p>Bring hands close together (&lt; 0.22 distance). Applies a massive concentrated gravitational pull toward the hand midpoint, condensing all particles into a tight, super-dense core.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🌟</span>
                <div>
                  <strong>Supernova Blast (Sudden Outward Repulsion)</strong>
                  <p>Rapidly transition from Closed Fists to Open Palms (&lt; 0.5s) or separate hands at high velocity. Detonates a violent 3.2-energy shockwave scattering all particles.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🌪️</span>
                <div>
                  <strong>Vortex Tornado (Swirling Index Fingers)</strong>
                  <p>Extend ONLY the index fingers on both hands. Applies strong rotational spin around the Y-axis centered between the hands, centripetal funnel suction, and vertical updraft.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">📏</span>
                <div>
                  <strong>Elastic Universe (Dynamic Distance Mapping)</strong>
                  <p>Continuously tracks 3D distance between hands. Maps smoothly to universe scale (0.35x to 2.6x): moving closer condenses the cosmos, pulling apart expands it proportionally.</p>
                </div>
              </div>
            </div>

            <div className="help-section-title">PHASE 5 CINEMATIC QUANTUM GESTURES</div>
            <div className="help-grid">
              <div className="help-item">
                <span className="help-glyph">❄️</span>
                <div>
                  <strong>Quantum Time Freeze (Matrix Protocol)</strong>
                  <p>Both open palms facing completely downwards (fingertips lower than wrist). Smoothly dilates global time-step down to 5% (near freeze) with cinematic Matrix bullet-time slow motion.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🌀</span>
                <div>
                  <strong>Dimensional Portal (Doctor Strange Rift)</strong>
                  <p>Form diamond aperture touching Hand 1 &amp; Hand 2 Thumb tips (4) AND Index tips (8). Opens a massive swirling fiery ring vortex drawing particles into a glowing orbital accretion disk.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🛸</span>
                <div>
                  <strong>Jedi Levitation (Anti-Gravity Field)</strong>
                  <p>Both open palms facing upwards (fingertips flat/pointing up, wrists below palm). Gradually inverts gravitational Y-axis force, smoothly lifting the entire particle universe into the void.</p>
                </div>
              </div>
            </div>

            <div className="help-section-title">PHASE 4 JARVIS-LEVEL GESTURES</div>
            <div className="help-grid">
              <div className="help-item">
                <span className="help-glyph">⚡</span>
                <div>
                  <strong>Cosmic Ray (Index Finger Trace)</strong>
                  <p>Extend ONLY index finger (others curled). Shoots a focused, high-velocity glowing laser particle stream from Landmark 8.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🌐</span>
                <div>
                  <strong>Holographic Globe Rotation (Dual Hand Steer)</strong>
                  <p>Rotate both hands in circular arc around center axis. Spins the entire universe like a physical 3D hologram in space.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🛡️</span>
                <div>
                  <strong>Deflector Shield (Dual Palms Forward)</strong>
                  <p>Both hands with open palms facing camera, pointing up. Instantly flattens all particles into a dense 2D energy shield grid.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🫰</span>
                <div>
                  <strong>The Cosmic Snap (Thumb + Middle Finger Release)</strong>
                  <p>Press Thumb and Middle Finger tips, then rapidly snap apart. Detonates a violent radial supernova scattering particles into the void.</p>
                </div>
              </div>
            </div>

            <div className="help-section-title">DUAL &amp; SINGLE HAND MECHANICS</div>
            <div className="help-grid">
              <div className="help-item">
                <span className="help-glyph">🕳️🕳️</span>
                <div>
                  <strong>Twin Singularities (Dual Fists)</strong>
                  <p>Spawns two independent black holes with counter-rotating binary accretion streams.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">⚡</span>
                <div>
                  <strong>Energy Bridge (Dual Palms Facing)</strong>
                  <p>Forms a high-density streaming plasma conduit directly linking both hands.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">✨</span>
                <div>
                  <strong>Cosmic Stretch (Dual Pinch / Move)</strong>
                  <p>Move hands apart to expand universe dimensions, bring together to condense into an orb.</p>
                </div>
              </div>
            </div>

            <div className="keyboard-shortcuts-list">
              <span className="shortcuts-title">KEYBOARD SHORTCUTS</span>
              <div className="shortcut-chips">
                <div className="shortcut-chip"><kbd>W</kbd> Toggle Webcam Hand Control</div>
                <div className="shortcut-chip"><kbd>1</kbd> - <kbd>7</kbd> Morph Shapes (Incl. 3D Heart)</div>
                <div className="shortcut-chip"><kbd>SPACE</kbd> Singularity / Shockwave</div>
                <div className="shortcut-chip"><kbd>T</kbd> Toggle Interaction Mode</div>
                <div className="shortcut-chip"><kbd>M</kbd> Mute / Unmute Audio</div>
                <div className="shortcut-chip"><kbd>F</kbd> Toggle Fullscreen</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Telemetry & Status Bar */}
      <footer className="bottom-bar glassmorphism-footer">
        <div className="interaction-hint">
          <span className="mouse-glyph">
            <i />
          </span>
          <span className="hint-text">
            {handControlEnabled ? (
              stats.handCount === 2 ? (
                <>
                  CINEMATIC QUANTUM MATRIX ACTIVE <small>· ❄️ TIME FREEZE · 🌀 PORTAL · 🛸 LEVITATE · 🛡️ SHIELD · ⚡ RAY</small>
                </>
              ) : (
                <>
                  QUANTUM SENSOR ACTIVE <small>· ⚡ COSMIC RAY · 🫰 SNAP · PRESENT 2ND HAND FOR QUANTUM DYNAMICS</small>
                </>
              )
            ) : interactionMode === 'gravity' ? (
              <>
                MOVE TO SWIRL <small>· CLICK &amp; HOLD FOR BLACK HOLE · RELEASE FOR SHOCKWAVE</small>
              </>
            ) : (
              <>
                CLICK &amp; DRAG TO ORBIT <small>· HOLD SPACEBAR FOR BLACK HOLE</small>
              </>
            )}
          </span>
        </div>

        <div className="telemetry-group">
          <div className="telemetry-item fps-badge">
            <Activity size={12} className="fps-icon" />
            <span className="fps-value">{stats.fps} FPS</span>
          </div>
          <i className="telemetry-sep" />
          <div className="telemetry-item">
            <span>{(stats.particles / 1000).toFixed(0)}K NODES</span>
          </div>
          <i className="telemetry-sep" />
          <div className="telemetry-item">
            <span>SCALE: {stats.scale}x</span>
          </div>
          {stats.timeDilation && stats.timeDilation < 0.95 && (
            <>
              <i className="telemetry-sep" />
              <div className="telemetry-item time-freeze-telemetry">
                <span>DILATION: {stats.timeDilation}x</span>
              </div>
            </>
          )}
          <i className="telemetry-sep" />
          <div className="telemetry-item tech-badge">
            <span>PHASE 5 QUANTUM · THREE.JS · WEBGL 2</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
