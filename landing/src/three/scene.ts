import * as THREE from 'three';

type Options = { reducedMotion: boolean };

/** Soft round sprite for points. */
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Hero background: a slow "connected business" network — nodes drifting on a wide,
 * gently waving sheet, linked when close, in the Marnova blues, with pulses travelling
 * between them. Pointer parallax, scroll fade, paused when off-screen or hidden.
 */
export function createScene(canvas: HTMLCanvasElement, opt: Options) {
  const host = canvas.parentElement!;
  const mobile = window.matchMedia('(max-width: 900px)').matches;
  const N = mobile ? 70 : 150;
  const LINK = mobile ? 2.1 : 1.85;
  const MAX_LINKS = N * 6;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#040B24', 10, 26);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.set(0, 1.2, 12);

  const rig = new THREE.Group();
  rig.rotation.x = -0.32;
  scene.add(rig);

  // --- nodes ---
  const SPREAD_X = 15;
  const SPREAD_Z = 9;
  const base = new Float32Array(N * 3);
  const vel = new Float32Array(N * 2);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    base[i * 3] = (Math.random() - 0.5) * SPREAD_X * 2;
    base[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
    base[i * 3 + 2] = (Math.random() - 0.5) * SPREAD_Z * 2 - 2;
    vel[i * 2] = (Math.random() - 0.5) * 0.12;
    vel[i * 2 + 1] = (Math.random() - 0.5) * 0.12;
    seed[i] = Math.random() * Math.PI * 2;
  }
  const pos = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const blue = new THREE.Color('#5B8CFF');
  const cyan = new THREE.Color('#38D6F0');
  for (let i = 0; i < N; i++) {
    const c = Math.random() < 0.22 ? cyan : blue;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dot = dotTexture();
  const pMat = new THREE.PointsMaterial({
    size: mobile ? 0.2 : 0.17,
    map: dot,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  rig.add(new THREE.Points(pGeo, pMat));

  // --- links ---
  const lPos = new Float32Array(MAX_LINKS * 6);
  const lCol = new Float32Array(MAX_LINKS * 6);
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3).setUsage(THREE.DynamicDrawUsage));
  lGeo.setAttribute('color', new THREE.BufferAttribute(lCol, 3).setUsage(THREE.DynamicDrawUsage));
  const lMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  rig.add(new THREE.LineSegments(lGeo, lMat));

  // --- pulses travelling between nodes ---
  const PULSES = mobile ? 6 : 14;
  const pulsePos = new Float32Array(PULSES * 3);
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  const pulseMat = new THREE.PointsMaterial({ size: 0.34, map: dot, color: '#BFF4FF', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  rig.add(new THREE.Points(pulseGeo, pulseMat));
  const pulseState = Array.from({ length: PULSES }, () => ({ a: (Math.random() * N) | 0, b: (Math.random() * N) | 0, t: Math.random() }));

  // --- layout ---
  const layout = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(host);

  // --- input ---
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // --- loop ---
  let raf = 0;
  let running = false;
  const clock = new THREE.Clock();
  let t = 0;

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;

    for (let i = 0; i < N; i++) {
      const ix = i * 3;
      base[ix] += vel[i * 2] * dt;
      base[ix + 2] += vel[i * 2 + 1] * dt;
      if (base[ix] > SPREAD_X) base[ix] = -SPREAD_X;
      if (base[ix] < -SPREAD_X) base[ix] = SPREAD_X;
      if (base[ix + 2] > SPREAD_Z - 2) base[ix + 2] = -SPREAD_Z - 2;
      if (base[ix + 2] < -SPREAD_Z - 2) base[ix + 2] = SPREAD_Z - 2;
      const x = base[ix];
      const z = base[ix + 2];
      pos[ix] = x;
      pos[ix + 1] = base[ix + 1] + Math.sin(x * 0.35 + t * 0.6) * 0.45 + Math.cos(z * 0.4 + t * 0.4) * 0.35 + Math.sin(t + seed[i]) * 0.08;
      pos[ix + 2] = z;
    }
    pGeo.attributes.position.needsUpdate = true;

    let n = 0;
    const L2 = LINK * LINK;
    for (let i = 0; i < N && n < MAX_LINKS; i++) {
      const ax = pos[i * 3], ay = pos[i * 3 + 1], az = pos[i * 3 + 2];
      for (let j = i + 1; j < N && n < MAX_LINKS; j++) {
        const bx = pos[j * 3], by = pos[j * 3 + 1], bz = pos[j * 3 + 2];
        const dx = ax - bx, dy = ay - by, dz = az - bz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > L2) continue;
        const k = 1 - Math.sqrt(d2) / LINK;
        const o = n * 6;
        lPos[o] = ax; lPos[o + 1] = ay; lPos[o + 2] = az;
        lPos[o + 3] = bx; lPos[o + 4] = by; lPos[o + 5] = bz;
        lCol[o] = lCol[o + 3] = 0.18 * k;
        lCol[o + 1] = lCol[o + 4] = 0.38 * k;
        lCol[o + 2] = lCol[o + 5] = 0.95 * k;
        n++;
      }
    }
    lGeo.setDrawRange(0, n * 2);
    lGeo.attributes.position.needsUpdate = true;
    lGeo.attributes.color.needsUpdate = true;

    pulseState.forEach((p, i) => {
      p.t += dt * 0.35;
      if (p.t >= 1) {
        p.a = p.b;
        p.b = (Math.random() * N) | 0;
        p.t = 0;
      }
      const a = p.a * 3, b = p.b * 3;
      pulsePos[i * 3] = pos[a] + (pos[b] - pos[a]) * p.t;
      pulsePos[i * 3 + 1] = pos[a + 1] + (pos[b + 1] - pos[a + 1]) * p.t;
      pulsePos[i * 3 + 2] = pos[a + 2] + (pos[b + 2] - pos[a + 2]) * p.t;
    });
    pulseGeo.attributes.position.needsUpdate = true;

    const heroH = host.clientHeight || 1;
    const p = Math.min(1, Math.max(0, window.scrollY / heroH));
    rig.position.y = -p * 2.5;
    lMat.opacity = 0.55 * (1 - p * 0.8);
    pMat.opacity = 0.95 * (1 - p * 0.7);

    rig.rotation.y = pointer.x * 0.12 + Math.sin(t * 0.05) * 0.05;
    camera.position.x = pointer.x * 0.6;
    camera.position.y = 1.2 - pointer.y * 0.35;
    camera.lookAt(0, -0.4, 0);

    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running || opt.reducedMotion) return;
    running = true;
    clock.getDelta();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  frame();
  canvas.classList.add('is-ready');
  host.classList.add('has-scene');

  const io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop()));
  io.observe(host);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  return {
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onPointer);
      [pGeo, lGeo, pulseGeo].forEach((g) => g.dispose());
      [pMat, lMat, pulseMat].forEach((m) => m.dispose());
      dot.dispose();
      renderer.dispose();
    },
  };
}
