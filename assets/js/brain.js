/* ============================================================
   The Dopamine Reset — 3D-Gehirn (Three.js, prozedurale Punktwolke)
   Lädt lazy. Fällt auf statisches Bild zurück bei:
   - prefers-reduced-motion
   - fehlendem WebGL
   - Three.js CDN nicht erreichbar
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('brain-canvas');
  const fallback = document.getElementById('brain-fallback');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showFallback() {
    if (canvas) canvas.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
  }

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  if (reduceMotion || !hasWebGL()) { showFallback(); return; }

  /* Lazy-Init: erst starten, wenn der Hero sichtbar ist (LCP schonen) */
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    init().catch(() => showFallback());
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); start(); }
    }, { threshold: 0.1 });
    io.observe(canvas);
  } else {
    start();
  }

  async function init() {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');

    const wrap = canvas.parentElement;
    let w = canvas.clientWidth || wrap.clientWidth || 440;
    let h = canvas.clientHeight || 440;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);

    const brain = new THREE.Group();
    scene.add(brain);

    /* ── Gehirn-artige Punktwolke: zwei deformierte Hemisphären ── */
    const COUNT = 4200;
    const positions = new Float32Array(COUNT * 3);
    const v = new THREE.Vector3();

    for (let i = 0; i < COUNT; i++) {
      // gleichmäßig verteilte Richtung auf der Kugel
      const u = Math.random(), t = Math.random();
      const theta = Math.acos(2 * u - 1);
      const phi = 2 * Math.PI * t;
      v.set(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta)
      );

      // Grundform: leicht abgeflachte, in die Länge gezogene Ellipse (Gehirn-Silhouette)
      v.x *= 1.45; v.y *= 1.05; v.z *= 1.2;

      // gyrus-artige Falten über überlagerte Sinusmodulation
      const fold =
        0.16 * Math.sin(v.x * 5.0 + v.y * 3.0) +
        0.12 * Math.sin(v.y * 6.0 + v.z * 4.0) +
        0.10 * Math.sin(v.z * 5.5 + v.x * 2.5);
      const r = 1 + fold;
      v.multiplyScalar(r);

      // Mittelspalt (Fissura longitudinalis) andeuten
      if (Math.abs(v.x) < 0.10) v.x *= 0.35;

      positions[i * 3]     = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // weiche, runde Glow-Textur für die Punkte
    const sprite = makeDotTexture(THREE);
    const mat = new THREE.PointsMaterial({
      size: 0.055,
      map: sprite,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color('#5FE9F0')
    });
    const points = new THREE.Points(geo, mat);
    brain.add(points);

    // innerer Kern-Glow als zweite, kleinere Wolke in Blau
    const coreMat = mat.clone();
    coreMat.color = new THREE.Color('#3B82F6');
    coreMat.size = 0.03;
    const core = new THREE.Points(geo.clone(), coreMat);
    core.scale.setScalar(0.82);
    brain.add(core);

    brain.rotation.x = 0.18;

    /* ── Maus-Parallax (sanft) ── */
    let targetY = 0, targetX = 0.18;
    window.addEventListener('mousemove', (e) => {
      targetY = ((e.clientX / window.innerWidth) - 0.5) * 0.5;
      targetX = 0.18 + ((e.clientY / window.innerHeight) - 0.5) * 0.35;
    }, { passive: true });

    /* ── Resize ── */
    const onResize = () => {
      w = canvas.clientWidth || wrap.clientWidth;
      h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

    /* ── Pausieren wenn nicht sichtbar ── */
    let visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(canvas);
    }

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!visible) return;
      const dt = clock.getDelta();
      brain.rotation.y += dt * 0.18 + (targetY - brain.rotation.y) * 0.02;
      brain.rotation.x += (targetX - brain.rotation.x) * 0.04;
      core.rotation.y -= dt * 0.05;
      renderer.render(scene, camera);
    }
    animate();
  }

  /* runde, weich auslaufende Punkt-Textur */
  function makeDotTexture(THREE) {
    const s = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  }
})();
