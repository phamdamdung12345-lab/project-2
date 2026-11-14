import * as THREE from 'three';

interface DustPuff {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
}

interface SmoothedPose {
  pelvisY: number;
  pelvisRx: number;
  pelvisRy: number;
  pelvisRz: number;
  lSpineRx: number;
  lSpineRy: number;
  lSpineRz: number;
  uChestRx: number;
  uChestRy: number;
  uChestRz: number;
  neckRx: number;
  neckRy: number;
  headRx: number;
  headRy: number;
  lShRx: number;
  lShRy: number;
  lShRz: number;
  lElRx: number;
  lWrRx: number;
  rShRx: number;
  rShRy: number;
  rShRz: number;
  rElRx: number;
  rWrRx: number;
  rWrRy: number;
  rWrRz: number;
  lHipRx: number;
  lHipRz: number;
  lKneeRx: number;
  lAnkleRx: number;
  rHipRx: number;
  rHipRz: number;
  rKneeRx: number;
  rAnkleRx: number;
  wasGrounded: boolean;
  landTimer: number;
  rollDustCooldown: number;
}

export interface KnightRig {
  root: THREE.Group;
  pelvisPivot: THREE.Group;
  lowerSpinePivot: THREE.Group;
  upperChestPivot: THREE.Group;
  neckPivot: THREE.Group;
  headGroup: THREE.Group;
  capeAnchor: THREE.Group;
  leftShoulderPivot: THREE.Group;
  leftElbowPivot: THREE.Group;
  leftWristPivot: THREE.Group;
  rightShoulderPivot: THREE.Group;
  rightElbowPivot: THREE.Group;
  rightWristPivot: THREE.Group;
  leftHipPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  leftAnklePivot: THREE.Group;
  rightHipPivot: THREE.Group;
  rightKneePivot: THREE.Group;
  rightAnklePivot: THREE.Group;
  swordBackGroup: THREE.Group;
  swordHandGroup: THREE.Group;
  emptyScabbardGroup: THREE.Group;
  capeMesh: THREE.Mesh;
  capeGeo: THREE.BufferGeometry;
  capeRestPos: Float32Array;
  capeVWeight: Float32Array;
  lanternLight: THREE.PointLight;
  lanternFlame: THREE.Mesh;
  visorGlow: THREE.Mesh;
  contactShadow: THREE.Mesh;
  dustPuffs: DustPuff[];
  pose: SmoothedPose;
  dispose: () => void;
}

export interface KnightAnimState {
  speed: number;
  velY?: number;
  grounded: boolean;
  isSprinting: boolean;
  isRolling: boolean;
  rollProgress: number;
  isResting: boolean;
  restBlend: number;
  isPushingGate?: boolean;
  pushProgress?: number;
  strafeDot?: number;
  forwardDot?: number;
  walkPhase: number;
  elapsed: number;
  dt?: number;
}

function createBrushedArmorTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  let s = 5151;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 480; i++) {
    const y = rnd() * size;
    const v = 100 + Math.floor(rnd() * 64);
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.fillRect(0, y, size, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
}

function createChainmailTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#555555';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#bcbcbc';
  ctx.lineWidth = 1.4;
  for (let y = 0; y < size + 8; y += 8) {
    const off = ((y / 8) % 2) * 4;
    for (let x = -4; x < size + 8; x += 8) {
      ctx.beginPath();
      ctx.arc(x + off, y, 3.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  return tex;
}

function createBeveledShieldPlateGeo(
  points: Array<[number, number]>,
  depth: number,
  bevelSize = 0.01,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize,
    bevelThickness: bevelSize,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.computeVertexNormals();
  return geo;
}

function createDiamondGreatswordBladeGeo(
  baseHalfW: number,
  tipLen: number,
  bladeLen: number,
  ridgeThick: number,
): THREE.BufferGeometry {
  const bodyLen = bladeLen - tipLen;
  const tipHalfW = baseHalfW * 0.68;
  const midZ = ridgeThick * 0.5;
  const edgeZ = 0.002;

  const verts = [
    // Guard cross-section (y = 0)
    new THREE.Vector3(-baseHalfW, 0, 0), // 0 left edge
    new THREE.Vector3(0, 0, midZ), // 1 front ridge
    new THREE.Vector3(baseHalfW, 0, 0), // 2 right edge
    new THREE.Vector3(0, 0, -midZ), // 3 back ridge
    // Mid-blade taper (y = bodyLen * 0.65)
    new THREE.Vector3(-baseHalfW * 0.86, bodyLen * 0.65, 0), // 4
    new THREE.Vector3(0, bodyLen * 0.65, midZ * 0.85), // 5
    new THREE.Vector3(baseHalfW * 0.86, bodyLen * 0.65, 0), // 6
    new THREE.Vector3(0, bodyLen * 0.65, -midZ * 0.85), // 7
    // Shoulder before point (y = bodyLen)
    new THREE.Vector3(-tipHalfW, bodyLen, 0), // 8
    new THREE.Vector3(0, bodyLen, midZ * 0.65), // 9
    new THREE.Vector3(tipHalfW, bodyLen, 0), // 10
    new THREE.Vector3(0, bodyLen, -midZ * 0.65), // 11
    // Razor Gothic tip (y = bladeLen)
    new THREE.Vector3(0, bladeLen, edgeZ * 0.1), // 12
  ];

  const pos: number[] = [];
  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const pushQuad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    pushTri(a, b, c);
    pushTri(a, c, d);
  };

  // Segment 0->4 and 4->8 around all 4 facets
  for (const base of [0, 4]) {
    const next = base + 4;
    pushQuad(verts[base + 0], verts[base + 1], verts[next + 1], verts[next + 0]);
    pushQuad(verts[base + 1], verts[base + 2], verts[next + 2], verts[next + 1]);
    pushQuad(verts[base + 2], verts[base + 3], verts[next + 3], verts[next + 2]);
    pushQuad(verts[base + 3], verts[base + 0], verts[next + 0], verts[next + 3]);
  }
  // Tip facets
  pushTri(verts[8], verts[9], verts[12]);
  pushTri(verts[9], verts[10], verts[12]);
  pushTri(verts[10], verts[11], verts[12]);
  pushTri(verts[11], verts[8], verts[12]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Constructs a heroic 1.85m Tarnished Soulsborne Knight with an 18-joint
 * hierarchical skeletal rig, sculpted Lathe/Extrude plate armor, chainmail
 * joint caps, articulated gauntlet holding a 1.45m Gothic greatsword, and
 * a real-time vertex-simulated tattered cape.
 */
export function createKnight(): KnightRig {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const brushedBump = track(createBrushedArmorTexture());
  const chainBump = track(createChainmailTexture());

  const root = new THREE.Group();

  // Calibrated PBR Materials
  const brushedSteelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x545b68,
      metalness: 0.88,
      roughness: 0.26,
      envMapIntensity: 1.05,
      bumpMap: brushedBump,
      bumpScale: 0.015,
    }),
  );

  const flutedDarkSteelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x353a44,
      metalness: 0.88,
      roughness: 0.28,
      envMapIntensity: 1.0,
      bumpMap: brushedBump,
      bumpScale: 0.012,
    }),
  );

  const tarnishedGoldMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xcab072,
      metalness: 0.92,
      roughness: 0.2,
      envMapIntensity: 1.15,
    }),
  );

  const chainmailMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x262930,
      metalness: 0.55,
      roughness: 0.58,
      bumpMap: chainBump,
      bumpScale: 0.03,
    }),
  );

  const leatherMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2a1d15,
      metalness: 0.12,
      roughness: 0.86,
    }),
  );

  const bladeSteelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xb2b8c4,
      metalness: 0.92,
      roughness: 0.18,
      envMapIntensity: 1.15,
    }),
  );

  const capeClothMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      metalness: 0.05,
      roughness: 0.88,
      envMapIntensity: 0.28,
      side: THREE.DoubleSide,
    }),
  );

  const visorEmissiveMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffb347,
      emissive: new THREE.Color(0xff9b2a),
      emissiveIntensity: 2.4,
      roughness: 0.2,
      metalness: 0.1,
    }),
  );

  // Soft radial contact shadow beneath sabatons
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0,0,0,0.68)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
  }
  const shadowTex = track(new THREE.CanvasTexture(shadowCanvas));
  const contactShadow = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.68, 24)),
    track(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.62,
      }),
    ),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.025;
  root.add(contactShadow);

  // =========================================================================
  // 18-JOINT HIERARCHICAL SKELETON RIG
  // =========================================================================
  // Joint 1: pelvisPivot (y = 0.94 so soles land cleanly at y = 0.00)
  const pelvisPivot = new THREE.Group();
  pelvisPivot.position.y = 0.94;
  root.add(pelvisPivot);

  // Pelvis armor, chainmail skirt, studded leather belt & articulated hip tassets
  const pelvisCore = new THREE.Mesh(
    track(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.14, -0.09),
          new THREE.Vector2(0.195, -0.03),
          new THREE.Vector2(0.185, 0.05),
          new THREE.Vector2(0.165, 0.09),
        ],
        12,
      ),
    ),
    flutedDarkSteelMat,
  );
  pelvisCore.scale.set(1.12, 1, 0.84);
  pelvisCore.castShadow = true;
  pelvisPivot.add(pelvisCore);

  const mailSkirt = new THREE.Mesh(
    track(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.245, -0.27),
          new THREE.Vector2(0.22, -0.14),
          new THREE.Vector2(0.195, 0.0),
        ],
        14,
      ),
    ),
    chainmailMat,
  );
  mailSkirt.scale.set(1.08, 1, 0.88);
  pelvisPivot.add(mailSkirt);

  const belt = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.198, 0.205, 0.068, 14)),
    leatherMat,
  );
  belt.position.y = 0.065;
  belt.scale.set(1.12, 1, 0.85);
  pelvisPivot.add(belt);

  const buckle = new THREE.Mesh(
    track(
      createBeveledShieldPlateGeo(
        [
          [-0.048, -0.04],
          [0.048, -0.04],
          [0.054, 0.04],
          [-0.054, 0.04],
        ],
        0.025,
        0.008,
      ),
    ),
    tarnishedGoldMat,
  );
  buckle.position.set(0, 0.065, -0.175);
  pelvisPivot.add(buckle);

  const studGeo = track(new THREE.SphereGeometry(0.011, 6, 6));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.25 && Math.cos(a) < 0) continue;
    const stud = new THREE.Mesh(studGeo, tarnishedGoldMat);
    stud.position.set(Math.sin(a) * 0.222, 0.065, Math.cos(a) * 0.172);
    pelvisPivot.add(stud);
  }

  // Articulated Hip Tassets (3 beveled overlapping lames per hip)
  const tassetPlateGeo = track(
    createBeveledShieldPlateGeo(
      [
        [-0.08, 0.03],
        [0.08, 0.03],
        [0.095, -0.05],
        [-0.095, -0.05],
      ],
      0.016,
      0.006,
    ),
  );
  for (const side of [-1, 1] as const) {
    for (let l = 0; l < 3; l++) {
      const lame = new THREE.Mesh(tassetPlateGeo, l % 2 === 0 ? brushedSteelMat : flutedDarkSteelMat);
      lame.position.set(side * (0.215 + l * 0.012), 0.005 - l * 0.072, -0.02);
      lame.rotation.y = side * Math.PI * 0.44;
      lame.rotation.x = -0.14 - l * 0.04;
      lame.castShadow = true;
      pelvisPivot.add(lame);
    }
  }

  // Warm Hip Lantern anchored cleanly on right belt
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(0.245, 0.02, -0.05);
  pelvisPivot.add(lanternGroup);

  const lanternCage = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.05, 0.042, 0.135, 6)),
    tarnishedGoldMat,
  );
  lanternCage.position.y = -0.07;
  lanternGroup.add(lanternCage);

  const lanternFlame = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.032, 8, 8)),
    visorEmissiveMat,
  );
  lanternFlame.position.y = -0.07;
  lanternGroup.add(lanternFlame);

  const lanternLight = new THREE.PointLight(0xffa445, 2.1, 8.5, 1.8);
  lanternLight.position.set(0.26, -0.06, -0.08);
  lanternGroup.add(lanternLight);

  // Joint 2: lowerSpinePivot (abdomen)
  const lowerSpinePivot = new THREE.Group();
  lowerSpinePivot.position.y = 0.1;
  pelvisPivot.add(lowerSpinePivot);

  const abdomenMesh = new THREE.Mesh(
    track(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.165, -0.02),
          new THREE.Vector2(0.175, 0.07),
          new THREE.Vector2(0.195, 0.17),
        ],
        12,
      ),
    ),
    chainmailMat,
  );
  abdomenMesh.scale.set(1.12, 1, 0.82);
  lowerSpinePivot.add(abdomenMesh);

  const plackart = new THREE.Mesh(
    track(
      createBeveledShieldPlateGeo(
        [
          [-0.14, -0.01],
          [0.14, -0.01],
          [0.165, 0.14],
          [0, 0.17],
          [-0.165, 0.14],
        ],
        0.045,
        0.012,
      ),
    ),
    flutedDarkSteelMat,
  );
  plackart.position.set(0, 0.01, -0.145);
  lowerSpinePivot.add(plackart);

  // Joint 3: upperChestPivot
  const upperChestPivot = new THREE.Group();
  upperChestPivot.position.y = 0.16;
  lowerSpinePivot.add(upperChestPivot);

  // Sculpted V-tapered Cuirass (LatheGeometry)
  const cuirassLathe = new THREE.Mesh(
    track(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.19, -0.03),
          new THREE.Vector2(0.235, 0.08),
          new THREE.Vector2(0.258, 0.18),
          new THREE.Vector2(0.225, 0.26),
          new THREE.Vector2(0.135, 0.295),
        ],
        14,
      ),
    ),
    brushedSteelMat,
  );
  cuirassLathe.scale.set(1.15, 1, 0.78);
  cuirassLathe.castShadow = true;
  upperChestPivot.add(cuirassLathe);

  // Curved Anatomical Front Pectoral Shell & Engraved Gold Filigree
  const breastPlateGeo = track(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.205, 0.0),
        new THREE.Vector2(0.242, 0.075),
        new THREE.Vector2(0.268, 0.165),
        new THREE.Vector2(0.236, 0.245),
        new THREE.Vector2(0.148, 0.285),
      ],
      12,
      Math.PI * 0.72,
      Math.PI * 0.56,
    ),
  );
  const breastPlate = new THREE.Mesh(breastPlateGeo, brushedSteelMat);
  breastPlate.scale.set(1.16, 1.0, 0.84);
  breastPlate.castShadow = true;
  upperChestPivot.add(breastPlate);

  const chestRidge = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.024, 0.24, 0.028)),
    tarnishedGoldMat,
  );
  chestRidge.position.set(0, 0.135, -0.215);
  chestRidge.rotation.x = -0.14;
  upperChestPivot.add(chestRidge);

  const chestFiligree = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.2, 0.022, 0.024)),
    tarnishedGoldMat,
  );
  chestFiligree.position.set(0, 0.18, -0.212);
  chestFiligree.rotation.x = -0.12;
  upperChestPivot.add(chestFiligree);

  // Diagonal Leather Baldric Strap hugging cleanly around cuirass & ribcage inside arm
  const baldricCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.165, 0.265, -0.175),
    new THREE.Vector3(0.04, 0.14, -0.232),
    new THREE.Vector3(-0.14, 0.005, -0.175),
    new THREE.Vector3(-0.205, -0.005, 0.01),
    new THREE.Vector3(-0.105, 0.06, 0.195),
    new THREE.Vector3(0.115, 0.22, 0.185),
    new THREE.Vector3(0.165, 0.265, -0.175),
  ]);
  const baldric = new THREE.Mesh(
    track(new THREE.TubeGeometry(baldricCurve, 24, 0.02, 6, true)),
    leatherMat,
  );
  upperChestPivot.add(baldric);

  // Flared Articulated Gorget Collar
  const gorget = new THREE.Mesh(
    track(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.175, 0.255),
          new THREE.Vector2(0.135, 0.295),
          new THREE.Vector2(0.122, 0.335),
        ],
        12,
      ),
    ),
    flutedDarkSteelMat,
  );
  upperChestPivot.add(gorget);

  // Joint 4: neckPivot & Joint 5: headGroup (Sallet / Great-Helm rising cleanly to 1.85m)
  const neckPivot = new THREE.Group();
  neckPivot.position.y = 0.3;
  upperChestPivot.add(neckPivot);

  const neckCoif = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.072, 0.095, 0.09, 10)),
    chainmailMat,
  );
  neckCoif.position.y = 0.03;
  neckPivot.add(neckCoif);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.06;
  neckPivot.add(headGroup);

  // Sallet Dome & Flared Neck Guard
  const salletSkull = new THREE.Mesh(
    track(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.128, 0.01),
          new THREE.Vector2(0.118, 0.09),
          new THREE.Vector2(0.126, 0.17),
          new THREE.Vector2(0.11, 0.235),
          new THREE.Vector2(0.062, 0.275),
          new THREE.Vector2(0.0, 0.285),
        ],
        14,
      ),
    ),
    brushedSteelMat,
  );
  salletSkull.scale.set(0.95, 1, 1.08);
  salletSkull.castShadow = true;
  headGroup.add(salletSkull);

  // Curved Flared Sallet Rear Tail Guard (+Z, closed double-walled lathe profile)
  const salletTailGeo = track(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.118, 0.095),
        new THREE.Vector2(0.136, 0.035),
        new THREE.Vector2(0.168, -0.025),
        new THREE.Vector2(0.156, -0.032),
        new THREE.Vector2(0.124, 0.032),
        new THREE.Vector2(0.106, 0.095),
      ],
      14,
      -Math.PI * 0.42,
      Math.PI * 0.84,
    ),
  );
  const salletTail = new THREE.Mesh(salletTailGeo, flutedDarkSteelMat);
  salletTail.position.set(0, 0.015, 0.01);
  salletTail.rotation.x = -0.14;
  headGroup.add(salletTail);

  // Central Raised Sagittal Crest with Tarnished Gold Trim (thin left-to-right, arched front-to-back)
  const helmCrestGeo = track(
    createBeveledShieldPlateGeo(
      [
        [-0.105, 0.195],
        [-0.085, 0.26],
        [0.0, 0.298],
        [0.088, 0.272],
        [0.118, 0.185],
        [0.085, 0.18],
        [0.0, 0.245],
        [-0.075, 0.225],
      ],
      0.014,
      0.003,
    ),
  );
  helmCrestGeo.translate(0, 0, -0.007);
  const helmCrest = new THREE.Mesh(helmCrestGeo, tarnishedGoldMat);
  helmCrest.position.set(0, 0.0, 0.0);
  helmCrest.rotation.y = Math.PI / 2;
  headGroup.add(helmCrest);

  // Pointed Visor Brow & Cheek Guards with Recessed Glowing Eye Slit
  const visorBrow = new THREE.Mesh(
    track(
      createBeveledShieldPlateGeo(
        [
          [-0.118, 0.02],
          [0, 0.045],
          [0.118, 0.02],
          [0.1, -0.025],
          [0, -0.048],
          [-0.1, -0.025],
        ],
        0.065,
        0.008,
      ),
    ),
    brushedSteelMat,
  );
  visorBrow.position.set(0, 0.15, -0.122);
  visorBrow.rotation.x = 0.1;
  headGroup.add(visorBrow);

  const visorBeak = new THREE.Mesh(
    track(
      createBeveledShieldPlateGeo(
        [
          [-0.095, 0.06],
          [0.095, 0.06],
          [0.072, -0.06],
          [0, -0.085],
          [-0.072, -0.06],
        ],
        0.075,
        0.008,
      ),
    ),
    flutedDarkSteelMat,
  );
  visorBeak.position.set(0, 0.062, -0.118);
  visorBeak.rotation.x = -0.16;
  headGroup.add(visorBeak);

  const visorGlow = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.136, 0.018, 0.036)),
    visorEmissiveMat,
  );
  visorGlow.position.set(0, 0.124, -0.142);
  headGroup.add(visorGlow);

  // =========================================================================
  // REAL-TIME VERTEX-SIMULATED TATTERED CAPE (PlaneGeometry 12 x 18)
  // =========================================================================
  // Joint 6: capeAnchor (pinned to upper shoulder mantle)
  const capeAnchor = new THREE.Group();
  capeAnchor.position.set(0, 0.275, 0.148);
  upperChestPivot.add(capeAnchor);

  // Sculpted Leather Shoulder Mantle Wrap & Gold Brooch Clasps
  const mantleWrap = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.205, 0.305, 0.11, 14, 1, false, -Math.PI * 0.45, Math.PI * 0.9)),
    leatherMat,
  );
  mantleWrap.position.set(0, -0.035, -0.06);
  mantleWrap.scale.set(1.05, 1, 0.85);
  capeAnchor.add(mantleWrap);

  for (const side of [-1, 1] as const) {
    const clasp = new THREE.Mesh(track(new THREE.CylinderGeometry(0.034, 0.034, 0.022, 8)), tarnishedGoldMat);
    clasp.rotation.x = Math.PI / 2;
    clasp.position.set(side * 0.155, -0.02, -0.21);
    capeAnchor.add(clasp);
  }

  const capeSegX = 12;
  const capeSegY = 18;
  const capeW = 0.72;
  const capeH = 1.24;
  const capeGeo = track(new THREE.PlaneGeometry(capeW, capeH, capeSegX, capeSegY));
  // Shift so top edge is at local y = 0, hanging down to y = -capeH
  capeGeo.translate(0, -capeH * 0.5, 0);

  const cPos = capeGeo.attributes.position as THREE.BufferAttribute;
  const capeCols = new Float32Array(cPos.count * 3);
  const capeRestPos = new Float32Array(cPos.count * 3);
  const capeVWeight = new Float32Array(cPos.count);
  const cTop = new THREE.Color(0x6e161d); // Deep weathered crimson
  const cBottom = new THREE.Color(0x1f223d); // Tarnished indigo hem
  const cBlend = new THREE.Color();

  for (let i = 0; i < cPos.count; i++) {
    const x0 = cPos.getX(i);
    const y0 = cPos.getY(i);
    const v = Math.min(1, Math.max(0, -y0 / capeH)); // 0 at top collar, 1 at bottom hem
    const uNorm = x0 / (capeW * 0.5); // -1 .. +1

    // Flare slightly wider toward hem, wrap shoulders gently at top, and carve jagged Gothic hem tatters
    const shoulderArchZ = -Math.pow(uNorm, 2) * 0.06 * (1 - v);
    const flareX = x0 * (0.68 + v * 0.44);
    const tatter =
      v > 0.72
        ? Math.sin(uNorm * 9.5 + 0.8) * 0.065 + Math.cos(uNorm * 16.0) * 0.04
        : 0;
    const finalY = y0 + tatter * ((v - 0.72) / 0.28);
    const finalZ = 0.008 + shoulderArchZ + v * 0.028;

    cPos.setXYZ(i, flareX, finalY, finalZ);
    capeRestPos[i * 3] = flareX;
    capeRestPos[i * 3 + 1] = finalY;
    capeRestPos[i * 3 + 2] = finalZ;
    capeVWeight[i] = v;

    cBlend.copy(cTop).lerp(cBottom, Math.pow(v, 1.15));
    capeCols[i * 3] = cBlend.r;
    capeCols[i * 3 + 1] = cBlend.g;
    capeCols[i * 3 + 2] = cBlend.b;
  }
  capeGeo.setAttribute('color', new THREE.BufferAttribute(capeCols, 3));
  cPos.needsUpdate = true;
  capeGeo.computeVertexNormals();

  const capeMesh = new THREE.Mesh(capeGeo, capeClothMat);
  capeMesh.castShadow = true;
  capeAnchor.add(capeMesh);

  // =========================================================================
  // 1.45m DOUBLE-EDGED GOTHIC GREATSWORD & MATCHING DIAGONAL SCABBARD
  // =========================================================================
  const createGreatswordModel = (): THREE.Group => {
    const g = new THREE.Group();
    // Diamond-section beveled blade (1.14m blade + 0.31m hilt = 1.45m total)
    const bladeGeo = track(createDiamondGreatswordBladeGeo(0.048, 0.18, 1.14, 0.026));
    const blade = new THREE.Mesh(bladeGeo, bladeSteelMat);
    blade.position.y = 0.14;
    blade.castShadow = true;
    g.add(blade);

    // Central recessed dark-steel fuller groove
    const fuller = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.016, 0.78, 0.028)),
      flutedDarkSteelMat,
    );
    fuller.position.y = 0.54;
    g.add(fuller);

    // Down-turned Tarnished Silver-Gold Crossguard Quillons
    const crossguard = new THREE.Mesh(
      track(
        createBeveledShieldPlateGeo(
          [
            [-0.18, -0.032],
            [-0.12, 0.018],
            [0.0, 0.034],
            [0.12, 0.018],
            [0.18, -0.032],
            [0.11, -0.01],
            [0.0, 0.005],
            [-0.11, -0.01],
          ],
          0.038,
          0.006,
        ),
      ),
      tarnishedGoldMat,
    );
    crossguard.position.y = 0.135;
    g.add(crossguard);

    // Ribbed Dark-Leather Two-Handed Grip (LatheGeometry)
    const grip = new THREE.Mesh(
      track(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.022, -0.14),
            new THREE.Vector2(0.018, -0.07),
            new THREE.Vector2(0.023, 0.0),
            new THREE.Vector2(0.019, 0.06),
            new THREE.Vector2(0.024, 0.13),
          ],
          10,
        ),
      ),
      leatherMat,
    );
    g.add(grip);

    // Heavy Faceted Octagonal Pommel
    const pommel = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.036, 0.028, 0.055, 8)),
      tarnishedGoldMat,
    );
    pommel.position.y = -0.165;
    g.add(pommel);

    return g;
  };

  // Back-slung Greatsword (shown when pushing heavy gate or resting at bonfire; hilt above right shoulder, blade down-left)
  const swordBackGroup = createGreatswordModel();
  swordBackGroup.position.set(0.25, 0.34, 0.264);
  swordBackGroup.rotation.set(0.11, 0, Math.PI - 0.56);
  swordBackGroup.visible = false;
  upperChestPivot.add(swordBackGroup);

  // Empty Matching Leather-and-Brass Scabbard worn diagonally over cape (locket at right shoulder, chape pointing down-left)
  const emptyScabbardGroup = new THREE.Group();
  emptyScabbardGroup.position.set(0.25, 0.34, 0.258);
  emptyScabbardGroup.rotation.set(0.11, 0, Math.PI - 0.56);

  const scabbardBody = new THREE.Mesh(
    track(
      createBeveledShieldPlateGeo(
        [
          [-0.048, 0.14],
          [0.048, 0.14],
          [0.034, 1.12],
          [0.0, 1.24],
          [-0.034, 1.12],
        ],
        0.026,
        0.006,
      ),
    ),
    leatherMat,
  );
  emptyScabbardGroup.add(scabbardBody);

  const scabbardLocket = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.106, 0.07, 0.042)),
    tarnishedGoldMat,
  );
  scabbardLocket.position.y = 0.17;
  emptyScabbardGroup.add(scabbardLocket);

  const scabbardChape = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.038, 0.14, 4)),
    tarnishedGoldMat,
  );
  scabbardChape.position.y = 1.23;
  scabbardChape.rotation.y = Math.PI / 4;
  emptyScabbardGroup.add(scabbardChape);
  upperChestPivot.add(emptyScabbardGroup);

  // =========================================================================
  // ARTICULATED ARMS (Shoulders -> Elbows -> Wrists -> Gauntlets + Fingers)
  // =========================================================================
  const armJointSphereGeo = track(new THREE.SphereGeometry(0.068, 10, 8));
  const wristJointSphereGeo = track(new THREE.SphereGeometry(0.044, 8, 8));
  const couterGeo = track(
    createBeveledShieldPlateGeo(
      [
        [-0.048, 0.055],
        [0.048, 0.055],
        [0.06, 0.0],
        [0, -0.065],
        [-0.06, 0.0],
      ],
      0.045,
      0.008,
    ),
  );
  const upperArmGeo = track(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.056, -0.26),
        new THREE.Vector2(0.068, -0.14),
        new THREE.Vector2(0.064, -0.03),
      ],
      10,
    ),
  );
  const vambraceGeo = track(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.046, -0.24),
        new THREE.Vector2(0.062, -0.11),
        new THREE.Vector2(0.064, -0.02),
      ],
      10,
    ),
  );

  const buildArmChain = (side: -1 | 1) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * 0.275, 0.215, 0);
    upperChestPivot.add(shoulderPivot);

    // Chainmail shoulder ball joint
    const sJoint = new THREE.Mesh(armJointSphereGeo, chainmailMat);
    sJoint.scale.setScalar(1.22);
    shoulderPivot.add(sJoint);

    // 3-Plate Overlapping Curved Pauldron
    const pTop = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.142, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58)),
      brushedSteelMat,
    );
    pTop.position.set(side * 0.02, 0.015, 0);
    pTop.rotation.z = -side * 0.34;
    pTop.scale.set(1.18, 0.88, 1.06);
    pTop.castShadow = true;
    shoulderPivot.add(pTop);

    const pRim = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.132, 0.012, 6, 14)),
      tarnishedGoldMat,
    );
    pRim.rotation.x = Math.PI / 2;
    pRim.rotation.y = -side * 0.34;
    pRim.position.set(side * 0.02, -0.005, 0);
    shoulderPivot.add(pRim);

    const pMid = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.105, 0.122, 0.065, 10, 1, false, 0, Math.PI * 1.4)),
      flutedDarkSteelMat,
    );
    pMid.position.set(side * 0.03, -0.055, 0);
    pMid.rotation.y = side > 0 ? -Math.PI * 0.2 : Math.PI * 0.8;
    pMid.rotation.z = -side * 0.22;
    shoulderPivot.add(pMid);

    const pLow = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.092, 0.108, 0.055, 10, 1, false, 0, Math.PI * 1.3)),
      brushedSteelMat,
    );
    pLow.position.set(side * 0.036, -0.105, 0);
    pLow.rotation.y = side > 0 ? -Math.PI * 0.15 : Math.PI * 0.85;
    pLow.rotation.z = -side * 0.16;
    shoulderPivot.add(pLow);

    // Upper Arm (rerebrace)
    const upperArm = new THREE.Mesh(upperArmGeo, flutedDarkSteelMat);
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);

    // Elbow Pivot
    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.27, 0);
    shoulderPivot.add(elbowPivot);

    const eJoint = new THREE.Mesh(armJointSphereGeo, chainmailMat);
    eJoint.scale.setScalar(0.9);
    elbowPivot.add(eJoint);

    const couter = new THREE.Mesh(couterGeo, brushedSteelMat);
    couter.position.set(side * 0.015, 0, 0.036);
    couter.rotation.y = side * 0.22;
    elbowPivot.add(couter);

    const forearm = new THREE.Mesh(vambraceGeo, brushedSteelMat);
    forearm.castShadow = true;
    elbowPivot.add(forearm);

    // Wrist Pivot & Articulated Armored Gauntlet
    const wristPivot = new THREE.Group();
    wristPivot.position.set(0, -0.25, 0);
    elbowPivot.add(wristPivot);

    const wJoint = new THREE.Mesh(wristJointSphereGeo, chainmailMat);
    wristPivot.add(wJoint);

    const cuff = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.054, 0.044, 0.07, 8)),
      flutedDarkSteelMat,
    );
    cuff.position.y = 0.025;
    wristPivot.add(cuff);

    const cuffTrim = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.057, 0.057, 0.014, 8)),
      tarnishedGoldMat,
    );
    cuffTrim.position.y = 0.055;
    wristPivot.add(cuffTrim);

    const palm = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.056, 0.088, 0.078)),
      brushedSteelMat,
    );
    palm.position.set(side * 0.005, -0.045, 0);
    wristPivot.add(palm);

    // Articulated armored fingers curling cleanly inward (toward palm/hilt)
    const fingerSegGeo = track(new THREE.BoxGeometry(0.016, 0.042, 0.018));
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(fingerSegGeo, flutedDarkSteelMat);
      finger.position.set(-side * 0.022, -0.092, -0.026 + f * 0.018);
      finger.rotation.z = -side * 0.65;
      wristPivot.add(finger);
    }
    const thumb = new THREE.Mesh(fingerSegGeo, brushedSteelMat);
    thumb.position.set(-side * 0.026, -0.052, -0.042);
    thumb.rotation.x = 0.45;
    thumb.rotation.z = -side * 0.35;
    wristPivot.add(thumb);

    return { shoulderPivot, elbowPivot, wristPivot };
  };

  const leftArm = buildArmChain(-1);
  const rightArm = buildArmChain(1);

  // Mount 1.45m Greatsword cleanly inside Right Gauntlet fingers
  const swordHandGroup = createGreatswordModel();
  swordHandGroup.position.set(-0.018, -0.068, -0.012);
  swordHandGroup.rotation.set(-Math.PI * 0.52, 0.08, -0.06);
  rightArm.wristPivot.add(swordHandGroup);

  // =========================================================================
  // ARTICULATED LEGS (Hips -> Knees -> Ankles -> Pointed Sabatons)
  // =========================================================================
  const hipJointSphereGeo = track(new THREE.SphereGeometry(0.09, 10, 8));
  const kneeJointSphereGeo = track(new THREE.SphereGeometry(0.07, 10, 8));
  const ankleJointSphereGeo = track(new THREE.SphereGeometry(0.052, 8, 8));

  const cuisseGeo = track(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.072, -0.39),
        new THREE.Vector2(0.088, -0.22),
        new THREE.Vector2(0.096, -0.05),
      ],
      10,
    ),
  );
  const greaveGeo = track(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.052, -0.4),
        new THREE.Vector2(0.074, -0.22),
        new THREE.Vector2(0.076, -0.05),
      ],
      10,
    ),
  );
  const poleynGeo = track(
    createBeveledShieldPlateGeo(
      [
        [-0.058, 0.068],
        [0.058, 0.068],
        [0.074, 0.0],
        [0, -0.078],
        [-0.074, 0.0],
      ],
      0.055,
      0.01,
    ),
  );
  const sabatonGeo = track(
    createBeveledShieldPlateGeo(
      [
        [-0.052, -0.08],
        [0.052, -0.08],
        [0.06, -0.02],
        [0.036, 0.14],
        [0, 0.185],
        [-0.036, 0.14],
        [-0.06, -0.02],
      ],
      0.062,
      0.008,
    ),
  );
  sabatonGeo.rotateX(-Math.PI / 2);

  const buildLegChain = (side: -1 | 1) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.125, -0.05, 0);
    pelvisPivot.add(hipPivot);

    const hJoint = new THREE.Mesh(hipJointSphereGeo, chainmailMat);
    hipPivot.add(hJoint);

    const thigh = new THREE.Mesh(cuisseGeo, brushedSteelMat);
    thigh.castShadow = true;
    hipPivot.add(thigh);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.4, 0);
    hipPivot.add(kneePivot);

    const kJoint = new THREE.Mesh(kneeJointSphereGeo, chainmailMat);
    kneePivot.add(kJoint);

    const poleyn = new THREE.Mesh(poleynGeo, flutedDarkSteelMat);
    poleyn.position.set(0, 0.005, -0.048);
    kneePivot.add(poleyn);

    const greave = new THREE.Mesh(greaveGeo, brushedSteelMat);
    greave.castShadow = true;
    kneePivot.add(greave);

    const anklePivot = new THREE.Group();
    anklePivot.position.set(0, -0.41, 0);
    kneePivot.add(anklePivot);

    const aJoint = new THREE.Mesh(ankleJointSphereGeo, chainmailMat);
    anklePivot.add(aJoint);

    const sabaton = new THREE.Mesh(sabatonGeo, flutedDarkSteelMat);
    sabaton.position.set(0, -0.048, -0.042);
    sabaton.castShadow = true;
    anklePivot.add(sabaton);

    return { hipPivot, kneePivot, anklePivot };
  };

  const leftLeg = buildLegChain(-1);
  const rightLeg = buildLegChain(1);

  // =========================================================================
  // POOLED GROUND DUST PUFFS FOR DODGE ROLL (16 PARTICLES)
  // =========================================================================
  const dustGeo = track(new THREE.IcosahedronGeometry(0.22, 0));
  const dustPuffs: DustPuff[] = [];
  for (let i = 0; i < 16; i++) {
    const mat = track(
      new THREE.MeshBasicMaterial({
        color: 0xc8c0b4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const mesh = new THREE.Mesh(dustGeo, mat);
    mesh.visible = false;
    root.add(mesh);
    dustPuffs.push({
      mesh,
      mat,
      active: false,
      life: 0,
      maxLife: 0.46,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }

  return {
    root,
    pelvisPivot,
    lowerSpinePivot,
    upperChestPivot,
    neckPivot,
    headGroup,
    capeAnchor,
    leftShoulderPivot: leftArm.shoulderPivot,
    leftElbowPivot: leftArm.elbowPivot,
    leftWristPivot: leftArm.wristPivot,
    rightShoulderPivot: rightArm.shoulderPivot,
    rightElbowPivot: rightArm.elbowPivot,
    rightWristPivot: rightArm.wristPivot,
    leftHipPivot: leftLeg.hipPivot,
    leftKneePivot: leftLeg.kneePivot,
    leftAnklePivot: leftLeg.anklePivot,
    rightHipPivot: rightLeg.hipPivot,
    rightKneePivot: rightLeg.kneePivot,
    rightAnklePivot: rightLeg.anklePivot,
    swordBackGroup,
    swordHandGroup,
    emptyScabbardGroup,
    capeMesh,
    capeGeo,
    capeRestPos,
    capeVWeight,
    lanternLight,
    lanternFlame,
    visorGlow,
    contactShadow,
    dustPuffs,
    pose: {
      pelvisY: 0.94,
      pelvisRx: 0,
      pelvisRy: 0,
      pelvisRz: 0,
      lSpineRx: 0,
      lSpineRy: 0,
      lSpineRz: 0,
      uChestRx: 0,
      uChestRy: 0,
      uChestRz: 0,
      neckRx: 0,
      neckRy: 0,
      headRx: 0,
      headRy: 0,
      lShRx: 0,
      lShRy: 0,
      lShRz: 0.14,
      lElRx: 0.25,
      lWrRx: 0,
      rShRx: 0.16,
      rShRy: -0.06,
      rShRz: -0.16,
      rElRx: 0.42,
      rWrRx: -0.52,
      rWrRy: 0.1,
      rWrRz: -0.15,
      lHipRx: 0.06,
      lHipRz: -0.04,
      lKneeRx: -0.11,
      lAnkleRx: 0.05,
      rHipRx: 0.06,
      rHipRz: 0.04,
      rKneeRx: -0.11,
      rAnkleRx: 0.05,
      wasGrounded: true,
      landTimer: 0,
      rollDustCooldown: 0,
    },
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}

function updateDustPuffs(rig: KnightRig, dt: number, isRolling: boolean, rollProgress: number): void {
  const { pose, dustPuffs } = rig;
  if (isRolling && rollProgress < 0.88) {
    pose.rollDustCooldown -= dt;
    if (pose.rollDustCooldown <= 0) {
      pose.rollDustCooldown = 0.036;
      const slot = dustPuffs.find((p) => !p.active);
      if (slot) {
        slot.active = true;
        slot.life = 0;
        slot.maxLife = 0.45;
        slot.mesh.visible = true;
        slot.mesh.position.set(
          (Math.random() - 0.5) * 0.52,
          0.12,
          0.18 + Math.random() * 0.35,
        );
        slot.vx = (Math.random() - 0.5) * 1.35;
        slot.vy = 0.85 + Math.random() * 0.65;
        slot.vz = 2.4 + Math.random() * 1.25;
        slot.mesh.scale.setScalar(0.32);
        slot.mat.opacity = 0.52;
      }
    }
  } else {
    pose.rollDustCooldown = 0;
  }

  for (let i = 0; i < dustPuffs.length; i++) {
    const p = dustPuffs[i];
    if (!p.active) continue;
    p.life += dt;
    if (p.life >= p.maxLife) {
      p.active = false;
      p.mesh.visible = false;
      continue;
    }
    const t = p.life / p.maxLife;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.mesh.rotation.y += dt * 2.8;
    p.mesh.scale.setScalar(0.32 + t * 1.15);
    p.mat.opacity = 0.52 * (1 - t);
  }
}

function updateClothCapeVertices(
  rig: KnightRig,
  elapsed: number,
  speed: number,
  velY: number,
  grounded: boolean,
  isRolling: boolean,
  rollProgress: number,
  isSprinting: boolean,
  restBlend: number,
): void {
  const posAttr = rig.capeGeo.attributes.position as THREE.BufferAttribute;
  const rest = rig.capeRestPos;
  const vw = rig.capeVWeight;

  const speedNorm = Math.min(1, speed / 10.6);
  const sprintBoost = isSprinting ? 1.0 : speedNorm * 0.65;
  const waveFreq = 3.2 + speedNorm * 8.2;
  const waveAmp = 0.032 + speedNorm * 0.088;
  const backwardSweep =
    isRolling
      ? 0.14 * Math.sin(rollProgress * Math.PI)
      : restBlend > 0.2
        ? 0.28
        : 0.08 + speedNorm * (isSprinting ? 0.82 : 0.48);

  // Vertical air drag lifts cape upward when falling (velY < 0)
  const airBillow = !grounded ? THREE.MathUtils.clamp(-velY * 0.045, -0.18, 0.42) : 0;

  for (let i = 0; i < posAttr.count; i++) {
    const rx = rest[i * 3];
    const ry = rest[i * 3 + 1];
    const rz = rest[i * 3 + 2];
    const v = vw[i];
    const pin = Math.pow(v, 1.3);

    const w1 = Math.sin(v * 7.2 - elapsed * waveFreq + rx * 2.8) * waveAmp;
    const w2 = Math.cos(v * 12.5 - elapsed * (waveFreq * 1.45) - rx * 4.2) * (waveAmp * 0.38);
    const flutterX = Math.sin(v * 5.2 - elapsed * (2.6 + sprintBoost * 3.5)) * 0.025 * pin;

    // Trail backward (+Z) while rising slightly (+Y) to avoid flattening or dipping under ground
    const zOffset = pin * backwardSweep + pin * (w1 + w2) + (!grounded ? pin * airBillow * 0.55 : 0);
    const yLift =
      pin * (backwardSweep * 0.36) +
      (!grounded ? pin * airBillow * 0.62 : 0) +
      (isRolling ? pin * 0.35 : 0);

    posAttr.setXYZ(i, rx + flutterX, ry + yLift, rz + zOffset);
  }
  posAttr.needsUpdate = true;
  rig.capeGeo.computeVertexNormals();
}

/**
 * Weighted Soulsborne 18-joint procedural animator:
 * - Combat Idle: grounded shoulder-width stance, subtle knee flex, breathing, head scan, 35° ready sword
 * - Walk (6.5 rad/s): 0.06m pelvis bob, ±10° spine/hip counter-rotation, up to 45° knee flexion
 * - Sprint (12.5 rad/s): 26° chest lean, 85° high-knee drive, tucked sword, billowing cape
 * - Jump & Heavy Landing: asymmetric mid-air lead knee + 0.18s -0.22m crouch impact cushion
 * - Dodge Roll (0.55s): 3-phase forward dive tuck -> 360° pelvis pitch roll + 16 dust puffs -> recovery
 */
export function animateKnight(rig: KnightRig, state: KnightAnimState): void {
  const {
    speed,
    velY = 0,
    grounded,
    isSprinting,
    isRolling,
    rollProgress,
    restBlend,
    isPushingGate = false,
    pushProgress = 0,
    walkPhase,
    elapsed,
    dt = 1 / 60,
  } = state;

  const { pose } = rig;
  const clampedDt = Math.min(dt, 0.08);

  if (!pose.wasGrounded && grounded && !isRolling) {
    pose.landTimer = 0.18;
  }
  pose.wasGrounded = grounded;
  if (pose.landTimer > 0) {
    pose.landTimer = Math.max(0, pose.landTimer - clampedDt);
  }

  updateDustPuffs(rig, clampedDt, isRolling, rollProgress);

  // Keep greatsword drawn in hand across Idle, Walk, Sprint, Jump & Roll; sheath on back only for Gate Push & Bonfire Rest
  const stowSword = Boolean(isPushingGate || restBlend > 0.35);
  rig.swordHandGroup.visible = !stowSword;
  rig.emptyScabbardGroup.visible = !stowSword;
  rig.swordBackGroup.visible = stowSword;

  // Lantern & visor glow modulation
  const flicker = 1.0 + Math.sin(elapsed * 9.3) * 0.12 + Math.sin(elapsed * 17.1) * 0.07;
  rig.lanternLight.intensity = 2.05 * flicker;
  rig.lanternFlame.scale.setScalar(0.92 + 0.14 * flicker);
  rig.visorGlow.scale.x = 0.96 + Math.sin(elapsed * 3.1) * 0.04;

  // -------------------------------------------------------------------------
  // 1. TWO-HANDED CATACOMB GATE PUSH
  // -------------------------------------------------------------------------
  if (isPushingGate) {
    const brace = Math.sin(Math.min(1, pushProgress * 1.4) * Math.PI * 0.5);
    const stepCycle = Math.sin(pushProgress * Math.PI * 3.0);
    rig.pelvisPivot.position.y = 0.88 - brace * 0.06;
    rig.pelvisPivot.rotation.set(-0.24 * brace, 0, 0);
    rig.lowerSpinePivot.rotation.set(-0.14 * brace, 0, 0);
    rig.upperChestPivot.rotation.set(-0.12 * brace, 0, 0);
    rig.neckPivot.rotation.set(0.18 * brace, 0, 0);
    rig.headGroup.rotation.set(0.08 * brace, 0, 0);

    rig.leftShoulderPivot.rotation.set(1.25 * brace, 0, -0.14 * brace);
    rig.rightShoulderPivot.rotation.set(1.25 * brace, 0, 0.14 * brace);
    rig.leftElbowPivot.rotation.set(0.28 * brace, 0, 0);
    rig.rightElbowPivot.rotation.set(0.28 * brace, 0, 0);
    rig.leftWristPivot.rotation.set(-0.35 * brace, 0, 0);
    rig.rightWristPivot.rotation.set(-0.35 * brace, 0, 0);

    rig.leftHipPivot.rotation.set(0.55 * brace + stepCycle * 0.14, 0, -0.05);
    rig.rightHipPivot.rotation.set(-0.38 * brace - stepCycle * 0.14, 0, 0.05);
    rig.leftKneePivot.rotation.set(-0.48 * brace, 0, 0);
    rig.rightKneePivot.rotation.set(-0.28 * brace, 0, 0);
    rig.leftAnklePivot.rotation.set(0.15 * brace, 0, 0);
    rig.rightAnklePivot.rotation.set(0.28 * brace, 0, 0);

    updateClothCapeVertices(rig, elapsed, 1.5, 0, true, false, 0, false, 0);
    return;
  }

  // -------------------------------------------------------------------------
  // 2. THREE-PHASE 0.55s SOULSBORNE DODGE ROLL
  // -------------------------------------------------------------------------
  if (isRolling) {
    const p = THREE.MathUtils.clamp(rollProgress, 0, 1);
    let pelvisY = 0.94;
    let pelvisRx = 0;
    let spineFlex = 0;
    let neckFlex = 0;
    let kneeFlex = -0.11;
    let hipFlex = 0.06;
    let shFlex = 0.16;
    let elFlex = 0.42;

    if (p < 0.22) {
      // Phase 1 (0.00 - 0.12s): Forward dive & tight tuck
      const u = p / 0.22;
      const e = u * u * (3 - 2 * u);
      pelvisY = THREE.MathUtils.lerp(0.94, 0.56, e);
      pelvisRx = THREE.MathUtils.lerp(0, -0.58, e);
      spineFlex = THREE.MathUtils.lerp(0, -0.48, e); // ~55 deg forward tuck total
      neckFlex = THREE.MathUtils.lerp(0, 0.45, e);
      hipFlex = THREE.MathUtils.lerp(0.06, 1.35, e);
      kneeFlex = THREE.MathUtils.lerp(-0.11, -1.92, e); // 110 deg knee tuck
      shFlex = THREE.MathUtils.lerp(0.16, 1.15, e);
      elFlex = THREE.MathUtils.lerp(0.42, 1.35, e);
    } else if (p < 0.78) {
      // Phase 2 (0.12 - 0.43s): Full 360° tucked forward somersault
      const u = (p - 0.22) / 0.56;
      pelvisY = 0.52 - Math.sin(u * Math.PI) * 0.06;
      pelvisRx = -0.58 - u * (Math.PI * 2 - 0.58);
      spineFlex = -0.48;
      neckFlex = 0.45;
      hipFlex = 1.45;
      kneeFlex = -1.95;
      shFlex = 1.18;
      elFlex = 1.45;
    } else {
      // Phase 3 (0.43 - 0.55s): Foot plant, crouch absorption & spring back
      const u = (p - 0.78) / 0.22;
      const e = 1 - Math.pow(1 - u, 2);
      pelvisY = THREE.MathUtils.lerp(0.66, 0.9, e);
      pelvisRx = THREE.MathUtils.lerp(-Math.PI * 2, -Math.PI * 2, e);
      spineFlex = THREE.MathUtils.lerp(-0.42, -0.1, e);
      neckFlex = THREE.MathUtils.lerp(0.35, 0.08, e);
      hipFlex = THREE.MathUtils.lerp(0.95, 0.24, e);
      kneeFlex = THREE.MathUtils.lerp(-1.35, -0.35, e);
      shFlex = THREE.MathUtils.lerp(0.9, 0.22, e);
      elFlex = THREE.MathUtils.lerp(1.2, 0.48, e);
    }

    rig.pelvisPivot.position.y = pelvisY;
    rig.pelvisPivot.rotation.set(pelvisRx, 0, 0);
    rig.lowerSpinePivot.rotation.set(spineFlex * 0.5, 0, 0);
    rig.upperChestPivot.rotation.set(spineFlex * 0.5, 0, 0);
    rig.neckPivot.rotation.set(neckFlex, 0, 0);
    rig.headGroup.rotation.set(0.1, 0, 0);

    rig.leftHipPivot.rotation.set(hipFlex, 0, -0.08);
    rig.rightHipPivot.rotation.set(hipFlex, 0, 0.08);
    rig.leftKneePivot.rotation.set(kneeFlex, 0, 0);
    rig.rightKneePivot.rotation.set(kneeFlex, 0, 0);
    rig.leftAnklePivot.rotation.set(-kneeFlex * 0.35, 0, 0);
    rig.rightAnklePivot.rotation.set(-kneeFlex * 0.35, 0, 0);

    rig.leftShoulderPivot.rotation.set(shFlex, 0, 0.24);
    rig.rightShoulderPivot.rotation.set(shFlex * 0.5 - 0.2, 0, -0.28);
    rig.leftElbowPivot.rotation.set(elFlex, 0, 0);
    rig.rightElbowPivot.rotation.set(elFlex * 0.85, 0, 0);
    // Tuck sword blade backward safely alongside right hip during roll
    rig.rightWristPivot.rotation.set(-0.95, 0.15, -0.32);

    pose.pelvisRx = 0;
    pose.pelvisY = pelvisY;
    updateClothCapeVertices(rig, elapsed, speed, velY, grounded, true, p, false, 0);
    return;
  }

  // -------------------------------------------------------------------------
  // 3. TARGET JOINT ANGLES FOR IDLE / WALK / SPRINT / JUMP / LAND / REST
  // -------------------------------------------------------------------------
  const moveFactor = Math.min(1, speed / 5.5);
  const sprintBlend = isSprinting && moveFactor > 0.5 ? Math.min(1, (speed - 5.6) / 4.8) : 0;
  const landFrac = pose.landTimer > 0 ? Math.sin((pose.landTimer / 0.18) * Math.PI) : 0;
  const landDip = landFrac * 0.22;

  let tPelvisY = 0.94 - landDip;
  let tPelvisRx = 0;
  let tPelvisRy = 0;
  let tPelvisRz = 0;
  let tLSpineRx = -landFrac * 0.18;
  let tLSpineRy = 0;
  let tLSpineRz = 0;
  let tUChestRx = -landFrac * 0.16;
  let tUChestRy = 0;
  let tUChestRz = 0;
  let tNeckRx = landFrac * 0.24;
  let tNeckRy = 0;
  let tHeadRx = 0;
  let tHeadRy = 0;

  let tLShRx = 0.06;
  let tLShRy = 0;
  let tLShRz = 0.14;
  let tLElRx = 0.28;
  let tLWrRx = 0;

  let tRShRx = 0.08;
  let tRShRy = -0.14;
  let tRShRz = -0.24;
  let tRElRx = 0.36;
  let tRWrRx = -0.66; // ~38 deg low-ready greatsword poise angled cleanly outward
  let tRWrRy = 0.24;
  let tRWrRz = -0.34;

  // Base stance: shoulder-width legs + subtle 6° (0.105 rad) knee flex
  let tLHipRx = 0.06 + landFrac * 0.58;
  let tLHipRz = -0.05;
  let tLKneeRx = -0.105 - landFrac * 1.02;
  let tLAnkleRx = 0.045 + landFrac * 0.44;

  let tRHipRx = 0.06 + landFrac * 0.58;
  let tRHipRz = 0.05;
  let tRKneeRx = -0.105 - landFrac * 1.02;
  let tRAnkleRx = 0.045 + landFrac * 0.44;

  if (!grounded) {
    // Heroic Jump & Descent Pose: 70° lead knee flex, extended trailing leg, flared balance arms
    const ascendBlend = THREE.MathUtils.clamp((velY + 3.0) / 9.0, 0, 1);
    tPelvisY = 0.94;
    tPelvisRx = THREE.MathUtils.lerp(-0.1, -0.04, ascendBlend);
    tLSpineRx = -0.1;
    tUChestRx = -0.12;
    tNeckRx = 0.16;

    // Lead left knee high (70° = 1.22 rad flexion), trailing right leg extended cleanly
    tLHipRx = THREE.MathUtils.lerp(0.62, 0.88, ascendBlend);
    tLKneeRx = THREE.MathUtils.lerp(-0.95, -1.22, ascendBlend);
    tLAnkleRx = 0.15;

    tRHipRx = THREE.MathUtils.lerp(0.28, -0.35, ascendBlend);
    tRKneeRx = THREE.MathUtils.lerp(-0.55, -0.22, ascendBlend);
    tRAnkleRx = -0.18;

    // Flared arms for heroic mid-air silhouette (greatsword cleared safely outward)
    tLShRx = THREE.MathUtils.lerp(0.58, 0.82, ascendBlend);
    tLShRz = 0.42;
    tLElRx = 0.52;

    tRShRx = -0.24;
    tRShRz = -0.36;
    tRElRx = 0.45;
    tRWrRx = -0.68;
    tRWrRz = -0.22;
  } else if (moveFactor > 0.04) {
    const s = Math.sin(walkPhase);
    const c = Math.cos(walkPhase);

    // Double-frequency pelvis vertical bounce (0.06m walk, 0.09m sprint)
    const bobAmp = THREE.MathUtils.lerp(0.06, 0.088, sprintBlend);
    const bob = Math.abs(s) * bobAmp * moveFactor;
    tPelvisY = 0.94 + bob - landDip;

    // Torso forward lean: subtle 5° walk -> deep 26° (0.45 rad) sprint lean
    const forwardLean = THREE.MathUtils.lerp(0.09 * moveFactor, 0.45, sprintBlend);
    tLSpineRx = -forwardLean * 0.4 - landFrac * 0.18;
    tUChestRx = -forwardLean * 0.6 - landFrac * 0.16;
    tNeckRx = forwardLean * 0.72 + landFrac * 0.24; // Keep helm visor level with horizon

    // Opposite hip & shoulder counter-rotation (±10° = ±0.175 rad)
    const twistAmp = THREE.MathUtils.lerp(0.11 * moveFactor, 0.175, sprintBlend);
    tPelvisRy = -s * twistAmp * 0.45;
    tLSpineRy = s * twistAmp * 0.55;
    tUChestRy = s * twistAmp * 0.75;
    tNeckRy = -s * twistAmp * 0.45;
    tPelvisRz = c * 0.03 * moveFactor;

    // Leg stride: Walk up to 45° (-0.78 rad) knee flex; Sprint up to 85° (-1.48 rad) high-knee drive
    const hipAmp = THREE.MathUtils.lerp(0.56 * moveFactor, 0.92, sprintBlend);
    const kneeFlexPeak = THREE.MathUtils.lerp(0.78, 1.48, sprintBlend);
    const fwdHipBias = THREE.MathUtils.lerp(0.06, 0.14, sprintBlend);

    tLHipRx = fwdHipBias + s * hipAmp + landFrac * 0.42;
    tRHipRx = fwdHipBias - s * hipAmp + landFrac * 0.42;

    // Trailing-leg lift & forward-swing knee bend (strictly <= 0 anatomical flexion)
    const lSwing = Math.max(0, c); // peaks when left leg is swinging forward
    const rSwing = Math.max(0, -c);
    const lBackPush = Math.max(0, -s);
    const rBackPush = Math.max(0, s);

    tLKneeRx = -(0.12 + lSwing * kneeFlexPeak + lBackPush * 0.24 * moveFactor) - landFrac * 0.75;
    tRKneeRx = -(0.12 + rSwing * kneeFlexPeak + rBackPush * 0.24 * moveFactor) - landFrac * 0.75;

    tLAnkleRx = -tLHipRx * 0.28 - tLKneeRx * 0.22;
    tRAnkleRx = -tRHipRx * 0.28 - tRKneeRx * 0.22;

    // Left arm counter-swing + tighter sprint pump
    const lArmAmp = THREE.MathUtils.lerp(0.46 * moveFactor, 0.85, sprintBlend);
    tLShRx = -s * lArmAmp;
    tLElRx = THREE.MathUtils.lerp(0.32 + Math.max(0, -s) * 0.28, 1.18 + Math.max(0, -s) * 0.25, sprintBlend);
    tLShRz = THREE.MathUtils.lerp(0.14, 0.2, sprintBlend);

    // Right arm carries greatsword naturally on walk, tucks back cleanly during sprint to minimize drag
    const rWalkPump = s * 0.34 * moveFactor;
    const rSprintPump = s * 0.26;
    tRShRx = THREE.MathUtils.lerp(0.1 + rWalkPump, -0.44 + rSprintPump, sprintBlend);
    tRShRz = THREE.MathUtils.lerp(-0.16, -0.24, sprintBlend);
    tRElRx = THREE.MathUtils.lerp(0.44 + Math.max(0, s) * 0.16, 0.68, sprintBlend);
    tRWrRx = THREE.MathUtils.lerp(-0.56, -0.78, sprintBlend);
    tRWrRy = THREE.MathUtils.lerp(0.1, 0.28, sprintBlend);
    tRWrRz = THREE.MathUtils.lerp(-0.18, -0.26, sprintBlend);
  } else {
    // Weighted Combat Idle: rhythmic breathing, gentle weight shift, subtle helmet scan
    const breath = Math.sin(elapsed * 1.85);
    const sway = Math.sin(elapsed * 0.9);
    tPelvisY = 0.94 + breath * 0.012 - landDip;
    tLSpineRx = breath * 0.012 - landFrac * 0.18;
    tUChestRx = breath * 0.018 - landFrac * 0.16;
    tPelvisRz = sway * 0.012;
    tUChestRz = -sway * 0.012;
    tNeckRx = Math.sin(elapsed * 1.15) * 0.025 + landFrac * 0.24;
    tNeckRy = Math.sin(elapsed * 0.52) * 0.075;
    tHeadRy = Math.sin(elapsed * 0.52) * 0.04;

    tLShRx = 0.06 + breath * 0.025;
    tLShRz = 0.14 + breath * 0.015;
    tLElRx = 0.28 - breath * 0.02;

    tRShRx = 0.08 - breath * 0.02;
    tRShRy = -0.14;
    tRShRz = -0.24 - breath * 0.012;
    tRElRx = 0.36 + breath * 0.025;
    tRWrRx = -0.66;
    tRWrRy = 0.24;
    tRWrRz = -0.34;
  }

  // Blend in kneeling/resting pose at Bonfire or Site of Grace
  if (restBlend > 0.01) {
    const rb = restBlend;
    tPelvisY = THREE.MathUtils.lerp(tPelvisY, 0.54, rb);
    tPelvisRx = THREE.MathUtils.lerp(tPelvisRx, 0.08, rb);
    tPelvisRy = THREE.MathUtils.lerp(tPelvisRy, 0, rb);
    tPelvisRz = THREE.MathUtils.lerp(tPelvisRz, 0, rb);
    tLSpineRx = THREE.MathUtils.lerp(tLSpineRx, -0.12, rb);
    tUChestRx = THREE.MathUtils.lerp(tUChestRx, -0.16, rb);
    tNeckRx = THREE.MathUtils.lerp(tNeckRx, 0.22, rb);
    tNeckRy = THREE.MathUtils.lerp(tNeckRy, 0, rb);

    tLHipRx = THREE.MathUtils.lerp(tLHipRx, 1.25, rb);
    tLKneeRx = THREE.MathUtils.lerp(tLKneeRx, -1.42, rb);
    tLAnkleRx = THREE.MathUtils.lerp(tLAnkleRx, 0.16, rb);

    tRHipRx = THREE.MathUtils.lerp(tRHipRx, -0.32, rb);
    tRKneeRx = THREE.MathUtils.lerp(tRKneeRx, -1.35, rb);
    tRAnkleRx = THREE.MathUtils.lerp(tRAnkleRx, -0.25, rb);

    tLShRx = THREE.MathUtils.lerp(tLShRx, 0.52, rb);
    tLElRx = THREE.MathUtils.lerp(tLElRx, 0.65, rb);
    tRShRx = THREE.MathUtils.lerp(tRShRx, 0.44, rb);
    tRElRx = THREE.MathUtils.lerp(tRElRx, 0.72, rb);
  }

  // Frame-rate independent smooth damping across all 18 joints
  const dampRate = 14.5;
  pose.pelvisY = THREE.MathUtils.damp(pose.pelvisY, tPelvisY, dampRate, clampedDt);
  pose.pelvisRx = THREE.MathUtils.damp(pose.pelvisRx, tPelvisRx, dampRate, clampedDt);
  pose.pelvisRy = THREE.MathUtils.damp(pose.pelvisRy, tPelvisRy, dampRate, clampedDt);
  pose.pelvisRz = THREE.MathUtils.damp(pose.pelvisRz, tPelvisRz, dampRate, clampedDt);

  pose.lSpineRx = THREE.MathUtils.damp(pose.lSpineRx, tLSpineRx, dampRate, clampedDt);
  pose.lSpineRy = THREE.MathUtils.damp(pose.lSpineRy, tLSpineRy, dampRate, clampedDt);
  pose.lSpineRz = THREE.MathUtils.damp(pose.lSpineRz, tLSpineRz, dampRate, clampedDt);

  pose.uChestRx = THREE.MathUtils.damp(pose.uChestRx, tUChestRx, dampRate, clampedDt);
  pose.uChestRy = THREE.MathUtils.damp(pose.uChestRy, tUChestRy, dampRate, clampedDt);
  pose.uChestRz = THREE.MathUtils.damp(pose.uChestRz, tUChestRz, dampRate, clampedDt);

  pose.neckRx = THREE.MathUtils.damp(pose.neckRx, tNeckRx, dampRate, clampedDt);
  pose.neckRy = THREE.MathUtils.damp(pose.neckRy, tNeckRy, dampRate, clampedDt);
  pose.headRx = THREE.MathUtils.damp(pose.headRx, tHeadRx, dampRate, clampedDt);
  pose.headRy = THREE.MathUtils.damp(pose.headRy, tHeadRy, dampRate, clampedDt);

  pose.lShRx = THREE.MathUtils.damp(pose.lShRx, tLShRx, dampRate, clampedDt);
  pose.lShRy = THREE.MathUtils.damp(pose.lShRy, tLShRy, dampRate, clampedDt);
  pose.lShRz = THREE.MathUtils.damp(pose.lShRz, tLShRz, dampRate, clampedDt);
  pose.lElRx = THREE.MathUtils.damp(pose.lElRx, tLElRx, dampRate, clampedDt);
  pose.lWrRx = THREE.MathUtils.damp(pose.lWrRx, tLWrRx, dampRate, clampedDt);

  pose.rShRx = THREE.MathUtils.damp(pose.rShRx, tRShRx, dampRate, clampedDt);
  pose.rShRy = THREE.MathUtils.damp(pose.rShRy, tRShRy, dampRate, clampedDt);
  pose.rShRz = THREE.MathUtils.damp(pose.rShRz, tRShRz, dampRate, clampedDt);
  pose.rElRx = THREE.MathUtils.damp(pose.rElRx, tRElRx, dampRate, clampedDt);
  pose.rWrRx = THREE.MathUtils.damp(pose.rWrRx, tRWrRx, dampRate, clampedDt);
  pose.rWrRy = THREE.MathUtils.damp(pose.rWrRy, tRWrRy, dampRate, clampedDt);
  pose.rWrRz = THREE.MathUtils.damp(pose.rWrRz, tRWrRz, dampRate, clampedDt);

  pose.lHipRx = THREE.MathUtils.damp(pose.lHipRx, tLHipRx, dampRate, clampedDt);
  pose.lHipRz = THREE.MathUtils.damp(pose.lHipRz, tLHipRz, dampRate, clampedDt);
  pose.lKneeRx = THREE.MathUtils.damp(pose.lKneeRx, tLKneeRx, dampRate, clampedDt);
  pose.lAnkleRx = THREE.MathUtils.damp(pose.lAnkleRx, tLAnkleRx, dampRate, clampedDt);

  pose.rHipRx = THREE.MathUtils.damp(pose.rHipRx, tRHipRx, dampRate, clampedDt);
  pose.rHipRz = THREE.MathUtils.damp(pose.rHipRz, tRHipRz, dampRate, clampedDt);
  pose.rKneeRx = THREE.MathUtils.damp(pose.rKneeRx, tRKneeRx, dampRate, clampedDt);
  pose.rAnkleRx = THREE.MathUtils.damp(pose.rAnkleRx, tRAnkleRx, dampRate, clampedDt);

  rig.pelvisPivot.position.y = pose.pelvisY;
  rig.pelvisPivot.rotation.set(pose.pelvisRx, pose.pelvisRy, pose.pelvisRz);
  rig.lowerSpinePivot.rotation.set(pose.lSpineRx, pose.lSpineRy, pose.lSpineRz);
  rig.upperChestPivot.rotation.set(pose.uChestRx, pose.uChestRy, pose.uChestRz);
  rig.neckPivot.rotation.set(pose.neckRx, pose.neckRy, 0);
  rig.headGroup.rotation.set(pose.headRx, pose.headRy, 0);

  rig.leftShoulderPivot.rotation.set(pose.lShRx, pose.lShRy, pose.lShRz);
  rig.leftElbowPivot.rotation.set(pose.lElRx, 0, 0);
  rig.leftWristPivot.rotation.set(pose.lWrRx, 0, 0);

  rig.rightShoulderPivot.rotation.set(pose.rShRx, pose.rShRy, pose.rShRz);
  rig.rightElbowPivot.rotation.set(pose.rElRx, 0, 0);
  rig.rightWristPivot.rotation.set(pose.rWrRx, pose.rWrRy, pose.rWrRz);

  rig.leftHipPivot.rotation.set(pose.lHipRx, 0.06, pose.lHipRz);
  rig.leftKneePivot.rotation.set(pose.lKneeRx, 0, 0);
  rig.leftAnklePivot.rotation.set(pose.lAnkleRx, 0, 0);

  rig.rightHipPivot.rotation.set(pose.rHipRx, -0.06, pose.rHipRz);
  rig.rightKneePivot.rotation.set(pose.rKneeRx, 0, 0);
  rig.rightAnklePivot.rotation.set(pose.rAnkleRx, 0, 0);

  updateClothCapeVertices(
    rig,
    elapsed,
    speed,
    velY,
    grounded,
    false,
    0,
    isSprinting,
    restBlend,
  );
}
