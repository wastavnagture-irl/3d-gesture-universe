import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COUNT = 36000;
const mount = document.querySelector('#scene');
const fpsNode = document.querySelector('#fps');
const SHAPES = ['galaxy', 'nebula', 'helix', 'cube'];
let activeShape = 'galaxy';
let dragging = false, pointerActive = false, releasePulse = 0, elapsed = 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function randomSphere() {
  const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2;
  const r = Math.cbrt(Math.random()) * 10, s = Math.sqrt(1 - u * u);
  return [r * s * Math.cos(t), r * u, r * s * Math.sin(t)];
}

function makeTargets() {
  const targets = {};
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (const shape of SHAPES) {
    const a = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      let x = 0, y = 0, z = 0, p = i / COUNT;
      if (shape === 'galaxy') {
        const arm = i % 5, radius = Math.pow(Math.random(), .58) * 12 + .4;
        const angle = arm * Math.PI * 2 / 5 + radius * .62 + (Math.random() - .5) * .62;
        x = Math.cos(angle) * radius; z = Math.sin(angle) * radius;
        y = (Math.random() - .5) * (.55 + radius * .045);
      } else if (shape === 'nebula') {
        const u = 2 * p - 1, t = i * golden, r = 8.5 + Math.sin(t * 3) * .8 + (Math.random() - .5) * 1.15;
        const s = Math.sqrt(1 - u * u);
        x = r * s * Math.cos(t); y = r * u; z = r * s * Math.sin(t);
      } else if (shape === 'helix') {
        const t = p * Math.PI * 12, strand = i % 2 ? 1 : -1;
        x = Math.cos(t + (strand < 0 ? Math.PI : 0)) * 3.1;
        z = Math.sin(t + (strand < 0 ? Math.PI : 0)) * 3.1;
        y = (p - .5) * 19;
        if (i % 7 === 0) { const f = Math.random(); x *= f; z *= f; }
      } else {
        const face = i % 6, u = (Math.random() - .5) * 15, v = (Math.random() - .5) * 15, d = 7.5;
        if (face === 0) [x,y,z] = [d,u,v];
        if (face === 1) [x,y,z] = [-d,u,v];
        if (face === 2) [x,y,z] = [u,d,v];
        if (face === 3) [x,y,z] = [u,-d,v];
        if (face === 4) [x,y,z] = [u,v,d];
        if (face === 5) [x,y,z] = [u,v,-d];
        const scatter = Math.random() < .16 ? 1.7 : .18;
        x += (Math.random() - .5) * scatter; y += (Math.random() - .5) * scatter; z += (Math.random() - .5) * scatter;
      }
      a.set([x,y,z], i * 3);
    }
    targets[shape] = a;
  }
  return targets;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color('#050611');
scene.fog = new THREE.FogExp2('#050611', .012);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 180);
camera.position.set(0, 3.5, 29);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(mount.clientWidth, mount.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .045;
controls.minDistance = 13; controls.maxDistance = 58;
controls.autoRotate = true; controls.autoRotateSpeed = .22;

const positions = new Float32Array(COUNT * 3);
const velocities = new Float32Array(COUNT * 3);
const colors = new Float32Array(COUNT * 3);
const sizes = new Float32Array(COUNT);
const targets = makeTargets();
const palette = ['#1c4cff', '#a72cff', '#15d9f5', '#ffbf58', '#e85bcf'].map(c => new THREE.Color(c));
for (let i = 0; i < COUNT; i++) {
  positions.set(randomSphere(), i * 3);
  const color = palette[(Math.random() * palette.length) | 0].clone().multiplyScalar(.68 + Math.random() * .62);
  colors.set([color.r, color.g, color.b], i * 3);
  sizes[i] = .65 + Math.random() * 1.7;
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
const material = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    attribute float aSize; varying vec3 vColor; uniform float uTime;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float pulse = 0.82 + 0.18 * sin(uTime * 1.6 + position.x * 0.35);
      gl_PointSize = aSize * pulse * (245.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }`,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      vec2 uv = gl_PointCoord - 0.5; float d = length(uv);
      float core = 1.0 - smoothstep(0.0, 0.5, d);
      float halo = exp(-d * 10.0) * 0.38;
      gl_FragColor = vec4(vColor, (core + halo) * 0.92);
    }`
});
const points = new THREE.Points(geometry, material);
scene.add(points);

const starGeo = new THREE.BufferGeometry(), starPos = new Float32Array(1800 * 3);
for (let i = 0; i < 1800; i++) starPos.set(randomSphere().map(v => v * 3.3), i * 3);
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#8292c9', size: .045, transparent: true, opacity: .58 }));
scene.add(stars);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(99, 99);
const pointerWorld = new THREE.Vector3();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const planeHit = new THREE.Vector3();
function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  pointerActive = true;
  raycaster.setFromCamera(pointer, camera);
  raycaster.ray.intersectPlane(plane, planeHit);
  pointerWorld.copy(planeHit);
}
renderer.domElement.addEventListener('pointermove', updatePointer);
renderer.domElement.addEventListener('pointerdown', e => { updatePointer(e); dragging = true; controls.autoRotate = false; });
window.addEventListener('pointerup', () => { if (dragging) releasePulse = 1; dragging = false; });
renderer.domElement.addEventListener('pointerleave', () => { pointerActive = false; if (dragging) { releasePulse = 1; dragging = false; } });

document.querySelectorAll('[data-shape]').forEach(button => button.addEventListener('click', () => {
  activeShape = button.dataset.shape;
  document.querySelectorAll('[data-shape]').forEach(b => b.classList.toggle('active', b === button));
}));
const helpCard = document.querySelector('#help-card');
document.querySelector('#help-toggle').addEventListener('click', () => { helpCard.hidden = !helpCard.hidden; });
document.querySelector('#help-close').addEventListener('click', () => { helpCard.hidden = true; });

const resizeObserver = new ResizeObserver(() => {
  const w = mount.clientWidth, h = mount.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
});
resizeObserver.observe(mount);

const clock = new THREE.Clock();
let frame = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .033);
  elapsed += dt; material.uniforms.uTime.value = elapsed;
  const target = targets[activeShape], current = geometry.attributes.position.array;
  if (releasePulse > .001) releasePulse *= Math.pow(.035, dt);
  const gravity = dragging, radius = gravity ? 7.8 : 5.4;
  for (let i = 0; i < COUNT; i++) {
    const k = i * 3, x = current[k], y = current[k + 1], z = current[k + 2];
    const phase = i * .013;
    let ax = (target[k] - x) * 2.15 - velocities[k] * 1.7;
    let ay = (target[k + 1] - y) * 2.15 - velocities[k + 1] * 1.7;
    let az = (target[k + 2] - z) * 2.15 - velocities[k + 2] * 1.7;
    ax += Math.sin(elapsed * .7 + phase) * .075;
    ay += Math.cos(elapsed * .58 + phase * 1.3) * .075;
    az += Math.sin(elapsed * .63 + phase * .7) * .075;
    if (pointerActive) {
      const dx = x - pointerWorld.x, dy = y - pointerWorld.y, dz = z - pointerWorld.z;
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz + .4);
      if (d < radius) {
        const falloff = 1 - d / radius;
        if (gravity) {
          const pull = 24 * falloff / d;
          ax -= dx * pull; ay -= dy * pull; az -= dz * pull;
          ax += -dy * pull * .24; ay += dx * pull * .24;
        } else {
          const push = 8.5 * falloff / d;
          ax += dx * push - dy * push * .26; ay += dy * push + dx * push * .26; az += dz * push;
        }
      }
    }
    if (releasePulse > .001) {
      const dx = x - pointerWorld.x, dy = y - pointerWorld.y, dz = z - pointerWorld.z;
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz) + .001;
      const wave = Math.exp(-Math.pow((d - (2.2 + (1 - releasePulse) * 11)) / 1.2, 2)) * releasePulse * 58;
      ax += dx / d * wave; ay += dy / d * wave; az += dz / d * wave;
    }
    velocities[k] = (velocities[k] + ax * dt) * .985;
    velocities[k + 1] = (velocities[k + 1] + ay * dt) * .985;
    velocities[k + 2] = (velocities[k + 2] + az * dt) * .985;
    current[k] = x + velocities[k] * dt;
    current[k + 1] = y + velocities[k + 1] * dt;
    current[k + 2] = z + velocities[k + 2] * dt;
  }
  geometry.attributes.position.needsUpdate = true;
  controls.update(); points.rotation.y = Math.sin(elapsed * .08) * .06; stars.rotation.y -= dt * .003;
  renderer.render(scene, camera);
  if (++frame % 90 === 0) fpsNode.textContent = `${Math.round(1 / Math.max(dt, .001))} FPS`;
}
animate();

window.addEventListener('beforeunload', () => {
  resizeObserver.disconnect(); controls.dispose(); geometry.dispose(); material.dispose();
  starGeo.dispose(); stars.material.dispose(); renderer.dispose();
});
