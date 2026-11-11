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

  // Phase 3: Dual-Hand Tracking State
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

  // Helper for dynamic dual-gesture HUD
  const getGestureHUD = () => {
    if (!handControlEnabled) return null;
    if (!handData || (!handData.count && !handData.hand1)) {
      return {
        label: 'Searching for hands...',
        sublabel: 'Align 1 or 2 hands within webcam frame',
        icon: '🔍',
        themeClass: 'searching',
        isDual: false,
      };
    }

    const isDual = handData.count === 2;

    switch (handData.dualGesture) {
      case 'TWIN_SINGULARITIES':
        return {
          label: 'Twin Singularities',
          sublabel: 'Dual Fists: Binary Black Holes Gravitational Collapse',
          icon: '🕳️🕳️',
          themeClass: 'twin-fists',
          isDual: true,
        };
      case 'ENERGY_BRIDGE':
        return {
          label: 'Energy Bridge Portal',
          sublabel: 'Dual Palms: High-Density Particle Conduit',
          icon: '⚡',
          themeClass: 'energy-bridge',
          isDual: true,
        };
      case 'COSMIC_STRETCH':
        return {
          label: 'Cosmic Stretch & Scale',
          sublabel: `Universe Scale: ${stats.scale}x (Pinch & Move Apart/Together)`,
          icon: '✨',
          themeClass: 'cosmic-stretch',
          isDual: true,
        };
      case 'HYBRID_VORTEX':
        return {
          label: 'Singularity & Wind Hybrid',
          sublabel: 'One Fist (Black Hole) + One Open Palm (Cosmic Wind)',
          icon: '🌀',
          themeClass: 'hybrid-vortex',
          isDual: true,
        };
      case 'OPEN_PALM':
        return {
          label: 'Cosmic Repel Wind',
          sublabel: isDual ? 'Dual Open Palms Repelling Space' : 'Open Palm (5 Fingers)',
          icon: '🖐️',
          themeClass: 'open-palm',
          isDual,
        };
      case 'FIST':
        return {
          label: 'Black Hole Singularity',
          sublabel: 'Closed Fist (Gravity Well)',
          icon: '🕳️',
          themeClass: 'fist',
          isDual: false,
        };
      case 'PINCH':
        return {
          label: 'Orbital Condensation',
          sublabel: 'Pinch (Thumb + Index)',
          icon: '🤏',
          themeClass: 'pinch',
          isDual: false,
        };
      case 'SWIPE':
      case 'DUAL_TRACKING':
        return {
          label: isDual ? 'Dual Hand Flight Mode' : 'Cosmic Galaxy Tilt',
          sublabel: isDual ? 'Two Hands Orbiting & Tilting Universe' : 'Hand Movement Across Axes',
          icon: isDual ? '👐' : '👋',
          themeClass: 'dual-tracking',
          isDual,
        };
      default:
        return {
          label: isDual ? 'Dual Hand Tracking' : 'Tracking Hand',
          sublabel: `${handData.count || 1} Hand(s) Active in Scene`,
          icon: '✨',
          themeClass: 'neutral',
          isDual,
        };
    }
  };

  const gestureHUD = getGestureHUD();

  return (
    <main className="app-shell">
      {/* 3D Particle Canvas with Dual Hand Physics Input */}
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
          <div className="top-system-badge">
            <span className="live-dot" />
            <span className="system-text">PHASE 03</span>
            <i className="badge-divider" />
            <span className="system-phase">DUAL-HAND GESTURE ENGINE</span>
          </div>
        </div>

        {/* Center: Hand Control Toggle & Mode Switch */}
        <div className="top-center-controls">
          <button
            className={`hand-control-toggle-btn ${handControlEnabled ? 'active' : ''}`}
            onClick={() => setHandControlEnabled(!handControlEnabled)}
            title="Enable AI Dual-Hand Gesture Tracking (W)"
          >
            {handControlEnabled ? <Users size={14} className="pulse-icon" /> : <Hand size={14} />}
            <span>{handControlEnabled ? 'Dual Hand: ON' : 'Enable Hand Control'}</span>
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
          <span>PHASE 3 · DUAL-HAND KINETIC MATRIX</span>
        </div>
        <h1>
          Shape the <em>infinite.</em>
        </h1>
        <p>A living 3D particle universe sculpted by dual-hand kinetic fields and gravitational dynamics.</p>
        <div className="active-form-tag">
          <Layers size={12} />
          <span>CURRENT FORM:</span>
          <strong>{activeShapeObj.name.toUpperCase()}</strong>
        </div>
      </section>

      {/* Live HUD Dual-Gesture Badge */}
      {gestureHUD && (
        <div className={`live-gesture-hud-badge glassmorphism ${gestureHUD.themeClass}`}>
          <div className="hud-gesture-icon-wrap">
            <span className="hud-gesture-emoji">{gestureHUD.icon}</span>
          </div>
          <div className="hud-gesture-text-wrap">
            <div className="hud-gesture-header">
              <span className="hud-live-tag">
                {gestureHUD.isDual ? 'DUAL GESTURE ACTIVE' : 'GESTURE DETECTED'}
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

      {/* Picture-in-Picture Webcam AI Hand Tracker (Dual-Hand Skeletons) */}
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
                <h3>Universe Flight &amp; Dual-Hand Guide</h3>
                <span className="help-subtitle">Phase 3 Dual-Hand Kinetic Control</span>
              </div>
            </div>

            <div className="help-section-title">PHASE 3 DUAL-HAND GESTURES</div>
            <div className="help-grid">
              <div className="help-item">
                <span className="help-glyph">🕳️🕳️</span>
                <div>
                  <strong>Twin Singularities (Dual Fists)</strong>
                  <p>Spawns two independent black holes in 3D space, creating chaotic binary accretion streams.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">⚡</span>
                <div>
                  <strong>Energy Bridge / Portal (Dual Open Palms)</strong>
                  <p>Forms an intense high-density particle conduit and magnetic plasma stream linking both hands.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">✨</span>
                <div>
                  <strong>Cosmic Stretch &amp; Scale (Dual Pinch / Move)</strong>
                  <p>Move hands apart to expand the entire particle universe; bring them closer to condense into an orb.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🌀</span>
                <div>
                  <strong>Hybrid Vortex (One Fist + One Palm)</strong>
                  <p>Simultaneously suck particles into a singularity while scattering matter with cosmic wind.</p>
                </div>
              </div>
            </div>

            <div className="help-section-title">SINGLE-HAND GESTURES &amp; FALLBACK</div>
            <div className="help-grid">
              <div className="help-item">
                <span className="help-glyph">🖐️</span>
                <div>
                  <strong>Open Palm</strong>
                  <p>Cosmic Wind: Disperses and repels particles forcefully away from your hand.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🕳️</span>
                <div>
                  <strong>Closed Fist</strong>
                  <p>Black Hole: Sucks matter inward into a dense singularity with accretion swirl.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🖱️</span>
                <div>
                  <strong>Mouse / Touch Fallback</strong>
                  <p>Hover to swirl particles; Click &amp; hold for Black Hole; Release for Shockwave blast.</p>
                </div>
              </div>
            </div>

            <div className="keyboard-shortcuts-list">
              <span className="shortcuts-title">KEYBOARD SHORTCUTS</span>
              <div className="shortcut-chips">
                <div className="shortcut-chip"><kbd>W</kbd> Toggle Webcam Hand Control</div>
                <div className="shortcut-chip"><kbd>1</kbd> - <kbd>6</kbd> Morph Shapes</div>
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
                  DUAL HAND ACTIVE <small>· 🕳️🕳️ TWIN BLACK HOLES · ⚡ ENERGY BRIDGE · ✨ COSMIC STRETCH</small>
                </>
              ) : (
                <>
                  HAND TRACKING ACTIVE <small>· PRESENT 2ND HAND FOR DUAL-HAND DYNAMICS</small>
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
          <i className="telemetry-sep" />
          <div className="telemetry-item tech-badge">
            <span>DUAL-HAND · THREE.JS · WEBGL 2</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
