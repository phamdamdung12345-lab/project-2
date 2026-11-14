import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WorldTextureBundle } from './textures';
import {
  ASTRAL,
  ASTRAL_GRACE_SITES,
  ASTRAL_WALKABLE_RECTS,
  sampleIslandTerrainY,
} from './astralCapitalMath';

export interface AstralCapitalHandles {
  group: THREE.Group;
  walkableMeshes: THREE.Object3D[];
  skyDome: THREE.Mesh;
  update: (elapsed: number, dt: number, playerX: number, playerY: number, playerZ: number) => void;
  dispose: () => void;
}

function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Checks whether a horizontal axis-aligned footprint [cx±halfW, cz±halfD]
 * touches any walkable stair, landing, bridge, plaza, or terrace (+margin).
 */
function overlapsAnyWalkway(
  cx: number,
  cz: number,
  halfW: number,
  halfD: number,
  margin = 3.2,
): boolean {
  for (let i = 0; i < ASTRAL_WALKABLE_RECTS.length; i++) {
    const r = ASTRAL_WALKABLE_RECTS[i];
    if (
      cx + halfW > r.minX - margin &&
      cx - halfW < r.maxX + margin &&
      cz + halfD > r.minZ - margin &&
      cz - halfD < r.maxZ + margin
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Builds an angular, vertically striated, flat-shaded dark basalt cliff cluster
 * with shared vertex lookup so triangles remain crisp without open seams.
 */
function createAngularBasaltGeo(seed: number, sharpTop = 1.0): THREE.BufferGeometry {
  const base = new THREE.IcosahedronGeometry(1, 1);
  const geo = base.toNonIndexed();
  base.dispose();

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const cache = new Map<string, [number, number, number]>();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${Math.round(x * 1000)}_${Math.round(y * 1000)}_${Math.round(z * 1000)}`;
    let displaced = cache.get(key);
    if (!displaced) {
      const ang = Math.atan2(z, x);
      const radiusXZ = Math.hypot(x, z);
      // Sharp vertical striations + stepped geological strata shelves
      const strata = Math.round(y * 3.5) / 3.5;
      const flute =
        Math.sin(ang * 6.0 + seed * 1.9) * 0.22 +
        Math.cos(ang * 11.0 - seed * 3.1) * 0.14 +
        (hash01(Math.round(ang * 100) + seed * 37) - 0.5) * 0.18;
      const taper = y > 0 ? Math.max(0.28, 1.0 - y * 0.42 * sharpTop) : 1.0 + Math.abs(y) * 0.25;
      const radialScale = Math.max(0.35, (1.0 + flute) * taper);
      const nx = radiusXZ > 0.001 ? Math.cos(ang) * radiusXZ * radialScale : x;
      const nz = radiusXZ > 0.001 ? Math.sin(ang) * radiusXZ * radialScale : z;
      const ny = (y * 0.72 + strata * 0.28) * (y > 0 ? 1.15 : 0.95);
      displaced = [nx, ny, nz];
      cache.set(key, displaced);
    }
    pos.setXYZ(i, displaced[0], displaced[1], displaced[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

function createArchShape(width: number, height: number, thickness: number): THREE.Shape {
  const hw = width / 2;
  const springY = height * 0.56;
  const shape = new THREE.Shape();
  shape.moveTo(-hw - thickness, 0);
  shape.lineTo(-hw - thickness, springY);
  shape.quadraticCurveTo(-hw - thickness, height + thickness, 0, height + thickness * 1.1);
  shape.quadraticCurveTo(hw + thickness, height + thickness, hw + thickness, springY);
  shape.lineTo(hw + thickness, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, springY);
  shape.quadraticCurveTo(hw, height, 0, height * 0.96);
  shape.quadraticCurveTo(-hw, height, -hw, springY);
  shape.lineTo(-hw, 0);
  shape.closePath();
  return shape;
}

function createPointedArchBridgeBay(
  spanWidth: number,
  pierWidth: number,
  archHeight: number,
  deckThickness: number,
  depth: number,
): THREE.BufferGeometry {
  const totalW = spanWidth + pierWidth;
  const hw = totalW / 2;
  const aw = spanWidth / 2;
  const springY = archHeight * 0.55;
  const topY = archHeight + deckThickness;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-aw, 0);
  shape.lineTo(-aw, springY);
  shape.quadraticCurveTo(-aw, archHeight * 0.96, 0, archHeight);
  shape.quadraticCurveTo(aw, archHeight * 0.96, aw, springY);
  shape.lineTo(aw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, topY);
  shape.lineTo(-hw, topY);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

function createPitchedRoofGeo(width: number, height: number, length: number): THREE.BufferGeometry {
  const hw = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(0, 0, -length / 2);
  geo.computeVertexNormals();
  return geo;
}

function createIvoryLimestoneTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#bfb198';
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 4;
  const rh = size / rows;
  const cw = size / cols;
  const gap = 3;
  let seed = 919;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const bx = col * cw + off;
      const by = r * rh;
      const v = 194 + Math.floor((rand() - 0.5) * 24);
      ctx.fillStyle = `rgb(${v},${v - 10},${v - 24})`;
      ctx.fillRect(bx + gap, by + gap, cw - gap * 2, rh - gap * 2);

      ctx.fillStyle = 'rgba(255,248,232,0.24)';
      ctx.fillRect(bx + gap, by + gap, cw - gap * 2, 3);
      ctx.fillStyle = 'rgba(72,58,42,0.32)';
      ctx.fillRect(bx + gap, by + rh - gap - 3, cw - gap * 2, 3);
    }
  }

  for (let i = 0; i < 2000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const s = 1 + rand() * 3;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,248,235,0.12)' : 'rgba(95,82,62,0.12)';
    ctx.fillRect(x, y, s, s);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createLeafTexture(): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 28);
  grad.addColorStop(0, 'rgba(255, 224, 130, 1)');
  grad.addColorStop(0.55, 'rgba(242, 162, 54, 0.85)');
  grad.addColorStop(1, 'rgba(190, 92, 18, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createFoliageCanopyTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#a86b24';
  ctx.fillRect(0, 0, size, size);

  let seed = 431;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 650; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 8;
    const pick = rand();
    ctx.fillStyle =
      pick > 0.68
        ? 'rgba(246, 192, 78, 0.72)'
        : pick > 0.34
          ? 'rgba(204, 124, 38, 0.75)'
          : 'rgba(116, 62, 18, 0.72)';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.65, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createSeaMistTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(148, 174, 228, 0.42)');
  grad.addColorStop(0.45, 'rgba(116, 144, 206, 0.22)');
  grad.addColorStop(1, 'rgba(54, 72, 132, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildAstralCapital(
  scene: THREE.Scene,
  textures: WorldTextureBundle,
  renderer: THREE.WebGLRenderer,
): AstralCapitalHandles {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const disposables: Array<{ dispose: () => void }> = [];
  const walkableMeshes: THREE.Object3D[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };
  const addWalkable = <T extends THREE.Object3D>(mesh: T): T => {
    walkableMeshes.push(mesh);
    return mesh;
  };

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const ivoryTex = track(createIvoryLimestoneTexture(anisotropy));
  const leafSprite = track(createLeafTexture());
  const foliageTex = track(createFoliageCanopyTexture());
  const seaMistTex = track(createSeaMistTexture());

  // =========================================================================
  // SHARED PBR MATERIALS
  // =========================================================================
  const whiteStoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe8dfd0,
      map: ivoryTex,
      bumpMap: textures.flagstone.bumpMap,
      bumpScale: 0.06,
      roughness: 0.78,
      metalness: 0.05,
      envMapIntensity: 0.28,
    }),
  );

  const whiteMarbleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd9cfc0,
      map: ivoryTex,
      bumpMap: textures.flagstone.bumpMap,
      bumpScale: 0.04,
      roughness: 0.58,
      metalness: 0.1,
      envMapIntensity: 0.32,
    }),
  );

  const silverSlateMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x6f7c98,
      map: textures.flagstone.map,
      bumpMap: textures.flagstone.bumpMap,
      bumpScale: 0.05,
      roughness: 0.52,
      metalness: 0.36,
      envMapIntensity: 0.42,
    }),
  );

  const shadowStoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x353244,
      map: textures.flagstone.map,
      roughness: 0.85,
      metalness: 0.1,
      envMapIntensity: 0.2,
    }),
  );

  const royalGoldMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffd578,
      map: textures.gildedRoof.map,
      bumpMap: textures.gildedRoof.bumpMap,
      bumpScale: 0.04,
      roughnessMap: textures.gildedRoof.roughnessMap,
      roughness: 0.22,
      metalness: 0.9,
      envMapIntensity: 1.1,
    }),
  );

  const fortressStoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x7a7e86,
      map: textures.flagstone.map,
      bumpMap: textures.flagstone.bumpMap,
      bumpScale: 0.12,
      roughness: 0.88,
      metalness: 0.08,
      envMapIntensity: 0.22,
    }),
  );

  const fortressDarkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4c5059,
      map: textures.cliffRock.map,
      bumpMap: textures.cliffRock.bumpMap,
      bumpScale: 0.14,
      roughness: 0.9,
      metalness: 0.08,
      envMapIntensity: 0.16,
    }),
  );

  // Flat-shaded dark basalt cliff material (wet coastal sheen + zero smooth blobs)
  const cliffRockMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x464852,
      map: textures.cliffRock.map,
      bumpMap: textures.cliffRock.bumpMap,
      bumpScale: 0.22,
      roughness: 0.58,
      metalness: 0.06,
      envMapIntensity: 0.24,
      flatShading: true,
    }),
  );

  const cliffDarkBasaltMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2f313b,
      map: textures.cliffRock.map,
      bumpMap: textures.cliffRock.bumpMap,
      bumpScale: 0.24,
      roughness: 0.38,
      metalness: 0.08,
      envMapIntensity: 0.42,
      flatShading: true,
    }),
  );

  const nokronStoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x909bbe,
      map: textures.mossyStone.map,
      bumpMap: textures.mossyStone.bumpMap,
      bumpScale: 0.07,
      roughness: 0.76,
      metalness: 0.12,
      envMapIntensity: 0.28,
    }),
  );

  const paleBarkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd4c6ae,
      map: textures.bark.map,
      bumpMap: textures.bark.bumpMap,
      bumpScale: 0.14,
      roughness: 0.88,
      metalness: 0.04,
      envMapIntensity: 0.15,
    }),
  );

  const amberFoliageMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: foliageTex,
      roughness: 0.88,
      metalness: 0.01,
      envMapIntensity: 0.12,
      flatShading: true,
    }),
  );

  const cypressFoliageMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2a4531,
      map: foliageTex,
      roughness: 0.9,
      metalness: 0.01,
      envMapIntensity: 0.08,
      flatShading: true,
    }),
  );

  const hedgeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2f4d2e,
      map: textures.mossyStone.map,
      roughness: 0.9,
      metalness: 0.02,
      envMapIntensity: 0.1,
    }),
  );

  const goldenWindowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffcf70,
      emissive: new THREE.Color(0xf0a030),
      emissiveIntensity: 1.95,
      roughness: 0.22,
      metalness: 0.1,
    }),
  );

  const fortressGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x9be2c8,
      emissive: new THREE.Color(0x52b898),
      emissiveIntensity: 1.65,
      roughness: 0.25,
      metalness: 0.1,
    }),
  );

  const astralWindowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xb7d0ff,
      emissive: new THREE.Color(0x6e98ff),
      emissiveIntensity: 1.85,
      roughness: 0.22,
      metalness: 0.1,
    }),
  );

  const darkIronMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x23252c,
      roughness: 0.6,
      metalness: 0.65,
      envMapIntensity: 0.25,
    }),
  );

  const graceCoreMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffe49e,
      emissive: new THREE.Color(0xffc055),
      emissiveIntensity: 2.25,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.94,
    }),
  );

  const graceWispMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xffc85a,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  // =========================================================================
  // 1. NOKRON STARRY COSMOS SKY DOME (r = 3200) & 5600x5600 STARLIT OCEAN
  // =========================================================================
  const skyGeo = track(new THREE.SphereGeometry(3200, 40, 28));
  const skyMat = track(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform float uTime;

        float hash31(vec3 p) {
          p = fract(p * vec3(443.897, 441.423, 437.195));
          p += dot(p, p.yzx + 19.19);
          return fract((p.x + p.y) * p.z);
        }

        float noise3(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float n000 = hash31(i);
          float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
          return mix(
            mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
            mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
            f.z
          );
        }

        float fbm(vec3 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise3(p);
            p = p * 2.07 + vec3(13.1, 7.7, 5.3);
            a *= 0.5;
          }
          return v;
        }

        float starLayer(vec3 dir, float scale, float threshold, float timeScale) {
          vec3 grid = dir * scale;
          vec3 cell = floor(grid);
          vec3 f = fract(grid) - 0.5;
          float rnd = hash31(cell);
          if (rnd < threshold) return 0.0;
          vec3 jitter = vec3(hash31(cell + 1.3), hash31(cell + 2.7), hash31(cell + 4.1)) - 0.5;
          float d = length(f - jitter * 0.48);
          float core = smoothstep(0.22, 0.02, d);
          float twinkle = 0.72 + 0.28 * sin(uTime * timeScale + rnd * 62.8);
          return core * twinkle;
        }

        void main() {
          vec3 dir = normalize(vDir);
          float up = clamp(dir.y, -0.3, 1.0);

          vec3 abyss = vec3(0.03, 0.04, 0.11);
          vec3 horizon = vec3(0.11, 0.11, 0.26);
          vec3 mid = vec3(0.06, 0.08, 0.21);
          vec3 zenith = vec3(0.02, 0.025, 0.09);

          vec3 col = mix(abyss, horizon, smoothstep(-0.22, 0.04, up));
          col = mix(col, mid, smoothstep(0.04, 0.35, up));
          col = mix(col, zenith, smoothstep(0.32, 0.9, up));

          float bandCoord = dir.y * 0.85 - dir.x * 0.42 + dir.z * 0.18;
          float band = exp(-bandCoord * bandCoord * 7.5);
          float n = fbm(dir * 4.2);
          float n2 = fbm(dir * 9.5 + vec3(2.4));

          float northFocus = smoothstep(-0.3, 0.85, -dir.z) * smoothstep(0.55, -0.05, abs(dir.y - 0.12));
          vec3 cerulean = vec3(0.22, 0.36, 0.76);
          vec3 violet = vec3(0.42, 0.25, 0.65);
          vec3 roseGold = vec3(0.92, 0.56, 0.48);
          vec3 warmCore = vec3(1.0, 0.84, 0.70);

          col += mix(cerulean, violet, n2) * band * (0.35 + n * 0.52);
          col += roseGold * northFocus * smoothstep(0.34, 0.78, n) * 0.56;
          col += warmCore * northFocus * smoothstep(0.54, 0.86, n2) * 0.36;

          float s1 = starLayer(dir, 145.0, 0.85, 1.4);
          float s2 = starLayer(dir, 230.0, 0.90, 2.2);
          float s3 = starLayer(dir, 78.0, 0.96, 1.1);
          col += vec3(0.84, 0.90, 1.0) * s1 * 0.78;
          col += vec3(1.0, 0.92, 0.80) * s2 * 0.68;
          col += vec3(0.95, 0.96, 1.0) * s3 * 1.3;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);

  // Endless 5600x5600 Shimmering Starlit Ocean Plane reflecting the Indigo Nebula Sky
  const oceanGeo = track(new THREE.PlaneGeometry(5600, 5600, 1, 1));
  const oceanMat = track(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        uniform float uTime;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 uv = vWorldPos.xz;
          float dist = length(vWorldPos.xz - cameraPosition.xz);

          float w1 = sin(uv.x * 0.08 + uTime * 0.85) * cos(uv.y * 0.07 - uTime * 0.65);
          float w2 = sin((uv.x + uv.y) * 0.16 - uTime * 1.15);
          float wave = (w1 + w2 * 0.5) * 0.5 + 0.5;

          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);

          vec3 deepSea = vec3(0.025, 0.038, 0.11);
          vec3 skyReflect = vec3(0.11, 0.12, 0.30);
          vec3 roseTint = vec3(0.26, 0.16, 0.32);

          vec3 col = mix(deepSea, skyReflect, fresnel * 0.78 + wave * 0.14);
          col = mix(col, roseTint, smoothstep(-100.0, -900.0, vWorldPos.z) * 0.35 * fresnel);

          vec2 cell = floor(uv * 0.38 + vec2(w1 * 0.3, w2 * 0.3));
          float rnd = hash21(cell);
          float glint = smoothstep(0.955, 0.998, rnd) * (0.4 + 0.6 * sin(uTime * 2.2 + rnd * 40.0));
          col += vec3(0.85, 0.88, 1.0) * glint * (0.35 + fresnel * 0.65) * (1.0 - smoothstep(450.0, 1450.0, dist));

          vec3 horizonCol = vec3(0.11, 0.11, 0.26);
          float horizonMix = smoothstep(1400.0, 2750.0, dist);
          col = mix(col, horizonCol, horizonMix);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.position.set(0, ASTRAL.waterY, -140);
  group.add(oceanMesh);

  // =========================================================================
  // 2. MULTI-TIERED JAGGED BASALT ISLAND FOUNDATION (360° Expanded, ZERO Stair Boulders!)
  // =========================================================================
  const islandW = 1080;
  const islandD = 1260;
  const islandGeo = track(new THREE.PlaneGeometry(islandW, islandD, 112, 132));
  islandGeo.rotateX(-Math.PI / 2);
  islandGeo.translate(0, 0, -150);

  const posAttr = islandGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    let vy = sampleIslandTerrainY(vx, vz);
    // Add crisp geological terrace ridges along steep basalt cliffs away from paved routes
    if (vy > -10 && vy < 48 && !overlapsAnyWalkway(vx, vz, 3.5, 3.5, 2.5)) {
      const shelf = Math.round(vy / 4.2) * 4.2;
      vy = vy * 0.65 + shelf * 0.35 + Math.sin(vx * 0.22 + vz * 0.19) * 1.4;
    }
    posAttr.setY(i, vy);
  }
  islandGeo.computeVertexNormals();

  const normAttr = islandGeo.attributes.normal as THREE.BufferAttribute;
  const vColors = new Float32Array(posAttr.count * 3);
  const cTmp = new THREE.Color();
  const cRockDark = new THREE.Color(0x282a34);
  const cRockMid = new THREE.Color(0x454754);
  const cGrass = new THREE.Color(0x425438);
  const cMoss = new THREE.Color(0x5f643a);

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const ny = normAttr.getY(i);
    const grassMix =
      THREE.MathUtils.clamp((ny - 0.7) / 0.2, 0, 1) * THREE.MathUtils.clamp((vy - 20) / 16, 0, 1);

    if (vy < 16) {
      cTmp.copy(cRockDark).lerp(cRockMid, THREE.MathUtils.clamp((vy + 8) / 24, 0, 1));
    } else {
      const m = 0.5 + 0.5 * Math.sin(vx * 0.06 + vz * 0.05);
      cTmp.copy(cRockMid).lerp(cGrass.clone().lerp(cMoss, m * 0.45), grassMix);
    }
    vColors[i * 3] = cTmp.r;
    vColors[i * 3 + 1] = cTmp.g;
    vColors[i * 3 + 2] = cTmp.b;
  }
  islandGeo.setAttribute('color', new THREE.BufferAttribute(vColors, 3));

  const islandMat = track(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: textures.cliffRock.map,
      bumpMap: textures.cliffRock.bumpMap,
      bumpScale: 0.2,
      roughness: 0.93,
      metalness: 0.04,
      envMapIntensity: 0.12,
      flatShading: true,
    }),
  );
  const islandMesh = new THREE.Mesh(islandGeo, islandMat);
  islandMesh.receiveShadow = true;
  group.add(islandMesh);

  // 3 Distinct Vertex-Displaced Vertically Striated Angular Basalt Crag Geometries
  const basaltGeoA = track(createAngularBasaltGeo(1.7, 1.1));
  const basaltGeoB = track(createAngularBasaltGeo(4.3, 0.85));
  const basaltGeoC = track(createAngularBasaltGeo(8.1, 1.35));
  const dummy = new THREE.Object3D();

  const cragBuckets: Array<Array<[number, number, number, number, number, number, number]>> = [[], [], []];
  const pushCragIfClear = (
    rx: number,
    ry: number,
    rz: number,
    sx: number,
    sy: number,
    sz: number,
    rotY: number,
    bucket: number,
  ) => {
    // Generous 1.45x horizontal radius + 6.8m walkway exclusion so NO crag ever blocks any staircase!
    const rHoriz = Math.max(sx, sz) * 1.45;
    if (overlapsAnyWalkway(rx, rz, rHoriz, rHoriz, 6.8)) return;
    cragBuckets[bucket % 3].push([rx, ry, rz, sx, sy, sz, rotY]);
  };

  // A. Main Island, Rear Promontory, West/East Outer Wards & Fortress Headland jagged basalt cliffs
  for (let i = 0; i < 240; i++) {
    const ang = (i / 240) * Math.PI * 2;
    const mode = i % 5;
    const rx =
      mode === 0
        ? 196 + Math.cos(ang) * (54 + hash01(i) * 32)
        : mode === 1
          ? Math.cos(ang) * (95 + hash01(i * 2) * 38)
          : -10 + Math.cos(ang) * (255 + hash01(i * 3) * 85);
    const rz =
      mode === 0
        ? -155 + Math.sin(ang) * (54 + hash01(i * 2) * 30)
        : mode === 1
          ? 215 + Math.sin(ang) * (125 + hash01(i * 3) * 40)
          : -30 + Math.sin(ang) * (235 + hash01(i * 5) * 75);
    const gy = sampleIslandTerrainY(rx, rz);
    if (gy < -11 || gy > 106) continue;
    const sx = 6 + hash01(i * 7) * 9;
    const sy = 10 + hash01(i * 11) * 18;
    const sz = 6 + hash01(i * 13) * 9;
    pushCragIfClear(rx, gy - 1.5, rz, sx, sy, sz, hash01(i * 17) * Math.PI * 2, i);
  }

  // B. Celestial Sea Sanctuary Island jagged coastal crags, tidal reefs & offshore sea stacks
  for (let i = 0; i < 140; i++) {
    const ang = (i / 140) * Math.PI * 2;
    const ringRadiusX = 52 + hash01(i * 19) * 86;
    const ringRadiusZ = 70 + hash01(i * 23) * 95;
    const rx = Math.cos(ang) * ringRadiusX;
    const rz = -575 + Math.sin(ang) * ringRadiusZ;
    const gy = sampleIslandTerrainY(rx, rz);
    if (gy < -11 || gy > 54) continue;
    const isReefStack = Math.abs(rx) > 58 || gy < 4;
    const sx = isReefStack ? 7 + hash01(i * 29) * 11 : 5.5 + hash01(i * 29) * 8;
    const sy = isReefStack ? 12 + hash01(i * 31) * 24 : 9 + hash01(i * 31) * 16;
    const sz = isReefStack ? 7 + hash01(i * 37) * 11 : 5.5 + hash01(i * 37) * 8;
    pushCragIfClear(rx, gy - 1.5, rz, sx, sy, sz, hash01(i * 41) * Math.PI * 2, i + 1);
  }

  // C. Prominent offshore spire sea-stacks flanking the Sea Sanctuary horizon
  const heroStacks: Array<[number, number, number, number, number]> = [
    [-145, -560, 14, 34, 14],
    [-156, -542, 10, 22, 11],
    [148, -585, 15, 38, 15],
    [136, -604, 11, 25, 10],
    [-118, -682, 16, 42, 14],
    [122, -688, 15, 36, 15],
    [-310, -320, 18, 44, 18],
    [310, -340, 20, 48, 20],
  ];
  heroStacks.forEach((hs, idx) => {
    pushCragIfClear(hs[0], ASTRAL.waterY + hs[3] * 0.35, hs[1], hs[2], hs[3], hs[4], idx * 0.9, idx);
  });

  const basaltGeos = [basaltGeoA, basaltGeoB, basaltGeoC];
  basaltGeos.forEach((bGeo, bIdx) => {
    const specs = cragBuckets[bIdx];
    if (specs.length === 0) return;
    const mat = bIdx === 1 ? cliffDarkBasaltMat : cliffRockMat;
    const im = new THREE.InstancedMesh(bGeo, mat, specs.length);
    specs.forEach((c, idx) => {
      dummy.position.set(c[0], c[1], c[2]);
      dummy.rotation.set((hash01(idx * 3) - 0.5) * 0.14, c[6], (hash01(idx * 5) - 0.5) * 0.14);
      dummy.scale.set(c[3], c[4], c[5]);
      dummy.updateMatrix();
      im.setMatrixAt(idx, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // Terraced Stone Retaining Walls embedded naturally into coastal rock cliff faces
  const cliffWallCoords: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 64; i++) {
    const ang = (i / 64) * Math.PI * 2;
    const isShrine = i >= 38;
    const rx = isShrine
      ? Math.cos(ang) * (48 + hash01(i * 43) * 18)
      : -30 + Math.cos(ang) * (175 + hash01(i * 43) * 32);
    const rz = isShrine
      ? -565 + Math.sin(ang) * (76 + hash01(i * 47) * 28)
      : -75 + Math.sin(ang) * (165 + hash01(i * 47) * 32);
    if (overlapsAnyWalkway(rx, rz, 7.5, 7.5, 3.0)) continue;
    const gy = sampleIslandTerrainY(rx, rz);
    if (gy < 6 || gy > 68) continue;
    cliffWallCoords.push([rx, gy - 4.0, rz, ang + Math.PI / 2]);
  }
  if (cliffWallCoords.length > 0) {
    const rwGeo = track(new THREE.BoxGeometry(12, 16, 4.2));
    const instCliffWalls = new THREE.InstancedMesh(rwGeo, fortressDarkMat, cliffWallCoords.length);
    cliffWallCoords.forEach((wc, idx) => {
      dummy.position.set(wc[0], wc[1], wc[2]);
      dummy.rotation.set(0, wc[3], 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instCliffWalls.setMatrixAt(idx, dummy.matrix);
    });
    instCliffWalls.instanceMatrix.needsUpdate = true;
    instCliffWalls.computeBoundingSphere();
    group.add(instCliffWalls);
  }

  // Soft Waterline Sea Mist cards hugging cliff bases & Sea Sanctuary reefs
  const mistMat = track(
    new THREE.MeshBasicMaterial({
      map: seaMistTex,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const mistGeo = track(new THREE.PlaneGeometry(58, 58));
  const mistMeshes: Array<{ mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number }> = [];
  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * Math.PI * 2;
    const onShrine = i % 2 === 0;
    const mx = onShrine ? Math.cos(ang) * (78 + (i % 5) * 14) : 104 + Math.cos(ang) * 140;
    const mz = onShrine ? -565 + Math.sin(ang) * (105 + (i % 4) * 18) : -170 + Math.sin(ang) * 185;
    const m = new THREE.Mesh(mistGeo, mistMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(mx, ASTRAL.waterY + 1.4 + (i % 3) * 0.7, mz);
    group.add(m);
    mistMeshes.push({ mesh: m, baseX: mx, baseZ: mz, phase: i * 0.73 });
  }

  // =========================================================================
  // HELPERS FOR WALKABLE DECKS & CLEAN STEPPED STAIRS (ZERO WEDGES!)
  // =========================================================================
  const buildPlatformSlab = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    y: number,
    thickness: number,
    mat: THREE.Material = whiteStoneMat,
    underSupportH = 0,
    supportMat: THREE.Material = whiteStoneMat,
  ) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const slab = addWalkable(new THREE.Mesh(track(new THREE.BoxGeometry(w, thickness, d)), mat));
    slab.position.set(cx, y - thickness * 0.5, cz);
    slab.receiveShadow = true;
    slab.castShadow = true;
    group.add(slab);

    if (underSupportH > 0) {
      const sub = new THREE.Mesh(
        track(new THREE.BoxGeometry(Math.max(1, w - 1.2), underSupportH, Math.max(1, d - 1.2))),
        supportMat,
      );
      sub.position.set(cx, y - thickness - underSupportH * 0.5, cz);
      sub.receiveShadow = true;
      group.add(sub);
    }
  };

  /**
   * Builds a clean stepped stone flight with vertical masonry under-columns
   * strictly bounded inside the step footprint (ZERO slanted box wedges!).
   */
  const buildStairFlight = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    yAtMaxZ: number,
    yAtMinZ: number,
    steps: number,
    axis: 'z' | 'x' = 'z',
    mat: THREE.Material = whiteStoneMat,
    supportMat: THREE.Material = whiteStoneMat,
  ) => {
    const stepW = axis === 'z' ? maxX - minX : (maxX - minX) / steps + 0.14;
    const stepD = axis === 'z' ? (maxZ - minZ) / steps + 0.14 : maxZ - minZ;
    const stepH = Math.abs(yAtMaxZ - yAtMinZ) / steps + 0.38;
    const geo = track(new THREE.BoxGeometry(stepW, stepH, stepD));
    const mesh = addWalkable(new THREE.InstancedMesh(geo, mat, steps));
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    const pierDepth = 46;
    const pierGeo = track(
      new THREE.BoxGeometry(
        axis === 'z' ? Math.max(1, stepW - 0.8) : Math.max(0.4, (maxX - minX) / steps),
        pierDepth,
        axis === 'z' ? Math.max(0.4, (maxZ - minZ) / steps) : Math.max(1, stepD - 0.8),
      ),
    );
    const piers = new THREE.InstancedMesh(pierGeo, supportMat, steps);
    piers.receiveShadow = true;

    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const sx = axis === 'z' ? (minX + maxX) * 0.5 : THREE.MathUtils.lerp(maxX, minX, t);
      const sz = axis === 'z' ? THREE.MathUtils.lerp(maxZ, minZ, t) : (minZ + maxZ) * 0.5;
      const topY = THREE.MathUtils.lerp(yAtMaxZ, yAtMinZ, t);

      dummy.position.set(sx, topY - stepH * 0.5, sz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Vertical masonry support strictly below top tread (topY - 0.35m) -> 0 protruding corners!
      dummy.position.set(sx, topY - 0.35 - pierDepth * 0.5, sz);
      dummy.updateMatrix();
      piers.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    group.add(mesh);

    piers.instanceMatrix.needsUpdate = true;
    piers.computeBoundingSphere();
    group.add(piers);
  };

  // =========================================================================
  // 3. GRAND ARRIVAL BALCONY & 100% UNOBSTRUCTED CEREMONIAL STAIRCASE
  // =========================================================================
  buildPlatformSlab(-20, 20, 92, 134, ASTRAL.balconyY, 4.0, whiteMarbleMat, 56, whiteStoneMat);
  buildStairFlight(-12, 12, -6, 92, ASTRAL.balconyY, ASTRAL.cityPlazaY, 96, 'z', whiteMarbleMat, whiteStoneMat);
  buildPlatformSlab(-48, 48, -74, -6, ASTRAL.cityPlazaY, 4.0, whiteStoneMat, 28, cliffRockMat);
  buildStairFlight(-16, 16, -124, -74, ASTRAL.cityPlazaY, ASTRAL.citadelTerraceY, 48, 'z', whiteMarbleMat, whiteStoneMat);
  buildPlatformSlab(-54, 54, -188, -124, ASTRAL.citadelTerraceY, 5.0, whiteMarbleMat, 48, whiteStoneMat);

  // Ornate Celestial Return Gate moved to West Balcony Alcove (-15.5, 152, 116)
  // so center South Passage behind spawn (z=134+) is 100% open into Rear Royal Plaza!
  const returnGateGroup = new THREE.Group();
  returnGateGroup.position.set(ASTRAL.returnGatePos.x, ASTRAL.returnGatePos.y, ASTRAL.returnGatePos.z);
  returnGateGroup.rotation.y = Math.PI / 2;
  group.add(returnGateGroup);

  const returnArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(7.2, 11.0, 1.8), {
      depth: 2.6,
      bevelEnabled: true,
      bevelSize: 0.14,
      bevelThickness: 0.14,
    }),
  );
  returnArchGeo.translate(0, 0, -1.3);
  returnGateGroup.add(new THREE.Mesh(returnArchGeo, whiteMarbleMat));

  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 15.5, 2.8)), whiteMarbleMat);
    pillar.position.set(side * 4.8, 7.75, 0);
    returnGateGroup.add(pillar);

    const capSpire = new THREE.Mesh(track(new THREE.ConeGeometry(1.7, 5.2, 6)), royalGoldMat);
    capSpire.position.set(side * 4.8, 18.1, 0);
    returnGateGroup.add(capSpire);
  }
  const gateCrown = new THREE.Mesh(track(new THREE.TorusGeometry(1.9, 0.25, 8, 20)), royalGoldMat);
  gateCrown.position.set(0, 13.8, 0);
  returnGateGroup.add(gateCrown);

  const portalVeilMat = track(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vec2 c = vUv - vec2(0.5, 0.45);
          float r = length(c);
          float ang = atan(c.y, c.x);
          float swirl = sin(r * 18.0 - uTime * 2.6 + sin(ang * 4.0 + uTime));
          vec3 col = mix(vec3(0.24, 0.34, 0.85), vec3(0.95, 0.78, 0.42), 0.5 + 0.5 * swirl);
          float edge = smoothstep(0.55, 0.12, r);
          gl_FragColor = vec4(col, edge * 0.82);
        }
      `,
    }),
  );
  const portalVeil = new THREE.Mesh(track(new THREE.PlaneGeometry(7.0, 10.6)), portalVeilMat);
  portalVeil.position.set(0, 5.3, 0);
  returnGateGroup.add(portalVeil);

  // Carved Balustrades strictly along outer edges (leaving Sky-Viaducts & Ward Bridge entrances open!)
  const balPostGeo = track(new THREE.BoxGeometry(0.55, 1.35, 0.55));
  const balRailGeo = track(new THREE.BoxGeometry(0.65, 0.28, 3.6));
  const balCoords: Array<[number, number, number]> = [];
  for (let z = 94; z <= 130; z += 4) {
    // Leave West & East High Sky-Viaduct entrances (z: 101..117) open on the balcony flanks!
    if (z <= 100 || z >= 118) {
      balCoords.push([-19.2, ASTRAL.balconyY, z], [19.2, ASTRAL.balconyY, z]);
    }
  }
  for (let z = -2; z <= 90; z += 5) {
    const t = (92 - z) / 98;
    const sy = THREE.MathUtils.lerp(ASTRAL.balconyY, ASTRAL.cityPlazaY, t);
    balCoords.push([-12.5, sy, z], [12.5, sy, z]);
  }
  for (let z = -72; z <= -10; z += 5) {
    // Leave West Ward Bridge & East Chasm Sky-Bridge entrances (z: -55..-25) open!
    if (z <= -56 || z >= -24) {
      balCoords.push([-47.2, ASTRAL.cityPlazaY, z], [47.2, ASTRAL.cityPlazaY, z]);
    }
  }
  for (let z = -120; z <= -76; z += 5) {
    const t = (-74 - z) / 50;
    const sy = THREE.MathUtils.lerp(ASTRAL.cityPlazaY, ASTRAL.citadelTerraceY, t);
    balCoords.push([-16.5, sy, z], [16.5, sy, z]);
  }
  for (let z = -184; z <= -126; z += 5.5) {
    if (z <= -167 || z >= -143) {
      balCoords.push([-53.2, ASTRAL.citadelTerraceY, z]);
    }
    if (z <= -168 || z >= -142) {
      balCoords.push([53.2, ASTRAL.citadelTerraceY, z]);
    }
  }
  const balPosts = new THREE.InstancedMesh(balPostGeo, whiteMarbleMat, balCoords.length);
  const balRails = new THREE.InstancedMesh(balRailGeo, whiteMarbleMat, balCoords.length);
  balCoords.forEach((bc, idx) => {
    dummy.position.set(bc[0], bc[1] + 0.68, bc[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    balPosts.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(bc[0], bc[1] + 1.38, bc[2]);
    dummy.updateMatrix();
    balRails.setMatrixAt(idx, dummy.matrix);
  });
  [balPosts, balRails].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // Veiled Statues on Square Plinths holding Golden Spiral Staffs
  const createVeiledStatue = (x: number, y: number, z: number, rotY: number) => {
    const sg = new THREE.Group();
    sg.position.set(x, y, z);
    sg.rotation.y = rotY;
    const plinth = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 2.0, 2.2)), whiteStoneMat);
    plinth.position.y = 1.0;
    sg.add(plinth);
    const body = new THREE.Mesh(track(new THREE.CylinderGeometry(0.58, 1.02, 2.7, 10)), whiteMarbleMat);
    body.position.y = 3.35;
    sg.add(body);
    const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.56, 10, 8)), whiteMarbleMat);
    head.position.y = 5.0;
    sg.add(head);
    const staff = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 6)), royalGoldMat);
    staff.position.set(0.68, 4.8, 0.45);
    sg.add(staff);
    const spiral = new THREE.Mesh(track(new THREE.TorusGeometry(0.32, 0.09, 6, 14)), royalGoldMat);
    spiral.position.set(0.68, 6.8, 0.45);
    sg.add(spiral);
    group.add(sg);
  };
  createVeiledStatue(-15, ASTRAL.balconyY, 96, 0.35);
  createVeiledStatue(15, ASTRAL.balconyY, 96, -0.35);
  createVeiledStatue(-28, ASTRAL.rearPlazaY, 208, 0.45);
  createVeiledStatue(28, ASTRAL.rearPlazaY, 208, -0.45);
  createVeiledStatue(-28, ASTRAL.rearPlazaY, 274, -2.5);
  createVeiledStatue(28, ASTRAL.rearPlazaY, 274, 2.5);
  createVeiledStatue(-26, ASTRAL.cityPlazaY, -26, 0.4);
  createVeiledStatue(26, ASTRAL.cityPlazaY, -26, -0.4);
  createVeiledStatue(-26, ASTRAL.cityPlazaY, -60, 0.35);
  createVeiledStatue(26, ASTRAL.cityPlazaY, -60, -0.35);
  createVeiledStatue(-24, ASTRAL.citadelTerraceY, -136, 0.3);
  createVeiledStatue(24, ASTRAL.citadelTerraceY, -136, -0.3);

  // =========================================================================
  // 3B. REAR ROYAL PLAZA, TRIUMPHAL ARCH & PANORAMA OVERLOOK (BEHIND SPAWN z: 134..424)
  // =========================================================================
  buildPlatformSlab(-24, 24, 134, 186, ASTRAL.rearPlazaY, 4.5, whiteMarbleMat, 64, cliffRockMat);
  buildPlatformSlab(-76, 76, 186, 298, ASTRAL.rearPlazaY, 4.5, whiteMarbleMat, 76, cliffRockMat);
  const rearDiscPlaza = addWalkable(
    new THREE.Mesh(track(new THREE.CylinderGeometry(74, 76, 4.5, 32)), whiteMarbleMat),
  );
  rearDiscPlaza.position.set(0, ASTRAL.rearPlazaY - 2.25, 242);
  rearDiscPlaza.receiveShadow = true;
  group.add(rearDiscPlaza);

  const rearPedestal = new THREE.Mesh(track(new THREE.CylinderGeometry(78, 86, 98, 24)), cliffDarkBasaltMat);
  rearPedestal.position.set(0, ASTRAL.rearPlazaY - 53.5, 242);
  group.add(rearPedestal);

  // Monumental Triumphal Arch Gatehouse at z = 158 (open 16m wide passage flanked by twin bell towers!)
  const triumphArch = new THREE.Mesh(
    track(
      new THREE.ExtrudeGeometry(createArchShape(16.0, 22.0, 4.2), {
        depth: 7.2,
        bevelEnabled: true,
        bevelSize: 0.25,
        bevelThickness: 0.25,
      }),
    ),
    whiteMarbleMat,
  );
  triumphArch.position.set(0, ASTRAL.rearPlazaY, 154.4);
  group.add(triumphArch);

  const triumphCornice = new THREE.Mesh(track(new THREE.BoxGeometry(38, 4.2, 9.6)), whiteStoneMat);
  triumphCornice.position.set(0, ASTRAL.rearPlazaY + 27.5, 158);
  group.add(triumphCornice);

  // =========================================================================
  // 3B (DETAIL). REAR PLAZA MOSAIC INLAYS, CURVED COLONNADES, BALUSTRADES & GROVES
  // =========================================================================
  // Flush architectural compass rings & radial ribs so the marble plaza has depth & contrast
  for (const rSpec of [
    { inner: 14.0, outer: 15.6, mat: royalGoldMat },
    { inner: 29.0, outer: 32.5, mat: nokronStoneMat },
    { inner: 49.0, outer: 52.0, mat: silverSlateMat },
    { inner: 66.5, outer: 69.0, mat: royalGoldMat },
  ]) {
    const ring = new THREE.Mesh(track(new THREE.RingGeometry(rSpec.inner, rSpec.outer, 48)), rSpec.mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, ASTRAL.rearPlazaY + 0.04, 242);
    group.add(ring);
  }
  for (let spokeIdx = 0; spokeIdx < 8; spokeIdx++) {
    const spoke = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.06, 128)), nokronStoneMat);
    spoke.position.set(0, ASTRAL.rearPlazaY + 0.02, 242);
    spoke.rotation.y = (spokeIdx / 8) * Math.PI;
    group.add(spoke);
  }

  // Curved Romanesque Colonnade Arcades along West & East arcs of Rear Royal Plaza (r = 56)
  for (const side of [-1, 1]) {
    const colCount = 7;
    let prevX = 0;
    let prevZ = 0;
    for (let i = 0; i < colCount; i++) {
      const ang = THREE.MathUtils.lerp(-0.92, 0.92, i / (colCount - 1));
      const cx = side * Math.cos(ang) * 56;
      const cz = 242 + Math.sin(ang) * 56;
      const col = new THREE.Mesh(track(new THREE.CylinderGeometry(0.95, 1.15, 11.5, 10)), whiteMarbleMat);
      col.position.set(cx, ASTRAL.rearPlazaY + 5.75, cz);
      group.add(col);

      const cap = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 1.4, 2.8)), royalGoldMat);
      cap.position.set(cx, ASTRAL.rearPlazaY + 12.1, cz);
      group.add(cap);

      if (i > 0) {
        const mx = (prevX + cx) * 0.5;
        const mz = (prevZ + cz) * 0.5;
        const span = Math.hypot(cx - prevX, cz - prevZ);
        const yaw = Math.atan2(cx - prevX, cz - prevZ);
        const beam = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 2.2, span + 1.2)), whiteStoneMat);
        beam.position.set(mx, ASTRAL.rearPlazaY + 13.8, mz);
        beam.rotation.y = yaw;
        group.add(beam);

        const roof = new THREE.Mesh(track(createPitchedRoofGeo(3.6, 2.2, span + 1.4)), royalGoldMat);
        roof.position.set(mx, ASTRAL.rearPlazaY + 14.9, mz);
        roof.rotation.y = yaw;
        group.add(roof);
      }
      prevX = cx;
      prevZ = cz;
    }
  }

  // Circular Pierced Balustrade around Rear Plaza Rim + Overlook Bridge & Gazebo Parapets
  const rearBalCoords: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 44; i++) {
    const ang = (i / 44) * Math.PI * 2;
    const bx = Math.cos(ang) * 70;
    const bz = 242 + Math.sin(ang) * 70;
    if (Math.abs(bx) < 19 && (bz < 196 || bz > 292)) continue;
    rearBalCoords.push([bx, ASTRAL.rearPlazaY, bz, -ang]);
  }
  for (let bz = 304; bz <= 384; bz += 6) {
    rearBalCoords.push([-13.2, ASTRAL.rearPlazaY, bz, 0], [13.2, ASTRAL.rearPlazaY, bz, 0]);
  }
  for (let bx = -18; bx <= 18; bx += 6) {
    rearBalCoords.push([bx, ASTRAL.rearPlazaY, 423.2, Math.PI / 2]);
  }
  const instRearBalP = new THREE.InstancedMesh(balPostGeo, whiteMarbleMat, rearBalCoords.length);
  const instRearBalR = new THREE.InstancedMesh(balRailGeo, whiteMarbleMat, rearBalCoords.length);
  rearBalCoords.forEach((bc, idx) => {
    dummy.position.set(bc[0], bc[1] + 0.68, bc[2]);
    dummy.rotation.set(0, bc[3], 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instRearBalP.setMatrixAt(idx, dummy.matrix);
    dummy.position.set(bc[0], bc[1] + 1.38, bc[2]);
    dummy.updateMatrix();
    instRearBalR.setMatrixAt(idx, dummy.matrix);
  });
  [instRearBalP, instRearBalR].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // Symmetrical Stone Planter Plinths & Golden Braziers framing the Rear Promenade (x = ±22, ±36)
  for (const [px, pz] of [
    [-22, 206],
    [22, 206],
    [-36, 224],
    [36, 224],
    [-36, 260],
    [36, 260],
    [-22, 278],
    [22, 278],
  ] as Array<[number, number]>) {
    const planter = new THREE.Mesh(track(new THREE.BoxGeometry(5.2, 1.2, 5.2)), whiteStoneMat);
    planter.position.set(px, ASTRAL.rearPlazaY + 0.6, pz);
    group.add(planter);
    const soil = new THREE.Mesh(track(new THREE.BoxGeometry(4.2, 0.35, 4.2)), hedgeMat);
    soil.position.set(px, ASTRAL.rearPlazaY + 1.15, pz);
    group.add(soil);
  }

  for (const side of [-1, 1]) {
    const tPier = new THREE.Mesh(track(new THREE.BoxGeometry(6.8, 30, 8.2)), whiteStoneMat);
    tPier.position.set(side * 14.5, ASTRAL.rearPlazaY + 15, 158);
    group.add(tPier);

    const tBelfry = new THREE.Mesh(track(new THREE.CylinderGeometry(3.4, 3.9, 14, 8)), whiteMarbleMat);
    tBelfry.position.set(side * 14.5, ASTRAL.rearPlazaY + 37, 158);
    group.add(tBelfry);

    const tSpire = new THREE.Mesh(track(new THREE.ConeGeometry(4.0, 18, 8)), royalGoldMat);
    tSpire.position.set(side * 14.5, ASTRAL.rearPlazaY + 53, 158);
    group.add(tSpire);
  }

  // Southern Panoramic Ocean Overlook Bridge & Octagonal Gazebo Pavilion (z: 298..424)
  buildPlatformSlab(-14, 14, 298, 388, ASTRAL.rearPlazaY, 4.0, whiteMarbleMat, 0);
  buildPlatformSlab(-22, 22, 388, 424, ASTRAL.rearPlazaY, 4.5, whiteMarbleMat, 52, cliffDarkBasaltMat);

  // Twin Gate Piers framing the Overlook Bridge threshold at z = 298
  for (const side of [-1, 1]) {
    const obPier = new THREE.Mesh(track(new THREE.BoxGeometry(3.8, 13.5, 3.8)), whiteStoneMat);
    obPier.position.set(side * 14.2, ASTRAL.rearPlazaY + 6.75, 298);
    group.add(obPier);
    const obSpire = new THREE.Mesh(track(new THREE.ConeGeometry(2.4, 6.2, 6)), royalGoldMat);
    obSpire.position.set(side * 14.2, ASTRAL.rearPlazaY + 16.6, 298);
    group.add(obSpire);
  }

  const rearBridgePierGeo = track(new THREE.BoxGeometry(6.5, 148, 22));
  for (let pz = 316; pz <= 376; pz += 30) {
    const pier = new THREE.Mesh(rearBridgePierGeo, whiteStoneMat);
    pier.position.set(0, ASTRAL.rearPlazaY - 78, pz);
    group.add(pier);
  }
  const rearArchBayGeo = track(createPointedArchBridgeBay(24.0, 6.0, 26.0, 4.2, 24.0));
  for (let az = 331; az <= 361; az += 30) {
    const bay = new THREE.Mesh(rearArchBayGeo, whiteMarbleMat);
    bay.rotation.y = Math.PI / 2;
    bay.position.set(0, ASTRAL.rearPlazaY - 30.2, az);
    group.add(bay);
  }

  // Octagonal Golden-Domed Overlook Gazebo at (0, 152, 408)
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(ang) * 14.5;
    const pz = 408 + Math.sin(ang) * 14.5;
    const col = new THREE.Mesh(track(new THREE.CylinderGeometry(1.1, 1.35, 14, 10)), whiteMarbleMat);
    col.position.set(px, ASTRAL.rearPlazaY + 7, pz);
    group.add(col);
  }
  const gazeboRing = new THREE.Mesh(track(new THREE.CylinderGeometry(16, 16, 2.4, 8)), whiteStoneMat);
  gazeboRing.position.set(0, ASTRAL.rearPlazaY + 15.2, 408);
  group.add(gazeboRing);
  const gazeboDome = new THREE.Mesh(
    track(new THREE.SphereGeometry(14.8, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52)),
    royalGoldMat,
  );
  gazeboDome.position.set(0, ASTRAL.rearPlazaY + 16.2, 408);
  group.add(gazeboDome);
  const gazeboFinial = new THREE.Mesh(track(new THREE.ConeGeometry(2.2, 12, 8)), royalGoldMat);
  gazeboFinial.position.set(0, ASTRAL.rearPlazaY + 36, 408);
  group.add(gazeboFinial);

  // =========================================================================
  // 3C. CITY-WIDE ELEVATED SKY-VIADUCT NETWORK (y=152 HIGH ABOVE WARDS & SEA)
  // =========================================================================
  // West & East High Sky-Viaducts branching off Balcony (x=±20..±172, z=102..116)
  buildPlatformSlab(-172, -20, 102, 116, ASTRAL.balconyY, 4.0, whiteMarbleMat, 0);
  buildPlatformSlab(-214, -172, 96, 122, ASTRAL.balconyY, 4.2, whiteMarbleMat, 74, whiteStoneMat);
  buildPlatformSlab(-190, -176, -10, 96, ASTRAL.balconyY, 3.8, whiteMarbleMat, 0);
  buildStairFlight(-212, -194, 14, 96, ASTRAL.balconyY, ASTRAL.wardPlazaY, 68, 'z', whiteMarbleMat, whiteStoneMat);

  buildPlatformSlab(20, 172, 102, 116, ASTRAL.balconyY, 4.0, whiteMarbleMat, 0);
  buildPlatformSlab(172, 214, 96, 122, ASTRAL.balconyY, 4.2, whiteMarbleMat, 74, whiteStoneMat);
  buildStairFlight(194, 212, 24, 96, ASTRAL.balconyY, ASTRAL.wardPlazaY, 64, 'z', whiteMarbleMat, whiteStoneMat);

  // Monumental Sky-Gatehouses at (±182, 152, 109) with open 13m arches
  for (const side of [-1, 1]) {
    const gx = side * 182;
    const skyGateArch = new THREE.Mesh(
      track(new THREE.ExtrudeGeometry(createArchShape(12.5, 16.5, 3.2), { depth: 4.4, bevelEnabled: false })),
      whiteMarbleMat,
    );
    skyGateArch.rotation.y = Math.PI / 2;
    skyGateArch.position.set(gx, ASTRAL.balconyY, 109);
    group.add(skyGateArch);

    for (const zSide of [-1, 1]) {
      const gTower = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 28, 4.4)), whiteStoneMat);
      gTower.position.set(gx, ASTRAL.balconyY + 14, 109 + zSide * 8.5);
      group.add(gTower);

      const gCap = new THREE.Mesh(track(new THREE.ConeGeometry(3.2, 10, 6)), royalGoldMat);
      gCap.position.set(gx, ASTRAL.balconyY + 33, 109 + zSide * 8.5);
      group.add(gCap);
    }
  }

  // Towering Fluted Gothic Piers + Double-Tiered Pointed Arches grounded to bedrock/seabed
  const skyPierGeo = track(new THREE.CylinderGeometry(2.6, 3.4, 162, 10));
  const skyLowerArchGeo = track(createPointedArchBridgeBay(22.0, 4.0, 26.0, 3.2, 12.6));
  const skyUpperArchGeo = track(createPointedArchBridgeBay(10.5, 2.5, 13.0, 3.0, 12.6));
  const skyPierPositions: Array<[number, number, number]> = [];
  const skyBayPositions: Array<[number, number, number, number]> = [];

  for (const side of [-1, 1]) {
    for (let sx = 32; sx <= 162; sx += 26) {
      skyPierPositions.push([side * sx, ASTRAL.balconyY - 84, 109]);
      if (sx + 26 <= 162) {
        skyBayPositions.push([side * (sx + 13), ASTRAL.balconyY - 29, 109, 0]);
      }
    }
  }
  for (let sz = 0; sz <= 90; sz += 22.5) {
    skyPierPositions.push([-183, ASTRAL.balconyY - 84, sz]);
    if (sz + 22.5 <= 90) {
      skyBayPositions.push([-183, ASTRAL.balconyY - 29, sz + 11.25, Math.PI / 2]);
    }
  }
  const instSkyPiers = new THREE.InstancedMesh(skyPierGeo, whiteStoneMat, skyPierPositions.length);
  skyPierPositions.forEach((sp, i) => {
    dummy.position.set(sp[0], sp[1], sp[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instSkyPiers.setMatrixAt(i, dummy.matrix);
  });
  instSkyPiers.instanceMatrix.needsUpdate = true;
  instSkyPiers.computeBoundingSphere();
  group.add(instSkyPiers);

  skyBayPositions.forEach((sb) => {
    const upper = new THREE.Mesh(skyLowerArchGeo, whiteMarbleMat);
    upper.position.set(sb[0], sb[1], sb[2]);
    upper.rotation.y = sb[3];
    group.add(upper);

    const lower = new THREE.Mesh(skyUpperArchGeo, whiteStoneMat);
    lower.position.set(sb[0], sb[1] - 32, sb[2]);
    lower.rotation.y = sb[3];
    lower.scale.set(2.0, 1.8, 1.0);
    group.add(lower);
  });

  // Elevated Sky-Viaduct Pierced Balustrades & Periodic Buttress Alcoves with Braziers
  const viaductBalCoords: Array<[number, number, number, number]> = [];
  const skyBrazierSpots: Array<[number, number, number]> = [];
  for (const side of [-1, 1]) {
    for (let vx = 26; vx <= 168; vx += 6) {
      viaductBalCoords.push([side * vx, ASTRAL.balconyY, 102.6, Math.PI / 2]);
      viaductBalCoords.push([side * vx, ASTRAL.balconyY, 115.4, Math.PI / 2]);
      if ((vx - 26) % 36 === 0) {
        skyBrazierSpots.push([side * vx, ASTRAL.balconyY, 103.5], [side * vx, ASTRAL.balconyY, 114.5]);
      }
    }
  }
  for (let vz = -6; vz <= 92; vz += 6) {
    viaductBalCoords.push([-189.2, ASTRAL.balconyY, vz, 0], [-176.8, ASTRAL.balconyY, vz, 0]);
  }
  const instViaductBalP = new THREE.InstancedMesh(balPostGeo, whiteMarbleMat, viaductBalCoords.length);
  const instViaductBalR = new THREE.InstancedMesh(balRailGeo, whiteMarbleMat, viaductBalCoords.length);
  viaductBalCoords.forEach((bc, idx) => {
    dummy.position.set(bc[0], bc[1] + 0.68, bc[2]);
    dummy.rotation.set(0, bc[3], 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instViaductBalP.setMatrixAt(idx, dummy.matrix);
    dummy.position.set(bc[0], bc[1] + 1.38, bc[2]);
    dummy.updateMatrix();
    instViaductBalR.setMatrixAt(idx, dummy.matrix);
  });
  [instViaductBalP, instViaductBalR].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  skyBrazierSpots.forEach((sb) => {
    const alcove = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 2.2, 1.8)), whiteStoneMat);
    alcove.position.set(sb[0], sb[1] + 0.9, sb[2]);
    group.add(alcove);
    const bowl = new THREE.Mesh(track(new THREE.CylinderGeometry(0.85, 0.45, 0.9, 8)), darkIronMat);
    bowl.position.set(sb[0], sb[1] + 2.4, sb[2]);
    group.add(bowl);
    const orb = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.55, 1)), goldenWindowMat);
    orb.position.set(sb[0], sb[1] + 3.1, sb[2]);
    group.add(orb);
  });

  // =========================================================================
  // 3D. WEST & EAST OUTER WARDS, ROTUNDA SHRINES, CHASM BRIDGE & HARBOR LINKS
  // =========================================================================
  // West Ward Bridge & Plaza
  buildPlatformSlab(-146, -48, -54, -26, ASTRAL.wardPlazaY, 4.0, whiteMarbleMat, 52, cliffRockMat);
  buildPlatformSlab(-214, -146, -96, 14, ASTRAL.wardPlazaY, 4.2, whiteMarbleMat, 68, cliffRockMat);
  buildPlatformSlab(-146, -98, -136, -54, ASTRAL.wardPlazaY, 4.0, whiteMarbleMat, 62, cliffRockMat);
  buildStairFlight(-206, -184, -196, -96, ASTRAL.wardPlazaY, ASTRAL.aqueductDeckY, 64, 'z', nokronStoneMat, cliffRockMat);
  buildPlatformSlab(-228, -160, -362, -196, ASTRAL.aqueductDeckY, 3.8, nokronStoneMat, 28, cliffDarkBasaltMat);

  // East Chasm Sky-Bridge (spanning Ocean Channel x: 48..154, y=78) & East Outer Ward Plaza
  buildPlatformSlab(48, 154, -54, -26, ASTRAL.wardPlazaY, 3.8, whiteMarbleMat, 0);
  const eastChasmBayGeo = track(createPointedArchBridgeBay(21.0, 5.0, 22.0, 3.8, 26.0));
  const eastChasmPierGeo = track(new THREE.BoxGeometry(6.0, 92, 26.8));
  for (let b = 0; b < 4; b++) {
    const bay = new THREE.Mesh(eastChasmBayGeo, whiteStoneMat);
    bay.position.set(61 + b * 26, ASTRAL.wardPlazaY - 25.8, -40);
    group.add(bay);
  }
  for (let p = 0; p < 5; p++) {
    const pier = new THREE.Mesh(eastChasmPierGeo, cliffDarkBasaltMat);
    pier.position.set(48 + p * 26, ASTRAL.wardPlazaY - 72, -40);
    group.add(pier);
  }

  buildPlatformSlab(154, 242, -80, 24, ASTRAL.wardPlazaY, 4.2, whiteMarbleMat, 68, cliffRockMat);
  // East Fortress South Stairway (y: 78 -> 114 leading cleanly into Dark Stone Fortress South Gate!)
  buildStairFlight(176, 202, -124, -80, ASTRAL.wardPlazaY, ASTRAL.fortressCourtyardY, 44, 'z', fortressStoneMat, cliffDarkBasaltMat);
  // East Harbor Coastal Promenade Ramp/Stair & East Harbor Pier connecting cleanly to Sea-Aqueduct (+120)!
  buildStairFlight(226, 248, -280, -80, ASTRAL.wardPlazaY, ASTRAL.aqueductDeckY, 72, 'z', nokronStoneMat, cliffDarkBasaltMat);
  buildPlatformSlab(118, 248, -362, -280, ASTRAL.aqueductDeckY, 3.8, nokronStoneMat, 28, cliffDarkBasaltMat);

  // Circular Romanesque Rotunda Shrines around West & East Grace Sites (-182, 78, -42) & (194, 78, -42)
  for (const rx of [-182, 194]) {
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + Math.PI / 8;
      const col = new THREE.Mesh(track(new THREE.CylinderGeometry(1.1, 1.3, 13, 10)), whiteMarbleMat);
      col.position.set(rx + Math.cos(ang) * 14, ASTRAL.wardPlazaY + 6.5, -42 + Math.sin(ang) * 14);
      group.add(col);
    }
    const drum = new THREE.Mesh(track(new THREE.CylinderGeometry(15.5, 15.5, 2.2, 8)), whiteStoneMat);
    drum.position.set(rx, ASTRAL.wardPlazaY + 14.0, -42);
    group.add(drum);
    const dome = new THREE.Mesh(
      track(new THREE.SphereGeometry(14.5, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52)),
      royalGoldMat,
    );
    dome.position.set(rx, ASTRAL.wardPlazaY + 15.0, -42);
    group.add(dome);
  }

  // Pierced Balustrades along West/East Ward outer edges & East Chasm Bridge (leaving stairways cleanly open)
  const wardBalCoords: Array<[number, number, number, number]> = [];
  for (let wz = -90; wz <= 10; wz += 6) {
    wardBalCoords.push([-213.2, ASTRAL.wardPlazaY, wz, 0]);
  }
  for (let wz = -74; wz <= 18; wz += 6) {
    wardBalCoords.push([241.2, ASTRAL.wardPlazaY, wz, 0]);
  }
  for (let bx = 54; bx <= 150; bx += 6) {
    wardBalCoords.push([bx, ASTRAL.wardPlazaY, -53.2, Math.PI / 2], [bx, ASTRAL.wardPlazaY, -26.8, Math.PI / 2]);
  }
  const instWardBalP = new THREE.InstancedMesh(balPostGeo, whiteMarbleMat, wardBalCoords.length);
  const instWardBalR = new THREE.InstancedMesh(balRailGeo, whiteMarbleMat, wardBalCoords.length);
  wardBalCoords.forEach((bc, idx) => {
    dummy.position.set(bc[0], bc[1] + 0.68, bc[2]);
    dummy.rotation.set(0, bc[3], 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instWardBalP.setMatrixAt(idx, dummy.matrix);
    dummy.position.set(bc[0], bc[1] + 1.38, bc[2]);
    dummy.updateMatrix();
    instWardBalR.setMatrixAt(idx, dummy.matrix);
  });
  [instWardBalP, instWardBalR].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // =========================================================================
  // 4. SYMMETRICALLY TIERED WHITE-GOLD ROYAL CITADEL (Exterior Only!)
  // =========================================================================
  const royalCitadel = new THREE.Group();
  royalCitadel.position.set(0, ASTRAL.citadelTerraceY, -222);
  group.add(royalCitadel);

  const citPodium = new THREE.Mesh(track(new THREE.BoxGeometry(114, 68, 68)), whiteStoneMat);
  citPodium.position.set(0, -16, 0);
  citPodium.receiveShadow = true;
  citPodium.castShadow = true;
  royalCitadel.add(citPodium);

  const citHall = new THREE.Mesh(track(new THREE.BoxGeometry(84, 52, 52)), whiteStoneMat);
  citHall.position.set(0, 44, -2);
  citHall.castShadow = true;
  citHall.receiveShadow = true;
  royalCitadel.add(citHall);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(track(new THREE.BoxGeometry(30, 36, 42)), whiteStoneMat);
    wing.position.set(side * 46, 28, 4);
    royalCitadel.add(wing);

    const wingDome = new THREE.Mesh(
      track(new THREE.SphereGeometry(12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52)),
      royalGoldMat,
    );
    wingDome.position.set(side * 46, 46, 4);
    royalCitadel.add(wingDome);

    const wingFinial = new THREE.Mesh(track(new THREE.ConeGeometry(2.0, 12, 8)), royalGoldMat);
    wingFinial.position.set(side * 46, 62, 4);
    royalCitadel.add(wingFinial);
  }

  const citPortalArch = new THREE.Mesh(
    track(new THREE.ExtrudeGeometry(createArchShape(12, 22, 2.8), { depth: 5.0, bevelEnabled: false })),
    whiteMarbleMat,
  );
  citPortalArch.position.set(0, 0, 26.5);
  royalCitadel.add(citPortalArch);

  const citPortalGlow = new THREE.Mesh(track(new THREE.PlaneGeometry(10.5, 19)), goldenWindowMat);
  citPortalGlow.position.set(0, 9.5, 29.2);
  royalCitadel.add(citPortalGlow);

  const citRose = new THREE.Mesh(track(new THREE.CircleGeometry(6.8, 24)), goldenWindowMat);
  citRose.position.set(0, 48, 24.4);
  royalCitadel.add(citRose);

  const citRoseFrame = new THREE.Mesh(track(new THREE.TorusGeometry(6.9, 0.55, 8, 24)), whiteMarbleMat);
  citRoseFrame.position.set(0, 48, 24.6);
  royalCitadel.add(citRoseFrame);

  const citRoseInner = new THREE.Mesh(track(new THREE.TorusGeometry(3.4, 0.35, 6, 18)), whiteMarbleMat);
  citRoseInner.position.set(0, 48, 24.65);
  royalCitadel.add(citRoseInner);

  for (let m = 0; m < 4; m++) {
    const spoke = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 13.6, 0.5)), whiteMarbleMat);
    spoke.position.set(0, 48, 24.6);
    spoke.rotation.z = (m / 4) * Math.PI;
    royalCitadel.add(spoke);
  }

  for (let bx = -36; bx <= 36; bx += 9) {
    const pier = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 52, 4.2)), whiteMarbleMat);
    pier.position.set(bx, 28, 25.0);
    royalCitadel.add(pier);

    if (Math.abs(bx) >= 14) {
      const lancet = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 18, 1.2)), goldenWindowMat);
      lancet.position.set(bx - 4.5 * Math.sign(bx), 26, 24.3);
      royalCitadel.add(lancet);
    }
  }

  const citDrum = new THREE.Mesh(track(new THREE.CylinderGeometry(24, 26, 26, 8)), whiteMarbleMat);
  citDrum.position.set(0, 82, -2);
  royalCitadel.add(citDrum);

  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const win = new THREE.Mesh(track(new THREE.BoxGeometry(3.8, 12, 1.4)), shadowStoneMat);
    win.position.set(Math.sin(ang) * 24.2, 82, -2 + Math.cos(ang) * 24.2);
    win.rotation.y = ang;
    royalCitadel.add(win);
  }

  const citGrandDome = new THREE.Mesh(
    track(new THREE.SphereGeometry(23.5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52)),
    royalGoldMat,
  );
  citGrandDome.position.set(0, 95, -2);
  royalCitadel.add(citGrandDome);

  for (let r = 0; r < 4; r++) {
    const rib = new THREE.Mesh(track(new THREE.TorusGeometry(23.7, 0.7, 6, 24, Math.PI)), whiteMarbleMat);
    rib.position.set(0, 95, -2);
    rib.rotation.y = (r / 4) * Math.PI;
    royalCitadel.add(rib);
  }

  const citMainSpire = new THREE.Mesh(track(new THREE.ConeGeometry(3.6, 28, 8)), royalGoldMat);
  citMainSpire.position.set(0, 130, -2);
  royalCitadel.add(citMainSpire);

  const citSpires = [
    { x: -28, z: 16, h: 74, r: 6.8, sh: 30 },
    { x: 28, z: 16, h: 74, r: 6.8, sh: 30 },
    { x: -34, z: -20, h: 84, r: 7.5, sh: 34 },
    { x: 34, z: -20, h: 84, r: 7.5, sh: 34 },
  ];
  for (const sp of citSpires) {
    const shaft = new THREE.Mesh(track(new THREE.BoxGeometry(sp.r * 1.7, sp.h, sp.r * 1.7)), whiteStoneMat);
    shaft.position.set(sp.x, sp.h * 0.5, sp.z);
    royalCitadel.add(shaft);

    const belfry = new THREE.Mesh(track(new THREE.CylinderGeometry(sp.r * 0.8, sp.r * 0.9, 14, 8)), whiteMarbleMat);
    belfry.position.set(sp.x, sp.h + 7, sp.z);
    royalCitadel.add(belfry);

    const cap = new THREE.Mesh(track(new THREE.ConeGeometry(sp.r * 0.88, sp.sh, 8)), royalGoldMat);
    cap.position.set(sp.x, sp.h + 13.5 + sp.sh * 0.5, sp.z);
    royalCitadel.add(cap);
  }

  // =========================================================================
  // 5. MONUMENTAL MULTI-ARCHED STONE BRIDGE ACROSS OCEAN CHANNEL (x: 54 -> 158)
  // =========================================================================
  buildPlatformSlab(54, 158, -166, -144, ASTRAL.citadelTerraceY, 3.6, fortressStoneMat, 0);

  const bridgeArchBayGeo = track(createPointedArchBridgeBay(21.0, 5.0, 22.0, 4.0, 21.0));
  const bridgePierGeo = track(new THREE.BoxGeometry(6.2, 108, 22.8));
  const bridgeParapetGeo = track(new THREE.BoxGeometry(104, 1.8, 1.4));

  for (let b = 0; b < 4; b++) {
    const bx = 67 + b * 26;
    const archBay = new THREE.Mesh(bridgeArchBayGeo, fortressStoneMat);
    archBay.position.set(bx, ASTRAL.citadelTerraceY - 26.0, -155);
    archBay.castShadow = true;
    archBay.receiveShadow = true;
    group.add(archBay);
  }
  for (let p = 0; p < 5; p++) {
    const px = 54 + p * 26;
    const pier = new THREE.Mesh(bridgePierGeo, fortressDarkMat);
    pier.position.set(px, ASTRAL.citadelTerraceY - 26.0 - 54.0, -155);
    pier.receiveShadow = true;
    group.add(pier);
  }
  for (const pz of [-165.3, -144.7]) {
    const parapet = new THREE.Mesh(bridgeParapetGeo, fortressStoneMat);
    parapet.position.set(106, ASTRAL.citadelTerraceY + 0.9, pz);
    group.add(parapet);
  }

  const merlonGeo = track(new THREE.BoxGeometry(2.4, 1.4, 1.5));
  const bridgeMerlons = new THREE.InstancedMesh(merlonGeo, fortressStoneMat, 36);
  let bmIdx = 0;
  for (let mx = 58; mx <= 154; mx += 5.6) {
    for (const mz of [-165.3, -144.7]) {
      if (bmIdx >= 36) break;
      dummy.position.set(mx, ASTRAL.citadelTerraceY + 2.3, mz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bridgeMerlons.setMatrixAt(bmIdx++, dummy.matrix);
    }
  }
  bridgeMerlons.instanceMatrix.needsUpdate = true;
  bridgeMerlons.computeBoundingSphere();
  group.add(bridgeMerlons);

  // =========================================================================
  // 6. DARK STONE FORTRESS ATOP RUGGED EASTERN HEADLAND
  // =========================================================================
  const fortressGroup = new THREE.Group();
  fortressGroup.position.set(192, ASTRAL.fortressCourtyardY, -155);
  group.add(fortressGroup);

  const fortSubBase = new THREE.Mesh(track(new THREE.BoxGeometry(72, 68, 72)), fortressDarkMat);
  fortSubBase.position.set(0, -34, 0);
  fortressGroup.add(fortSubBase);

  buildPlatformSlab(158, 224, -186, -124, ASTRAL.fortressCourtyardY, 3.6, fortressStoneMat, 0);

  const barbicanArch = new THREE.Mesh(
    track(new THREE.ExtrudeGeometry(createArchShape(18.5, 14.0, 3.6), { depth: 5.5, bevelEnabled: false })),
    fortressStoneMat,
  );
  barbicanArch.rotation.y = Math.PI / 2;
  barbicanArch.position.set(-32, 0, 0);
  fortressGroup.add(barbicanArch);

  for (const side of [-1, 1]) {
    const bTower = new THREE.Mesh(track(new THREE.CylinderGeometry(5.2, 5.8, 34, 12)), fortressStoneMat);
    bTower.position.set(-32, 16, side * 12.5);
    fortressGroup.add(bTower);

    const bCrown = new THREE.Mesh(track(new THREE.CylinderGeometry(6.0, 5.4, 4.5, 12)), fortressDarkMat);
    bCrown.position.set(-32, 34, side * 12.5);
    fortressGroup.add(bCrown);
  }

  // North curtain wall solid; South curtain wall split around world x: 176..202 (local x = -16..+10) for South Gate!
  const northCurtain = new THREE.Mesh(track(new THREE.BoxGeometry(66, 22, 4.5)), fortressStoneMat);
  northCurtain.position.set(0, 8, -31);
  fortressGroup.add(northCurtain);
  for (let ax = -20; ax <= 20; ax += 14) {
    const glowSlit = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 7.5, 1.0)), fortressGlowMat);
    glowSlit.position.set(ax, 9, -28.6);
    fortressGroup.add(glowSlit);
  }

  // Split South Curtain Wall with open arched South Gatehouse directly aligned to East Fortress South Stairway!
  const southWallWest = new THREE.Mesh(track(new THREE.BoxGeometry(17, 22, 4.5)), fortressStoneMat);
  southWallWest.position.set(-24.5, 8, 31);
  fortressGroup.add(southWallWest);

  const southWallEast = new THREE.Mesh(track(new THREE.BoxGeometry(23, 22, 4.5)), fortressStoneMat);
  southWallEast.position.set(21.5, 8, 31);
  fortressGroup.add(southWallEast);

  const southGateArch = new THREE.Mesh(
    track(new THREE.ExtrudeGeometry(createArchShape(24.0, 16.0, 4.0), { depth: 4.8, bevelEnabled: false })),
    fortressStoneMat,
  );
  southGateArch.position.set(-3, 0, 31);
  fortressGroup.add(southGateArch);

  const mainKeepRound = new THREE.Mesh(track(new THREE.CylinderGeometry(14.5, 16.5, 98, 16)), fortressStoneMat);
  mainKeepRound.position.set(36, 46, 0);
  fortressGroup.add(mainKeepRound);

  const mainKeepParapet = new THREE.Mesh(track(new THREE.CylinderGeometry(16.5, 15.0, 8, 16)), fortressDarkMat);
  mainKeepParapet.position.set(36, 97, 0);
  fortressGroup.add(mainKeepParapet);

  const keepBanner = new THREE.Mesh(track(new THREE.CylinderGeometry(0.35, 0.35, 16, 6)), fortressDarkMat);
  keepBanner.position.set(36, 108, 0);
  fortressGroup.add(keepBanner);

  const fortTowerSpecs = [
    { x: 26, z: -22, w: 16, h: 72, roof: 'crenel' },
    { x: 26, z: 22, w: 17, h: 78, roof: 'crenel' },
    { x: 46, z: -18, w: 14, h: 64, roof: 'pyramid' },
    { x: 46, z: 20, w: 14, h: 68, roof: 'pyramid' },
    { x: 12, z: -26, w: 13, h: 48, roof: 'pyramid' },
    { x: 12, z: 26, w: 13, h: 52, roof: 'crenel' },
  ];
  for (const ft of fortTowerSpecs) {
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(ft.w, ft.h, ft.w)), fortressStoneMat);
    body.position.set(ft.x, ft.h * 0.5 - 4, ft.z);
    fortressGroup.add(body);

    const slit = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 6.5, ft.w + 0.8)), fortressGlowMat);
    slit.position.set(ft.x, ft.h * 0.65 - 4, ft.z);
    fortressGroup.add(slit);

    if (ft.roof === 'pyramid') {
      const roof = new THREE.Mesh(track(new THREE.ConeGeometry(ft.w * 0.78, 14, 4)), fortressDarkMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(ft.x, ft.h + 3, ft.z);
      fortressGroup.add(roof);
    } else {
      const cap = new THREE.Mesh(track(new THREE.BoxGeometry(ft.w + 2.0, 5.0, ft.w + 2.0)), fortressDarkMat);
      cap.position.set(ft.x, ft.h - 2, ft.z);
      fortressGroup.add(cap);
    }
  }

  const fortSkyBridge = new THREE.Mesh(
    track(new THREE.ExtrudeGeometry(createArchShape(14, 16, 3.2), { depth: 4.0, bevelEnabled: false })),
    fortressStoneMat,
  );
  fortSkyBridge.position.set(8, 22, -22);
  fortressGroup.add(fortSkyBridge);

  // =========================================================================
  // 7. GROUNDED GOLDEN-ROOFED CITY & STRICT WALKWAY-AUDITED FOLIAGE
  // =========================================================================
  interface GroundedBuilding {
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    ry: number;
    hasSpire: boolean;
  }
  const cityBuildings: GroundedBuilding[] = [];

  for (let i = 0; i < 640; i++) {
    const bx = -275 + hash01(i * 3 + 1) * 550;
    const bz = -220 + hash01(i * 3 + 2) * 540;

    const sx = 12 + hash01(i * 7 + 1) * 10;
    const sy = 15 + hash01(i * 7 + 2) * 17;
    const sz = 14 + hash01(i * 7 + 3) * 11;
    const ry = ((i % 4) * Math.PI) / 2 + (hash01(i * 11) - 0.5) * 0.25;
    const halfBound = Math.hypot(sx, sz) * 0.56;

    // Strict bounding-box walkway clearance audit: NEVER clip any stair, sky-viaduct, plaza, or terrace!
    if (overlapsAnyWalkway(bx, bz, halfBound, halfBound, 4.2)) continue;

    const gy = sampleIslandTerrainY(bx, bz);
    if (gy < 54) continue;
    const gMinCorner = Math.min(
      sampleIslandTerrainY(bx - 8, bz - 8),
      sampleIslandTerrainY(bx + 8, bz + 8),
      sampleIslandTerrainY(bx - 8, bz + 8),
      sampleIslandTerrainY(bx + 8, bz - 8),
    );
    if (gMinCorner < 44) continue;

    cityBuildings.push({
      x: bx,
      y: gMinCorner,
      z: bz,
      sx,
      sy,
      sz,
      ry,
      hasSpire: i % 4 === 0,
    });
  }

  const housePlinthGeo = track(new THREE.BoxGeometry(1.04, 48, 1.04));
  const houseBodyGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const houseCorniceGeo = track(new THREE.BoxGeometry(1.06, 0.14, 1.06));
  const houseWinGeo = track(new THREE.BoxGeometry(1.02, 0.22, 0.72));
  const houseRoofGeo = track(createPitchedRoofGeo(1.08, 0.55, 1.06));

  const instPlinths = new THREE.InstancedMesh(housePlinthGeo, cliffRockMat, cityBuildings.length);
  const instBodies = new THREE.InstancedMesh(houseBodyGeo, whiteStoneMat, cityBuildings.length);
  const instCornices = new THREE.InstancedMesh(houseCorniceGeo, whiteMarbleMat, cityBuildings.length);
  const instWins = new THREE.InstancedMesh(houseWinGeo, shadowStoneMat, cityBuildings.length);
  const instRoofs = new THREE.InstancedMesh(houseRoofGeo, royalGoldMat, cityBuildings.length);

  const spireItems = cityBuildings.filter((b) => b.hasSpire);
  const spireShaftGeo = track(new THREE.CylinderGeometry(2.1, 2.7, 20, 6));
  const spireCapGeo = track(new THREE.ConeGeometry(2.7, 13, 6));
  const instSpireShafts = new THREE.InstancedMesh(spireShaftGeo, whiteMarbleMat, spireItems.length);
  const instSpireCaps = new THREE.InstancedMesh(spireCapGeo, royalGoldMat, spireItems.length);

  let sIdx = 0;
  const roofCol = new THREE.Color();
  cityBuildings.forEach((b, i) => {
    dummy.position.set(b.x, b.y - 22.0, b.z);
    dummy.rotation.set(0, b.ry, 0);
    dummy.scale.set(b.sx, 1, b.sz);
    dummy.updateMatrix();
    instPlinths.setMatrixAt(i, dummy.matrix);

    dummy.position.set(b.x, b.y + b.sy * 0.5, b.z);
    dummy.scale.set(b.sx, b.sy, b.sz);
    dummy.updateMatrix();
    instBodies.setMatrixAt(i, dummy.matrix);

    dummy.position.set(b.x, b.y + b.sy * 0.94, b.z);
    dummy.scale.set(b.sx, b.sy, b.sz);
    dummy.updateMatrix();
    instCornices.setMatrixAt(i, dummy.matrix);

    dummy.position.set(b.x, b.y + b.sy * 0.62, b.z);
    dummy.scale.set(b.sx, b.sy, b.sz);
    dummy.updateMatrix();
    instWins.setMatrixAt(i, dummy.matrix);

    dummy.position.set(b.x, b.y + b.sy, b.z);
    dummy.scale.set(b.sx, b.sx * 0.55, b.sz);
    dummy.updateMatrix();
    instRoofs.setMatrixAt(i, dummy.matrix);

    const gShade = 0.85 + hash01(i * 19 + 5) * 0.22;
    roofCol.setRGB(gShade, gShade * 0.92, gShade * 0.8);
    instRoofs.setColorAt(i, roofCol);

    if (b.hasSpire) {
      const sScaleY = 0.9 + hash01(i * 23) * 0.45;
      const shaftH = 20 * sScaleY;
      dummy.position.set(b.x, b.y + b.sy + shaftH * 0.5 - 0.5, b.z);
      dummy.rotation.set(0, b.ry, 0);
      dummy.scale.set(1, sScaleY, 1);
      dummy.updateMatrix();
      instSpireShafts.setMatrixAt(sIdx, dummy.matrix);

      dummy.position.set(b.x, b.y + b.sy + shaftH - 0.5 + 5.6, b.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instSpireCaps.setMatrixAt(sIdx, dummy.matrix);
      sIdx++;
    }
  });

  [instPlinths, instBodies, instCornices, instWins, instRoofs, instSpireShafts, instSpireCaps].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingBox();
    im.computeBoundingSphere();
    group.add(im);
  });

  // Dense InstancedMesh Foliage strictly cleared from stairs/walkways across 360° Archipelago
  const treeCoords: Array<[number, number, number, number]> = [
    [-16, ASTRAL.balconyY, 100, 1.15],
    [16, ASTRAL.balconyY, 100, 1.18],
    // Rear Royal & Erdtree Terrace Tree Gardens (behind spawn — inside & outside balustrade!)
    [-22, ASTRAL.rearPlazaY, 206, 1.28],
    [22, ASTRAL.rearPlazaY, 206, 1.26],
    [-36, ASTRAL.rearPlazaY, 224, 1.38],
    [36, ASTRAL.rearPlazaY, 224, 1.36],
    [-36, ASTRAL.rearPlazaY, 260, 1.38],
    [36, ASTRAL.rearPlazaY, 260, 1.35],
    [-22, ASTRAL.rearPlazaY, 278, 1.28],
    [22, ASTRAL.rearPlazaY, 278, 1.3],
    // West & East Outer Ward Gardens
    [-162, ASTRAL.wardPlazaY, -12, 1.3],
    [-162, ASTRAL.wardPlazaY, -72, 1.3],
    [168, ASTRAL.wardPlazaY, -12, 1.3],
    [224, ASTRAL.wardPlazaY, -62, 1.32],
    [-40, ASTRAL.cityPlazaY, -16, 1.35],
    [40, ASTRAL.cityPlazaY, -16, 1.3],
    [-40, ASTRAL.cityPlazaY, -62, 1.3],
    [40, ASTRAL.cityPlazaY, -62, 1.35],
    [-44, ASTRAL.citadelTerraceY, -134, 1.3],
    [44, ASTRAL.citadelTerraceY, -134, 1.25],
    [-108, ASTRAL.westGardenY, -155, 1.25],
    // Windswept golden coastal trees framing the Celestial Sea Sanctuary terraces!
    [-31, ASTRAL.shrineCloisterY, -536, 1.18],
    [-31, ASTRAL.shrineSummitY, -616, 1.24],
    [31, ASTRAL.shrineSummitY, -616, 1.2],
    [-32, ASTRAL.shrineSummitY, -642, 1.15],
    [32, ASTRAL.shrineSummitY, -642, 1.18],
  ];
  const cypressCoords: Array<[number, number, number, number]> = [];
  const hedgeCoords: Array<[number, number, number, number]> = [];
  const wallCoords: Array<[number, number, number, number]> = [];

  for (let i = 0; i < 480; i++) {
    const px = -265 + hash01(i * 13 + 1) * 530;
    const pz = -210 + hash01(i * 13 + 2) * 530;
    if (overlapsAnyWalkway(px, pz, 4.6, 4.6, 4.2)) continue;

    const gy = sampleIslandTerrainY(px, pz);
    if (gy < 48) continue;

    if (i % 2 === 0) {
      treeCoords.push([px, gy - 0.5, pz, 0.95 + hash01(i * 17) * 0.7]);
    } else {
      cypressCoords.push([px, gy - 0.5, pz, 0.95 + hash01(i * 19) * 0.75]);
    }
    if (i % 3 === 0 && !overlapsAnyWalkway(px + 3.5, pz + 2.5, 4.8, 4.8, 4.2)) {
      hedgeCoords.push([px + 3.5, gy - 0.3, pz + 2.5, ((i % 4) * Math.PI) / 2]);
    }
    if (i % 4 === 0 && !overlapsAnyWalkway(px - 4.0, pz - 3.0, 6.2, 6.2, 4.4)) {
      wallCoords.push([px - 4.0, gy - 0.5, pz - 3.0, ((i % 2) * Math.PI) / 2]);
    }
  }
  for (let hz = -68; hz <= -12; hz += 10) {
    hedgeCoords.push([-44.5, ASTRAL.cityPlazaY, hz, Math.PI / 2], [44.5, ASTRAL.cityPlazaY, hz, Math.PI / 2]);
    cypressCoords.push([-43, ASTRAL.cityPlazaY, hz + 5, 1.15], [43, ASTRAL.cityPlazaY, hz + 5, 1.15]);
  }

  const tTrunkGeo = track(new THREE.CylinderGeometry(0.26, 0.54, 5.4, 6));
  const lobe1 = new THREE.DodecahedronGeometry(2.3, 0);
  lobe1.translate(0, 6.2, 0);
  const lobe2 = new THREE.DodecahedronGeometry(1.85, 0);
  lobe2.translate(1.5, 5.3, 0.7);
  const lobe3 = new THREE.DodecahedronGeometry(1.75, 0);
  lobe3.translate(-1.4, 5.6, -0.6);
  const lobe4 = new THREE.DodecahedronGeometry(1.5, 0);
  lobe4.translate(0.5, 7.1, -0.9);
  const lobe5 = new THREE.DodecahedronGeometry(1.45, 0);
  lobe5.translate(-0.7, 6.9, 1.0);
  const tCanopyGeo = track(mergeGeometries([lobe1, lobe2, lobe3, lobe4, lobe5])!);
  lobe1.dispose();
  lobe2.dispose();
  lobe3.dispose();
  lobe4.dispose();
  lobe5.dispose();

  const instTreeTrunks = new THREE.InstancedMesh(tTrunkGeo, paleBarkMat, treeCoords.length);
  const instTreeCanopies = new THREE.InstancedMesh(tCanopyGeo, amberFoliageMat, treeCoords.length);
  const treeCol = new THREE.Color();
  treeCoords.forEach((tc, i) => {
    const s = tc[3];
    dummy.position.set(tc[0], tc[1] + 2.5 * s, tc[2]);
    dummy.rotation.set(0, hash01(i * 29) * Math.PI * 2, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    instTreeTrunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tc[0], tc[1], tc[2]);
    dummy.updateMatrix();
    instTreeCanopies.setMatrixAt(i, dummy.matrix);

    const tone = hash01(i * 37);
    treeCol.setHSL(0.055 + tone * 0.035, 0.84, 0.32 + tone * 0.12);
    instTreeCanopies.setColorAt(i, treeCol);
  });

  const cypressGeo = track(new THREE.ConeGeometry(1.6, 13.5, 7));
  const instCypress = new THREE.InstancedMesh(cypressGeo, cypressFoliageMat, cypressCoords.length);
  cypressCoords.forEach((cc, i) => {
    const s = cc[3];
    dummy.position.set(cc[0], cc[1] + 6.5 * s, cc[2]);
    dummy.rotation.set(0, hash01(i * 11) * Math.PI, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    instCypress.setMatrixAt(i, dummy.matrix);
  });

  const hedgeGeo = track(new THREE.BoxGeometry(6.8, 2.2, 1.8));
  const instHedges = new THREE.InstancedMesh(hedgeGeo, hedgeMat, hedgeCoords.length);
  hedgeCoords.forEach((hc, i) => {
    dummy.position.set(hc[0], hc[1] + 1.0, hc[2]);
    dummy.rotation.set(0, hc[3], 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instHedges.setMatrixAt(i, dummy.matrix);
  });

  const cWallGeo = track(new THREE.BoxGeometry(10, 4.2, 1.5));
  const instWalls = new THREE.InstancedMesh(cWallGeo, whiteStoneMat, wallCoords.length);
  wallCoords.forEach((wc, i) => {
    dummy.position.set(wc[0], wc[1] + 1.4, wc[2]);
    dummy.rotation.set(0, wc[3], 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instWalls.setMatrixAt(i, dummy.matrix);
  });

  [instTreeTrunks, instTreeCanopies, instCypress, instHedges, instWalls].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // =========================================================================
  // 8. WEST COASTAL DESCENT & SYMMETRICAL TWO-TIER SEA-AQUEDUCT
  // =========================================================================
  buildStairFlight(-98, -54, -165, -145, ASTRAL.citadelTerraceY, ASTRAL.westGardenY, 34, 'x', whiteStoneMat, cliffRockMat);
  buildPlatformSlab(-128, -98, -184, -136, ASTRAL.westGardenY, 4.0, whiteStoneMat, 36, cliffRockMat);
  buildStairFlight(-120, -102, -244, -184, ASTRAL.westGardenY, ASTRAL.aqueductMidY, 42, 'z', nokronStoneMat, cliffRockMat);
  buildPlatformSlab(-124, 0, -276, -244, ASTRAL.aqueductMidY, 4.2, nokronStoneMat, 42, cliffRockMat);
  buildStairFlight(-18, 0, -342, -276, ASTRAL.aqueductMidY, ASTRAL.aqueductDeckY, 42, 'z', nokronStoneMat, cliffRockMat);

  // Cross-Basin Sea-Aqueduct Deck connected seamlessly to West Harbor Docks (-180) and East Harbor Pier (+120)!
  buildPlatformSlab(-180, 120, -362, -342, ASTRAL.aqueductDeckY, 3.4, nokronStoneMat, 0);

  // Coastal Overlook Pointed-Arch Arcade flanking the Aqueduct Overlook
  const aqArcadePostGeo = track(new THREE.BoxGeometry(1.5, 7.6, 1.5));
  const aqArcadeCapGeo = track(new THREE.ConeGeometry(1.15, 2.2, 4));
  const aqArcadeArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(12.2, 4.2, 1.2), { depth: 1.5, bevelEnabled: false }),
  );
  aqArcadeArchGeo.translate(0, 0, -0.75);
  for (let ox = -120; ox <= -22; ox += 14) {
    const col = new THREE.Mesh(aqArcadePostGeo, nokronStoneMat);
    col.position.set(ox, ASTRAL.aqueductMidY + 3.8, -274.8);
    group.add(col);

    const cap = new THREE.Mesh(aqArcadeCapGeo, whiteMarbleMat);
    cap.rotation.y = Math.PI / 4;
    cap.position.set(ox, ASTRAL.aqueductMidY + 8.7, -274.8);
    group.add(cap);

    if (ox + 14 <= -22) {
      const arch = new THREE.Mesh(aqArcadeArchGeo, nokronStoneMat);
      arch.position.set(ox + 7, ASTRAL.aqueductMidY + 2.8, -274.8);
      group.add(arch);
    }
  }

  // Two-Tier Sea-Aqueduct Arches anchored into ocean seabed (y = -14 -> 26)
  const aqPierGeo = track(new THREE.BoxGeometry(5.6, 38, 18));
  const aqArchGeo = track(new THREE.ExtrudeGeometry(createArchShape(16, 11.5, 2.2), { depth: 18, bevelEnabled: false }));
  aqArchGeo.translate(0, 0, -9);

  const aqBayCount = 15;
  const aqPiers = new THREE.InstancedMesh(aqPierGeo, nokronStoneMat, aqBayCount);
  const aqLowerArches = new THREE.InstancedMesh(aqArchGeo, nokronStoneMat, aqBayCount - 1);
  const aqUpperArches = new THREE.InstancedMesh(aqArchGeo, nokronStoneMat, (aqBayCount - 1) * 2);

  for (let i = 0; i < aqBayCount; i++) {
    const ax = -180 + i * 22;
    dummy.position.set(ax, 5.0, -352);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    aqPiers.setMatrixAt(i, dummy.matrix);

    if (i < aqBayCount - 1) {
      dummy.position.set(ax + 11, 0, -352);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      aqLowerArches.setMatrixAt(i, dummy.matrix);

      for (let sub = 0; sub < 2; sub++) {
        dummy.position.set(ax + 5.5 + sub * 11, 13.0, -352);
        dummy.scale.set(0.5, 0.85, 0.85);
        dummy.updateMatrix();
        aqUpperArches.setMatrixAt(i * 2 + sub, dummy.matrix);
      }
    }
  }
  [aqPiers, aqLowerArches, aqUpperArches].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // =========================================================================
  // 9. CELESTIAL SEA SANCTUARY ISLAND (Symmetrical Harbor Pier Wings -> Abbey Summit)
  // =========================================================================
  buildPlatformSlab(-13, 13, -412, -342, ASTRAL.aqueductDeckY, 3.4, nokronStoneMat, 0);

  const cwBayGeo = track(createPointedArchBridgeBay(16.0, 4.0, 14.0, 3.4, 24.0));
  const cwPierGeo = track(new THREE.BoxGeometry(5.0, 28, 25.0));
  for (let b = 0; b < 3; b++) {
    const cz = -362 - b * 20;
    const cwBay = new THREE.Mesh(cwBayGeo, nokronStoneMat);
    cwBay.rotation.y = Math.PI / 2;
    cwBay.position.set(0, ASTRAL.aqueductDeckY - 17.4, cz);
    cwBay.receiveShadow = true;
    group.add(cwBay);
  }
  for (let p = 0; p < 4; p++) {
    const pz = -352 - p * 20;
    const cwPier = new THREE.Mesh(cwPierGeo, cliffDarkBasaltMat);
    cwPier.rotation.y = Math.PI / 2;
    cwPier.position.set(0, -3.5, pz);
    group.add(cwPier);
  }

  const cwParapetArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(4.8, 2.2, 0.55), { depth: 0.9, bevelEnabled: false }),
  );
  cwParapetArchGeo.translate(0, 0, -0.45);
  const instCwParapets = new THREE.InstancedMesh(cwParapetArchGeo, nokronStoneMat, 18);
  let cwpIdx = 0;
  for (let cz = -408; cz <= -360; cz += 6) {
    for (const side of [-1, 1]) {
      if (cwpIdx >= 18) break;
      dummy.position.set(side * 12.2, ASTRAL.aqueductDeckY, cz);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instCwParapets.setMatrixAt(cwpIdx++, dummy.matrix);
    }
  }
  instCwParapets.instanceMatrix.needsUpdate = true;
  instCwParapets.computeBoundingSphere();
  group.add(instCwParapets);

  // Tall Iron Lantern Posts along Causeway, Harbor Piers, Rear Plaza, Sky-Viaducts & Terraces
  const lanternPostPositions: Array<[number, number, number]> = [];
  for (let cz = -406; cz <= -362; cz += 14) {
    lanternPostPositions.push([-11.8, ASTRAL.aqueductDeckY, cz], [11.8, ASTRAL.aqueductDeckY, cz]);
  }
  for (let rz = 196; rz <= 284; rz += 28) {
    lanternPostPositions.push([-24, ASTRAL.rearPlazaY, rz], [24, ASTRAL.rearPlazaY, rz]);
  }
  lanternPostPositions.push(
    [-11.2, ASTRAL.shrineHarborY, -448],
    [11.2, ASTRAL.shrineHarborY, -448],
    [-58, ASTRAL.shrineHarborY, -456],
    [58, ASTRAL.shrineHarborY, -456],
    [-11.2, ASTRAL.shrineHarborY, -468],
    [11.2, ASTRAL.shrineHarborY, -468],
    [16.8, ASTRAL.shrineCloisterY, -534],
    [-16.8, ASTRAL.shrineCloisterY, -534],
    [-16.0, ASTRAL.shrineSummitY, -612],
    [16.0, ASTRAL.shrineSummitY, -612],
  );
  const lpShaftGeo = track(new THREE.CylinderGeometry(0.14, 0.22, 5.0, 6));
  const lpCapGeo = track(new THREE.ConeGeometry(0.56, 0.65, 6));
  const lpOrbGeo = track(new THREE.SphereGeometry(0.34, 8, 8));
  const instLpShafts = new THREE.InstancedMesh(lpShaftGeo, darkIronMat, lanternPostPositions.length);
  const instLpCaps = new THREE.InstancedMesh(lpCapGeo, darkIronMat, lanternPostPositions.length);
  const instLpOrbs = new THREE.InstancedMesh(lpOrbGeo, goldenWindowMat, lanternPostPositions.length);
  lanternPostPositions.forEach((lp, idx) => {
    dummy.position.set(lp[0], lp[1] + 2.5, lp[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instLpShafts.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(lp[0], lp[1] + 5.72, lp[2]);
    dummy.updateMatrix();
    instLpCaps.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(lp[0], lp[1] + 5.25, lp[2]);
    dummy.updateMatrix();
    instLpOrbs.setMatrixAt(idx, dummy.matrix);
  });
  [instLpShafts, instLpCaps, instLpOrbs].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // 9B. Harbor Gate Descent & SYMMETRICAL Tidal Harbor Pier Wings (x: -66..+66, y=18)
  buildStairFlight(-12, 12, -440, -412, ASTRAL.aqueductDeckY, ASTRAL.shrineHarborY, 24, 'z', nokronStoneMat, cliffRockMat);
  buildPlatformSlab(-66, 66, -478, -440, ASTRAL.shrineHarborY, 4.0, nokronStoneMat, 32, cliffDarkBasaltMat);

  // Symmetrical Arched Harbor Pier Pavilions at West (-56) & East (+56) Wings!
  for (const side of [-1, 1]) {
    const px = side * 56;
    const pierWingArch = new THREE.Mesh(
      track(new THREE.ExtrudeGeometry(createArchShape(12, 10, 2.2), { depth: 4.0, bevelEnabled: false })),
      nokronStoneMat,
    );
    pierWingArch.rotation.y = Math.PI / 2;
    pierWingArch.position.set(px, ASTRAL.shrineHarborY, -459);
    group.add(pierWingArch);

    const pierTower = new THREE.Mesh(track(new THREE.CylinderGeometry(3.2, 3.8, 22, 8)), nokronStoneMat);
    pierTower.position.set(side * 63, ASTRAL.shrineHarborY + 11, -459);
    group.add(pierTower);
    const pierCap = new THREE.Mesh(track(new THREE.ConeGeometry(3.8, 8.5, 8)), silverSlateMat);
    pierCap.position.set(side * 63, ASTRAL.shrineHarborY + 26.2, -459);
    group.add(pierCap);
  }

  // Curved Stepped Seawalls & Mossy Breakwaters wrapping the Tidal Harbor base
  for (let i = 0; i < 16; i++) {
    const ang = (i / 15) * Math.PI - Math.PI;
    const wx = Math.cos(ang) * 68;
    const wz = -458 + Math.sin(ang) * 32;
    if (Math.abs(wx) < 15 && wz > -448) continue;
    const seawall = new THREE.Mesh(track(new THREE.BoxGeometry(10.5, 22, 4.8)), cliffDarkBasaltMat);
    seawall.position.set(wx, 6.0, wz);
    seawall.rotation.y = -ang + Math.PI / 2;
    group.add(seawall);
  }
  for (const side of [-1, 1]) {
    const breakwater = new THREE.Mesh(track(new THREE.BoxGeometry(26, 6.5, 9.5)), nokronStoneMat);
    breakwater.position.set(side * 82, 2.2, -456);
    breakwater.rotation.y = side * 0.28;
    group.add(breakwater);
  }

  // Grand Tidal Harbor Gatehouse at z = -440 (12m wide x 13m tall open arch + twin octagonal towers)
  const harborGateArch = new THREE.Mesh(
    track(new THREE.ExtrudeGeometry(createArchShape(12.0, 13.0, 2.8), { depth: 4.5, bevelEnabled: false })),
    nokronStoneMat,
  );
  harborGateArch.position.set(0, ASTRAL.shrineHarborY, -440);
  group.add(harborGateArch);

  for (const side of [-1, 1]) {
    const hTower = new THREE.Mesh(track(new THREE.CylinderGeometry(3.2, 3.8, 32, 8)), nokronStoneMat);
    hTower.position.set(side * 13.5, ASTRAL.shrineHarborY + 12, -440);
    group.add(hTower);

    const hCap = new THREE.Mesh(track(new THREE.ConeGeometry(3.8, 10.5, 8)), silverSlateMat);
    hCap.position.set(side * 13.5, ASTRAL.shrineHarborY + 33.2, -440);
    group.add(hCap);
  }

  // Terraced Silver-Limestone Retaining Facade & Recessed Blind Arches behind Harbor Courtyard (x: -54..54, z: -480)
  // Using moon-silver nokronStoneMat + shadowStoneMat blind niches (no floating bright-cyan sky cutouts!)
  const harborRetainingWall = new THREE.Mesh(track(new THREE.BoxGeometry(108, 22, 4.5)), nokronStoneMat);
  harborRetainingWall.position.set(0, ASTRAL.shrineHarborY + 10.0, -481.5);
  group.add(harborRetainingWall);

  for (let bx = -42; bx <= 10; bx += 10.5) {
    const buttress = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 23, 3.2)), whiteMarbleMat);
    buttress.position.set(bx, ASTRAL.shrineHarborY + 10.5, -479.4);
    group.add(buttress);

    if (bx + 10.5 <= 10) {
      const alcoveArch = new THREE.Mesh(
        track(new THREE.ExtrudeGeometry(createArchShape(6.8, 11.5, 1.4), { depth: 2.2, bevelEnabled: false })),
        whiteMarbleMat,
      );
      alcoveArch.position.set(bx + 5.25, ASTRAL.shrineHarborY, -479.8);
      group.add(alcoveArch);

      const blindBacking = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 10.2, 0.8)), shadowStoneMat);
      blindBacking.position.set(bx + 5.25, ASTRAL.shrineHarborY + 5.1, -479.2);
      group.add(blindBacking);

      const sconceOrb = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.55, 1)), goldenWindowMat);
      sconceOrb.position.set(bx + 5.25, ASTRAL.shrineHarborY + 7.2, -478.2);
      group.add(sconceOrb);
    }
  }

  // Half-Submerged Ruined Sea Arches jutting around the Sea Sanctuary tidewater
  const seaRuinArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(9.5, 11.0, 2.0), { depth: 2.8, bevelEnabled: false }),
  );
  seaRuinArchGeo.translate(0, 0, -1.4);
  const ruinSpecs: Array<[number, number, number, number, number]> = [
    [-58, -1.5, -482, 0.35, 0.14],
    [62, -2.0, -490, -0.45, -0.12],
    [-76, -1.8, -535, 0.8, 0.18],
    [78, -2.2, -545, -0.75, -0.16],
    [-82, -2.5, -605, 1.1, 0.12],
    [84, -1.8, -618, -1.05, -0.15],
    [-64, -2.0, -668, 0.55, -0.1],
    [68, -2.4, -674, -0.6, 0.12],
  ];
  const instSeaRuins = new THREE.InstancedMesh(seaRuinArchGeo, nokronStoneMat, ruinSpecs.length);
  ruinSpecs.forEach((rs, idx) => {
    dummy.position.set(rs[0], rs[1], rs[2]);
    dummy.rotation.set(rs[4], rs[3], rs[4] * 0.6);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instSeaRuins.setMatrixAt(idx, dummy.matrix);
  });
  instSeaRuins.instanceMatrix.needsUpdate = true;
  instSeaRuins.computeBoundingSphere();
  group.add(instSeaRuins);

  // Warm-Gold & Cool-Cerulean Celestial Braziers along Harbor & Terraces
  const brazierCoords: Array<[number, number, number, boolean]> = [
    [-22, ASTRAL.shrineHarborY, -448, true],
    [22, ASTRAL.shrineHarborY, -448, false],
    [-22, ASTRAL.shrineHarborY, -470, false],
    [12, ASTRAL.shrineHarborY, -470, true],
    [-24, ASTRAL.shrineCloisterY, -532, true],
    [8, ASTRAL.shrineCloisterY, -532, false],
    [-12, ASTRAL.shrineSummitY, -614, true],
    [12, ASTRAL.shrineSummitY, -614, false],
  ];
  const brazierBowlGeo = track(new THREE.CylinderGeometry(1.15, 0.55, 1.2, 8));
  const brazierOrbGeo = track(new THREE.OctahedronGeometry(0.68, 1));
  brazierCoords.forEach((bc) => {
    const stand = new THREE.Mesh(brazierBowlGeo, darkIronMat);
    stand.position.set(bc[0], bc[1] + 0.6, bc[2]);
    group.add(stand);

    const flame = new THREE.Mesh(brazierOrbGeo, bc[3] ? goldenWindowMat : astralWindowMat);
    flame.position.set(bc[0], bc[1] + 1.55, bc[2]);
    group.add(flame);
  });

  // 9C. Winding Pilgrimage Stairway I -> Cloister Loggia Terrace -> Pilgrimage Stairway II -> Abbey Summit
  buildStairFlight(
    16,
    34,
    -526,
    -478,
    ASTRAL.shrineHarborY,
    ASTRAL.shrineCloisterY,
    36,
    'z',
    whiteMarbleMat,
    cliffDarkBasaltMat,
  );
  buildPlatformSlab(-36, 36, -556, -526, ASTRAL.shrineCloisterY, 4.0, nokronStoneMat, 46, cliffDarkBasaltMat);

  // Arched Cloister Loggia Colonnade along North edge of Cloister Terrace (z = -554.5, clear 8.5m arches!)
  const loggiaPierGeo = track(new THREE.BoxGeometry(1.6, 8.8, 1.6));
  const loggiaArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(8.4, 4.2, 1.1), { depth: 1.6, bevelEnabled: false }),
  );
  loggiaArchGeo.translate(0, 0, -0.8);
  for (let lx = -30; lx <= 30; lx += 10) {
    const pier = new THREE.Mesh(loggiaPierGeo, whiteMarbleMat);
    pier.position.set(lx, ASTRAL.shrineCloisterY + 4.4, -554.2);
    group.add(pier);

    if (lx + 10 <= 30) {
      const arch = new THREE.Mesh(loggiaArchGeo, whiteMarbleMat);
      arch.position.set(lx + 5, ASTRAL.shrineCloisterY + 4.4, -554.2);
      group.add(arch);
    }
  }
  const loggiaCornice = new THREE.Mesh(track(new THREE.BoxGeometry(72, 2.0, 3.0)), nokronStoneMat);
  loggiaCornice.position.set(0, ASTRAL.shrineCloisterY + 9.8, -554.5);
  group.add(loggiaCornice);

  // Winding Pilgrimage Stairway II (West Switchback: x: -34..-16, z: -604..-556, y: 38 -> 58)
  buildStairFlight(
    -34,
    -16,
    -604,
    -556,
    ASTRAL.shrineCloisterY,
    ASTRAL.shrineSummitY,
    36,
    'z',
    whiteMarbleMat,
    cliffDarkBasaltMat,
  );

  // Crowning Abbey Forecourt Terrace (x: -38..38, z: -652..-604, y: 58)
  buildPlatformSlab(-38, 38, -652, -604, ASTRAL.shrineSummitY, 4.5, whiteMarbleMat, 62, cliffDarkBasaltMat);

  // Pierced Gothic Balustrades lining Sea-Shrine Harbor, Stairways, Cloister & Forecourt (with open landings!)
  const shrineBalCoords: Array<[number, number, number]> = [];
  for (let z = -476; z <= -442; z += 5) {
    shrineBalCoords.push([-65.2, ASTRAL.shrineHarborY, z], [65.2, ASTRAL.shrineHarborY, z]);
  }
  for (let z = -522; z <= -480; z += 5) {
    const t = (-478 - z) / 48;
    const sy = THREE.MathUtils.lerp(ASTRAL.shrineHarborY, ASTRAL.shrineCloisterY, t);
    shrineBalCoords.push([16.5, sy, z], [33.5, sy, z]);
  }
  for (let z = -552; z <= -528; z += 5) {
    shrineBalCoords.push([-35.2, ASTRAL.shrineCloisterY, z], [35.2, ASTRAL.shrineCloisterY, z]);
  }
  for (let z = -600; z <= -558; z += 5) {
    const t = (-556 - z) / 48;
    const sy = THREE.MathUtils.lerp(ASTRAL.shrineCloisterY, ASTRAL.shrineSummitY, t);
    shrineBalCoords.push([-33.5, sy, z], [-16.5, sy, z]);
  }
  for (let z = -648; z <= -608; z += 5) {
    shrineBalCoords.push([-37.2, ASTRAL.shrineSummitY, z], [37.2, ASTRAL.shrineSummitY, z]);
  }
  const instShrineBalPosts = new THREE.InstancedMesh(balPostGeo, whiteMarbleMat, shrineBalCoords.length);
  const instShrineBalRails = new THREE.InstancedMesh(balRailGeo, whiteMarbleMat, shrineBalCoords.length);
  shrineBalCoords.forEach((bc, idx) => {
    dummy.position.set(bc[0], bc[1] + 0.68, bc[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instShrineBalPosts.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(bc[0], bc[1] + 1.38, bc[2]);
    dummy.updateMatrix();
    instShrineBalRails.setMatrixAt(idx, dummy.matrix);
  });
  [instShrineBalPosts, instShrineBalRails].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // 9D. CROWNING CELESTIAL ABBEY & RELIQUARY (Exterior Only — NO Interiors!) at (0, 58, -682)
  const abbeyGroup = new THREE.Group();
  abbeyGroup.position.set(0, ASTRAL.shrineSummitY, -682);
  group.add(abbeyGroup);

  // Deep Basilica Bedrock Foundation Plinth
  const abbeyPlinth = new THREE.Mesh(track(new THREE.BoxGeometry(66, 66, 62)), cliffDarkBasaltMat);
  abbeyPlinth.position.set(0, -33, 0);
  abbeyGroup.add(abbeyPlinth);

  // Main White-Limestone Gothic Cathedral Nave & Transept Exterior Mass
  const abbeyNave = new THREE.Mesh(track(new THREE.BoxGeometry(42, 38, 56)), whiteStoneMat);
  abbeyNave.position.set(0, 19, 0);
  abbeyNave.castShadow = true;
  abbeyNave.receiveShadow = true;
  abbeyGroup.add(abbeyNave);

  const abbeyTransept = new THREE.Mesh(track(new THREE.BoxGeometry(62, 32, 26)), whiteStoneMat);
  abbeyTransept.position.set(0, 16, -4);
  abbeyGroup.add(abbeyTransept);

  // Steep Silver-Slate Pitched Nave Roof
  const abbeyNaveRoof = new THREE.Mesh(track(createPitchedRoofGeo(43, 15, 57)), silverSlateMat);
  abbeyNaveRoof.position.set(0, 38, 0);
  abbeyGroup.add(abbeyNaveRoof);

  // Grand South Facade Pointed Portal (at world z = -652, sealed behind collider at z = -650.5)
  const abbeyPortalArch = new THREE.Mesh(
    track(new THREE.ExtrudeGeometry(createArchShape(12, 18, 2.8), { depth: 4.5, bevelEnabled: false })),
    whiteMarbleMat,
  );
  abbeyPortalArch.position.set(0, 0, 29.5);
  abbeyGroup.add(abbeyPortalArch);

  const abbeyPortalDoor = new THREE.Mesh(track(new THREE.BoxGeometry(10.5, 16.5, 1.4)), darkIronMat);
  abbeyPortalDoor.position.set(0, 8.2, 29.8);
  abbeyGroup.add(abbeyPortalDoor);

  // Facade Entrance Piers (world x = ±14, z = -644 matching ASTRAL_COLLIDERS)
  for (const side of [-1, 1]) {
    const fPier = new THREE.Mesh(track(new THREE.CylinderGeometry(1.7, 2.1, 15, 8)), whiteMarbleMat);
    fPier.position.set(side * 14, 7.5, 38);
    abbeyGroup.add(fPier);

    const fCap = new THREE.Mesh(track(new THREE.ConeGeometry(2.1, 4.2, 8)), royalGoldMat);
    fCap.position.set(side * 14, 17.1, 38);
    abbeyGroup.add(fCap);
  }

  // Intricate Circular Rose Window glowing warm gold above South Portal
  const abbeyRose = new THREE.Mesh(track(new THREE.CircleGeometry(6.0, 24)), goldenWindowMat);
  abbeyRose.position.set(0, 29, 28.4);
  abbeyGroup.add(abbeyRose);

  const abbeyRoseOuter = new THREE.Mesh(track(new THREE.TorusGeometry(6.1, 0.52, 8, 24)), whiteMarbleMat);
  abbeyRoseOuter.position.set(0, 29, 28.6);
  abbeyGroup.add(abbeyRoseOuter);

  const abbeyRoseInner = new THREE.Mesh(track(new THREE.TorusGeometry(3.0, 0.32, 6, 18)), whiteMarbleMat);
  abbeyRoseInner.position.set(0, 29, 28.65);
  abbeyGroup.add(abbeyRoseInner);

  for (let m = 0; m < 6; m++) {
    const spoke = new THREE.Mesh(track(new THREE.BoxGeometry(0.36, 12.0, 0.45)), whiteMarbleMat);
    spoke.position.set(0, 29, 28.62);
    spoke.rotation.z = (m / 6) * Math.PI;
    abbeyGroup.add(spoke);
  }

  // Pointed Flying Buttresses & Pinnacles along East & West Abbey Flanks
  for (const side of [-1, 1]) {
    for (let bz = -20; bz <= 16; bz += 18) {
      const outerPier = new THREE.Mesh(track(new THREE.BoxGeometry(3.8, 30, 3.8)), whiteMarbleMat);
      outerPier.position.set(side * 28, 15, bz);
      abbeyGroup.add(outerPier);

      const pinnacle = new THREE.Mesh(track(new THREE.ConeGeometry(2.2, 9.5, 4)), silverSlateMat);
      pinnacle.rotation.y = Math.PI / 4;
      pinnacle.position.set(side * 28, 34.7, bz);
      abbeyGroup.add(pinnacle);

      const flyer = new THREE.Mesh(track(new THREE.BoxGeometry(9.5, 2.2, 2.2)), whiteMarbleMat);
      flyer.position.set(side * 24, 27.5, bz);
      flyer.rotation.z = -side * 0.42;
      abbeyGroup.add(flyer);
    }
  }

  // Twin Flanking Octagonal Bell Spires framing the Forecourt
  for (const side of [-1, 1]) {
    const towerBase = new THREE.Mesh(track(new THREE.BoxGeometry(11.5, 52, 11.5)), whiteStoneMat);
    towerBase.position.set(side * 22, 26, 22);
    abbeyGroup.add(towerBase);

    const belfry = new THREE.Mesh(track(new THREE.CylinderGeometry(5.0, 5.8, 14, 8)), whiteMarbleMat);
    belfry.position.set(side * 22, 58, 22);
    abbeyGroup.add(belfry);

    const spire = new THREE.Mesh(track(new THREE.ConeGeometry(5.6, 22, 8)), silverSlateMat);
    spire.position.set(side * 22, 76, 22);
    abbeyGroup.add(spire);

    const finial = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.25, 6, 6)), royalGoldMat);
    finial.position.set(side * 22, 89, 22);
    abbeyGroup.add(finial);
  }

  // Central Octagonal Drum & Silver-Slate Ribbed Dome pierced by Warm-Gold Lancet Windows
  const abbeyDrum = new THREE.Mesh(track(new THREE.CylinderGeometry(16.8, 18.2, 20, 8)), whiteMarbleMat);
  abbeyDrum.position.set(0, 52, -2);
  abbeyGroup.add(abbeyDrum);

  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const lancet = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 11.5, 1.2)), goldenWindowMat);
    lancet.position.set(Math.sin(ang) * 17.2, 52, -2 + Math.cos(ang) * 17.2);
    lancet.rotation.y = ang;
    abbeyGroup.add(lancet);
  }

  const abbeyDome = new THREE.Mesh(
    track(new THREE.SphereGeometry(16.6, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52)),
    silverSlateMat,
  );
  abbeyDome.position.set(0, 62, -2);
  abbeyGroup.add(abbeyDome);

  for (let r = 0; r < 4; r++) {
    const rib = new THREE.Mesh(track(new THREE.TorusGeometry(16.85, 0.55, 6, 24, Math.PI)), whiteMarbleMat);
    rib.position.set(0, 62, -2);
    rib.rotation.y = (r / 4) * Math.PI;
    abbeyGroup.add(rib);
  }

  const abbeyLanternCupola = new THREE.Mesh(track(new THREE.CylinderGeometry(3.2, 3.6, 7.5, 8)), whiteMarbleMat);
  abbeyLanternCupola.position.set(0, 80, -2);
  abbeyGroup.add(abbeyLanternCupola);

  const abbeyReliquarySpire = new THREE.Mesh(track(new THREE.ConeGeometry(3.6, 15, 8)), royalGoldMat);
  abbeyReliquarySpire.position.set(0, 91, -2);
  abbeyGroup.add(abbeyReliquarySpire);

  // Gnarled Pale Roots coiling organically over the Sea Sanctuary upper terraces & cliffs
  const rootPaths: Array<THREE.Vector3[]> = [
    [
      new THREE.Vector3(-44, ASTRAL.shrineCloisterY - 12, -538),
      new THREE.Vector3(-39, ASTRAL.shrineCloisterY + 1.2, -542),
      new THREE.Vector3(-35, ASTRAL.shrineCloisterY + 0.8, -552),
      new THREE.Vector3(-38, ASTRAL.shrineSummitY - 6, -578),
    ],
    [
      new THREE.Vector3(44, ASTRAL.shrineCloisterY - 14, -535),
      new THREE.Vector3(38, ASTRAL.shrineCloisterY + 1.5, -540),
      new THREE.Vector3(34, ASTRAL.shrineCloisterY + 0.7, -551),
      new THREE.Vector3(36, ASTRAL.shrineCloisterY + 6.5, -560),
    ],
    [
      new THREE.Vector3(-42, ASTRAL.shrineSummitY - 12, -622),
      new THREE.Vector3(-38, ASTRAL.shrineSummitY + 1.4, -630),
      new THREE.Vector3(-33, ASTRAL.shrineSummitY + 0.9, -646),
      new THREE.Vector3(-28, ASTRAL.shrineSummitY + 11.0, -664),
    ],
    [
      new THREE.Vector3(42, ASTRAL.shrineSummitY - 12, -620),
      new THREE.Vector3(38, ASTRAL.shrineSummitY + 1.4, -632),
      new THREE.Vector3(33, ASTRAL.shrineSummitY + 0.9, -648),
      new THREE.Vector3(28, ASTRAL.shrineSummitY + 11.0, -666),
    ],
  ];
  for (const pts of rootPaths) {
    const curve = new THREE.CatmullRomCurve3(pts);
    const rootGeo = track(new THREE.TubeGeometry(curve, 22, 0.72, 7, false));
    const rootMesh = new THREE.Mesh(rootGeo, paleBarkMat);
    group.add(rootMesh);
  }

  // =========================================================================
  // 10. SITES OF GRACE, ACCENT LIGHTS & DRIFTING AUTUMN LEAVES / STARDUST
  // =========================================================================
  const graceWisps: THREE.Group[] = [];
  for (const g of ASTRAL_GRACE_SITES) {
    const gg = new THREE.Group();
    gg.position.set(g.x, g.y, g.z);

    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.65, 0.09, 6, 16)), whiteMarbleMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    gg.add(ring);

    const ember = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.24, 0)), graceCoreMat);
    ember.position.y = 0.72;
    gg.add(ember);

    const wisp = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.24, 2.2, 8, 1, true)), graceWispMat);
    wisp.position.y = 1.25;
    gg.add(wisp);

    group.add(gg);
    graceWisps.push(gg);
  }

  const balconyGlow = new THREE.PointLight(0xffbe66, 22, 95, 1.2);
  balconyGlow.position.set(0, ASTRAL.balconyY + 10, 108);
  group.add(balconyGlow);

  const plazaGlow = new THREE.PointLight(0xffb858, 28, 130, 1.2);
  plazaGlow.position.set(0, ASTRAL.cityPlazaY + 16, -42);
  group.add(plazaGlow);

  const citadelGlow = new THREE.PointLight(0xffc06a, 28, 135, 1.2);
  citadelGlow.position.set(0, ASTRAL.citadelTerraceY + 16, -155);
  group.add(citadelGlow);

  const fortressGlow = new THREE.PointLight(0x88e0c0, 24, 125, 1.2);
  fortressGlow.position.set(192, ASTRAL.fortressCourtyardY + 14, -155);
  group.add(fortressGlow);

  const shrineHarborGlow = new THREE.PointLight(0xffbd68, 28, 130, 1.2);
  shrineHarborGlow.position.set(0, ASTRAL.shrineHarborY + 14, -454);
  group.add(shrineHarborGlow);

  const shrineAbbeyGlow = new THREE.PointLight(0x9cb8ff, 30, 145, 1.2);
  shrineAbbeyGlow.position.set(0, ASTRAL.shrineSummitY + 22, -636);
  group.add(shrineAbbeyGlow);

  const leafCount = 260;
  const leafPos = new Float32Array(leafCount * 3);
  const leafPhase = new Float32Array(leafCount);
  for (let i = 0; i < leafCount; i++) {
    leafPos[i * 3] = (Math.random() - 0.5) * 180;
    leafPos[i * 3 + 1] = 78 + Math.random() * 88;
    leafPos[i * 3 + 2] = 128 - Math.random() * 300;
    leafPhase[i] = Math.random() * Math.PI * 2;
  }
  const leafGeo = track(new THREE.BufferGeometry());
  leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
  const leafMat = track(
    new THREE.PointsMaterial({
      size: 0.65,
      map: leafSprite,
      color: 0xffc45e,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  group.add(new THREE.Points(leafGeo, leafMat));

  // =========================================================================
  // 11. DISTANT ARCHIPELAGO & HORIZON SKYLINE CITADELS (780m..2100m OUT!)
  // =========================================================================
  const horizonSilhouetteMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x191a36,
      roughness: 0.94,
      metalness: 0.08,
      flatShading: true,
    }),
  );
  const horizonTowerMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x24264a,
      roughness: 0.85,
      metalness: 0.16,
    }),
  );

  const horizonClusters: Array<{ x: number; z: number; scale: number; yaw: number }> = [
    { x: -1020, z: -860, scale: 1.35, yaw: 0.42 },
    { x: 1080, z: -920, scale: 1.45, yaw: -0.55 },
    { x: -1240, z: 120, scale: 1.3, yaw: 1.2 },
    { x: 1220, z: 180, scale: 1.28, yaw: -1.1 },
    { x: -680, z: 980, scale: 1.25, yaw: 2.3 },
    { x: 740, z: 1040, scale: 1.32, yaw: -2.2 },
    { x: 60, z: -1450, scale: 1.6, yaw: 0.15 },
  ];

  const hRockGeo = track(createAngularBasaltGeo(11.3, 1.2));
  const hRuinedSpanGeo = track(createPointedArchBridgeBay(36, 8, 38, 6, 16));
  for (const hc of horizonClusters) {
    const hg = new THREE.Group();
    hg.position.set(hc.x, 0, hc.z);
    hg.rotation.y = hc.yaw;
    hg.scale.setScalar(hc.scale);

    const baseCrag = new THREE.Mesh(hRockGeo, horizonSilhouetteMat);
    baseCrag.position.set(0, 38, 0);
    baseCrag.scale.set(110, 76, 85);
    hg.add(baseCrag);

    const citadelBody = new THREE.Mesh(track(new THREE.BoxGeometry(82, 95, 58)), horizonTowerMat);
    citadelBody.position.set(0, 95, 0);
    hg.add(citadelBody);

    const mainSpire = new THREE.Mesh(track(new THREE.ConeGeometry(22, 85, 6)), horizonTowerMat);
    mainSpire.position.set(0, 185, 0);
    hg.add(mainSpire);

    for (const side of [-1, 1]) {
      const flankTower = new THREE.Mesh(track(new THREE.BoxGeometry(22, 130, 22)), horizonTowerMat);
      flankTower.position.set(side * 58, 92, 12);
      hg.add(flankTower);

      const flankSpire = new THREE.Mesh(track(new THREE.ConeGeometry(13, 48, 6)), horizonTowerMat);
      flankSpire.position.set(side * 58, 180, 12);
      hg.add(flankSpire);

      // Ruined multi-arched aqueduct span extending into the sea mist
      const ruinedArch = new THREE.Mesh(hRuinedSpanGeo, horizonTowerMat);
      ruinedArch.position.set(side * 102, 42, 0);
      hg.add(ruinedArch);

      // Subtle distant warm-gold beacon pinpoint windows
      const beacon = new THREE.Mesh(track(new THREE.BoxGeometry(3.8, 9.0, 2.2)), goldenWindowMat);
      beacon.position.set(side * 22, 118, 29.5);
      hg.add(beacon);
    }

    const mistRing = new THREE.Mesh(track(new THREE.PlaneGeometry(340, 340)), mistMat);
    mistRing.rotation.x = -Math.PI / 2;
    mistRing.position.set(0, 4.5, 0);
    hg.add(mistRing);

    group.add(hg);
  }

  const starDustCount = 540;
  const starDustPos = new Float32Array(starDustCount * 3);
  const starDustPhase = new Float32Array(starDustCount);
  for (let i = 0; i < starDustCount; i++) {
    starDustPos[i * 3] = (Math.random() - 0.5) * 380;
    starDustPos[i * 3 + 1] = 12 + Math.random() * 170;
    starDustPos[i * 3 + 2] = 140 - Math.random() * 820;
    starDustPhase[i] = Math.random() * Math.PI * 2;
  }
  const starDustGeo = track(new THREE.BufferGeometry());
  starDustGeo.setAttribute('position', new THREE.BufferAttribute(starDustPos, 3));
  const starDustMat = track(
    new THREE.PointsMaterial({
      size: 0.85,
      map: textures.glowSprite,
      color: 0xbcd0ff,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  group.add(new THREE.Points(starDustGeo, starDustMat));

  const update = (elapsed: number, dt: number, playerX: number, _playerY: number, playerZ: number) => {
    skyDome.position.set(playerX, 0, playerZ);
    skyMat.uniforms.uTime.value = elapsed;
    oceanMat.uniforms.uTime.value = elapsed;
    portalVeilMat.uniforms.uTime.value = elapsed;

    for (let i = 0; i < mistMeshes.length; i++) {
      const mm = mistMeshes[i];
      mm.mesh.position.x = mm.baseX + Math.sin(elapsed * 0.22 + mm.phase) * 4.5;
      mm.mesh.position.z = mm.baseZ + Math.cos(elapsed * 0.18 + mm.phase) * 3.5;
    }

    for (let i = 0; i < graceWisps.length; i++) {
      const gg = graceWisps[i];
      const ember = gg.children[1];
      const wisp = gg.children[2];
      if (ember) {
        ember.rotation.y = elapsed * 1.4 + i;
        ember.position.y = 0.72 + Math.sin(elapsed * 2.4 + i) * 0.08;
      }
      if (wisp) {
        wisp.rotation.y = -elapsed * 0.9 + i;
        const pulse = 0.92 + Math.sin(elapsed * 3.0 + i) * 0.1;
        wisp.scale.set(pulse, 1.0 + Math.cos(elapsed * 2.2 + i) * 0.08, pulse);
      }
    }

    const lAttr = leafGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < leafCount; i++) {
      const p = leafPhase[i];
      let y = lAttr.getY(i) - (1.1 + (i % 3) * 0.35) * dt;
      let x = lAttr.getX(i) + Math.sin(elapsed * 0.9 + p) * 0.8 * dt;
      if (y < 72) {
        y = 166;
        x = (Math.random() - 0.5) * 180;
      }
      lAttr.setXY(i, x, y);
    }
    lAttr.needsUpdate = true;

    const sAttr = starDustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < starDustCount; i++) {
      const p = starDustPhase[i];
      const sx = sAttr.getX(i) + Math.sin(elapsed * 0.35 + p) * 0.25 * dt;
      const sy = sAttr.getY(i) + Math.cos(elapsed * 0.4 + p * 1.4) * 0.18 * dt;
      sAttr.setXY(i, sx, sy);
    }
    sAttr.needsUpdate = true;
  };

  return {
    group,
    walkableMeshes,
    skyDome,
    update,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}
