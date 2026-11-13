import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WorldTextureBundle } from './textures';
import { WORLD, TOWER } from './terrainMath';
import { buildHinterland } from './buildHinterland';

export interface CitadelInteriorParams {
  scene: THREE.Object3D;
  citadelGroup: THREE.Group;
  textures: WorldTextureBundle;
  stoneMat: THREE.MeshStandardMaterial;
  flagstoneMat: THREE.MeshStandardMaterial;
  marbleMat: THREE.MeshStandardMaterial;
  gildedRoofMat: THREE.MeshStandardMaterial;
  cliffMat: THREE.MeshStandardMaterial;
  barkMat: THREE.MeshStandardMaterial;
  ironMat: THREE.MeshStandardMaterial;
  stainedGlassMat: THREE.MeshStandardMaterial;
  rayMat: THREE.ShaderMaterial;
  flameMat: THREE.MeshBasicMaterial;
  track: <T extends { dispose: () => void }>(item: T) => T;
  addWalkable: <T extends THREE.Object3D>(mesh: T) => T;
  indoorWalls: THREE.Object3D[];
  createArchShape: (width: number, height: number, thickness: number) => THREE.Shape;
  createPointedWindowShape: (w: number, h: number) => THREE.Shape;
}

export interface CitadelInteriorHandles {
  academyCastleGroup: THREE.Group;
  update: (elapsed: number, dt: number, playerZ: number, playerY: number, playerX?: number) => void;
}

function createCheckeredMarbleTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grid = 4;
    const tile = size / grid;
    let seed = 777;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    ctx.fillStyle = '#24211e';
    ctx.fillRect(0, 0, size, size);

    for (let gx = 0; gx < grid; gx++) {
      for (let gy = 0; gy < grid; gy++) {
        const isLight = (gx + gy) % 2 === 0;
        const px = gx * tile;
        const py = gy * tile;
        const tone = isLight ? 156 + Math.floor(rand() * 24) : 42 + Math.floor(rand() * 18);
        ctx.fillStyle = isLight
          ? `rgb(${tone + 10}, ${tone + 4}, ${tone - 8})`
          : `rgb(${tone}, ${tone - 2}, ${tone - 4})`;
        ctx.fillRect(px + 3, py + 3, tile - 6, tile - 6);

        ctx.strokeStyle = isLight ? 'rgba(65, 58, 50, 0.34)' : 'rgba(145, 130, 108, 0.22)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        let vx = px + 10 + rand() * (tile - 20);
        let vy = py + 10 + rand() * (tile - 20);
        ctx.moveTo(vx, vy);
        for (let s = 0; s < 3; s++) {
          vx += (rand() - 0.5) * 38;
          vy += (rand() - 0.5) * 38;
          ctx.lineTo(vx, vy);
        }
        ctx.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createPineNeedleTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#243627';
    ctx.fillRect(0, 0, size, size);
    let seed = 4321;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1600; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = 6 + rand() * 10;
      const ang = Math.PI * 0.5 + (rand() - 0.5) * 0.9;
      const g = 46 + Math.floor(rand() * 44);
      ctx.strokeStyle = `rgb(${Math.floor(g * 0.6)}, ${g}, ${Math.floor(g * 0.68)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSoftMistTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size * 0.48);
    grad.addColorStop(0, 'rgba(182, 206, 228, 0.52)');
    grad.addColorStop(0.45, 'rgba(164, 192, 218, 0.24)');
    grad.addColorStop(1, 'rgba(154, 180, 204, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCrimsonTapestryTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#4f1214');
    grad.addColorStop(0.55, '#68191b');
    grad.addColorStop(1, '#301112');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle woven fabric threads
    ctx.strokeStyle = 'rgba(20, 6, 6, 0.22)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Gold brocade borders & faded royal sun emblem
    ctx.strokeStyle = '#9c7838';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 20);
    ctx.strokeStyle = 'rgba(176, 138, 66, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.38, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.38 - 34);
    ctx.lineTo(w / 2, h * 0.38 + 34);
    ctx.moveTo(w / 2 - 30, h * 0.38);
    ctx.lineTo(w / 2 + 30, h * 0.38);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createStainedGlassTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ffd480');
    grad.addColorStop(0.45, '#e89c46');
    grad.addColorStop(1, '#8c4e24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Leaded glass lattice panes
    ctx.strokeStyle = '#241c18';
    ctx.lineWidth = 3;
    for (let x = 0; x <= w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 32) {
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x + 16, y);
        ctx.lineTo(x + 32, y + 16);
        ctx.lineTo(x + 16, y + 32);
        ctx.lineTo(x, y + 16);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function tileBoxUVs(
  geo: THREE.BoxGeometry,
  w: number,
  h: number,
  d: number,
  tileWorldSize = 5.5,
): THREE.BoxGeometry {
  const uv = geo.attributes.uv;
  const norm = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    let su = 1;
    let sv = 1;
    if (nx > 0.5) {
      su = d / tileWorldSize;
      sv = h / tileWorldSize;
    } else if (ny > 0.5) {
      su = w / tileWorldSize;
      sv = d / tileWorldSize;
    } else {
      su = w / tileWorldSize;
      sv = h / tileWorldSize;
    }
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Builds an annular sector slab in the XZ plane around (0, 0) using polar angles (x = r cos a, z = r sin a).
 */
function createAnnularSectorGeometry(
  rIn: number,
  rOut: number,
  startAng: number,
  endAng: number,
  thickness: number,
  segments = 36,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // Shape lives in 2D (sx, sy); after rotateX(Math.PI / 2): world x = sx, world z = sy, world y = -sz
  shape.moveTo(Math.cos(startAng) * rOut, Math.sin(startAng) * rOut);
  for (let i = 1; i <= segments; i++) {
    const a = startAng + (i / segments) * (endAng - startAng);
    shape.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
  }
  for (let i = segments; i >= 0; i--) {
    const a = startAng + (i / segments) * (endAng - startAng);
    shape.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  // Normalize UVs in world meters so marble & flagstone textures never stretch
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * 0.08, uv.getY(i) * 0.08);
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function buildCitadelInterior({
  scene,
  citadelGroup,
  textures,
  stoneMat,
  flagstoneMat,
  marbleMat,
  gildedRoofMat,
  cliffMat,
  barkMat,
  ironMat,
  stainedGlassMat,
  rayMat,
  flameMat,
  track,
  addWalkable,
  indoorWalls,
  createArchShape,
  createPointedWindowShape,
}: CitadelInteriorParams): CitadelInteriorHandles {
  const interiorGroup = new THREE.Group();
  citadelGroup.add(interiorGroup);

  const addIndoorWall = <T extends THREE.Object3D>(mesh: T): T => {
    indoorWalls.push(mesh);
    interiorGroup.add(mesh);
    return mesh;
  };

  const dummy = new THREE.Object3D();

  // Shared Interior & Hinterland Materials
  const checkeredMap = track(createCheckeredMarbleTexture());
  const checkeredMarbleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: checkeredMap,
      bumpMap: textures.darkMarble.bumpMap,
      bumpScale: 0.04,
      roughnessMap: textures.darkMarble.roughnessMap,
      roughness: 0.44,
      metalness: 0.14,
    }),
  );

  const crimsonTapestryTex = track(createCrimsonTapestryTexture());
  const crimsonBannerMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: crimsonTapestryTex,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
  );

  const leadedGlassTex = track(createStainedGlassTexture());
  const rotundaGlassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffd896,
      map: leadedGlassTex,
      emissive: new THREE.Color(0xd98b38),
      emissiveMap: leadedGlassTex,
      emissiveIntensity: 1.15,
      roughness: 0.35,
      metalness: 0.08,
    }),
  );

  const darkOakMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b281c,
      map: textures.bark.map,
      bumpMap: textures.bark.bumpMap,
      bumpScale: 0.06,
      roughness: 0.86,
      metalness: 0.04,
    }),
  );

  const dampMasonryMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x8d8e86,
      map: textures.mossyStone.map,
      bumpMap: textures.mossyStone.bumpMap,
      bumpScale: 0.08,
      roughnessMap: textures.mossyStone.roughnessMap,
      roughness: 0.76,
      metalness: 0.05,
    }),
  );

  const mossyPathMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x767c72,
      map: textures.flagstone.map,
      bumpMap: textures.flagstone.bumpMap,
      bumpScale: 0.07,
      roughnessMap: textures.flagstone.roughnessMap,
      roughness: 0.88,
      metalness: 0.04,
    }),
  );

  const bookTomeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.05,
    }),
  );

  const rustedSteelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x626870,
      roughness: 0.48,
      metalness: 0.72,
    }),
  );

  const shieldWoodMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4c3a2b,
      map: textures.bark.map,
      roughness: 0.76,
      metalness: 0.14,
    }),
  );

  const soulCyanMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x76f4ff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const arcaneSlateMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2c3b4c,
      map: textures.darkMarble.map,
      bumpMap: textures.darkMarble.bumpMap,
      bumpScale: 0.06,
      roughness: 0.52,
      metalness: 0.28,
    }),
  );

  const mushroomGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3ac9f0,
      emissive: new THREE.Color(0x28b7eb),
      emissiveIntensity: 1.55,
      roughness: 0.35,
      metalness: 0.05,
    }),
  );

  const buildStairFlight = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    yAtMaxZ: number,
    yAtMinZ: number,
    steps: number,
    mat: THREE.Material,
  ) => {
    const width = maxX - minX;
    const len = maxZ - minZ;
    const stepDepth = (len / steps) * 1.18;
    const stepRise = Math.abs(yAtMaxZ - yAtMinZ) / steps;
    const thickness = Math.max(0.45, stepRise + 0.18);
    const geo = track(new THREE.BoxGeometry(width, thickness, stepDepth));
    const mesh = addWalkable(new THREE.InstancedMesh(geo, mat, steps));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const z = THREE.MathUtils.lerp(maxZ, minZ, t);
      const y = THREE.MathUtils.lerp(yAtMaxZ, yAtMinZ, t) - thickness * 0.5;
      dummy.position.set((minX + maxX) * 0.5, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    interiorGroup.add(mesh);
    return mesh;
  };

  // =========================================================================
  // PART 1: 3-TIER VERTICAL SPIRAL TOWER INSIDE CITADEL OF FALLEN GOLD
  // Center = (0, -246), Inner Wall Radius = 17.5m, Central Shaft Radius = 7.2m
  // =========================================================================
  const tCx = TOWER.cx;
  const tCz = TOWER.cz;
  const t1Y = TOWER.tier1Y;
  const t2Y = TOWER.tier2Y;
  const t3Y = TOWER.tier3Y;

  // 1A. Outer Open Double Gates & Grand Entry Vestibule (z = -208..-231, y = 18.0)
  const thresholdFloor = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(15.2, 1.2, 23.5)), checkeredMarbleMat),
  );
  thresholdFloor.position.set(0, t1Y - 0.6, -219.2);
  thresholdFloor.receiveShadow = true;
  interiorGroup.add(thresholdFloor);

  for (const side of [-1, 1]) {
    const vestWall = new THREE.Mesh(
      track(tileBoxUVs(new THREE.BoxGeometry(2.6, 28, 22), 2.6, 28, 22)),
      stoneMat,
    );
    vestWall.position.set(side * 8.6, t1Y + 13.5, -220.0);
    addIndoorWall(vestWall);

    // Open heavy carved oak & iron double gates swung wide open flanking vestibule
    const gateLeaf = new THREE.Group();
    gateLeaf.position.set(side * 6.8, t1Y, -211.0);
    gateLeaf.rotation.y = -side * 0.14;
    interiorGroup.add(gateLeaf);

    const panel = new THREE.Mesh(track(new THREE.BoxGeometry(0.58, 16.5, 6.4)), darkOakMat);
    panel.position.set(-side * 0.2, 8.25, -3.2);
    panel.castShadow = true;
    panel.receiveShadow = true;
    gateLeaf.add(panel);

    for (const sy of [2.5, 6.8, 11.4, 15.0]) {
      const band = new THREE.Mesh(track(new THREE.BoxGeometry(0.72, 0.45, 6.48)), ironMat);
      band.position.set(-side * 0.2, sy, -3.2);
      gateLeaf.add(band);
    }
    const hingeRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.48, 0.09, 6, 14)), ironMat);
    hingeRing.position.set(-side * 0.6, 5.2, -5.0);
    hingeRing.rotation.y = Math.PI / 2;
    gateLeaf.add(hingeRing);
  }
  const vestCeiling = new THREE.Mesh(track(new THREE.BoxGeometry(18, 3.0, 22)), stoneMat);
  vestCeiling.position.set(0, t1Y + 26.5, -220.0);
  addIndoorWall(vestCeiling);

  // 1B. Hollow Cylindrical Gothic Tower Drum (24 masonry segments at r = 18.9, y = -12 -> +46)
  const drumSegments = 24;
  const segWidth = (2 * Math.PI * 19.0) / drumSegments + 0.55;
  const addDrumPanel = (cx: number, cz: number, ry: number, yMin: number, yMax: number, mat: THREE.Material) => {
    const h = yMax - yMin;
    if (h <= 0.5) return;
    const panel = new THREE.Mesh(
      track(tileBoxUVs(new THREE.BoxGeometry(segWidth, h, 2.8), segWidth, h, 2.8)),
      mat,
    );
    panel.position.set(cx, (yMin + yMax) * 0.5, cz);
    panel.rotation.y = ry;
    panel.receiveShadow = true;
    panel.castShadow = true;
    addIndoorWall(panel);
  };

  for (let i = 0; i < drumSegments; i++) {
    const a = (i / drumSegments) * Math.PI * 2;
    const wx = tCx + Math.cos(a) * 18.9;
    const wz = tCz + Math.sin(a) * 18.9;
    const ry = -a + Math.PI / 2;
    const normA = Math.atan2(Math.sin(a), Math.cos(a));

    const isSouthEntry = Math.abs(normA - Math.PI / 2) < 0.38;
    const isNorthExit = Math.abs(normA + Math.PI / 2) < 0.38;
    const isWestChapel = Math.abs(Math.abs(normA) - Math.PI) < 0.30;

    if (isSouthEntry) {
      addDrumPanel(wx, wz, ry, -12, t1Y, dampMasonryMat);
      addDrumPanel(wx, wz, ry, t1Y + 19.5, 46, stoneMat);
    } else if (isNorthExit) {
      addDrumPanel(wx, wz, ry, 1.5, 46, stoneMat);
    } else if (isWestChapel) {
      addDrumPanel(wx, wz, ry, -12, t2Y, dampMasonryMat);
      addDrumPanel(wx, wz, ry, t2Y + 9.5, 46, stoneMat);
    } else {
      addDrumPanel(wx, wz, ry, -12, 11, dampMasonryMat);
      addDrumPanel(wx, wz, ry, 11, 46, stoneMat);
    }

    // Internal Gothic Wall Buttress Ribs rising the full 56m shaft height
    if (!isSouthEntry && !isNorthExit && !isWestChapel && i % 2 === 0) {
      const rib = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 56, 1.15)), marbleMat);
      rib.position.set(tCx + Math.cos(a) * 17.4, 17, tCz + Math.sin(a) * 17.4);
      rib.rotation.y = ry;
      interiorGroup.add(rib);
    }
  }

  // Vaulted Tower Ceiling Dome & Star Ribbing above the Shaft (y = 45.5)
  const towerRoofCap = new THREE.Mesh(
    track(new THREE.CylinderGeometry(20.6, 20.6, 2.8, 24)),
    stoneMat,
  );
  towerRoofCap.position.set(tCx, 46.8, tCz);
  addIndoorWall(towerRoofCap);

  // Glowing golden oculus ring high above the 28m central shaft
  const oculusRim = new THREE.Mesh(track(new THREE.TorusGeometry(6.8, 0.7, 8, 24)), marbleMat);
  oculusRim.rotation.x = Math.PI / 2;
  oculusRim.position.set(tCx, 45.2, tCz);
  interiorGroup.add(oculusRim);

  const oculusGlow = new THREE.Mesh(track(new THREE.CircleGeometry(6.4, 24)), stainedGlassMat);
  oculusGlow.rotation.x = Math.PI / 2;
  oculusGlow.position.set(tCx, 45.3, tCz);
  interiorGroup.add(oculusGlow);

  for (let r = 0; r < 6; r++) {
    const beam = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 1.4, 36.0)), marbleMat);
    beam.position.set(tCx, 44.8, tCz);
    beam.rotation.y = (r / 6) * Math.PI;
    interiorGroup.add(beam);
  }

  // =========================================================================
  // 1C. TIER 1 (y = 18.0): THE SOVEREIGN'S ROTUNDA
  // =========================================================================
  // Inner shaft ring (full 360deg, r: 7.0..11.3)
  const t1InnerRing = addWalkable(
    new THREE.Mesh(
      track(createAnnularSectorGeometry(7.0, 11.35, 0, Math.PI * 2, 0.75, 40)),
      checkeredMarbleMat,
    ),
  );
  t1InnerRing.position.set(tCx, t1Y, tCz);
  t1InnerRing.receiveShadow = true;
  interiorGroup.add(t1InnerRing);

  // Outer gallery ring (r: 11.15..17.65), notched cleanly for Flight 1 stairwell [-1.22..0.65]
  const t1OuterRing = addWalkable(
    new THREE.Mesh(
      track(
        createAnnularSectorGeometry(
          11.1,
          17.7,
          TOWER.f1CutoutMaxAng,
          TOWER.f1CutoutMinAng + Math.PI * 2,
          0.75,
          36,
        ),
      ),
      checkeredMarbleMat,
    ),
  );
  t1OuterRing.position.set(tCx, t1Y, tCz);
  t1OuterRing.receiveShadow = true;
  interiorGroup.add(t1OuterRing);

  // Carved Stone Shaft Balustrade along r = 7.2 on Tier 1 & Tier 2
  const buildRingBalustrade = (
    radius: number,
    startA: number,
    endA: number,
    yBase: number,
    postCount: number,
  ) => {
    const postGeo = track(new THREE.BoxGeometry(0.42, 1.08, 0.42));
    const railLen = ((Math.abs(endA - startA) * radius) / postCount) * 1.08;
    const railGeo = track(new THREE.BoxGeometry(railLen, 0.24, 0.5));
    const posts = new THREE.InstancedMesh(postGeo, marbleMat, postCount);
    const rails = new THREE.InstancedMesh(railGeo, stoneMat, postCount);
    posts.castShadow = true;
    rails.castShadow = true;
    for (let i = 0; i < postCount; i++) {
      const a = startA + ((i + 0.5) / postCount) * (endA - startA);
      const px = tCx + Math.cos(a) * radius;
      const pz = tCz + Math.sin(a) * radius;
      dummy.position.set(px, yBase + 0.54, pz);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);

      dummy.position.set(px, yBase + 1.06, pz);
      dummy.rotation.set(0, -a + Math.PI / 2, 0);
      dummy.updateMatrix();
      rails.setMatrixAt(i, dummy.matrix);
    }
    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    posts.computeBoundingSphere();
    rails.computeBoundingSphere();
    interiorGroup.add(posts, rails);
  };

  buildRingBalustrade(TOWER.shaftRadius, 0, Math.PI * 2, t1Y, 28);
  buildRingBalustrade(TOWER.shaftRadius, 0, Math.PI * 2, t2Y, 28);

  // Radial Stone Parapet Wall closing Tier 1 North edge of Flight 1 stairwell (ang = -1.22)
  const buildRadialParapet = (ang: number, yBase: number) => {
    const rMid = (TOWER.stairInnerRadius + TOWER.wallRadius) * 0.5;
    const par = new THREE.Mesh(track(new THREE.BoxGeometry(6.4, 1.25, 0.55)), marbleMat);
    par.position.set(tCx + Math.cos(ang) * rMid, yBase + 0.62, tCz + Math.sin(ang) * rMid);
    par.rotation.y = -ang;
    interiorGroup.add(par);
  };
  buildRadialParapet(TOWER.f1CutoutMinAng, t1Y);
  buildRadialParapet(TOWER.f2CutoutMinAng, t2Y);

  // Towering Gothic Columns around Tier 1 Ring (r = 13.8, matching getWorldColliders)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const normA = Math.atan2(Math.sin(a), Math.cos(a));
    if (normA >= -1.35 && normA <= 0.78) continue;
    if (Math.abs(normA - Math.PI / 2) < 0.55) continue;
    if (Math.abs(normA + Math.PI / 2) < 0.48) continue;

    const col = new THREE.Group();
    col.position.set(tCx + Math.cos(a) * 13.8, t1Y, tCz + Math.sin(a) * 13.8);
    interiorGroup.add(col);

    const plinth = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 1.2, 2.1)), marbleMat);
    plinth.position.y = 0.6;
    col.add(plinth);

    const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.75, 0.9, 24.5, 10)), stoneMat);
    shaft.position.y = 13.4;
    shaft.castShadow = true;
    col.add(shaft);

    const cap = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 1.0, 2.2)), marbleMat);
    cap.position.y = 25.8;
    col.add(cap);
  }

  // Tall Warm-Amber Leaded Stained-Glass Clerestory Windows, Iron Mullions & Slanting Sunbeams
  const rotundaWinGeo = track(new THREE.ShapeGeometry(createPointedWindowShape(3.2, 12.2)));
  // Normalize shape UVs to [0..1] for leaded stained glass texture
  const rwUv = rotundaWinGeo.attributes.uv;
  for (let i = 0; i < rwUv.count; i++) {
    rwUv.setXY(i, (rwUv.getX(i) + 1.6) / 3.2, rwUv.getY(i) / 12.2);
  }
  rwUv.needsUpdate = true;

  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    const normA = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(normA - Math.PI / 2) < 0.35) continue; // skip south entrance portal
    const winGroup = new THREE.Group();
    winGroup.position.set(tCx + Math.cos(a) * 17.25, t1Y + 8.8, tCz + Math.sin(a) * 17.25);
    winGroup.rotation.y = -a - Math.PI / 2;
    interiorGroup.add(winGroup);

    const winMesh = new THREE.Mesh(rotundaWinGeo, rotundaGlassMat);
    winGroup.add(winMesh);

    // Dark iron Gothic mullions & frame mullions across window
    for (const mx of [-1.52, -0.52, 0.52, 1.52]) {
      const bar = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 10.2, 0.22)), ironMat);
      bar.position.set(mx, 5.1, 0.1);
      winGroup.add(bar);
    }
    for (const my of [0.1, 3.6, 7.2, 9.8]) {
      const trans = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.16, 0.22)), ironMat);
      trans.position.set(0, my, 0.1);
      winGroup.add(trans);
    }

    if (i % 2 === 0) {
      const beam = new THREE.Mesh(track(new THREE.PlaneGeometry(4.8, 32.0)), rayMat);
      beam.position.set(tCx + Math.cos(a) * 6.5, t1Y + 4.0, tCz + Math.sin(a) * 6.5);
      beam.rotation.set(0.18, -a + Math.PI / 2, 0.48);
      interiorGroup.add(beam);
    }
  }

  // Tattered Crimson Tapestry Banners hung high along the upper gallery clerestory (never blocking walkways!)
  const bannerShape = new THREE.Shape();
  bannerShape.moveTo(-0.95, 0);
  bannerShape.lineTo(0.95, 0);
  bannerShape.lineTo(0.95, -6.8);
  bannerShape.lineTo(0.45, -7.8);
  bannerShape.lineTo(0.0, -6.5);
  bannerShape.lineTo(-0.48, -7.7);
  bannerShape.lineTo(-0.95, -6.7);
  bannerShape.closePath();
  const bannerClothGeo = track(new THREE.ShapeGeometry(bannerShape));
  const bUv = bannerClothGeo.attributes.uv;
  for (let i = 0; i < bUv.count; i++) {
    bUv.setXY(i, (bUv.getX(i) + 0.95) / 1.9, (bUv.getY(i) + 7.8) / 7.8);
  }
  bUv.needsUpdate = true;

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.18;
    const normA = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(normA - Math.PI / 2) < 0.35) continue;
    const banner = new THREE.Group();
    banner.position.set(tCx + Math.cos(a) * 16.3, t1Y + 18.2, tCz + Math.sin(a) * 16.3);
    banner.rotation.y = -a - Math.PI / 2;
    interiorGroup.add(banner);

    const rod = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.08, 2.35, 6)), gildedRoofMat);
    rod.rotation.z = Math.PI / 2;
    banner.add(rod);

    const cloth = new THREE.Mesh(bannerClothGeo, crimsonBannerMat);
    banner.add(cloth);
  }

  // Giant Royal Library Bookshelves around Tier 1 outer wall bays + InstancedMesh Ancient Tomes
  const shelfBaysAng = [1.05, 2.25, 2.75, -2.75, -2.25];
  const shelfRows: Array<{ x: number; y: number; z: number; ry: number }> = [];
  for (const sa of shelfBaysAng) {
    const bx = tCx + Math.cos(sa) * 16.2;
    const bz = tCz + Math.sin(sa) * 16.2;
    const ry = -sa - Math.PI / 2;

    const caseGroup = new THREE.Group();
    caseGroup.position.set(bx, t1Y, bz);
    caseGroup.rotation.y = ry;
    interiorGroup.add(caseGroup);

    const back = new THREE.Mesh(track(new THREE.BoxGeometry(5.2, 8.2, 0.35)), darkOakMat);
    back.position.set(0, 4.1, -0.65);
    caseGroup.add(back);

    for (const px of [-2.45, 0, 2.45]) {
      const post = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 8.4, 1.3)), darkOakMat);
      post.position.set(px, 4.2, 0);
      caseGroup.add(post);
    }

    const crown = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 0.45, 1.55)), marbleMat);
    crown.position.set(0, 8.5, 0);
    caseGroup.add(crown);

    for (let sy = 0.65; sy <= 7.1; sy += 1.55) {
      const plank = new THREE.Mesh(track(new THREE.BoxGeometry(5.0, 0.14, 1.25)), darkOakMat);
      plank.position.set(0, sy, 0);
      caseGroup.add(plank);
      shelfRows.push({ x: bx, y: t1Y + sy + 0.08, z: bz, ry });
    }
  }

  const booksPerRow = 8;
  const tomeGeo = track(new THREE.BoxGeometry(0.18, 0.78, 0.44));
  tomeGeo.translate(0, 0.39, 0);
  const tomeMesh = new THREE.InstancedMesh(tomeGeo, bookTomeMat, shelfRows.length * booksPerRow);
  const tomeColor = new THREE.Color();
  const tomePalette = [0x6e2320, 0x8a5b29, 0x3b4856, 0x4b382a, 0x733c24, 0x2f2a27];
  let tIdx = 0;
  shelfRows.forEach((sr, sIdx) => {
    const cosR = Math.cos(sr.ry);
    const sinR = Math.sin(sr.ry);
    for (let b = 0; b < booksPerRow; b++) {
      const lx = -2.0 + b * 0.56;
      const wx = sr.x + lx * cosR;
      const wz = sr.z - lx * sinR;
      dummy.position.set(wx, sr.y, wz);
      dummy.rotation.set(0, sr.ry, (sIdx + b) % 7 === 0 ? 0.14 : 0);
      dummy.scale.set(0.9 + ((b * 3) % 3) * 0.1, 0.8 + ((sIdx + b) % 4) * 0.12, 0.9);
      dummy.updateMatrix();
      tomeMesh.setMatrixAt(tIdx, dummy.matrix);
      tomeColor.setHex(tomePalette[(sIdx * 5 + b * 3) % tomePalette.length]);
      tomeMesh.setColorAt(tIdx, tomeColor);
      tIdx++;
    }
  });
  tomeMesh.instanceMatrix.needsUpdate = true;
  if (tomeMesh.instanceColor) tomeMesh.instanceColor.needsUpdate = true;
  tomeMesh.computeBoundingSphere();
  interiorGroup.add(tomeMesh);

  // Empty Weathered Stone Throne overlooking the Central Shaft from North Dais (z = -261.2)
  const daisDeck = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(8.4, 0.7, 5.2)), marbleMat),
  );
  daisDeck.position.set(0, t1Y + 0.28, -261.2);
  daisDeck.receiveShadow = true;
  interiorGroup.add(daisDeck);

  for (let s = 0; s < 3; s++) {
    const t = (s + 0.5) / 3;
    const step = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(8.4, 0.24, 0.8)), marbleMat));
    step.position.set(0, t1Y + t * 0.6 - 0.1, -257.2 - t * 1.8);
    interiorGroup.add(step);
  }

  const throneGroup = new THREE.Group();
  throneGroup.position.set(0, t1Y + 0.62, -261.2);
  interiorGroup.add(throneGroup);

  const tSeat = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 0.85, 1.85)), marbleMat);
  tSeat.position.set(0, 0.42, 0);
  throneGroup.add(tSeat);
  const tBack = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 4.6, 0.55)), marbleMat);
  tBack.position.set(0, 2.3, -0.75);
  throneGroup.add(tBack);
  const tReredos = new THREE.Mesh(track(new THREE.BoxGeometry(4.6, 6.2, 0.75)), stoneMat);
  tReredos.position.set(0, 3.1, -1.45);
  throneGroup.add(tReredos);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 1.35, 1.9)), marbleMat);
    arm.position.set(side * 1.0, 0.9, 0.05);
    throneGroup.add(arm);
    const finial = new THREE.Mesh(track(new THREE.ConeGeometry(0.26, 0.95, 4)), ironMat);
    finial.position.set(side * 1.0, 4.95, -0.75);
    throneGroup.add(finial);
  }
  const tCrest = new THREE.Mesh(track(new THREE.ConeGeometry(0.58, 1.25, 4)), ironMat);
  tCrest.position.set(0, 5.15, -0.75);
  tCrest.rotation.y = Math.PI / 4;
  throneGroup.add(tCrest);

  // Floating golden dust motes inside the sunlit upper shaft
  const naveDustCount = 260;
  const naveDustPos = new Float32Array(naveDustCount * 3);
  const naveDustPhase = new Float32Array(naveDustCount);
  for (let i = 0; i < naveDustCount; i++) {
    const a = ((i * 137) % 360) * (Math.PI / 180);
    const rad = 2.0 + (((i * 43) % 100) / 100) * 14.0;
    naveDustPos[i * 3] = tCx + Math.cos(a) * rad;
    naveDustPos[i * 3 + 1] = t2Y + 2.0 + (((i * 41) % 100) / 100) * 32.0;
    naveDustPos[i * 3 + 2] = tCz + Math.sin(a) * rad;
    naveDustPhase[i] = i * 0.37;
  }
  const naveDustGeo = track(new THREE.BufferGeometry());
  naveDustGeo.setAttribute('position', new THREE.BufferAttribute(naveDustPos, 3));
  const naveDustMat = track(
    new THREE.PointsMaterial({
      size: 0.28,
      map: textures.glowSprite,
      color: 0xffdf99,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  interiorGroup.add(new THREE.Points(naveDustGeo, naveDustMat));

  // =========================================================================
  // 1D. THE MONUMENTAL SPIRAL STAIRCASE (Flight 1: 18->4, Flight 2: 4->-10)
  // =========================================================================
  const torchFlames: THREE.Mesh[] = [];
  const sconceBracketGeo = track(new THREE.BoxGeometry(0.16, 0.16, 0.65));
  const sconceBowlGeo = track(new THREE.CylinderGeometry(0.24, 0.11, 0.32, 7));
  const sconceFlameGeo = track(new THREE.ConeGeometry(0.2, 0.62, 6));

  const addWallTorch = (wx: number, wy: number, wz: number, ry: number) => {
    const tg = new THREE.Group();
    tg.position.set(wx, wy, wz);
    tg.rotation.y = ry;
    interiorGroup.add(tg);

    const arm = new THREE.Mesh(sconceBracketGeo, ironMat);
    arm.position.set(0, 0, 0.28);
    tg.add(arm);

    const bowl = new THREE.Mesh(sconceBowlGeo, ironMat);
    bowl.position.set(0, 0.18, 0.56);
    tg.add(bowl);

    const fl = new THREE.Mesh(sconceFlameGeo, flameMat);
    fl.position.set(0, 0.62, 0.56);
    tg.add(fl);
    torchFlames.push(fl);
  };

  const buildSpiralFlight = (
    thetaStart: number,
    thetaEnd: number,
    yStart: number,
    yEnd: number,
    steps: number,
    wedgeStartAng: number,
    wedgeEndAng: number,
    wedgeFloorY: number,
  ) => {
    const rIn = TOWER.stairInnerRadius;
    const rOut = TOWER.wallRadius;
    const rMid = (rIn + rOut) * 0.5;
    const radialWidth = rOut - rIn + 0.35;
    const totalArc = Math.abs(thetaEnd - thetaStart);
    const treadDepth = (totalArc * rOut) / steps + 0.32;
    const treadThick = 0.72;

    const treadGeo = track(new THREE.BoxGeometry(radialWidth, treadThick, treadDepth));
    const treads = addWalkable(new THREE.InstancedMesh(treadGeo, flagstoneMat, steps));
    treads.castShadow = true;
    treads.receiveShadow = true;

    const balPostGeo = track(new THREE.BoxGeometry(0.38, 1.15, 0.38));
    const balPosts = new THREE.InstancedMesh(balPostGeo, marbleMat, Math.ceil(steps / 2));
    const railStepGeo = track(
      new THREE.BoxGeometry(0.44, 0.24, (totalArc * rIn) / Math.ceil(steps / 2) + 0.3),
    );
    const balRails = new THREE.InstancedMesh(railStepGeo, stoneMat, Math.ceil(steps / 2));

    let bIdx = 0;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const theta = thetaStart + t * (thetaEnd - thetaStart);
      const sy = THREE.MathUtils.lerp(yStart, yEnd, t) - treadThick * 0.5;
      const sx = tCx + Math.cos(theta) * rMid;
      const sz = tCz + Math.sin(theta) * rMid;

      dummy.position.set(sx, sy, sz);
      dummy.rotation.set(0, -theta, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      treads.setMatrixAt(i, dummy.matrix);

      if (i % 2 === 0 && bIdx < balPosts.count) {
        const bx = tCx + Math.cos(theta) * rIn;
        const bz = tCz + Math.sin(theta) * rIn;
        const topY = THREE.MathUtils.lerp(yStart, yEnd, t);
        dummy.position.set(bx, topY + 0.55, bz);
        dummy.rotation.set(0, -theta, 0);
        dummy.updateMatrix();
        balPosts.setMatrixAt(bIdx, dummy.matrix);

        dummy.position.set(bx, topY + 1.12, bz);
        dummy.rotation.set(0.16, -theta, 0);
        dummy.updateMatrix();
        balRails.setMatrixAt(bIdx, dummy.matrix);
        bIdx++;
      }

      if (i % 9 === 4) {
        const tx = tCx + Math.cos(theta) * (rOut - 0.15);
        const tz = tCz + Math.sin(theta) * (rOut - 0.15);
        const ty = THREE.MathUtils.lerp(yStart, yEnd, t) + 3.2;
        addWallTorch(tx, ty, tz, -theta - Math.PI / 2);
      }
    }
    treads.instanceMatrix.needsUpdate = true;
    treads.computeBoundingBox();
    treads.computeBoundingSphere();
    balPosts.instanceMatrix.needsUpdate = true;
    balRails.instanceMatrix.needsUpdate = true;
    balPosts.computeBoundingSphere();
    balRails.computeBoundingSphere();
    interiorGroup.add(treads, balPosts, balRails);

    // Solid stepped masonry under-wedge supporting the bottom 4m of the spiral flight cleanly
    const wedgeCount = 14;
    const wedgeGeo = track(new THREE.BoxGeometry(radialWidth - 0.2, 4.2, 1.35));
    const wedgeMesh = new THREE.InstancedMesh(wedgeGeo, dampMasonryMat, wedgeCount);
    for (let i = 0; i < wedgeCount; i++) {
      const wt = (i + 0.5) / wedgeCount;
      const wa = THREE.MathUtils.lerp(wedgeStartAng, wedgeEndAng, wt);
      const wy = wedgeFloorY + wt * 2.0;
      dummy.position.set(tCx + Math.cos(wa) * rMid, wy, tCz + Math.sin(wa) * rMid);
      dummy.rotation.set(0, -wa, 0);
      dummy.scale.set(1, wt * 0.88 + 0.12, 1);
      dummy.updateMatrix();
      wedgeMesh.setMatrixAt(i, dummy.matrix);
    }
    wedgeMesh.instanceMatrix.needsUpdate = true;
    wedgeMesh.computeBoundingSphere();
    interiorGroup.add(wedgeMesh);
  };

  // Flight 1: Tier 1 (18.0) -> Tier 2 (4.0)
  buildSpiralFlight(
    TOWER.f1StartAng,
    TOWER.f1EndAng,
    t1Y,
    t2Y,
    68,
    TOWER.f1StartAng + 0.12,
    2.55,
    t2Y,
  );

  // Flight 2: Tier 2 (4.0) -> Tier 3 (-10.0)
  buildSpiralFlight(
    TOWER.f2StartAng,
    TOWER.f2EndAng,
    t2Y,
    t3Y,
    76,
    -1.15,
    0.9,
    t3Y,
  );

  // =========================================================================
  // 1E. TIER 2 (y = 4.0): THE ASHEN CLOISTER & ARMORY GALLERY
  // =========================================================================
  // Inner shaft ring (full 360deg, r: 7.0..11.35)
  const t2InnerRing = addWalkable(
    new THREE.Mesh(
      track(createAnnularSectorGeometry(7.0, 11.35, 0, Math.PI * 2, 0.75, 40)),
      flagstoneMat,
    ),
  );
  t2InnerRing.position.set(tCx, t2Y, tCz);
  t2InnerRing.receiveShadow = true;
  interiorGroup.add(t2InnerRing);

  // Outer gallery ring (r: 11.1..17.7), notched cleanly for Flight 2 stairwell [-2.48..-0.35]
  const t2OuterRing = addWalkable(
    new THREE.Mesh(
      track(
        createAnnularSectorGeometry(
          11.1,
          17.7,
          TOWER.f2CutoutMaxAng,
          TOWER.f2CutoutMinAng + Math.PI * 2,
          0.75,
          36,
        ),
      ),
      flagstoneMat,
    ),
  );
  t2OuterRing.position.set(tCx, t2Y, tCz);
  t2OuterRing.receiveShadow = true;
  interiorGroup.add(t2OuterRing);

  // Vaulted West Ashen Cloister & Bonfire Chapel Alcove (x: -21.5..-14.0, z: -251.5..-240.5)
  const chapelFloor = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(8.2, 0.85, 11.2)), flagstoneMat),
  );
  chapelFloor.position.set(-17.8, t2Y - 0.425, tCz);
  chapelFloor.receiveShadow = true;
  interiorGroup.add(chapelFloor);

  const chapelBackWall = new THREE.Mesh(
    track(tileBoxUVs(new THREE.BoxGeometry(2.0, 11.5, 12.2), 2.0, 11.5, 12.2)),
    dampMasonryMat,
  );
  chapelBackWall.position.set(-22.2, t2Y + 5.2, tCz);
  addIndoorWall(chapelBackWall);

  for (const side of [-1, 1]) {
    const cSideWall = new THREE.Mesh(
      track(tileBoxUVs(new THREE.BoxGeometry(8.4, 11.5, 1.8), 8.4, 11.5, 1.8)),
      dampMasonryMat,
    );
    cSideWall.position.set(-18.2, t2Y + 5.2, tCz + side * 5.9);
    addIndoorWall(cSideWall);
  }
  const chapelCeiling = new THREE.Mesh(
    track(tileBoxUVs(new THREE.BoxGeometry(8.8, 1.8, 12.6), 8.8, 1.8, 12.6)),
    dampMasonryMat,
  );
  chapelCeiling.position.set(-18.0, t2Y + 10.2, tCz);
  addIndoorWall(chapelCeiling);

  // Tier 2 Bonfire / Site of Grace inside the West Ashen Cloister Chapel (-16.2, 4.0, -246)
  const clBonfire = new THREE.Group();
  clBonfire.position.set(-16.2, t2Y, tCz);
  interiorGroup.add(clBonfire);

  const clAsh = new THREE.Mesh(
    track(new THREE.ConeGeometry(1.15, 0.48, 10)),
    track(new THREE.MeshStandardMaterial({ color: 0x241f1c, roughness: 0.96, metalness: 0.02 })),
  );
  clAsh.position.y = 0.22;
  clBonfire.add(clAsh);

  const clEmber = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.42, 10, 8)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xff6a1a,
        emissive: new THREE.Color(0xff5500),
        emissiveIntensity: 2.2,
        roughness: 0.4,
      }),
    ),
  );
  clEmber.scale.set(1.25, 0.4, 1.25);
  clEmber.position.y = 0.36;
  clBonfire.add(clEmber);

  const clLogGeo = track(new THREE.CylinderGeometry(0.08, 0.11, 1.05, 6));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const log = new THREE.Mesh(clLogGeo, barkMat);
    log.position.set(Math.cos(a) * 0.44, 0.24, Math.sin(a) * 0.44);
    log.rotation.z = Math.PI / 2 - 0.35;
    log.rotation.y = a;
    clBonfire.add(log);
  }

  const clSword = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 1.72, 0.035)), rustedSteelMat);
  clSword.position.set(0, 1.05, 0);
  clSword.rotation.z = 0.1;
  clBonfire.add(clSword);

  const clGuard = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.07, 0.08)), ironMat);
  clGuard.position.set(-0.05, 1.52, 0);
  clGuard.rotation.z = 0.1;
  clBonfire.add(clGuard);

  const clFlames: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const fc = new THREE.Mesh(track(new THREE.ConeGeometry(0.26 - i * 0.05, 0.86 - i * 0.12, 7)), flameMat);
    fc.position.set((i - 1) * 0.1, 0.64 + i * 0.08, (i % 2 === 0 ? 1 : -1) * 0.07);
    clBonfire.add(fc);
    clFlames.push(fc);
  }

  // Silent Stone Knight Statues flanking West Chapel & NW/SW Tier 2 Gallery (matching getWorldColliders)
  const statueSpecs: Array<[number, number, number]> = [
    [-19.5, tCz - 3.6, Math.PI / 2],
    [-19.5, tCz + 3.6, Math.PI / 2],
    [Math.cos(Math.PI * 0.85) * 14.2, tCz + Math.sin(Math.PI * 0.85) * 14.2, -0.35],
    [Math.cos(-Math.PI * 0.85) * 14.2, tCz + Math.sin(-Math.PI * 0.85) * 14.2, 0.35 - Math.PI],
  ];
  for (const [sx, sz, sry] of statueSpecs) {
    const sg = new THREE.Group();
    sg.position.set(sx, t2Y, sz);
    sg.rotation.y = sry;
    interiorGroup.add(sg);

    const plinth = new THREE.Mesh(track(new THREE.BoxGeometry(1.65, 1.2, 1.65)), marbleMat);
    plinth.position.y = 0.6;
    sg.add(plinth);
    const legs = new THREE.Mesh(track(new THREE.CylinderGeometry(0.38, 0.46, 1.1, 8)), stoneMat);
    legs.position.y = 1.75;
    sg.add(legs);
    const torso = new THREE.Mesh(track(new THREE.CylinderGeometry(0.46, 0.38, 1.2, 8)), stoneMat);
    torso.position.y = 2.85;
    sg.add(torso);
    const cloak = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 2.1, 0.25)), dampMasonryMat);
    cloak.position.set(0, 2.35, -0.35);
    sg.add(cloak);
    const pauldrons = new THREE.Mesh(track(new THREE.BoxGeometry(1.32, 0.46, 0.66)), marbleMat);
    pauldrons.position.y = 3.35;
    sg.add(pauldrons);
    const helm = new THREE.Mesh(track(new THREE.CylinderGeometry(0.26, 0.32, 0.68, 8)), marbleMat);
    helm.position.y = 3.92;
    sg.add(helm);
    const visor = new THREE.Mesh(track(new THREE.BoxGeometry(0.36, 0.08, 0.14)), ironMat);
    visor.position.set(0, 3.95, 0.26);
    sg.add(visor);
    const sword = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 2.55, 0.08)), rustedSteelMat);
    sword.position.set(0, 2.15, 0.56);
    sg.add(sword);
    const sGuard = new THREE.Mesh(track(new THREE.BoxGeometry(0.56, 0.1, 0.14)), ironMat);
    sGuard.position.set(0, 3.05, 0.56);
    sg.add(sGuard);
  }

  // Armory Weapon Racks (steel broadswords & iron-rimmed heater shields), placed cleanly in West Chapel
  const rackCoords: Array<[number, number, number]> = [
    [-20.2, tCz, Math.PI / 2],
    [-16.4, tCz - 4.3, 0],
    [-16.4, tCz + 4.3, Math.PI],
  ];
  for (const [rx, rz, rry] of rackCoords) {
    const rg = new THREE.Group();
    rg.position.set(rx, t2Y, rz);
    rg.rotation.y = rry;
    interiorGroup.add(rg);

    for (const px of [-1.15, 1.15]) {
      const post = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 2.1, 0.42)), darkOakMat);
      post.position.set(px, 1.05, 0);
      rg.add(post);
    }
    for (const ry of [0.55, 1.65]) {
      const rail = new THREE.Mesh(track(new THREE.BoxGeometry(2.5, 0.14, 0.18)), darkOakMat);
      rail.position.set(0, ry, 0.08);
      rg.add(rail);
    }
    for (const sx of [-0.65, -0.1, 0.45]) {
      const blade = new THREE.Mesh(track(new THREE.BoxGeometry(0.11, 1.65, 0.04)), rustedSteelMat);
      blade.position.set(sx, 1.1, 0.18);
      blade.rotation.x = -0.14;
      rg.add(blade);
      const guard = new THREE.Mesh(track(new THREE.BoxGeometry(0.38, 0.07, 0.08)), ironMat);
      guard.position.set(sx, 1.72, 0.12);
      rg.add(guard);
    }
    const shield = new THREE.Mesh(track(new THREE.BoxGeometry(0.75, 0.96, 0.08)), shieldWoodMat);
    shield.position.set(0.85, 0.95, 0.24);
    shield.rotation.x = -0.18;
    rg.add(shield);
    const shieldBoss = new THREE.Mesh(track(new THREE.CylinderGeometry(0.16, 0.2, 0.1, 8)), rustedSteelMat);
    shieldBoss.rotation.x = Math.PI / 2 - 0.18;
    shieldBoss.position.set(0.85, 0.95, 0.29);
    rg.add(shieldBoss);
  }

  // Monastery Stone Tables placed in open South-East, South-West & North gallery bays (never overlapping Chapel)
  for (const ta of [-1.57, 2.22, 0.92]) {
    const tx = tCx + Math.cos(ta) * 14.8;
    const tz = tCz + Math.sin(ta) * 14.8;
    const tg = new THREE.Group();
    tg.position.set(tx, t2Y, tz);
    tg.rotation.y = -ta + Math.PI / 2;
    interiorGroup.add(tg);

    const top = new THREE.Mesh(track(new THREE.BoxGeometry(4.2, 0.24, 1.5)), stoneMat);
    top.position.y = 1.02;
    tg.add(top);
    for (const lx of [-1.5, 1.5]) {
      const leg = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 0.95, 1.2)), marbleMat);
      leg.position.set(lx, 0.48, 0);
      tg.add(leg);
    }
  }

  for (const ba of [0.35, -0.75, 2.7, -2.7]) {
    const bx = tCx + Math.cos(ba) * 10.2;
    const bz = tCz + Math.sin(ba) * 10.2;
    const ped = new THREE.Mesh(track(new THREE.CylinderGeometry(0.28, 0.42, 1.1, 8)), ironMat);
    ped.position.set(bx, t2Y + 0.55, bz);
    interiorGroup.add(ped);
    const bowl = new THREE.Mesh(track(new THREE.CylinderGeometry(0.55, 0.22, 0.4, 8)), ironMat);
    bowl.position.set(bx, t2Y + 1.25, bz);
    interiorGroup.add(bowl);
    const fl = new THREE.Mesh(sconceFlameGeo, flameMat);
    fl.position.set(bx, t2Y + 1.72, bz);
    interiorGroup.add(fl);
    torchFlames.push(fl);
  }

  // =========================================================================
  // 1F. TIER 3 (y = -10.0): SHAFT FLOOR & VAULTED REAR GATEHOUSE (z = -263..-286)
  // =========================================================================
  const t3Floor = addWalkable(
    new THREE.Mesh(track(new THREE.CylinderGeometry(17.7, 17.7, 0.9, 32)), flagstoneMat),
  );
  t3Floor.position.set(tCx, t3Y - 0.45, tCz);
  t3Floor.receiveShadow = true;
  interiorGroup.add(t3Floor);

  // Ornate central inlaid dark marble drain mosaic at bottom of 28m shaft
  const centerMosaic = new THREE.Mesh(track(new THREE.RingGeometry(1.4, 7.1, 24)), marbleMat);
  centerMosaic.rotation.x = -Math.PI / 2;
  centerMosaic.position.set(tCx, t3Y + 0.02, tCz);
  interiorGroup.add(centerMosaic);

  const grateRing = new THREE.Mesh(track(new THREE.CylinderGeometry(1.45, 1.45, 0.06, 12)), ironMat);
  grateRing.position.set(tCx, t3Y + 0.02, tCz);
  interiorGroup.add(grateRing);

  // Vaulted Rear Gatehouse Hall extending North (z = -262..-286, x = -11..+11)
  const gatehouseFloor = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(22.4, 1.4, 26.0)), flagstoneMat),
  );
  gatehouseFloor.position.set(0, t3Y - 0.7, -273.5);
  gatehouseFloor.receiveShadow = true;
  interiorGroup.add(gatehouseFloor);

  for (const side of [-1, 1]) {
    const ghWall = new THREE.Mesh(
      track(tileBoxUVs(new THREE.BoxGeometry(2.8, 15.0, 26.5), 2.8, 15.0, 26.5)),
      dampMasonryMat,
    );
    ghWall.position.set(side * 11.8, t3Y + 6.5, -273.5);
    addIndoorWall(ghWall);
  }
  const ghCeiling = new THREE.Mesh(
    track(tileBoxUVs(new THREE.BoxGeometry(24.0, 2.6, 26.5), 24.0, 2.6, 26.5)),
    dampMasonryMat,
  );
  ghCeiling.position.set(0, t3Y + 12.2, -273.5);
  addIndoorWall(ghCeiling);

  // Heavy Iron Portcullis Arches & Raised Spiked Iron Grilles (z = -267 & -282)
  const portcullisArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(12.2, 10.2, 1.8), { depth: 1.6, bevelEnabled: false }),
  );
  portcullisArchGeo.translate(0, 0, -0.8);
  for (const pz of [-267.0, -282.0]) {
    const pArch = new THREE.Mesh(portcullisArchGeo, stoneMat);
    pArch.position.set(0, t3Y, pz);
    interiorGroup.add(pArch);

    for (let bx = -5.0; bx <= 5.0; bx += 1.25) {
      const bar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.08, 4.6, 6)), ironMat);
      bar.position.set(bx, t3Y + 8.1, pz);
      interiorGroup.add(bar);

      const spike = new THREE.Mesh(track(new THREE.ConeGeometry(0.15, 0.52, 5)), ironMat);
      spike.position.set(bx, t3Y + 5.6, pz);
      spike.rotation.x = Math.PI;
      interiorGroup.add(spike);
    }
    for (const cy of [6.6, 8.2]) {
      const crossBar = new THREE.Mesh(track(new THREE.BoxGeometry(11.0, 0.22, 0.22)), ironMat);
      crossBar.position.set(0, t3Y + cy, pz);
      interiorGroup.add(crossBar);
    }
  }

  for (const tz of [-274.5]) {
    addWallTorch(-10.1, t3Y + 4.2, tz, Math.PI / 2);
    addWallTorch(10.1, t3Y + 4.2, tz, -Math.PI / 2);
  }

  // Rear Mountain Fortress Facade & Massive Open Rear Oak-Iron Gates (z = -286)
  for (const side of [-1, 1]) {
    const rearWing = new THREE.Mesh(
      track(tileBoxUVs(new THREE.BoxGeometry(24.0, 38.0, 4.4), 24.0, 38.0, 4.4)),
      stoneMat,
    );
    rearWing.position.set(side * 18.0, t3Y + 16.0, -286.2);
    addIndoorWall(rearWing);

    const rGate = new THREE.Group();
    rGate.position.set(side * 6.0, t3Y, -286.2);
    rGate.rotation.y = -side * 0.22;
    interiorGroup.add(rGate);

    const panel = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 9.8, 5.4)), darkOakMat);
    panel.position.set(-side * 0.2, 4.9, -2.7);
    rGate.add(panel);

    for (const sy of [1.5, 4.4, 7.6]) {
      const strap = new THREE.Mesh(track(new THREE.BoxGeometry(0.56, 0.34, 5.46)), ironMat);
      strap.position.set(-side * 0.2, sy, -2.7);
      rGate.add(strap);
    }
  }
  const rearLintel = new THREE.Mesh(
    track(tileBoxUVs(new THREE.BoxGeometry(14.0, 24.0, 4.4), 14.0, 24.0, 4.4)),
    stoneMat,
  );
  rearLintel.position.set(0, t3Y + 23.0, -286.2);
  addIndoorWall(rearLintel);

  // Cool silver-blue moonlight shafts filtering into Rear Gatehouse & Moonlit Clearing
  const mistBeamMat = track(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x9ac6eb) },
      },
      vertexShader: rayMat.vertexShader,
      fragmentShader: rayMat.fragmentShader,
    }),
  );
  for (const side of [-1, 1]) {
    const rBeam = new THREE.Mesh(track(new THREE.PlaneGeometry(5.5, 16.0)), mistBeamMat);
    rBeam.position.set(side * 2.4, t3Y + 5.2, -282.5);
    rBeam.rotation.set(-0.55, 0, side * 0.14);
    interiorGroup.add(rBeam);
  }

  // =========================================================================
  // PART 2: EXPANDED MISTY HINTERLAND WOODS, RIVER, HAMLET & SNOW PASS
  // =========================================================================
  const softMistTex = track(createSoftMistTexture());
  const pineNeedleTex = track(createPineNeedleTexture());
  const hinterland = buildHinterland({
    scene,
    interiorGroup,
    textures,
    stoneMat,
    flagstoneMat,
    marbleMat,
    cliffMat,
    barkMat,
    ironMat,
    flameMat,
    dampMasonryMat,
    mossyPathMat,
    darkOakMat,
    rustedSteelMat,
    arcaneSlateMat,
    soulCyanMat,
    mushroomGlowMat,
    mistBeamMat,
    softMistTex,
    pineNeedleTex,
    track,
    addWalkable,
    createArchShape,
    createPointedWindowShape,
    buildStairFlight,
  });

  // =========================================================================
  // PROXIMITY-MANAGED CITADEL INTERIOR LIGHTING
  // =========================================================================
  const interiorKeyLight = new THREE.PointLight(0xffb45c, 0, 52, 1.25);
  interiorKeyLight.position.set(tCx, t1Y + 12, tCz);
  scene.add(interiorKeyLight);

  const cloisterBonfireLight = new THREE.PointLight(0xff8c36, 0, 36, 1.35);
  cloisterBonfireLight.position.set(-16.2, t2Y + 2.2, tCz);
  scene.add(cloisterBonfireLight);

  const update = (elapsed: number, dt: number, playerZ: number, playerY: number, playerX = 0) => {
    mistBeamMat.uniforms.uTime.value = elapsed;

    const ndAttr = naveDustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < naveDustCount; i++) {
      const p = naveDustPhase[i];
      const nx = ndAttr.getX(i) + Math.sin(elapsed * 0.45 + p) * 0.14 * dt;
      const ny = ndAttr.getY(i) + Math.cos(elapsed * 0.38 + p * 1.2) * 0.09 * dt;
      ndAttr.setXY(i, nx, ny);
    }
    ndAttr.needsUpdate = true;

    const flicker =
      1.0 +
      Math.sin(elapsed * 7.8) * 0.14 +
      Math.sin(elapsed * 13.7) * 0.09 +
      Math.cos(elapsed * 21.3) * 0.05;

    for (let i = 0; i < clFlames.length; i++) {
      const fc = clFlames[i];
      fc.scale.set(0.92 + flicker * 0.08, 0.85 + Math.sin(elapsed * 11 + i * 2) * 0.2, 0.92 + flicker * 0.08);
      fc.rotation.y = elapsed * (1.2 + i * 0.4);
    }
    for (let i = 0; i < torchFlames.length; i++) {
      const fl = torchFlames[i];
      fl.scale.set(
        0.92 + flicker * 0.08,
        0.84 + Math.sin(elapsed * 9.8 + i * 1.9) * 0.2,
        0.92 + flicker * 0.08,
      );
      fl.rotation.y = elapsed * (1.4 + (i % 3) * 0.35);
    }

    if (playerZ < -195 && playerZ > -290) {
      interiorKeyLight.position.set(tCx, Math.max(t3Y + 6, playerY + 7.5), tCz);
      interiorKeyLight.intensity = playerY > 11 ? 16.5 : 11.5 * flicker;
    } else {
      interiorKeyLight.intensity = 0;
    }

    cloisterBonfireLight.intensity = playerZ < -222 && playerZ > -272 && playerY < 11 ? 13.5 * flicker : 0;

    hinterland.update(elapsed, dt, playerZ, playerY, playerX);
  };

  return { academyCastleGroup: hinterland.academyCastleGroup, update };
}
