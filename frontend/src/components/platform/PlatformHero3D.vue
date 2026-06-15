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
let hub, nodeGroup, starField, linkGroup;
const nodeMeshes = [];
let hovered = null;
const target = { x: 0, y: 0 };          // mouse parallax target
const current = { x: 0, y: 0 };
const clock = new THREE.Clock();
let reduceMotion = false;

const hexToColor = (h) => new THREE.Color(h || '#FEC700');

const init = () => {
  const el = mount.value;
  const w = el.clientWidth, h = el.clientHeight;
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05140d, 0.035);

  camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
  camera.position.set(0, 0, 14);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  el.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.PointLight(0xfec700, 1.2, 60);
  key.position.set(6, 8, 10);
  scene.add(key);
  const fill = new THREE.PointLight(0x6bbc01, 0.8, 60);
  fill.position.set(-8, -4, 6);
  scene.add(fill);

  // ── Central hub: glowing wireframe icosahedron ──
  const hubGeo = new THREE.IcosahedronGeometry(2.4, 1);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x02462e, emissive: 0x0a3d2a, metalness: 0.4, roughness: 0.3,
    wireframe: true, transparent: true, opacity: 0.85,
  });
  hub = new THREE.Mesh(hubGeo, hubMat);
  scene.add(hub);

  // Inner solid core
  const coreGeo = new THREE.IcosahedronGeometry(1.5, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x02462e, emissive: 0xfec700, emissiveIntensity: 0.15,
    metalness: 0.6, roughness: 0.2, flatShading: true,
  });
  hub.add(new THREE.Mesh(coreGeo, coreMat));

  // ── Orbiting tenant nodes ──
  nodeGroup = new THREE.Group();
  scene.add(nodeGroup);
  linkGroup = new THREE.Group();
  scene.add(linkGroup);
  buildNodes();

  // ── Starfield ──
  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 22 + Math.random() * 26;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    positions[i*3]   = r * Math.sin(p) * Math.cos(t);
    positions[i*3+1] = r * Math.sin(p) * Math.sin(t);
    positions[i*3+2] = r * Math.cos(p);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starField = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xfbf6e6, size: 0.08, transparent: true, opacity: 0.7, sizeAttenuation: true,
  }));
  scene.add(starField);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2(-2, -2);

  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);

  animate();
};

const buildNodes = () => {
  // Clear existing
  nodeMeshes.length = 0;
  while (nodeGroup.children.length) nodeGroup.remove(nodeGroup.children[0]);
  if (linkGroup) while (linkGroup.children.length) linkGroup.remove(linkGroup.children[0]);

  const list = props.nodes.length ? props.nodes : [
    { slug: 'mys', name: 'Muslim Youth Summit', color_secondary: '#FEC700' },
    { slug: 'icp', name: 'Islamic Camping', color_secondary: '#2A9D8F' },
  ];

  const n = list.length;
  const radius = 6;
  list.forEach((t, i) => {
    const angle = (i / n) * Math.PI * 2;
    const yOff = (Math.sin(i * 1.7) * 1.6);
    const col = hexToColor(t.color_secondary || t.color_primary || '#FEC700');

    const geo = new THREE.SphereGeometry(0.7, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: col, emissive: col, emissiveIntensity: 0.5,
      metalness: 0.3, roughness: 0.25,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { tenant: t, angle, yOff, baseScale: 1 };
    mesh.position.set(Math.cos(angle) * radius, yOff, Math.sin(angle) * radius);

    // Glowing halo ring
    const ringGeo = new THREE.TorusGeometry(0.95, 0.03, 8, 40);
    const ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);

    nodeGroup.add(mesh);
    nodeMeshes.push(mesh);

    // Connecting line hub → node (positions updated each frame in animate)
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.28 });
    const line = new THREE.Line(lineGeo, lineMat);
    line.userData = { node: mesh };
    linkGroup.add(line);
  });
};

const onPointerMove = (e) => {
  const r = mount.value.getBoundingClientRect();
  target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
  target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
};

const onClick = () => {
  if (hovered?.userData?.tenant) emit('select-node', hovered.userData.tenant);
};

const onResize = () => {
  if (!renderer) return;
  const w = mount.value.clientWidth, h = mount.value.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h);
};

const animate = () => {
  frameId = requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const speed = reduceMotion ? 0.15 : 1;

  // Smooth parallax
  current.x += (target.x - current.x) * 0.05;
  current.y += (target.y - current.y) * 0.05;
  if (scene) {
    scene.rotation.y = current.x * 0.35;
    scene.rotation.x = current.y * 0.2;
  }

  if (hub) { hub.rotation.y = t * 0.25 * speed; hub.rotation.x = t * 0.1 * speed; }
  if (starField) starField.rotation.y = t * 0.01;

  // Orbit nodes
  nodeMeshes.forEach((m, i) => {
    const a = m.userData.angle + t * 0.18 * speed;
    const radius = 6;
    m.position.x = Math.cos(a) * radius;
    m.position.z = Math.sin(a) * radius;
    m.position.y = m.userData.yOff + Math.sin(t * 1.2 + i) * 0.4;
    m.rotation.y = t * 0.6;
  });

  // Connecting-line web: hub centre → each node, with a travelling pulse
  if (linkGroup) {
    linkGroup.children.forEach((line, i) => {
      const node = line.userData.node;
      if (!node) return;
      const pos = line.geometry.attributes.position;
      pos.setXYZ(0, 0, 0, 0);                                   // hub centre
      pos.setXYZ(1, node.position.x, node.position.y, node.position.z);
      pos.needsUpdate = true;
      // Pulse opacity so energy seems to flow outward
      line.material.opacity = 0.16 + (Math.sin(t * 2 + i * 0.9) * 0.5 + 0.5) * 0.28;
    });
  }

  // Hover detection
  if (raycaster && camera) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(nodeMeshes, false);
    const newHover = hits.length ? hits[0].object : null;
    if (newHover !== hovered) {
      if (hovered) hovered.scale.setScalar(1);
      hovered = newHover;
      if (mount.value) mount.value.style.cursor = hovered ? 'pointer' : 'default';
    }
    if (hovered) hovered.scale.setScalar(1.35 + Math.sin(t * 6) * 0.05);
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
