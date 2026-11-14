import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WorldTextureBundle } from './textures';
import {
  ACADEMY,
  getLakeCausewayX,
  getLakeCausewayY,
  getWestViaductZ,
  getWestViaductY,
  getEastPromenadeZ,
  getEastPromenadeY,
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
  tex.repeat.set(3, 3);
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

function scaleExtrudeUVs(geo: THREE.BufferGeometry, factor: number): THREE.BufferGeometry {
  const uv = geo.attributes.uv;
  if (uv) {
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * factor, uv.getY(i) * factor);
    }
    uv.needsUpdate = true;
  }
  return geo;
}

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
  return scaleExtrudeUVs(geo, 0.08);
}

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
  return scaleExtrudeUVs(geo, 0.06);
}

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
  flagstoneMat,
  barkMat,
  dampMasonryMat,
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
  // 1. ARCHITECTURAL PBR MATERIALS (Raya Lucaria Palette)
  // =========================================================================
  const rockTex = createVerticallyStriatedRockTexture();
  track(rockTex.map);
  track(rockTex.bumpMap);
  const striatedCliffMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: rockTex.map,
      bumpMap: rockTex.bumpMap,
      bumpScale: 0.28,
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
      roughness: 0.78,
      metalness: 0.04,
      envMapIntensity: 0.45,
    }),
  );

  const carvedRibMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xa6a296,
      map: limestoneTex,
      bumpMap: textures.flagstone.bumpMap,
      bumpScale: 0.06,
      roughness: 0.78,
      metalness: 0.05,
    }),
  );

  const slateRoofMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1d2b3b,
      bumpMap: textures.gildedRoof.bumpMap,
      bumpScale: 0.08,
      roughness: 0.44,
      metalness: 0.28,
      envMapIntensity: 0.75,
    }),
  );

  const goldLancetMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf4b545,
      emissive: new THREE.Color(0xe68416),
      emissiveIntensity: 1.85,
      roughness: 0.22,
      metalness: 0.05,
    }),
  );

  const roseGlassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfbe08a,
      emissive: new THREE.Color(0xf09d24),
      emissiveIntensity: 1.95,
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

  const cypressFoliageMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x20322b,
      roughness: 0.9,
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
  // 2. BOUNDED SUNKEN ACADEMY LAKE BASIN & THREE-WAY CAUSEWAY NETWORK
  // =========================================================================
  const lakeUniforms = { uTime: { value: 0 } };
  const lakeWaterMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x134b5f,
      emissive: new THREE.Color(0x0b3242),
      emissiveIntensity: 0.72,
      roughness: 0.14,
      metalness: 0.25,
      envMapIntensity: 1.25,
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
         transformed.y += sin(vLakePos.x * 0.16 + uTime * 1.05) * 0.035 + cos(vLakePos.z * 0.21 - uTime * 0.85) * 0.035;`,
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
        `float lBand1 = sin(vLakePos.z * 0.58 + sin(vLakePos.x * 0.09) * 2.4 - uTime * 1.15);
         float lBand2 = cos(vLakePos.z * 0.95 - sin(vLakePos.x * 0.14 + uTime * 0.45) * 1.8 + uTime * 0.85);
         float lRipple = smoothstep(0.45, 0.98, (lBand1 * 0.6 + lBand2 * 0.4) * 0.5 + 0.5);
         gl_FragColor.rgb += vec3(0.14, 0.34, 0.42) * lRipple * 0.28;
         #include <dithering_fragment>`,
      );
  };

  // Strictly confine the Academy lake mesh inside the sunken crater basin north of the retaining wall (z <= -584.2)
  const lakeBoundsAtZ = (z: number): [number, number] => {
    const northU = Math.max(0, Math.min(1, (-584.2 - z) / 160.0));
    const northEase = northU * northU * (3 - 2 * northU);
    const rearU = Math.max(0, Math.min(1, (-1100.0 - z) / 160.0));
    const rearEase = rearU * rearU * (3 - 2 * rearU);
    const xMin = -194.0 - northEase * 84.0 + rearEase * 58.0; // -194 at wall -> -278 mid-lake -> -220 rear
    const xMax = 166.0 + northEase * 112.0 - rearEase * 58.0; // +166 at wall -> +278 mid-lake -> +220 rear
    return [xMin, xMax];
  };

  const lakeSegsX = 64;
  const lakeSegsZ = 64;
  const lakePositions: number[] = [];
  const lakeNormals: number[] = [];
  const lakeUvs: number[] = [];
  const lakeIndices: number[] = [];
  const zSouthWall = -584.2;
  const zNorthRim = -1260.0;

  for (let iz = 0; iz <= lakeSegsZ; iz++) {
    const vz = iz / lakeSegsZ;
    const wz = THREE.MathUtils.lerp(zSouthWall, zNorthRim, vz);
    const [xMin, xMax] = lakeBoundsAtZ(wz);
    for (let ix = 0; ix <= lakeSegsX; ix++) {
      const ux = ix / lakeSegsX;
      const wx = THREE.MathUtils.lerp(xMin, xMax, ux);
      lakePositions.push(wx, 0, wz);
      lakeNormals.push(0, 1, 0);
      lakeUvs.push(ux, vz);
    }
  }
  const lakeStride = lakeSegsX + 1;
  for (let iz = 0; iz < lakeSegsZ; iz++) {
    for (let ix = 0; ix < lakeSegsX; ix++) {
      const a = iz * lakeStride + ix;
      const b = a + 1;
      const c = (iz + 1) * lakeStride + ix;
      const d = c + 1;
      lakeIndices.push(a, b, c, b, d, c);
    }
  }
  const lakeGeo = track(new THREE.BufferGeometry());
  lakeGeo.setAttribute('position', new THREE.Float32BufferAttribute(lakePositions, 3));
  lakeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(lakeNormals, 3));
  lakeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(lakeUvs, 2));
  lakeGeo.setIndex(lakeIndices);
  const lakePlane = new THREE.Mesh(lakeGeo, lakeWaterMat);
  lakePlane.position.set(0, ACADEMY.lakeWaterY, 0);
  interiorGroup.add(lakePlane);

  // Continuous Jagged Basalt Shoreline Cliffs & Retaining Seawall Rim framing the West, East & North Basin
  const rimCliffGeo = track(new THREE.DodecahedronGeometry(16.0, 0));
  const rimCliffSpecs: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number }> = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const wz = THREE.MathUtils.lerp(-592, -1255, t);
    const [xMin, xMax] = lakeBoundsAtZ(wz);
    const hVar = 1.0 + Math.sin(i * 1.9) * 0.35;
    rimCliffSpecs.push({
      x: xMin - 10.0,
      y: ACADEMY.lakeWaterY + 9.0 * hVar,
      z: wz,
      sx: 1.35 + (i % 3) * 0.25,
      sy: 1.55 * hVar,
      sz: 1.65,
      ry: i * 0.7,
    });
    rimCliffSpecs.push({
      x: xMax + 10.0,
      y: ACADEMY.lakeWaterY + 9.0 * hVar,
      z: wz,
      sx: 1.35 + ((i + 1) % 3) * 0.25,
      sy: 1.55 * hVar,
      sz: 1.65,
      ry: -i * 0.65,
    });
  }
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const wx = THREE.MathUtils.lerp(-220, 220, t);
    const hVar = 1.15 + Math.cos(i * 1.5) * 0.35;
    rimCliffSpecs.push({
      x: wx,
      y: ACADEMY.lakeWaterY + 11.0 * hVar,
      z: -1264 - (1 - Math.abs(t - 0.5) * 2) * 16,
      sx: 1.85,
      sy: 1.75 * hVar,
      sz: 1.4,
      ry: i * 0.9,
    });
  }
  const rimCliffsInst = new THREE.InstancedMesh(rimCliffGeo, striatedCliffMat, rimCliffSpecs.length);
  rimCliffSpecs.forEach((rc, idx) => {
    dummy.position.set(rc.x, rc.y, rc.z);
    dummy.rotation.set((idx % 3) * 0.12, rc.ry, ((idx + 1) % 2) * 0.1);
    dummy.scale.set(rc.sx, rc.sy, rc.sz);
    dummy.updateMatrix();
    rimCliffsInst.setMatrixAt(idx, dummy.matrix);
  });
  rimCliffsInst.instanceMatrix.needsUpdate = true;
  rimCliffsInst.computeBoundingSphere();
  interiorGroup.add(rimCliffsInst);

  // -------------------------------------------------------------------------
  // 2A. WIDENED 14m CENTRAL GRAND PROCESSIONAL BRIDGE (-610 -> -820)
  // -------------------------------------------------------------------------
  const causewaySegs = 84;
  const causewaySlabGeo = track(new THREE.BoxGeometry(14.0, 1.2, 3.05));
  const causewaySlabs = addWalkable(new THREE.InstancedMesh(causewaySlabGeo, dampMasonryMat, causewaySegs));
  causewaySlabs.receiveShadow = true;

  const parapetPostGeo = track(new THREE.BoxGeometry(0.62, 1.15, 0.72));
  const causewayParapets: Array<{ x: number; y: number; z: number; h: number }> = [];
  const causewayLanterns: Array<[number, number, number, number]> = []; // [x, y, z, inwardSign]

  for (let i = 0; i < causewaySegs; i++) {
    const z = THREE.MathUtils.lerp(ACADEMY.causewayStartZ, ACADEMY.castleBaseZ, (i + 0.5) / causewaySegs);
    const cx = getLakeCausewayX(z);
    const cy = getLakeCausewayY(z);
    dummy.position.set(cx, cy - 0.61, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    causewaySlabs.setMatrixAt(i, dummy.matrix);

    const nearMidIsland = Math.abs(z - ACADEMY.midIslandCz) < 12.5;
    const nearJunction = Math.abs(z - ACADEMY.junctionZ) < 12.5;
    const nearFrontDocks = z <= -810.5;
    if (!nearMidIsland && !nearJunction && !nearFrontDocks) {
      if (i % 2 === 0) {
        for (const side of [-1, 1]) {
          causewayParapets.push({
            x: cx + side * 6.68,
            y: cy + 0.52,
            z,
            h: 0.85 + ((i + (side > 0 ? 1 : 0)) % 3) * 0.2,
          });
        }
      }
      if (i % 7 === 3) {
        for (const side of [-1, 1]) {
          causewayLanterns.push([cx + side * 6.1, cy, z, -side]);
        }
      }
    }
  }
  causewaySlabs.instanceMatrix.needsUpdate = true;
  causewaySlabs.computeBoundingBox();
  causewaySlabs.computeBoundingSphere();
  interiorGroup.add(causewaySlabs);

  // Three-Way Causeway Junction Plaza (connects Central, West Viaduct & East Promenade at z=-740)
  const junctionDeck = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(28.0, 2.2, 22.0)), flagstoneMat));
  junctionDeck.position.set(6.0, ACADEMY.causewayY - 1.11, ACADEMY.junctionZ);
  junctionDeck.receiveShadow = true;
  interiorGroup.add(junctionDeck);

  // Mid-Lake Shrine Island (x = 11.4, z = -700, r = 13.5) & 6th Active Bonfire
  const midIsland = addWalkable(
    new THREE.Mesh(
      track(new THREE.CylinderGeometry(ACADEMY.midIslandRadius, ACADEMY.midIslandRadius + 2.2, 1.6, 28)),
      flagstoneMat,
    ),
  );
  midIsland.position.set(ACADEMY.midIslandCx, ACADEMY.causewayY - 0.65, ACADEMY.midIslandCz);
  midIsland.receiveShadow = true;
  interiorGroup.add(midIsland);

  const midIslandFlames = buildBonfireCluster(ACADEMY.bonfireX, ACADEMY.causewayY + 0.15, ACADEMY.bonfireZ);

  const ruinIslandArchGeo = track(
    scaleExtrudeUVs(
      new THREE.ExtrudeGeometry(createArchShape(4.6, 6.2, 1.0), { depth: 1.3, bevelEnabled: false }),
      0.14,
    ),
  );
  ruinIslandArchGeo.translate(0, 0, -0.65);
  for (const ang of [-1.75, -0.75, 0.35]) {
    const rArch = new THREE.Mesh(ruinIslandArchGeo, limestoneMat);
    rArch.position.set(
      ACADEMY.midIslandCx + Math.cos(ang) * 12.2,
      ACADEMY.causewayY - 0.1,
      ACADEMY.midIslandCz + Math.sin(ang) * 12.2,
    );
    rArch.rotation.y = -ang + Math.PI / 2;
    rArch.scale.setScalar(0.8);
    interiorGroup.add(rArch);
  }
  for (const [lx, lz, dir] of [
    [ACADEMY.midIslandCx - 6.8, ACADEMY.midIslandCz - 6.8, 1],
    [ACADEMY.midIslandCx + 6.8, ACADEMY.midIslandCz + 6.8, -1],
  ] as const) {
    causewayLanterns.push([lx, ACADEMY.causewayY + 0.15, lz, dir]);
  }

  // Ornate Pointed-Arch Outer Water-Gatehouse straddling the Central Bridge at z = -652
  const wgCx = getLakeCausewayX(ACADEMY.waterGateZ);
  const wgCy = getLakeCausewayY(ACADEMY.waterGateZ);
  const wgTangent = Math.atan2(
    getLakeCausewayX(ACADEMY.waterGateZ - 2) - getLakeCausewayX(ACADEMY.waterGateZ + 2),
    -4.0,
  );
  const waterGateGroup = new THREE.Group();
  waterGateGroup.position.set(wgCx, wgCy, ACADEMY.waterGateZ);
  waterGateGroup.rotation.y = -wgTangent;
  interiorGroup.add(waterGateGroup);

  const wgArchGeo = track(
    scaleExtrudeUVs(
      new THREE.ExtrudeGeometry(createArchShape(12.2, 16.5, 2.4), {
        depth: 3.4,
        bevelEnabled: true,
        bevelSize: 0.1,
        bevelThickness: 0.1,
      }),
      0.08,
    ),
  );
  wgArchGeo.translate(0, 0, -1.7);
  const wgArch = new THREE.Mesh(wgArchGeo, limestoneMat);
  waterGateGroup.add(wgArch);

  const wgGalleryBar = new THREE.Mesh(track(new THREE.BoxGeometry(17.5, 2.6, 3.8)), carvedRibMat);
  wgGalleryBar.position.set(0, 17.8, 0);
  waterGateGroup.add(wgGalleryBar);

  for (const side of [-1, 1]) {
    const wgPier = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 24.0, 4.4)), limestoneMat);
    wgPier.position.set(side * 6.8, 11.2, 0);
    waterGateGroup.add(wgPier);

    const wgCap = new THREE.Mesh(track(new THREE.BoxGeometry(3.9, 1.0, 4.9)), carvedRibMat);
    wgCap.position.set(side * 6.8, 23.2, 0);
    waterGateGroup.add(wgCap);

    const wgSpire = new THREE.Mesh(track(new THREE.ConeGeometry(2.3, 11.0, 4)), slateRoofMat);
    wgSpire.position.set(side * 6.8, 29.2, 0);
    wgSpire.rotation.y = Math.PI / 4;
    waterGateGroup.add(wgSpire);
  }

  // Instanced Shrouded Scholar Statues on Square Plinths along Causeway, Forecourt & Wings
  const plinthBaseGeo = track(new THREE.BoxGeometry(2.0, 2.0, 2.0));
  plinthBaseGeo.translate(0, 1.0, 0);
  const plinthCapGeo = track(new THREE.BoxGeometry(2.25, 0.34, 2.25));
  plinthCapGeo.translate(0, 2.17, 0);
  const sRobe = new THREE.CylinderGeometry(0.52, 0.82, 1.85, 8);
  sRobe.translate(0, 3.25, 0);
  const sTorso = new THREE.CylinderGeometry(0.42, 0.58, 1.35, 8);
  sTorso.translate(0, 4.55, 0);
  const sCowl = new THREE.ConeGeometry(0.4, 1.05, 7);
  sCowl.translate(0, 5.45, 0.08);
  const statueBodyGeo = track(mergeGeometries([sRobe, sTorso, sCowl])!);
  sRobe.dispose();
  sTorso.dispose();
  sCowl.dispose();

  const statuePlacements: Array<{ x: number; y: number; z: number; yaw: number; s: number }> = [];
  for (const sz of [-632.0, -674.0, -764.0, -800.0]) {
    const scx = getLakeCausewayX(sz);
    const scy = getLakeCausewayY(sz);
    for (const side of [-1, 1]) {
      statuePlacements.push({ x: scx + side * 5.9, y: scy, z: sz, yaw: -side * Math.PI * 0.48, s: 0.92 });
    }
  }

  // -------------------------------------------------------------------------
  // 2B. WEST WING — SUNKEN CLOISTER & TWO-TIER CURVED AQUEDUCT VIADUCT
  // -------------------------------------------------------------------------
  const westViaductSegs = 28;
  const wingDeckSegGeo = track(new THREE.BoxGeometry(4.4, 1.2, 10.0));
  const westDeckInst = addWalkable(new THREE.InstancedMesh(wingDeckSegGeo, dampMasonryMat, westViaductSegs));
  westDeckInst.receiveShadow = true;

  const wingArchBayGeo = track(createGothicBayGeometry(6.8, 8.0, 4.6, 5.8, 3.0));
  const westViaductBays: Array<{ x: number; y: number; z: number; ry: number }> = [];

  for (let i = 0; i < westViaductSegs; i++) {
    const t = (i + 0.5) / westViaductSegs;
    const x = THREE.MathUtils.lerp(4.0, -92.0, t);
    const z = getWestViaductZ(x);
    const y = getWestViaductY(x);
    const dz = getWestViaductZ(x - 1.0) - getWestViaductZ(x + 1.0);
    const ry = -Math.atan2(dz, -2.0);

    dummy.position.set(x, y - 0.62, z);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    westDeckInst.setMatrixAt(i, dummy.matrix);

    if (i % 2 === 1 && i < westViaductSegs - 1) {
      // Upper viaduct bay supporting roadway & lower semi-submerged lake arch tier
      westViaductBays.push({ x, y: y - 8.6, z, ry });
      westViaductBays.push({ x, y: ACADEMY.lakeWaterY - 4.2, z, ry });
    }
    if (i % 3 === 1 && i > 1 && i < westViaductSegs - 1) {
      const nx = Math.sin(ry);
      const nz = Math.cos(ry);
      causewayParapets.push({ x: x + nx * 4.6, y: y + 0.5, z: z + nz * 4.6, h: 0.9 });
      causewayParapets.push({ x: x - nx * 4.6, y: y + 0.5, z: z - nz * 4.6, h: 0.9 });
    }
    if (i % 6 === 3) {
      const nx = Math.sin(ry);
      const nz = Math.cos(ry);
      causewayLanterns.push([x + nx * 4.3, y, z + nz * 4.3, -1]);
      causewayLanterns.push([x - nx * 4.3, y, z - nz * 4.3, 1]);
    }
  }
  westDeckInst.instanceMatrix.needsUpdate = true;
  westDeckInst.computeBoundingBox();
  westDeckInst.computeBoundingSphere();
  interiorGroup.add(westDeckInst);

  // Flooded Western Cloister Courtyard (x: -148..-92, z: -812..-756, y = -11.5)
  const wcCenterX = (ACADEMY.westCloisterMinX + ACADEMY.westCloisterMaxX) * 0.5; // -120
  const wcCenterZ = (ACADEMY.westCloisterMinZ + ACADEMY.westCloisterMaxZ) * 0.5; // -784
  const wcDeck = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(56.4, 3.6, 56.4)), flagstoneMat));
  wcDeck.position.set(wcCenterX, ACADEMY.westCloisterY - 1.82, wcCenterZ);
  wcDeck.receiveShadow = true;
  interiorGroup.add(wcDeck);

  // 4 Shallow Reflective Water Basins inset cleanly into the 4 Cloister quadrants (flush stone curbs!)
  const wcPoolGeo = track(new THREE.PlaneGeometry(16.5, 16.5));
  const wcCurbGeo = track(new THREE.BoxGeometry(17.4, 0.24, 0.55));
  for (const [qx, qz] of [
    [-136, -770],
    [-104, -770],
    [-136, -798],
    [-104, -798],
  ]) {
    const pool = new THREE.Mesh(wcPoolGeo, lakeWaterMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(qx, ACADEMY.westCloisterY + 0.03, qz);
    interiorGroup.add(pool);

    // 4 Open-Air Ruined Stone Gazebos centered on each reflective pool quadrant
    const gaz = new THREE.Group();
    gaz.position.set(qx, ACADEMY.westCloisterY, qz);
    interiorGroup.add(gaz);

    const plinth = new THREE.Mesh(track(new THREE.CylinderGeometry(1.4, 1.6, 0.65, 8)), carvedRibMat);
    plinth.position.y = 0.32;
    gaz.add(plinth);
    const colShaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.45, 0.6, 6.2, 8)), limestoneMat);
    colShaft.position.y = 3.4;
    gaz.add(colShaft);
    const roof = new THREE.Mesh(track(new THREE.ConeGeometry(2.2, 3.2, 6)), slateRoofMat);
    roof.position.y = 8.0;
    gaz.add(roof);

    for (let s = 0; s < 4; s++) {
      const curb = new THREE.Mesh(wcCurbGeo, carvedRibMat);
      curb.rotation.y = (s * Math.PI) / 2;
      curb.position.set(qx + Math.sin((s * Math.PI) / 2) * 8.4, ACADEMY.westCloisterY + 0.12, qz + Math.cos((s * Math.PI) / 2) * 8.4);
      interiorGroup.add(curb);
    }
  }

  // Cloister Perimeter Open Colonnade Arcades along outer West & South Courtyard rims
  for (let i = 0; i < 7; i++) {
    const offset = -21.0 + i * 7.0;
    westViaductBays.push({ x: ACADEMY.westCloisterMinX + 1.2, y: ACADEMY.westCloisterY, z: wcCenterZ + offset, ry: Math.PI / 2 });
    if (i !== 3) {
      westViaductBays.push({ x: wcCenterX + offset, y: ACADEMY.westCloisterMinZ + 1.2 < 0 ? ACADEMY.westCloisterY : ACADEMY.westCloisterY, z: ACADEMY.westCloisterMaxZ - 1.2, ry: 0 });
    }
  }

  // Wide West Terrace Ascent Staircase climbing from Western Cloister Courtyard (-812 -> -844, y: -11.5 -> -3.65)
  const buildWorldStairFlight = (
    cx: number,
    width: number,
    zStart: number,
    zEnd: number,
    yStart: number,
    yEnd: number,
    steps: number,
  ) => {
    const len = Math.abs(zStart - zEnd);
    const stepDepth = (len / steps) * 1.15;
    const stepRise = Math.abs(yEnd - yStart) / steps;
    const thick = Math.max(0.5, stepRise + 0.25);
    const sGeo = track(new THREE.BoxGeometry(width, thick, stepDepth));
    const sMesh = addWalkable(new THREE.InstancedMesh(sGeo, flagstoneMat, steps));
    sMesh.receiveShadow = true;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const sz = THREE.MathUtils.lerp(zStart, zEnd, t);
      const sy = THREE.MathUtils.lerp(yStart, yEnd, t) - thick * 0.5;
      dummy.position.set(cx, sy, sz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      sMesh.setMatrixAt(i, dummy.matrix);
    }
    sMesh.instanceMatrix.needsUpdate = true;
    sMesh.computeBoundingBox();
    sMesh.computeBoundingSphere();
    interiorGroup.add(sMesh);
  };

  buildWorldStairFlight(-106.0, 12.0, ACADEMY.westCloisterMinZ, -844.0, ACADEMY.westCloisterY, ACADEMY.midLandingY, 34);
  for (let i = 0; i < 4; i++) {
    const sz = THREE.MathUtils.lerp(ACADEMY.westCloisterMinZ + 2, -842.0, i / 3);
    const sy = THREE.MathUtils.lerp(ACADEMY.westCloisterY, ACADEMY.midLandingY, i / 3);
    causewayLanterns.push([-111.5, sy, sz, 1]);
    causewayLanterns.push([-100.5, sy, sz, -1]);
    if (i > 0) {
      westViaductBays.push({ x: -106.0, y: ACADEMY.lakeWaterY - 4.0, z: sz, ry: Math.PI / 2 });
    }
  }

  // -------------------------------------------------------------------------
  // 2C. EAST WING — ASTRONOMICAL PIER & HARBOR ROTUNDA BASTION
  // -------------------------------------------------------------------------
  const eastSegs = 28;
  const eastDeckInst = addWalkable(new THREE.InstancedMesh(wingDeckSegGeo, dampMasonryMat, eastSegs));
  eastDeckInst.receiveShadow = true;

  for (let i = 0; i < eastSegs; i++) {
    const t = (i + 0.5) / eastSegs;
    const x = THREE.MathUtils.lerp(8.0, 94.0, t);
    const z = getEastPromenadeZ(x);
    const y = getEastPromenadeY(x);
    const dz = getEastPromenadeZ(x + 1.0) - getEastPromenadeZ(x - 1.0);
    const ry = -Math.atan2(dz, 2.0);

    dummy.position.set(x, y - 0.62, z);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    eastDeckInst.setMatrixAt(i, dummy.matrix);

    if (i % 2 === 1 && i < eastSegs - 1) {
      westViaductBays.push({ x, y: y - 8.6, z, ry });
    }
    if (i % 3 === 1 && i > 1 && i < eastSegs - 1) {
      const nx = Math.sin(ry);
      const nz = Math.cos(ry);
      causewayParapets.push({ x: x + nx * 4.6, y: y + 0.5, z: z + nz * 4.6, h: 0.9 });
      causewayParapets.push({ x: x - nx * 4.6, y: y + 0.5, z: z - nz * 4.6, h: 0.9 });
    }
    if (i % 6 === 3) {
      const nx = Math.sin(ry);
      const nz = Math.cos(ry);
      causewayLanterns.push([x + nx * 4.3, y, z + nz * 4.3, -1]);
      causewayLanterns.push([x - nx * 4.3, y, z - nz * 4.3, 1]);
    }
  }
  eastDeckInst.instanceMatrix.needsUpdate = true;
  eastDeckInst.computeBoundingBox();
  eastDeckInst.computeBoundingSphere();
  interiorGroup.add(eastDeckInst);

  // Instantiate shared wing aqueduct arch bays (West Viaduct + Cloister Arcade + East Promenade)
  const wingBaysInst = new THREE.InstancedMesh(wingArchBayGeo, limestoneMat, westViaductBays.length);
  westViaductBays.forEach((wb, idx) => {
    dummy.position.set(wb.x, wb.y, wb.z);
    dummy.rotation.set(0, wb.ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    wingBaysInst.setMatrixAt(idx, dummy.matrix);
  });
  wingBaysInst.instanceMatrix.needsUpdate = true;
  wingBaysInst.computeBoundingSphere();
  interiorGroup.add(wingBaysInst);

  // Eastern Lakeside Bastion & Harbor Rotunda (center (120, -784), radius = 28m, y = -12.0)
  const eastPlaza = addWalkable(
    new THREE.Mesh(
      track(new THREE.CylinderGeometry(ACADEMY.eastRotundaRadius, ACADEMY.eastRotundaRadius + 3.0, 3.8, 36)),
      flagstoneMat,
    ),
  );
  eastPlaza.position.set(ACADEMY.eastRotundaCx, ACADEMY.eastBastionY - 1.91, ACADEMY.eastRotundaCz);
  eastPlaza.receiveShadow = true;
  interiorGroup.add(eastPlaza);

  const eastAstrolabeFloor = new THREE.Mesh(track(new THREE.CircleGeometry(18.0, 36)), astrolabeMat);
  eastAstrolabeFloor.rotation.x = -Math.PI / 2;
  eastAstrolabeFloor.position.set(ACADEMY.eastRotundaCx, ACADEMY.eastBastionY + 0.03, ACADEMY.eastRotundaCz);
  interiorGroup.add(eastAstrolabeFloor);

  // Central Astronomical Sundial Pedestal at Harbor Rotunda center (120, -784)
  const sundialBase = new THREE.Mesh(track(new THREE.CylinderGeometry(1.4, 1.75, 1.8, 8)), carvedRibMat);
  sundialBase.position.set(ACADEMY.eastRotundaCx, ACADEMY.eastBastionY + 0.9, ACADEMY.eastRotundaCz);
  interiorGroup.add(sundialBase);
  const sundialStem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.16, 0.28, 1.35, 8)), blackIronMat);
  sundialStem.position.set(ACADEMY.eastRotundaCx, ACADEMY.eastBastionY + 2.35, ACADEMY.eastRotundaCz);
  interiorGroup.add(sundialStem);
  const sundialRing = new THREE.Mesh(track(new THREE.TorusGeometry(1.1, 0.12, 8, 28)), goldLancetMat);
  sundialRing.position.set(ACADEMY.eastRotundaCx, ACADEMY.eastBastionY + 2.95, ACADEMY.eastRotundaCz);
  sundialRing.rotation.x = 0.55;
  interiorGroup.add(sundialRing);
  const sundialGnomon = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6)), blackIronMat);
  sundialGnomon.position.set(ACADEMY.eastRotundaCx, ACADEMY.eastBastionY + 2.95, ACADEMY.eastRotundaCz);
  sundialGnomon.rotation.x = -0.75;
  interiorGroup.add(sundialGnomon);

  // Stepped Harbor Docks descending south to the turquoise lake waterline (z: -758.5 -> -744, y: -12.0 -> -13.85)
  buildWorldStairFlight(120.0, 28.0, -758.5, -744.0, ACADEMY.eastBastionY, -13.85, 10);
  causewayLanterns.push([106.8, -13.8, -744.5, 1]);
  causewayLanterns.push([133.2, -13.8, -744.5, -1]);

  // Tall Octagonal Coastal Watchtower on outer East Rim ((138, -784), exterior only, r=7.4 collider)
  const watchtowerGroup = new THREE.Group();
  watchtowerGroup.position.set(138.0, ACADEMY.eastBastionY, -784.0);
  interiorGroup.add(watchtowerGroup);

  const wtPlinth = new THREE.Mesh(track(new THREE.CylinderGeometry(7.2, 7.8, 8.0, 8)), carvedRibMat);
  wtPlinth.position.y = 4.0;
  wtPlinth.rotation.y = Math.PI / 8;
  watchtowerGroup.add(wtPlinth);
  const wtShaft = new THREE.Mesh(track(new THREE.CylinderGeometry(6.0, 6.6, 38.0, 8)), limestoneMat);
  wtShaft.position.y = 27.0;
  wtShaft.rotation.y = Math.PI / 8;
  watchtowerGroup.add(wtShaft);
  const wtBelfry = new THREE.Mesh(track(new THREE.CylinderGeometry(6.8, 6.2, 4.5, 8)), carvedRibMat);
  wtBelfry.position.y = 48.0;
  wtBelfry.rotation.y = Math.PI / 8;
  watchtowerGroup.add(wtBelfry);
  const wtRoof = new THREE.Mesh(track(new THREE.ConeGeometry(6.9, 22.0, 8)), slateRoofMat);
  wtRoof.position.y = 61.0;
  wtRoof.rotation.y = Math.PI / 8;
  watchtowerGroup.add(wtRoof);
  const wtLancetGeo = track(new THREE.ShapeGeometry(createPointedWindowShape(1.4, 7.5)));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const slit = new THREE.Mesh(wtLancetGeo, goldLancetMat);
    slit.position.set(Math.sin(a) * 5.95, 32.0, Math.cos(a) * 5.95);
    slit.rotation.y = a;
    watchtowerGroup.add(slit);
  }

  // Elevated Arched Sky-Bridge linking Harbor Rotunda into Academy East Rampart (-810 -> -844)
  buildWorldStairFlight(112.0, 12.0, -810.0, -844.0, ACADEMY.eastBastionY, ACADEMY.midLandingY, 34);
  for (let i = 0; i < 4; i++) {
    const sz = THREE.MathUtils.lerp(-812.0, -842.0, i / 3);
    const sy = THREE.MathUtils.lerp(ACADEMY.eastBastionY, ACADEMY.midLandingY, i / 3);
    causewayLanterns.push([106.5, sy, sz, 1]);
    causewayLanterns.push([117.5, sy, sz, -1]);
  }

  // Instanced Causeway + Wing Parapet Posts & Raven/Gargoyle Lampposts
  const parapetInst = new THREE.InstancedMesh(parapetPostGeo, limestoneMat, causewayParapets.length);
  causewayParapets.forEach((p, idx) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, ((idx % 3) - 1) * 0.08, 0);
    dummy.scale.set(1, p.h, 1);
    dummy.updateMatrix();
    parapetInst.setMatrixAt(idx, dummy.matrix);
  });
  parapetInst.instanceMatrix.needsUpdate = true;
  parapetInst.computeBoundingSphere();
  interiorGroup.add(parapetInst);

  // =========================================================================
  // 3. COLOSSAL SUNKEN ARCANE ACADEMY CITADEL (academyCastleGroup, true 1:1 scale)
  //    2.4x Horizontal / 2.8x Vertical Scale + Upper Astral Citadel Tier
  //    100% Exterior Only · Zero Interiors · Full Switchback Walkable Terraces
  // =========================================================================
  const academyCastleGroup = new THREE.Group();
  academyCastleGroup.position.set(ACADEMY.castleBaseX, ACADEMY.castleBaseY, ACADEMY.castleBaseZ);
  interiorGroup.add(academyCastleGroup);

  const buildLocalStairFlight = (
    cx: number,
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
    const thick = Math.max(0.45, stepRise + 0.18);
    const geo = track(new THREE.BoxGeometry(width, thick, stepDepth));
    const mesh = addWalkable(new THREE.InstancedMesh(geo, mat, steps));
    mesh.receiveShadow = true;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const sz = THREE.MathUtils.lerp(zMax, zMin, t);
      const sy = THREE.MathUtils.lerp(yStart, yEnd, t) - thick * 0.5;
      dummy.position.set(cx, sy, sz);
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
  // 3A. PLAYABLE MULTI-TIERED PROMENADES, SWITCHBACK STAIRS & GRAND FORECOURT
  // -------------------------------------------------------------------------
  // 1. Central Lower Cascading Staircase (local z: 0 -> -22, y: 0 -> +10)
  buildLocalStairFlight(0, 14.0, 0.0, -22.0, 0.0, 10.0, 26, flagstoneMat);

  // 2. Lower Waterline Seawall Harbor Docks & Ramp Connectors (local y: 0 -> +2.0, z: 0..-24)
  for (const side of [-1, 1]) {
    // Solid masonry ramp connecting main approach (±6.8..±16.2) to seawall docks (y=2.0)
    const connSteps = 10;
    const cGeo = track(new THREE.BoxGeometry(1.15, 2.6, 10.0));
    const cMesh = addWalkable(new THREE.InstancedMesh(cGeo, flagstoneMat, connSteps));
    for (let i = 0; i < connSteps; i++) {
      const t = (i + 0.5) / connSteps;
      dummy.position.set(side * THREE.MathUtils.lerp(6.8, 16.2, t), THREE.MathUtils.lerp(0, 2.0, t) - 1.3, 3.0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cMesh.setMatrixAt(i, dummy.matrix);
    }
    cMesh.instanceMatrix.needsUpdate = true;
    cMesh.computeBoundingBox();
    cMesh.computeBoundingSphere();
    academyCastleGroup.add(cMesh);

    // Lower Seawall Harbor Dock Platform (|x|: 16..86, local z: 0..-24, local y = +2.0)
    const seawallDock = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(70.0, 5.5, 24.0)), limestoneMat));
    seawallDock.position.set(side * 51.0, -0.75, -12.0);
    seawallDock.receiveShadow = true;
    academyCastleGroup.add(seawallDock);

    // Switchback Staircase from Seawall Dock up to Mid-Tier Perimeter Rampart (|x|: 74..84, local z: 0 -> -24, y: 2 -> 10)
    buildLocalStairFlight(side * 79.0, 10.0, 0.0, -24.0, 2.0, 10.0, 22, flagstoneMat);
  }

  // 3. Central Mid Astrolabe Landing (local z: -22 -> -32, y = +10) & Wide Flanking Mid-Tier Rampart Promenades!
  const midLanding = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(22.0, 14.0, 10.4)), limestoneMat));
  midLanding.position.set(0, 3.0, -27.0);
  midLanding.receiveShadow = true;
  academyCastleGroup.add(midLanding);

  const midMosaic = new THREE.Mesh(track(new THREE.CircleGeometry(4.6, 32)), astrolabeMat);
  midMosaic.rotation.x = -Math.PI / 2;
  midMosaic.position.set(0, 10.03, -27.0);
  academyCastleGroup.add(midMosaic);

  // Mid-Tier Perimeter Rampart Promenades (local x: -118..-10.5 & 10.5..120, local z: -24..-60, local y = +10)
  const westRampart = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(107.5, 14.0, 36.0)), limestoneMat));
  westRampart.position.set(-64.25, 3.0, -42.0);
  westRampart.receiveShadow = true;
  academyCastleGroup.add(westRampart);

  const eastRampart = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(109.5, 14.0, 36.0)), limestoneMat));
  eastRampart.position.set(65.25, 3.0, -42.0);
  eastRampart.receiveShadow = true;
  academyCastleGroup.add(eastRampart);

  // 4. Upper Grand Stairway (central) + Flanking Left & Right Wing Switchback Stairways (local z: -32 -> -54, y: +10 -> +20)
  buildLocalStairFlight(0, 12.0, -32.0, -54.0, 10.0, 20.0, 26, flagstoneMat);
  buildLocalStairFlight(-59.0, 10.0, -32.0, -54.0, 10.0, 20.0, 26, flagstoneMat);
  buildLocalStairFlight(59.0, 10.0, -32.0, -54.0, 10.0, 20.0, 26, flagstoneMat);

  // 5. Widened Grand Cathedral Forecourt & Wing Terraces (local x: -76..+76, local z: -54 -> -86, y = +20)
  const forecourtMesh = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(152.0, 24.0, 32.5)), limestoneMat));
  forecourtMesh.position.set(0, 8.0, -70.0);
  forecourtMesh.receiveShadow = true;
  academyCastleGroup.add(forecourtMesh);

  // Solid sloped stair undersides so stairs look grounded
  const lowerStairBase = new THREE.Mesh(track(new THREE.BoxGeometry(14.6, 14.0, 23.8)), striatedCliffMat);
  lowerStairBase.position.set(0, -3.5, -11.0);
  lowerStairBase.rotation.x = Math.atan2(10, 22);
  academyCastleGroup.add(lowerStairBase);

  for (const sx of [0, -59.0, 59.0]) {
    const uBase = new THREE.Mesh(track(new THREE.BoxGeometry(sx === 0 ? 12.6 : 10.6, 14.0, 23.8)), limestoneMat);
    uBase.position.set(sx, 6.5, -43.0);
    uBase.rotation.x = Math.atan2(10, 22);
    academyCastleGroup.add(uBase);
  }

  // Pierced Gothic Stone Balustrades (InstancedMesh) framing every central & wing stair
  const balBayGeo = track(createGothicBayGeometry(2.0, 1.35, 1.1, 0.95, 0.42));
  const balRailGeo = track(new THREE.BoxGeometry(2.05, 0.22, 0.56));
  const balTransforms: Array<{ x: number; y: number; z: number; rx: number; ry: number }> = [];
  const stairSlope = Math.atan2(10, 22);

  for (let i = 0; i < 11; i++) {
    const t = (i + 0.5) / 11;
    const bz = THREE.MathUtils.lerp(0, -22, t);
    const by = THREE.MathUtils.lerp(0, 10, t);
    for (const side of [-1, 1]) {
      balTransforms.push({ x: side * 7.2, y: by, z: bz, rx: stairSlope, ry: Math.PI / 2 });
    }
  }
  for (let i = 0; i < 11; i++) {
    const t = (i + 0.5) / 11;
    const bz = THREE.MathUtils.lerp(-32, -54, t);
    const by = THREE.MathUtils.lerp(10, 20, t);
    for (const side of [-1, 1]) {
      balTransforms.push({ x: side * 6.2, y: by, z: bz, rx: stairSlope, ry: Math.PI / 2 });
      balTransforms.push({ x: -59.0 + side * 5.2, y: by, z: bz, rx: stairSlope, ry: Math.PI / 2 });
      balTransforms.push({ x: 59.0 + side * 5.2, y: by, z: bz, rx: stairSlope, ry: Math.PI / 2 });
    }
  }
  for (let i = 0; i < 18; i++) {
    const bx = THREE.MathUtils.lerp(-116, 116, i / 17);
    if (Math.abs(bx) < 12 || Math.abs(bx - -106) < 8 || Math.abs(bx - 112) < 8 || Math.abs(Math.abs(bx) - 79) < 7) continue;
    balTransforms.push({ x: bx, y: 10.0, z: -24.3, rx: 0, ry: 0 });
  }
  for (let i = 0; i < 14; i++) {
    const bx = THREE.MathUtils.lerp(-74, 74, i / 13);
    if (Math.abs(bx) < 7 || Math.abs(Math.abs(bx) - 59) < 6) continue;
    balTransforms.push({ x: bx, y: 20.0, z: -54.3, rx: 0, ry: 0 });
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

  // Ornamental Forecourt Gate Screen at top of Central Upper Stair (local z = -54.2, wide unobstructed 12.2m opening!)
  const forecourtGateArchGeo = track(
    scaleExtrudeUVs(
      new THREE.ExtrudeGeometry(createArchShape(12.4, 12.4, 1.45), { depth: 1.4, bevelEnabled: false }),
      0.08,
    ),
  );
  forecourtGateArchGeo.translate(0, 0, -0.7);
  const forecourtGateArch = new THREE.Mesh(forecourtGateArchGeo, limestoneMat);
  forecourtGateArch.position.set(0, 20.0, -54.2);
  academyCastleGroup.add(forecourtGateArch);

  for (const side of [-1, 1]) {
    const gPier = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 17.0, 2.8)), limestoneMat);
    gPier.position.set(side * 7.8, 28.5, -54.2);
    academyCastleGroup.add(gPier);
    const gPinnacle = new THREE.Mesh(track(new THREE.ConeGeometry(1.5, 7.5, 4)), carvedRibMat);
    gPinnacle.position.set(side * 7.8, 40.5, -54.2);
    gPinnacle.rotation.y = Math.PI / 4;
    academyCastleGroup.add(gPinnacle);

    // Forecourt Braziers & Guardian Statues (exact match to STATIC_COLLIDERS!)
    statuePlacements.push({ x: side * 34.0, y: ACADEMY.forecourtY, z: -892.0, yaw: -side * 0.45, s: 1.35 });
  }

  // Instantiate all Veiled Scholar Statues across Causeway & Forecourt
  const statPlinthInst = new THREE.InstancedMesh(plinthBaseGeo, limestoneMat, statuePlacements.length);
  const statCapInst = new THREE.InstancedMesh(plinthCapGeo, carvedRibMat, statuePlacements.length);
  const statBodyInst = new THREE.InstancedMesh(statueBodyGeo, veiledStatueMat, statuePlacements.length);
  statuePlacements.forEach((sp, idx) => {
    dummy.position.set(sp.x, sp.y, sp.z);
    dummy.rotation.set(0, sp.yaw, 0);
    dummy.scale.setScalar(sp.s);
    dummy.updateMatrix();
    statPlinthInst.setMatrixAt(idx, dummy.matrix);
    statCapInst.setMatrixAt(idx, dummy.matrix);
    statBodyInst.setMatrixAt(idx, dummy.matrix);
  });
  statPlinthInst.instanceMatrix.needsUpdate = true;
  statCapInst.instanceMatrix.needsUpdate = true;
  statBodyInst.instanceMatrix.needsUpdate = true;
  statPlinthInst.computeBoundingSphere();
  statCapInst.computeBoundingSphere();
  statBodyInst.computeBoundingSphere();
  interiorGroup.add(statPlinthInst, statCapInst, statBodyInst);

  // Add Academy Staircase & Forecourt Raven Lampposts to unified InstancedMesh batch
  for (const side of [-1, 1]) {
    causewayLanterns.push([side * 6.8, ACADEMY.castleBaseY, -822.8, -side]);
    causewayLanterns.push([side * 6.8, ACADEMY.castleBaseY + 5.0, -831.0, -side]);
    causewayLanterns.push([side * 9.8, ACADEMY.midLandingY, -849.2, -side]);
    causewayLanterns.push([side * 5.8, ACADEMY.midLandingY + 5.0, -863.0, -side]);
    causewayLanterns.push([side * 10.6, ACADEMY.forecourtY, -882.0, -side]);
    causewayLanterns.push([side * 10.6, ACADEMY.forecourtY, -898.0, -side]);
    causewayLanterns.push([side * 44.0, ACADEMY.forecourtY, -882.0, -side]);
  }

  // Unified InstancedMesh Raven/Gargoyle Lampposts across the entire Lake & Academy Grounds
  const lpBase = new THREE.CylinderGeometry(0.32, 0.44, 0.8, 8);
  lpBase.translate(0, 0.4, 0);
  const lpPole = new THREE.CylinderGeometry(0.08, 0.14, 4.4, 8);
  lpPole.translate(0, 2.8, 0);
  const lpArm = new THREE.BoxGeometry(1.15, 0.1, 0.1);
  lpArm.translate(0.48, 4.85, 0);
  const lpRaven = new THREE.SphereGeometry(0.28, 7, 5);
  lpRaven.scale(0.9, 1.25, 1.3);
  lpRaven.translate(0, 5.18, 0);
  const lpCap = new THREE.ConeGeometry(0.34, 0.32, 6);
  lpCap.translate(0.96, 4.18, 0);
  const lampMetalGeo = track(mergeGeometries([lpBase, lpPole, lpArm, lpRaven, lpCap])!);
  lpBase.dispose();
  lpPole.dispose();
  lpArm.dispose();
  lpRaven.dispose();
  lpCap.dispose();

  const lampGlowGeo = track(new THREE.OctahedronGeometry(0.26, 0));
  lampGlowGeo.translate(0.96, 3.84, 0);

  const lampMetalInst = new THREE.InstancedMesh(lampMetalGeo, blackIronMat, causewayLanterns.length);
  const lampGlowInst = new THREE.InstancedMesh(lampGlowGeo, amberLanternMat, causewayLanterns.length);
  causewayLanterns.forEach(([lx, ly, lz, dir], idx) => {
    dummy.position.set(lx, ly, lz);
    dummy.rotation.set(0, dir > 0 ? 0 : Math.PI, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lampMetalInst.setMatrixAt(idx, dummy.matrix);
    lampGlowInst.setMatrixAt(idx, dummy.matrix);
  });
  lampMetalInst.instanceMatrix.needsUpdate = true;
  lampGlowInst.instanceMatrix.needsUpdate = true;
  lampMetalInst.computeBoundingSphere();
  lampGlowInst.computeBoundingSphere();
  interiorGroup.add(lampMetalInst, lampGlowInst);

  // -------------------------------------------------------------------------
  // 3B. COLOSSAL JAGGED BASALT CLIFF ISLAND & 2.4x/2.8x PERIMETER ARCADE WALLS
  // -------------------------------------------------------------------------
  // Jagged faceted basalt cliff crags (strictly behind z < -62 or outside |x| > 82 so ALL staircases stay 100% clear!)
  const cragGeo = track(new THREE.CylinderGeometry(0.66, 1.18, 1, 7));
  cragGeo.translate(0, 0.5, 0);

  const cragSpecs: Array<{ x: number; y: number; z: number; rx: number; h: number; rz: number; rot: number }> = [
    // Flanking coastal rock buttresses framing outer wings cleanly BEHIND the playable mid-tier ramparts (z <= -92)
    { x: -124, y: -8, z: -92, rx: 26, h: 42, rz: 26, rot: 0.4 },
    { x: 124, y: -8, z: -92, rx: 26, h: 42, rz: 26, rot: -0.5 },
    { x: -126, y: -8, z: -116, rx: 36, h: 68, rz: 38, rot: 0.9 },
    { x: 126, y: -8, z: -116, rx: 36, h: 68, rz: 38, rot: -0.8 },
    // Left Wing colossal plateau cliffs supporting scaled Left Cathedral Wing
    { x: -108, y: -8, z: -136, rx: 48, h: 86, rz: 52, rot: 0.3 },
    { x: -145, y: -8, z: -158, rx: 40, h: 78, rz: 44, rot: 1.2 },
    // Right Wing colossal plateau cliffs supporting scaled Octagonal Rotunda & Bell Towers
    { x: 96, y: -8, z: -128, rx: 48, h: 88, rz: 52, rot: 0.7 },
    { x: 138, y: -8, z: -154, rx: 42, h: 80, rz: 46, rot: -1.1 },
    // Massive Rear Observatory Foundation Crags
    { x: 0, y: -8, z: -168, rx: 64, h: 92, rz: 58, rot: 0.5 },
    { x: -58, y: -8, z: -188, rx: 52, h: 86, rz: 48, rot: -0.9 },
    { x: 58, y: -8, z: -188, rx: 52, h: 86, rz: 48, rot: 0.8 },
    { x: 0, y: -8, z: -222, rx: 58, h: 78, rz: 48, rot: 0.1 },
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

  // Solid rocky island seabed shelf seated cleanly BELOW the y=0 lower stairs & y=+2 seawall docks
  const lowerIslandBed = new THREE.Mesh(track(new THREE.CylinderGeometry(142, 160, 10, 28)), striatedCliffMat);
  lowerIslandBed.position.set(0, -6.0, -148);
  academyCastleGroup.add(lowerIslandBed);

  const leftPlateau = new THREE.Mesh(track(new THREE.CylinderGeometry(48, 56, 26, 10)), striatedCliffMat);
  leftPlateau.position.set(-108, 42, -138);
  academyCastleGroup.add(leftPlateau);

  const rightPlateau = new THREE.Mesh(track(new THREE.CylinderGeometry(48, 56, 28, 10)), striatedCliffMat);
  rightPlateau.position.set(96, 43, -132);
  academyCastleGroup.add(rightPlateau);

  // Colossal 2.4x Sweeping Perimeter Pointed-Arch Arcade Curtain Wall wrapping the rocky island (rX = 166, rZ = 148)
  const islandCenterZ = -148;
  const perimeterBayGeo = track(createGothicBayGeometry(14.8, 28.0, 9.4, 20.5, 4.4));
  const perimeterCopingGeo = track(new THREE.BoxGeometry(15.2, 1.8, 5.4));
  const perimeterPierGeo = track(new THREE.BoxGeometry(3.4, 33.0, 5.8));
  const perimeterPinnacleGeo = track(new THREE.ConeGeometry(1.8, 8.8, 4));

  const arcadeBays: Array<{ x: number; y: number; z: number; ry: number }> = [];
  const totalPerimSteps = 56;
  for (let i = 0; i < totalPerimSteps; i++) {
    const a = (i / totalPerimSteps) * Math.PI * 2;
    const rx = Math.sin(a) * 166;
    const rz = islandCenterZ + Math.cos(a) * 148;
    // Leave wide open sweep along the front playable seawall/ramps/wings (rz > -68)
    if (rz > -68) continue;
    const tangentYaw = Math.atan2(Math.cos(a) * 166, -Math.sin(a) * 148);
    arcadeBays.push({ x: rx, y: -2.0, z: rz, ry: tangentYaw + Math.PI / 2 });
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

    dummy.position.set(ab.x, ab.y + 28.5, ab.z);
    dummy.updateMatrix();
    perimCopingInst.setMatrixAt(idx, dummy.matrix);

    const pierX = ab.x + Math.cos(ab.ry) * 7.4;
    const pierZ = ab.z - Math.sin(ab.ry) * 7.4;
    dummy.position.set(pierX, ab.y + 15.5, pierZ);
    dummy.updateMatrix();
    perimPiersInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(pierX, ab.y + 35.8, pierZ);
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

  // Golden-Amber Autumn Trees & Dark Cypresses (InstancedMesh) across Academy Terraces, Cloister & Island Rim
  const autumnTreeCoords: Array<{ x: number; y: number; z: number; s: number; rot: number }> = [];
  const cypressCoords: Array<{ x: number; y: number; z: number; s: number }> = [];

  for (let i = 0; i < arcadeBays.length; i += 2) {
    const ab = arcadeBays[i];
    if (ab.z > -92) continue;
    const inwardX = ab.x * 0.88;
    const inwardZ = islandCenterZ + (ab.z - islandCenterZ) * 0.88;
    autumnTreeCoords.push({ x: inwardX, y: 24.0, z: inwardZ, s: 1.85 + (i % 4) * 0.25, rot: i * 1.1 });
    if (i % 4 === 0) {
      cypressCoords.push({ x: ab.x * 0.82, y: 25.0, z: islandCenterZ + (ab.z - islandCenterZ) * 0.82, s: 1.8 + (i % 3) * 0.3 });
    }
  }
  // Trees on Forecourt Wing Terraces & Mid-Tier Ramparts
  for (const [tx, ty, tz, ts] of [
    [-46.0, 20.0, -78.0, 1.35],
    [46.0, 20.0, -78.0, 1.35],
    [-68.0, 20.0, -74.0, 1.45],
    [68.0, 20.0, -74.0, 1.45],
    [-94.0, 10.0, -56.0, 1.3],
    [94.0, 10.0, -56.0, 1.3],
  ]) {
    autumnTreeCoords.push({ x: tx, y: ty, z: tz, s: ts, rot: tx * 0.2 });
  }
  // Trees planted in West Cloister Courtyard outer stone beds (safely clear of walkable walkways)
  for (const [wx, wz] of [
    [-145, -760],
    [-145, -808],
    [-95, -760],
    [-95, -808],
  ]) {
    autumnTreeCoords.push({
      x: wx,
      y: ACADEMY.westCloisterY - ACADEMY.castleBaseY,
      z: wz - ACADEMY.castleBaseZ,
      s: 1.25,
      rot: wx * 0.3,
    });
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

  // Dark Gothic Cypresses (InstancedMesh)
  const cTrunkGeo = track(new THREE.CylinderGeometry(0.18, 0.34, 3.5, 5));
  cTrunkGeo.translate(0, 1.75, 0);
  const cConeGeo = track(new THREE.ConeGeometry(1.4, 9.6, 7));
  cConeGeo.translate(0, 7.2, 0);
  const cTrunks = new THREE.InstancedMesh(cTrunkGeo, barkMat, cypressCoords.length);
  const cCones = new THREE.InstancedMesh(cConeGeo, cypressFoliageMat, cypressCoords.length);
  cypressCoords.forEach((cc, idx) => {
    dummy.position.set(cc.x, cc.y, cc.z);
    dummy.rotation.set(0, idx * 0.7, 0);
    dummy.scale.setScalar(cc.s);
    dummy.updateMatrix();
    cTrunks.setMatrixAt(idx, dummy.matrix);
    cCones.setMatrixAt(idx, dummy.matrix);
  });
  cTrunks.instanceMatrix.needsUpdate = true;
  cCones.instanceMatrix.needsUpdate = true;
  cTrunks.computeBoundingSphere();
  cCones.computeBoundingSphere();
  academyCastleGroup.add(cTrunks, cCones);

  // -------------------------------------------------------------------------
  // 3C. COLOSSAL MAIN CATHEDRAL ELEVATION (2.4x W x 2.8x H, local z = -86, y = 20+)
  // -------------------------------------------------------------------------
  const facadeZ = -86.0;
  const facadeBaseY = 20.0;

  // Main Cathedral Nave Body (66m wide x 118m tall x 98m deep!)
  const naveBody = new THREE.Mesh(track(new THREE.BoxGeometry(66.0, 118.0, 98.0)), limestoneMat);
  naveBody.position.set(0, facadeBaseY + 59.0, facadeZ - 50.5);
  academyCastleGroup.add(naveBody);

  const naveRoof = new THREE.Mesh(track(createSteepRoofGeometry(70.0, 56.0, 102.0)), slateRoofMat);
  naveRoof.position.set(0, facadeBaseY + 118.0, facadeZ - 49.0);
  academyCastleGroup.add(naveRoof);

  // Pointed Gable Front Wall with deep Portal Arch Cutout
  const gableFront = new THREE.Mesh(
    track(createGableArchWallGeometry(66.0, 118.0, 174.0, 22.0, 38.0, 3.2)),
    limestoneMat,
  );
  gableFront.position.set(0, facadeBaseY, facadeZ + 0.2);
  academyCastleGroup.add(gableFront);

  // Recessed Multi-Order Gothic Portal Moldings & Sealed Double Cathedral Doors
  for (let order = 0; order < 3; order++) {
    const w = 26.5 - order * 2.6;
    const h = 42.0 - order * 2.4;
    const archOrderGeo = track(
      new THREE.ExtrudeGeometry(createArchShape(w, h, 2.8), {
        depth: 2.6,
        bevelEnabled: true,
        bevelSize: 0.14,
        bevelThickness: 0.14,
      }),
    );
    archOrderGeo.translate(0, 0, -1.3);
    const archOrder = new THREE.Mesh(archOrderGeo, order === 1 ? carvedRibMat : limestoneMat);
    archOrder.position.set(0, facadeBaseY, facadeZ + 2.8 - order * 1.6);
    academyCastleGroup.add(archOrder);
  }

  const portalPediment = new THREE.Mesh(
    track(createGableArchWallGeometry(36.0, 24.0, 52.0, 24.0, 39.0, 2.8)),
    carvedRibMat,
  );
  portalPediment.position.set(0, facadeBaseY, facadeZ + 3.0);
  academyCastleGroup.add(portalPediment);

  for (const side of [-1, 1]) {
    const cDoor = new THREE.Mesh(track(new THREE.BoxGeometry(10.6, 37.0, 1.4)), slateRoofMat);
    cDoor.position.set(side * 5.4, facadeBaseY + 18.5, facadeZ - 1.6);
    academyCastleGroup.add(cDoor);
    for (const sy of [6.0, 14.5, 23.0, 31.5]) {
      const band = new THREE.Mesh(track(new THREE.BoxGeometry(10.2, 0.7, 1.7)), blackIronMat);
      band.position.set(side * 5.4, facadeBaseY + sy, facadeZ - 1.6);
      academyCastleGroup.add(band);
    }
  }
  const arcaneSealMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x5cc8ff,
      emissive: new THREE.Color(0x2884d8),
      emissiveIntensity: 1.7,
      roughness: 0.22,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    }),
  );
  const cathSealOuter = new THREE.Mesh(track(new THREE.TorusGeometry(4.8, 0.16, 8, 36)), arcaneSealMat);
  cathSealOuter.position.set(0, facadeBaseY + 19.0, facadeZ - 0.82);
  academyCastleGroup.add(cathSealOuter);
  const cathSealInner = new THREE.Mesh(track(new THREE.TorusGeometry(3.0, 0.11, 8, 28)), arcaneSealMat);
  cathSealInner.position.set(0, facadeBaseY + 19.0, facadeZ - 0.82);
  academyCastleGroup.add(cathSealInner);
  void soulCyanMat;

  // Triple Tall Glowing Warm-Gold Lancet Windows beneath Rose Window
  const mainLancetGeo = track(new THREE.ShapeGeometry(createPointedWindowShape(5.2, 27.5)));
  const centerLancetGeo = track(new THREE.ShapeGeometry(createPointedWindowShape(5.8, 32.0)));
  const lancetFrameGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(5.4, 27.8, 0.9), { depth: 1.2, bevelEnabled: false }),
  );
  lancetFrameGeo.translate(0, 0, -0.6);
  const centerFrameGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(6.0, 32.3, 1.0), { depth: 1.2, bevelEnabled: false }),
  );
  centerFrameGeo.translate(0, 0, -0.6);

  for (const [lx, isCenter] of [
    [-9.6, false],
    [0.0, true],
    [9.6, false],
  ] as const) {
    const wy = facadeBaseY + 58.0;
    const glass = new THREE.Mesh(isCenter ? centerLancetGeo : mainLancetGeo, goldLancetMat);
    glass.position.set(lx, wy, facadeZ + 2.0);
    academyCastleGroup.add(glass);

    const frame = new THREE.Mesh(isCenter ? centerFrameGeo : lancetFrameGeo, carvedRibMat);
    frame.position.set(lx, wy, facadeZ + 2.15);
    academyCastleGroup.add(frame);

    const mullion = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.4, isCenter ? 28.5 : 24.5, 0.5)),
      carvedRibMat,
    );
    mullion.position.set(lx, wy + (isCenter ? 14.2 : 12.2), facadeZ + 2.2);
    academyCastleGroup.add(mullion);
  }

  // Colossal Intricately Spoked Glowing Rose Window (diameter = 22.8m!)
  const roseY = facadeBaseY + 112.0;
  const roseZ = facadeZ + 2.2;
  const roseGroup = new THREE.Group();
  roseGroup.position.set(0, roseY, roseZ);
  academyCastleGroup.add(roseGroup);

  const roseGlass = new THREE.Mesh(track(new THREE.CircleGeometry(11.2, 36)), roseGlassMat);
  roseGroup.add(roseGlass);
  const roseOuterRim = new THREE.Mesh(track(new THREE.TorusGeometry(11.4, 1.15, 10, 40)), carvedRibMat);
  roseOuterRim.position.z = 0.32;
  roseGroup.add(roseOuterRim);
  const roseInnerRing = new THREE.Mesh(track(new THREE.TorusGeometry(5.8, 0.45, 8, 32)), carvedRibMat);
  roseInnerRing.position.z = 0.4;
  roseGroup.add(roseInnerRing);
  const roseHubRing = new THREE.Mesh(track(new THREE.TorusGeometry(2.0, 0.4, 8, 24)), carvedRibMat);
  roseHubRing.position.z = 0.45;
  roseGroup.add(roseHubRing);

  for (let s = 0; s < 16; s++) {
    const a = (s / 16) * Math.PI * 2;
    const spoke = new THREE.Mesh(track(new THREE.BoxGeometry(0.4, 21.8, 0.48)), carvedRibMat);
    spoke.rotation.z = a;
    spoke.position.z = 0.36;
    roseGroup.add(spoke);

    const petal = new THREE.Mesh(track(new THREE.TorusGeometry(1.35, 0.24, 6, 16)), carvedRibMat);
    petal.position.set(Math.cos(a) * 8.6, Math.sin(a) * 8.6, 0.4);
    roseGroup.add(petal);
  }

  // Flanking Side Wings along Forecourt Terraces (x: ±33..±76, z: -86) framing the Main Cathedral
  for (const side of [-1, 1]) {
    const wingWall = new THREE.Mesh(track(new THREE.BoxGeometry(44.0, 68.0, 32.0)), limestoneMat);
    wingWall.position.set(side * 55.0, facadeBaseY + 34.0, facadeZ - 16.0);
    academyCastleGroup.add(wingWall);

    const wingRoof = new THREE.Mesh(track(createSteepRoofGeometry(34.0, 26.0, 46.0)), slateRoofMat);
    wingRoof.rotation.y = Math.PI / 2;
    wingRoof.position.set(side * 55.0, facadeBaseY + 68.0, facadeZ - 16.0);
    academyCastleGroup.add(wingRoof);

    for (const wxOffset of [-12, 0, 12]) {
      const wGlass = new THREE.Mesh(mainLancetGeo, goldLancetMat);
      wGlass.scale.setScalar(0.75);
      wGlass.position.set(side * 55.0 + wxOffset, facadeBaseY + 28.0, facadeZ + 0.15);
      academyCastleGroup.add(wGlass);
    }
  }

  // Clustered Vertical Pinnacles, Buttress Turrets & Needle Spires (InstancedMesh)
  const pinnacleColGeo = track(new THREE.BoxGeometry(2.2, 1.0, 2.2));
  pinnacleColGeo.translate(0, 0.5, 0);
  const pinnacleSpireGeo = track(new THREE.ConeGeometry(1.45, 1.0, 4));
  pinnacleSpireGeo.rotateY(Math.PI / 4);
  pinnacleSpireGeo.translate(0, 0.5, 0);

  const facadePinnacles: Array<{ x: number; y: number; z: number; w: number; h: number; sh: number }> = [
    { x: -32.5, y: facadeBaseY, z: facadeZ + 2.0, w: 3.4, h: 128, sh: 48 },
    { x: 32.5, y: facadeBaseY, z: facadeZ + 2.0, w: 3.4, h: 128, sh: 48 },
    { x: -22.5, y: facadeBaseY, z: facadeZ + 2.4, w: 2.6, h: 122, sh: 38 },
    { x: 22.5, y: facadeBaseY, z: facadeZ + 2.4, w: 2.6, h: 122, sh: 38 },
    { x: 0, y: facadeBaseY + 170, z: facadeZ + 1.0, w: 2.0, h: 14, sh: 32 },
    { x: -44.0, y: facadeBaseY + 4, z: facadeZ - 12.0, w: 4.5, h: 124, sh: 52 },
    { x: 44.0, y: facadeBaseY + 4, z: facadeZ - 12.0, w: 4.5, h: 124, sh: 52 },
    ...[-1, 1].flatMap((side) =>
      [0, 1, 2, 3, 4, 5].map((i) => ({
        x: side * 46.0,
        y: facadeBaseY + 4,
        z: facadeZ - 26 - i * 14.5,
        w: 2.8,
        h: 98,
        sh: 34,
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

  // Monumental Flying Buttresses along both flanks of the Cathedral Nave (InstancedMesh)
  const fbArchGeo = track(new THREE.BoxGeometry(20.0, 5.2, 3.8));
  const fbArches = new THREE.InstancedMesh(fbArchGeo, carvedRibMat, 12);
  let fbIdx = 0;
  for (let i = 0; i < 6; i++) {
    const bz = facadeZ - 26 - i * 14.5;
    for (const side of [-1, 1]) {
      dummy.position.set(side * 39.0, facadeBaseY + 92.0, bz);
      dummy.rotation.set(0, 0, -side * 0.46);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      fbArches.setMatrixAt(fbIdx++, dummy.matrix);
    }
  }
  fbArches.instanceMatrix.needsUpdate = true;
  fbArches.computeBoundingSphere();
  academyCastleGroup.add(fbArches);

  // High-Arched Stone Viaduct Sweeping off the Left Flank (2.4x W x 2.8x H, piers grounded deep below lake waterline!)
  const leftViaductBays = 6;
  const leftViaductBayGeo = track(createGothicBayGeometry(24.0, 124.0, 16.0, 92.0, 11.0));
  const leftViaductGalleryGeo = track(createGothicBayGeometry(8.0, 14.0, 4.6, 10.5, 9.2));
  const leftViaductInst = new THREE.InstancedMesh(leftViaductBayGeo, limestoneMat, leftViaductBays);
  const leftViaductGalleryInst = new THREE.InstancedMesh(
    leftViaductGalleryGeo,
    carvedRibMat,
    leftViaductBays * 3,
  );
  const leftViaductPins = new THREE.InstancedMesh(pinnacleSpireGeo, slateRoofMat, leftViaductBays);

  for (let i = 0; i < leftViaductBays; i++) {
    const vx = -58.0 - i * 23.8;
    const vz = facadeZ - 14.0 - i * 2.4;
    dummy.position.set(vx, -10.0, vz);
    dummy.rotation.set(0, 0.1, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    leftViaductInst.setMatrixAt(i, dummy.matrix);

    for (let g = 0; g < 3; g++) {
      const gx = vx - 8.0 + g * 8.0;
      dummy.position.set(gx, 114.0, vz - 0.8 + g * 0.8);
      dummy.rotation.set(0, 0.1, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      leftViaductGalleryInst.setMatrixAt(i * 3 + g, dummy.matrix);
    }

    dummy.position.set(vx - 11.8, 128.0, vz - 1.18);
    dummy.rotation.set(0, 0.1, 0);
    dummy.scale.set(2.8, 28.0, 2.8);
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
  // 3D. EXPANDED LEFT WING, OCTAGONAL DOME ROTUNDA & UPPER ASTRAL CITADEL TIER
  // -------------------------------------------------------------------------
  // 1. Left Cathedral Wing (scaled 2.4x W / 2.8x H on left rocky plateau)
  const leftWingGroup = new THREE.Group();
  leftWingGroup.position.set(-108.0, 52.0, -138.0);
  leftWingGroup.rotation.y = 0.22;
  academyCastleGroup.add(leftWingGroup);

  const lwMain = new THREE.Mesh(track(new THREE.BoxGeometry(52.0, 88.0, 84.0)), limestoneMat);
  lwMain.position.set(0, 44.0, 0);
  leftWingGroup.add(lwMain);
  const lwRoof = new THREE.Mesh(track(createSteepRoofGeometry(56.0, 46.0, 88.0)), slateRoofMat);
  lwRoof.position.set(0, 88.0, 0);
  leftWingGroup.add(lwRoof);

  const lwUpper = new THREE.Mesh(track(new THREE.BoxGeometry(34.0, 62.0, 52.0)), limestoneMat);
  lwUpper.position.set(-4.0, 96.0, -10.0);
  leftWingGroup.add(lwUpper);
  const lwUpperRoof = new THREE.Mesh(track(createSteepRoofGeometry(36.0, 36.0, 54.0)), slateRoofMat);
  lwUpperRoof.position.set(-4.0, 127.0, -10.0);
  leftWingGroup.add(lwUpperRoof);

  const lwSpireShaft = new THREE.Mesh(track(new THREE.CylinderGeometry(7.5, 9.5, 64.0, 8)), limestoneMat);
  lwSpireShaft.position.set(-8.0, 126.0, -18.0);
  leftWingGroup.add(lwSpireShaft);
  const lwSpireNeedle = new THREE.Mesh(track(new THREE.ConeGeometry(9.2, 62.0, 8)), slateRoofMat);
  lwSpireNeedle.position.set(-8.0, 189.0, -18.0);
  leftWingGroup.add(lwSpireNeedle);

  const smallLancetGeo = track(new THREE.ShapeGeometry(createPointedWindowShape(3.6, 19.5)));
  for (const wx of [-12.0, 0, 12.0]) {
    const win = new THREE.Mesh(smallLancetGeo, goldLancetMat);
    win.position.set(wx, 46.0, 42.2);
    leftWingGroup.add(win);
  }

  // 2. Expanded Octagonal Dome Rotunda with Double-Tiered Gallery Windows, Buttress Ribs & Upper Wrap-Around Balcony
  const rotundaGroup = new THREE.Group();
  rotundaGroup.position.set(92.0, 52.0, -124.0);
  academyCastleGroup.add(rotundaGroup);

  const rotundaBase = new THREE.Mesh(track(new THREE.CylinderGeometry(35.0, 41.0, 44.0, 8)), limestoneMat);
  rotundaBase.position.y = -2.0;
  rotundaBase.rotation.y = Math.PI / 8;
  rotundaGroup.add(rotundaBase);

  const rotundaDrum = new THREE.Mesh(track(new THREE.CylinderGeometry(31.5, 33.0, 72.0, 8)), limestoneMat);
  rotundaDrum.position.y = 56.0;
  rotundaDrum.rotation.y = Math.PI / 8;
  rotundaGroup.add(rotundaDrum);

  const rotundaCornice = new THREE.Mesh(track(new THREE.CylinderGeometry(35.5, 32.0, 5.5, 8)), carvedRibMat);
  rotundaCornice.position.y = 94.5;
  rotundaCornice.rotation.y = Math.PI / 8;
  rotundaGroup.add(rotundaCornice);

  // Upper wrap-around exterior balcony walkway & ringed parapet around Rotunda crown
  const rotundaBalcony = new THREE.Mesh(track(new THREE.CylinderGeometry(37.5, 35.0, 2.2, 8)), carvedRibMat);
  rotundaBalcony.position.y = 91.5;
  rotundaBalcony.rotation.y = Math.PI / 8;
  rotundaGroup.add(rotundaBalcony);

  // Double-tiered glowing lancet gallery windows + 8 exterior stone buttress ribs
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    for (const wy of [38.0, 68.0]) {
      const win = new THREE.Mesh(smallLancetGeo, goldLancetMat);
      win.position.set(Math.sin(a) * 30.2, wy, Math.cos(a) * 30.2);
      win.rotation.y = a;
      rotundaGroup.add(win);
    }

    const cornerA = a + Math.PI / 8;
    const pilaster = new THREE.Mesh(track(new THREE.BoxGeometry(3.8, 76.0, 4.4)), carvedRibMat);
    pilaster.position.set(Math.sin(cornerA) * 33.2, 56.0, Math.cos(cornerA) * 33.2);
    pilaster.rotation.y = cornerA;
    rotundaGroup.add(pilaster);
  }

  const domePts: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const r = Math.cos(t * Math.PI * 0.5) * 32.5;
    const y = Math.sin(t * Math.PI * 0.5) * 42.0;
    domePts.push(new THREE.Vector2(Math.max(2.6, r), y));
  }
  const domeGeo = track(new THREE.LatheGeometry(domePts, 8));
  domeGeo.rotateY(Math.PI / 8);
  const rotundaDome = new THREE.Mesh(domeGeo, slateRoofMat);
  rotundaDome.position.y = 97.0;
  rotundaGroup.add(rotundaDome);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const ribCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.sin(a) * 32.8, 97.0, Math.cos(a) * 32.8),
      new THREE.Vector3(Math.sin(a) * 24.5, 123.0, Math.cos(a) * 24.5),
      new THREE.Vector3(Math.sin(a) * 3.8, 139.0, Math.cos(a) * 3.8),
    ]);
    const rib = new THREE.Mesh(track(new THREE.TubeGeometry(ribCurve, 8, 0.85, 5, false)), carvedRibMat);
    rotundaGroup.add(rib);
  }

  const cupola = new THREE.Mesh(track(new THREE.CylinderGeometry(5.2, 5.8, 14.0, 8)), carvedRibMat);
  cupola.position.y = 144.0;
  rotundaGroup.add(cupola);
  const cupolaCone = new THREE.Mesh(track(new THREE.ConeGeometry(6.0, 24.0, 8)), slateRoofMat);
  cupolaCone.position.y = 163.0;
  rotundaGroup.add(cupolaCone);

  // Elevated Arched Stone Sky-Bridges linking Left Wing <-> Main Cathedral <-> Rotunda <-> Rear Observatory
  const skyBridgeGeo = track(createGothicBayGeometry(16.0, 24.0, 11.0, 18.0, 8.0));
  const skyBridgeMatrices: Array<{ x: number; y: number; z: number; ry: number }> = [];
  for (let i = 0; i < 4; i++) {
    skyBridgeMatrices.push({ x: -84 + i * 16, y: 102.0, z: -136, ry: -0.15 });
    skyBridgeMatrices.push({ x: 34 + i * 16, y: 102.0, z: -124, ry: 0.22 });
  }
  const skyBridgesInst = new THREE.InstancedMesh(skyBridgeGeo, limestoneMat, skyBridgeMatrices.length);
  skyBridgeMatrices.forEach((sb, idx) => {
    dummy.position.set(sb.x, sb.y, sb.z);
    dummy.rotation.set(0, sb.ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    skyBridgesInst.setMatrixAt(idx, dummy.matrix);
  });
  skyBridgesInst.instanceMatrix.needsUpdate = true;
  skyBridgesInst.computeBoundingSphere();
  academyCastleGroup.add(skyBridgesInst);

  // 3. TOWERING UPPER ASTRAL CITADEL TIER (Dwarfs & Owns 100% of Horizon Behind Main Cathedral!)
  // 3a. Colossal Central Grand Observatory Spire (local x = 0, z = -156, soaring to local y = 318m!)
  const obsGroup = new THREE.Group();
  obsGroup.position.set(0, 58.0, -156.0);
  academyCastleGroup.add(obsGroup);

  const obsKeepBase = new THREE.Mesh(track(new THREE.BoxGeometry(52.0, 74.0, 52.0)), limestoneMat);
  obsKeepBase.position.y = 37.0;
  obsGroup.add(obsKeepBase);

  const obsTier2 = new THREE.Mesh(track(new THREE.BoxGeometry(40.0, 62.0, 40.0)), limestoneMat);
  obsTier2.position.y = 105.0;
  obsGroup.add(obsTier2);

  const obsDrum = new THREE.Mesh(track(new THREE.CylinderGeometry(16.5, 19.0, 58.0, 8)), limestoneMat);
  obsDrum.position.y = 165.0;
  obsDrum.rotation.y = Math.PI / 8;
  obsGroup.add(obsDrum);

  const obsBelfry = new THREE.Mesh(track(new THREE.CylinderGeometry(20.0, 17.0, 14.0, 8)), carvedRibMat);
  obsBelfry.position.y = 200.0;
  obsBelfry.rotation.y = Math.PI / 8;
  obsGroup.add(obsBelfry);

  const obsSpire = new THREE.Mesh(track(new THREE.ConeGeometry(18.5, 86.0, 8)), slateRoofMat);
  obsSpire.position.y = 249.0;
  obsSpire.rotation.y = Math.PI / 8;
  obsGroup.add(obsSpire);

  const obsFinial = new THREE.Mesh(track(new THREE.CylinderGeometry(0.45, 0.9, 20.0, 6)), carvedRibMat);
  obsFinial.position.y = 298.0;
  obsGroup.add(obsFinial);

  const obsSlitGeo = track(new THREE.BoxGeometry(2.2, 28.0, 0.8));
  for (let face = 0; face < 4; face++) {
    const a = (face / 4) * Math.PI * 2;
    for (const off of [-6.0, 6.0]) {
      const slit = new THREE.Mesh(obsSlitGeo, goldLancetMat);
      slit.position.set(Math.sin(a) * 20.2 + Math.cos(a) * off, 105.0, Math.cos(a) * 20.2 - Math.sin(a) * off);
      slit.rotation.y = a;
      obsGroup.add(slit);
    }
    const drumSlit = new THREE.Mesh(obsSlitGeo, goldLancetMat);
    drumSlit.position.set(Math.sin(a) * 16.8, 165.0, Math.cos(a) * 16.8);
    drumSlit.rotation.y = a;
    obsGroup.add(drumSlit);

    // Corner spirelets & flying buttress piers on Grand Observatory
    const ca = a + Math.PI / 4;
    const cTurret = new THREE.Mesh(track(new THREE.BoxGeometry(6.0, 134.0, 6.0)), carvedRibMat);
    cTurret.position.set(Math.sin(ca) * 27.0, 68.0, Math.cos(ca) * 27.0);
    obsGroup.add(cTurret);
    const cCone = new THREE.Mesh(track(new THREE.ConeGeometry(4.4, 24.0, 4)), slateRoofMat);
    cCone.position.set(Math.sin(ca) * 27.0, 146.0, Math.cos(ca) * 27.0);
    cCone.rotation.y = ca + Math.PI / 4;
    obsGroup.add(cCone);

    const belfryPin = new THREE.Mesh(track(new THREE.ConeGeometry(3.2, 22.0, 4)), carvedRibMat);
    belfryPin.position.set(Math.sin(ca) * 18.5, 217.0, Math.cos(ca) * 18.5);
    belfryPin.rotation.y = ca + Math.PI / 4;
    obsGroup.add(belfryPin);
  }

  // 3b. Twin Flanking Slender Gothic Bell Towers (local x = ±58, z = -142, soaring to local y = 268m!)
  for (const side of [-1, 1]) {
    const bellGroup = new THREE.Group();
    bellGroup.position.set(side * 58.0, 52.0, -142.0);
    academyCastleGroup.add(bellGroup);

    const btBase = new THREE.Mesh(track(new THREE.BoxGeometry(26.0, 64.0, 26.0)), limestoneMat);
    btBase.position.y = 32.0;
    bellGroup.add(btBase);
    const btMid = new THREE.Mesh(track(new THREE.BoxGeometry(20.0, 66.0, 20.0)), limestoneMat);
    btMid.position.y = 97.0;
    bellGroup.add(btMid);
    const btOct = new THREE.Mesh(track(new THREE.CylinderGeometry(8.8, 10.2, 48.0, 8)), limestoneMat);
    btOct.position.y = 154.0;
    btOct.rotation.y = Math.PI / 8;
    bellGroup.add(btOct);
    const btCrown = new THREE.Mesh(track(new THREE.CylinderGeometry(10.8, 9.2, 8.0, 8)), carvedRibMat);
    btCrown.position.y = 182.0;
    btCrown.rotation.y = Math.PI / 8;
    bellGroup.add(btCrown);
    const btSpire = new THREE.Mesh(track(new THREE.ConeGeometry(10.2, 62.0, 8)), slateRoofMat);
    btSpire.position.y = 217.0;
    btSpire.rotation.y = Math.PI / 8;
    bellGroup.add(btSpire);

    for (let f = 0; f < 4; f++) {
      const a = (f / 4) * Math.PI * 2;
      const bSlit = new THREE.Mesh(obsSlitGeo, goldLancetMat);
      bSlit.position.set(Math.sin(a) * 10.2, 97.0, Math.cos(a) * 10.2);
      bSlit.rotation.y = a;
      bellGroup.add(bSlit);

      const ca = a + Math.PI / 4;
      const bPin = new THREE.Mesh(track(new THREE.ConeGeometry(2.2, 18.0, 4)), slateRoofMat);
      bPin.position.set(Math.sin(ca) * 13.0, 138.0, Math.cos(ca) * 13.0);
      bPin.rotation.y = ca + Math.PI / 4;
      bellGroup.add(bPin);
    }
  }

  // 3c. Secondary Rear Citadel Gallery & Spire Cluster (local z = -194)
  for (const [rx, rw, rh, sh] of [
    [-38, 28, 118, 52],
    [38, 28, 118, 52],
    [-92, 24, 96, 44],
    [92, 24, 96, 44],
  ]) {
    const rBody = new THREE.Mesh(track(new THREE.BoxGeometry(rw, rh, rw)), limestoneMat);
    rBody.position.set(rx, 46 + rh * 0.5, -192);
    academyCastleGroup.add(rBody);
    const rCone = new THREE.Mesh(track(new THREE.ConeGeometry(rw * 0.65, sh, 8)), slateRoofMat);
    rCone.position.set(rx, 46 + rh + sh * 0.5, -192);
    academyCastleGroup.add(rCone);
  }

  // =========================================================================
  // 4. ATMOSPHERIC SUNKEN LAKE RUINS & JAGGED BASALT SEA STACKS (15°–35° TILT)
  // =========================================================================
  const sunkenSpanBay = createGothicBayGeometry(9.0, 15.0, 5.8, 10.5, 2.8);
  const sunkenSpanB1 = sunkenSpanBay.clone();
  sunkenSpanB1.translate(-9.0, 0, 0);
  const sunkenSpanB2 = sunkenSpanBay.clone();
  const sunkenSpanB3 = sunkenSpanBay.clone();
  sunkenSpanB3.translate(9.0, 0, 0);
  const tiltedViaductGeo = track(mergeGeometries([sunkenSpanB1, sunkenSpanB2, sunkenSpanB3])!);
  sunkenSpanBay.dispose();
  sunkenSpanB1.dispose();
  sunkenSpanB2.dispose();
  sunkenSpanB3.dispose();

  const sunkenViaductSpecs: Array<{ x: number; z: number; ry: number; tiltX: number; tiltZ: number; s: number }> = [
    { x: -46, z: -654, ry: 0.36, tiltX: 0.28, tiltZ: -0.34, s: 1.25 },
    { x: 52, z: -662, ry: -0.42, tiltX: -0.26, tiltZ: 0.36, s: 1.3 },
    { x: -72, z: -712, ry: 0.62, tiltX: 0.34, tiltZ: -0.28, s: 1.45 },
    { x: 74, z: -720, ry: -0.55, tiltX: -0.32, tiltZ: 0.38, s: 1.48 },
    { x: -168, z: -745, ry: 0.85, tiltX: 0.42, tiltZ: 0.26, s: 1.65 },
    { x: 174, z: -762, ry: -0.78, tiltX: -0.36, tiltZ: -0.44, s: 1.6 },
    { x: -205, z: -865, ry: 0.32, tiltX: 0.48, tiltZ: -0.31, s: 1.8 },
    { x: 208, z: -875, ry: -0.35, tiltX: 0.38, tiltZ: 0.45, s: 1.75 },
    { x: -185, z: -1025, ry: 1.1, tiltX: -0.44, tiltZ: 0.32, s: 1.9 },
    { x: 192, z: -1040, ry: -0.92, tiltX: 0.36, tiltZ: -0.48, s: 1.95 },
  ];
  const sunkenViaducts = new THREE.InstancedMesh(tiltedViaductGeo, limestoneMat, sunkenViaductSpecs.length);
  sunkenViaductSpecs.forEach((sv, idx) => {
    dummy.position.set(sv.x, ACADEMY.lakeWaterY - 3.0, sv.z);
    dummy.rotation.set(sv.tiltX, sv.ry, sv.tiltZ);
    dummy.scale.setScalar(sv.s);
    dummy.updateMatrix();
    sunkenViaducts.setMatrixAt(idx, dummy.matrix);
  });
  sunkenViaducts.instanceMatrix.needsUpdate = true;
  sunkenViaducts.computeBoundingSphere();
  interiorGroup.add(sunkenViaducts);

  const ruinTowerShaftGeo = track(new THREE.CylinderGeometry(3.2, 4.1, 30.0, 8));
  ruinTowerShaftGeo.translate(0, 15.0, 0);
  const ruinTowerRoofGeo = track(new THREE.ConeGeometry(4.2, 18.0, 8));
  ruinTowerRoofGeo.translate(0, 38.0, 0);
  const sunkenSpireSpecs: Array<{ x: number; z: number; ry: number; tiltX: number; tiltZ: number; s: number }> = [
    { x: -96, z: -656, ry: 0.3, tiltX: 0.26, tiltZ: 0.24, s: 1.15 },
    { x: 102, z: -662, ry: -0.5, tiltX: -0.28, tiltZ: -0.24, s: 1.2 },
    { x: -166, z: -826, ry: 0.4, tiltX: 0.3, tiltZ: 0.26, s: 1.35 },
    { x: 172, z: -838, ry: -0.7, tiltX: -0.36, tiltZ: -0.24, s: 1.45 },
    { x: -238, z: -925, ry: 1.2, tiltX: 0.38, tiltZ: -0.3, s: 1.65 },
    { x: 242, z: -945, ry: -1.1, tiltX: -0.32, tiltZ: 0.4, s: 1.6 },
    { x: -145, z: -1120, ry: 0.9, tiltX: 0.38, tiltZ: -0.32, s: 1.85 },
    { x: 152, z: -1135, ry: -0.8, tiltX: -0.4, tiltZ: 0.32, s: 1.9 },
  ];
  const sunkenTowerShafts = new THREE.InstancedMesh(ruinTowerShaftGeo, limestoneMat, sunkenSpireSpecs.length);
  const sunkenTowerRoofs = new THREE.InstancedMesh(ruinTowerRoofGeo, slateRoofMat, sunkenSpireSpecs.length);
  sunkenSpireSpecs.forEach((st, idx) => {
    dummy.position.set(st.x, ACADEMY.lakeWaterY - 3.5, st.z);
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

  // Jagged Flat-Shaded Basalt Sea Stacks emerging across outer lake perimeter (InstancedMesh)
  const seaStackGeo = track(new THREE.DodecahedronGeometry(6.5, 0));
  seaStackGeo.scale(1.0, 2.6, 1.0);
  const seaStackMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2a3038,
      roughness: 0.94,
      metalness: 0.05,
      flatShading: true,
    }),
  );
  const seaStackSpecs: Array<[number, number, number, number]> = [
    [-88, -642, 1.2, 0.35],
    [94, -648, 1.35, -0.4],
    [-195, -695, 2.2, 0.3],
    [198, -708, 2.4, -0.35],
    [-255, -830, 2.8, 0.42],
    [258, -845, 2.7, -0.38],
    [-245, -1060, 3.2, 0.28],
    [248, -1080, 3.1, -0.32],
  ];
  const seaStacksInst = new THREE.InstancedMesh(seaStackGeo, seaStackMat, seaStackSpecs.length);
  seaStackSpecs.forEach(([sx, sz, ss, tilt], idx) => {
    dummy.position.set(sx, ACADEMY.lakeWaterY - 2.0, sz);
    dummy.rotation.set(tilt, idx * 0.9, -tilt * 0.6);
    dummy.scale.setScalar(ss);
    dummy.updateMatrix();
    seaStacksInst.setMatrixAt(idx, dummy.matrix);
  });
  seaStacksInst.instanceMatrix.needsUpdate = true;
  seaStacksInst.computeBoundingSphere();
  interiorGroup.add(seaStacksInst);

  return {
    academyCastleGroup,
    lakeUniforms,
    midIslandFlames,
    lanternFlames,
  };
}
