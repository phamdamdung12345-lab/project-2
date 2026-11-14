import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WorldTextureBundle } from './textures';
import {
  WORLD,
  HINTERLAND,
  ACADEMY,
  HAMLET,
  getWhisperingTrailX,
  getRiverCenterZ,
  getRiversideTrailZ,
  getSnowPassCenterZ,
  getLakeCausewayX,
  getHinterlandGroundY,
  getFootbridgeY,
} from './terrainMath';
import { buildSunkenAcademy } from './buildSunkenAcademy';

export interface HinterlandParams {
  scene: THREE.Object3D;
  interiorGroup: THREE.Group;
  textures: WorldTextureBundle;
  stoneMat: THREE.MeshStandardMaterial;
  flagstoneMat: THREE.MeshStandardMaterial;
  marbleMat: THREE.MeshStandardMaterial;
  cliffMat: THREE.MeshStandardMaterial;
  barkMat: THREE.MeshStandardMaterial;
  ironMat: THREE.MeshStandardMaterial;
  flameMat: THREE.MeshBasicMaterial;
  dampMasonryMat: THREE.MeshStandardMaterial;
  mossyPathMat: THREE.MeshStandardMaterial;
  darkOakMat: THREE.MeshStandardMaterial;
  rustedSteelMat: THREE.MeshStandardMaterial;
  arcaneSlateMat: THREE.MeshStandardMaterial;
  soulCyanMat: THREE.MeshBasicMaterial;
  mushroomGlowMat: THREE.MeshStandardMaterial;
  mistBeamMat: THREE.ShaderMaterial;
  softMistTex: THREE.CanvasTexture;
  pineNeedleTex: THREE.CanvasTexture;
  track: <T extends { dispose: () => void }>(item: T) => T;
  addWalkable: <T extends THREE.Object3D>(mesh: T) => T;
  createArchShape: (width: number, height: number, thickness: number) => THREE.Shape;
  createPointedWindowShape: (w: number, h: number) => THREE.Shape;
  buildStairFlight: (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    yAtMaxZ: number,
    yAtMinZ: number,
    steps: number,
    mat: THREE.Material,
  ) => THREE.InstancedMesh;
}

export interface HinterlandHandles {
  academyCastleGroup: THREE.Group;
  update: (elapsed: number, dt: number, playerZ: number, playerY: number, playerX: number) => void;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function createSnowflakeTexture(): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(245, 250, 255, 0.95)');
    g.addColorStop(0.5, 'rgba(220, 234, 248, 0.5)');
    g.addColorStop(1, 'rgba(210, 226, 242, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createNeutralGroundGrainTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#dedcd8';
    ctx.fillRect(0, 0, size, size);
    let s = 31337;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < 2400; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const v = 195 + Math.floor(rnd() * 52);
      ctx.fillStyle = `rgb(${v},${v},${v - 2})`;
      ctx.fillRect(x, y, 3 + rnd() * 5, 3 + rnd() * 5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 32);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildHinterland({
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
}: HinterlandParams): HinterlandHandles {
  const hY = WORLD.hinterlandY;
  const dummy = new THREE.Object3D();

  // Rear Mossy Stone Steps (-286..-292, y = -10.0 -> -12.0)
  buildStairFlight(-6.0, 6.0, -292.0, -286.0, WORLD.gatehouseY, hY, 8, flagstoneMat);

  // =========================================================================
  // 1. UNDULATING CONTINUOUS FOREST, RIVERBED, HAMLET, SNOW PASS & LAKEBED TERRAIN
  // =========================================================================
  const terrainW = 840; // x: -460 .. +380 (center -40)
  const terrainD = 400; // z: -245 .. -645 (center -445)
  const terrainCx = -40;
  const terrainCz = -445.0;
  const terrainGeo = track(new THREE.PlaneGeometry(terrainW, terrainD, 168, 128));
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const uvAttr = terrainGeo.attributes.uv as THREE.BufferAttribute;
  const vColors = new Float32Array(posAttr.count * 3);
  const col = new THREE.Color();
  const cForest = new THREE.Color(0x2a3b31);
  const cTrail = new THREE.Color(0x454b45);
  const cRiverBank = new THREE.Color(0x243336);
  const cHamlet = new THREE.Color(0x4b4239);
  const cSnow = new THREE.Color(0xe6f0f8);

  for (let i = 0; i < posAttr.count; i++) {
    const wx = posAttr.getX(i) + terrainCx;
    const wz = posAttr.getZ(i) + terrainCz;
    let wy = getHinterlandGroundY(wx, wz);

    // Gentle rolling dry highland hills outside the playable forest & trails (zero flat square dropoff!)
    const eastHill = smoothstep(82.0, 260.0, wx);
    const westHill = smoothstep(-246.0, -390.0, wx);
    const southHill = smoothstep(-292.0, -250.0, wz) * smoothstep(14.0, 48.0, Math.abs(wx));
    const outerHillWave =
      Math.sin(wx * 0.032 + wz * 0.028) * 2.4 + Math.cos(wx * 0.018 - wz * 0.041) * 1.8;
    wy += eastHill * (10.5 + outerHillWave) + westHill * (13.0 + outerHillWave) + southHill * 8.0;

    // Carve Moonlit Riverbed smoothly below riverWaterY (-14.15 -> -15.65) strictly within x ∈ [-232, +152]
    const rz = getRiverCenterZ(wx);
    const dr = Math.abs(wz - rz);
    const riverEndFade =
      smoothstep(-236.0, -218.0, wx) * (1 - smoothstep(138.0, 154.0, wx));
    if (wx >= -236 && wx <= 156 && dr < 13.5 && riverEndFade > 0.001) {
      const bankBlend = (1 - smoothstep(7.2, 13.5, dr)) * riverEndFade;
      const bedY = HINTERLAND.riverWaterY - 1.55;
      wy = wy * (1 - bankBlend) + bedY * bankBlend;
    }

    // Submerge far-bank lakebed strictly inside the Academy lake basin north of retaining wall (z < -584, x ∈ [-194, +166])
    let lakeSubmerge = 0;
    if (wz < -584.0 && wx > -194.0 && wx < 166.0) {
      const lakeFade = smoothstep(-584.0, -592.0, wz);
      const cliffRiseWest = smoothstep(-172.0, -194.0, wx);
      const cliffRiseEast = smoothstep(148.0, 166.0, wx);
      lakeSubmerge = lakeFade * (1 - cliffRiseWest) * (1 - cliffRiseEast);
      const lakeBedY = ACADEMY.lakeWaterY - 2.4;
      wy = wy * (1 - lakeSubmerge) + lakeBedY * lakeSubmerge;
    }

    // Rise mountain foothills smoothly behind western & eastern perimeter wall flanks (keeping dry land well above water!)
    if (wx < -180.0 && wz < -568.0) {
      const slopeT = smoothstep(-180.0, -245.0, wx) * smoothstep(-566.0, -612.0, wz);
      wy += slopeT * 14.5;
    }
    if (wx > 152.0 && wz < -568.0) {
      const slopeE = smoothstep(152.0, 218.0, wx) * smoothstep(-566.0, -612.0, wz);
      wy += slopeE * 13.5;
    }

    posAttr.setY(i, wy - 0.04);
    uvAttr.setXY(i, (wx + 460) * 0.08, (-wz - 245) * 0.08);

    // Terrain Biome Color Blending
    col.copy(cForest);
    if (wz >= -465 && wz <= -292) {
      const trailD = Math.abs(wx - getWhisperingTrailX(wz));
      col.lerp(cTrail, 1 - smoothstep(2.5, 8.0, trailD));
    }
    if (dr < 15.5 && wx >= -232 && wx <= 152) {
      col.lerp(cRiverBank, (1 - smoothstep(7.0, 15.5, dr)) * riverEndFade);
    }
    if (lakeSubmerge > 0) {
      col.lerp(cRiverBank, lakeSubmerge);
    }
    if (wx <= -3 && wx >= -166) {
      const rTrailD = Math.abs(wz - getRiversideTrailZ(wx));
      col.lerp(cTrail, (1 - smoothstep(2.0, 7.0, rTrailD)) * 0.85);
    }
    const hDist = Math.hypot(wx - HAMLET.hamletCx, wz - HAMLET.hamletCz);
    col.lerp(cHamlet, 1 - smoothstep(16.0, 26.5, hDist));

    // Snowy Valley Pass frost transition (x < -200)
    const snowBlend = smoothstep(-200.0, -222.0, wx);
    const passShoulderSnow =
      wx < -194.0 ? smoothstep(4.5, 11.0, Math.abs(wz - getSnowPassCenterZ(wx))) * 0.72 : 0;
    col.lerp(cSnow, Math.min(1, Math.max(snowBlend, passShoulderSnow)));

    vColors[i * 3] = col.r;
    vColors[i * 3 + 1] = col.g;
    vColors[i * 3 + 2] = col.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(vColors, 3));
  posAttr.needsUpdate = true;
  uvAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const neutralGrainTex = track(createNeutralGroundGrainTexture());
  const forestGroundMat = track(
    new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: neutralGrainTex,
      vertexColors: true,
    }),
  );
  const hinterlandFloor = addWalkable(new THREE.Mesh(terrainGeo, forestGroundMat));
  hinterlandFloor.position.set(terrainCx, 0, terrainCz);
  hinterlandFloor.receiveShadow = true;
  interiorGroup.add(hinterlandFloor);

  // =========================================================================
  // 2. EXTENDED WHISPERING PATH COBBLESTONES & SOUL LANTERNS (-292..-548)
  // =========================================================================
  const cobbleSpecs: Array<[number, number, number, number, number]> = [];
  const pushCobble = (x: number, z: number, ry: number, sc: number) => {
    const gy = getHinterlandGroundY(x, z);
    cobbleSpecs.push([x, gy - 0.01, z, ry, sc]);
  };

  // Stretched Whispering Path (-293..-462)
  for (let z = -293.5; z >= -462.0; z -= 2.4) {
    const cx = getWhisperingTrailX(z);
    pushCobble(cx - 1.15, z, 0.14 * Math.sin(z * 0.4), 1.02);
    pushCobble(cx + 1.25, z - 1.0, -0.16 * Math.cos(z * 0.4), 0.94);
  }
  // North Woods extension (-497..-551)
  for (let z = -497.5; z >= -551.0; z -= 2.35) {
    pushCobble(-1.05, z, 0.08 * Math.sin(z), 0.98);
    pushCobble(1.1, z - 0.9, -0.1 * Math.cos(z), 0.92);
  }
  // East Alcove stepping stones toward Fallen Knight
  for (let x = 16.5; x <= 31.5; x += 2.3) {
    const zOff = -476.0 + Math.sin((x - 16.5) * 0.25) * 2.4;
    pushCobble(x, zOff, 0.2, 0.9);
  }
  // Left-Hand Riverside Trail stepping stones (-4..-162)
  for (let x = -5.5; x >= -161.5; x -= 2.45) {
    const tz = getRiversideTrailZ(x);
    pushCobble(x, tz - 0.95, 0.12 * Math.sin(x * 0.2), 0.95);
    pushCobble(x - 1.0, tz + 1.05, -0.14 * Math.cos(x * 0.2), 0.9);
  }
  // Snowy Valley Pass stepping stones (-203..-250)
  for (let x = -203.5; x >= -249.5; x -= 2.5) {
    const pz = getSnowPassCenterZ(x);
    pushCobble(x, pz - 0.7, 0.15 * Math.sin(x), 0.92);
    pushCobble(x - 0.9, pz + 0.85, -0.12 * Math.cos(x), 0.88);
  }

  const cobbleGeo = track(new THREE.CylinderGeometry(1.12, 1.28, 0.14, 7));
  const cobbleStoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x6b716d,
      map: textures.mossyStone.map,
      bumpMap: textures.mossyStone.bumpMap,
      bumpScale: 0.05,
      roughness: 0.9,
      metalness: 0.04,
    }),
  );
  const cobbles = addWalkable(new THREE.InstancedMesh(cobbleGeo, cobbleStoneMat, cobbleSpecs.length));
  cobbles.receiveShadow = true;
  cobbleSpecs.forEach(([cx, cy, cz, ry, sc], idx) => {
    dummy.position.set(cx, cy, cz);
    dummy.rotation.set(0, ry + idx * 0.7, 0);
    dummy.scale.set(sc * (0.88 + (idx % 3) * 0.12), 1, sc * (0.78 + ((idx + 1) % 3) * 0.12));
    dummy.updateMatrix();
    cobbles.setMatrixAt(idx, dummy.matrix);
  });
  cobbles.instanceMatrix.needsUpdate = true;
  cobbles.computeBoundingSphere();
  interiorGroup.add(cobbles);

  // Ancient arched tree roots bordering the stretched Whispering Path
  const pathRootMat = barkMat;
  for (let i = 0; i < 12; i++) {
    const rz = -305 - i * 13.5;
    const side = i % 2 === 0 ? -1 : 1;
    const rx = getWhisperingTrailX(rz) + side * (5.6 + (i % 3) * 0.6);
    const ry = getHinterlandGroundY(rx, rz);
    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(rx + side * 2.8, ry - 0.2, rz - 1.6),
      new THREE.Vector3(rx + side * 0.9, ry + 1.15, rz - 0.4),
      new THREE.Vector3(rx - side * 1.1, ry - 0.25, rz + 1.4),
    ]);
    const rMesh = new THREE.Mesh(track(new THREE.TubeGeometry(rootCurve, 10, 0.26, 6, false)), pathRootMat);
    interiorGroup.add(rMesh);
  }

  // Cyan Soul Lanterns along Whispering Path, Clearing, North Woods & East Alcove (exact colliders!)
  const whisperLanternZs = [-306, -330, -356, -384, -412, -440, -512, -536];
  const lanternCoords: Array<[number, number]> = whisperLanternZs.map((lz, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const lx = lz < -496 ? side * 5.2 : getWhisperingTrailX(lz) + side * 4.8;
    return [lx, lz];
  });
  const visualOnlyCyanLanterns: Array<[number, number]> = [
    [-4.8, -502],
    [4.8, -502],
    [22.5, -478.0],
  ];
  const soulLanternFlames: THREE.Mesh[] = [];

  for (const [lx, lz] of [...lanternCoords, ...visualOnlyCyanLanterns]) {
    const ly = getHinterlandGroundY(lx, lz);
    const lg = new THREE.Group();
    lg.position.set(lx, ly, lz);
    interiorGroup.add(lg);

    const base = new THREE.Mesh(track(new THREE.BoxGeometry(0.92, 0.55, 0.92)), stoneMat);
    base.position.y = 0.27;
    lg.add(base);
    const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.28, 2.2, 6)), stoneMat);
    post.position.y = 1.6;
    lg.add(post);
    const cage = new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.42, 0.72, 6, 1, true)), ironMat);
    cage.position.y = 2.95;
    lg.add(cage);
    const cap = new THREE.Mesh(track(new THREE.ConeGeometry(0.62, 0.65, 6)), marbleMat);
    cap.position.y = 3.55;
    lg.add(cap);
    const sFlame = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.25, 0)), soulCyanMat);
    sFlame.position.y = 2.95;
    lg.add(sFlame);
    soulLanternFlames.push(sFlame);
  }

  // =========================================================================
  // 3. MOONLIT CLEARING (0, -12, -480) & EAST FALLEN KNIGHT ALCOVE
  // =========================================================================
  const clearingFloor = addWalkable(
    new THREE.Mesh(track(new THREE.CylinderGeometry(11.8, 12.6, 0.22, 28)), mossyPathMat),
  );
  clearingFloor.position.set(HINTERLAND.clearingCx, hY - 0.08, HINTERLAND.clearingCz);
  clearingFloor.receiveShadow = true;
  interiorGroup.add(clearingFloor);

  for (const [mx, mz, rz] of [
    [-3.5, HINTERLAND.clearingCz - 2.0, 0.28],
    [4.2, HINTERLAND.clearingCz + 1.5, -0.22],
    [0.5, HINTERLAND.clearingCz - 4.0, 0.14],
  ]) {
    const mRay = new THREE.Mesh(track(new THREE.PlaneGeometry(7.2, 34.0)), mistBeamMat);
    mRay.position.set(mx, hY + 13.5, mz);
    mRay.rotation.set(0.18, 0.35, rz);
    interiorGroup.add(mRay);
  }

  // Shared Bonfire Builder (used for Moonlit Clearing + Ashenbrook Hamlet)
  const emberMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xff6a1a,
      emissive: new THREE.Color(0xff5500),
      emissiveIntensity: 2.5,
      roughness: 0.4,
    }),
  );
  const ashMat = track(new THREE.MeshStandardMaterial({ color: 0x241f1c, roughness: 0.96, metalness: 0.02 }));
  const logGeo = track(new THREE.CylinderGeometry(0.09, 0.11, 0.92, 6));

  const buildBonfireCluster = (bx: number, by: number, bz: number): THREE.Mesh[] => {
    const bg = new THREE.Group();
    bg.position.set(bx, by, bz);
    interiorGroup.add(bg);

    const ash = new THREE.Mesh(track(new THREE.ConeGeometry(1.15, 0.48, 10)), ashMat);
    ash.position.y = 0.22;
    bg.add(ash);

    const ember = new THREE.Mesh(track(new THREE.SphereGeometry(0.46, 10, 8)), emberMat);
    ember.scale.set(1.25, 0.42, 1.25);
    ember.position.y = 0.36;
    bg.add(ember);

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const log = new THREE.Mesh(logGeo, barkMat);
      log.position.set(Math.cos(a) * 0.44, 0.24, Math.sin(a) * 0.44);
      log.rotation.z = Math.PI / 2 - 0.35;
      log.rotation.y = a;
      bg.add(log);
    }

    const sword = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 2.05, 0.035)), rustedSteelMat);
    sword.position.set(0, 1.2, 0);
    sword.rotation.z = -0.1;
    bg.add(sword);

    const guard = new THREE.Mesh(track(new THREE.BoxGeometry(0.5, 0.08, 0.09)), ironMat);
    guard.position.set(0.06, 1.72, 0);
    guard.rotation.z = -0.1;
    bg.add(guard);

    const flames: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const fc = new THREE.Mesh(track(new THREE.ConeGeometry(0.3 - i * 0.05, 1.15 - i * 0.14, 7)), flameMat);
      fc.position.set((i - 1.5) * 0.08, 0.8 + i * 0.1, (i % 2 === 0 ? 1 : -1) * 0.06);
      bg.add(fc);
      flames.push(fc);
    }
    return flames;
  };

  const clearingFlames = buildBonfireCluster(HINTERLAND.clearingCx, hY, HINTERLAND.clearingCz);

  // Root-Entangled Ancient Stone Archway & Crumbling Belfry Shrine (NW of Clearing, -9.8, -489)
  const belfryGroup = new THREE.Group();
  belfryGroup.position.set(-9.8, hY, -489.0);
  belfryGroup.rotation.y = 0.48;
  interiorGroup.add(belfryGroup);

  const belfryArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(5.4, 7.2, 1.4), { depth: 2.0, bevelEnabled: false }),
  );
  belfryArchGeo.translate(0, 0, -1.0);
  const belfryArch = new THREE.Mesh(belfryArchGeo, dampMasonryMat);
  belfryArch.castShadow = true;
  belfryGroup.add(belfryArch);

  const belfryTower = new THREE.Mesh(track(new THREE.BoxGeometry(3.6, 11.4, 3.4)), stoneMat);
  belfryTower.position.set(-4.0, 5.7, -0.4);
  belfryGroup.add(belfryTower);

  const belfryRoof = new THREE.Mesh(track(new THREE.ConeGeometry(2.9, 4.4, 4)), dampMasonryMat);
  belfryRoof.position.set(-4.0, 13.5, -0.4);
  belfryRoof.rotation.y = Math.PI / 4;
  belfryGroup.add(belfryRoof);

  for (const rc of [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6.4, -0.4, 1.4),
      new THREE.Vector3(-4.8, 2.2, 1.4),
      new THREE.Vector3(-3.2, 5.4, 0.8),
      new THREE.Vector3(-2.6, 7.6, 0.0),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(3.8, -0.4, 1.4),
      new THREE.Vector3(3.2, 2.8, 0.8),
      new THREE.Vector3(2.2, 5.6, 0.0),
    ]),
  ]) {
    belfryGroup.add(new THREE.Mesh(track(new THREE.TubeGeometry(rc, 14, 0.34, 6, false)), barkMat));
  }

  // Hidden East Side Alcove: Craggy Mossy Outcrop, Fallen Petrified Knight & Gravestone
  const alcoveCliffWall = new THREE.Mesh(track(new THREE.DodecahedronGeometry(9.5, 0)), cliffMat);
  alcoveCliffWall.position.set(43.5, hY + 5.5, -469.0);
  alcoveCliffWall.scale.set(0.9, 1.4, 1.8);
  interiorGroup.add(alcoveCliffWall);

  const outcropBoulder = new THREE.Mesh(track(new THREE.DodecahedronGeometry(3.0, 0)), cliffMat);
  outcropBoulder.position.set(21.5, hY + 1.6, -463.5);
  outcropBoulder.scale.set(1.1, 1.25, 1.0);
  interiorGroup.add(outcropBoulder);

  const titanGroup = new THREE.Group();
  titanGroup.position.set(34.8, hY, -469.5);
  titanGroup.rotation.y = -Math.PI * 0.62;
  interiorGroup.add(titanGroup);

  const tLowerLegs = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 1.6, 4.4)), dampMasonryMat);
  tLowerLegs.position.set(0, 0.8, 2.4);
  titanGroup.add(tLowerLegs);
  const tTorso = new THREE.Mesh(track(new THREE.CylinderGeometry(1.6, 2.1, 5.2, 8)), dampMasonryMat);
  tTorso.position.set(0, 3.2, -0.4);
  tTorso.rotation.x = -0.52;
  titanGroup.add(tTorso);
  for (const side of [-1, 1]) {
    const tPauldron = new THREE.Mesh(track(new THREE.DodecahedronGeometry(1.35, 0)), stoneMat);
    tPauldron.position.set(side * 2.1, 4.4, -0.8);
    titanGroup.add(tPauldron);
  }
  const tHelm = new THREE.Mesh(track(new THREE.CylinderGeometry(0.85, 1.05, 1.9, 8)), marbleMat);
  tHelm.position.set(0, 5.6, -1.6);
  tHelm.rotation.x = 0.25;
  titanGroup.add(tHelm);
  const tGreatsword = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 7.6, 0.22)), marbleMat);
  tGreatsword.position.set(-1.6, 3.2, 1.4);
  tGreatsword.rotation.set(0.32, 0.15, -0.24);
  titanGroup.add(tGreatsword);
  const tShield = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 3.4, 0.38)), dampMasonryMat);
  tShield.position.set(2.2, 1.8, 1.0);
  tShield.rotation.set(-0.28, -0.35, 0.2);
  titanGroup.add(tShield);

  const graveGroup = new THREE.Group();
  graveGroup.position.set(29.5, hY, -466.5);
  graveGroup.rotation.y = 0.35;
  interiorGroup.add(graveGroup);
  const gPlinth = new THREE.Mesh(track(new THREE.BoxGeometry(2.0, 0.4, 1.4)), marbleMat);
  gPlinth.position.y = 0.2;
  graveGroup.add(gPlinth);
  const gStele = new THREE.Mesh(track(new THREE.BoxGeometry(1.25, 2.4, 0.42)), stoneMat);
  gStele.position.y = 1.4;
  graveGroup.add(gStele);
  const gRune = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 1.15, 0.46)), soulCyanMat);
  gRune.position.y = 1.45;
  graveGroup.add(gRune);

  // =========================================================================
  // 4. WIDE MOONLIT RIVER & GRAND ARCHED ACADEMY BRIDGE (-552..-582)
  // =========================================================================
  const riverUniforms = { uTime: { value: 0 } };
  const riverWaterMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x184658,
      emissive: new THREE.Color(0x133847),
      emissiveIntensity: 0.72,
      roughness: 0.14,
      metalness: 0.45,
    }),
  );
  riverWaterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = riverUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vRiverPos;
         uniform float uTime;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vRiverPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
         transformed.y += sin(vRiverPos.x * 0.35 + uTime * 1.4) * 0.04 + cos(vRiverPos.z * 0.55 - uTime * 1.1) * 0.03;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vRiverPos;
         uniform float uTime;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `float rFlow1 = sin(vRiverPos.x * 0.19 - uTime * 1.35 + sin(vRiverPos.z * 0.42) * 1.4);
         float rFlow2 = cos(vRiverPos.x * 0.37 - uTime * 0.95 - vRiverPos.z * 0.68);
         float rWave = (rFlow1 * 0.55 + rFlow2 * 0.45) * 0.5 + 0.5;
         float glint = pow(clamp(rWave, 0.0, 1.0), 4.0) * 0.34;
         gl_FragColor.rgb += vec3(0.20, 0.36, 0.44) * glint;
         #include <dithering_fragment>`,
      );
  };

  // Build curved river ribbon following getRiverCenterZ(x) strictly inside x ∈ [-232, +152]
  const riverSegsX = 96;
  const riverHalfW = 11.2;
  const riverPositions: number[] = [];
  const riverNormals: number[] = [];
  const riverIndices: number[] = [];
  for (let i = 0; i <= riverSegsX; i++) {
    const rx = THREE.MathUtils.lerp(-232, 152, i / riverSegsX);
    const rz = getRiverCenterZ(rx);
    riverPositions.push(rx, HINTERLAND.riverWaterY, rz - riverHalfW);
    riverPositions.push(rx, HINTERLAND.riverWaterY, rz + riverHalfW);
    riverNormals.push(0, 1, 0, 0, 1, 0);
    if (i < riverSegsX) {
      const b = i * 2;
      riverIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const riverGeo = track(new THREE.BufferGeometry());
  riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3));
  riverGeo.setAttribute('normal', new THREE.Float32BufferAttribute(riverNormals, 3));
  riverGeo.setIndex(riverIndices);
  const riverMesh = new THREE.Mesh(riverGeo, riverWaterMat);
  interiorGroup.add(riverMesh);

  // Stone river embankment buttresses flanking the Bridge approaches
  for (const side of [-1, 1]) {
    for (const bz of [HINTERLAND.bridgeStartZ - 1.2, HINTERLAND.bridgeEndZ + 1.2]) {
      const wall = new THREE.Mesh(track(new THREE.BoxGeometry(14.0, 4.2, 2.2)), dampMasonryMat);
      wall.position.set(side * 11.0, hY - 1.8, bz);
      interiorGroup.add(wall);
    }
  }

  // Grand Arched Stone Bridge (z = -552..-582, |x| <= 3.6)
  const bridgeLen = HINTERLAND.bridgeStartZ - HINTERLAND.bridgeEndZ; // 30m
  const bridgeSegs = 28;
  const bridgeDeckGeo = track(new THREE.BoxGeometry(HINTERLAND.bridgeHalfW * 2, 0.72, bridgeLen / bridgeSegs + 0.16));
  const bridgeDeck = addWalkable(new THREE.InstancedMesh(bridgeDeckGeo, dampMasonryMat, bridgeSegs));
  const bridgeParapetGeo = track(new THREE.BoxGeometry(0.46, 1.05, bridgeLen / bridgeSegs + 0.14));
  const bridgeParapets = new THREE.InstancedMesh(bridgeParapetGeo, arcaneSlateMat, bridgeSegs * 2);
  bridgeDeck.receiveShadow = true;

  for (let i = 0; i < bridgeSegs; i++) {
    const t = (i + 0.5) / bridgeSegs;
    const bz = THREE.MathUtils.lerp(HINTERLAND.bridgeStartZ, HINTERLAND.bridgeEndZ, t);
    const by = getFootbridgeY(bz);
    const slope = (Math.cos(t * Math.PI) * Math.PI * 1.75) / bridgeLen;

    dummy.position.set(0, by - 0.36, bz);
    dummy.rotation.set(-slope, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bridgeDeck.setMatrixAt(i, dummy.matrix);

    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? -1 : 1;
      dummy.position.set(side * (HINTERLAND.bridgeHalfW - 0.2), by + 0.5, bz);
      dummy.rotation.set(-slope, 0, 0);
      dummy.updateMatrix();
      bridgeParapets.setMatrixAt(i * 2 + s, dummy.matrix);
    }
  }
  bridgeDeck.instanceMatrix.needsUpdate = true;
  bridgeParapets.instanceMatrix.needsUpdate = true;
  bridgeDeck.computeBoundingBox();
  bridgeDeck.computeBoundingSphere();
  bridgeParapets.computeBoundingSphere();
  interiorGroup.add(bridgeDeck, bridgeParapets);

  // Stone bridge river piers & caged parapet cyan lanterns
  for (const pz of [-556.0, -567.0, -578.0]) {
    const py = getFootbridgeY(pz);
    for (const side of [-1, 1]) {
      const pier = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, py - (HINTERLAND.riverWaterY - 2.2), 2.4)), arcaneSlateMat);
      pier.position.set(side * 2.8, (py + HINTERLAND.riverWaterY - 2.2) * 0.5, pz);
      interiorGroup.add(pier);

      const post = new THREE.Mesh(track(new THREE.BoxGeometry(0.56, 1.45, 0.56)), stoneMat);
      post.position.set(side * (HINTERLAND.bridgeHalfW - 0.2), py + 1.5, pz);
      interiorGroup.add(post);

      const cage = new THREE.Mesh(track(new THREE.CylinderGeometry(0.32, 0.32, 0.56, 6, 1, true)), ironMat);
      cage.position.set(side * (HINTERLAND.bridgeHalfW - 0.2), py + 2.52, pz);
      interiorGroup.add(cage);

      const cap = new THREE.Mesh(track(new THREE.ConeGeometry(0.46, 0.45, 6)), arcaneSlateMat);
      cap.position.set(side * (HINTERLAND.bridgeHalfW - 0.2), py + 2.98, pz);
      interiorGroup.add(cap);

      const lanternOrb = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.2, 0)), soulCyanMat);
      lanternOrb.position.set(side * (HINTERLAND.bridgeHalfW - 0.2), py + 2.52, pz);
      interiorGroup.add(lanternOrb);
      soulLanternFlames.push(lanternOrb);
    }
  }

  // =========================================================================
  // 5. CONTINUOUS ACADEMY PERIMETER WALL, OPEN OUTER GATEHOUSE, FLOODED LAKE
  //    CAUSEWAY & SUNKEN ARCANE ACADEMY CITADEL
  // =========================================================================
  const amberLanternMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffcf7d,
      emissive: new THREE.Color(0xff942e),
      emissiveIntensity: 2.35,
      roughness: 0.25,
    }),
  );

  // Continuous blue-slate Gothic perimeter wall along far riverbank (z = -584):
  // West wing extends all the way to x = -228 (terminating directly inside mountain cliffs behind Hamlet!)
  // East wing extends to x = +160 (terminating directly inside eastern craggy cliffs!)
  const perimWallZ = -584.0;
  const westWallSpan = 222.8; // x: -5.2 .. -228.0
  const eastWallSpan = 154.8; // x: +5.2 .. +160.0
  for (const [side, span] of [
    [-1, westWallSpan],
    [1, eastWallSpan],
  ] as const) {
    const wallCenterX = side * (5.2 + span * 0.5);
    const pWall = new THREE.Mesh(track(new THREE.BoxGeometry(span, 10.5, 2.6)), dampMasonryMat);
    pWall.position.set(wallCenterX, hY + 4.8, perimWallZ);
    interiorGroup.add(pWall);

    const pCoping = new THREE.Mesh(track(new THREE.BoxGeometry(span, 0.85, 3.0)), arcaneSlateMat);
    pCoping.position.set(wallCenterX, hY + 10.2, perimWallZ);
    interiorGroup.add(pCoping);

    // Flanking square Gothic stone outer gatehouse towers at |x| = 7.4
    const turret = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 21.0, 4.4)), dampMasonryMat);
    turret.position.set(side * 7.4, hY + 10.2, perimWallZ);
    interiorGroup.add(turret);
    const turretBand = new THREE.Mesh(track(new THREE.BoxGeometry(4.8, 0.75, 4.8)), arcaneSlateMat);
    turretBand.position.set(side * 7.4, hY + 20.2, perimWallZ);
    interiorGroup.add(turretBand);
    const turretSpire = new THREE.Mesh(track(new THREE.ConeGeometry(3.4, 9.5, 4)), arcaneSlateMat);
    turretSpire.position.set(side * 7.4, hY + 25.0, perimWallZ);
    turretSpire.rotation.y = Math.PI / 4;
    interiorGroup.add(turretSpire);
  }

  // Towering rocky snow-dusted mountain cliffs sealing BOTH ends of the perimeter wall naturally
  const cliffEndClusters: Array<[number, number, number, number, number, boolean]> = [
    [-214, -586, 12.0, 1.3, 1.4, true],
    [-228, -592, 15.0, 1.5, 1.3, true],
    [-242, -580, 16.0, 1.6, 1.4, true],
    [-200, -596, 11.5, 1.2, 1.2, false],
    [-222, -606, 17.0, 1.7, 1.5, true],
    [152, -586, 13.0, 1.35, 1.3, false],
    [168, -594, 15.5, 1.5, 1.4, false],
  ];
  const cliffSnowMat = track(new THREE.MeshStandardMaterial({ color: 0xe2ecf5, roughness: 0.92, metalness: 0.02 }));
  for (const [cx, cz, cr, sy, sz, snowed] of cliffEndClusters) {
    const cRock = new THREE.Mesh(track(new THREE.DodecahedronGeometry(cr, 0)), cliffMat);
    cRock.position.set(cx, hY + cr * 0.55 * sy, cz);
    cRock.scale.set(1.2, sy, sz);
    cRock.rotation.set(0.15, cx * 0.1, 0.1);
    interiorGroup.add(cRock);
    if (snowed) {
      const cCap = new THREE.Mesh(track(new THREE.DodecahedronGeometry(cr * 0.88, 0)), cliffSnowMat);
      cCap.position.set(cx, hY + cr * 1.05 * sy, cz);
      cCap.scale.set(1.1, 0.42 * sy, sz * 0.92);
      interiorGroup.add(cCap);
    }
  }

  // Instanced Gothic wall buttresses & pinnacles running all the way into the mountain cliffs
  const buttressXs: number[] = [];
  for (let bx = 16; bx <= 214; bx += 11) {
    buttressXs.push(-bx);
    if (bx <= 148) buttressXs.push(bx);
  }
  const buttGeo = track(new THREE.BoxGeometry(1.9, 12.8, 3.6));
  const pinGeo = track(new THREE.ConeGeometry(1.15, 5.2, 4));
  const wallButtresses = new THREE.InstancedMesh(buttGeo, arcaneSlateMat, buttressXs.length);
  const wallPinnacles = new THREE.InstancedMesh(pinGeo, stoneMat, buttressXs.length);
  buttressXs.forEach((bx, idx) => {
    dummy.position.set(bx, hY + 6.0, perimWallZ + 0.4);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    wallButtresses.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(bx, hY + 14.8, perimWallZ + 0.4);
    dummy.rotation.set(0, Math.PI / 4, 0);
    dummy.updateMatrix();
    wallPinnacles.setMatrixAt(idx, dummy.matrix);

    if (idx % 3 === 0 && bx >= -160 && bx <= 105) {
      const sOrb = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.28, 0)), soulCyanMat);
      sOrb.position.set(bx, hY + 6.6, perimWallZ + 2.45);
      interiorGroup.add(sOrb);
      soulLanternFlames.push(sOrb);
    }
  });
  wallButtresses.instanceMatrix.needsUpdate = true;
  wallPinnacles.instanceMatrix.needsUpdate = true;
  wallButtresses.computeBoundingSphere();
  wallPinnacles.computeBoundingSphere();
  interiorGroup.add(wallButtresses, wallPinnacles);

  // Far-bank Outer Gatehouse Archway & OPEN Double Gates (z = -585.5, leading onto Outer Plaza -582..-602)
  const outerGateGroup = new THREE.Group();
  outerGateGroup.position.set(0, hY, HINTERLAND.outerGateZ);
  interiorGroup.add(outerGateGroup);

  const outerArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(11.4, 15.2, 2.8), {
      depth: 3.6,
      bevelEnabled: true,
      bevelSize: 0.14,
      bevelThickness: 0.14,
    }),
  );
  outerArchGeo.translate(0, 0, -1.8);
  const outerArch = new THREE.Mesh(outerArchGeo, arcaneSlateMat);
  outerArch.castShadow = true;
  outerGateGroup.add(outerArch);

  for (const side of [-1, 1]) {
    // Wide-open wrought-iron & blue-slate double gate leaves swung inward into plaza!
    const openLeaf = new THREE.Group();
    openLeaf.position.set(side * 5.45, 0, -1.5);
    openLeaf.rotation.y = -side * 0.18;
    outerGateGroup.add(openLeaf);

    const leafPanel = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 14.2, 5.4)), arcaneSlateMat);
    leafPanel.position.set(-side * 0.2, 7.1, -2.7);
    openLeaf.add(leafPanel);

    for (const sy of [2.2, 5.8, 9.4, 12.6]) {
      const strap = new THREE.Mesh(track(new THREE.BoxGeometry(0.72, 0.34, 5.46)), ironMat);
      strap.position.set(-side * 0.2, sy, -2.7);
      openLeaf.add(strap);
    }

    // Flanking cyan soul braziers on Outer Gatehouse Plaza (exact colliders at (±8.2, -592.0))
    const bPed = new THREE.Mesh(track(new THREE.CylinderGeometry(0.4, 0.58, 1.8, 8)), ironMat);
    bPed.position.set(side * 8.2, 0.9, -6.5);
    outerGateGroup.add(bPed);
    const bBowl = new THREE.Mesh(track(new THREE.CylinderGeometry(0.75, 0.3, 0.55, 8)), ironMat);
    bBowl.position.set(side * 8.2, 2.0, -6.5);
    outerGateGroup.add(bBowl);
    const bFlame = new THREE.Mesh(track(new THREE.ConeGeometry(0.36, 1.15, 7)), soulCyanMat);
    bFlame.position.set(side * 8.2, 2.75, -6.5);
    outerGateGroup.add(bFlame);
    soulLanternFlames.push(bFlame);
  }

  // Outer Gatehouse Plaza (-582..-602) & Broad Steps Descending into Flooded Lake Causeway (-602..-610)
  const outerPlaza = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(25.0, 0.4, 21.0)), marbleMat),
  );
  outerPlaza.position.set(0, hY - 0.16, -592.0);
  outerPlaza.receiveShadow = true;
  interiorGroup.add(outerPlaza);

  buildStairFlight(-7.0, 7.0, ACADEMY.gateStepsEndZ, ACADEMY.gateStepsStartZ, hY, ACADEMY.causewayY, 10, flagstoneMat);

  // =========================================================================
  // 5B & 5C. FLOODED LAKESIDE CAMPUS, SUNKEN RUINS & ACADEMY CITADEL EXTERIOR
  // =========================================================================
  const { academyCastleGroup, lakeUniforms, midIslandFlames, lanternFlames } = buildSunkenAcademy({
    interiorGroup,
    textures,
    stoneMat,
    flagstoneMat,
    marbleMat,
    barkMat,
    ironMat,
    dampMasonryMat,
    arcaneSlateMat,
    soulCyanMat,
    flameMat,
    amberLanternMat,
    track,
    addWalkable,
    createArchShape,
    createPointedWindowShape,
    buildBonfireCluster,
  });

  // =========================================================================
  // 6. LEFT-HAND RIVERSIDE TRAIL: WEEPING WILLOWS, MILEPOSTS & AMBER LANTERNS
  // =========================================================================
  const willowLeafMat = track(
    new THREE.MeshLambertMaterial({
      color: 0x526b5c,
      map: pineNeedleTex,
    }),
  );

  // Graceful Weeping Willows curving over the northern shoulder of the Riverside Trail & riverbank
  const willowTrunkGeo = track(new THREE.CylinderGeometry(0.28, 0.58, 6.0, 7));
  const willowCrownGeo = track(new THREE.SphereGeometry(2.6, 8, 6));
  const willowDraperyGeo = track(new THREE.ConeGeometry(3.15, 4.4, 9, 1, true));
  const willowLeafDraperyMat = track(
    new THREE.MeshLambertMaterial({
      color: 0x526b5c,
      map: pineNeedleTex,
      side: THREE.DoubleSide,
    }),
  );

  for (let i = 0; i < 15; i++) {
    const wx = -14 - i * 10.2;
    const riverZ = getRiverCenterZ(wx);
    const trailZ = getRiversideTrailZ(wx);
    const wz = i % 3 === 0 ? trailZ + 9.2 : (riverZ + trailZ) * 0.5 - 1.2;
    const wy = getHinterlandGroundY(wx, wz);

    const wg = new THREE.Group();
    wg.position.set(wx, wy - 0.1, wz);
    wg.rotation.y = i * 1.4;
    interiorGroup.add(wg);

    const trunk = new THREE.Mesh(willowTrunkGeo, barkMat);
    trunk.position.y = 2.9;
    trunk.rotation.z = 0.14;
    wg.add(trunk);

    const crown = new THREE.Mesh(willowCrownGeo, willowLeafMat);
    crown.position.set(-0.45, 5.9, 0);
    crown.scale.set(1.38, 0.82, 1.38);
    wg.add(crown);

    const skirt = new THREE.Mesh(willowDraperyGeo, willowLeafDraperyMat);
    skirt.position.set(-0.45, 3.85, 0);
    wg.add(skirt);

    const innerSkirt = new THREE.Mesh(willowDraperyGeo, willowLeafDraperyMat);
    innerSkirt.position.set(-0.45, 4.45, 0);
    innerSkirt.scale.set(0.76, 0.85, 0.76);
    innerSkirt.rotation.y = 0.4;
    wg.add(innerSkirt);
  }

  // Wooden River Milepost Markers & Warm Amber Trail Lanterns lining the Riverside Trail
  for (let i = 0; i < 9; i++) {
    const lx = -16 - i * 17.0;
    const side = i % 2 === 0 ? -1 : 1;
    const lz = getRiversideTrailZ(lx) + side * 4.4;
    const ly = getHinterlandGroundY(lx, lz);

    const postG = new THREE.Group();
    postG.position.set(lx, ly, lz);
    interiorGroup.add(postG);

    const pShaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.14, 2.9, 6)), darkOakMat);
    pShaft.position.y = 1.45;
    postG.add(pShaft);

    const pArm = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 0.11, 0.12)), darkOakMat);
    pArm.position.set(-0.35, 2.75, 0);
    postG.add(pArm);

    const lHousing = new THREE.Mesh(track(new THREE.BoxGeometry(0.34, 0.44, 0.34)), amberLanternMat);
    lHousing.position.set(-0.7, 2.42, 0);
    postG.add(lHousing);

    const lCap = new THREE.Mesh(track(new THREE.ConeGeometry(0.32, 0.25, 4)), ironMat);
    lCap.position.set(-0.7, 2.72, 0);
    lCap.rotation.y = Math.PI / 4;
    postG.add(lCap);

    if (i % 2 === 0) {
      const sign = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 0.26, 0.08)), darkOakMat);
      sign.position.set(0.2, 1.55, 0);
      sign.rotation.y = 0.28;
      postG.add(sign);
    }
  }

  // =========================================================================
  // 7. FOOTHILL VILLAGE — ASHENBROOK HAMLET (-182, -11.5, -548)
  // =========================================================================
  const hmx = HAMLET.hamletCx;
  const hmy = HAMLET.hamletY;
  const hmz = HAMLET.hamletCz;

  // Compact central cobblestone hearth around the Ashenbrook Hamlet Bonfire (no stretched tile disk!)
  const hamletHearth = addWalkable(
    new THREE.Mesh(track(new THREE.CylinderGeometry(4.4, 4.7, 0.14, 18)), cobbleStoneMat),
  );
  hamletHearth.position.set(hmx, hmy - 0.04, hmz);
  hamletHearth.receiveShadow = true;
  interiorGroup.add(hamletHearth);

  // 5th Active Bonfire / Site of Grace in Ashenbrook Hamlet Center
  const hamletFlames = buildBonfireCluster(HAMLET.bonfireX, hmy, HAMLET.bonfireZ);

  // Stone Village Well (exact collider at (hmx + 7.5, hmz + 6.5) = (-174.5, -541.5))
  const wellGroup = new THREE.Group();
  wellGroup.position.set(hmx + 7.5, hmy, hmz + 6.5);
  interiorGroup.add(wellGroup);

  const wellCurb = new THREE.Mesh(track(new THREE.CylinderGeometry(1.15, 1.25, 1.05, 12)), stoneMat);
  wellCurb.position.y = 0.52;
  wellGroup.add(wellCurb);
  const wellWater = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.9, 12)),
    track(new THREE.MeshBasicMaterial({ color: 0x102935 })),
  );
  wellWater.rotation.x = -Math.PI / 2;
  wellWater.position.y = 0.92;
  wellGroup.add(wellWater);
  for (const s of [-1, 1]) {
    const wPost = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 2.2, 0.16)), darkOakMat);
    wPost.position.set(s * 0.95, 1.85, 0);
    wellGroup.add(wPost);
  }
  const wellRoof = new THREE.Mesh(track(new THREE.ConeGeometry(1.65, 1.25, 4)), arcaneSlateMat);
  wellRoof.position.y = 3.35;
  wellRoof.rotation.y = Math.PI / 4;
  wellGroup.add(wellRoof);

  // 6 Rustic Medieval Timber-and-Stone Cottages matching collider footprints
  const plasterMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xc2b6a4,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );
  const slateRoofMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x353f49,
      map: textures.flagstone.map,
      roughness: 0.78,
      metalness: 0.1,
    }),
  );

  const cottageSpecs: Array<[number, number, number]> = [
    [-172, -534, 1.0],
    [-190, -532, 1.08],
    [-168, -560, 1.0],
    [-192, -562, 1.08],
    [-200, -537, 0.94],
    [-176, -564, 0.95],
  ];

  const roofPrismGeo = track(new THREE.CylinderGeometry(0.1, 4.6, 3.8, 4));
  roofPrismGeo.rotateY(Math.PI / 4);

  for (const [cx, cz, cs] of cottageSpecs) {
    const cg = new THREE.Group();
    cg.position.set(cx, hmy, cz);
    cg.rotation.y = Math.atan2(hmx - cx, hmz - cz);
    cg.scale.setScalar(cs);
    interiorGroup.add(cg);

    // Stone base plinth
    const found = new THREE.Mesh(track(new THREE.BoxGeometry(6.4, 1.25, 5.4)), dampMasonryMat);
    found.position.y = 0.62;
    found.castShadow = true;
    found.receiveShadow = true;
    cg.add(found);

    // Half-timbered matte plaster upper walls
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(6.0, 3.1, 5.0)), plasterMat);
    body.position.y = 2.75;
    body.castShadow = true;
    cg.add(body);

    // Dark oak vertical corner posts, horizontal crossbeams & Tudor diagonal bracing
    for (const bx of [-2.95, 0, 2.95]) {
      for (const bz of [-2.48, 2.48]) {
        const beam = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 3.2, 0.24)), darkOakMat);
        beam.position.set(bx, 2.75, bz);
        cg.add(beam);
      }
    }
    const midBeam = new THREE.Mesh(track(new THREE.BoxGeometry(6.2, 0.22, 5.2)), darkOakMat);
    midBeam.position.y = 4.22;
    cg.add(midBeam);
    const lowBeam = new THREE.Mesh(track(new THREE.BoxGeometry(6.2, 0.2, 5.2)), darkOakMat);
    lowBeam.position.y = 1.28;
    cg.add(lowBeam);

    // Steep pitched slate roof
    const roof = new THREE.Mesh(roofPrismGeo, slateRoofMat);
    roof.position.y = 6.1;
    roof.scale.set(1.12, 1.0, 0.96);
    roof.castShadow = true;
    cg.add(roof);

    // Stone chimney stack
    const chimney = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 3.4, 0.9)), stoneMat);
    chimney.position.set(1.8, 6.2, -1.1);
    cg.add(chimney);

    // Heavy wooden front door + leaded warm-amber windows + porch lantern
    const door = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 2.1, 0.2)), darkOakMat);
    door.position.set(0, 1.15, 2.55);
    cg.add(door);

    for (const wx of [-1.75, 1.75]) {
      const winFrame = new THREE.Mesh(track(new THREE.BoxGeometry(1.05, 1.15, 0.16)), darkOakMat);
      winFrame.position.set(wx, 2.6, 2.52);
      cg.add(winFrame);
      const winGlow = new THREE.Mesh(track(new THREE.PlaneGeometry(0.76, 0.86)), amberLanternMat);
      winGlow.position.set(wx, 2.6, 2.61);
      cg.add(winGlow);
      const mullionV = new THREE.Mesh(track(new THREE.BoxGeometry(0.07, 0.9, 0.05)), darkOakMat);
      mullionV.position.set(wx, 2.6, 2.63);
      cg.add(mullionV);
      const mullionH = new THREE.Mesh(track(new THREE.BoxGeometry(0.82, 0.07, 0.05)), darkOakMat);
      mullionH.position.set(wx, 2.6, 2.63);
      cg.add(mullionH);
    }

    const porchLamp = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.42, 0.32)), amberLanternMat);
    porchLamp.position.set(0.85, 2.35, 2.82);
    cg.add(porchLamp);
  }

  // Rustic Wooden Carts, Stacked Firewood & Split-Rail Fences in Ashenbrook Hamlet
  for (const [cartX, cartZ, cartRy] of [
    [hmx + 12.2, hmz - 3.5, 0.4],
    [hmx - 12.5, hmz + 5.8, -0.8],
  ]) {
    const wg = new THREE.Group();
    wg.position.set(cartX, hmy, cartZ);
    wg.rotation.y = cartRy;
    interiorGroup.add(wg);

    const bed = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 0.25, 1.45)), darkOakMat);
    bed.position.y = 0.72;
    wg.add(bed);
    for (const sz of [-0.66, 0.66]) {
      const rail = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 0.45, 0.12)), darkOakMat);
      rail.position.set(0, 1.05, sz);
      wg.add(rail);
    }
    for (const wx of [-0.8, 0.8]) {
      for (const wz of [-0.82, 0.82]) {
        const wheel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 10)), darkOakMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.55, wz);
        wg.add(wheel);
      }
    }
  }

  // Stacked firewood piles beside cottages
  const fLogGeo = track(new THREE.CylinderGeometry(0.13, 0.14, 1.2, 6));
  fLogGeo.rotateZ(Math.PI / 2);
  for (const [fx, fz, fry] of [
    [-175.8, -536.2, 0.2],
    [-187.5, -558.5, -0.4],
    [-171.2, -556.8, 0.6],
  ]) {
    const fg = new THREE.Group();
    fg.position.set(fx, hmy, fz);
    fg.rotation.y = fry;
    interiorGroup.add(fg);
    for (let row = 0; row < 3; row++) {
      for (let colI = 0; colI < 4 - row; colI++) {
        const fl = new THREE.Mesh(fLogGeo, barkMat);
        fl.position.set(0, 0.14 + row * 0.22, (colI - (3 - row) * 0.5) * 0.28);
        fg.add(fl);
      }
    }
  }

  // Split-rail wooden fences framing the eastern Hamlet entrance & northern riverside edge
  const fenceSegs: Array<[number, number, number]> = [
    [-161, -554, 0.2],
    [-165, -556, 0.35],
    [-162, -541, -0.25],
    [-177, -528, 0.08],
    [-184, -527, -0.08],
    [-197, -543, 1.45],
    [-197, -553, 1.6],
  ];
  for (const [fx, fz, fry] of fenceSegs) {
    const fg = new THREE.Group();
    fg.position.set(fx, hmy, fz);
    fg.rotation.y = fry;
    interiorGroup.add(fg);
    for (const px of [-1.2, 1.2]) {
      const fPost = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 1.15, 0.18)), darkOakMat);
      fPost.position.set(px, 0.57, 0);
      fg.add(fPost);
    }
    for (const ry of [0.42, 0.85]) {
      const fRail = new THREE.Mesh(track(new THREE.BoxGeometry(2.7, 0.1, 0.1)), darkOakMat);
      fRail.position.set(0, ry, 0);
      fg.add(fRail);
    }
  }

  // =========================================================================
  // 8. GATEWAY TO THE SNOWY VALLEY (x = -202..-253.5, y: -11.5 -> -3.2)
  // =========================================================================
  const snowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe2ecf5,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );

  // Stepped craggy snowy mountain outcrops & thick snowdrifts tightening smoothly into the pass gate piers
  for (let i = 0; i < 12; i++) {
    const px = -205 - i * 4.1;
    const pz = getSnowPassCenterZ(px);
    const py = getHinterlandGroundY(px, pz);

    // Sloped shoulder snowdrift mounds tucked cleanly along cliff edges (zero flat floating paper slabs)
    if (i >= 1) {
      const slopeAng = Math.atan2(
        getHinterlandGroundY(px - 1.0, pz) - getHinterlandGroundY(px + 1.0, pz),
        2.0,
      );
      for (const sSide of [-1, 1]) {
        const drift = new THREE.Mesh(track(new THREE.DodecahedronGeometry(2.6, 0)), snowMat);
        drift.position.set(px, py + 0.18, pz + sSide * (4.4 + (i % 2) * 0.6));
        drift.rotation.set(0, i * 0.6, -slopeAng);
        drift.scale.set(1.35, 0.34, 0.95);
        interiorGroup.add(drift);
      }
    }

    for (const side of [-1, 1]) {
      const zSpread = i >= 8 ? 6.6 + (11 - i) * 0.5 : 9.0 + (i % 3) * 1.3;
      const rockScale = 0.95 + ((i + (side > 0 ? 1 : 0)) % 3) * 0.34;
      const wall = new THREE.Mesh(track(new THREE.DodecahedronGeometry(3.9, 0)), cliffMat);
      wall.position.set(px, py + 1.8 * rockScale, pz + side * zSpread);
      wall.rotation.set(i * 0.4, i * 1.1 * side, 0.2);
      wall.scale.set(1.35 * rockScale, 1.28 * rockScale, 1.15 * rockScale);
      interiorGroup.add(wall);

      if (i >= 2) {
        const cap = new THREE.Mesh(track(new THREE.DodecahedronGeometry(3.2 * rockScale, 0)), snowMat);
        cap.position.set(px, py + 3.8 * rockScale, pz + side * (zSpread - 0.15));
        cap.scale.set(1.25, 0.45, 1.05);
        interiorGroup.add(cap);
      }
    }
  }

  // Weathered Timber-and-Stone Mountain Pass Gate & Fused Towering Cliff Monoliths (x = -253.5)
  const gateX = HAMLET.passGateX;
  const gateZ = getSnowPassCenterZ(HAMLET.passEndX);
  const gateY = HAMLET.passEndY;

  const passGate = new THREE.Group();
  passGate.position.set(gateX, gateY, gateZ);
  interiorGroup.add(passGate);

  for (const side of [-1, 1]) {
    const pier = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 7.8, 2.6)), stoneMat);
    pier.position.set(0, 3.9, side * 4.4);
    passGate.add(pier);

    // Towering craggy snow-capped mountain cliffs tightly overlapping & fusing into both stone piers!
    for (const [cx, cz, cr, sy] of [
      [-0.5, side * 7.6, 5.2, 2.1],
      [1.8, side * 9.8, 5.6, 1.75],
      [-5.2, side * 12.2, 7.2, 2.3],
      [-9.5, side * 5.2, 6.8, 2.0],
    ] as const) {
      const cliffWing = new THREE.Mesh(track(new THREE.DodecahedronGeometry(cr, 0)), cliffMat);
      cliffWing.position.set(cx, cr * 0.55 * sy - 1.5, cz);
      cliffWing.scale.set(1.15, sy, 1.1);
      passGate.add(cliffWing);

      const cliffSnow = new THREE.Mesh(track(new THREE.DodecahedronGeometry(cr * 0.88, 0)), snowMat);
      cliffSnow.position.set(cx, cr * 1.1 * sy - 1.5, cz);
      cliffSnow.scale.set(1.05, 0.42 * sy, 1.0);
      passGate.add(cliffSnow);
    }

    const timberPost = new THREE.Mesh(track(new THREE.BoxGeometry(0.65, 8.8, 0.65)), darkOakMat);
    timberPost.position.set(0.6, 4.4, side * 3.6);
    passGate.add(timberPost);

    // Closed weathered timber-and-iron mountain pass gate leaves
    const gLeaf = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 5.2, 3.2)), darkOakMat);
    gLeaf.position.set(0.2, 2.6, side * 1.65);
    passGate.add(gLeaf);

    for (const sy of [1.2, 2.6, 4.0]) {
      const gStrap = new THREE.Mesh(track(new THREE.BoxGeometry(0.54, 0.22, 3.25)), ironMat);
      gStrap.position.set(0.2, sy, side * 1.65);
      passGate.add(gStrap);
    }

    // Warm amber pass lantern beside gate pier
    const gLantern = new THREE.Mesh(track(new THREE.BoxGeometry(0.36, 0.48, 0.36)), amberLanternMat);
    gLantern.position.set(1.25, 3.9, side * 3.6);
    passGate.add(gLantern);
  }

  // Timber crossbeam lintel + snow cap
  const lintel = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 0.95, 9.8)), darkOakMat);
  lintel.position.set(0.5, 8.2, 0);
  passGate.add(lintel);
  const lintelSnow = new THREE.Mesh(track(new THREE.BoxGeometry(1.25, 0.45, 10.0)), snowMat);
  lintelSnow.position.set(0.5, 8.82, 0);
  passGate.add(lintelSnow);

  // Snow-draped boulders blocking passage beyond gate while framing snowy distant horizon
  for (const [bx, bz, bs] of [
    [-2.4, -1.6, 2.5],
    [-2.6, 2.2, 2.7],
    [-5.5, 0.0, 4.2],
  ]) {
    const bMesh = new THREE.Mesh(track(new THREE.DodecahedronGeometry(bs, 0)), cliffMat);
    bMesh.position.set(bx, bs * 0.55, bz);
    passGate.add(bMesh);
    const sCap = new THREE.Mesh(track(new THREE.DodecahedronGeometry(bs * 0.85, 0)), snowMat);
    sCap.position.set(bx, bs * 1.15, bz);
    sCap.scale.set(1.0, 0.48, 1.0);
    passGate.add(sCap);
  }

  // =========================================================================
  // 9. EXPANDED INSTANCED FOLIAGE (EVERGREENS, FROST PINES, GNARLED TREES, BOULDERS, MUSHROOMS)
  // =========================================================================
  const hTrunkGeo = track(new THREE.CylinderGeometry(0.42, 0.72, 11.5, 7));
  hTrunkGeo.translate(0, 5.75, 0);
  const hConeA = new THREE.ConeGeometry(4.2, 12.0, 7);
  hConeA.translate(0, 10.5, 0);
  const hConeB = new THREE.ConeGeometry(3.2, 10.0, 7);
  hConeB.translate(0, 16.5, 0);
  const hCanopyGeo = track(mergeGeometries([hConeA, hConeB]));
  hConeA.dispose();
  hConeB.dispose();

  const hPineMat = track(
    new THREE.MeshLambertMaterial({
      color: 0xb6cab2,
      map: pineNeedleTex,
    }),
  );

  let hSeed = 919;
  const hRand = () => {
    hSeed = (hSeed * 1664525 + 1013904223) >>> 0;
    return hSeed / 4294967296;
  };

  const isInsidePlayableForest = (px: number, pz: number, pad = 2.4): boolean => {
    if (pz > -294 && Math.abs(px) < 8.5 + pad) return true;
    if (pz <= -292 && pz >= -465) {
      if (Math.abs(px - getWhisperingTrailX(pz)) < 8.2 + pad) return true;
    }
    if (Math.hypot(px - HINTERLAND.clearingCx, pz - HINTERLAND.clearingCz) < HINTERLAND.clearingRadius + pad) {
      return true;
    }
    if (pz < -493 && pz > -554 && Math.abs(px) < 9.5 + pad) return true;
    if (Math.abs(pz - getRiverCenterZ(px)) < 13.5 + pad) return true; // Keep river channel clear
    if (pz <= -580 && pz >= -589 && px >= -230 && px <= 165) return true; // Keep Academy perimeter wall strip clear
    if (pz < -586 && px > -195) return true; // Keep flooded Academy lake open!
    if (px >= 12.5 && px <= 40.5 + pad && pz >= -485.0 - pad && pz <= -460.0 + pad) return true;
    if (px <= -3.0 && px >= -164.0 && Math.abs(pz - getRiversideTrailZ(px)) < 7.8 + pad) return true;
    if (Math.hypot(px - HAMLET.hamletCx, pz - HAMLET.hamletCz) < HAMLET.hamletRadius + 3.5 + pad) return true;
    if (px <= -200.0 && Math.abs(pz - getSnowPassCenterZ(px)) < 7.0 + pad) return true;
    return false;
  };

  const dryGroundYAt = (rx: number, rz: number): number => {
    let wy = getHinterlandGroundY(rx, rz);
    const eastHill = smoothstep(82.0, 260.0, rx);
    const westHill = smoothstep(-246.0, -390.0, rx);
    const outerHillWave =
      Math.sin(rx * 0.032 + rz * 0.028) * 2.4 + Math.cos(rx * 0.018 - rz * 0.041) * 1.8;
    wy += eastHill * (10.5 + outerHillWave) + westHill * (13.0 + outerHillWave);
    if (rx < -180.0 && rz < -568.0) {
      wy += smoothstep(-180.0, -245.0, rx) * smoothstep(-566.0, -612.0, rz) * 14.5;
    }
    if (rx > 152.0 && rz < -568.0) {
      wy += smoothstep(152.0, 218.0, rx) * smoothstep(-566.0, -612.0, rz) * 13.5;
    }
    return wy;
  };

  // Forest Evergreens filling Whispering Woods AND dry eastern/western highland foothills (x ∈ [-235, +245], z ∈ [-284, -582])
  const treeCoords: Array<{ x: number; y: number; z: number; s: number; rot: number }> = [];
  for (let i = 0; i < 2000 && treeCoords.length < 430; i++) {
    const rx = -235 + hRand() * 480;
    const rz = -284 - hRand() * 298;
    if (isInsidePlayableForest(rx, rz, 2.6)) continue;
    const gy = dryGroundYAt(rx, rz);
    if (gy < ACADEMY.lakeWaterY + 1.0) continue;
    treeCoords.push({
      x: rx,
      y: gy - 0.15,
      z: rz,
      s: 0.9 + hRand() * 0.95,
      rot: hRand() * Math.PI * 2,
    });
  }

  const hinterTrunks = new THREE.InstancedMesh(hTrunkGeo, barkMat, treeCoords.length);
  const hinterCanopies = new THREE.InstancedMesh(hCanopyGeo, hPineMat, treeCoords.length);
  const pineTint = new THREE.Color();
  treeCoords.forEach((tc, idx) => {
    dummy.position.set(tc.x, tc.y, tc.z);
    dummy.rotation.set(0, tc.rot, 0);
    dummy.scale.set(tc.s, tc.s * (0.95 + (idx % 3) * 0.14), tc.s);
    dummy.updateMatrix();
    hinterTrunks.setMatrixAt(idx, dummy.matrix);
    hinterCanopies.setMatrixAt(idx, dummy.matrix);
    pineTint.setHSL(0.35 + (idx % 4) * 0.015, 0.25, 0.32 + (idx % 3) * 0.08);
    hinterCanopies.setColorAt(idx, pineTint);
  });
  hinterTrunks.instanceMatrix.needsUpdate = true;
  hinterCanopies.instanceMatrix.needsUpdate = true;
  if (hinterCanopies.instanceColor) hinterCanopies.instanceColor.needsUpdate = true;
  hinterTrunks.computeBoundingSphere();
  hinterCanopies.computeBoundingSphere();
  interiorGroup.add(hinterTrunks, hinterCanopies);

  // Frost-Covered Alpine Pines around Ashenbrook Foothills, Western Wall Cliffs & Snowy Valley Pass
  const frostPineMat = track(
    new THREE.MeshLambertMaterial({
      color: 0xc8d9e6,
      map: pineNeedleTex,
    }),
  );
  const frostTreeCoords: Array<{ x: number; y: number; z: number; s: number; rot: number }> = [];
  for (let i = 0; i < 800 && frostTreeCoords.length < 155; i++) {
    const rx = -315 + hRand() * 145;
    const rz = -500 - hRand() * 125;
    if (isInsidePlayableForest(rx, rz, 2.4)) continue;
    const gy = dryGroundYAt(rx, rz);
    if (gy < ACADEMY.lakeWaterY + 1.0) continue;
    frostTreeCoords.push({
      x: rx,
      y: gy - 0.15,
      z: rz,
      s: 0.95 + hRand() * 0.85,
      rot: hRand() * Math.PI * 2,
    });
  }
  const frostTrunks = new THREE.InstancedMesh(hTrunkGeo, barkMat, frostTreeCoords.length);
  const frostCanopies = new THREE.InstancedMesh(hCanopyGeo, frostPineMat, frostTreeCoords.length);
  frostTreeCoords.forEach((tc, idx) => {
    dummy.position.set(tc.x, tc.y, tc.z);
    dummy.rotation.set(0, tc.rot, 0);
    dummy.scale.set(tc.s, tc.s * (0.95 + (idx % 3) * 0.14), tc.s);
    dummy.updateMatrix();
    frostTrunks.setMatrixAt(idx, dummy.matrix);
    frostCanopies.setMatrixAt(idx, dummy.matrix);
  });
  frostTrunks.instanceMatrix.needsUpdate = true;
  frostCanopies.instanceMatrix.needsUpdate = true;
  frostTrunks.computeBoundingSphere();
  frostCanopies.computeBoundingSphere();
  interiorGroup.add(frostTrunks, frostCanopies);

  // Gnarled Dead Trees
  const gnarledTrunk = new THREE.CylinderGeometry(0.18, 0.45, 7.6, 6);
  gnarledTrunk.translate(0, 3.8, 0);
  const gnarledLimbA = new THREE.CylinderGeometry(0.08, 0.18, 3.8, 5);
  gnarledLimbA.translate(0, 1.9, 0);
  gnarledLimbA.rotateZ(-0.62);
  gnarledLimbA.translate(0, 4.4, 0);
  const gnarledLimbB = new THREE.CylinderGeometry(0.06, 0.14, 3.0, 5);
  gnarledLimbB.translate(0, 1.5, 0);
  gnarledLimbB.rotateZ(0.58);
  gnarledLimbB.rotateY(1.8);
  gnarledLimbB.translate(0, 5.2, 0);
  const gnarledGeo = track(mergeGeometries([gnarledTrunk, gnarledLimbA, gnarledLimbB]));
  gnarledTrunk.dispose();
  gnarledLimbA.dispose();
  gnarledLimbB.dispose();

  const gnarledCoords: Array<{ x: number; y: number; z: number; s: number; rot: number }> = [];
  for (let i = 0; i < 250 && gnarledCoords.length < 56; i++) {
    const rx = -170 + hRand() * 235;
    const rz = -294 - hRand() * 255;
    if (isInsidePlayableForest(rx, rz, 1.4)) continue;
    gnarledCoords.push({
      x: rx,
      y: getHinterlandGroundY(rx, rz) - 0.1,
      z: rz,
      s: 0.85 + hRand() * 0.7,
      rot: hRand() * Math.PI * 2,
    });
  }
  const gnarledInst = new THREE.InstancedMesh(gnarledGeo, barkMat, gnarledCoords.length);
  gnarledCoords.forEach((gc, idx) => {
    dummy.position.set(gc.x, gc.y, gc.z);
    dummy.rotation.set(0.08, gc.rot, -0.06);
    dummy.scale.setScalar(gc.s);
    dummy.updateMatrix();
    gnarledInst.setMatrixAt(idx, dummy.matrix);
  });
  gnarledInst.instanceMatrix.needsUpdate = true;
  gnarledInst.computeBoundingSphere();
  interiorGroup.add(gnarledInst);

  // Mossy Perimeter Boulders along Whispering Path, Clearing, & Riverside Banks
  const boulderGeo = track(new THREE.DodecahedronGeometry(2.2, 0));
  const boulderCoords: Array<[number, number, number]> = [];
  for (let z = -298; z >= -456; z -= 17) {
    const tx = getWhisperingTrailX(z);
    boulderCoords.push([tx - 10.6, z, 1.15]);
    boulderCoords.push([tx + 10.6, z - 8, 1.2]);
  }
  for (let x = -18; x >= -152; x -= 19) {
    boulderCoords.push([x, getRiverCenterZ(x) + 12.2, 1.1]);
  }
  boulderCoords.push(
    [-17.5, HINTERLAND.clearingCz + 4, 1.35],
    [-16.8, HINTERLAND.clearingCz - 8, 1.4],
    [15.5, HINTERLAND.clearingCz - 10, 1.3],
  );
  const hinterBoulders = new THREE.InstancedMesh(boulderGeo, cliffMat, boulderCoords.length);
  boulderCoords.forEach(([bx, bz, bs], i) => {
    const by = getHinterlandGroundY(bx, bz);
    dummy.position.set(bx, by + 0.52 * bs, bz);
    dummy.rotation.set(i * 0.5, i * 1.1, i * 0.3);
    dummy.scale.set(bs, bs * 0.8, bs);
    dummy.updateMatrix();
    hinterBoulders.setMatrixAt(i, dummy.matrix);
  });
  hinterBoulders.instanceMatrix.needsUpdate = true;
  hinterBoulders.computeBoundingSphere();
  interiorGroup.add(hinterBoulders);

  // Glowing Cyan Forest Mushrooms
  const mushCount = 140;
  const mushStemGeo = track(new THREE.CylinderGeometry(0.05, 0.08, 0.32, 5));
  mushStemGeo.translate(0, 0.16, 0);
  const mushCapGeo = track(new THREE.ConeGeometry(0.24, 0.18, 7));
  mushCapGeo.translate(0, 0.34, 0);
  const mushStems = new THREE.InstancedMesh(mushStemGeo, marbleMat, mushCount);
  const mushCaps = new THREE.InstancedMesh(mushCapGeo, mushroomGlowMat, mushCount);
  for (let i = 0; i < mushCount; i++) {
    let mx = 0;
    let mz = 0;
    if (i < 75) {
      mz = -294 - (i / 75) * 165;
      const side = i % 2 === 0 ? -1 : 1;
      mx = getWhisperingTrailX(mz) + side * (5.2 + hRand() * 3.0);
    } else if (i < 115) {
      const a = hRand() * Math.PI * 2;
      const r = 13.5 + hRand() * 5.0;
      mx = HINTERLAND.clearingCx + Math.cos(a) * r;
      mz = HINTERLAND.clearingCz + Math.sin(a) * r;
    } else {
      mx = 18.0 + hRand() * 19.0;
      mz = -481.0 + hRand() * 18.0;
    }
    const ms = 0.65 + hRand() * 1.15;
    dummy.position.set(mx, getHinterlandGroundY(mx, mz) - 0.02, mz);
    dummy.rotation.set(0, hRand() * Math.PI * 2, 0);
    dummy.scale.set(ms, ms, ms);
    dummy.updateMatrix();
    mushStems.setMatrixAt(i, dummy.matrix);
    mushCaps.setMatrixAt(i, dummy.matrix);
  }
  mushStems.instanceMatrix.needsUpdate = true;
  mushCaps.instanceMatrix.needsUpdate = true;
  mushStems.computeBoundingSphere();
  mushCaps.computeBoundingSphere();
  interiorGroup.add(mushStems, mushCaps);

  // =========================================================================
  // 10. DRIFTING FOREST/RIVER MIST WISPS & SNOWY VALLEY FALLING SNOW
  // =========================================================================
  const mistParticleCount = 220;
  const mistParticlePos = new Float32Array(mistParticleCount * 3);
  const mistParticlePhase = new Float32Array(mistParticleCount);
  for (let i = 0; i < mistParticleCount; i++) {
    const mx = i < 130 ? (hRand() - 0.5) * 110 : -205 + hRand() * 195;
    const mz = i < 130 ? -290 - hRand() * 290 : -530 - hRand() * 55;
    mistParticlePos[i * 3] = mx;
    mistParticlePos[i * 3 + 1] = getHinterlandGroundY(mx, mz) + 1.2 + hRand() * 4.5;
    mistParticlePos[i * 3 + 2] = mz;
    mistParticlePhase[i] = hRand() * Math.PI * 2;
  }
  const hinterMistGeo = track(new THREE.BufferGeometry());
  hinterMistGeo.setAttribute('position', new THREE.BufferAttribute(mistParticlePos, 3));
  const hinterMistMat = track(
    new THREE.PointsMaterial({
      size: 16.5,
      map: softMistTex,
      color: 0xaec9e0,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    }),
  );
  interiorGroup.add(new THREE.Points(hinterMistGeo, hinterMistMat));

  // Falling Snowflakes & Swirling Snow Mist in Snowy Valley Pass (x: -200..-270)
  const snowTex = track(createSnowflakeTexture());
  const snowCount = 260;
  const snowPos = new Float32Array(snowCount * 3);
  const snowPhase = new Float32Array(snowCount);
  for (let i = 0; i < snowCount; i++) {
    snowPos[i * 3] = -196 - hRand() * 72;
    snowPos[i * 3 + 1] = -12.0 + hRand() * 20.0;
    snowPos[i * 3 + 2] = -530 - hRand() * 42;
    snowPhase[i] = hRand() * Math.PI * 2;
  }
  const snowGeo = track(new THREE.BufferGeometry());
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowPointsMat = track(
    new THREE.PointsMaterial({
      size: 0.72,
      map: snowTex,
      color: 0xf2f7ff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  interiorGroup.add(new THREE.Points(snowGeo, snowPointsMat));

  // =========================================================================
  // 11. PROXIMITY-MANAGED HINTERLAND, VILLAGE & ARCANE LIGHTS
  // =========================================================================
  const forestHeroLight = new THREE.PointLight(0xff9b42, 0, 44, 1.3);
  forestHeroLight.position.set(HINTERLAND.clearingCx, hY + 2.4, HINTERLAND.clearingCz);
  scene.add(forestHeroLight);

  const soulProximityLight = new THREE.PointLight(0x64e2ff, 0, 30, 1.35);
  soulProximityLight.position.set(0, hY + 3.2, -306);
  scene.add(soulProximityLight);

  const update = (elapsed: number, dt: number, playerZ: number, _playerY: number, playerX: number) => {
    riverUniforms.uTime.value = elapsed;
    lakeUniforms.uTime.value = elapsed;

    const hmAttr = hinterMistGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < mistParticleCount; i++) {
      const p = mistParticlePhase[i];
      hmAttr.setX(i, hmAttr.getX(i) + Math.sin(elapsed * 0.25 + p) * 0.24 * dt);
    }
    hmAttr.needsUpdate = true;

    const snAttr = snowGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < snowCount; i++) {
      const p = snowPhase[i];
      let sx = snAttr.getX(i) + Math.sin(elapsed * 0.9 + p) * 0.65 * dt;
      let sy = snAttr.getY(i) - (1.85 + (i % 3) * 0.35) * dt;
      if (sy < -12.0) {
        sy = 8.0;
        sx = -196 - ((i * 73) % 72);
      }
      snAttr.setXY(i, sx, sy);
    }
    snAttr.needsUpdate = true;

    const flicker =
      1.0 +
      Math.sin(elapsed * 7.8) * 0.14 +
      Math.sin(elapsed * 13.7) * 0.09 +
      Math.cos(elapsed * 21.3) * 0.05;

    for (let i = 0; i < clearingFlames.length; i++) {
      const fc = clearingFlames[i];
      fc.scale.set(0.92 + flicker * 0.08, 0.85 + Math.cos(elapsed * 11 + i * 2) * 0.2, 0.92 + flicker * 0.08);
      fc.rotation.y = -elapsed * (1.2 + i * 0.4);
    }
    for (let i = 0; i < hamletFlames.length; i++) {
      const fc = hamletFlames[i];
      fc.scale.set(0.92 + flicker * 0.08, 0.85 + Math.sin(elapsed * 11 + i * 2) * 0.2, 0.92 + flicker * 0.08);
      fc.rotation.y = elapsed * (1.2 + i * 0.4);
    }
    for (let i = 0; i < midIslandFlames.length; i++) {
      const fc = midIslandFlames[i];
      fc.scale.set(0.92 + flicker * 0.08, 0.85 + Math.cos(elapsed * 10 + i * 2) * 0.2, 0.92 + flicker * 0.08);
      fc.rotation.y = -elapsed * (1.3 + i * 0.35);
    }
    for (let i = 0; i < lanternFlames.length; i++) {
      const lf = lanternFlames[i];
      lf.scale.setScalar(0.92 + Math.sin(elapsed * 6.0 + i) * 0.1);
    }
    for (let i = 0; i < soulLanternFlames.length; i++) {
      const sf = soulLanternFlames[i];
      sf.rotation.y = elapsed * 1.2 + i;
      sf.scale.setScalar(0.9 + Math.sin(elapsed * 4.5 + i) * 0.12);
    }

    if (playerZ <= -280) {
      if (playerZ <= -584 && playerX > -145) {
        // Flooded Academy Grounds & Lake Causeway lighting
        if (Math.hypot(playerX - ACADEMY.bonfireX, playerZ - ACADEMY.bonfireZ) < 26) {
          forestHeroLight.color.setHex(0xff9b42);
          forestHeroLight.position.set(ACADEMY.bonfireX, ACADEMY.causewayY + 2.8, ACADEMY.bonfireZ);
          forestHeroLight.intensity = 15.0 * flicker;
        } else {
          forestHeroLight.color.setHex(0x8bb8e8);
          forestHeroLight.position.set(playerX, _playerY + 9.0, playerZ - 8);
          forestHeroLight.intensity = 11.0;
        }
        soulProximityLight.color.setHex(0x52d6ff);
        soulProximityLight.position.set(playerX, _playerY + 3.4, playerZ - 4);
        soulProximityLight.intensity = 10.5;
      } else if (playerX <= -145) {
        // Warm golden village hearth light centered near Ashenbrook Hamlet bonfire
        forestHeroLight.color.setHex(0xff9b42);
        forestHeroLight.position.set(HAMLET.bonfireX, hmy + 2.8, HAMLET.bonfireZ);
        forestHeroLight.intensity = 15.0 * flicker;

        soulProximityLight.color.setHex(0xffae52);
        soulProximityLight.position.set(Math.min(-150, playerX), hmy + 4.5, HAMLET.bonfireZ + 4);
        soulProximityLight.intensity = 8.5;
      } else if (Math.hypot(playerX - HINTERLAND.clearingCx, playerZ - HINTERLAND.clearingCz) < 26) {
        forestHeroLight.color.setHex(0xff9b42);
        forestHeroLight.position.set(HINTERLAND.clearingCx, hY + 2.4, HINTERLAND.clearingCz);
        forestHeroLight.intensity = 13.0 * flicker;
        soulProximityLight.color.setHex(0x64e2ff);
        soulProximityLight.position.set(0, hY + 3.0, -496);
        soulProximityLight.intensity = 8.0;
      } else if (playerX < -10) {
        // Warm lantern glow along Riverside Trail
        forestHeroLight.color.setHex(0x98c2de);
        forestHeroLight.position.set(playerX, hY + 7.0, playerZ - 5);
        forestHeroLight.intensity = 9.5;
        soulProximityLight.color.setHex(0xffaa4f);
        soulProximityLight.position.set(playerX, hY + 3.2, getRiversideTrailZ(playerX));
        soulProximityLight.intensity = 9.0;
      } else {
        forestHeroLight.color.setHex(0x88bae6);
        forestHeroLight.position.set(playerX, hY + 7.5, playerZ - 6);
        forestHeroLight.intensity = 10.5;

        let bestLx = 0;
        let bestLz = -306;
        if (playerX > 18) {
          bestLx = 29.5;
          bestLz = -466.5;
        } else if (playerZ < -550) {
          bestLx = 0;
          bestLz = -592.0;
        } else {
          let bestD = Infinity;
          for (let i = 0; i < lanternCoords.length; i++) {
            const [lx, lz] = lanternCoords[i];
            const d = (lx - playerX) * (lx - playerX) + (lz - playerZ) * (lz - playerZ);
            if (d < bestD) {
              bestD = d;
              bestLx = lx;
              bestLz = lz;
            }
          }
        }
        soulProximityLight.color.setHex(0x64e2ff);
        soulProximityLight.position.set(bestLx, hY + 3.0, bestLz);
        soulProximityLight.intensity = 11.5;
      }
    } else {
      forestHeroLight.intensity = 0;
      soulProximityLight.intensity = 0;
    }
  };

  return { academyCastleGroup, update };
}
