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
  CameraOff,
  Sparkles,
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
  const [interactionMode, setInteractionMode] = useState('gravity'); // 'gravity' | 'orbit'
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [stats, setStats] = useState({ fps: 60, particles: 40000, handActive: false, gesture: 'NONE' });
  const [gravityCharge, setGravityCharge] = useState(0);

  // Phase 2: Webcam AI Hand Gesture Tracking State
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

  // Keyboard navigation shortcuts
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

  // Helper for current gesture label
  const getGestureHUD = () => {
    if (!handControlEnabled) return null;
    if (!handData || !handData.hasHand) {
      return {
        label: 'Searching for hand...',
        sublabel: 'Align hand within webcam frame',
        icon: '🔍',
        themeClass: 'searching',
      };
    }
    switch (handData.gesture) {
      case 'OPEN_PALM':
        return {
          label: 'Cosmic Repel Wind',
          sublabel: 'Open Palm (5 Fingers)',
          icon: '🖐️',
          themeClass: 'open-palm',
        };
      case 'FIST':
        return {
          label: 'Black Hole Singularity',
          sublabel: 'Closed Fist (Gravity Well)',
          icon: '🕳️',
          themeClass: 'fist',
        };
      case 'PINCH':
        return {
          label: 'Orbital Condensation',
          sublabel: 'Pinch (Thumb + Index)',
          icon: '🤏',
          themeClass: 'pinch',
        };
      case 'SWIPE':
        return {
          label: 'Cosmic Galaxy Tilt',
          sublabel: 'Hand Swipe / Movement',
          icon: '👋',
          themeClass: 'swipe',
        };
      default:
        return {
          label: 'Tracking Hand',
          sublabel: 'Neutral Orientation',
          icon: '✨',
          themeClass: 'neutral',
        };
    }
  };

  const gestureHUD = getGestureHUD();

  return (
    <main className="app-shell">
      {/* 3D Particle Canvas with Hand Tracking Input */}
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

      {/* Atmospheric Vignette Overlay */}
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
            <span className="system-text">PHASE 02</span>
            <i className="badge-divider" />
            <span className="system-phase">AI GESTURE ENGINE</span>
          </div>
        </div>

        {/* Center: Hand Control Toggle & Mode Switch */}
        <div className="top-center-controls">
          <button
            className={`hand-control-toggle-btn ${handControlEnabled ? 'active' : ''}`}
            onClick={() => setHandControlEnabled(!handControlEnabled)}
            title="Enable AI Webcam Hand Gesture Tracking (W)"
          >
            {handControlEnabled ? <Camera size={14} className="pulse-icon" /> : <Hand size={14} />}
            <span>{handControlEnabled ? 'Hand Control: ON' : 'Enable Hand Control'}</span>
            <span className="shortcut-mini-tag">W</span>
          </button>

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
          <span>PHASE 2 · VISION GESTURE TELEMETRY</span>
        </div>
        <h1>
          Shape the <em>infinite.</em>
        </h1>
        <p>A living 3D particle universe sculpted by gravitational fields and AI hand tracking.</p>
        <div className="active-form-tag">
          <Layers size={12} />
          <span>CURRENT FORM:</span>
          <strong>{activeShapeObj.name.toUpperCase()}</strong>
        </div>
      </section>

      {/* Live HUD Gesture Badge (Appears when Hand Control is Active) */}
      {gestureHUD && (
        <div className={`live-gesture-hud-badge glassmorphism ${gestureHUD.themeClass}`}>
          <div className="hud-gesture-icon-wrap">
            <span className="hud-gesture-emoji">{gestureHUD.icon}</span>
          </div>
          <div className="hud-gesture-text-wrap">
            <div className="hud-gesture-header">
              <span className="hud-live-tag">GESTURE DETECTED</span>
              {handData?.hasHand && <span className="hud-live-pulse-dot" />}
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

      {/* Picture-in-Picture Webcam AI Hand Tracker */}
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
            <span className="charge-label">SINGULARITY CHARGE</span>
            <span className="charge-percent">{Math.round(gravityCharge * 100)}%</span>
          </div>
          <div className="charge-progress-bar-bg">
            <div
              className="charge-progress-fill"
              style={{ width: `${Math.min(100, gravityCharge * 100)}%` }}
            />
          </div>
          <div className="charge-hint">
            {handControlEnabled ? 'OPEN HAND TO DETONATE SHOCKWAVE' : 'RELEASE TO DETONATE SHOCKWAVE'}
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
                <h3>Universe Flight &amp; Gesture Guide</h3>
                <span className="help-subtitle">Phase 2 AI Hand Vision &amp; Physics</span>
              </div>
            </div>

            <div className="help-section-title">AI HAND GESTURES (WEBCAM)</div>
            <div className="help-grid">
              <div className="help-item">
                <span className="help-glyph">🖐️</span>
                <div>
                  <strong>Open Palm (5 Fingers Extended)</strong>
                  <p>Cosmic Wind: Disperses and repels particles forcefully away from your hand.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🕳️</span>
                <div>
                  <strong>Closed Fist</strong>
                  <p>Black Hole: Sucks nearby matter inward into a dense singularity with accretion swirl.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">🤏</span>
                <div>
                  <strong>Pinch (Thumb + Index Touching)</strong>
                  <p>Orbital Condensation: Compresses particle universe into a tight glowing orb.</p>
                </div>
              </div>

              <div className="help-item">
                <span className="help-glyph">👋</span>
                <div>
                  <strong>Hand Swipe / Movement</strong>
                  <p>Cosmic Tilt: Smoothly rotates and banks the entire 3D universe following your hand.</p>
                </div>
              </div>
            </div>

            <div className="help-section-title">MOUSE &amp; KEYBOARD FALLBACK</div>
            <div className="help-grid">
              <div className="help-item">
                <span className="help-glyph">🖱️</span>
                <div>
                  <strong>Move &amp; Click</strong>
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
              <>
                WEBCAM HAND TRACKING ACTIVE <small>· 🖐️ REPEL · 🕳️ FIST BLACK HOLE · 🤏 PINCH CONDENSE · 👋 TILT</small>
              </>
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
          <div className="telemetry-item tech-badge">
            <span>MEDIAPIPE · THREE.JS · WEBGL 2</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
