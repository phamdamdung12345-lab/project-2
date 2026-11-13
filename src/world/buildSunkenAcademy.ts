import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WorldTextureBundle } from './textures';
import {
  ACADEMY,
  getLakeCausewayX,
  getLakeCausewayY,
} from './terrainMath';

export interface SunkenAcademyParams {
  interiorGroup: THREE.Group;
  textures: WorldTextureBundle;
  stoneMat: THREE.MeshStandardMaterial;
  flagstoneMat: THREE.MeshStandardMaterial;
  marbleMat: THREE.MeshStandardMaterial;
  barkMat: THREE.MeshStandardMaterial;
  ironMat: THREE.MeshStandardMaterial;
  dampMasonryMat: THREE.MeshStandardMaterial;
  arcaneSlateMat: THREE.MeshStandardMaterial;
  soulCyanMat: THREE.MeshBasicMaterial;
  flameMat: THREE.MeshBasicMaterial;
  amberLanternMat: THREE.MeshStandardMaterial;
  track: <T extends { dispose: () => void }>(item: T) => T;
  addWalkable: <T extends THREE.Object3D>(mesh: T) => T;
  createArchShape: (width: number, height: number, thickness: number) => THREE.Shape;
  createPointedWindowShape: (w: number, h: number) => THREE.Shape;
  buildBonfireCluster: (bx: number, by: number, bz: number) => THREE.Mesh[];
}

export interface SunkenAcademyHandles {
  academyCastleGroup: THREE.Group;
  lakeUniforms: { uTime: { value: number } };
  midIslandFlames: THREE.Mesh[];
  lanternFlames: THREE.Mesh[];
}

function createVerticallyStriatedRockTexture(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const albedoC = document.createElement('canvas');
  albedoC.width = size;
  albedoC.height = size;
  const aCtx = albedoC.getContext('2d')!;

  const bumpC = document.createElement('canvas');
  bumpC.width = size;
  bumpC.height = size;
  const bCtx = bumpC.getContext('2d')!;

  aCtx.fillStyle = '#25282e';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  let seed = 8841;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Vertical basalt/slate striations & jagged fracture seams
  for (let i = 0; i < 220; i++) {
    const x = rand() * size;
    const w = 2 + rand() * 14;
    const shade = Math.floor((rand() - 0.5) * 28);
    const r = Math.max(16, 38 + shade);
    const g = Math.max(18, 41 + shade);
    const b = Math.max(22, 47 + shade);
    aCtx.fillStyle = `rgba(${r},${g},${b},0.65)`;
    aCtx.fillRect(x, 0, w, size);

    const bv = Math.max(20, Math.min(235, 128 + shade * 3));
    bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.7)`;
    bCtx.fillRect(x, 0, w, size);
  }

  // Sharp vertical dark cleavage cracks
  for (let i = 0; i < 110; i++) {
    let cx = rand() * size;
    let cy = 0;
    aCtx.strokeStyle = rand() > 0.35 ? 'rgba(14,16,20,0.72)' : 'rgba(92,98,108,0.28)';
    aCtx.lineWidth = 1 + rand() * 2.5;
    bCtx.strokeStyle = rand() > 0.35 ? 'rgba(22,22,22,0.8)' : 'rgba(215,215,215,0.4)';
    bCtx.lineWidth = aCtx.lineWidth;
    aCtx.beginPath();
    bCtx.beginPath();
    aCtx.moveTo(cx, cy);
    bCtx.moveTo(cx, cy);
    while (cy < size) {
      cy += 24 + rand() * 34;
      cx += (rand() - 0.5) * 10;
      aCtx.lineTo(cx, cy);
      bCtx.lineTo(cx, cy);
    }
    aCtx.stroke();
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(albedoC);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 2);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpC);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 2);
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

function createWeatheredLimestoneTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#757772';
  ctx.fillRect(0, 0, size, size);

  let seed = 4192;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const rows = 10;
  const cols = 5;
  const rh = size / rows;
  const cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const x = col * cw + off;
      const y = r * rh;
      const v = 112 + Math.floor((rand() - 0.5) * 26);
      ctx.fillStyle = `rgb(${v + 4},${v + 3},${v - 3})`;
      ctx.fillRect(x + 2, y + 2, cw - 4, rh - 4);
      ctx.fillStyle = 'rgba(220, 218, 206, 0.14)';
      ctx.fillRect(x + 2, y + 2, cw - 4, 3);
      ctx.fillStyle = 'rgba(22, 26, 30, 0.34)';
      ctx.fillRect(x + 2, y + rh - 5, cw - 4, 4);
    }
  }

  for (let i = 0; i < 1800; i++) {
    const px = rand() * size;
    const py = rand() * size;
    ctx.fillStyle = rand() > 0.45 ? 'rgba(28,34,38,0.18)' : 'rgba(205,202,190,0.12)';
    ctx.fillRect(px, py, 2 + rand() * 6, 2 + rand() * 5);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createAstrolabeMedallionTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = '#333b44';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#d4ba7a';
  ctx.lineWidth = 6;
  for (const r of [230, 185, 130, 68]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = '#8ec8dc';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 68, cy + Math.sin(a) * 68);
    ctx.lineTo(cx + Math.cos(a) * 230, cy + Math.sin(a) * 230);
    ctx.stroke();
  }

  ctx.fillStyle = '#d4ba7a';
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds a single solid pointed Gothic arch frame (outer rectangle with lancet arch cutout)
 * for crisp InstancedMesh arcade walls and viaduct bays.
 */
function createGothicBayGeometry(
  bayWidth: number,
  bayHeight: number,
  archWidth: number,
  archHeight: number,
  depth: number,
): THREE.BufferGeometry {
  const hw = bayWidth * 0.5;
  const aw = archWidth * 0.5;
  const springY = archHeight * 0.54;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, bayHeight);
  shape.lineTo(-hw, bayHeight);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-aw, 0);
  hole.lineTo(-aw, springY);
  hole.quadraticCurveTo(-aw, archHeight * 0.9, 0, archHeight);
  hole.quadraticCurveTo(aw, archHeight * 0.9, aw, springY);
  hole.lineTo(aw, 0);
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.06,
    bevelThickness: 0.06,
    curveSegments: 10,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a pointed Gothic pediment gable front wall with recessed lancet arch cutout.
 */
function createGableArchWallGeometry(
  width: number,
  eaveH: number,
  peakH: number,
  archW: number,
  archH: number,
  depth: number,
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const aw = archW * 0.5;
  const springY = archH * 0.54;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, eaveH);
  shape.lineTo(0, peakH);
  shape.lineTo(-hw, eaveH);
  shape.closePath();

  if (archW > 0 && archH > 0) {
    const hole = new THREE.Path();
    hole.moveTo(-aw, 0);
    hole.lineTo(-aw, springY);
    hole.quadraticCurveTo(-aw, archH * 0.9, 0, archH);
    hole.quadraticCurveTo(aw, archH * 0.9, aw, springY);
    hole.lineTo(aw, 0);
    hole.closePath();
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 12,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a steep pitched slate roof prism spanning along Z (`length`) with width along X (`width`).
 */
function createSteepRoofGeometry(width: number, height: number, length: number): THREE.BufferGeometry {
  const hw = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(0, height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(0, 0, -length * 0.5);
  geo.computeVertexNormals();
  return geo;
}

export function buildSunkenAcademy({
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
  amberLanternMat,
  track,
  addWalkable,
  createArchShape,
  createPointedWindowShape,
  buildBonfireCluster,
}: SunkenAcademyParams): SunkenAcademyHandles {
  const dummy = new THREE.Object3D();
  const lanternFlames: THREE.Mesh[] = [];

  // =========================================================================
  // 1. DEDICATED ARCHITECTURAL MATERIALS (Limestone, Slate-Blue, Charcoal Cliff, Gold & Teal)
  // =========================================================================
  const rockTex = createVerticallyStriatedRockTexture();
  track(rockTex.map);
  track(rockTex.bumpMap);
  const striatedCliffMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: rockTex.map,
      bumpMap: rockTex.bumpMap,
      bumpScale: 0.24,
      roughness: 0.94,
      metalness: 0.04,
    }),
  );

  const limestoneTex = track(createWeatheredLimestoneTexture());
  const limestoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd8d6ce,
      map: limestoneTex,
      bumpMap: textures.mossyStone.bumpMap,
      bumpScale: 0.09,
      roughnessMap: textures.mossyStone.roughnessMap,
      roughness: 0.88,
      metalness: 0.03,
    }),
  );

  const carvedRibMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xbcb8aa,
      bumpMap: textures.flagstone.bumpMap,
      bumpScale: 0.05,
      roughness: 0.78,
      metalness: 0.05,
    }),
  );

  const slateRoofMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1d2b3b,
      bumpMap: textures.gildedRoof.bumpMap,
      bumpScale: 0.08,
      roughness: 0.52,
      metalness: 0.22,
    }),
  );

  const goldLancetMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf4b545,
      emissive: new THREE.Color(0xd97e18),
      emissiveIntensity: 1.45,
      roughness: 0.25,
      metalness: 0.04,
    }),
  );

  const roseGlassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfbe08a,
      emissive: new THREE.Color(0xe69a24),
      emissiveIntensity: 1.55,
      roughness: 0.2,
      metalness: 0.05,
    }),
  );

  const blackIronMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1a1c20,
      roughness: 0.42,
      metalness: 0.84,
    }),
  );

  const veiledStatueMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x353a42,
      bumpMap: textures.darkMarble.bumpMap,
      bumpScale: 0.05,
      roughness: 0.86,
      metalness: 0.08,
    }),
  );

  const autumnFoliageMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.02,
    }),
  );

  const astrolabeTex = track(createAstrolabeMedallionTexture());
  const astrolabeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: astrolabeTex,
      roughness: 0.58,
      metalness: 0.18,
    }),
  );

  // =========================================================================
  // 2. TURQUOISE-TEAL FLOODED LAKE & EXPANSIVE CAMPUS TERRACES (-610..-1120)
  // =========================================================================
  const lakeUniforms = { uTime: { value: 0 } };
  const lakeWaterMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x134b5f,
      emissive: new THREE.Color(0x0b3242),
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.58,
    }),
  );
  lakeWaterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = lakeUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vLakePos;
         uniform float uTime;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vLakePos = (modelMatrix * vec4(transformed, 1.0)).xyz;
         transformed.y += sin(vLakePos.x * 0.16 + uTime * 1.05) * 0.04 + cos(vLakePos.z * 0.21 - uTime * 0.85) * 0.04;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vLakePos;
         uniform float uTime;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `float lW1 = sin(vLakePos.x * 0.28 + uTime * 1.2 + vLakePos.z * 0.17) * 0.5 + 0.5;
         float lW2 = cos(vLakePos.x * 0.14 - vLakePos.z * 0.36 + uTime * 0.9) * 0.5 + 0.5;
         float lGlint = smoothstep(0.62, 0.98, lW1 * lW2);
         gl_FragColor.rgb += vec3(0.24, 0.54, 0.62) * lGlint * 0.68;
         #include <dithering_fragment>`,
      );
  };

  const lakePlane = new THREE.Mesh(track(new THREE.PlaneGeometry(780, 740, 48, 48)), lakeWaterMat);
  lakePlane.rotation.x = -Math.PI / 2;
  lakePlane.position.set(0, ACADEMY.lakeWaterY, -900.0);
  interiorGroup.add(lakePlane);

  // Winding Sunken Cobblestone Causeway (-610 -> -820) — exact match with terrainMath.ts
  const causewaySegs = 82;
  const causewaySlabGeo = track(new THREE.BoxGeometry(8.4, 0.9, 3.05));
  const causewaySlabs = addWalkable(new THREE.InstancedMesh(causewaySlabGeo, dampMasonryMat, causewaySegs));
  causewaySlabs.receiveShadow = true;

  const parapetPostGeo = track(new THREE.BoxGeometry(0.55, 1.05, 0.65));
  const causewayParapets: Array<{ x: number; y: number; z: number; h: number }> = [];
  const causewayLanterns: Array<[number, number, number]> = [];

  for (let i = 0; i < causewaySegs; i++) {
    const z = THREE.MathUtils.lerp(ACADEMY.causewayStartZ, ACADEMY.castleBaseZ, (i + 0.5) / causewaySegs);
    const cx = getLakeCausewayX(z);
    const cy = getLakeCausewayY(z);
    dummy.position.set(cx, cy - 0.46, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    causewaySlabs.setMatrixAt(i, dummy.matrix);

    if (i % 3 === 0 && Math.abs(z - ACADEMY.midIslandCz) > 9.5 && z > -811.0) {
      const side = i % 2 === 0 ? -1 : 1;
      causewayParapets.push({
        x: cx + side * 4.05,
        y: cy + 0.4,
        z,
        h: 0.75 + (i % 4) * 0.22,
      });
    }
    if (i % 6 === 3 && Math.abs(z - ACADEMY.midIslandCz) > 9.0 && z > -808) {
      const side = (i / 3) % 2 === 0 ? -1 : 1;
      causewayLanterns.push([cx + side * 3.7, cy, z]);
    }
  }
  causewaySlabs.instanceMatrix.needsUpdate = true;
  causewaySlabs.computeBoundingBox();
  causewaySlabs.computeBoundingSphere();
  interiorGroup.add(causewaySlabs);

  const parapetInst = new THREE.InstancedMesh(parapetPostGeo, limestoneMat, causewayParapets.length);
  causewayParapets.forEach((p, idx) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, (idx % 3 - 1) * 0.08, 0);
    dummy.scale.set(1, p.h, 1);
    dummy.updateMatrix();
    parapetInst.setMatrixAt(idx, dummy.matrix);
  });
  parapetInst.instanceMatrix.needsUpdate = true;
  parapetInst.computeBoundingSphere();
  interiorGroup.add(parapetInst);

  // Mid-Lake Shrine Island (x = 11.4, z = -700) & 6th Active Bonfire
  const midIsland = addWalkable(
    new THREE.Mesh(
      track(new THREE.CylinderGeometry(ACADEMY.midIslandRadius, ACADEMY.midIslandRadius + 1.6, 1.4, 24)),
      flagstoneMat,
    ),
  );
  midIsland.position.set(ACADEMY.midIslandCx, ACADEMY.causewayY - 0.55, ACADEMY.midIslandCz);
  midIsland.receiveShadow = true;
  interiorGroup.add(midIsland);

  const midIslandFlames = buildBonfireCluster(ACADEMY.bonfireX, ACADEMY.causewayY + 0.15, ACADEMY.bonfireZ);

  const ruinIslandArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(4.8, 6.2, 1.1), { depth: 1.4, bevelEnabled: false }),
  );
  ruinIslandArchGeo.translate(0, 0, -0.7);
  // Frame the north/east rim of the island so approach & spawn sightlines to the bonfire stay wide open
  for (const ang of [-1.25, -0.25, 0.75]) {
    const rArch = new THREE.Mesh(ruinIslandArchGeo, limestoneMat);
    rArch.position.set(
      ACADEMY.midIslandCx + Math.cos(ang) * 8.6,
      ACADEMY.causewayY - 0.1,
      ACADEMY.midIslandCz + Math.sin(ang) * 8.6,
    );
    rArch.rotation.y = -ang + Math.PI / 2;
    interiorGroup.add(rArch);
  }
  for (const [lx, lz] of [
    [ACADEMY.midIslandCx - 4.8, ACADEMY.midIslandCz - 5.2],
    [ACADEMY.midIslandCx + 4.8, ACADEMY.midIslandCz + 5.2],
  ]) {
    causewayLanterns.push([lx, ACADEMY.causewayY + 0.15, lz]);
  }

  // Instanced Campus Lampposts along causeway (dark iron + warm amber lantern cages)
  const gPostGeo = track(new THREE.CylinderGeometry(0.14, 0.22, 2.9, 6));
  gPostGeo.translate(0, 1.45, 0);
  const gCapGeo = track(new THREE.ConeGeometry(0.42, 0.5, 6));
  gCapGeo.translate(0, 3.35, 0);
  const gOrbGeo = track(new THREE.OctahedronGeometry(0.24, 0));
  gOrbGeo.translate(0, 2.9, 0);

  const lakeLPosts = new THREE.InstancedMesh(gPostGeo, blackIronMat, causewayLanterns.length);
  const lakeLCaps = new THREE.InstancedMesh(gCapGeo, blackIronMat, causewayLanterns.length);
  const lakeLOrbs = new THREE.InstancedMesh(gOrbGeo, amberLanternMat, causewayLanterns.length);
  causewayLanterns.forEach(([lx, ly, lz], idx) => {
    dummy.position.set(lx, ly, lz);
    dummy.rotation.set(0, idx * 0.5, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lakeLPosts.setMatrixAt(idx, dummy.matrix);
    lakeLCaps.setMatrixAt(idx, dummy.matrix);
    lakeLOrbs.setMatrixAt(idx, dummy.matrix);
  });
  lakeLPosts.instanceMatrix.needsUpdate = true;
  lakeLCaps.instanceMatrix.needsUpdate = true;
  lakeLOrbs.instanceMatrix.needsUpdate = true;
  lakeLPosts.computeBoundingSphere();
  lakeLCaps.computeBoundingSphere();
  lakeLOrbs.computeBoundingSphere();
  interiorGroup.add(lakeLPosts, lakeLCaps, lakeLOrbs);

  // =========================================================================
  // 2B. EXPANSIVE FLOODED CAMPUS TERRACES, SUNKEN PLAZAS & BROKEN COLONNADES
  // =========================================================================
  // Multi-level half-submerged stone plazas & secondary causeway spurs flanking the approach
  const terraceSpecs: Array<{ x: number; y: number; z: number; w: number; d: number; ry: number }> = [
    // East & West Outer Campus Half-Submerged Plazas near Outer Gate (-625..-665)
    { x: -24.0, y: ACADEMY.lakeWaterY + 0.12, z: -632.0, w: 26.0, d: 22.0, ry: 0.08 },
    { x: 26.0, y: ACADEMY.lakeWaterY + 0.18, z: -636.0, w: 28.0, d: 24.0, ry: -0.06 },
    // Mid-Lake Sunken Quadrangles & Broken Pier Spurs (-675..-755)
    { x: -28.0, y: ACADEMY.lakeWaterY + 0.08, z: -688.0, w: 24.0, d: 28.0, ry: 0.12 },
    { x: 34.0, y: ACADEMY.lakeWaterY + 0.25, z: -702.0, w: 22.0, d: 26.0, ry: -0.1 },
    { x: -22.0, y: ACADEMY.lakeWaterY + 0.35, z: -746.0, w: 26.0, d: 22.0, ry: 0.04 },
    { x: 26.0, y: ACADEMY.lakeWaterY + 0.28, z: -754.0, w: 24.0, d: 24.0, ry: -0.05 },
    // Lower Flooded Courtyard Flanking Terraces near Academy Base (-782..-808)
    { x: -25.0, y: ACADEMY.lakeWaterY + 0.42, z: -792.0, w: 22.0, d: 24.0, ry: 0.0 },
    { x: 25.0, y: ACADEMY.lakeWaterY + 0.42, z: -792.0, w: 22.0, d: 24.0, ry: 0.0 },
  ];

  const plazaSlabGeo = track(new THREE.BoxGeometry(1, 2.2, 1));
  const campusPlazas = new THREE.InstancedMesh(plazaSlabGeo, limestoneMat, terraceSpecs.length);
  const plazaTrimGeo = track(new THREE.BoxGeometry(1.04, 0.28, 1.04));
  const campusPlazaTrims = new THREE.InstancedMesh(plazaTrimGeo, carvedRibMat, terraceSpecs.length);
  campusPlazas.receiveShadow = true;

  terraceSpecs.forEach((ts, idx) => {
    dummy.position.set(ts.x, ts.y - 1.1, ts.z);
    dummy.rotation.set(0, ts.ry, 0);
    dummy.scale.set(ts.w, 1, ts.d);
    dummy.updateMatrix();
    campusPlazas.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(ts.x, ts.y - 0.14, ts.z);
    dummy.scale.set(ts.w, 1, ts.d);
    dummy.updateMatrix();
    campusPlazaTrims.setMatrixAt(idx, dummy.matrix);
  });
  campusPlazas.instanceMatrix.needsUpdate = true;
  campusPlazaTrims.instanceMatrix.needsUpdate = true;
  campusPlazas.computeBoundingSphere();
  campusPlazaTrims.computeBoundingSphere();
  interiorGroup.add(campusPlazas, campusPlazaTrims);

  // Sunken Stairways & Broken Colonnades rising from the half-submerged plazas
  const colonnadeBayGeo = track(createGothicBayGeometry(5.6, 8.6, 3.6, 6.8, 1.4));
  const colonnadeTransforms: Array<{ x: number; y: number; z: number; ry: number; s: number }> = [];
  for (const [cx, cz, ry, count] of [
    [-25.0, -626.0, 0.08, 4],
    [27.0, -630.0, -0.06, 4],
    [-29.0, -682.0, 0.12, 4],
    [35.0, -696.0, -0.1, 3],
    [-23.0, -740.0, 0.04, 4],
    [27.0, -748.0, -0.05, 4],
    [-24.0, -784.0, 0.0, 3],
    [24.0, -784.0, 0.0, 3],
  ] as const) {
    for (let b = 0; b < count; b++) {
      if ((b + count) % 5 === 4) continue; // natural broken gap
      const dx = Math.sin(ry) * (b * 5.6);
      const dz = -Math.cos(ry) * (b * 5.6);
      colonnadeTransforms.push({
        x: cx + dx,
        y: ACADEMY.lakeWaterY + 0.15,
        z: cz + dz,
        ry: ry + Math.PI / 2,
        s: 0.95 + (b % 2) * 0.08,
      });
    }
  }
  const campusColonnades = new THREE.InstancedMesh(colonnadeBayGeo, limestoneMat, colonnadeTransforms.length);
  colonnadeTransforms.forEach((ct, idx) => {
    dummy.position.set(ct.x, ct.y, ct.z);
    dummy.rotation.set(0, ct.ry, 0);
    dummy.scale.setScalar(ct.s);
    dummy.updateMatrix();
    campusColonnades.setMatrixAt(idx, dummy.matrix);
  });
  campusColonnades.instanceMatrix.needsUpdate = true;
  campusColonnades.computeBoundingSphere();
  interiorGroup.add(campusColonnades);

  // Sunken Stone Stairways dipping directly into the turquoise lake waters from the plazas
  const sunkenStepGeo = track(new THREE.BoxGeometry(6.8, 0.45, 1.1));
  const sunkenStepCoords: Array<{ x: number; y: number; z: number; ry: number }> = [];
  for (const [sx, sz, sry] of [
    [-12.0, -632.0, Math.PI / 2],
    [13.0, -636.0, -Math.PI / 2],
    [-16.0, -688.0, Math.PI / 2],
    [-11.0, -746.0, Math.PI / 2],
    [14.0, -754.0, -Math.PI / 2],
    [-14.5, -792.0, Math.PI / 2],
    [14.5, -792.0, -Math.PI / 2],
  ]) {
    for (let st = 0; st < 6; st++) {
      const fwdX = Math.sin(sry) * (st * 0.95);
      const fwdZ = Math.cos(sry) * (st * 0.95);
      sunkenStepCoords.push({
        x: sx + fwdX,
        y: ACADEMY.lakeWaterY + 0.22 - st * 0.28,
        z: sz + fwdZ,
        ry: sry,
      });
    }
  }
  const sunkenStairsInst = new THREE.InstancedMesh(sunkenStepGeo, flagstoneMat, sunkenStepCoords.length);
  sunkenStepCoords.forEach((ss, idx) => {
    dummy.position.set(ss.x, ss.y, ss.z);
    dummy.rotation.set(0, ss.ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    sunkenStairsInst.setMatrixAt(idx, dummy.matrix);
  });
  sunkenStairsInst.instanceMatrix.needsUpdate = true;
  sunkenStairsInst.computeBoundingSphere();
  interiorGroup.add(sunkenStairsInst);

  // =========================================================================
  // 2C. TILTED & PARTIALLY SUBMERGED SUNKEN CASTLE RUINS IN DISTANT LAKE (15°–35° TILT)
  // =========================================================================
  // Composite multi-bay broken arched viaduct spans emerging from the lake at 15–35° angles
  const sunkenSpanBay = createGothicBayGeometry(6.8, 11.5, 4.4, 8.2, 2.2);
  const sunkenSpanB1 = sunkenSpanBay.clone();
  sunkenSpanB1.translate(-6.8, 0, 0);
  const sunkenSpanB2 = sunkenSpanBay.clone();
  const sunkenSpanB3 = sunkenSpanBay.clone();
  sunkenSpanB3.translate(6.8, 0, 0);
  const tiltedViaductGeo = track(mergeGeometries([sunkenSpanB1, sunkenSpanB2, sunkenSpanB3])!);
  sunkenSpanBay.dispose();
  sunkenSpanB1.dispose();
  sunkenSpanB2.dispose();
  sunkenSpanB3.dispose();

  const sunkenViaductSpecs: Array<{ x: number; z: number; ry: number; tiltX: number; tiltZ: number; s: number }> = [
    // Mid-lake foreground tilted arches clearly visible from Outer Gatehouse & Causeway
    { x: -38, z: -648, ry: 0.36, tiltX: 0.28, tiltZ: -0.34, s: 1.12 },
    { x: 42, z: -658, ry: -0.42, tiltX: -0.26, tiltZ: 0.36, s: 1.18 },
    { x: -56, z: -708, ry: 0.62, tiltX: 0.34, tiltZ: -0.28, s: 1.28 },
    { x: 58, z: -724, ry: -0.55, tiltX: -0.32, tiltZ: 0.38, s: 1.32 },
    // Outer & deep lake tilted ruins
    { x: -96, z: -745, ry: 0.85, tiltX: 0.42, tiltZ: 0.26, s: 1.45 },
    { x: 92, z: -762, ry: -0.78, tiltX: -0.36, tiltZ: -0.44, s: 1.4 },
    { x: -135, z: -830, ry: 0.32, tiltX: 0.48, tiltZ: -0.31, s: 1.6 },
    { x: 138, z: -845, ry: -0.35, tiltX: 0.38, tiltZ: 0.45, s: 1.55 },
    { x: -115, z: -965, ry: 1.1, tiltX: -0.44, tiltZ: 0.32, s: 1.7 },
    { x: 122, z: -980, ry: -0.92, tiltX: 0.36, tiltZ: -0.48, s: 1.75 },
  ];
  const sunkenViaducts = new THREE.InstancedMesh(tiltedViaductGeo, limestoneMat, sunkenViaductSpecs.length);
  sunkenViaductSpecs.forEach((sv, idx) => {
    dummy.position.set(sv.x, ACADEMY.lakeWaterY - 2.2, sv.z);
    dummy.rotation.set(sv.tiltX, sv.ry, sv.tiltZ);
    dummy.scale.setScalar(sv.s);
    dummy.updateMatrix();
    sunkenViaducts.setMatrixAt(idx, dummy.matrix);
  });
  sunkenViaducts.instanceMatrix.needsUpdate = true;
  sunkenViaducts.computeBoundingSphere();
  interiorGroup.add(sunkenViaducts);

  // Leaning Gothic Spires & Fractured Towers jutting from the misty turquoise lake (18°–35°)
  const ruinTowerShaftGeo = track(new THREE.CylinderGeometry(2.6, 3.3, 24.0, 8));
  ruinTowerShaftGeo.translate(0, 12.0, 0);
  const ruinTowerRoofGeo = track(new THREE.ConeGeometry(3.4, 14.0, 8));
  ruinTowerRoofGeo.translate(0, 31.0, 0);
  const sunkenSpireSpecs: Array<{ x: number; z: number; ry: number; tiltX: number; tiltZ: number; s: number }> = [
    { x: -46, z: -678, ry: 0.3, tiltX: 0.32, tiltZ: 0.28, s: 1.05 },
    { x: 48, z: -686, ry: -0.5, tiltX: -0.36, tiltZ: -0.26, s: 1.1 },
    { x: -58, z: -732, ry: 0.4, tiltX: 0.32, tiltZ: 0.28, s: 1.15 },
    { x: 64, z: -746, ry: -0.7, tiltX: -0.42, tiltZ: -0.26, s: 1.25 },
    { x: -118, z: -788, ry: 1.2, tiltX: 0.46, tiltZ: -0.34, s: 1.4 },
    { x: 112, z: -805, ry: -1.1, tiltX: -0.34, tiltZ: 0.48, s: 1.35 },
    { x: -158, z: -905, ry: 0.6, tiltX: 0.52, tiltZ: 0.29, s: 1.55 },
    { x: 164, z: -918, ry: -0.5, tiltX: -0.38, tiltZ: -0.51, s: 1.6 },
    { x: -86, z: -1020, ry: 0.9, tiltX: 0.44, tiltZ: -0.36, s: 1.65 },
    { x: 88, z: -1035, ry: -0.8, tiltX: -0.46, tiltZ: 0.34, s: 1.7 },
  ];
  const sunkenTowerShafts = new THREE.InstancedMesh(ruinTowerShaftGeo, limestoneMat, sunkenSpireSpecs.length);
  const sunkenTowerRoofs = new THREE.InstancedMesh(ruinTowerRoofGeo, slateRoofMat, sunkenSpireSpecs.length);
  sunkenSpireSpecs.forEach((st, idx) => {
    dummy.position.set(st.x, ACADEMY.lakeWaterY - 6.0, st.z);
    dummy.rotation.set(st.tiltX, st.ry, st.tiltZ);
    dummy.scale.setScalar(st.s);
    dummy.updateMatrix();
    sunkenTowerShafts.setMatrixAt(idx, dummy.matrix);
    sunkenTowerRoofs.setMatrixAt(idx, dummy.matrix);
  });
  sunkenTowerShafts.instanceMatrix.needsUpdate = true;
  sunkenTowerRoofs.instanceMatrix.needsUpdate = true;
  sunkenTowerShafts.computeBoundingSphere();
  sunkenTowerRoofs.computeBoundingSphere();
  interiorGroup.add(sunkenTowerShafts, sunkenTowerRoofs);

  // =========================================================================
  // 3. SUNKEN ARCANE ACADEMY CITADEL (academyCastleGroup)
  //    Pivoted at Approach Stair Base: (0, -13.65, -820.0)
  //    100% Exterior Only · Clean Grid · Heavy InstancedMesh · Zero Z-Fighting
  // =========================================================================
  const academyCastleGroup = new THREE.Group();
  academyCastleGroup.position.set(ACADEMY.castleBaseX, ACADEMY.castleBaseY, ACADEMY.castleBaseZ);
  interiorGroup.add(academyCastleGroup);

  const buildLocalStairFlight = (
    width: number,
    zMax: number,
    zMin: number,
    yStart: number,
    yEnd: number,
    steps: number,
    mat: THREE.Material,
  ) => {
    const len = zMax - zMin;
    const stepDepth = (len / steps) * 1.16;
    const stepRise = Math.abs(yEnd - yStart) / steps;
    const thick = Math.max(0.45, stepRise + 0.16);
    const geo = track(new THREE.BoxGeometry(width, thick, stepDepth));
    const mesh = addWalkable(new THREE.InstancedMesh(geo, mat, steps));
    mesh.receiveShadow = true;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const sz = THREE.MathUtils.lerp(zMax, zMin, t);
      const sy = THREE.MathUtils.lerp(yStart, yEnd, t) - thick * 0.5;
      dummy.position.set(0, sy, sz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    academyCastleGroup.add(mesh);
  };

  // -------------------------------------------------------------------------
  // 3A. PLAYABLE CEREMONIAL STAIRCASE, LANDING & GRAND FORECOURT (local z: 0 -> -76)
  // -------------------------------------------------------------------------
  // 1. Lower Cascading Staircase (local z: 0 -> -22, y: 0 -> +10)
  buildLocalStairFlight(14.0, 0.0, -22.0, 0.0, 10.0, 26, flagstoneMat);

  // 2. Mid Astrolabe Landing (local z: -22 -> -32, y: +10)
  const midLanding = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(22.0, 14.0, 10.4)), limestoneMat));
  midLanding.position.set(0, 3.0, -27.0);
  midLanding.receiveShadow = true;
  academyCastleGroup.add(midLanding);

  const midMosaic = new THREE.Mesh(track(new THREE.CircleGeometry(4.2, 32)), astrolabeMat);
  midMosaic.rotation.x = -Math.PI / 2;
  midMosaic.position.set(0, 10.025, -27.0);
  academyCastleGroup.add(midMosaic);

  // 3. Upper Grand Stairway (local z: -32 -> -54, y: +10 -> +20)
  buildLocalStairFlight(12.0, -32.0, -54.0, 10.0, 20.0, 26, flagstoneMat);

  // 4. Grand Cathedral Forecourt Terrace (local z: -54 -> -76, y: +20)
  const forecourtMesh = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(28.0, 24.0, 22.5)), limestoneMat));
  forecourtMesh.position.set(0, 8.0, -65.0);
  forecourtMesh.receiveShadow = true;
  academyCastleGroup.add(forecourtMesh);

  // Solid stone wing terraces flanking Forecourt to seat balustrades, cliffs & autumn tree groves
  for (const side of [-1, 1]) {
    const wingTerrace = new THREE.Mesh(track(new THREE.BoxGeometry(16.0, 25.0, 26.0)), limestoneMat);
    wingTerrace.position.set(side * 22.0, 7.0, -64.0);
    academyCastleGroup.add(wingTerrace);
  }

  // Solid recessed sloped stair foundation bases
  const lowerStairBase = new THREE.Mesh(track(new THREE.BoxGeometry(14.6, 14.0, 23.8)), striatedCliffMat);
  lowerStairBase.position.set(0, -3.5, -11.0);
  lowerStairBase.rotation.x = Math.atan2(10, 22);
  academyCastleGroup.add(lowerStairBase);

  const upperStairBase = new THREE.Mesh(track(new THREE.BoxGeometry(12.6, 14.0, 23.8)), limestoneMat);
  upperStairBase.position.set(0, 6.5, -43.0);
  upperStairBase.rotation.x = Math.atan2(10, 22);
  academyCastleGroup.add(upperStairBase);

  // Pierced Gothic Stone Balustrades (InstancedMesh) lining Lower Stair, Mid Landing, Upper Stair & Forecourt
  const balBayGeo = track(createGothicBayGeometry(2.0, 1.35, 1.1, 0.95, 0.42));
  const balRailGeo = track(new THREE.BoxGeometry(2.05, 0.22, 0.56));
  const balTransforms: Array<{ x: number; y: number; z: number; rx: number; ry: number }> = [];
  const stairSlope = Math.atan2(10, 22);

  // Lower stair balustrades
  for (let i = 0; i < 11; i++) {
    const t = (i + 0.5) / 11;
    const bz = THREE.MathUtils.lerp(0, -22, t);
    const by = THREE.MathUtils.lerp(0, 10, t);
    for (const side of [-1, 1]) {
      balTransforms.push({ x: side * 7.2, y: by, z: bz, rx: stairSlope, ry: Math.PI / 2 });
    }
  }
  // Mid-landing side balustrades
  for (let i = 0; i < 5; i++) {
    const bz = THREE.MathUtils.lerp(-23, -31, i / 4);
    for (const side of [-1, 1]) {
      balTransforms.push({ x: side * 10.8, y: 10.0, z: bz, rx: 0, ry: Math.PI / 2 });
    }
  }
  // Upper stair balustrades
  for (let i = 0; i < 11; i++) {
    const t = (i + 0.5) / 11;
    const bz = THREE.MathUtils.lerp(-32, -54, t);
    const by = THREE.MathUtils.lerp(10, 20, t);
    for (const side of [-1, 1]) {
      balTransforms.push({ x: side * 6.2, y: by, z: bz, rx: stairSlope, ry: Math.PI / 2 });
    }
  }
  // Forecourt side balustrades
  for (let i = 0; i < 10; i++) {
    const bz = THREE.MathUtils.lerp(-55.5, -74.5, i / 9);
    for (const side of [-1, 1]) {
      balTransforms.push({ x: side * 13.8, y: 20.0, z: bz, rx: 0, ry: Math.PI / 2 });
    }
  }

  const balBaysInst = new THREE.InstancedMesh(balBayGeo, carvedRibMat, balTransforms.length);
  const balRailsInst = new THREE.InstancedMesh(balRailGeo, carvedRibMat, balTransforms.length);
  balTransforms.forEach((bt, idx) => {
    dummy.position.set(bt.x, bt.y, bt.z);
    dummy.rotation.set(0, bt.ry, bt.rx);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    balBaysInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(bt.x, bt.y + 1.38, bt.z);
    dummy.updateMatrix();
    balRailsInst.setMatrixAt(idx, dummy.matrix);
  });
  balBaysInst.instanceMatrix.needsUpdate = true;
  balRailsInst.instanceMatrix.needsUpdate = true;
  balBaysInst.computeBoundingSphere();
  balRailsInst.computeBoundingSphere();
  academyCastleGroup.add(balBaysInst, balRailsInst);

  // Forecourt Ornamental Wrought-Iron & Stone Arch Gate Screen at top of Upper Stair (local z = -54.2)
  // Wide open passable center (|x| <= 6.2) so player walks right through onto the Forecourt!
  const forecourtGateArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(12.2, 11.4, 1.35), { depth: 1.3, bevelEnabled: false }),
  );
  forecourtGateArchGeo.translate(0, 0, -0.65);
  const forecourtGateArch = new THREE.Mesh(forecourtGateArchGeo, limestoneMat);
  forecourtGateArch.position.set(0, 20.0, -54.2);
  academyCastleGroup.add(forecourtGateArch);

  // Ornamental black-iron radial fanlight tracery inside upper half of the Forecourt Gate Arch
  const gateTransomRing = new THREE.Mesh(track(new THREE.TorusGeometry(4.2, 0.14, 6, 24, Math.PI)), blackIronMat);
  gateTransomRing.position.set(0, 27.2, -54.2);
  academyCastleGroup.add(gateTransomRing);
  for (let r = -2; r <= 2; r++) {
    const spoke = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 4.4, 0.12)), blackIronMat);
    spoke.position.set(Math.sin(r * 0.42) * 2.1, 27.2 + Math.cos(r * 0.42) * 2.1, -54.2);
    spoke.rotation.z = -r * 0.42;
    academyCastleGroup.add(spoke);
  }
  for (const side of [-1, 1]) {
    const gPier = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 15.5, 2.6)), limestoneMat);
    gPier.position.set(side * 7.6, 27.7, -54.2);
    academyCastleGroup.add(gPier);
    const gPinnacle = new THREE.Mesh(track(new THREE.ConeGeometry(1.4, 6.8, 4)), carvedRibMat);
    gPinnacle.position.set(side * 7.6, 38.8, -54.2);
    gPinnacle.rotation.y = Math.PI / 4;
    academyCastleGroup.add(gPinnacle);
  }

  // Heavy Square Plinths Topped with Dark Shrouded / Veiled Scholar Statues (Composite 5-Part Group)
  const buildVeiledStatue = (sx: number, sy: number, sz: number, facingYaw: number, scale = 1.0) => {
    const sg = new THREE.Group();
    sg.position.set(sx, sy, sz);
    sg.rotation.y = facingYaw;
    sg.scale.setScalar(scale);
    academyCastleGroup.add(sg);

    // 1. Heavy square stone plinth + stepped cap
    const plinth = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 2.1, 2.2)), limestoneMat);
    plinth.position.y = 1.05;
    sg.add(plinth);
    const plinthCap = new THREE.Mesh(track(new THREE.BoxGeometry(2.45, 0.35, 2.45)), carvedRibMat);
    plinthCap.position.y = 2.25;
    sg.add(plinthCap);

    // 2. Draped lower robes
    const robeBase = new THREE.Mesh(track(new THREE.CylinderGeometry(0.55, 0.85, 1.9, 8)), veiledStatueMat);
    robeBase.position.y = 3.35;
    sg.add(robeBase);

    // 3. Cloaked upper torso & shoulders
    const torso = new THREE.Mesh(track(new THREE.CylinderGeometry(0.45, 0.62, 1.4, 8)), veiledStatueMat);
    torso.position.y = 4.65;
    sg.add(torso);

    // 4. Shrouded / veiled cowled head tilted forward in solemn contemplation
    const cowl = new THREE.Mesh(track(new THREE.ConeGeometry(0.42, 1.05, 7)), veiledStatueMat);
    cowl.position.set(0, 5.55, 0.12);
    cowl.rotation.x = 0.25;
    sg.add(cowl);

    // 5. Clasped stone tome / scholar's staff
    const staff = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.07, 2.8, 6)), blackIronMat);
    staff.position.set(0.46, 3.8, 0.42);
    staff.rotation.x = 0.12;
    sg.add(staff);
  };

  for (const side of [-1, 1]) {
    buildVeiledStatue(side * 8.2, 0.0, 0.2, -side * 0.45, 1.15);
    buildVeiledStatue(side * 9.5, 10.0, -25.0, -side * 0.65, 1.05);
    buildVeiledStatue(side * 11.4, 20.0, -58.5, -side * 0.55, 1.1);
    buildVeiledStatue(side * 11.4, 20.0, -68.5, -side * 0.55, 1.1);
  }

  // Ornate Black-Iron Lampposts with Gargoyle/Raven Perches Suspending Glowing Lanterns
  const buildRavenLamppost = (lx: number, ly: number, lz: number, inwardSign: number) => {
    const lg = new THREE.Group();
    lg.position.set(lx, ly, lz);
    academyCastleGroup.add(lg);

    // Stone base pedestal + slender fluted iron pole
    const base = new THREE.Mesh(track(new THREE.CylinderGeometry(0.32, 0.44, 0.8, 8)), carvedRibMat);
    base.position.y = 0.4;
    lg.add(base);
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.14, 4.4, 8)), blackIronMat);
    pole.position.y = 2.8;
    lg.add(pole);

    // Ornate cross-arm bracket pointing toward the walkway
    const arm = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 0.1, 0.1)), blackIronMat);
    arm.position.set(inwardSign * 0.48, 4.85, 0);
    lg.add(arm);

    // Perched Gargoyle / Raven silhouette on top of the post
    const ravenBody = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.28, 0)), blackIronMat);
    ravenBody.position.set(0, 5.18, 0);
    ravenBody.scale.set(0.9, 1.25, 1.3);
    lg.add(ravenBody);
    for (const wSide of [-1, 1]) {
      const wing = new THREE.Mesh(track(new THREE.ConeGeometry(0.24, 0.72, 4)), blackIronMat);
      wing.position.set(inwardSign * 0.08, 5.35, wSide * 0.28);
      wing.rotation.x = wSide * 0.65;
      wing.rotation.z = -inwardSign * 0.25;
      lg.add(wing);
    }

    // Hanging chain + glowing warm-gold lantern cage suspended from bracket
    const chain = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 5)), blackIronMat);
    chain.position.set(inwardSign * 0.96, 4.5, 0);
    lg.add(chain);
    const lCap = new THREE.Mesh(track(new THREE.ConeGeometry(0.32, 0.28, 6)), blackIronMat);
    lCap.position.set(inwardSign * 0.96, 4.18, 0);
    lg.add(lCap);
    const lGlow = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.24, 0)), amberLanternMat);
    lGlow.position.set(inwardSign * 0.96, 3.88, 0);
    lg.add(lGlow);
    lanternFlames.push(lGlow);
  };

  for (const side of [-1, 1]) {
    buildRavenLamppost(side * 6.8, 0.0, -2.8, -side);
    buildRavenLamppost(side * 6.8, 5.0, -11.0, -side);
    buildRavenLamppost(side * 9.8, 10.0, -29.2, -side);
    buildRavenLamppost(side * 5.8, 15.0, -43.0, -side);
    buildRavenLamppost(side * 10.6, 20.0, -63.0, -side);
    buildRavenLamppost(side * 10.6, 20.0, -72.0, -side);
  }

  // -------------------------------------------------------------------------
  // 3B. JAGGED VERTICALLY-STRIATED ROCK ISLAND & LOWER ARCHED AQUEDUCT BASE
  // -------------------------------------------------------------------------
  // Jagged faceted basalt cliff pillars & crag shelves (NO pointy wizard-hat cones beside the stairs!)
  const cragGeo = track(new THREE.CylinderGeometry(0.68, 1.15, 1, 7));
  cragGeo.translate(0, 0.5, 0);

  const cragSpecs: Array<{ x: number; y: number; z: number; rx: number; h: number; rz: number; rot: number }> = [
    // Low terraced basalt shoulders clear of staircases
    { x: -25, y: -7, z: -26, rx: 14, h: 15, rz: 15, rot: 0.4 },
    { x: 25, y: -7, z: -26, rx: 14, h: 15, rz: 15, rot: -0.5 },
    { x: -34, y: -7, z: -52, rx: 18, h: 24, rz: 20, rot: 0.9 },
    { x: 34, y: -7, z: -52, rx: 18, h: 24, rz: 20, rot: -0.8 },
    // Left plateau cliff mass supporting Left Cathedral Wing
    { x: -46, y: -7, z: -84, rx: 24, h: 35, rz: 28, rot: 0.3 },
    { x: -64, y: -7, z: -96, rx: 20, h: 32, rz: 24, rot: 1.2 },
    { x: -34, y: -7, z: -108, rx: 22, h: 34, rz: 24, rot: -0.4 },
    // Right highest peak supporting Octagonal Rotunda & Ultra-Tall Spire Tower
    { x: 40, y: -7, z: -84, rx: 24, h: 37, rz: 28, rot: 0.7 },
    { x: 58, y: -7, z: -98, rx: 22, h: 35, rz: 26, rot: -1.1 },
    { x: 32, y: -7, z: -112, rx: 22, h: 34, rz: 24, rot: 0.2 },
    // Rear spine crags closing the island perimeter cleanly
    { x: 0, y: -7, z: -118, rx: 26, h: 34, rz: 26, rot: 0.5 },
    { x: -18, y: -7, z: -130, rx: 20, h: 30, rz: 22, rot: -0.9 },
    { x: 20, y: -7, z: -130, rx: 20, h: 32, rz: 22, rot: 0.8 },
  ];

  const cliffIslandMesh = new THREE.InstancedMesh(cragGeo, striatedCliffMat, cragSpecs.length);
  cragSpecs.forEach((cs, idx) => {
    dummy.position.set(cs.x, cs.y, cs.z);
    dummy.rotation.set(0, cs.rot, 0);
    dummy.scale.set(cs.rx, cs.h, cs.rz);
    dummy.updateMatrix();
    cliffIslandMesh.setMatrixAt(idx, dummy.matrix);
  });
  cliffIslandMesh.instanceMatrix.needsUpdate = true;
  cliffIslandMesh.computeBoundingSphere();
  academyCastleGroup.add(cliffIslandMesh);

  // Solid lower cliff island plateau ring seated safely below midLanding (y = 8.4 < 10.0)
  const lowerIslandBed = new THREE.Mesh(track(new THREE.CylinderGeometry(64, 70, 12, 24)), striatedCliffMat);
  lowerIslandBed.position.set(0, 2.4, -84);
  academyCastleGroup.add(lowerIslandBed);

  // Solid upper rocky plateau shelves seated cleanly atop the cliff peaks
  const leftPlateau = new THREE.Mesh(track(new THREE.CylinderGeometry(24, 28, 12, 10)), striatedCliffMat);
  leftPlateau.position.set(-46, 20, -90);
  academyCastleGroup.add(leftPlateau);

  const rightPlateau = new THREE.Mesh(track(new THREE.CylinderGeometry(24, 28, 14, 10)), striatedCliffMat);
  rightPlateau.position.set(42, 21, -90);
  academyCastleGroup.add(rightPlateau);

  // Stepped Stone Retaining Walls clinging to the cliff faces
  const retainWallGeo = track(new THREE.BoxGeometry(16, 18, 4.2));
  const retainSpecs: Array<[number, number, number, number]> = [
    [-22, 10, -40, 0.35],
    [22, 10, -40, -0.35],
    [-34, 16, -62, 0.52],
    [34, 16, -62, -0.52],
    [-54, 18, -74, 0.25],
    [54, 18, -74, -0.25],
  ];
  const retainWalls = new THREE.InstancedMesh(retainWallGeo, limestoneMat, retainSpecs.length);
  retainSpecs.forEach(([rx, ry, rz, rrot], idx) => {
    dummy.position.set(rx, ry, rz);
    dummy.rotation.set(0, rrot, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    retainWalls.setMatrixAt(idx, dummy.matrix);
  });
  retainWalls.instanceMatrix.needsUpdate = true;
  retainWalls.computeBoundingSphere();
  academyCastleGroup.add(retainWalls);

  // Sweeping Lower Pointed-Arch Aqueduct / Colonnade Wall wrapping the island perimeter just above water!
  const islandCenterZ = -78;
  const perimeterBayGeo = track(createGothicBayGeometry(7.2, 12.0, 4.6, 8.8, 2.4));
  const perimeterCopingGeo = track(new THREE.BoxGeometry(7.4, 0.9, 3.0));
  const perimeterPierGeo = track(new THREE.BoxGeometry(1.8, 14.2, 3.2));
  const perimeterPinnacleGeo = track(new THREE.ConeGeometry(0.9, 3.8, 4));

  const arcadeBays: Array<{ x: number; y: number; z: number; ry: number }> = [];
  const totalPerimSteps = 44;
  for (let i = 0; i < totalPerimSteps; i++) {
    const a = (i / totalPerimSteps) * Math.PI * 2;
    const rx = Math.sin(a) * 68;
    const rz = islandCenterZ + Math.cos(a) * 62;
    // Leave open gap strictly at the front ceremonial staircase entrance (z > -28, |x| < 14)
    if (rz > -28 && Math.abs(rx) < 14.5) continue;
    const tangentYaw = Math.atan2(Math.cos(a) * 68, -Math.sin(a) * 62);
    arcadeBays.push({ x: rx, y: -1.5, z: rz, ry: tangentYaw + Math.PI / 2 });
  }

  const perimBaysInst = new THREE.InstancedMesh(perimeterBayGeo, limestoneMat, arcadeBays.length);
  const perimCopingInst = new THREE.InstancedMesh(perimeterCopingGeo, carvedRibMat, arcadeBays.length);
  const perimPiersInst = new THREE.InstancedMesh(perimeterPierGeo, limestoneMat, arcadeBays.length);
  const perimPinsInst = new THREE.InstancedMesh(perimeterPinnacleGeo, carvedRibMat, arcadeBays.length);

  arcadeBays.forEach((ab, idx) => {
    dummy.position.set(ab.x, ab.y, ab.z);
    dummy.rotation.set(0, ab.ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    perimBaysInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(ab.x, ab.y + 12.2, ab.z);
    dummy.updateMatrix();
    perimCopingInst.setMatrixAt(idx, dummy.matrix);

    const pierX = ab.x + Math.cos(ab.ry) * 3.6;
    const pierZ = ab.z - Math.sin(ab.ry) * 3.6;
    dummy.position.set(pierX, ab.y + 6.5, pierZ);
    dummy.updateMatrix();
    perimPiersInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(pierX, ab.y + 15.2, pierZ);
    dummy.rotation.set(0, ab.ry + Math.PI / 4, 0);
    dummy.updateMatrix();
    perimPinsInst.setMatrixAt(idx, dummy.matrix);
  });
  perimBaysInst.instanceMatrix.needsUpdate = true;
  perimCopingInst.instanceMatrix.needsUpdate = true;
  perimPiersInst.instanceMatrix.needsUpdate = true;
  perimPinsInst.instanceMatrix.needsUpdate = true;
  perimBaysInst.computeBoundingSphere();
  perimCopingInst.computeBoundingSphere();
  perimPiersInst.computeBoundingSphere();
  perimPinsInst.computeBoundingSphere();
  academyCastleGroup.add(perimBaysInst, perimCopingInst, perimPiersInst, perimPinsInst);

  // Upper Terrace Golden-Amber Autumn Trees planted solidly into the lower island bed & wing terraces!
  const autumnTreeCoords: Array<{ x: number; y: number; z: number; s: number; rot: number }> = [];
  for (let i = 0; i < arcadeBays.length; i += 2) {
    const ab = arcadeBays[i];
    const inwardX = ab.x * 0.86;
    const inwardZ = islandCenterZ + (ab.z - islandCenterZ) * 0.86;
    if (inwardZ > -42 && Math.abs(inwardX) < 18) continue;
    autumnTreeCoords.push({
      x: inwardX,
      y: 8.3,
      z: inwardZ,
      s: 0.95 + (i % 4) * 0.14,
      rot: i * 1.1,
    });
  }
  // Grounded golden-amber tree clusters planted firmly on the Forecourt Wing Terraces (y = 19.5) & Plateaus
  for (const [tx, ty, tz, ts] of [
    [-19.5, 19.4, -56.5, 1.05],
    [19.5, 19.4, -56.5, 1.08],
    [-25.5, 19.4, -64.5, 1.15],
    [25.5, 19.4, -64.5, 1.15],
    [-48, 25.8, -72, 1.2],
    [48, 25.8, -72, 1.2],
  ]) {
    autumnTreeCoords.push({ x: tx, y: ty, z: tz, s: ts, rot: tx * 0.2 });
  }

  const aTrunkGeo = track(new THREE.CylinderGeometry(0.24, 0.44, 4.8, 6));
  aTrunkGeo.translate(0, 2.4, 0);
  const lobe1 = new THREE.DodecahedronGeometry(2.1, 0);
  lobe1.translate(0, 5.6, 0);
  const lobe2 = new THREE.DodecahedronGeometry(1.65, 0);
  lobe2.translate(1.15, 5.1, 0.65);
  const lobe3 = new THREE.DodecahedronGeometry(1.55, 0);
  lobe3.translate(-1.05, 5.2, -0.55);
  const aCanopyGeo = track(mergeGeometries([lobe1, lobe2, lobe3])!);
  lobe1.dispose();
  lobe2.dispose();
  lobe3.dispose();

  const autumnTrunks = new THREE.InstancedMesh(aTrunkGeo, barkMat, autumnTreeCoords.length);
  const autumnCanopies = new THREE.InstancedMesh(aCanopyGeo, autumnFoliageMat, autumnTreeCoords.length);
  const autumnTint = new THREE.Color();
  const autumnPalette = [0xd98726, 0xe8a838, 0xc76d1e, 0xebb949, 0xd47b22];

  autumnTreeCoords.forEach((tc, idx) => {
    dummy.position.set(tc.x, tc.y, tc.z);
    dummy.rotation.set(0, tc.rot, 0);
    dummy.scale.setScalar(tc.s);
    dummy.updateMatrix();
    autumnTrunks.setMatrixAt(idx, dummy.matrix);
    autumnCanopies.setMatrixAt(idx, dummy.matrix);
    autumnTint.setHex(autumnPalette[idx % autumnPalette.length]);
    autumnCanopies.setColorAt(idx, autumnTint);
  });
  autumnTrunks.instanceMatrix.needsUpdate = true;
  autumnCanopies.instanceMatrix.needsUpdate = true;
  if (autumnCanopies.instanceColor) autumnCanopies.instanceColor.needsUpdate = true;
  autumnTrunks.computeBoundingSphere();
  autumnCanopies.computeBoundingSphere();
  academyCastleGroup.add(autumnTrunks, autumnCanopies);

  // -------------------------------------------------------------------------
  // 3C. MAIN CATHEDRAL ELEVATION & ROSE WINDOW FACADE (local z = -76, y = 20+)
  // -------------------------------------------------------------------------
  const facadeZ = -76.0;
  const facadeBaseY = 20.0;

  // Main Central Cathedral Nave Mass (recessed behind facadeZ to reveal deep portal alcove!)
  const naveBody = new THREE.Mesh(track(new THREE.BoxGeometry(28.0, 44.0, 43.0)), limestoneMat);
  naveBody.position.set(0, facadeBaseY + 22.0, facadeZ - 22.8);
  academyCastleGroup.add(naveBody);

  // Steep dark slate-blue gable roof crowning the Cathedral Nave
  const naveRoof = new THREE.Mesh(track(createSteepRoofGeometry(29.6, 20.0, 46.0)), slateRoofMat);
  naveRoof.position.set(0, facadeBaseY + 44.0, facadeZ - 22.0);
  academyCastleGroup.add(naveRoof);

  // Front Gothic Gable Pediment Wall WITH pointed portal cutout so recessed cathedral doors show!
  const gableFront = new THREE.Mesh(
    track(createGableArchWallGeometry(28.0, 44.0, 64.0, 10.6, 16.4, 1.4)),
    limestoneMat,
  );
  gableFront.position.set(0, facadeBaseY, facadeZ + 0.1);
  academyCastleGroup.add(gableFront);

  // Recessed Pointed-Arch Portal with Nested Archivolts & Sealed Cathedral Doors
  for (let order = 0; order < 3; order++) {
    const w = 12.6 - order * 1.3;
    const h = 18.0 - order * 1.1;
    const archOrderGeo = track(
      new THREE.ExtrudeGeometry(createArchShape(w, h, 1.45), {
        depth: 1.4,
        bevelEnabled: true,
        bevelSize: 0.08,
        bevelThickness: 0.08,
      }),
    );
    archOrderGeo.translate(0, 0, -0.7);
    const archOrder = new THREE.Mesh(archOrderGeo, order === 1 ? carvedRibMat : limestoneMat);
    archOrder.position.set(0, facadeBaseY, facadeZ + 1.5 - order * 0.85);
    academyCastleGroup.add(archOrder);
  }

  // Steep Pointed Gable Hood Pediment directly above Portal Arch (apex stops cleanly below lancets)
  const portalPediment = new THREE.Mesh(
    track(createGableArchWallGeometry(17.5, 11.0, 22.8, 11.8, 17.4, 1.6)),
    carvedRibMat,
  );
  portalPediment.position.set(0, facadeBaseY, facadeZ + 1.7);
  academyCastleGroup.add(portalPediment);

  // Sealed Double Cathedral Doors deeply recessed inside the portal arch
  for (const side of [-1, 1]) {
    const cDoor = new THREE.Mesh(track(new THREE.BoxGeometry(5.1, 16.2, 0.8)), slateRoofMat);
    cDoor.position.set(side * 2.6, facadeBaseY + 8.1, facadeZ - 0.8);
    academyCastleGroup.add(cDoor);
    for (const sy of [3.0, 7.0, 11.0, 14.2]) {
      const band = new THREE.Mesh(track(new THREE.BoxGeometry(4.9, 0.34, 0.96)), blackIronMat);
      band.position.set(side * 2.6, facadeBaseY + sy, facadeZ - 0.8);
      academyCastleGroup.add(band);
    }
  }
  const cathSealOuter = new THREE.Mesh(track(new THREE.TorusGeometry(2.6, 0.16, 8, 28)), soulCyanMat);
  cathSealOuter.position.set(0, facadeBaseY + 8.5, facadeZ - 0.32);
  academyCastleGroup.add(cathSealOuter);

  // Three Tall Glowing Warm-Gold Lancet Windows centered directly beneath the Rose Window!
  const mainLancetGeo = track(new THREE.ShapeGeometry(createPointedWindowShape(2.2, 10.6)));
  const centerLancetGeo = track(new THREE.ShapeGeometry(createPointedWindowShape(2.5, 12.2)));
  const lancetFrameGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(2.3, 10.7, 0.45), { depth: 0.65, bevelEnabled: false }),
  );
  lancetFrameGeo.translate(0, 0, -0.325);
  const centerFrameGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(2.6, 12.3, 0.48), { depth: 0.65, bevelEnabled: false }),
  );
  centerFrameGeo.translate(0, 0, -0.325);

  for (const [lx, isCenter] of [
    [-4.0, false],
    [0.0, true],
    [4.0, false],
  ] as const) {
    const wy = facadeBaseY + 24.4;
    const glass = new THREE.Mesh(isCenter ? centerLancetGeo : mainLancetGeo, goldLancetMat);
    glass.position.set(lx, wy, facadeZ + 0.96);
    academyCastleGroup.add(glass);

    const frame = new THREE.Mesh(isCenter ? centerFrameGeo : lancetFrameGeo, carvedRibMat);
    frame.position.set(lx, wy, facadeZ + 1.02);
    academyCastleGroup.add(frame);

    // Fine vertical stone tracery mullion inside each lancet
    const mullion = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.18, isCenter ? 11.0 : 9.4, 0.25)),
      carvedRibMat,
    );
    mullion.position.set(lx, wy + (isCenter ? 5.5 : 4.7), facadeZ + 1.05);
    academyCastleGroup.add(mullion);
  }

  // Bright Intricate Circular Rose Window centered above the 3 Lancets!
  const roseY = facadeBaseY + 42.4;
  const roseZ = facadeZ + 1.08;
  const roseGroup = new THREE.Group();
  roseGroup.position.set(0, roseY, roseZ);
  academyCastleGroup.add(roseGroup);

  const roseGlass = new THREE.Mesh(track(new THREE.CircleGeometry(4.75, 32)), roseGlassMat);
  roseGroup.add(roseGlass);

  const roseOuterRim = new THREE.Mesh(track(new THREE.TorusGeometry(4.85, 0.52, 10, 36)), carvedRibMat);
  roseOuterRim.position.z = 0.14;
  roseGroup.add(roseOuterRim);

  const roseInnerRing = new THREE.Mesh(track(new THREE.TorusGeometry(2.45, 0.2, 8, 28)), carvedRibMat);
  roseInnerRing.position.z = 0.18;
  roseGroup.add(roseInnerRing);

  const roseHubRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.85, 0.18, 8, 20)), carvedRibMat);
  roseHubRing.position.z = 0.2;
  roseGroup.add(roseHubRing);

  // 12 radial tracery spokes & outer trefoil petal rings
  for (let s = 0; s < 12; s++) {
    const a = (s / 12) * Math.PI * 2;
    const spoke = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 9.2, 0.22)), carvedRibMat);
    spoke.rotation.z = a;
    spoke.position.z = 0.16;
    roseGroup.add(spoke);

    const petal = new THREE.Mesh(track(new THREE.TorusGeometry(0.62, 0.11, 6, 14)), carvedRibMat);
    petal.position.set(Math.cos(a) * 3.65, Math.sin(a) * 3.65, 0.18);
    roseGroup.add(petal);
  }

  // Clustered Vertical Pinnacles, Facade Flanking Buttress Turrets & Twin Gable Towers
  const pinnacleColGeo = track(new THREE.BoxGeometry(2.2, 1.0, 2.2));
  pinnacleColGeo.translate(0, 0.5, 0);
  const pinnacleSpireGeo = track(new THREE.ConeGeometry(1.45, 1.0, 4));
  pinnacleSpireGeo.rotateY(Math.PI / 4);
  pinnacleSpireGeo.translate(0, 0.5, 0);

  const facadePinnacles: Array<{ x: number; y: number; z: number; w: number; h: number; sh: number }> = [
    // Flanking main facade clustered buttress pinnacles
    { x: -13.6, y: facadeBaseY, z: facadeZ + 1.0, w: 1.5, h: 48, sh: 18 },
    { x: 13.6, y: facadeBaseY, z: facadeZ + 1.0, w: 1.5, h: 48, sh: 18 },
    { x: -9.5, y: facadeBaseY, z: facadeZ + 1.2, w: 1.15, h: 45, sh: 14 },
    { x: 9.5, y: facadeBaseY, z: facadeZ + 1.2, w: 1.15, h: 45, sh: 14 },
    // Center peak finial pinnacle above Rose Window gable
    { x: 0, y: facadeBaseY + 62, z: facadeZ + 0.5, w: 0.9, h: 6, sh: 12 },
    // Secondary flanking bell-turrets beside main Cathedral elevation
    { x: -18.5, y: facadeBaseY + 2, z: facadeZ - 6.0, w: 2.1, h: 46, sh: 20 },
    { x: 18.5, y: facadeBaseY + 2, z: facadeZ - 6.0, w: 2.1, h: 46, sh: 20 },
    // Nave side buttress pinnacles (5 pairs along the cathedral flanks)
    ...[-1, 1].flatMap((side) =>
      [0, 1, 2, 3, 4].map((i) => ({
        x: side * 19.5,
        y: facadeBaseY + 2,
        z: facadeZ - 12 - i * 8.5,
        w: 1.25,
        h: 36,
        sh: 13,
      })),
    ),
  ];

  const pinColsInst = new THREE.InstancedMesh(pinnacleColGeo, limestoneMat, facadePinnacles.length);
  const pinSpiresInst = new THREE.InstancedMesh(pinnacleSpireGeo, slateRoofMat, facadePinnacles.length);
  facadePinnacles.forEach((fp, idx) => {
    dummy.position.set(fp.x, fp.y, fp.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(fp.w, fp.h, fp.w);
    dummy.updateMatrix();
    pinColsInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(fp.x, fp.y + fp.h, fp.z);
    dummy.scale.set(fp.w, fp.sh, fp.w);
    dummy.updateMatrix();
    pinSpiresInst.setMatrixAt(idx, dummy.matrix);
  });
  pinColsInst.instanceMatrix.needsUpdate = true;
  pinSpiresInst.instanceMatrix.needsUpdate = true;
  pinColsInst.computeBoundingSphere();
  pinSpiresInst.computeBoundingSphere();
  academyCastleGroup.add(pinColsInst, pinSpiresInst);

  // Flying Buttresses along both flanks of the Cathedral Nave (InstancedMesh)
  const fbArchGeo = track(new THREE.BoxGeometry(8.5, 2.2, 1.8));
  const fbArches = new THREE.InstancedMesh(fbArchGeo, carvedRibMat, 10);
  let fbIdx = 0;
  for (let i = 0; i < 5; i++) {
    const bz = facadeZ - 12 - i * 8.5;
    for (const side of [-1, 1]) {
      dummy.position.set(side * 16.5, facadeBaseY + 34.0, bz);
      dummy.rotation.set(0, 0, -side * 0.46);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      fbArches.setMatrixAt(fbIdx++, dummy.matrix);
    }
  }
  fbArches.instanceMatrix.needsUpdate = true;
  fbArches.computeBoundingSphere();
  academyCastleGroup.add(fbArches);

  // High-Arched Stone Viaduct Extending Off the Left Flank (matching image_aa7d714b.png!)
  const leftViaductBays = 6;
  const leftViaductBayGeo = track(createGothicBayGeometry(11.5, 36.0, 7.6, 26.0, 5.2));
  const leftViaductGalleryGeo = track(createGothicBayGeometry(3.8, 5.5, 2.2, 4.2, 4.4));
  const leftViaductInst = new THREE.InstancedMesh(leftViaductBayGeo, limestoneMat, leftViaductBays);
  const leftViaductGalleryInst = new THREE.InstancedMesh(
    leftViaductGalleryGeo,
    carvedRibMat,
    leftViaductBays * 3,
  );
  const leftViaductPins = new THREE.InstancedMesh(pinnacleSpireGeo, slateRoofMat, leftViaductBays);

  for (let i = 0; i < leftViaductBays; i++) {
    const vx = -24.5 - i * 11.4;
    const vz = facadeZ + 6.0 - i * 1.2;
    dummy.position.set(vx, 8.0, vz);
    dummy.rotation.set(0, 0.1, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    leftViaductInst.setMatrixAt(i, dummy.matrix);

    // Three pierced upper gallery arches per main viaduct bay
    for (let g = 0; g < 3; g++) {
      const gx = vx - 3.8 + g * 3.8;
      dummy.position.set(gx, 44.0, vz - 0.38 + g * 0.38);
      dummy.rotation.set(0, 0.1, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      leftViaductGalleryInst.setMatrixAt(i * 3 + g, dummy.matrix);
    }

    // Pier pinnacle atop each viaduct pier
    dummy.position.set(vx - 5.6, 49.5, vz - 0.56);
    dummy.rotation.set(0, 0.1, 0);
    dummy.scale.set(1.3, 11.0, 1.3);
    dummy.updateMatrix();
    leftViaductPins.setMatrixAt(i, dummy.matrix);
  }
  leftViaductInst.instanceMatrix.needsUpdate = true;
  leftViaductGalleryInst.instanceMatrix.needsUpdate = true;
  leftViaductPins.instanceMatrix.needsUpdate = true;
  leftViaductInst.computeBoundingSphere();
  leftViaductGalleryInst.computeBoundingSphere();
  leftViaductPins.computeBoundingSphere();
  academyCastleGroup.add(leftViaductInst, leftViaductGalleryInst, leftViaductPins);

  // -------------------------------------------------------------------------
  // 3D. UPPER CITADEL SKYLINE: LEFT CATHEDRAL WING, ARCH BRIDGE & RIGHT CITADEL CLUSTER
  // -------------------------------------------------------------------------
  // 1. Left Cathedral Wing (on left rocky plateau x = -46, z = -92)
  const leftWingGroup = new THREE.Group();
  leftWingGroup.position.set(-46.0, 26.0, -92.0);
  leftWingGroup.rotation.y = 0.22;
  academyCastleGroup.add(leftWingGroup);

  const lwMain = new THREE.Mesh(track(new THREE.BoxGeometry(22.0, 32.0, 36.0)), limestoneMat);
  lwMain.position.set(0, 16.0, 0);
  leftWingGroup.add(lwMain);

  const lwRoof = new THREE.Mesh(track(createSteepRoofGeometry(23.6, 17.0, 37.6)), slateRoofMat);
  lwRoof.position.set(0, 32.0, 0);
  leftWingGroup.add(lwRoof);

  // Stepped upper clerestory hall & needle spire on Left Wing
  const lwUpper = new THREE.Mesh(track(new THREE.BoxGeometry(14.0, 22.0, 22.0)), limestoneMat);
  lwUpper.position.set(-2.0, 36.0, -4.0);
  leftWingGroup.add(lwUpper);
  const lwUpperRoof = new THREE.Mesh(track(createSteepRoofGeometry(15.2, 13.0, 23.2)), slateRoofMat);
  lwUpperRoof.position.set(-2.0, 47.0, -4.0);
  leftWingGroup.add(lwUpperRoof);

  const lwSpireShaft = new THREE.Mesh(track(new THREE.CylinderGeometry(3.2, 4.0, 24.0, 8)), limestoneMat);
  lwSpireShaft.position.set(-4.0, 46.0, -8.0);
  leftWingGroup.add(lwSpireShaft);
  const lwSpireNeedle = new THREE.Mesh(track(new THREE.ConeGeometry(3.9, 22.0, 8)), slateRoofMat);
  lwSpireNeedle.position.set(-4.0, 69.0, -8.0);
  leftWingGroup.add(lwSpireNeedle);

  // Glowing golden lancet windows on Left Wing front face
  const smallLancetGeo = track(new THREE.ShapeGeometry(createPointedWindowShape(1.6, 7.6)));
  for (const wx of [-5.2, 0, 5.2]) {
    const win = new THREE.Mesh(smallLancetGeo, goldLancetMat);
    win.position.set(wx, 18.0, 18.15);
    leftWingGroup.add(win);
  }

  // 2. Graceful Elevated Stone Arch Bridge linking Left Cathedral Wing to Right Citadel Cluster!
  const skyBridgeGroup = new THREE.Group();
  skyBridgeGroup.position.set(-2.0, 38.0, -96.0);
  academyCastleGroup.add(skyBridgeGroup);

  const skyBridgeBays = 6;
  const skyBayGeo = track(createGothicBayGeometry(9.2, 12.0, 6.2, 9.2, 4.4));
  const skyBaysInst = new THREE.InstancedMesh(skyBayGeo, limestoneMat, skyBridgeBays);
  const skyBridgeDeck = new THREE.Mesh(track(new THREE.BoxGeometry(56.0, 1.2, 5.0)), carvedRibMat);
  skyBridgeDeck.position.set(0, 12.2, 0);
  skyBridgeGroup.add(skyBridgeDeck);

  for (let i = 0; i < skyBridgeBays; i++) {
    const bx = -23.0 + i * 9.2;
    dummy.position.set(bx, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    skyBaysInst.setMatrixAt(i, dummy.matrix);
  }
  skyBaysInst.instanceMatrix.needsUpdate = true;
  skyBaysInst.computeBoundingSphere();
  skyBridgeGroup.add(skyBaysInst);

  // 3. Right Citadel Cluster (Highest Rocky Peak: Octagonal Ribbed-Dome Rotunda + Ultra-Tall Spire Tower!)
  // 3a. Grand Octagonal Gothic Rotunda with Dark Slate Ribbed Dome & Finial (x = +34, z = -82)
  const rotundaGroup = new THREE.Group();
  rotundaGroup.position.set(34.0, 26.0, -82.0);
  academyCastleGroup.add(rotundaGroup);

  const rotundaBase = new THREE.Mesh(track(new THREE.CylinderGeometry(14.8, 16.4, 8.0, 8)), limestoneMat);
  rotundaBase.position.y = 4.0;
  rotundaBase.rotation.y = Math.PI / 8;
  rotundaGroup.add(rotundaBase);

  const rotundaDrum = new THREE.Mesh(track(new THREE.CylinderGeometry(13.2, 13.8, 26.0, 8)), limestoneMat);
  rotundaDrum.position.y = 21.0;
  rotundaDrum.rotation.y = Math.PI / 8;
  rotundaGroup.add(rotundaDrum);

  const rotundaCornice = new THREE.Mesh(track(new THREE.CylinderGeometry(14.5, 13.4, 2.2, 8)), carvedRibMat);
  rotundaCornice.position.y = 34.5;
  rotundaCornice.rotation.y = Math.PI / 8;
  rotundaGroup.add(rotundaCornice);

  // 8 recessed glowing lancet windows + corner limestone pilasters around the octagonal rotunda
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const win = new THREE.Mesh(smallLancetGeo, goldLancetMat);
    win.position.set(Math.sin(a) * 12.6, 19.0, Math.cos(a) * 12.6);
    win.rotation.y = a;
    rotundaGroup.add(win);

    const cornerA = a + Math.PI / 8;
    const pilaster = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 28.0, 1.8)), carvedRibMat);
    pilaster.position.set(Math.sin(cornerA) * 13.6, 21.0, Math.cos(cornerA) * 13.6);
    pilaster.rotation.y = cornerA;
    rotundaGroup.add(pilaster);
  }

  // Dark Slate Ribbed Octagonal Dome (LatheGeometry curved dome + 8 raised pale carved ribs + cupola finial)
  const domePts: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const r = Math.cos(t * Math.PI * 0.5) * 13.6;
    const y = Math.sin(t * Math.PI * 0.5) * 15.5;
    domePts.push(new THREE.Vector2(Math.max(1.2, r), y));
  }
  const domeGeo = track(new THREE.LatheGeometry(domePts, 8));
  domeGeo.rotateY(Math.PI / 8);
  const rotundaDome = new THREE.Mesh(domeGeo, slateRoofMat);
  rotundaDome.position.y = 35.4;
  rotundaGroup.add(rotundaDome);

  // Raised limestone dome ribs along the 8 octagonal ridges
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const ribCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.sin(a) * 13.7, 35.4, Math.cos(a) * 13.7),
      new THREE.Vector3(Math.sin(a) * 10.2, 45.2, Math.cos(a) * 10.2),
      new THREE.Vector3(Math.sin(a) * 1.6, 51.0, Math.cos(a) * 1.6),
    ]);
    const rib = new THREE.Mesh(track(new THREE.TubeGeometry(ribCurve, 8, 0.34, 5, false)), carvedRibMat);
    rotundaGroup.add(rib);
  }

  // Lantern cupola & spire finial atop the ribbed dome
  const cupola = new THREE.Mesh(track(new THREE.CylinderGeometry(2.2, 2.5, 5.5, 8)), carvedRibMat);
  cupola.position.y = 52.8;
  rotundaGroup.add(cupola);
  const cupolaCone = new THREE.Mesh(track(new THREE.ConeGeometry(2.6, 8.8, 8)), slateRoofMat);
  cupolaCone.position.y = 59.8;
  rotundaGroup.add(cupolaCone);

  // 3b. Ultra-Tall Slender Multi-Story Spire Tower standing directly beside the Rotunda (x = +48, z = -98)
  const spireTowerGroup = new THREE.Group();
  spireTowerGroup.position.set(48.0, 24.0, -98.0);
  academyCastleGroup.add(spireTowerGroup);

  // Multi-story stepped shaft (Base -> Lower Tier -> Mid Recessed Tier -> Upper Belfry -> Slender Needle Peak)
  const stBase = new THREE.Mesh(track(new THREE.BoxGeometry(15.0, 22.0, 15.0)), limestoneMat);
  stBase.position.y = 11.0;
  spireTowerGroup.add(stBase);

  const stStory2 = new THREE.Mesh(track(new THREE.BoxGeometry(12.2, 26.0, 12.2)), limestoneMat);
  stStory2.position.y = 35.0;
  spireTowerGroup.add(stStory2);

  const stStory3 = new THREE.Mesh(track(new THREE.CylinderGeometry(5.6, 6.4, 24.0, 8)), limestoneMat);
  stStory3.position.y = 60.0;
  stStory3.rotation.y = Math.PI / 8;
  spireTowerGroup.add(stStory3);

  const stBelfry = new THREE.Mesh(track(new THREE.CylinderGeometry(6.6, 5.8, 5.5, 8)), carvedRibMat);
  stBelfry.position.y = 74.0;
  stBelfry.rotation.y = Math.PI / 8;
  spireTowerGroup.add(stBelfry);

  const stPeak = new THREE.Mesh(track(new THREE.ConeGeometry(6.2, 34.0, 8)), slateRoofMat);
  stPeak.position.y = 93.5;
  stPeak.rotation.y = Math.PI / 8;
  spireTowerGroup.add(stPeak);

  const stFinial = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.38, 9.0, 6)), carvedRibMat);
  stFinial.position.y = 113.0;
  spireTowerGroup.add(stFinial);

  // Corner buttress ribs + recessed vertical warm-gold window bays along the spire tower
  const slenderSlitGeo = track(new THREE.BoxGeometry(0.95, 11.5, 0.4));
  for (let face = 0; face < 4; face++) {
    const a = (face / 4) * Math.PI * 2;
    for (const offset of [-2.2, 2.2]) {
      const slit2 = new THREE.Mesh(slenderSlitGeo, goldLancetMat);
      slit2.position.set(
        Math.sin(a) * 6.2 + Math.cos(a) * offset,
        35.0,
        Math.cos(a) * 6.2 - Math.sin(a) * offset,
      );
      slit2.rotation.y = a;
      spireTowerGroup.add(slit2);
    }
    const slit3 = new THREE.Mesh(slenderSlitGeo, goldLancetMat);
    slit3.position.set(Math.sin(a) * 5.65, 60.0, Math.cos(a) * 5.65);
    slit3.rotation.y = a;
    spireTowerGroup.add(slit3);

    // Corner spirelet pinnacles at story transitions
    const cornerA = a + Math.PI / 4;
    const cornerTurret = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 44.0, 2.2)), carvedRibMat);
    cornerTurret.position.set(Math.sin(cornerA) * 8.4, 24.0, Math.cos(cornerA) * 8.4);
    spireTowerGroup.add(cornerTurret);

    const cornerCone = new THREE.Mesh(track(new THREE.ConeGeometry(1.6, 8.5, 4)), slateRoofMat);
    cornerCone.position.set(Math.sin(cornerA) * 8.4, 50.0, Math.cos(cornerA) * 8.4);
    cornerCone.rotation.y = cornerA + Math.PI / 4;
    spireTowerGroup.add(cornerCone);

    const belfryPin = new THREE.Mesh(track(new THREE.ConeGeometry(1.15, 7.5, 4)), carvedRibMat);
    belfryPin.position.set(Math.sin(cornerA) * 6.2, 79.5, Math.cos(cornerA) * 6.2);
    belfryPin.rotation.y = cornerA + Math.PI / 4;
    spireTowerGroup.add(belfryPin);
  }

  return {
    academyCastleGroup,
    lakeUniforms,
    midIslandFlames,
    lanternFlames,
  };
}
