<template>
  <div ref="mount" class="absolute inset-0" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';

const props = defineProps({
  // tenant nodes: [{ slug, name, color_primary, color_secondary }]
  nodes: { type: Array, default: () => [] },
});
const emit = defineEmits(['select-node']);

const mount = ref(null);
let renderer, scene, camera, frameId, raycaster, pointer;
let dome, starField, nodeGroup;
const rings = [];          // rotating geometric pattern rings
const nodeMeshes = [];
let hovered = null;
const target = { x: 0, y: 0 };
const current = { x: 0, y: 0 };
const clock = new THREE.Clock();
let reduceMotion = false;

const GOLD = 0xFEC700, GREEN = 0x02462E, LIGHT = 0x6BBC01, CREAM = 0xFBF6E6;
const hexToColor = (h) => new THREE.Color(h || '#FEC700');

/* Build one flat 8-pointed star (rub el hizb) outline as a line loop */
const makeStar = (radius, points = 8, depth = 0.38) => {
  const verts = [];
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * (1 - depth);
    const a = i * step - Math.PI / 2;
    verts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  verts.push(verts[0].clone());
  return new THREE.BufferGeometry().setFromPoints(verts);
};

/* Build a polygon ring (the girih frame) */
const makePolygon = (radius, sides) => {
  const verts = [];
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    verts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(verts);
};

const init = () => {
  const el = mount.value;
  const w = el.clientWidth, h = el.clientHeight;
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04110b, 0.04);

  camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
  // Look slightly up into the "dome"
  camera.position.set(0, 0, 13);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  el.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const p1 = new THREE.PointLight(GOLD, 1.1, 60); p1.position.set(0, 0, 12); scene.add(p1);

  // ── The dome: concentric rotating geometric layers (Turkish Iznik / muqarnas) ──
  dome = new THREE.Group();
  scene.add(dome);

  const layers = [
    { radius: 2.0,  points: 8,  color: GOLD,  spin:  0.10, op: 0.95 },
    { radius: 3.2,  points: 8,  color: LIGHT, spin: -0.07, op: 0.75 },
    { radius: 4.6,  points: 12, color: GOLD,  spin:  0.05, op: 0.6  },
    { radius: 6.2,  points: 12, color: CREAM, spin: -0.035,op: 0.4  },
    { radius: 8.0,  points: 16, color: LIGHT, spin:  0.025,op: 0.28 },
  ];

  layers.forEach((L, idx) => {
    const ring = new THREE.Group();

    // Star outline
    const star = new THREE.LineLoop(
      makeStar(L.radius, L.points, 0.4),
      new THREE.LineBasicMaterial({ color: L.color, transparent: true, opacity: L.op })
    );
    ring.add(star);

    // Second star, rotated half a step → classic interlaced 8/16-point look
    const star2 = new THREE.LineLoop(
      makeStar(L.radius, L.points, 0.4),
      new THREE.LineBasicMaterial({ color: L.color, transparent: true, opacity: L.op * 0.6 })
    );
    star2.rotation.z = Math.PI / L.points;
    ring.add(star2);

    // Polygon frame around it
    const poly = new THREE.LineLoop(
      makePolygon(L.radius * 1.02, L.points),
      new THREE.LineBasicMaterial({ color: L.color, transparent: true, opacity: L.op * 0.35 })
    );
    ring.add(poly);

    ring.userData = { spin: L.spin };
    rings.push(ring);
    dome.add(ring);
  });

  // Central rosette — a small filled 8-point star that glows
  const coreShape = new THREE.Shape();
  const cs = 0.9, pts = 8, step = Math.PI / pts;
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? cs : cs * 0.45;
    const a = i * step - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? coreShape.moveTo(x, y) : coreShape.lineTo(x, y);
  }
  coreShape.closePath();
  const core = new THREE.Mesh(
    new THREE.ShapeGeometry(coreShape),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  dome.add(core);

  // ── Tenant nodes: glowing lamps placed within the pattern ──
  nodeGroup = new THREE.Group();
  scene.add(nodeGroup);
  buildNodes();

  // ── Starfield backdrop ──
  const starCount = 700;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 20 + Math.random() * 28;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    positions[i*3]   = r * Math.sin(p) * Math.cos(t);
    positions[i*3+1] = r * Math.sin(p) * Math.sin(t);
    positions[i*3+2] = r * Math.cos(p) - 10;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starField = new THREE.Points(sg, new THREE.PointsMaterial({ color: CREAM, size: 0.07, transparent: true, opacity: 0.55 }));
  scene.add(starField);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2(-2, -2);

  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);

  animate();
};

const buildNodes = () => {
  nodeMeshes.length = 0;
  while (nodeGroup.children.length) nodeGroup.remove(nodeGroup.children[0]);

  const list = props.nodes.length ? props.nodes : [
    { slug: 'mys', name: 'Muslim Youth Summit', color_secondary: '#FEC700' },
    { slug: 'icp', name: 'Islamic Camping', color_secondary: '#6BBC01' },
  ];

  const n = list.length;
  // Place nodes on the points of the second pattern ring
  const radius = 3.2;
  list.forEach((t, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const col = hexToColor(t.color_secondary || t.color_primary || '#FEC700');

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 24),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.75, metalness: 0.2, roughness: 0.3 })
    );
    lamp.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.4);
    lamp.userData = { tenant: t, angle, radius };

    // Glow halo
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.62, 24),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    lamp.add(halo);

    nodeGroup.add(lamp);
    nodeMeshes.push(lamp);
  });
};

const onPointerMove = (e) => {
  const r = mount.value.getBoundingClientRect();
  target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
  target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
};

const onClick = () => { if (hovered?.userData?.tenant) emit('select-node', hovered.userData.tenant); };

const onResize = () => {
  if (!renderer) return;
  const w = mount.value.clientWidth, h = mount.value.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h);
};

const animate = () => {
  frameId = requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const speed = reduceMotion ? 0.12 : 1;

  current.x += (target.x - current.x) * 0.05;
  current.y += (target.y - current.y) * 0.05;
  if (dome) {
    // Gentle 3D tilt of the whole dome toward the cursor (looking into the vault)
    dome.rotation.x = current.y * 0.35 - 0.05;
    dome.rotation.y = current.x * 0.35;
  }

  // Each geometric layer rotates at its own rate → mesmerising interlace
  rings.forEach((ring) => { ring.rotation.z += ring.userData.spin * 0.01 * speed * 60 / 60; });
  rings.forEach((ring, i) => { ring.rotation.z = t * ring.userData.spin * speed; });

  if (starField) starField.rotation.z = t * 0.008;

  // Nodes ride the second ring's rotation + gentle bob
  const ringSpin = t * (rings[1]?.userData.spin || -0.07) * speed;
  nodeMeshes.forEach((m, i) => {
    const a = m.userData.angle + ringSpin;
    m.position.x = Math.cos(a) * m.userData.radius;
    m.position.y = Math.sin(a) * m.userData.radius;
    m.position.z = 0.4 + Math.sin(t * 1.5 + i) * 0.15;
    // Pulse glow
    const mat = m.material;
    mat.emissiveIntensity = 0.6 + (Math.sin(t * 2 + i) * 0.5 + 0.5) * 0.4;
  });

  // Hover
  if (raycaster && camera) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(nodeMeshes, false);
    const nh = hits.length ? hits[0].object : null;
    if (nh !== hovered) {
      if (hovered) hovered.scale.setScalar(1);
      hovered = nh;
      if (mount.value) mount.value.style.cursor = hovered ? 'pointer' : 'default';
    }
    if (hovered) hovered.scale.setScalar(1.3 + Math.sin(t * 6) * 0.06);
  }

  renderer.render(scene, camera);
};

defineExpose({ rebuild: buildNodes });

onMounted(init);
onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  window.removeEventListener('resize', onResize);
  if (mount.value) {
    mount.value.removeEventListener('pointermove', onPointerMove);
    mount.value.removeEventListener('click', onClick);
  }
  renderer?.dispose();
  scene?.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  if (renderer?.domElement && mount.value?.contains(renderer.domElement)) {
    mount.value.removeChild(renderer.domElement);
  }
});
</script>
