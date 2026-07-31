/* =======================================================================
   Appartement Maastrichtersteenweg — 1e verdieping links
   3D-render, 1-op-1 gebouwd uit de Illustrator-plattegrond (apt.pdf).
   Geometrie komt uit PLAN (plandata.js): muren, deuren, ramen, kasten.
   Coördinaten in meters. X = west→oost, Z = zuid→noord, Y = hoogte.
   ======================================================================= */
(function () {
  'use strict';
  const W = PLAN.W, D = PLAN.D, H = 2.60;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xafc7dd);
  const container = document.getElementById('app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const CENTER = new THREE.Vector3(W / 2, 0, D / 2);
  const orbitCam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 200);
  orbitCam.position.set(W / 2 + 9, 12, D / 2 + 13);
  const fpCam = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.02, 200);
  fpCam.position.set(W / 2, 1.65, 2.0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x808080, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.15);
  sun.position.set(-8, 17, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = 16;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s; sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 60; sun.shadow.bias = -0.0004;
  sun.target.position.copy(CENTER); scene.add(sun); scene.add(sun.target);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const M = {
    wall:     new THREE.MeshStandardMaterial({ color: 0xf3efe7, roughness: 0.95 }),
    wallOut:  new THREE.MeshStandardMaterial({ color: 0xe6ddcd, roughness: 1.0 }),
    tapis:    new THREE.MeshStandardMaterial({ color: 0xb9c7b0, roughness: 1.0 }),
    warm:     new THREE.MeshStandardMaterial({ color: 0xc9b79c, roughness: 1.0 }),
    tegels:   new THREE.MeshStandardMaterial({ color: 0xdfe4e8, roughness: 0.4 }),
    bad:      new THREE.MeshStandardMaterial({ color: 0xd6e6ee, roughness: 0.35 }),
    flex:     new THREE.MeshStandardMaterial({ color: 0xb99e86, roughness: 0.85 }),
    terras:   new THREE.MeshStandardMaterial({ color: 0x9a9a95, roughness: 1.0 }),
    glass:    new THREE.MeshStandardMaterial({ color: 0xaad4e5, roughness: 0.05, transparent: true, opacity: 0.32 }),
    frame:    new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.6, metalness: 0.3 }),
    wood:     new THREE.MeshStandardMaterial({ color: 0x9c6b41, roughness: 0.7 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x5f4023, roughness: 0.7 }),
    ceiling:  new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 1.0, side: THREE.DoubleSide }),
  };

  const shell = new THREE.Group(), extra = new THREE.Group(), labelGroup = new THREE.Group();
  scene.add(shell); scene.add(extra); scene.add(labelGroup);

  function box(w, h, d, mat, x, y, z, noCast) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = !noCast; m.receiveShadow = true; return m;
  }
  function floorRect(x1, z1, x2, z2, mat, y) {
    const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
    shell.add(box(w, 0.04, d, mat, (x1 + x2) / 2, (y || 0) + 0.02, (z1 + z2) / 2, true));
  }
  function ceilRect(x1, z1, x2, z2) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x2 - x1), Math.abs(z2 - z1)), M.ceiling);
    g.rotation.x = Math.PI / 2; g.position.set((x1 + x2) / 2, H, (z1 + z2) / 2); g.receiveShadow = true;
    g.userData.ceiling = true; shell.add(g);
  }

  // ---- vloeren + plafonds ----
  PLAN.floors.forEach(f => { floorRect(f.x1, f.z1, f.x2, f.z2, M[f.mat] || M.tapis); ceilRect(f.x1, f.z1, f.x2, f.z2); });

  // ---- muren met openingen ----
  function segBox(ax, fixed, a, b, y0, y1, thick, mat) {
    const len = b - a, h = y1 - y0;
    if (len <= 0.001 || h <= 0.001) return;
    shell.add(ax === 'x' ? box(len, h, thick, mat, (a + b) / 2, y0 + h / 2, fixed, true)
                         : box(thick, h, len, mat, fixed, y0 + h / 2, (a + b) / 2, true));
  }
  function glass(ax, fixed, at, w, y0, y1, thick) {
    const h = y1 - y0;
    shell.add(ax === 'x' ? box(w, h, 0.03, M.glass, at, y0 + h / 2, fixed, true)
                         : box(0.03, h, w, M.glass, fixed, y0 + h / 2, at, true));
    shell.add(ax === 'x' ? box(w + 0.05, h + 0.05, 0.05, M.frame, at, y0 + h / 2, fixed, true)
                         : box(0.05, h + 0.05, w + 0.05, M.frame, fixed, y0 + h / 2, at, true));
  }
  const DH = 2.10, WY0 = 0.95, WY1 = 2.25;
  PLAN.walls.forEach(wl => {
    const ax = wl.ax, fixed = (ax === 'x') ? wl.z : wl.x;
    const thick = wl.ext ? 0.18 : 0.10, mat = wl.ext ? M.wallOut : M.wall;
    const ops = (wl.op || []).map(o => ({ k: o.k, at: o.at, w: o.w, y0: o.k === 'window' ? WY0 : 0, y1: o.k === 'window' ? WY1 : DH }))
      .sort((p, q) => p.at - q.at);
    let pieces = [[wl.a, wl.b]];
    ops.forEach(o => {
      const a = o.at - o.w / 2, b = o.at + o.w / 2, np = [];
      pieces.forEach(([p0, p1]) => {
        if (b <= p0 || a >= p1) { np.push([p0, p1]); return; }
        if (a > p0) np.push([p0, a]);
        if (b < p1) np.push([b, p1]);
      });
      pieces = np;
    });
    pieces.forEach(([p0, p1]) => segBox(ax, fixed, p0, p1, 0, H, thick, mat));
    ops.forEach(o => {
      if (o.y1 < H - 0.001) segBox(ax, fixed, o.at - o.w / 2, o.at + o.w / 2, o.y1, H, thick, mat); // latei
      if (o.y0 > 0.001) segBox(ax, fixed, o.at - o.w / 2, o.at + o.w / 2, 0, o.y0, thick, mat);      // borstwering
      if (o.k === 'window') glass(ax, fixed, o.at, o.w, o.y0, o.y1, thick);
    });
  });

  // ---- inbouwkasten (vaste kasten) ----
  PLAN.inbouwkast.forEach(k => {
    const w = Math.abs(k.x2 - k.x1), d = Math.abs(k.z2 - k.z1);
    extra.add(box(w - 0.04, 2.25, d - 0.06, M.wood, (k.x1 + k.x2) / 2, 1.125, (k.z1 + k.z2) / 2, false));
    extra.add(box(w - 0.02, 0.02, d - 0.04, M.woodDark, (k.x1 + k.x2) / 2, 2.25, (k.z1 + k.z2) / 2, true));
  });

  // ---- terrassen ----
  PLAN.terras.forEach(t => {
    const x1 = Math.min(t.x1, t.x2), x2 = Math.max(t.x1, t.x2), z1 = Math.min(t.z1, t.z2), z2 = Math.max(t.z1, t.z2);
    shell.add(box(x2 - x1, 0.12, z2 - z1, M.terras, (x1 + x2) / 2, -0.06, (z1 + z2) / 2, true));
    const rh = 1.0, r = 0.04;
    for (let x = x1; x <= x2 + 0.01; x += 0.35) shell.add(box(0.02, rh, 0.02, M.frame, x, rh / 2, t.south ? z1 : z2, true));
    shell.add(box(x2 - x1, r, r, M.frame, (x1 + x2) / 2, rh, t.south ? z1 : z2, true));
    if (t.south) {
      for (let z = z1; z <= z2 + 0.01; z += 0.35) { shell.add(box(0.02, rh, 0.02, M.frame, x1, rh / 2, z, true)); shell.add(box(0.02, rh, 0.02, M.frame, x2, rh / 2, z, true)); }
      shell.add(box(r, r, z2 - z1, M.frame, x1, rh, (z1 + z2) / 2, true));
      shell.add(box(r, r, z2 - z1, M.frame, x2, rh, (z1 + z2) / 2, true));
    }
  });

  // ---- kamerlabels ----
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  PLAN.labels.forEach(([text, x, z]) => {
    const cw = 256, ch = 64, cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(20,24,28,0.82)'; roundRect(ctx, 4, 16, cw - 8, 34, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 24px Helvetica, Arial'; ctx.fillText(text, cw / 2, 41);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.position.set(x, 2.7, z); sp.scale.set(1.7, 0.42, 1); labelGroup.add(sp);
  });

  // =======================================================================
  //  CAMERA-MODI + CONTROLS
  // =======================================================================
  const orbit = new THREE.OrbitControls(orbitCam, renderer.domElement);
  orbit.target.copy(CENTER); orbit.enableDamping = true; orbit.dampingFactor = 0.08;
  orbit.maxPolarAngle = Math.PI / 2.05; orbit.minDistance = 4; orbit.maxDistance = 46; orbit.update();

  const keys = {};
  addEventListener('keydown', e => { keys[e.code] = true; });
  addEventListener('keyup', e => { keys[e.code] = false; });
  let mode = 'orbit', roof = true, yaw = 0, pitch = 0;
  const fpPos = new THREE.Vector3(W / 2, 1.65, 2.2);
  const btnOrbit = document.getElementById('btnOrbit'), btnWalk = document.getElementById('btnWalk');
  const btnRoof = document.getElementById('btnRoof'), hint = document.getElementById('hint'), dpad = document.getElementById('dpad');

  function setMode(m) {
    mode = m; labelGroup.visible = (m === 'orbit');
    btnOrbit.classList.toggle('active', m === 'orbit'); btnWalk.classList.toggle('active', m === 'walk');
    orbit.enabled = (m === 'orbit');
    if (m === 'walk') { fpPos.set(W / 2, 1.65, 2.2); yaw = Math.PI; pitch = 0; applyFP(); hint.classList.add('show'); dpad.classList.add('show'); setRoof(true); }
    else { hint.classList.remove('show'); dpad.classList.remove('show'); }
  }
  function setRoof(on) {
    roof = on; shell.children.forEach(c => { if (c.userData && c.userData.ceiling) c.visible = on; });
    btnRoof.classList.toggle('active', on); btnRoof.textContent = on ? 'Plafond: aan' : 'Plafond: uit';
  }
  function applyFP() {
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
    fpCam.position.copy(fpPos);
    fpCam.lookAt(fpPos.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))));
  }
  btnOrbit.onclick = () => setMode('orbit'); btnWalk.onclick = () => setMode('walk'); btnRoof.onclick = () => setRoof(!roof);

  let dragging = false, lastX = 0, lastY = 0; const el = renderer.domElement;
  function onDown(e) { if (mode !== 'walk') return; hint.classList.remove('show'); dragging = true; const p = e.touches ? e.touches[0] : e; lastX = p.clientX; lastY = p.clientY; }
  function onMove(e) { if (!dragging || mode !== 'walk') return; const p = e.touches ? e.touches[0] : e; yaw -= (p.clientX - lastX) * 0.005; pitch -= (p.clientY - lastY) * 0.005; lastX = p.clientX; lastY = p.clientY; applyFP(); if (e.cancelable) e.preventDefault(); }
  function onUp() { dragging = false; }
  el.addEventListener('mousedown', onDown); addEventListener('mousemove', onMove); addEventListener('mouseup', onUp);
  el.addEventListener('touchstart', onDown, { passive: true }); el.addEventListener('touchmove', onMove, { passive: false }); addEventListener('touchend', onUp);
  if (dpad) dpad.querySelectorAll('[data-key]').forEach(b => {
    const code = b.getAttribute('data-key'), press = v => e => { keys[code] = v; if (e.cancelable) e.preventDefault(); };
    b.addEventListener('mousedown', press(true)); b.addEventListener('touchstart', press(true), { passive: false });
    b.addEventListener('mouseup', press(false)); b.addEventListener('mouseleave', press(false)); b.addEventListener('touchend', press(false));
  });
  function moveFP(dt) {
    const speed = (keys['ShiftLeft'] ? 5.0 : 2.6) * dt; let f = 0, sx = 0;
    if (keys['KeyW'] || keys['ArrowUp']) f += 1; if (keys['KeyS'] || keys['ArrowDown']) f -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) sx -= 1; if (keys['KeyD'] || keys['ArrowRight']) sx += 1;
    if (!f && !sx) return; const l = Math.hypot(f, sx); f /= l; sx /= l;
    fpPos.x += (Math.sin(yaw) * f + Math.cos(yaw) * sx) * speed;
    fpPos.z += (Math.cos(yaw) * f - Math.sin(yaw) * sx) * speed;
    fpPos.x = Math.max(0.3, Math.min(W - 0.3, fpPos.x));
    fpPos.z = Math.max(0.3, Math.min(D - 0.3, fpPos.z)); fpPos.y = 1.65; applyFP();
  }
  let prev = performance.now();
  (function animate() {
    requestAnimationFrame(animate);
    const now = performance.now(), dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    if (mode === 'orbit') { orbit.update(); renderer.render(scene, orbitCam); }
    else { moveFP(dt); renderer.render(scene, fpCam); }
  })();
  addEventListener('resize', () => {
    orbitCam.aspect = innerWidth / innerHeight; orbitCam.updateProjectionMatrix();
    fpCam.aspect = innerWidth / innerHeight; fpCam.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  setMode('orbit'); setRoof(false);
  window.__APT = { scene, setMode };
})();
