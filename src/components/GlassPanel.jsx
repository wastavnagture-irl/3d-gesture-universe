import React, { useState } from 'react';
import {
  Sparkles,
  Globe,
  Dna,
  Box,
  CircleDot,
  Disc,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SHAPES, COLOR_THEMES } from '../utils/shapeGenerators';

const SHAPE_ICONS = {
  Sparkles,
  Globe,
  Dna,
  Box,
  CircleDot,
  Disc,
};

const GlassPanel = ({
  shape,
  setShape,
  theme,
  setTheme,
  particleSize,
  setParticleSize,
  speed,
  setSpeed,
  gravityStrength,
  setGravityStrength,
  particleCount,
  setParticleCount,
  autoRotate,
  setAutoRotate,
  onTriggerSupernova,
  isMuted,
  onToggleAudio,
}) => {
  const [showTuning, setShowTuning] = useState(false);

  return (
    <aside className="control-panel glassmorphism">
      <div className="panel-heading">
        <div>
          <div className="eyebrow-small">
            <span className="pulsing-neon-dot" />
            MORPHOLOGY MATRIX
          </div>
          <h2>Cosmic Presets</h2>
        </div>
        <button
          className={`toggle-tuning-btn ${showTuning ? 'active' : ''}`}
          onClick={() => setShowTuning(!showTuning)}
          title="Toggle Simulation Tuning Parameters"
          aria-label="Toggle Physics Tuning"
        >
          <Sliders size={14} />
          <span>{showTuning ? 'Presets' : 'Physics'}</span>
        </button>
      </div>

      {!showTuning ? (
        <>
          <div className="shape-list">
            {SHAPES.map((item) => {
              const IconComponent = SHAPE_ICONS[item.icon] || Sparkles;
              const isActive = shape === item.id;
              return (
                <button
                  key={item.id}
                  className={`shape-button ${isActive ? 'active' : ''}`}
                  onClick={() => setShape(item.id)}
                  title={item.desc}
                >
                  <div className="shape-icon-wrap">
                    <IconComponent size={17} />
                  </div>
                  <div className="shape-text-wrap">
                    <span className="shape-name">{item.name}</span>
                    <span className="shape-desc-hint">{item.desc.slice(0, 32)}...</span>
                  </div>
                  <span className="shape-shortcut">{item.key}</span>
                </button>
              );
            })}
          </div>

          <div className="panel-divider" />

          {/* Color Palettes */}
          <div className="theme-section">
            <span className="section-label">STELLAR SPECTRUM</span>
            <div className="theme-grid">
              {COLOR_THEMES.map((th) => (
                <button
                  key={th.id}
                  className={`theme-badge-btn ${theme === th.id ? 'active' : ''}`}
                  onClick={() => setTheme(th.id)}
                  title={th.name}
                >
                  <span className="theme-gradient-preview" style={{ background: th.badge }} />
                  <span className="theme-label-short">{th.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="tuning-section">
          <div className="control-slider-group">
            <div className="slider-header">
              <span className="slider-title">Particle Scale</span>
              <span className="slider-value">{particleSize.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={particleSize}
              onChange={(e) => setParticleSize(parseFloat(e.target.value))}
              className="glass-slider"
            />
          </div>

          <div className="control-slider-group">
            <div className="slider-header">
              <span className="slider-title">Kinetic Velocity</span>
              <span className="slider-value">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.2"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="glass-slider"
            />
          </div>

          <div className="control-slider-group">
            <div className="slider-header">
              <span className="slider-title">Gravity Well Intensity</span>
              <span className="slider-value">{gravityStrength.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={gravityStrength}
              onChange={(e) => setGravityStrength(parseFloat(e.target.value))}
              className="glass-slider"
            />
          </div>

          <div className="control-slider-group">
            <div className="slider-header">
              <span className="slider-title">Density Density</span>
              <span className="slider-value">{(particleCount / 1000).toFixed(0)}k</span>
            </div>
            <div className="density-toggle-group">
              {[20000, 40000, 60000].map((cnt) => (
                <button
                  key={cnt}
                  className={`density-btn ${particleCount === cnt ? 'active' : ''}`}
                  onClick={() => setParticleCount(cnt)}
                >
                  {cnt / 1000}k
                </button>
              ))}
            </div>
          </div>

          <div className="tuning-actions">
            <button
              className={`action-btn-small ${autoRotate ? 'active' : ''}`}
              onClick={() => setAutoRotate(!autoRotate)}
            >
              Orbit Drift: {autoRotate ? 'ON' : 'OFF'}
            </button>
            <button className="action-btn-small" onClick={onToggleAudio}>
              {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              {isMuted ? 'Audio Off' : 'Audio On'}
            </button>
          </div>
        </div>
      )}

      <div className="panel-divider" />

      {/* Supernova Blast Button */}
      <button className="supernova-burst-btn" onClick={onTriggerSupernova} title="Trigger Core Supernova Blast">
        <Zap size={14} className="burst-icon" />
        <span>Ignite Supernova</span>
        <span className="shortcut-tag">SPACE</span>
      </button>

      <div className="panel-footer">
        <span className="mini-orbit">◎</span>
        <span>ACTIVE NODES</span>
        <strong>{particleCount.toLocaleString()}</strong>
      </div>
    </aside>
  );
};

export default GlassPanel;
