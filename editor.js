/* =======================================================================
   Verbouw-editor — Appartement Maastrichtersteenweg
   2D: sleep/vergroot ruimtes, kies functie.  3D: bekijk, loop rond
   (ook op terrassen), zet zonlicht aan/uit voor lichtinval.
   ======================================================================= */
(function () {
  'use strict';
  const W = 9.156, D = 11.52, H = 2.60;

  const TYPES = {
    living:     { label: 'Living / leefruimte', col: '#c7d2bd', floor: 0xb9c7b0 },
    slaapkamer: { label: 'Slaapkamer',          col: '#d8c3ac', floor: 0xb99e86 },
    keuken:     { label: 'Keuken',              col: '#bcd3d8', floor: 0xdfe4e8 },
    badkamer:   { label: 'Badkamer',            col: '#cfe2ec', floor: 0xd6e6ee },
    eetkamer:   { label: 'Eetkamer',            col: '#c9d6c0', floor: 0xb9c7b0 },
    bureau:     { label: 'Bureau / kantoor',    col: '#cdc3d6', floor: 0xb9a9c0 },
    hal:        { label: 'Hal / gang',          col: '#d3c6b4', floor: 0xc9b79c },
    kast:       { label: 'Kast / berging',      col: '#dccfbe', floor: 0xc9b79c },
    traphal:    { label: 'Traphal',             col: '#e2ded6', floor: 0xdfe4e8 },
    leeg:       { label: 'Leeg / overig',       col: '#e6e3db', floor: 0xd8d5cd },
  };

  // vaste terrassen (niet-bewerkbaar), in editor-coördinaten (west=0 links, noord=boven)
  const TERRAS = [
    { x: 1.27, z: 0.0, w: 3.0, d: 0.69, south: true },   // terras onder (living)
    { x: 0.53, z: 11.52, w: 2.15, d: 0.77, south: false }, // terras boven (keuken)
  ];

  const DEFAULT = [
    { name: 'Keuken', type: 'keuken', x: 0.00, z: 8.05, w: 2.37, d: 3.47 },
    { name: 'Slaapkamer 1', type: 'slaapkamer', x: 2.37, z: 8.05, w: 3.11, d: 3.47 },
    { name: 'Inbouwkasten', type: 'kast', x: 5.48, z: 8.05, w: 1.04, d: 3.47 },
    { name: 'Slaapkamer 2', type: 'slaapkamer', x: 6.52, z: 8.05, w: 2.64, d: 3.47 },
    { name: 'Badkamer', type: 'badkamer', x: 3.82, z: 5.63, w: 1.66, d: 2.42 },
    { name: 'Hal', type: 'hal', x: 5.48, z: 4.43, w: 1.04, d: 3.62 },
    { name: 'Traphal', type: 'traphal', x: 6.52, z: 4.43, w: 1.92, d: 3.62 },
    { name: 'Living / leefruimte', type: 'living', x: 0.00, z: 0.00, w: 7.89, d: 4.43 },
    { name: 'Living (west)', type: 'living', x: 0.00, z: 4.43, w: 3.82, d: 3.62 },
  ];

  const KEY = 'mstw_verbouw_v1';
  let rooms = load() || DEFAULT.map(r => Object.assign({}, r));
  let sel = -1;

  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); return (s && s.length) ? s : null; } catch (e) { return null; } }
  function save() { localStorage.setItem(KEY, JSON.stringify(rooms)); flash('Opgeslagen ✓'); }

  // ===================== 2D EDITOR =====================
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const wrap = document.getElementById('canvasWrap');
  let scale = 40, ox = 40, oy = 40;
  function fit() {
    const r = wrap.getBoundingClientRect();
    cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio;
    cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
    const m = 40;
    scale = Math.min((r.width - 2 * m) / W, (r.height - 2 * m) / (D + 1)) * devicePixelRatio;
    ox = (cv.width - W * scale) / 2; oy = (cv.height - D * scale) / 2;
    draw();
  }
  const PX = x => ox + x * scale;
  const PZ = z => oy + (D - z) * scale;        // noord boven
  const IX = px => (px - ox) / scale;
  const IZ = py => D - (py - oy) / scale;

  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    // terrassen
    ctx.fillStyle = '#3a3f47';
    TERRAS.forEach(t => { ctx.fillRect(PX(t.x), PZ(t.z + t.d), t.w * scale, t.d * scale); });
    ctx.font = (11 * devicePixelRatio) + 'px Helvetica'; ctx.fillStyle = '#8b93a0'; ctx.textAlign = 'center';
    TERRAS.forEach(t => ctx.fillText('terras', PX(t.x + t.w / 2), PZ(t.z + t.d / 2) + 4));
    // ruimtes
    rooms.forEach((r, i) => {
      const t = TYPES[r.type] || TYPES.leeg;
      ctx.fillStyle = t.col; ctx.strokeStyle = (i === sel) ? '#c79a3f' : '#2a2f37';
      ctx.lineWidth = (i === sel ? 3 : 1.5) * devicePixelRatio;
      ctx.fillRect(PX(r.x), PZ(r.z + r.d), r.w * scale, r.d * scale);
      ctx.strokeRect(PX(r.x), PZ(r.z + r.d), r.w * scale, r.d * scale);
      ctx.fillStyle = '#2a2a2a'; ctx.font = 'bold ' + (12 * devicePixelRatio) + 'px Helvetica';
      ctx.fillText(r.name, PX(r.x + r.w / 2), PZ(r.z + r.d / 2) + 3);
      ctx.font = (10 * devicePixelRatio) + 'px Helvetica'; ctx.fillStyle = '#555';
      ctx.fillText(r.w.toFixed(2) + ' × ' + r.d.toFixed(2) + ' m', PX(r.x + r.w / 2), PZ(r.z + r.d / 2) + 18 * devicePixelRatio);
    });
    // handvatten
    if (sel >= 0) {
      const r = rooms[sel];
      handles(r).forEach(h => { ctx.fillStyle = '#c79a3f'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * devicePixelRatio;
        ctx.beginPath(); ctx.arc(PX(h.x), PZ(h.z), 6 * devicePixelRatio, 0, 7); ctx.fill(); ctx.stroke(); });
    }
  }
  function handles(r) { // 4 hoeken
    return [
      { k: 'nw', x: r.x, z: r.z + r.d }, { k: 'ne', x: r.x + r.w, z: r.z + r.d },
      { k: 'sw', x: r.x, z: r.z }, { k: 'se', x: r.x + r.w, z: r.z },
    ];
  }

  let drag = null;
  function pos(e) { const p = e.touches ? e.touches[0] : e; const b = cv.getBoundingClientRect();
    return { px: (p.clientX - b.left) * devicePixelRatio, py: (p.clientY - b.top) * devicePixelRatio }; }
  function down(e) {
    const { px, py } = pos(e);
    if (sel >= 0) { for (const h of handles(rooms[sel])) if (Math.hypot(PX(h.x) - px, PZ(h.z) - py) < 12 * devicePixelRatio) { drag = { mode: 'resize', k: h.k, r: rooms[sel] }; return; } }
    for (let i = rooms.length - 1; i >= 0; i--) { const r = rooms[i];
      if (px >= PX(r.x) && px <= PX(r.x + r.w) && py <= PZ(r.z) && py >= PZ(r.z + r.d)) {
        sel = i; drag = { mode: 'move', r, dx: IX(px) - r.x, dz: IZ(py) - r.z }; panel(); draw(); return; } }
    sel = -1; drag = null; panel(); draw();
  }
  const snap = v => Math.round(v * 20) / 20;
  function move(e) {
    if (!drag) return; const { px, py } = pos(e); const r = drag.r;
    if (drag.mode === 'move') { r.x = snap(IX(px) - drag.dx); r.z = snap(IZ(py) - drag.dz); }
    else { let x1 = r.x, z1 = r.z, x2 = r.x + r.w, z2 = r.z + r.d; const mx = snap(IX(px)), mz = snap(IZ(py));
      if (drag.k.includes('w')) x1 = mx; if (drag.k.includes('e')) x2 = mx; if (drag.k.includes('s')) z1 = mz; if (drag.k.includes('n')) z2 = mz;
      r.x = Math.min(x1, x2); r.z = Math.min(z1, z2); r.w = Math.max(0.4, Math.abs(x2 - x1)); r.d = Math.max(0.4, Math.abs(z2 - z1)); }
    panel(); draw(); if (e.cancelable) e.preventDefault();
  }
  function up() { drag = null; }
  cv.addEventListener('mousedown', down); addEventListener('mousemove', move); addEventListener('mouseup', up);
  cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); addEventListener('touchend', up);

  // ===================== SIDEBAR =====================
  const side = document.getElementById('side');
  function panel() {
    if (sel < 0) { side.innerHTML = '<div class="empty">Selecteer een ruimte (klik erop) om de <b>naam</b>, <b>functie</b> en <b>afmetingen</b> aan te passen.<br><br>Of voeg een nieuwe ruimte toe met <b>+ Ruimte</b>.</div>'; return; }
    const r = rooms[sel];
    let html = '<h2>Ruimte bewerken</h2>';
    html += '<div class="field"><label>Naam</label><input id="fName" value="' + esc(r.name) + '"></div>';
    html += '<div class="field"><label>Functie</label><div class="types">';
    for (const k in TYPES) html += '<button data-t="' + k + '" class="' + (r.type === k ? 'on' : '') + '"><span class="sw" style="background:' + TYPES[k].col + '"></span>' + TYPES[k].label + '</button>';
    html += '</div></div>';
    html += '<div class="field"><label>Afmetingen (m)</label><div class="dims"><input id="fW" value="' + r.w.toFixed(2) + '"><input id="fD" value="' + r.d.toFixed(2) + '"></div></div>';
    html += '<button class="btn warn" id="delBtn" style="width:100%">Ruimte verwijderen</button>';
    side.innerHTML = html;
    document.getElementById('fName').oninput = e => { r.name = e.target.value; draw(); };
    side.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { r.type = b.getAttribute('data-t'); panel(); draw(); });
    document.getElementById('fW').onchange = e => { r.w = Math.max(0.4, parseFloat(e.target.value) || r.w); draw(); };
    document.getElementById('fD').onchange = e => { r.d = Math.max(0.4, parseFloat(e.target.value) || r.d); draw(); };
    document.getElementById('delBtn').onclick = () => { rooms.splice(sel, 1); sel = -1; panel(); draw(); };
    if (innerWidth <= 760) side.classList.add('show');
  }
  const esc = s => (s + '').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  document.getElementById('addBtn').onclick = () => { rooms.push({ name: 'Nieuwe ruimte', type: 'leeg', x: 3, z: 3, w: 2.5, d: 2.5 }); sel = rooms.length - 1; panel(); draw(); };
  document.getElementById('saveBtn').onclick = save;
  document.getElementById('resetBtn').onclick = () => { if (confirm('Terug naar de originele indeling?')) { rooms = DEFAULT.map(r => Object.assign({}, r)); sel = -1; panel(); draw(); } };

  function flash(t) { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#c79a3f;color:#171307;padding:9px 16px;border-radius:10px;font-weight:700;z-index:99'; document.body.appendChild(d); setTimeout(() => d.remove(), 1400); }

  // ===================== 3D VIEW =====================
  let three = null;
  function build3D() {
    const host = document.getElementById('app3d');
    if (!three) three = init3D(host);
    three.rebuild(rooms);
  }

  function init3D(host) {
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xaecbe4);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    const CENTER = new THREE.Vector3(W / 2, 0, D / 2);
    const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 200); cam.position.set(W / 2 + 9, 12.5, -8);
    const fp = new THREE.PerspectiveCamera(72, 1, 0.02, 200);
    const hemi = new THREE.HemisphereLight(0xdfeaf6, 0x8a8a80, 0.55); scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, 0.22); scene.add(amb);
    const sun = new THREE.DirectionalLight(0xfff1d8, 1.0); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const s = 16;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s; sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 80; sun.shadow.bias = -0.0004; sun.target.position.copy(CENTER);
    scene.add(sun); scene.add(sun.target);
    // grond
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x8ba06e, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.12; ground.receiveShadow = true; scene.add(ground);

    const model = new THREE.Group(); scene.add(model);
    const MAT = {
      wall: new THREE.MeshStandardMaterial({ color: 0xf1ece3, roughness: 0.95 }),
      glass: new THREE.MeshStandardMaterial({ color: 0xaad4e5, roughness: 0.05, transparent: true, opacity: 0.28 }),
      frame: new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.6, metalness: 0.3 }),
      terras: new THREE.MeshStandardMaterial({ color: 0x9a9a95, roughness: 1 }),
      base: new THREE.MeshStandardMaterial({ color: 0xdad6ce, roughness: 1 }),
      ceil: new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 1, side: THREE.DoubleSide }),
    };
    const floorMats = {};
    for (const k in TYPES) floorMats[k] = new THREE.MeshStandardMaterial({ color: TYPES[k].floor, roughness: 0.9 });

    function box(w, h, d, m, x, y, z, noCast) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = !noCast; b.receiveShadow = true; return b; }
    const mx = x => W - x; // spiegel naar juiste oriëntatie

    let ceilings = [];
    function rebuild(rms) {
      while (model.children.length) model.remove(model.children[0]); ceilings = [];
      // basisvloer (vult gaten tussen ruimtes)
      const bx = [], bz = [];
      rms.forEach(r => { bx.push(mx(r.x), mx(r.x + r.w)); bz.push(r.z, r.z + r.d); });
      if (bx.length) { const x1 = Math.min(...bx), x2 = Math.max(...bx), z1 = Math.min(...bz), z2 = Math.max(...bz);
        model.add(box(x2 - x1, 0.12, z2 - z1, MAT.base, (x1 + x2) / 2, -0.08, (z1 + z2) / 2, true)); }
      // terrassen
      TERRAS.forEach(t => { const x1 = mx(t.x + t.w), x2 = mx(t.x);
        model.add(box(x2 - x1, 0.12, t.d, MAT.terras, (x1 + x2) / 2, -0.06, t.z + t.d / 2, true));
        railing(x1, t.z, x2, t.z + t.d, t.south); });
      rms.forEach(r => {
        const x1 = mx(r.x + r.w), x2 = mx(r.x), z1 = r.z, z2 = r.z + r.d;
        const fm = floorMats[r.type] || floorMats.leeg;
        model.add(box(x2 - x1, 0.04, z2 - z1, fm, (x1 + x2) / 2, 0.02, (z1 + z2) / 2, true));
        const c = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), MAT.ceil);
        c.rotation.x = Math.PI / 2; c.position.set((x1 + x2) / 2, H, (z1 + z2) / 2); c.receiveShadow = true; c.userData.c = 1; model.add(c); ceilings.push(c);
        // 4 muren; buitenrand krijgt raam
        edge('z', x1, z1, z2, near0(r.x + r.w, W));   // world west  (= orig oost)
        edge('z', x2, z1, z2, near0(r.x, 0));         // world oost  (= orig west)
        edge('x', z1, x1, x2, near0(r.z, 0));         // zuid
        edge('x', z2, x1, x2, near0(r.z + r.d, D));   // noord
      });
      applyCeil();
    }
    function near0(v, t) { return Math.abs(v - t) < 0.25; }
    function edge(ax, fixed, a, b, ext) {
      const th = ext ? 0.16 : 0.09, len = Math.abs(b - a);
      if (ext && len > 1.4) { // muur met raam
        const win = Math.min(len * 0.6, 2.0), y0 = 0.95, y1 = 2.25, c = (a + b) / 2;
        seg(ax, fixed, Math.min(a, b), c - win / 2, 0, H, th); seg(ax, fixed, c + win / 2, Math.max(a, b), 0, H, th);
        seg(ax, fixed, c - win / 2, c + win / 2, 0, y0, th); seg(ax, fixed, c - win / 2, c + win / 2, y1, H, th);
        glass(ax, fixed, c, win, y0, y1);
      } else seg(ax, fixed, Math.min(a, b), Math.max(a, b), 0, H, th);
    }
    function seg(ax, fixed, a, b, y0, y1, th) { const len = b - a, h = y1 - y0; if (len <= 0.01 || h <= 0.01) return;
      model.add(ax === 'x' ? box(len, h, th, MAT.wall, (a + b) / 2, y0 + h / 2, fixed, true) : box(th, h, len, MAT.wall, fixed, y0 + h / 2, (a + b) / 2, true)); }
    function glass(ax, fixed, at, w, y0, y1) { const h = y1 - y0;
      model.add(ax === 'x' ? box(w, h, 0.03, MAT.glass, at, y0 + h / 2, fixed, true) : box(0.03, h, w, MAT.glass, fixed, y0 + h / 2, at, true));
      model.add(ax === 'x' ? box(w + .05, h + .05, .05, MAT.frame, at, y0 + h / 2, fixed, true) : box(.05, h + .05, w + .05, MAT.frame, fixed, y0 + h / 2, at, true)); }
    function railing(x1, z1, x2, z2, south) { const rh = 1, r = 0.04;
      for (let x = x1; x <= x2 + .01; x += .35) model.add(box(.02, rh, .02, MAT.frame, x, rh / 2, south ? z1 : z2, true));
      model.add(box(x2 - x1, r, r, MAT.frame, (x1 + x2) / 2, rh, south ? z1 : z2, true));
      if (south) { for (let z = z1; z <= z2 + .01; z += .35) { model.add(box(.02, rh, .02, MAT.frame, x1, rh / 2, z, true)); model.add(box(.02, rh, .02, MAT.frame, x2, rh / 2, z, true)); }
        model.add(box(r, r, z2 - z1, MAT.frame, x1, rh, (z1 + z2) / 2, true)); model.add(box(r, r, z2 - z1, MAT.frame, x2, rh, (z1 + z2) / 2, true)); } }

    // ---- controls ----
    const orbit = new THREE.OrbitControls(cam, renderer.domElement);
    orbit.target.copy(CENTER); orbit.enableDamping = true; orbit.dampingFactor = .08; orbit.maxPolarAngle = Math.PI / 2.05; orbit.minDistance = 4; orbit.maxDistance = 50;
    let mode = 'orbit', roofOn = false, sunOn = true;
    const keys = {}; addEventListener('keydown', e => keys[e.code] = true); addEventListener('keyup', e => keys[e.code] = false);
    let yaw = Math.PI, pitch = -0.05; const fpPos = new THREE.Vector3(W / 2, 1.65, 1.2);
    function applyFP() { pitch = Math.max(-1.2, Math.min(1.2, pitch)); fp.position.copy(fpPos); fp.lookAt(fpPos.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)))); }
    function applyCeil() { ceilings.forEach(c => c.visible = roofOn); }
    let dragging = false, lx = 0, ly = 0; const el = renderer.domElement;
    el.addEventListener('mousedown', e => { if (mode !== 'walk') return; dragging = true; lx = e.clientX; ly = e.clientY; });
    addEventListener('mousemove', e => { if (!dragging || mode !== 'walk') return; yaw -= (e.clientX - lx) * .005; pitch -= (e.clientY - ly) * .005; lx = e.clientX; ly = e.clientY; applyFP(); });
    addEventListener('mouseup', () => dragging = false);
    el.addEventListener('touchstart', e => { if (mode !== 'walk') return; dragging = true; lx = e.touches[0].clientX; ly = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchmove', e => { if (!dragging || mode !== 'walk') return; yaw -= (e.touches[0].clientX - lx) * .005; pitch -= (e.touches[0].clientY - ly) * .005; lx = e.touches[0].clientX; ly = e.touches[0].clientY; applyFP(); if (e.cancelable) e.preventDefault(); }, { passive: false });
    addEventListener('touchend', () => dragging = false);

    // UI overlay
    const ui = document.createElement('div');
    ui.style.cssText = 'position:absolute;top:14px;right:14px;display:flex;flex-direction:column;gap:8px;z-index:6;align-items:flex-end';
    ui.innerHTML =
      '<div style="display:flex;gap:6px">' +
      '<button class="e3 on" data-m="orbit">🔄 Overzicht</button><button class="e3" data-m="walk">🚶 Rondlopen</button></div>' +
      '<button class="e3" id="e_roof">Plafond: uit</button>' +
      '<button class="e3 on" id="e_sun">☀️ Zon: aan</button>' +
      '<div id="e_timewrap" style="background:#171b23cc;border:1px solid #ffffff22;border-radius:9px;padding:7px 10px;display:flex;gap:8px;align-items:center"><span style="font-size:11px;color:#9db0c0">🕗</span><input id="e_time" type="range" min="7" max="20" step="0.5" value="13" style="width:120px"><span id="e_tlab" style="font-size:11px;color:#eef2f6;width:34px">13:00</span></div>';
    host.appendChild(ui);
    const dpad = document.createElement('div');
    dpad.style.cssText = 'position:absolute;bottom:18px;right:18px;display:none;flex-direction:column;align-items:center;gap:6px;z-index:6;touch-action:none';
    dpad.innerHTML = '<button class="e3 pad" data-k="KeyW">▲</button><div style="display:flex;gap:6px"><button class="e3 pad" data-k="KeyA">◀</button><button class="e3 pad" data-k="KeyS">▼</button><button class="e3 pad" data-k="KeyD">▶</button></div>';
    host.appendChild(dpad);
    const st = document.createElement('style'); st.textContent = '.e3{background:#171b23cc;color:#eef2f6;border:1px solid #ffffff22;border-radius:9px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer;backdrop-filter:blur(8px)}.e3.on{background:#c79a3f;color:#171307;border-color:#c79a3f}.e3.pad{width:46px;height:46px;font-size:16px;padding:0}'; document.head.appendChild(st);

    function setMode(m) { mode = m; ui.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.getAttribute('data-m') === m));
      orbit.enabled = (m === 'orbit'); dpad.style.display = (m === 'walk') ? 'flex' : 'none';
      if (m === 'walk') { fpPos.set(W / 2, 1.65, 2.4); yaw = 0; pitch = -0.03; if (!roofOn) toggleRoof(); applyFP(); } }
    function toggleRoof() { roofOn = !roofOn; applyCeil(); document.getElementById('e_roof').classList.toggle('on', roofOn); document.getElementById('e_roof').textContent = 'Plafond: ' + (roofOn ? 'aan' : 'uit'); }
    ui.querySelectorAll('[data-m]').forEach(b => b.onclick = () => setMode(b.getAttribute('data-m')));
    document.getElementById('e_roof').onclick = toggleRoof;
    const sunBtn = document.getElementById('e_sun'), timeWrap = document.getElementById('e_timewrap');
    sunBtn.onclick = () => { sunOn = !sunOn; sun.visible = sunOn; sunBtn.classList.toggle('on', sunOn); sunBtn.textContent = sunOn ? '☀️ Zon: aan' : '🌙 Zon: uit';
      hemi.intensity = sunOn ? 0.55 : 0.95; amb.intensity = sunOn ? 0.22 : 0.5; timeWrap.style.opacity = sunOn ? 1 : .4; };
    function setSun(h) { document.getElementById('e_tlab').textContent = (h < 10 ? '0' : '') + Math.floor(h) + ':' + (h % 1 ? '30' : '00');
      const a = (h - 13.5) / 7 * Math.PI * 0.9;          // azimut (oost->west)
      const el = Math.max(0.12, Math.cos((h - 13.5) / 7 * Math.PI * 0.62)); // hoogte
      const R = 22; sun.position.set(W / 2 + Math.sin(a) * R, el * 20 + 3, D / 2 - Math.cos(a) * R * 0.2 - 10 + (1 - el) * 6);
      sun.intensity = 0.45 + el * 0.7; scene.background.setHSL(0.58, 0.42, 0.5 + el * 0.13); }
    document.getElementById('e_time').oninput = e => setSun(parseFloat(e.target.value));
    setSun(13); dpad.querySelectorAll('[data-k]').forEach(b => { const c = b.getAttribute('data-k'); const p = v => e => { keys[c] = v; if (e.cancelable) e.preventDefault(); };
      b.addEventListener('mousedown', p(true)); b.addEventListener('touchstart', p(true), { passive: false }); b.addEventListener('mouseup', p(false)); b.addEventListener('mouseleave', p(false)); b.addEventListener('touchend', p(false)); });

    function resize() { const r = host.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height); cam.aspect = fp.aspect = r.width / r.height; cam.updateProjectionMatrix(); fp.updateProjectionMatrix(); }
    let prev = performance.now();
    function loop() { requestAnimationFrame(loop); const now = performance.now(), dt = Math.min((now - prev) / 1000, .05); prev = now;
      if (mode === 'orbit') { orbit.update(); renderer.render(scene, cam); }
      else { const sp = (keys['ShiftLeft'] ? 4.5 : 2.4) * dt; let f = 0, sx = 0;
        if (keys['KeyW'] || keys['ArrowUp']) f += 1; if (keys['KeyS'] || keys['ArrowDown']) f -= 1; if (keys['KeyA'] || keys['ArrowLeft']) sx -= 1; if (keys['KeyD'] || keys['ArrowRight']) sx += 1;
        if (f || sx) { const l = Math.hypot(f, sx); f /= l; sx /= l; fpPos.x += (Math.sin(yaw) * f + Math.cos(yaw) * sx) * sp; fpPos.z += (Math.cos(yaw) * f - Math.sin(yaw) * sx) * sp;
          fpPos.x = Math.max(-1.5, Math.min(W + 1.5, fpPos.x)); fpPos.z = Math.max(-1.5, Math.min(D + 1.5, fpPos.z)); fpPos.y = 1.65; applyFP(); }
        renderer.render(scene, fp); } }
    loop(); addEventListener('resize', resize); setTimeout(resize, 30);
    return { rebuild, resize, setMode };
  }

  // ===================== TABS =====================
  const tab2d = document.getElementById('tab2d'), tab3d = document.getElementById('tab3d');
  const stage2d = document.getElementById('stage2d'), app3d = document.getElementById('app3d');
  tab2d.onclick = () => { tab2d.classList.add('on'); tab3d.classList.remove('on'); stage2d.classList.remove('off'); app3d.classList.remove('on'); fit(); };
  tab3d.onclick = () => { tab3d.classList.add('on'); tab2d.classList.remove('on'); stage2d.classList.add('off'); app3d.classList.add('on'); build3D(); three.resize(); };

  addEventListener('resize', () => { if (!stage2d.classList.contains('off')) fit(); });
  fit(); panel();
})();
