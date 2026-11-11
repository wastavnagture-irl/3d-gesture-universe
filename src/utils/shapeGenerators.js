import * as THREE from 'three';

export const SHAPES = [
  {
    id: 'galaxy',
    name: 'Spiral Galaxy',
    icon: 'Sparkles',
    desc: 'Multi-arm barred spiral galaxy with a dense stellar core and orbital disk.',
    key: '1',
  },
  {
    id: 'nebula',
    name: 'Sphere / Nebula',
    icon: 'Globe',
    desc: 'Volumetric cosmic gas nebula with turbulent filaments and stellar nurseries.',
    key: '2',
  },
  {
    id: 'helix',
    name: 'DNA Helix',
    icon: 'Dna',
    desc: 'Double intertwined helical strands with connecting base-pair rungs.',
    key: '3',
  },
  {
    id: 'cube',
    name: 'Chaos Cube',
    icon: 'Box',
    desc: 'Quantum hypercube lattice with fluctuating kinetic sub-clusters.',
    key: '4',
  },
  {
    id: 'saturn',
    name: 'Ringed Planet',
    icon: 'CircleDot',
    desc: 'Central celestial body encircled by a vast ring with Cassini division.',
    key: '5',
  },
  {
    id: 'torus',
    name: 'Cosmic Torus',
    icon: 'Disc',
    desc: 'Twisting magnetic donut vortex with relativistic toroidal flux lines.',
    key: '6',
  },
];

export const COLOR_THEMES = [
  {
    id: 'cosmic',
    name: 'Cosmic Odyssey',
    colors: ['#0f2b66', '#2563eb', '#c026d3', '#06b6d4', '#fbbf24', '#ffffff'],
    badge: 'linear-gradient(135deg, #2563eb, #c026d3, #06b6d4, #fbbf24)',
  },
  {
    id: 'supernova',
    name: 'Supernova Fire',
    colors: ['#450a0a', '#dc2626', '#ea580c', '#f59e0b', '#fef08a', '#ffffff'],
    badge: 'linear-gradient(135deg, #dc2626, #ea580c, #f59e0b, #fef08a)',
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Neon',
    colors: ['#1e1b4b', '#7c3aed', '#ec4899', '#06b6d4', '#a3e635', '#ffffff'],
    badge: 'linear-gradient(135deg, #7c3aed, #ec4899, #06b6d4, #a3e635)',
  },
  {
    id: 'emerald',
    name: 'Emerald Astral',
    colors: ['#022c22', '#047857', '#10b981', '#14b8a6', '#6ee7b7', '#ffffff'],
    badge: 'linear-gradient(135deg, #047857, #10b981, #14b8a6, #6ee7b7)',
  },
];

// Helper: Random point inside sphere
export function randomInSphere(radius = 10) {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = Math.cbrt(Math.random()) * radius;
  const sinPhi = Math.sqrt(Math.max(0, 1 - u * u));
  return [r * sinPhi * Math.cos(theta), r * u, r * sinPhi * Math.sin(theta)];
}

// Generate target positions for each shape
export function generateShapeTargets(shapeId, count) {
  const positions = new Float32Array(count * 3);
  const goldenRatio = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const p = i / count;
    let x = 0, y = 0, z = 0;

    switch (shapeId) {
      case 'galaxy': {
        // Core vs Arms
        const isCore = Math.random() < 0.22;
        if (isCore) {
          const [cx, cy, cz] = randomInSphere(2.4);
          x = cx; y = cy * 0.7; z = cz;
        } else {
          const arms = 4;
          const arm = i % arms;
          const radius = Math.pow(Math.random(), 0.65) * 14.5 + 2.0;
          const spin = 1.35;
          const angle = (arm * Math.PI * 2) / arms + radius * spin * 0.38 + (Math.random() - 0.5) * 0.45;
          const spreadZ = (Math.random() - 0.5) * (0.6 + radius * 0.05);

          x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.6;
          z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.6;
          y = spreadZ;
        }
        break;
      }

      case 'nebula': {
        // Volumetric turbulent nebula with filament ripples
        const u = 2 * p - 1;
        const theta = i * goldenRatio;
        const sinPhi = Math.sqrt(Math.max(0, 1 - u * u));
        const baseR = 10.5;

        // Multi-frequency harmonic perturbation
        const ripple =
          Math.sin(theta * 4) * 1.2 +
          Math.cos(u * 8) * 1.1 +
          Math.sin(theta * 2 + u * 4) * 0.9;

        const depth = 0.55 + Math.cbrt(Math.random()) * 0.45;
        const r = (baseR + ripple) * depth;

        x = r * sinPhi * Math.cos(theta) + (Math.random() - 0.5) * 0.8;
        y = r * u + (Math.random() - 0.5) * 0.8;
        z = r * sinPhi * Math.sin(theta) + (Math.random() - 0.5) * 0.8;
        break;
      }

      case 'helix': {
        // DNA double helix with ladder rungs
        const turns = 7;
        const height = 24;
        const radius = 4.2;
        const t = (p - 0.5) * Math.PI * 2 * turns;
        y = (p - 0.5) * height;

        const isRung = i % 8 === 0;
        if (isRung) {
          // Cross-rung between strand 1 and strand 2
          const factor = Math.random() * 2 - 1; // from -1 to 1
          x = Math.cos(t) * radius * factor;
          z = Math.sin(t) * radius * factor;
          y += (Math.random() - 0.5) * 0.2;
        } else {
          // Main strands: strand 0 or strand 1 (offset by PI)
          const strand = i % 2 === 0 ? 0 : Math.PI;
          const jitter = (Math.random() - 0.5) * 0.4;
          x = Math.cos(t + strand) * (radius + jitter);
          z = Math.sin(t + strand) * (radius + jitter);
          y += (Math.random() - 0.5) * 0.35;
        }
        break;
      }

      case 'cube': {
        // Chaos hypercube with outer shell, inner wireframe, and kinetic cloud
        const mode = Math.random();
        const side = 15;
        const half = side / 2;

        if (mode < 0.6) {
          // On one of the 6 cube faces
          const face = Math.floor(Math.random() * 6);
          const u = (Math.random() - 0.5) * side;
          const v = (Math.random() - 0.5) * side;
          if (face === 0) [x, y, z] = [half, u, v];
          else if (face === 1) [x, y, z] = [-half, u, v];
          else if (face === 2) [x, y, z] = [u, half, v];
          else if (face === 3) [x, y, z] = [u, -half, v];
          else if (face === 4) [x, y, z] = [u, v, half];
          else [x, y, z] = [u, v, -half];
        } else if (mode < 0.85) {
          // Edges & wireframe scaffolding
          const edge = Math.floor(Math.random() * 12);
          const pos = (Math.random() - 0.5) * side;
          const sign1 = Math.random() > 0.5 ? half : -half;
          const sign2 = Math.random() > 0.5 ? half : -half;
          if (edge < 4) [x, y, z] = [pos, sign1, sign2];
          else if (edge < 8) [x, y, z] = [sign1, pos, sign2];
          else [x, y, z] = [sign1, sign2, pos];
        } else {
          // Swirling internal quantum matrix
          [x, y, z] = randomInSphere(half * 0.7);
        }
        x += (Math.random() - 0.5) * 0.3;
        y += (Math.random() - 0.5) * 0.3;
        z += (Math.random() - 0.5) * 0.3;
        break;
      }

      case 'saturn': {
        // Ringed planet
        const isPlanet = Math.random() < 0.28;
        if (isPlanet) {
          const [px, py, pz] = randomInSphere(4.2);
          x = px; y = py; z = pz;
        } else {
          // Concentric ring with Cassini gap
          let ringR = Math.random() < 0.55 ? 5.8 + Math.random() * 3.4 : 9.8 + Math.random() * 4.6;
          const ringAngle = Math.random() * Math.PI * 2;
          const ringY = (Math.random() - 0.5) * 0.25;

          // Tilt the ring by ~26 degrees
          const tilt = 0.45;
          const rawX = Math.cos(ringAngle) * ringR;
          const rawZ = Math.sin(ringAngle) * ringR;
          x = rawX;
          y = rawZ * Math.sin(tilt) + ringY;
          z = rawZ * Math.cos(tilt);
        }
        break;
      }

      case 'torus': {
        // Relativistic torus
        const majorR = 9.2;
        const minorR = 3.6;
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const rVar = (Math.random() - 0.5) * 0.8;
        const currMinor = minorR + rVar;

        x = (majorR + currMinor * Math.cos(v)) * Math.cos(u);
        z = (majorR + currMinor * Math.cos(v)) * Math.sin(u);
        y = currMinor * Math.sin(v);
        break;
      }

      default:
        [x, y, z] = randomInSphere(10);
    }

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
  }

  return positions;
}

// Generate vertex colors based on active theme & target positions
export function generateParticleColors(themeId, targets, count) {
  const colors = new Float32Array(count * 3);
  const theme = COLOR_THEMES.find(t => t.id === themeId) || COLOR_THEMES[0];
  const threeColors = theme.colors.map(hex => new THREE.Color(hex));

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const x = targets[idx];
    const y = targets[idx + 1];
    const z = targets[idx + 2];
    const dist = Math.sqrt(x * x + y * y + z * z);

    // Color gradient based on distance from core and vertical distribution
    let t = Math.min(1, dist / 15);
    // Add subtle noise/variation per particle
    t = Math.max(0, Math.min(1, t + (Math.random() - 0.5) * 0.15));

    // Map t across the palette
    const scaledT = t * (threeColors.length - 1);
    const c1Idx = Math.floor(scaledT);
    const c2Idx = Math.min(threeColors.length - 1, c1Idx + 1);
    const blend = scaledT - c1Idx;

    const color = threeColors[c1Idx].clone().lerp(threeColors[c2Idx], blend);

    // Give core particles higher brightness / glow
    if (dist < 2.5) {
      color.addScalar(0.2);
    }

    colors[idx] = Math.min(1, color.r);
    colors[idx + 1] = Math.min(1, color.g);
    colors[idx + 2] = Math.min(1, color.b);
  }

  return colors;
}
