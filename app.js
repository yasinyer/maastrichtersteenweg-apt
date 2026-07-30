/* =======================================================================
   Appartement Maastrichtersteenweg — 1e verdieping links
   Interactieve 3D-reconstructie van de plattegrond (schaal 1/100).
   Indeling gecontroleerd tegen de handmatig overgetekende plattegrond.

   Coördinaten in meters. Plan: X = west→oost, Z = zuid→noord, Y = hoogte.
   Buitenmaat 9.15 (X) x 10.80 (Z). Verdiepingshoogte 2.60 m.
   ======================================================================= */

(function () {
  'use strict';

  const W = 9.15, D = 10.80, H = 2.60, T = 0.20, Ti = 0.10;

  // X-rasterlijnen (west -> oost)
  const X0 = 0.0;
  const X_KEUK = 2.10;    // keuken oost
  const X_SLK1E = 4.94;   // slaapkamer1 oost
  const X_EET = 3.60;     // eetkamer/badk/hal west-blok oost
  const X_BAD = 5.35;     // badk oost = nachthal west
  const X_NACHT = 6.35;   // nachthal oost = slaapkamer2 west = traphal west
  const X_SLK2E = 8.71;   // slaapkamer2 oost
  const X_LIVE = 8.00;    // living/salon oost
  const X_TRAPE = 8.60;   // traphal oost
  const XW = 9.15;

  // Z-rasterlijnen (zuid -> noord)
  const Z0 = 0.0;
  const Z_NIS = 1.30;     // noordrand terras-nis
  const Z_LIV = 4.35;     // living noord / hal-eetkamer zuid
  const Z_HAL = 5.40;     // hal noord / badk zuid
  const Z_MID = 7.60;     // eetkamer/badk noord = slaapkamers zuid
  const Z_NTOP = 8.05;    // nachthal noord (steekt tussen slaapkamers)
  const ZD = 10.80;
  const TR_W = 3.30;      // terras-nis breedte

  // ---- Three.js basis ----------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xafc7dd);
  const container = document.getElementById('app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const CENTER = new THREE.Vector3(W / 2, 0, D / 2);
  const orbitCam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 200);
  orbitCam.position.set(W / 2 + 9, 11, D / 2 + 12);
  const fpCam = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.02, 200);
  fpCam.position.set(W / 2, 1.65, 2.0);

  // ---- Licht -------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x808080, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.15);
  sun.position.set(-8, 16, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = 15;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 60; sun.shadow.bias = -0.0004;
  sun.target.position.copy(CENTER); scene.add(sun); scene.add(sun.target);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // ---- Materialen --------------------------------------------------------
  const M = {
    wall:      new THREE.MeshStandardMaterial({ color: 0xf3efe7, roughness: 0.95 }),
    wallOut:   new THREE.MeshStandardMaterial({ color: 0xe6ddcd, roughness: 1.0 }),
    tapis:     new THREE.MeshStandardMaterial({ color: 0xb9c7b0, roughness: 1.0 }),
    tapisWarm: new THREE.MeshStandardMaterial({ color: 0xc9b79c, roughness: 1.0 }),
    tegels:    new THREE.MeshStandardMaterial({ color: 0xdfe4e8, roughness: 0.4 }),
    tegelsBad: new THREE.MeshStandardMaterial({ color: 0xd6e6ee, roughness: 0.35 }),
    floorflex: new THREE.MeshStandardMaterial({ color: 0xb99e86, roughness: 0.85 }),
    terras:    new THREE.MeshStandardMaterial({ color: 0x9a9a95, roughness: 1.0 }),
    glass:     new THREE.MeshStandardMaterial({ color: 0xaad4e5, roughness: 0.05, transparent: true, opacity: 0.32 }),
    frame:     new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.6, metalness: 0.3 }),
    wood:      new THREE.MeshStandardMaterial({ color: 0x9c6b41, roughness: 0.7 }),
    woodDark:  new THREE.MeshStandardMaterial({ color: 0x5f4023, roughness: 0.7 }),
    fabric:    new THREE.MeshStandardMaterial({ color: 0x5b6b7a, roughness: 0.95 }),
    fabric2:   new THREE.MeshStandardMaterial({ color: 0x7d8a74, roughness: 0.95 }),
    white:     new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.5 }),
    metal:     new THREE.MeshStandardMaterial({ color: 0xbfc4c9, roughness: 0.3, metalness: 0.6 }),
    steel:     new THREE.MeshStandardMaterial({ color: 0xcfd4d9, roughness: 0.25, metalness: 0.8 }),
    dark:      new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.5 }),
    accent:    new THREE.MeshStandardMaterial({ color: 0xc46b52, roughness: 0.8 }),
    green:     new THREE.MeshStandardMaterial({ color: 0x4a7a4a, roughness: 0.9 }),
    ceiling:   new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 1.0, side: THREE.DoubleSide }),
  };

  const shell = new THREE.Group(), furniture = new THREE.Group(), labelGroup = new THREE.Group();
  scene.add(shell); scene.add(furniture); scene.add(labelGroup);

  function box(w, h, d, mat, x, y, z, opts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = !(opts && opts.noCast); m.receiveShadow = true;
    return m;
  }
  function floor(x1, z1, x2, z2, mat, y) {
    const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
    const m = box(w, 0.04, d, mat, (x1 + x2) / 2, (y || 0) + 0.02, (z1 + z2) / 2, { noCast: true });
    shell.add(m); return m;
  }
  function ceil(x1, z1, x2, z2) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x2 - x1), Math.abs(z2 - z1)), M.ceiling);
    g.rotation.x = Math.PI / 2; g.position.set((x1 + x2) / 2, H, (z1 + z2) / 2);
    g.receiveShadow = true; shell.add(g);
  }
  function addWallBox(axis, fixed, a, b, y0, y1, thick, mat) {
    const len = b - a, h = y1 - y0;
    if (h <= 0.001 || len <= 0.001) return;
    shell.add(axis === 'x'
      ? box(len, h, thick, mat, (a + b) / 2, y0 + h / 2, fixed)
      : box(thick, h, len, mat, fixed, y0 + h / 2, (a + b) / 2));
  }
  function addGlass(axis, fixed, at, width, y0, y1) {
    const h = y1 - y0;
    shell.add(axis === 'x'
      ? box(width, h, 0.03, M.glass, at, y0 + h / 2, fixed, { noCast: true })
      : box(0.03, h, width, M.glass, fixed, y0 + h / 2, at, { noCast: true }));
    shell.add(axis === 'x'
      ? box(width + 0.06, h + 0.06, 0.05, M.frame, at, y0 + h / 2, fixed, { noCast: true })
      : box(0.05, h + 0.06, width + 0.06, M.frame, fixed, y0 + h / 2, at, { noCast: true }));
  }
  function wall(axis, fixed, start, end, thick, mat, openings) {
    openings = (openings || []).slice().sort((a, b) => a.at - b.at);
    let pieces = [[Math.min(start, end), Math.max(start, end)]];
    openings.forEach(o => {
      const a = o.at - o.width / 2, b = o.at + o.width / 2, np = [];
      pieces.forEach(([p0, p1]) => {
        if (b <= p0 || a >= p1) { np.push([p0, p1]); return; }
        if (a > p0) np.push([p0, a]);
        if (b < p1) np.push([b, p1]);
      });
      pieces = np;
    });
    pieces.forEach(([p0, p1]) => addWallBox(axis, fixed, p0, p1, 0, H, thick, mat));
    openings.forEach(o => {
      if (o.y1 < H - 0.001) addWallBox(axis, fixed, o.at - o.width / 2, o.at + o.width / 2, o.y1, H, thick, mat);
      if (o.y0 > 0.001) addWallBox(axis, fixed, o.at - o.width / 2, o.at + o.width / 2, 0, o.y0, thick, mat);
      if (o.glass) addGlass(axis, fixed, o.at, o.width, o.y0, o.y1);
    });
  }

  // =======================================================================
  //  VLOEREN
  // =======================================================================
  floor(TR_W, Z0, X_LIVE, Z_LIV, M.tapis);          // salon (zuid, volle breedte)
  floor(X0, Z_NIS, TR_W, Z_LIV, M.tapis);           // living-west (naast nis)
  floor(X0, Z_LIV, X_EET, Z_MID, M.tapis);          // eetkamer
  floor(X0, Z_MID, X_KEUK, ZD, M.tegels);           // keuken
  floor(X_KEUK, Z_MID, X_SLK1E, ZD, M.floorflex);   // slaapkamer1
  floor(X_SLK1E, Z_NTOP, X_NACHT, ZD, M.tapisWarm); // kasten K,K
  floor(X_NACHT, Z_MID, X_SLK2E, ZD, M.floorflex);  // slaapkamer2
  floor(X_EET, Z_HAL, X_BAD, Z_MID, M.tegelsBad);   // badkamer
  floor(X_EET, Z_LIV, X_NACHT, Z_HAL, M.tapisWarm); // hal (voet)
  floor(X_BAD, Z_HAL, X_NACHT, Z_NTOP, M.tapisWarm);// nachthal (rechthoek omhoog)
  floor(X_NACHT, Z_LIV, X_TRAPE, Z_MID, M.tegels);  // traphal (gemeensch.)
  floor(X_TRAPE, Z_HAL, XW, Z_MID, M.tegels);       // lift-overloop

  // Plafonds
  ceil(X0, Z_NIS, X_LIVE, Z_MID);
  ceil(X0, Z_MID, X_SLK2E, ZD);
  ceil(X_NACHT, Z_LIV, XW, Z_MID);

  // =======================================================================
  //  MUREN
  // =======================================================================
  const DH = 2.10;

  // ---- Buitenmuren met ramen ----
  // Noord (keuken + slaapkamers)
  wall('x', ZD, X0, X_SLK2E, T, M.wallOut, [
    { at: 1.05, width: 1.1, y0: 1.0, y1: 2.2, glass: true },   // keuken
    { at: 3.5, width: 1.7, y0: 0.95, y1: 2.25, glass: true },  // slaapkamer1
    { at: 7.5, width: 1.7, y0: 0.95, y1: 2.25, glass: true },  // slaapkamer2
  ]);
  // West (keuken/eetkamer/living)
  wall('z', X0, Z_NIS, ZD, T, M.wallOut, [
    { at: 2.9, width: 1.8, y0: 0.95, y1: 2.25, glass: true },  // living west
    { at: 5.9, width: 1.6, y0: 0.95, y1: 2.25, glass: true },  // eetkamer west
    { at: 9.4, width: 1.1, y0: 1.0, y1: 2.2, glass: true },    // keuken west
  ]);
  // Zuid salon (met terras-nis links open)
  wall('x', Z0, TR_W, X_LIVE, T, M.wallOut, [
    { at: 5.0, width: 2.4, y0: 0.0, y1: 2.25, glass: true },   // salon schuifraam -> terras? (zuid)
    { at: 7.2, width: 1.2, y0: 0.95, y1: 2.25, glass: true },
  ]);
  // Nis: noordwand van de nis (living springt in) + westwand nis
  wall('x', Z_NIS, X0, TR_W, T, M.wallOut, [
    { at: 1.7, width: 2.2, y0: 0.0, y1: 2.25, glass: true },   // schuifraam living -> terras (in nis)
  ]);
  // Oost living/salon
  wall('z', X_LIVE, Z0, Z_LIV, T, M.wallOut, []);
  // Oost slaapkamer2
  wall('z', X_SLK2E, Z_MID, ZD, T, M.wallOut, [
    { at: 9.3, width: 1.4, y0: 0.95, y1: 2.25, glass: true },
  ]);
  // Oost traphal/lift-zone (gemeensch. buitenrand)
  wall('z', XW, Z_HAL, Z_MID, T, M.wallOut, []);
  wall('x', Z_LIV, X_NACHT, X_TRAPE, T, M.wall, []);  // traphal zuidwand
  wall('z', X_TRAPE, Z_LIV, Z_HAL, T, M.wall, []);

  // ---- Binnenmuren ----
  // Keuken | slaapkamer1
  wall('z', X_KEUK, Z_MID, ZD, Ti, M.wall, [{ at: 8.4, width: 0.85, y0: 0, y1: DH }]);
  // Keuken | eetkamer (zuid van keuken)
  wall('x', Z_MID, X0, X_KEUK, Ti, M.wall, [{ at: 1.05, width: 0.9, y0: 0, y1: DH }]);
  // Slaapkamer1 zuid (| eetkamer/hal)
  wall('x', Z_MID, X_KEUK, X_SLK1E, Ti, M.wall, [{ at: 3.5, width: 0.9, y0: 0, y1: DH }]);
  // Eetkamer oost (| badk/hal) — grotendeels open naar living, deur naar hal
  wall('z', X_EET, Z_LIV, Z_MID, Ti, M.wall, [{ at: 5.0, width: 1.1, y0: 0, y1: DH }]);
  // Badk noord (| kasten/slaapkamer1) en badk oost (| nachthal)
  wall('x', Z_MID, X_EET, X_BAD, Ti, M.wall, []);
  wall('z', X_BAD, Z_HAL, Z_MID, Ti, M.wall, [{ at: 6.6, width: 0.75, y0: 0, y1: DH }]);
  // Badk zuid (| hal)
  wall('x', Z_HAL, X_EET, X_BAD, Ti, M.wall, [{ at: 4.5, width: 0.8, y0: 0, y1: DH }]);
  // Nachthal oost (| traphal) — met voordeur
  wall('z', X_NACHT, Z_LIV, Z_MID, Ti, M.wall, [{ at: 6.6, width: 0.95, y0: 0, y1: DH }]);
  // Nachthal-top zijwanden (tussen slaapkamers)
  wall('z', X_BAD, Z_MID, Z_NTOP, Ti, M.wall, []);
  wall('z', X_NACHT, Z_MID, Z_NTOP, Ti, M.wall, []);
  wall('x', Z_NTOP, X_BAD, X_NACHT, Ti, M.wall, [{ at: 5.85, width: 0.7, y0: 0, y1: DH }]); // toegang slaapkamers
  // Kasten zuidwand
  wall('x', Z_NTOP, X_SLK1E, X_BAD, Ti, M.wall, []);
  // Slaapkamer1 oost (| kasten) en slaapkamer2 west (| nachthal/kasten)
  wall('z', X_SLK1E, Z_NTOP, ZD, Ti, M.wall, [{ at: 9.4, width: 0.7, y0: 0, y1: DH }]);
  wall('z', X_NACHT, Z_NTOP, ZD, Ti, M.wall, [{ at: 9.4, width: 0.7, y0: 0, y1: DH }]);
  // Slaapkamer2 zuid (| traphal)
  wall('x', Z_MID, X_NACHT, X_SLK2E, Ti, M.wall, []);
  // Hal/eetkamer zuid -> living (open doorgang) : z=Z_LIV
  wall('x', Z_LIV, X_EET, X_NACHT, Ti, M.wall, [{ at: 4.6, width: 1.2, y0: 0, y1: DH }]);
  // Living oost boven de nis-scheiding niet nodig

  // =======================================================================
  //  TERRASSEN
  // =======================================================================
  function terras(x1, z1, x2, z2, southOpen) {
    shell.add(box(x2 - x1, 0.12, z2 - z1, M.terras, (x1 + x2) / 2, -0.06, (z1 + z2) / 2, { noCast: true }));
    const railH = 1.0, r = 0.04;
    function rail(ax, fx, a, b) {
      shell.add(ax === 'x' ? box(b - a, r, r, M.frame, (a + b) / 2, railH, fx, { noCast: true })
                           : box(r, r, b - a, M.frame, fx, railH, (a + b) / 2, { noCast: true }));
    }
    for (let x = x1; x <= x2 + 0.01; x += 0.35) shell.add(box(0.02, railH, 0.02, M.frame, x, railH / 2, z1, { noCast: true }));
    rail('x', z1, x1, x2);
    if (southOpen) {
      for (let z = z1; z <= z2 + 0.01; z += 0.35) { shell.add(box(0.02, railH, 0.02, M.frame, x1, railH / 2, z, { noCast: true })); shell.add(box(0.02, railH, 0.02, M.frame, x2, railH / 2, z, { noCast: true })); }
      rail('z', x1, z1, z2); rail('z', x2, z1, z2);
    }
  }
  terras(0.15, Z0, TR_W - 0.1, Z_NIS, true);  // terras onder (in de nis)
  terras(X0, ZD, X_KEUK, ZD + 1.25, false);   // terras boven (keuken)

  // =======================================================================
  //  MEUBILAIR (gestileerd)
  // =======================================================================
  function place(g, x, z, r) { g.position.set(x, 0, z); if (r) g.rotation.y = r; furniture.add(g); return g; }

  // -- Living/Salon (grote ruimte, zuid) --
  (function () {
    const g = new THREE.Group(); const seatH = 0.42, backH = 0.75;
    g.add(box(2.6, seatH, 0.95, M.fabric, 0, seatH / 2, 0));
    g.add(box(2.6, backH - seatH, 0.2, M.fabric, 0, (backH + seatH) / 2, -0.38));
    g.add(box(0.95, seatH, 1.7, M.fabric, -1.78, seatH / 2, 0.6));
    g.add(box(0.2, backH - seatH, 1.7, M.fabric, -2.15, (backH + seatH) / 2, 0.6));
    g.add(box(0.5, 0.15, 0.5, M.accent, -0.7, seatH + 0.08, 0));
    g.add(box(0.5, 0.15, 0.5, M.fabric2, 0.7, seatH + 0.08, 0));
    place(g, 2.4, 1.5, 0);
    const t = new THREE.Group();
    t.add(box(1.2, 0.06, 0.65, M.woodDark, 0, 0.4, 0));
    [[-0.55, -0.27], [0.55, -0.27], [-0.55, 0.27], [0.55, 0.27]].forEach(p => t.add(box(0.06, 0.4, 0.06, M.woodDark, p[0], 0.2, p[1])));
    place(t, 2.5, 2.7, 0);
    furniture.add(box(2.9, 0.02, 1.9, M.fabric2, 2.4, 0.05, 2.3, { noCast: true }));
    const tv = new THREE.Group();
    tv.add(box(1.9, 0.45, 0.4, M.woodDark, 0, 0.22, 0));
    tv.add(box(1.7, 0.95, 0.06, M.dark, 0, 1.18, -0.1));
    place(tv, 4.0, 3.7, Math.PI);
    const pl = new THREE.Group();
    pl.add(box(0.3, 0.35, 0.3, M.terras, 0, 0.17, 0));
    pl.add(box(0.5, 0.75, 0.5, M.green, 0, 0.72, 0));
    place(pl, 7.4, 0.6, 0);
  })();

  // -- Eetkamer: tafel + stoelen --
  (function () {
    const cx = 1.7, cz = 5.9, t = new THREE.Group();
    t.add(box(1.6, 0.06, 0.9, M.wood, 0, 0.74, 0));
    [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].forEach(p => t.add(box(0.08, 0.74, 0.08, M.wood, p[0], 0.37, p[1])));
    place(t, cx, cz, 0);
    [[-0.55, -0.7, 0], [0.55, -0.7, 0], [-0.55, 0.7, Math.PI], [0.55, 0.7, Math.PI]].forEach(c => {
      const ch = new THREE.Group();
      ch.add(box(0.42, 0.04, 0.42, M.woodDark, 0, 0.46, 0));
      ch.add(box(0.42, 0.5, 0.05, M.woodDark, 0, 0.7, -0.19));
      [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(p => ch.add(box(0.04, 0.46, 0.04, M.woodDark, p[0], 0.23, p[1])));
      place(ch, cx + c[0], cz + c[1], c[2]);
    });
    furniture.add(box(0.35, 0.2, 0.35, M.metal, cx, 1.95, cz, { noCast: true }));
  })();

  // -- Keuken --
  (function () {
    const g = new THREE.Group(), cH = 0.9, cD = 0.6;
    g.add(box(1.9, cH, cD, M.white, 0, cH / 2, D - 0.3));
    g.add(box(1.9, 0.05, cD + 0.04, M.steel, 0, cH + 0.02, D - 0.3));
    g.add(box(0.6, cH, 2.6, M.white, 0.3, cH / 2, D - 1.9));
    g.add(box(0.64, 0.05, 2.6, M.steel, 0.3, cH + 0.02, D - 1.9));
    g.add(box(0.6, 0.04, 0.55, M.dark, 0.95, cH + 0.05, D - 0.3, { noCast: true }));
    g.add(box(0.5, 0.02, 0.4, M.metal, -0.55, cH + 0.05, D - 0.3, { noCast: true }));
    g.add(box(1.9, 0.6, 0.35, M.white, 0, 1.9, D - 0.18));
    g.add(box(0.6, 1.8, 0.6, M.steel, 1.55, 0.9, D - 0.4));
    furniture.add(g);
  })();

  // -- Slaapkamers --
  function bedroom(x, z, bedW, dbl) {
    const g = new THREE.Group(), bl = 2.0;
    g.add(box(bedW, 0.3, bl, M.woodDark, 0, 0.15, 0));
    g.add(box(bedW, 0.2, bl - 0.1, M.white, 0, 0.4, 0.05));
    g.add(box(bedW, 0.6, 0.1, M.woodDark, 0, 0.5, -bl / 2));
    if (dbl) {
      g.add(box(0.55, 0.12, 0.35, M.white, -0.35, 0.56, -bl / 2 + 0.35));
      g.add(box(0.55, 0.12, 0.35, M.white, 0.35, 0.56, -bl / 2 + 0.35));
      g.add(box(bedW - 0.1, 0.08, 1.0, M.accent, 0, 0.52, 0.3, { noCast: true }));
    } else {
      g.add(box(0.5, 0.12, 0.35, M.white, 0, 0.56, -bl / 2 + 0.35));
      g.add(box(bedW - 0.1, 0.08, 1.0, M.fabric2, 0, 0.52, 0.3, { noCast: true }));
    }
    place(g, x, z, Math.PI);
  }
  function wardrobe(x, z, r) {
    const g = new THREE.Group();
    g.add(box(1.5, 2.1, 0.6, M.wood, 0, 1.05, 0));
    g.add(box(0.02, 2.0, 0.62, M.woodDark, 0, 1.05, 0, { noCast: true }));
    place(g, x, z, r);
  }
  bedroom(3.4, 8.9, 1.5, true); wardrobe(2.9, 10.3, 0);
  bedroom(7.5, 9.0, 0.95, false); wardrobe(8.2, 10.3, 0);

  // -- Badkamer --
  (function () {
    const bath = new THREE.Group();
    bath.add(box(1.55, 0.55, 0.72, M.white, 0, 0.28, 0));
    bath.add(box(1.4, 0.15, 0.58, M.tegelsBad, 0, 0.5, 0, { noCast: true }));
    place(bath, 4.45, 7.2, 0);
    const sink = new THREE.Group();
    sink.add(box(0.6, 0.85, 0.45, M.white, 0, 0.42, 0));
    sink.add(box(0.55, 0.08, 0.4, M.white, 0, 0.85, 0, { noCast: true }));
    place(sink, 3.95, 6.4, -Math.PI / 2);
    const wc = new THREE.Group();
    wc.add(box(0.38, 0.4, 0.55, M.white, 0, 0.2, 0));
    wc.add(box(0.38, 0.5, 0.18, M.white, 0, 0.5, -0.2));
    place(wc, 3.95, 5.75, -Math.PI / 2);
  })();

  // -- Traphal: trap (gemeenschappelijk) --
  (function () {
    const g = new THREE.Group(), steps = 12, rise = H / steps, run = 0.24;
    for (let i = 0; i < steps; i++) g.add(box(1.6, rise, run, M.tegels, 0, rise * i + rise / 2, i * run));
    place(g, 7.4, 4.9, 0);
    furniture.add(box(0.9, H - 0.1, 0.9, M.metal, 8.9, (H - 0.1) / 2, 6.5));
  })();

  // =======================================================================
  //  KAMERLABELS
  // =======================================================================
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function label(text, x, z, sub) {
    const cw = 256, chh = 96, cv = document.createElement('canvas'); cv.width = cw; cv.height = chh;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(20,24,28,0.82)'; roundRect(ctx, 4, 24, cw - 8, 52, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 30px Helvetica, Arial';
    ctx.fillText(text, cw / 2, sub ? 50 : 56);
    if (sub) { ctx.font = '18px Helvetica, Arial'; ctx.fillStyle = '#b9c7d0'; ctx.fillText(sub, cw / 2, 71); }
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.position.set(x, 2.7, z); sp.scale.set(1.6, 0.6, 1); labelGroup.add(sp);
  }
  label('Living / Salon', 3.0, 2.2, '39,74 m²');
  label('Eetkamer', 1.7, 5.9);
  label('Keuken', 1.0, 9.2);
  label('Slaapkamer 1', 3.5, 9.2);
  label('Slaapkamer 2', 7.5, 9.2);
  label('Badkamer', 4.45, 6.5);
  label('Hal', 4.9, 4.85);
  label('Nachthal', 5.85, 6.7);
  label('Traphal', 7.4, 6.0);

  // =======================================================================
  //  CAMERA-MODI + CONTROLS
  // =======================================================================
  const orbit = new THREE.OrbitControls(orbitCam, renderer.domElement);
  orbit.target.copy(CENTER); orbit.enableDamping = true; orbit.dampingFactor = 0.08;
  orbit.maxPolarAngle = Math.PI / 2.05; orbit.minDistance = 4; orbit.maxDistance = 40; orbit.update();

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
    roof = on; shell.children.forEach(c => { if (c.material === M.ceiling) c.visible = on; });
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
    fpPos.x = Math.max(0.35, Math.min(XW - 0.35, fpPos.x));
    fpPos.z = Math.max(-1.2, Math.min(ZD - 0.35, fpPos.z)); fpPos.y = 1.65; applyFP();
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
