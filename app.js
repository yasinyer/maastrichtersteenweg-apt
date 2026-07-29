/* =======================================================================
   Appartement Maastrichtersteenweg — 1e verdieping links
   Interactieve 3D-reconstructie van de plattegrond (schaal 1/100).

   Coördinaten in meters. Plan: X = west→oost, Z = zuid→noord, Y = hoogte.
   Buitenmaat 9.15 (X) x 10.80 (Z). Verdiepingshoogte 2.60 m.
   ======================================================================= */

(function () {
  'use strict';

  // ---- Afmetingen uit de plattegrond -----------------------------------
  const W = 9.15;      // totale breedte (oost-west)
  const D = 10.80;     // totale diepte (zuid-noord)
  const H = 2.60;      // plafondhoogte
  const T = 0.20;      // buitenmuurdikte
  const Ti = 0.10;     // binnenmuurdikte

  // X-rasterlijnen (west -> oost)
  const X0 = 0.0;
  const X_KEUK = 2.10;   // keuken oost / slaapkamer1 west
  const X_EET = 3.60;    // eetkamer oost
  const X_BAD = 5.45;    // badk/hal oost, nachthal west
  const X_NACHT = 6.35;  // nachthal oost / slaapkamer1-oost / traphal west
  const X_SLK2 = 8.26;   // slaapkamer2 oost
  const XW = 9.15;       // oost buitenmuur

  // Z-rasterlijnen (zuid -> noord)
  const Z0 = 0.0;        // zuid buitenmuur (living / terras onder)
  const Z_LIV = 4.10;    // living noord / hal-eetkamer zuid
  const Z_MID = 7.60;    // eetkamer/badk noord = slaapkamers zuid
  const ZD = 10.80;      // noord buitenmuur (keuken / slaapkamers)
  const Z_HAL = 5.30;    // hal noord / badk zuid

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

  // Twee camera's: orbit-overzicht en first-person
  const orbitCam = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 200);
  orbitCam.position.set(W / 2 + 9, 11, D / 2 + 12);

  const fpCam = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.02, 200);
  fpCam.position.set(W / 2, 1.65, 2.0);

  // ---- Licht -------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x808080, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.15);
  sun.position.set(-8, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = 14;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0004;
  sun.target.position.copy(CENTER);
  scene.add(sun); scene.add(sun.target);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // ---- Materialen --------------------------------------------------------
  const M = {
    wall:      new THREE.MeshStandardMaterial({ color: 0xf3efe7, roughness: 0.95 }),
    wallOut:   new THREE.MeshStandardMaterial({ color: 0xe6ddcd, roughness: 1.0 }),
    tapis:     new THREE.MeshStandardMaterial({ color: 0xb9c7b0, roughness: 1.0 }), // tapis plain (living/eet/hal)
    tapisWarm: new THREE.MeshStandardMaterial({ color: 0xc9b79c, roughness: 1.0 }), // nachthal
    tegels:    new THREE.MeshStandardMaterial({ color: 0xdfe4e8, roughness: 0.4, metalness: 0.0 }), // keuken/traphal
    tegelsBad: new THREE.MeshStandardMaterial({ color: 0xd6e6ee, roughness: 0.35 }), // badkamer
    floorflex: new THREE.MeshStandardMaterial({ color: 0xb99e86, roughness: 0.85 }), // slaapkamers
    terras:    new THREE.MeshStandardMaterial({ color: 0x9a9a95, roughness: 1.0 }),
    glass:     new THREE.MeshStandardMaterial({ color: 0xaad4e5, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.32 }),
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

  // ---- Groepen -----------------------------------------------------------
  const shell = new THREE.Group();      // muren/vloer/ramen/deuren
  const furniture = new THREE.Group();  // meubels
  const labelGroup = new THREE.Group(); // kamerlabels (alleen orbit)
  scene.add(shell); scene.add(furniture); scene.add(labelGroup);

  // ---- Helpers -----------------------------------------------------------
  function box(w, h, d, mat, x, y, z, opts) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    m.castShadow = !(opts && opts.noCast);
    m.receiveShadow = true;
    return m;
  }

  // Vloerpaneel voor een kamer (rechthoek in plan)
  function floor(x1, z1, x2, z2, mat) {
    const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
    const m = box(w, 0.04, d, mat, (x1 + x2) / 2, 0.02, (z1 + z2) / 2, { noCast: true });
    shell.add(m);
    return m;
  }

  // Plafond boven een kamer
  function ceil(x1, z1, x2, z2) {
    const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
    const g = new THREE.PlaneGeometry(w, d);
    const m = new THREE.Mesh(g, M.ceiling);
    m.rotation.x = Math.PI / 2;
    m.position.set((x1 + x2) / 2, H, (z1 + z2) / 2);
    m.receiveShadow = true;
    shell.add(m);
  }

  /* Muur langs een as, met uitsparingen (deuren/ramen).
     axis 'x': loopt langs X op vaste z.  axis 'z': loopt langs Z op vaste x.
     openings: [{at, width, y0, y1}] at = middenpositie langs de as. */
  function wall(axis, fixed, start, end, thick, mat, openings) {
    openings = openings || [];
    const segs = [];
    let cur = Math.min(start, end);
    const stop = Math.max(start, end);
    const ordered = openings.slice().sort((a, b) => a.at - b.at);
    // horizontale segmenten tussen openingen
    const gaps = ordered.map(o => [o.at - o.width / 2, o.at + o.width / 2]);
    let pieces = [[cur, stop]];
    gaps.forEach(([a, b]) => {
      const np = [];
      pieces.forEach(([p0, p1]) => {
        if (b <= p0 || a >= p1) { np.push([p0, p1]); return; }
        if (a > p0) np.push([p0, a]);
        if (b < p1) np.push([b, p1]);
      });
      pieces = np;
    });
    // volle muurstukken
    pieces.forEach(([p0, p1]) => {
      if (p1 - p0 < 0.001) return;
      addWallBox(axis, fixed, p0, p1, 0, H, thick, mat);
    });
    // lateien boven deuren + borstweringen onder ramen
    ordered.forEach(o => {
      if (o.y1 < H - 0.001) addWallBox(axis, fixed, o.at - o.width / 2, o.at + o.width / 2, o.y1, H, thick, mat); // latei
      if (o.y0 > 0.001) addWallBox(axis, fixed, o.at - o.width / 2, o.at + o.width / 2, 0, o.y0, thick, mat);     // borstwering
      if (o.glass) addGlass(axis, fixed, o.at, o.width, o.y0, o.y1, thick);
    });
  }

  function addWallBox(axis, fixed, a, b, y0, y1, thick, mat) {
    const len = b - a, h = y1 - y0;
    if (h <= 0.001 || len <= 0.001) return;
    let m;
    if (axis === 'x') m = box(len, h, thick, mat, (a + b) / 2, y0 + h / 2, fixed);
    else m = box(thick, h, len, mat, fixed, y0 + h / 2, (a + b) / 2);
    shell.add(m);
  }

  function addGlass(axis, fixed, at, width, y0, y1, thick) {
    const h = y1 - y0;
    let g;
    if (axis === 'x') g = box(width, h, 0.03, M.glass, at, y0 + h / 2, fixed, { noCast: true });
    else g = box(0.03, h, width, M.glass, fixed, y0 + h / 2, at, { noCast: true });
    shell.add(g);
    // kozijn
    let f;
    if (axis === 'x') f = box(width + 0.06, h + 0.06, 0.05, M.frame, at, y0 + h / 2, fixed, { noCast: true });
    else f = box(0.05, h + 0.06, width + 0.06, M.frame, fixed, y0 + h / 2, at, { noCast: true });
    shell.add(f);
  }

  // =======================================================================
  //  VLOEREN (per kamer, met correct vloertype)
  // =======================================================================
  // Living / Salon + Eetkamer (open plan, tapis plain) ~ 39.74 m²
  floor(X0, Z0, X_NACHT, Z_LIV, M.tapis);          // living/salon zuid
  floor(X0, Z_LIV, X_EET, Z_MID, M.tapis);         // eetkamer
  floor(X_EET, Z0, X_NACHT, Z_LIV, M.tapis);       // (living oost deel, al gedekt)
  // Keuken (tegels)
  floor(X0, Z_MID, X_KEUK, ZD, M.tegels);
  // Slaapkamer 1 (floorflex)
  floor(X_KEUK, Z_MID, X_EET + 1.34, ZD, M.floorflex); // tot X 4.94
  // Nachthal + kasten strip (tapis)
  floor(X_EET + 1.34, Z_MID, X_NACHT, ZD, M.tapisWarm);
  // Slaapkamer 2 (floorflex)
  floor(X_NACHT, Z_MID, X_SLK2, ZD, M.floorflex);
  floor(X_SLK2, Z_MID, XW, ZD, M.floorflex);
  // Badkamer (tegels)
  floor(X_EET, Z_HAL, X_BAD, Z_MID, M.tegelsBad);
  // Hal (tapis)
  floor(X_EET, Z_LIV, X_BAD, Z_HAL, M.tapis);
  // Nachthal midden (tapis)
  floor(X_BAD, Z_LIV, X_NACHT, Z_MID, M.tapisWarm);
  // Traphal + lift + overloop (tegels, gemeenschappelijk)
  floor(X_NACHT, Z_LIV, XW, Z_MID, M.tegels);
  floor(X_NACHT, Z0, XW, Z_LIV, M.tegels);

  // Plafonds (living hoger open gevoel; hou uniform)
  ceil(X0, Z0, X_NACHT, Z_MID);
  ceil(X0, Z_MID, XW, ZD);
  ceil(X_NACHT, Z0, XW, Z_MID);

  // =======================================================================
  //  MUREN
  // =======================================================================
  const D_H = 2.10;   // deurhoogte
  const WIN_Y0 = 0.95, WIN_Y1 = 2.25; // raamborstwering/-hoogte

  // ---- Buitenmuren (met ramen naar terrassen en buiten) ----
  // Zuid (z=0): living -> terras onder (grote raampartij) + salon raam
  wall('x', Z0, X0, X_NACHT, T, M.wallOut, [
    { at: 2.4, width: 2.6, y0: 0.0, y1: 2.25, glass: true },   // living schuifraam -> terras
    { at: 5.0, width: 1.6, y0: 0.95, y1: 2.25, glass: true },  // salon raam
  ]);
  // Noord (z=D): keuken raam + slaapkamers ramen
  wall('x', ZD, X0, XW, T, M.wallOut, [
    { at: 1.05, width: 1.2, y0: 1.0, y1: 2.2, glass: true },  // keuken -> terras boven
    { at: 3.5, width: 1.6, y0: 0.95, y1: 2.25, glass: true }, // slaapkamer1
    { at: 7.0, width: 1.6, y0: 0.95, y1: 2.25, glass: true }, // slaapkamer2
  ]);
  // West (x=0): eetkamer + living ramen
  wall('z', X0, Z0, ZD, T, M.wallOut, [
    { at: 2.0, width: 2.0, y0: 0.95, y1: 2.25, glass: true },  // living west raam
    { at: 5.7, width: 1.6, y0: 0.95, y1: 2.25, glass: true },  // eetkamer west raam
    { at: 9.2, width: 1.2, y0: 1.0, y1: 2.2, glass: true },    // keuken west raam
  ]);
  // Oost (x=W): slaapkamer2 + traphal
  wall('z', XW, Z_MID, ZD, T, M.wallOut, [
    { at: 9.2, width: 1.4, y0: 0.95, y1: 2.25, glass: true },  // slaapkamer2 raam
  ]);
  wall('z', XW, Z_LIV, Z_MID, T, M.wallOut, []); // traphal oost

  // Oost buitenwand living-zone + zuidwand traphal (apparte staat)
  wall('x', Z0, X_NACHT, XW, T, M.wallOut, []);        // zuidwand onder traphal
  wall('z', X_NACHT, Z0, Z_LIV, T, M.wallOut, []);     // living oost buitenwand (naar traphal-zone)

  // ---- Binnenmuren ----
  // Keuken oost (keuken | slaapkamer1) met deur
  wall('z', X_KEUK, Z_MID, ZD, Ti, M.wall, [{ at: 8.4, width: 0.85, y0: 0, y1: D_H }]);
  // Living/eetkamer noord grens (z=Z_MID) van west tot eetkamer-oost: eetkamer open naar keuken? scheiding keuken/eetkamer
  wall('x', Z_MID, X0, X_KEUK, Ti, M.wall, [{ at: 1.05, width: 0.9, y0: 0, y1: D_H }]); // keuken -> eetkamer deur
  // Eetkamer oost wand (eetkamer | badk/hal), grotendeels open naar living, deur naar hal
  wall('z', X_EET, Z_LIV, Z_MID, Ti, M.wall, [{ at: 4.7, width: 1.0, y0: 0, y1: D_H }]); // eetkamer <-> hal opening
  // Slaapkamer1 oost (| nachthal/kast)
  wall('z', X_EET + 1.34, Z_MID, ZD, Ti, M.wall, [{ at: 8.0, width: 0.85, y0: 0, y1: D_H }]);
  // Nachthal oost (| slaapkamer2)
  wall('z', X_NACHT, Z_MID, ZD, Ti, M.wall, [{ at: 8.3, width: 0.85, y0: 0, y1: D_H }]);
  // Slaapkamers zuidwand (z=Z_MID) scheidt van badk/nachthal/traphal
  wall('x', Z_MID, X_KEUK, X_EET + 1.34, Ti, M.wall, []); // slk1 zuid
  wall('x', Z_MID, X_NACHT, X_SLK2, Ti, M.wall, []);      // slk2 zuid
  wall('x', Z_MID, X_SLK2, XW, Ti, M.wall, []);
  // Badkamer: west al = X_EET; oost wand (badk | nachthal)
  wall('z', X_BAD, Z_HAL, Z_MID, Ti, M.wall, [{ at: 6.9, width: 0.8, y0: 0, y1: D_H }]); // badk -> nachthal deur
  // Badkamer zuid (badk | hal)
  wall('x', Z_HAL, X_EET, X_BAD, Ti, M.wall, []);
  // Hal oost (hal | nachthal)
  wall('z', X_BAD, Z_LIV, Z_HAL, Ti, M.wall, [{ at: 4.7, width: 0.9, y0: 0, y1: D_H }]);
  // Hal/eetkamer zuidgrens naar living (z=Z_LIV): x van X_EET..X_NACHT
  wall('x', Z_LIV, X_EET, X_BAD, Ti, M.wall, [{ at: 4.5, width: 1.1, y0: 0, y1: D_H }]); // hal -> living
  wall('x', Z_LIV, X_BAD, X_NACHT, Ti, M.wall, [{ at: 5.9, width: 0.9, y0: 0, y1: D_H }]); // nachthal -> living (entree)
  // Nachthal/traphal scheiding (x=X_NACHT) met toegangsdeur (voordeur appartement)
  wall('z', X_NACHT, Z_LIV, Z_MID, Ti, M.wall, [{ at: 6.4, width: 0.95, y0: 0, y1: D_H }]); // voordeur

  // =======================================================================
  //  TERRASSEN
  // =======================================================================
  function terras(x1, z1, x2, z2) {
    const w = x2 - x1, d = z2 - z1;
    shell.add(box(w, 0.12, d, M.terras, (x1 + x2) / 2, -0.06, (z1 + z2) / 2, { noCast: true }));
    // reling
    const railH = 1.0, r = 0.04;
    const posts = [[x1, z1], [x2, z1], [x1, z2], [x2, z2]];
    // bovenregel langs open zijden
    function rail(ax, fx, a, b) {
      if (ax === 'x') shell.add(box(b - a, r, r, M.frame, (a + b) / 2, railH, fx, { noCast: true }));
      else shell.add(box(r, r, b - a, M.frame, fx, railH, (a + b) / 2, { noCast: true }));
    }
    // spijlen
    for (let x = x1; x <= x2 + 0.001; x += 0.35) shell.add(box(0.02, railH, 0.02, M.frame, x, railH / 2, z1, { noCast: true }));
    rail('x', z1, x1, x2);
    if (z1 < 0) { // zuidterras: reling ook op zijkanten
      for (let z = z1; z <= z2 + 0.001; z += 0.35) { shell.add(box(0.02, railH, 0.02, M.frame, x1, railH / 2, z, { noCast: true })); shell.add(box(0.02, railH, 0.02, M.frame, x2, railH / 2, z, { noCast: true })); }
      rail('z', x1, z1, z2); rail('z', x2, z1, z2);
    }
  }
  terras(0.4, -1.6, 3.4, 0.0);   // terras onder (living)
  terras(0.0, ZD, 2.1, ZD + 1.3); // terras boven (keuken)

  // =======================================================================
  //  MEUBILAIR (gestileerd)
  // =======================================================================
  function place(group, x, z, rotY) { group.position.set(x, 0, z); if (rotY) group.rotation.y = rotY; furniture.add(group); return group; }

  // -- Zitbank + salontafel + TV (living, zuidwest) --
  (function livingRoom() {
    const g = new THREE.Group();
    // hoekbank
    const seatH = 0.42, backH = 0.75;
    g.add(box(2.4, seatH, 0.9, M.fabric, 0, seatH / 2, 0));           // zitting lang
    g.add(box(2.4, backH - seatH, 0.2, M.fabric, 0, (backH + seatH) / 2, -0.35)); // rug
    g.add(box(0.9, seatH, 1.6, M.fabric, -1.65, seatH / 2, 0.6));     // zitting hoek
    g.add(box(0.2, backH - seatH, 1.6, M.fabric, -2.0, (backH + seatH) / 2, 0.6));
    // kussens
    g.add(box(0.5, 0.15, 0.5, M.accent, -0.6, seatH + 0.08, 0));
    g.add(box(0.5, 0.15, 0.5, M.fabric2, 0.6, seatH + 0.08, 0));
    place(g, 1.5, 1.5, 0);
    // salontafel
    const t = new THREE.Group();
    t.add(box(1.1, 0.06, 0.6, M.woodDark, 0, 0.4, 0, {}));
    [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].forEach(p => t.add(box(0.06, 0.4, 0.06, M.woodDark, p[0], 0.2, p[1])));
    place(t, 1.6, 2.7, 0);
    // tv-meubel + tv tegen oostwand (x ~ X_NACHT)
    const tv = new THREE.Group();
    tv.add(box(1.8, 0.45, 0.4, M.woodDark, 0, 0.22, 0));
    tv.add(box(1.6, 0.9, 0.06, M.dark, 0, 1.15, -0.1));
    place(tv, 4.2, 2.6, -Math.PI / 2);
    // vloerkleed
    furniture.add(box(2.6, 0.02, 1.8, M.fabric2, 1.7, 0.05, 2.4, { noCast: true }));
    // plant
    const pl = new THREE.Group();
    pl.add(box(0.3, 0.35, 0.3, M.terras, 0, 0.17, 0));
    pl.add(box(0.5, 0.7, 0.5, M.green, 0, 0.7, 0));
    place(pl, 0.5, 0.5, 0);
  })();

  // -- Eetkamer: tafel + stoelen --
  (function eetkamer() {
    const cx = 1.6, cz = 5.85;
    const t = new THREE.Group();
    t.add(box(1.6, 0.06, 0.9, M.wood, 0, 0.74, 0));
    [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].forEach(p => t.add(box(0.08, 0.74, 0.08, M.wood, p[0], 0.37, p[1])));
    place(t, cx, cz, 0);
    const chairPos = [[-0.55, -0.7, 0], [0.55, -0.7, 0], [-0.55, 0.7, Math.PI], [0.55, 0.7, Math.PI]];
    chairPos.forEach(c => {
      const ch = new THREE.Group();
      ch.add(box(0.42, 0.04, 0.42, M.woodDark, 0, 0.46, 0));
      ch.add(box(0.42, 0.5, 0.05, M.woodDark, 0, 0.7, -0.19));
      [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(p => ch.add(box(0.04, 0.46, 0.04, M.woodDark, p[0], 0.23, p[1])));
      place(ch, cx + c[0], cz + c[1], c[2]);
    });
    // hanglamp
    const lamp = box(0.35, 0.2, 0.35, M.metal, cx, 1.9, cz, { noCast: true });
    furniture.add(lamp);
  })();

  // -- Keuken: aanrecht L + fornuis + koelkast --
  (function keuken() {
    const g = new THREE.Group();
    const cH = 0.9, cD = 0.6;
    // aanrecht langs noordwand (z ~ ZD)
    g.add(box(1.9, cH, cD, M.white, 0, cH / 2, D - 0.3 - 0));
    g.add(box(1.9, 0.05, cD + 0.04, M.steel, 0, cH + 0.02, D - 0.3)); // werkblad
    // aanrecht langs westwand
    g.add(box(0.6, cH, 2.6, M.white, 0.3, cH / 2, D - 1.9));
    g.add(box(0.64, 0.05, 2.6, M.steel, 0.3, cH + 0.02, D - 1.9));
    // fornuis (op noordblad)
    g.add(box(0.6, 0.04, 0.55, M.dark, 0.9, cH + 0.05, D - 0.3, { noCast: true }));
    // spoelbak
    g.add(box(0.5, 0.02, 0.4, M.metal, -0.6, cH + 0.05, D - 0.3, { noCast: true }));
    // bovenkasten
    g.add(box(1.9, 0.6, 0.35, M.white, 0, 1.9, D - 0.18));
    // koelkast
    g.add(box(0.6, 1.8, 0.6, M.steel, 1.5, 0.9, D - 0.35));
    furniture.add(g);
  })();

  // -- Slaapkamer 1 (2-persoons) --
  (function slk1() {
    bedroom(3.5, 9.0, 1.4, true);   // dubbelbed
    wardrobe(2.35, 8.1, Math.PI / 2);
  })();
  // -- Slaapkamer 2 (1-persoons) --
  (function slk2() {
    bedroom(7.6, 9.4, 0.9, false);
    wardrobe(6.7, 8.0, -Math.PI / 2);
  })();

  function bedroom(x, z, bedW, dbl) {
    const g = new THREE.Group();
    const bl = 2.0;
    g.add(box(bedW, 0.3, bl, M.woodDark, 0, 0.15, 0));        // bedframe
    g.add(box(bedW, 0.2, bl - 0.1, M.white, 0, 0.4, 0.05));   // matras
    g.add(box(bedW, 0.6, 0.1, M.woodDark, 0, 0.5, -bl / 2));  // hoofdeinde
    // kussens
    if (dbl) {
      g.add(box(0.55, 0.12, 0.35, M.white, -0.35, 0.56, -bl / 2 + 0.35));
      g.add(box(0.55, 0.12, 0.35, M.white, 0.35, 0.56, -bl / 2 + 0.35));
      g.add(box(bedW - 0.1, 0.08, 1.0, M.accent, 0, 0.52, 0.3, { noCast: true })); // deken
    } else {
      g.add(box(0.5, 0.12, 0.35, M.white, 0, 0.56, -bl / 2 + 0.35));
      g.add(box(bedW - 0.1, 0.08, 1.0, M.fabric2, 0, 0.52, 0.3, { noCast: true }));
    }
    place(g, x, z, 0);
    // nachtkastje
    if (dbl) { const n = box(0.4, 0.4, 0.4, M.wood, x + bedW / 2 + 0.3, 0.2, z - 0.8); furniture.add(n); }
  }
  function wardrobe(x, z, rot) {
    const g = new THREE.Group();
    g.add(box(1.6, 2.1, 0.6, M.wood, 0, 1.05, 0));
    g.add(box(0.02, 2.0, 0.62, M.woodDark, 0, 1.05, 0, { noCast: true }));
    place(g, x, z, rot);
  }

  // -- Badkamer: bad + wc + wastafel --
  (function badkamer() {
    // ligbad tegen westwand (x ~ X_EET)
    const bath = new THREE.Group();
    bath.add(box(0.75, 0.55, 1.6, M.white, 0, 0.28, 0));
    bath.add(box(0.6, 0.15, 1.45, M.tegelsBad, 0, 0.5, 0, { noCast: true }));
    place(bath, X_EET + 0.45, 6.7, 0);
    // wastafel
    const sink = new THREE.Group();
    sink.add(box(0.6, 0.85, 0.45, M.white, 0, 0.42, 0));
    sink.add(box(0.55, 0.08, 0.4, M.white, 0, 0.85, 0, { noCast: true }));
    place(sink, X_EET + 0.4, 5.7, 0);
    // wc
    const wc = new THREE.Group();
    wc.add(box(0.38, 0.4, 0.55, M.white, 0, 0.2, 0));
    wc.add(box(0.38, 0.5, 0.18, M.white, 0, 0.5, -0.2));
    place(wc, X_BAD - 0.35, 5.65, Math.PI);
  })();

  // -- Traphal: trap (gemeenschappelijk) --
  (function traphal() {
    const g = new THREE.Group();
    const steps = 12, rise = H / steps, run = 0.26;
    for (let i = 0; i < steps; i++) {
      g.add(box(1.0, rise, run, M.tegels, 0, rise * i + rise / 2, i * run));
    }
    place(g, 7.4, 5.0, 0);
    // lift-schacht
    furniture.add(box(1.1, H - 0.1, 1.1, M.metal, 8.4, (H - 0.1) / 2, 5.0));
  })();

  // =======================================================================
  //  KAMERLABELS (billboards, alleen zichtbaar in orbit)
  // =======================================================================
  function label(text, x, z, sub) {
    const cw = 256, chh = 96;
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = chh;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(20,24,28,0.82)'; roundRect(ctx, 4, 24, cw - 8, 52, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 30px Helvetica, Arial';
    ctx.fillText(text, cw / 2, 52);
    if (sub) { ctx.font = '18px Helvetica, Arial'; ctx.fillStyle = '#b9c7d0'; ctx.fillText(sub, cw / 2, 72); }
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.position.set(x, 2.7, z); sp.scale.set(1.6, 0.6, 1);
    labelGroup.add(sp);
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  label('Living / Salon', 2.6, 2.0, '39,74 m²');
  label('Eetkamer', 1.7, 5.9);
  label('Keuken', 1.0, 9.2);
  label('Slaapkamer 1', 3.5, 9.2);
  label('Slaapkamer 2', 7.1, 9.2);
  label('Badkamer', 4.5, 6.5);
  label('Hal', 4.5, 4.7);
  label('Nachthal', 5.9, 6.2);
  label('Traphal', 7.4, 6.0);
  label('Lift', 8.4, 6.0);

  // =======================================================================
  //  CAMERA-MODI + CONTROLS
  //  Orbit = OrbitControls. Walk = eigen besturing (sleep=kijken, WASD +
  //  on-screen knoppen = bewegen) — werkt op desktop én touch/mobiel.
  // =======================================================================
  const orbit = new THREE.OrbitControls(orbitCam, renderer.domElement);
  orbit.target.copy(CENTER); orbit.enableDamping = true; orbit.dampingFactor = 0.08;
  orbit.maxPolarAngle = Math.PI / 2.05; orbit.minDistance = 4; orbit.maxDistance = 40;
  orbit.update();

  const keys = {};
  document.addEventListener('keydown', e => { keys[e.code] = true; });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

  let mode = 'orbit';
  let roof = true;
  let yaw = 0, pitch = 0;            // first-person kijkrichting
  const fpPos = new THREE.Vector3(W / 2, 1.65, 2.2);

  const btnOrbit = document.getElementById('btnOrbit');
  const btnWalk = document.getElementById('btnWalk');
  const btnRoof = document.getElementById('btnRoof');
  const hint = document.getElementById('hint');
  const dpad = document.getElementById('dpad');

  function setMode(m) {
    mode = m;
    labelGroup.visible = (m === 'orbit');
    btnOrbit.classList.toggle('active', m === 'orbit');
    btnWalk.classList.toggle('active', m === 'walk');
    orbit.enabled = (m === 'orbit');
    if (m === 'walk') {
      fpPos.set(W / 2, 1.65, 2.2);
      yaw = Math.PI; pitch = 0;      // kijk richting living (zuid)
      applyFP();
      hint.classList.add('show');
      dpad.classList.add('show');
      setRoof(true);
    } else {
      hint.classList.remove('show');
      dpad.classList.remove('show');
    }
  }
  function setRoof(on) {
    roof = on;
    shell.children.forEach(c => { if (c.material === M.ceiling) c.visible = on; });
    btnRoof.classList.toggle('active', on);
    btnRoof.textContent = on ? 'Plafond: aan' : 'Plafond: uit';
  }
  function applyFP() {
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
    fpCam.position.copy(fpPos);
    const dir = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch)
    );
    fpCam.lookAt(fpPos.clone().add(dir));
  }
  btnOrbit.onclick = () => setMode('orbit');
  btnWalk.onclick = () => setMode('walk');
  btnRoof.onclick = () => setRoof(!roof);

  // ---- sleep = rondkijken (muis + touch) ----
  let dragging = false, lastX = 0, lastY = 0;
  const el = renderer.domElement;
  function onDown(e) {
    if (mode !== 'walk') return;
    hint.classList.remove('show');
    dragging = true;
    const p = e.touches ? e.touches[0] : e;
    lastX = p.clientX; lastY = p.clientY;
  }
  function onMove(e) {
    if (!dragging || mode !== 'walk') return;
    const p = e.touches ? e.touches[0] : e;
    yaw   -= (p.clientX - lastX) * 0.005;
    pitch -= (p.clientY - lastY) * 0.005;
    lastX = p.clientX; lastY = p.clientY;
    applyFP();
    if (e.cancelable) e.preventDefault();
  }
  function onUp() { dragging = false; }
  el.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  el.addEventListener('touchstart', onDown, { passive: true });
  el.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);

  // ---- on-screen richtingsknoppen (bind aan keys) ----
  if (dpad) {
    dpad.querySelectorAll('[data-key]').forEach(b => {
      const code = b.getAttribute('data-key');
      const press = (v) => (e) => { keys[code] = v; if (e.cancelable) e.preventDefault(); };
      b.addEventListener('mousedown', press(true));
      b.addEventListener('touchstart', press(true), { passive: false });
      b.addEventListener('mouseup', press(false));
      b.addEventListener('mouseleave', press(false));
      b.addEventListener('touchend', press(false));
    });
  }

  // beweging in het horizontale vlak, relatief aan yaw; blijf binnen envelope
  function moveFP(dt) {
    const speed = (keys['ShiftLeft'] ? 5.0 : 2.6) * dt;
    let f = 0, s = 0;
    if (keys['KeyW'] || keys['ArrowUp']) f += 1;
    if (keys['KeyS'] || keys['ArrowDown']) f -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) s -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) s += 1;
    if (f === 0 && s === 0) return;
    const len = Math.hypot(f, s); f /= len; s /= len;
    fpPos.x += (Math.sin(yaw) * f + Math.cos(yaw) * s) * speed;
    fpPos.z += (Math.cos(yaw) * f - Math.sin(yaw) * s) * speed;
    fpPos.x = Math.max(0.35, Math.min(XW - 0.35, fpPos.x));
    fpPos.z = Math.max(-1.4, Math.min(ZD - 0.35, fpPos.z));
    fpPos.y = 1.65;
    applyFP();
  }

  // =======================================================================
  //  RENDER LOOP
  // =======================================================================
  let prev = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now(); const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    if (mode === 'orbit') {
      orbit.update();
      renderer.render(scene, orbitCam);
    } else {
      moveFP(dt);
      renderer.render(scene, fpCam);
    }
  }
  animate();

  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    orbitCam.aspect = w / h; orbitCam.updateProjectionMatrix();
    fpCam.aspect = w / h; fpCam.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  setMode('orbit');
  setRoof(false); // start met open dak voor overzicht
  window.__APT = { scene, setMode }; // debug
})();
