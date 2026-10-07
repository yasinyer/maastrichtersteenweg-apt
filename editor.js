/* =======================================================================
   Verbouw-editor — Appartement Maastrichtersteenweg
   VASTE buitenschil (buitenmuren + buitendeur + bestaande ramen, uit de
   Illustrator-PDF).  De volledige binnenindeling ontwerp je zelf met blokken
   (drag & drop, vergroten/verkleinen, functie kiezen).
   2D bewerken · 3D bekijken (orbit + rondlopen, ook terrassen) · zon aan/uit.
   ======================================================================= */
(function () {
  'use strict';
  const W = 9.156, D = 11.52, H = 2.60;

  // ---- VASTE BUITENSCHIL (editor-coördinaten: west=0 links, noord=boven) ----
  // envelope-omtrek (rechthoekig, met zuidwest terras-insprong en traphal-bump)
  const POLY = [[0, 11.52], [9.16, 11.52], [9.16, 8.05], [8.46, 8.05], [8.46, 4.43],
    [7.61, 4.43], [7.61, 0], [4.27, 0], [4.27, 0.69], [0, 0.69]];
  // envelope-wanden met openingen: win = raam, door = buitendeur/terrasdeur
  const SHELL = [
    { ax: 'x', f: 11.52, a: 0, b: 9.16, win: [[0.63, 2.20], [2.95, 5.05], [7.08, 8.44]] }, // noord
    { ax: 'z', f: 9.16, a: 8.05, b: 11.52 },
    { ax: 'x', f: 8.05, a: 8.46, b: 9.16 },
    { ax: 'z', f: 8.46, a: 4.43, b: 8.05 },
    { ax: 'x', f: 4.43, a: 7.61, b: 8.46 },
    { ax: 'z', f: 7.61, a: 0, b: 4.43 },
    { ax: 'x', f: 0, a: 4.27, b: 7.61, win: [[4.72, 5.66], [6.16, 7.14]] }, // zuid
    { ax: 'z', f: 4.27, a: 0, b: 0.69 },
    { ax: 'x', f: 0.69, a: 0, b: 4.27, door: [[1.31, 4.06]] }, // zuidwest → terras
    { ax: 'z', f: 0, a: 0.69, b: 11.52 }, // west
  ];
  // vaste traphal (gemeenschappelijk) + buitendeur (hoofddeur) op westwand ervan
  const TRAPHAL = { x: 6.52, z: 4.43, w: 1.94, d: 3.62 };
  const FRONTDOOR = { x: 6.52, z0: 4.62, z1: 5.29 }; // op x=6.52 (traphal-west)
  const TERRAS = [
    { x: 1.27, z: 0.0, w: 3.0, d: 0.69, south: true },
    { x: 0.53, z: 11.52, w: 2.15, d: 0.77, south: false },
  ];

  const TYPES = {
    living:     { label: 'Living / leefruimte', col: '#c7d2bd', floor: 0xb9c7b0 },
    slaapkamer: { label: 'Slaapkamer',          col: '#d8c3ac', floor: 0xb99e86 },
    keuken:     { label: 'Keuken',              col: '#bcd3d8', floor: 0xdfe4e8 },
    badkamer:   { label: 'Badkamer',            col: '#cfe2ec', floor: 0xd6e6ee },
    wc:         { label: 'WC / toilet',         col: '#b9d6de', floor: 0xcfe0e6 },
    eetkamer:   { label: 'Eetkamer',            col: '#c9d6c0', floor: 0xb9c7b0 },
    bureau:     { label: 'Bureau / kantoor',    col: '#cdc3d6', floor: 0xb9a9c0 },
    hal:        { label: 'Hal / gang',          col: '#d3c6b4', floor: 0xc9b79c },
    kast:       { label: 'Kast / berging',      col: '#dccfbe', floor: 0xc9b79c },
    leeg:       { label: 'Leeg / overig',       col: '#e6e3db', floor: 0xd8d5cd },
  };

  const DEFAULT = [
    { name: 'Keuken', type: 'keuken', x: 0.00, z: 8.05, w: 2.37, d: 3.47 },
    { name: 'Slaapkamer 1', type: 'slaapkamer', x: 2.37, z: 8.05, w: 3.11, d: 3.47 },
    { name: 'Inbouwkasten', type: 'kast', x: 5.48, z: 8.05, w: 1.04, d: 3.47 },
    { name: 'Slaapkamer 2', type: 'slaapkamer', x: 6.52, z: 8.05, w: 2.64, d: 3.47 },
    { name: 'Badkamer', type: 'badkamer', x: 3.82, z: 5.63, w: 1.66, d: 2.42 },
    { name: 'Hal', type: 'hal', x: 5.48, z: 4.43, w: 1.04, d: 3.62 },
    { name: 'Living / leefruimte', type: 'living', x: 0.00, z: 0.00, w: 7.61, d: 4.43 },
    { name: 'Living (west)', type: 'living', x: 0.00, z: 4.43, w: 3.82, d: 3.62 },
  ];

  const KEY = 'mstw_verbouw_v2';
  let rooms = load() || DEFAULT.map(r => Object.assign({}, r));
  let sel = -1;
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); return (s && s.length !== undefined) ? s : null; } catch (e) { return null; } }
  function save() { localStorage.setItem(KEY, JSON.stringify(rooms)); flash('Opgeslagen ✓'); }

  // ===================== 2D EDITOR =====================
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const wrap = document.getElementById('canvasWrap');
  let scale = 40, ox = 40, oy = 40;
  // ---- undo/redo ----
  const deep = a => JSON.parse(JSON.stringify(a));
  let history = [deep(rooms)], hi = 0;
  function commit() { history = history.slice(0, hi + 1); history.push(deep(rooms)); hi = history.length - 1; if (history.length > 120) { history.shift(); hi--; } }
  function undo() { if (hi > 0) { hi--; rooms = deep(history[hi]); if (sel >= rooms.length) sel = -1; panel(); draw(); } }
  function redo() { if (hi < history.length - 1) { hi++; rooms = deep(history[hi]); if (sel >= rooms.length) sel = -1; panel(); draw(); } }
  window.__verbouw = { commit, undo, redo };

  function sizeCanvas() { const r = wrap.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; }
  function fitView() { const m = 46 * devicePixelRatio; scale = Math.min((cv.width - 2 * m) / W, (cv.height - 2 * m) / (D + 1)); ox = (cv.width - W * scale) / 2; oy = (cv.height - D * scale) / 2; }
  function fit() { sizeCanvas(); fitView(); draw(); }
  const PX = x => ox + x * scale, PZ = z => oy + (D - z) * scale;
  const IX = px => (px - ox) / scale, IZ = py => D - (py - oy) / scale;

  // ---- rotatie-helpers ----
  const ROT = (x, z, a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c - z * s, x * s + z * c]; };
  const cen = r => [r.x + r.w / 2, r.z + r.d / 2];
  function wcorn(r, lx, lz) { const c = cen(r), d = ROT(lx, lz, r.rot || 0); return [c[0] + d[0], c[1] + d[1]]; }
  const scr = (x, z) => [PX(x), PZ(z)];
  const CORN = { nw: [-1, 1], ne: [1, 1], sw: [-1, -1], se: [1, -1] };
  const corners = r => [wcorn(r, -r.w / 2, -r.d / 2), wcorn(r, r.w / 2, -r.d / 2), wcorn(r, r.w / 2, r.d / 2), wcorn(r, -r.w / 2, r.d / 2)];

  // ---- binnen de schil? ----
  function inPoly(x, z) { let c = false; for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) { const xi = POLY[i][0], zi = POLY[i][1], xj = POLY[j][0], zj = POLY[j][1]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; }
  function overlapTrap(r) { const cs = corners(r); let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; cs.forEach(p => { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); }); return x0 < TRAPHAL.x + TRAPHAL.w - .05 && x1 > TRAPHAL.x + .05 && z0 < TRAPHAL.z + TRAPHAL.d - .05 && z1 > TRAPHAL.z + .05; }
  function bad(r) { return corners(r).some(p => !inPoly(p[0], p[1])) || overlapTrap(r); }

  let guides = [];
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.beginPath(); POLY.forEach((p, i) => { const q = scr(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fillStyle = '#1b2029'; ctx.fill();
    ctx.fillStyle = '#343841'; TERRAS.forEach(t => ctx.fillRect(PX(t.x), PZ(t.z + t.d), t.w * scale, t.d * scale));
    ctx.font = (11 * devicePixelRatio) + 'px Helvetica'; ctx.fillStyle = '#8b93a0'; ctx.textAlign = 'center';
    TERRAS.forEach(t => ctx.fillText('terras', PX(t.x + t.w / 2), PZ(t.z + t.d / 2) + 4));
    // snap-hulplijnen
    ctx.strokeStyle = 'rgba(199,154,63,.7)'; ctx.lineWidth = 1 * devicePixelRatio; ctx.setLineDash([5, 5]);
    guides.forEach(g => { ctx.beginPath(); if (g.ax === 'x') { ctx.moveTo(PX(g.v), 0); ctx.lineTo(PX(g.v), cv.height); } else { ctx.moveTo(0, PZ(g.v)); ctx.lineTo(cv.width, PZ(g.v)); } ctx.stroke(); });
    ctx.setLineDash([]);
    // ruimtes
    let nbad = 0;
    rooms.forEach((r, i) => {
      const t = TYPES[r.type] || TYPES.leeg, cs = corners(r).map(p => scr(p[0], p[1])), isBad = bad(r); if (isBad) nbad++;
      ctx.beginPath(); cs.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.fillStyle = t.col; ctx.fill();
      ctx.strokeStyle = isBad ? '#e8663a' : (i === sel ? '#c79a3f' : '#2a2f37'); ctx.lineWidth = ((i === sel || isBad) ? 3 : 1.2) * devicePixelRatio;
      if (isBad) ctx.setLineDash([7, 4]); ctx.stroke(); ctx.setLineDash([]);
      const c = cen(r), s = scr(c[0], c[1]);
      ctx.fillStyle = '#2a2a2a'; ctx.font = 'bold ' + (12 * devicePixelRatio) + 'px Helvetica'; ctx.textAlign = 'center'; ctx.fillText(r.name, s[0], s[1] + 3);
      ctx.font = (10 * devicePixelRatio) + 'px Helvetica'; ctx.fillStyle = '#555';
      ctx.fillText(r.w.toFixed(2) + ' × ' + r.d.toFixed(2) + ' m' + (r.rot ? '  ⟳' + Math.round((r.rot * 180 / Math.PI) % 360) + '°' : ''), s[0], s[1] + 18 * devicePixelRatio);
    });
    hatch(TRAPHAL.x, TRAPHAL.z, TRAPHAL.w, TRAPHAL.d);
    ctx.fillStyle = '#9aa2ad'; ctx.font = (11 * devicePixelRatio) + 'px Helvetica'; ctx.textAlign = 'center'; ctx.fillText('🔒 traphal', PX(TRAPHAL.x + TRAPHAL.w / 2), PZ(TRAPHAL.z + TRAPHAL.d / 2));
    ctx.strokeStyle = '#e9e4da'; ctx.lineWidth = 5 * devicePixelRatio; ctx.lineCap = 'round';
    SHELL.forEach(s => { if (s.ax === 'x') line(s.a, s.f, s.b, s.f); else line(s.f, s.a, s.f, s.b); });
    SHELL.forEach(s => { (s.win || []).forEach(w => mark(s, w[0], w[1], '#7fd3e8', 6)); (s.door || []).forEach(dr => mark(s, dr[0], dr[1], '#86c98a', 6)); });
    ctx.strokeStyle = '#86c98a'; ctx.lineWidth = 6 * devicePixelRatio; line(FRONTDOOR.x, FRONTDOOR.z0, FRONTDOOR.x, FRONTDOOR.z1);
    if (sel >= 0) {
      const r = rooms[sel];
      handles(r).forEach(h => { ctx.fillStyle = '#c79a3f'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * devicePixelRatio; ctx.beginPath(); ctx.arc(h[0], h[1], 6 * devicePixelRatio, 0, 7); ctx.fill(); ctx.stroke(); });
      const rh = rotHandle(r), cc = scr(...wcorn(r, 0, r.d / 2));
      ctx.strokeStyle = '#4aa3e0'; ctx.lineWidth = 1.5 * devicePixelRatio; ctx.beginPath(); ctx.moveTo(cc[0], cc[1]); ctx.lineTo(rh[0], rh[1]); ctx.stroke();
      ctx.fillStyle = '#4aa3e0'; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(rh[0], rh[1], 7 * devicePixelRatio, 0, 7); ctx.fill(); ctx.stroke();
    }
    if (nbad) { ctx.fillStyle = 'rgba(232,102,58,.92)'; const bw = 300 * devicePixelRatio, bh = 30 * devicePixelRatio; ctx.fillRect((cv.width - bw) / 2, 8 * devicePixelRatio, bw, bh);
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (12 * devicePixelRatio) + 'px Helvetica'; ctx.textAlign = 'center'; ctx.fillText('⚠ ' + nbad + ' ruimte' + (nbad > 1 ? 's vallen' : ' valt') + ' buiten de schil / in de traphal', cv.width / 2, 28 * devicePixelRatio); }
  }
  function line(x1, z1, x2, z2) { ctx.beginPath(); ctx.moveTo(PX(x1), PZ(z1)); ctx.lineTo(PX(x2), PZ(z2)); ctx.stroke(); }
  function mark(s, a, b, col, wdt) { ctx.strokeStyle = col; ctx.lineWidth = wdt * devicePixelRatio; if (s.ax === 'x') line(a, s.f, b, s.f); else line(s.f, a, s.f, b); }
  function hatch(x, z, w, d) {
    ctx.save(); ctx.beginPath(); ctx.rect(PX(x), PZ(z + d), w * scale, d * scale); ctx.clip();
    ctx.fillStyle = '#20252e'; ctx.fillRect(PX(x), PZ(z + d), w * scale, d * scale); ctx.strokeStyle = '#333a44'; ctx.lineWidth = 1.5 * devicePixelRatio;
    for (let i = -d; i < w + d; i += 0.35) line(x + i, z, x + i + d, z + d);
    ctx.restore(); ctx.strokeStyle = '#3a414c'; ctx.lineWidth = 1.5 * devicePixelRatio; ctx.strokeRect(PX(x), PZ(z + d), w * scale, d * scale);
  }
  function handles(r) { return [['nw', -r.w / 2, r.d / 2], ['ne', r.w / 2, r.d / 2], ['sw', -r.w / 2, -r.d / 2], ['se', r.w / 2, -r.d / 2]].map(h => { const w = wcorn(r, h[1], h[2]), s = scr(w[0], w[1]); return [s[0], s[1], h[0]]; }); }
  function rotHandle(r) { const w = wcorn(r, 0, r.d / 2 + 24 * devicePixelRatio / scale); return scr(w[0], w[1]); }

  // ---- snapping ----
  const SNT = 0.14;
  function snapLines(skip) {
    const xs = [0, W, 7.61, 8.46, 4.27, TRAPHAL.x, TRAPHAL.x + TRAPHAL.w], zs = [0, 0.69, D, 4.43, 8.05, TRAPHAL.z, TRAPHAL.z + TRAPHAL.d];
    rooms.forEach((r, i) => { if (i === skip || r.rot) return; xs.push(r.x, r.x + r.w); zs.push(r.z, r.z + r.d); });
    return { xs, zs };
  }
  function snapTo(val, arr) { let best = null, bd = SNT; for (const L of arr) { const d = Math.abs(val - L); if (d < bd) { bd = d; best = L; } } return best; }

  let drag = null, pinch = null;
  function pos(e) { const p = e.touches ? e.touches[0] : e, b = cv.getBoundingClientRect(); return { px: (p.clientX - b.left) * devicePixelRatio, py: (p.clientY - b.top) * devicePixelRatio }; }
  const snap = v => Math.round(v * 20) / 20;
  function down(e) {
    const { px, py } = pos(e);
    if (e.button === 1 || e.button === 2) { drag = { mode: 'pan', sx: px, sy: py, ox0: ox, oy0: oy }; if (e.cancelable) e.preventDefault(); return; }
    if (sel >= 0) { const r = rooms[sel]; const rh = rotHandle(r);
      if (Math.hypot(rh[0] - px, rh[1] - py) < 14 * devicePixelRatio) { drag = { mode: 'rotate', r, ch: false }; return; }
      for (const h of handles(r)) if (Math.hypot(h[0] - px, h[1] - py) < 14 * devicePixelRatio) { drag = { mode: 'resize', k: h[2], r, ch: false }; return; } }
    for (let i = rooms.length - 1; i >= 0; i--) { if (hit(rooms[i], px, py)) { sel = i; drag = { mode: 'move', i, r: rooms[i], ox0: IX(px) - rooms[i].x, oz0: IZ(py) - rooms[i].z, ch: false }; panel(); draw(); return; } }
    drag = { mode: 'pan', sx: px, sy: py, ox0: ox, oy0: oy, deselect: true };
  }
  function hit(r, px, py) { const c = cen(r), l = ROT(IX(px) - c[0], IZ(py) - c[1], -(r.rot || 0)); return Math.abs(l[0]) <= r.w / 2 && Math.abs(l[1]) <= r.d / 2; }
  function move(e) {
    if (!drag) return; const { px, py } = pos(e);
    if (drag.mode === 'pan') { ox = drag.ox0 + (px - drag.sx); oy = drag.oy0 + (py - drag.sy); if (Math.abs(px - drag.sx) + Math.abs(py - drag.sy) > 3) drag.deselect = false; draw(); if (e.cancelable) e.preventDefault(); return; }
    const r = drag.r; drag.ch = true; guides = [];
    if (drag.mode === 'move') {
      let rx = IX(px) - drag.ox0, rz = IZ(py) - drag.oz0;
      if (!r.rot) { const L = snapLines(drag.i);
        const sl = snapTo(rx, L.xs), sr = snapTo(rx + r.w, L.xs);
        if (sl != null && (sr == null || Math.abs(sl - rx) <= Math.abs(sr - rx - r.w))) { rx = sl; guides.push({ ax: 'x', v: sl }); }
        else if (sr != null) { rx = sr - r.w; guides.push({ ax: 'x', v: sr }); } else rx = snap(rx);
        const sb = snapTo(rz, L.zs), st = snapTo(rz + r.d, L.zs);
        if (sb != null && (st == null || Math.abs(sb - rz) <= Math.abs(st - rz - r.d))) { rz = sb; guides.push({ ax: 'z', v: sb }); }
        else if (st != null) { rz = st - r.d; guides.push({ ax: 'z', v: st }); } else rz = snap(rz);
      } else { rx = snap(rx); rz = snap(rz); }
      r.x = rx; r.z = rz;
    } else if (drag.mode === 'rotate') {
      const c = cen(r); let a = Math.atan2(IZ(py) - c[1], IX(px) - c[0]) - Math.PI / 2;
      if (!e.shiftKey) a = Math.round(a / (Math.PI / 36)) * (Math.PI / 36);
      a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); r.rot = a;
    } else { // resize
      const sg = CORN[drag.k], F = wcorn(r, -sg[0] * r.w / 2, -sg[1] * r.d / 2), a = r.rot || 0;
      let P = [IX(px), IZ(py)];
      if (!a) { const L = snapLines(drag.i); const sx = snapTo(P[0], L.xs), sz = snapTo(P[1], L.zs); if (sx != null) { P[0] = sx; guides.push({ ax: 'x', v: sx }); } if (sz != null) { P[1] = sz; guides.push({ ax: 'z', v: sz }); } }
      const Lf = ROT(F[0], F[1], -a), Lp = ROT(P[0], P[1], -a);
      let w = Math.max(0.4, Math.abs(Lp[0] - Lf[0])), d = Math.max(0.4, Math.abs(Lp[1] - Lf[1]));
      if (a) { w = snap(w); d = snap(d); }
      const oN = [-sg[0] * w / 2, -sg[1] * d / 2], ob = ROT(oN[0], oN[1], a);
      r.w = w; r.d = d; r.x = F[0] - ob[0] - w / 2; r.z = F[1] - ob[1] - d / 2;
    }
    panel(); draw(); if (e.cancelable) e.preventDefault();
  }
  function up() { if (drag) { if (drag.mode === 'pan') { if (drag.deselect) { sel = -1; panel(); } } else if (drag.ch) commit(); } drag = null; guides = []; draw(); }
  cv.addEventListener('mousedown', down); addEventListener('mousemove', move); addEventListener('mouseup', up);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); const { px, py } = pos(e), wx = IX(px), wz = IZ(py), f = Math.exp(-e.deltaY * 0.0012); scale = Math.max(10 * devicePixelRatio, Math.min(520 * devicePixelRatio, scale * f)); ox = px - wx * scale; oy = py - (D - wz) * scale; draw(); }, { passive: false });
  // touch
  function tdist(e) { const a = e.touches[0], b = e.touches[1]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
  function tmid(e) { const a = e.touches[0], b = e.touches[1], bb = cv.getBoundingClientRect(); return [((a.clientX + b.clientX) / 2 - bb.left) * devicePixelRatio, ((a.clientY + b.clientY) / 2 - bb.top) * devicePixelRatio]; }
  cv.addEventListener('touchstart', e => { if (e.touches.length === 2) { const m = tmid(e); pinch = { d: tdist(e), sc: scale, wx: IX(m[0]), wz: IZ(m[1]) }; drag = null; } else { down(e); } if (e.cancelable) e.preventDefault(); }, { passive: false });
  cv.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { const m = tmid(e), f = tdist(e) / pinch.d; scale = Math.max(10 * devicePixelRatio, Math.min(520 * devicePixelRatio, pinch.sc * f)); ox = m[0] - pinch.wx * scale; oy = m[1] - (D - pinch.wz) * scale; draw(); } else if (!pinch) move(e); if (e.cancelable) e.preventDefault(); }, { passive: false });
  addEventListener('touchend', e => { if (!e.touches || e.touches.length < 2) pinch = null; up(); });
  // toetsen
  addEventListener('keydown', e => {
    if (document.getElementById('stage2d').classList.contains('off')) return;
    const tag = (document.activeElement || {}).tagName, typing = tag === 'INPUT' || tag === 'TEXTAREA', mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
    if (typing) return;
    if ((e.key === 'r' || e.key === 'R') && sel >= 0) { e.preventDefault(); const r = rooms[sel]; r.rot = (((r.rot || 0) + (e.shiftKey ? -1 : 1) * Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); commit(); panel(); draw(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && sel >= 0) { e.preventDefault(); rooms.splice(sel, 1); sel = -1; commit(); panel(); draw(); }
  });

  // ===================== SIDEBAR =====================
  const side = document.getElementById('side');
  const esc = s => (s + '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  function panel() {
    if (sel < 0) { side.innerHTML = '<div class="empty"><b>Vaste buitenschil</b> (buitenmuren, ramen, buitendeur) staat vast.<br><br>Ontwerp de binnenindeling: klik <b>+ Ruimte</b>, sleep blokken, trek de <b>hoekjes</b> om te vergroten/verkleinen, en kies per ruimte een <b>functie</b>.<br><br>Met <b>Lege schil</b> begin je blanco.</div>'; return; }
    const r = rooms[sel]; let h = '<h2>Ruimte bewerken</h2>';
    h += '<div class="field"><label>Naam</label><input id="fName" value="' + esc(r.name) + '"></div>';
    h += '<div class="field"><label>Functie</label><div class="types">';
    for (const k in TYPES) h += '<button data-t="' + k + '" class="' + (r.type === k ? 'on' : '') + '"><span class="sw" style="background:' + TYPES[k].col + '"></span>' + TYPES[k].label + '</button>';
    h += '</div></div><div class="field"><label>Afmetingen (m)</label><div class="dims"><input id="fW" value="' + r.w.toFixed(2) + '"><input id="fD" value="' + r.d.toFixed(2) + '"></div></div>';
    h += '<div class="field"><label>Draaien</label><div class="dims"><button class="btn" id="rotBtn" style="flex:1">⟳ 90°</button><button class="btn" id="rot0Btn" style="flex:1">↺ recht</button></div></div>';
    h += '<button class="btn warn" id="delBtn" style="width:100%">Ruimte verwijderen</button>';
    side.innerHTML = h;
    document.getElementById('fName').oninput = e => { r.name = e.target.value; draw(); };
    document.getElementById('fName').onchange = () => commit();
    side.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { r.type = b.getAttribute('data-t'); commit(); panel(); draw(); });
    document.getElementById('fW').onchange = e => { r.w = Math.max(0.4, parseFloat(e.target.value) || r.w); commit(); draw(); };
    document.getElementById('fD').onchange = e => { r.d = Math.max(0.4, parseFloat(e.target.value) || r.d); commit(); draw(); };
    document.getElementById('rotBtn').onclick = () => { r.rot = (((r.rot || 0) + Math.PI / 2) % (2 * Math.PI)); commit(); panel(); draw(); };
    document.getElementById('rot0Btn').onclick = () => { r.rot = 0; commit(); panel(); draw(); };
    document.getElementById('delBtn').onclick = () => { rooms.splice(sel, 1); sel = -1; commit(); panel(); draw(); };
    if (innerWidth <= 760) side.classList.add('show');
  }
  const addRoom = (o) => { rooms.push(Object.assign({ name: 'Nieuwe ruimte', type: 'leeg', x: 2.5, z: 2.5, w: 2.5, d: 2.5 }, o)); sel = rooms.length - 1; commit(); panel(); draw(); };
  document.getElementById('addBtn').onclick = () => addRoom();
  document.getElementById('wcBtn').onclick = () => addRoom({ name: 'WC', type: 'wc', w: 0.90, d: 1.40 });
  document.getElementById('saveBtn').onclick = save;
  document.getElementById('resetBtn').onclick = () => { if (confirm('Terug naar de originele indeling?')) { rooms = DEFAULT.map(r => Object.assign({}, r)); sel = -1; commit(); panel(); draw(); } };
  document.getElementById('clearBtn').onclick = () => { if (confirm('Alle ruimtes wissen en met een lege schil beginnen?')) { rooms = []; sel = -1; commit(); panel(); draw(); } };
  function flash(t) { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#c79a3f;color:#171307;padding:9px 16px;border-radius:10px;font-weight:700;z-index:99'; document.body.appendChild(d); setTimeout(() => d.remove(), 1400); }

  // ===================== 3D =====================
  let three = null;
  function build3D() { const host = document.getElementById('app3d'); if (!three) three = init3D(host); three.rebuild(rooms); }

  function init3D(host) {
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xaecbe4);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    const CENTER = new THREE.Vector3(W / 2, 0, D / 2);
    const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 200); cam.position.set(W / 2 + 9, 12.5, -8);
    const fp = new THREE.PerspectiveCamera(72, 1, 0.02, 200);
    const hemi = new THREE.HemisphereLight(0xdfeaf6, 0x8a8a80, 0.55); scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, 0.22); scene.add(amb);
    const sun = new THREE.DirectionalLight(0xfff1d8, 1.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const s = 16; sun.shadow.camera.left = -s; sun.shadow.camera.right = s; sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 80; sun.shadow.bias = -0.0004; sun.target.position.copy(CENTER); scene.add(sun); scene.add(sun.target);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x8ba06e, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.12; ground.receiveShadow = true; scene.add(ground);

    const model = new THREE.Group(); scene.add(model);
    const MAT = {
      shell: new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.95 }),
      wall: new THREE.MeshStandardMaterial({ color: 0xefeae1, roughness: 0.95, side: THREE.DoubleSide }),
      glass: new THREE.MeshStandardMaterial({ color: 0xaad4e5, roughness: 0.05, transparent: true, opacity: 0.26 }),
      frame: new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.6, metalness: 0.3 }),
      door: new THREE.MeshStandardMaterial({ color: 0x6f4a2b, roughness: 0.7 }),
      terras: new THREE.MeshStandardMaterial({ color: 0x9a9a95, roughness: 1 }),
      base: new THREE.MeshStandardMaterial({ color: 0xd7d3cb, roughness: 1 }),
      traphal: new THREE.MeshStandardMaterial({ color: 0xcfd2d6, roughness: 0.6 }),
      ceil: new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 1, side: THREE.DoubleSide }),
    };
    const floorMats = {}; for (const k in TYPES) floorMats[k] = new THREE.MeshStandardMaterial({ color: TYPES[k].floor, roughness: 0.9, side: THREE.DoubleSide });
    const box = (w, h, d, m, x, y, z, nc) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = !nc; b.receiveShadow = true; return b; };
    const mx = x => W - x; // spiegel → juiste oriëntatie
    let ceilings = [];

    function seg(ax, fixed, a, b, y0, y1, th, m) { const len = Math.abs(b - a), h = y1 - y0; if (len <= .01 || h <= .01) return;
      a = Math.min(a, b); b = a + len; model.add(ax === 'x' ? box(len, h, th, m, (a + b) / 2, y0 + h / 2, fixed, true) : box(th, h, len, m, fixed, y0 + h / 2, (a + b) / 2, true)); }
    function wallOpen(ax, fixed, a, b, th, m, wins, doors) { // openingen in meter langs de as (al gespiegeld)
      const ops = []; (wins || []).forEach(w => ops.push({ a: w[0], b: w[1], t: 'w' })); (doors || []).forEach(d => ops.push({ a: d[0], b: d[1], t: 'd' }));
      ops.sort((p, q) => p.a - q.a); let lo = Math.min(a, b), hi = Math.max(a, b), c = lo;
      ops.forEach(o => { const oa = Math.max(lo, Math.min(o.a, o.b)), ob = Math.min(hi, Math.max(o.a, o.b)); if (ob <= oa) return;
        seg(ax, fixed, c, oa, 0, H, th, m); c = ob;
        if (o.t === 'w') { seg(ax, fixed, oa, ob, 0, 0.95, th, m); seg(ax, fixed, oa, ob, 2.25, H, th, m); glass(ax, fixed, (oa + ob) / 2, ob - oa, 0.95, 2.25); }
        else { seg(ax, fixed, oa, ob, 2.1, H, th, m); } });
      seg(ax, fixed, c, hi, 0, H, th, m);
    }
    function glass(ax, fixed, at, w, y0, y1) { const h = y1 - y0;
      model.add(ax === 'x' ? box(w, h, .03, MAT.glass, at, y0 + h / 2, fixed, true) : box(.03, h, w, MAT.glass, fixed, y0 + h / 2, at, true));
      model.add(ax === 'x' ? box(w + .05, h + .05, .05, MAT.frame, at, y0 + h / 2, fixed, true) : box(.05, h + .05, w + .05, MAT.frame, fixed, y0 + h / 2, at, true)); }
    function railing(x1, z1, x2, z2, south) { const rh = 1, r = .04;
      for (let x = x1; x <= x2 + .01; x += .35) model.add(box(.02, rh, .02, MAT.frame, x, rh / 2, south ? z1 : z2, true));
      model.add(box(x2 - x1, r, r, MAT.frame, (x1 + x2) / 2, rh, south ? z1 : z2, true));
      if (south) { for (let z = z1; z <= z2 + .01; z += .35) { model.add(box(.02, rh, .02, MAT.frame, x1, rh / 2, z, true)); model.add(box(.02, rh, .02, MAT.frame, x2, rh / 2, z, true)); }
        model.add(box(r, r, z2 - z1, MAT.frame, x1, rh, (z1 + z2) / 2, true)); model.add(box(r, r, z2 - z1, MAT.frame, x2, rh, (z1 + z2) / 2, true)); } }

    function rebuild(rms) {
      while (model.children.length) model.remove(model.children[0]); ceilings = [];
      // vloerplaat (envelope-vorm, gespiegeld)
      const shp = new THREE.Shape(); POLY.forEach((p, i) => { const X = mx(p[0]), Z = p[1]; i ? shp.lineTo(X, Z) : shp.moveTo(X, Z); }); shp.closePath();
      const fg = new THREE.Mesh(new THREE.ShapeGeometry(shp), MAT.base); fg.rotation.x = Math.PI / 2; fg.position.y = 0; fg.receiveShadow = true; model.add(fg);
      // terrassen
      TERRAS.forEach(t => { const x1 = mx(t.x + t.w), x2 = mx(t.x); model.add(box(x2 - x1, .12, t.d, MAT.terras, (x1 + x2) / 2, -.06, t.z + t.d / 2, true)); railing(x1, t.z, x2, t.z + t.d, t.south); });
      // VASTE SCHIL
      SHELL.forEach(sw => { if (sw.ax === 'x') wallOpen('x', sw.f, mx(sw.a), mx(sw.b), 0.18, MAT.shell, (sw.win || []).map(w => [mx(w[0]), mx(w[1])]), (sw.door || []).map(d => [mx(d[0]), mx(d[1])]));
        else wallOpen('z', mx(sw.f), sw.a, sw.b, 0.18, MAT.shell, sw.win, sw.door); });
      // vaste traphal: wanden (met buitendeur op westwand) + tredes
      const tx1 = mx(TRAPHAL.x + TRAPHAL.w), tx2 = mx(TRAPHAL.x), tz1 = TRAPHAL.z, tz2 = TRAPHAL.z + TRAPHAL.d;
      model.add(box(tx2 - tx1, .04, tz2 - tz1, MAT.traphal, (tx1 + tx2) / 2, .02, (tz1 + tz2) / 2, true));
      wallOpen('z', mx(TRAPHAL.x), tz1, tz2, 0.12, MAT.wall, null, [[FRONTDOOR.z0, FRONTDOOR.z1]]); // westwand + buitendeur
      wallOpen('z', mx(TRAPHAL.x + TRAPHAL.w), tz1, tz2, 0.12, MAT.wall); wallOpen('x', tz1, tx1, tx2, 0.12, MAT.wall); wallOpen('x', tz2, tx1, tx2, 0.12, MAT.wall);
      for (let i = 0; i < 10; i++) model.add(box(1.5, .05 + i * .03, .32, MAT.traphal, (tx1 + tx2) / 2, i * .13 + .06, tz1 + .4 + i * .3, true));
      // deurpaneel (buitendeur) half open
      model.add(box(.04, 2.0, FRONTDOOR.z1 - FRONTDOOR.z0, MAT.door, mx(TRAPHAL.x) + .02, 1.0, (FRONTDOOR.z0 + FRONTDOOR.z1) / 2, true));
      // BEWERKBARE RUIMTES: vloer + plafond + binnenwanden (schil-randen overslaan; met rotatie)
      rms.forEach(r => {
        const rot = r.rot || 0, w = r.w, d = r.d, th = .09;
        const g = new THREE.Group(); g.position.set(mx(r.x + r.w / 2), 0, r.z + r.d / 2); g.scale.x = -1; g.rotation.y = -rot;
        g.add(box(w, .05, d, floorMats[r.type] || floorMats.leeg, 0, .04, 0, true));
        const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT.ceil); c.rotation.x = Math.PI / 2; c.position.set(0, H, 0); c.visible = roofOn; g.add(c); ceilings.push(c);
        if (rot || !nearShellZ(r.z)) g.add(box(w, H, th, MAT.wall, 0, H / 2, -d / 2, true));            // zuid
        if (rot || !nearShellZ(r.z + r.d)) g.add(box(w, H, th, MAT.wall, 0, H / 2, d / 2, true));        // noord
        if (rot || !nearShellX(r.x + r.w)) g.add(box(th, H, d, MAT.wall, w / 2, H / 2, 0, true));        // oost (editor) = local +x
        if (rot || !nearShellX(r.x)) g.add(box(th, H, d, MAT.wall, -w / 2, H / 2, 0, true));             // west (editor) = local -x
        model.add(g);
      });
    }
    const nearShellX = x => Math.abs(x) < .3 || Math.abs(x - W) < .3 || Math.abs(x - 7.61) < .3 || Math.abs(x - 8.46) < .3;
    const nearShellZ = z => Math.abs(z) < .3 || Math.abs(z - .69) < .3 || Math.abs(z - D) < .3;

    // ---- controls ----
    const orbit = new THREE.OrbitControls(cam, renderer.domElement); orbit.target.copy(CENTER); orbit.enableDamping = true; orbit.dampingFactor = .08; orbit.maxPolarAngle = Math.PI / 2.05; orbit.minDistance = 4; orbit.maxDistance = 55;
    let mode = 'orbit', roofOn = false, sunOn = true;
    const keys = {}; addEventListener('keydown', e => keys[e.code] = true); addEventListener('keyup', e => keys[e.code] = false);
    let yaw = 0, pitch = -0.03; const fpPos = new THREE.Vector3(W / 2, 1.65, 2.4);
    function applyFP() { pitch = Math.max(-1.2, Math.min(1.2, pitch)); fp.position.copy(fpPos); fp.lookAt(fpPos.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)))); }
    function applyCeil() { ceilings.forEach(c => c.visible = roofOn); }
    let dragging = false, lx = 0, ly = 0; const el = renderer.domElement;
    el.addEventListener('mousedown', e => { if (mode !== 'walk') return; dragging = true; lx = e.clientX; ly = e.clientY; });
    addEventListener('mousemove', e => { if (!dragging || mode !== 'walk') return; yaw -= (e.clientX - lx) * .005; pitch -= (e.clientY - ly) * .005; lx = e.clientX; ly = e.clientY; applyFP(); });
    addEventListener('mouseup', () => dragging = false);
    el.addEventListener('touchstart', e => { if (mode !== 'walk') return; dragging = true; lx = e.touches[0].clientX; ly = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchmove', e => { if (!dragging || mode !== 'walk') return; yaw -= (e.touches[0].clientX - lx) * .005; pitch -= (e.touches[0].clientY - ly) * .005; lx = e.touches[0].clientX; ly = e.touches[0].clientY; applyFP(); if (e.cancelable) e.preventDefault(); }, { passive: false });
    addEventListener('touchend', () => dragging = false);

    const ui = document.createElement('div'); ui.style.cssText = 'position:absolute;top:14px;right:14px;display:flex;flex-direction:column;gap:8px;z-index:6;align-items:flex-end';
    ui.innerHTML = '<div style="display:flex;gap:6px"><button class="e3 on" data-m="orbit">🔄 Overzicht</button><button class="e3" data-m="walk">🚶 Rondlopen</button></div>' +
      '<button class="e3" id="e_roof">Plafond: uit</button><button class="e3 on" id="e_sun">☀️ Zon: aan</button>' +
      '<div id="e_timewrap" style="background:#171b23cc;border:1px solid #ffffff22;border-radius:9px;padding:7px 10px;display:flex;gap:8px;align-items:center"><span style="font-size:11px;color:#9db0c0">🕗</span><input id="e_time" type="range" min="7" max="20" step="0.5" value="13" style="width:120px"><span id="e_tlab" style="font-size:11px;color:#eef2f6;width:34px">13:00</span></div>';
    host.appendChild(ui);
    const dpad = document.createElement('div'); dpad.style.cssText = 'position:absolute;bottom:18px;right:18px;display:none;flex-direction:column;align-items:center;gap:6px;z-index:6;touch-action:none';
    dpad.innerHTML = '<button class="e3 pad" data-k="KeyW">▲</button><div style="display:flex;gap:6px"><button class="e3 pad" data-k="KeyA">◀</button><button class="e3 pad" data-k="KeyS">▼</button><button class="e3 pad" data-k="KeyD">▶</button></div>'; host.appendChild(dpad);
    const st = document.createElement('style'); st.textContent = '.e3{background:#171b23cc;color:#eef2f6;border:1px solid #ffffff22;border-radius:9px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer;backdrop-filter:blur(8px)}.e3.on{background:#c79a3f;color:#171307;border-color:#c79a3f}.e3.pad{width:46px;height:46px;font-size:16px;padding:0}'; document.head.appendChild(st);
    function setMode(m) { mode = m; ui.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.getAttribute('data-m') === m)); orbit.enabled = (m === 'orbit'); dpad.style.display = (m === 'walk') ? 'flex' : 'none'; if (m === 'walk') { fpPos.set(W / 2, 1.65, 2.4); yaw = 0; pitch = -.03; if (!roofOn) toggleRoof(); applyFP(); } }
    function toggleRoof() { roofOn = !roofOn; applyCeil(); const b = document.getElementById('e_roof'); b.classList.toggle('on', roofOn); b.textContent = 'Plafond: ' + (roofOn ? 'aan' : 'uit'); }
    ui.querySelectorAll('[data-m]').forEach(b => b.onclick = () => setMode(b.getAttribute('data-m'))); document.getElementById('e_roof').onclick = toggleRoof;
    const sunBtn = document.getElementById('e_sun'), timeWrap = document.getElementById('e_timewrap');
    sunBtn.onclick = () => { sunOn = !sunOn; sun.visible = sunOn; sunBtn.classList.toggle('on', sunOn); sunBtn.textContent = sunOn ? '☀️ Zon: aan' : '🌙 Zon: uit'; hemi.intensity = sunOn ? .55 : .95; amb.intensity = sunOn ? .22 : .5; timeWrap.style.opacity = sunOn ? 1 : .4; };
    function setSun(h) { document.getElementById('e_tlab').textContent = (h < 10 ? '0' : '') + Math.floor(h) + ':' + (h % 1 ? '30' : '00');
      const a = (h - 13.5) / 7 * Math.PI * .9, el = Math.max(.12, Math.cos((h - 13.5) / 7 * Math.PI * .62)), R = 22;
      sun.position.set(W / 2 + Math.sin(a) * R, el * 20 + 3, D / 2 - Math.cos(a) * R * .2 - 10 + (1 - el) * 6); sun.intensity = .45 + el * .7; scene.background.setHSL(.58, .42, .5 + el * .13); }
    document.getElementById('e_time').oninput = e => setSun(parseFloat(e.target.value)); setSun(13);
    dpad.querySelectorAll('[data-k]').forEach(b => { const c = b.getAttribute('data-k'), p = v => e => { keys[c] = v; if (e.cancelable) e.preventDefault(); }; b.addEventListener('mousedown', p(true)); b.addEventListener('touchstart', p(true), { passive: false }); b.addEventListener('mouseup', p(false)); b.addEventListener('mouseleave', p(false)); b.addEventListener('touchend', p(false)); });

    function resize() { const r = host.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height); cam.aspect = fp.aspect = r.width / r.height; cam.updateProjectionMatrix(); fp.updateProjectionMatrix(); }
    let prev = performance.now();
    (function loop() { requestAnimationFrame(loop); const now = performance.now(), dt = Math.min((now - prev) / 1000, .05); prev = now;
      if (mode === 'orbit') { orbit.update(); renderer.render(scene, cam); }
      else { const sp = (keys['ShiftLeft'] ? 4.5 : 2.4) * dt; let f = 0, sx = 0; if (keys['KeyW'] || keys['ArrowUp']) f += 1; if (keys['KeyS'] || keys['ArrowDown']) f -= 1; if (keys['KeyA'] || keys['ArrowLeft']) sx -= 1; if (keys['KeyD'] || keys['ArrowRight']) sx += 1;
        if (f || sx) { const l = Math.hypot(f, sx); f /= l; sx /= l; fpPos.x += (Math.sin(yaw) * f + Math.cos(yaw) * sx) * sp; fpPos.z += (Math.cos(yaw) * f - Math.sin(yaw) * sx) * sp; fpPos.x = Math.max(-1.5, Math.min(W + 1.5, fpPos.x)); fpPos.z = Math.max(-1.5, Math.min(D + 1.5, fpPos.z)); fpPos.y = 1.65; applyFP(); }
        renderer.render(scene, fp); } })();
    addEventListener('resize', resize); setTimeout(resize, 30);
    window.__ED3D = { topdown() { cam.position.set(W / 2, 24, D / 2 + 0.01); orbit.target.set(W / 2, 0, D / 2); orbit.update(); renderer.render(scene, cam); } };
    return { rebuild, resize };
  }

  // ===================== TABS =====================
  const tab2d = document.getElementById('tab2d'), tab3d = document.getElementById('tab3d'), stage2d = document.getElementById('stage2d'), app3d = document.getElementById('app3d');
  tab2d.onclick = () => { tab2d.classList.add('on'); tab3d.classList.remove('on'); stage2d.classList.remove('off'); app3d.classList.remove('on'); fit(); };
  tab3d.onclick = () => { tab3d.classList.add('on'); tab2d.classList.remove('on'); stage2d.classList.add('off'); app3d.classList.add('on'); build3D(); three.resize(); };
  addEventListener('resize', () => { if (!stage2d.classList.contains('off')) fit(); });
  fit(); panel();
})();
