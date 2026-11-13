import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WorldTextureBundle } from './textures';
import { ASTRAL, ASTRAL_GRACE_SITES } from './astralCapitalMath';

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

function createTaperedTubeGeo(
  points: THREE.Vector3[],
  tubularSegments: number,
  radialSegments: number,
  radiusStart: number,
  radiusEnd: number,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    curve.getPointAt(u, P);
    const normal = frames.normals[i];
    const binormal = frames.binormals[i];
    // Smooth organic taper with slight mid-swell or clean linear-ease taper
    const r = THREE.MathUtils.lerp(radiusStart, radiusEnd, Math.pow(u, 0.85));

    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(theta);
      const cos = -Math.cos(theta);
      N.x = cos * normal.x + sin * binormal.x;
      N.y = cos * normal.y + sin * binormal.y;
      N.z = cos * normal.z + sin * binormal.z;
      N.normalize();

      v.x = P.x + r * N.x;
      v.y = P.y + r * N.y;
      v.z = P.z + r * N.z;

      positions.push(v.x, v.y, v.z);
      normals.push(N.x, N.y, N.z);
      uvs.push(j / radialSegments, u * 4);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = (radialSegments + 1) * i + j;
      const b = (radialSegments + 1) * (i + 1) + j;
      const c = (radialSegments + 1) * (i + 1) + (j + 1);
      const d = (radialSegments + 1) * i + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function createIvoryLimestoneTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#d4c8b3';
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
      const v = 216 + Math.floor((rand() - 0.5) * 24);
      ctx.fillStyle = `rgb(${v},${v - 8},${v - 22})`;
      ctx.fillRect(bx + gap, by + gap, cw - gap * 2, rh - gap * 2);

      ctx.fillStyle = 'rgba(255,250,238,0.28)';
      ctx.fillRect(bx + gap, by + gap, cw - gap * 2, 3);
      ctx.fillStyle = 'rgba(110,94,70,0.20)';
      ctx.fillRect(bx + gap, by + rh - gap - 3, cw - gap * 2, 3);
    }
  }

  for (let i = 0; i < 2200; i++) {
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

  // =========================================================================
  // SHARED PBR MATERIALS (White Limestone, Burnished Gold, Nokron Silver-Slate)
  // =========================================================================
  const whiteStoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: ivoryTex,
      bumpMap: textures.flagstone.bumpMap,
      bumpScale: 0.04,
      roughness: 0.72,
      metalness: 0.06,
    }),
  );

  const whiteMarbleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf4ede0,
      map: ivoryTex,
      roughness: 0.44,
      metalness: 0.14,
    }),
  );

  const shadowStoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b3848,
      map: textures.flagstone.map,
      roughness: 0.85,
      metalness: 0.1,
    }),
  );

  const royalGoldMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffd578,
      map: textures.gildedRoof.map,
      bumpMap: textures.gildedRoof.bumpMap,
      bumpScale: 0.04,
      roughnessMap: textures.gildedRoof.roughnessMap,
      roughness: 0.28,
      metalness: 0.8,
    }),
  );

  const nokronStoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x8e99bc,
      map: textures.mossyStone.map,
      bumpMap: textures.mossyStone.bumpMap,
      bumpScale: 0.06,
      roughness: 0.76,
      metalness: 0.12,
    }),
  );

  const dragonStoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x76706b,
      map: textures.cliffRock.map,
      bumpMap: textures.cliffRock.bumpMap,
      bumpScale: 0.16,
      roughness: 0.9,
      metalness: 0.06,
      envMapIntensity: 0.25,
    }),
  );

  const paleRootMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd8c8ae,
      map: textures.bark.map,
      bumpMap: textures.bark.bumpMap,
      bumpScale: 0.12,
      roughness: 0.86,
      metalness: 0.04,
      envMapIntensity: 0.2,
    }),
  );

  const amberFoliageMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.mossyStone.map,
      bumpMap: textures.mossyStone.bumpMap,
      bumpScale: 0.08,
      roughness: 0.84,
      metalness: 0.02,
      envMapIntensity: 0.15,
    }),
  );

  const goldenWindowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffcf70,
      emissive: new THREE.Color(0xf0a030),
      emissiveIntensity: 1.65,
      roughness: 0.25,
      metalness: 0.1,
    }),
  );

  const astralWindowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xb7d0ff,
      emissive: new THREE.Color(0x6e98ff),
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.1,
    }),
  );

  const graceCoreMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0.9,
    }),
  );

  const graceWispMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xffc85a,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  // =========================================================================
  // 1. NOKRON GALAXY SKY DOME (r = 1650m) & ROSE-GOLD NEBULA SHADER
  // =========================================================================
  const skyGeo = track(new THREE.SphereGeometry(1650, 40, 28));
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
          vec3 horizon = vec3(0.13, 0.12, 0.27);
          vec3 mid = vec3(0.06, 0.08, 0.21);
          vec3 zenith = vec3(0.02, 0.025, 0.09);

          vec3 col = mix(abyss, horizon, smoothstep(-0.22, 0.05, up));
          col = mix(col, mid, smoothstep(0.04, 0.35, up));
          col = mix(col, zenith, smoothstep(0.32, 0.9, up));

          // Milky Way diagonal nebula band
          float bandCoord = dir.y * 0.85 - dir.x * 0.42 + dir.z * 0.18;
          float band = exp(-bandCoord * bandCoord * 7.5);
          float n = fbm(dir * 4.2);
          float n2 = fbm(dir * 9.5 + vec3(2.4));

          // Luminous rose-gold & cerulean nebula clouds focused toward northern horizon
          float northFocus = smoothstep(-0.3, 0.85, -dir.z) * smoothstep(0.55, -0.05, abs(dir.y - 0.12));
          vec3 cerulean = vec3(0.22, 0.36, 0.76);
          vec3 violet = vec3(0.42, 0.25, 0.65);
          vec3 roseGold = vec3(0.92, 0.56, 0.48);
          vec3 warmCore = vec3(1.0, 0.84, 0.70);

          col += mix(cerulean, violet, n2) * band * (0.35 + n * 0.52);
          col += roseGold * northFocus * smoothstep(0.34, 0.78, n) * 0.60;
          col += warmCore * northFocus * smoothstep(0.54, 0.86, n2) * 0.40;

          // Multi-scale crisp twinkling starfield
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

  // =========================================================================
  // HELPERS FOR STEPPED WALKABLE DECKS & STAIRS
  // =========================================================================
  const dummy = new THREE.Object3D();

  const buildPlatformSlab = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    y: number,
    thickness: number,
    mat: THREE.Material = whiteStoneMat,
    underSupportH = 0,
  ) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const slab = addWalkable(
      new THREE.Mesh(track(new THREE.BoxGeometry(w, thickness, d)), mat),
    );
    slab.position.set(cx, y - thickness * 0.5, cz);
    slab.receiveShadow = true;
    slab.castShadow = true;
    group.add(slab);

    if (underSupportH > 0) {
      const sub = new THREE.Mesh(
        track(new THREE.BoxGeometry(w - 2.4, underSupportH, d - 2.4)),
        nokronStoneMat,
      );
      sub.position.set(cx, y - thickness - underSupportH * 0.5, cz);
      sub.receiveShadow = true;
      group.add(sub);
    }
  };

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
  ) => {
    const w = axis === 'z' ? maxX - minX : (maxX - minX) / steps + 0.3;
    const d = axis === 'z' ? (maxZ - minZ) / steps + 0.3 : maxZ - minZ;
    const stepH = Math.abs(yAtMaxZ - yAtMinZ) / steps + 0.4;
    const geo = track(new THREE.BoxGeometry(w, stepH, d));
    const mesh = addWalkable(new THREE.InstancedMesh(geo, mat, steps));
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const sx = axis === 'z' ? (minX + maxX) * 0.5 : THREE.MathUtils.lerp(maxX, minX, t);
      const sz = axis === 'z' ? THREE.MathUtils.lerp(maxZ, minZ, t) : (minZ + maxZ) * 0.5;
      const sy = THREE.MathUtils.lerp(yAtMaxZ, yAtMinZ, t) - stepH * 0.5;
      dummy.position.set(sx, sy, sz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    group.add(mesh);

    const spanLen = axis === 'z' ? maxZ - minZ : maxX - minX;
    const rise = yAtMaxZ - yAtMinZ;
    const rampLen = Math.hypot(spanLen, rise);
    const angle = Math.atan2(rise, spanLen);
    const wedge = new THREE.Mesh(
      track(
        new THREE.BoxGeometry(
          axis === 'z' ? maxX - minX - 0.8 : rampLen,
          6.0,
          axis === 'z' ? rampLen : maxZ - minZ - 0.8,
        ),
      ),
      whiteStoneMat,
    );
    wedge.position.set(
      (minX + maxX) * 0.5,
      (yAtMaxZ + yAtMinZ) * 0.5 - 3.35,
      (minZ + maxZ) * 0.5,
    );
    if (axis === 'z') wedge.rotation.x = angle;
    else wedge.rotation.z = -angle;
    wedge.receiveShadow = true;
    group.add(wedge);
  };

  // =========================================================================
  // 2. UPPER TIER — GRAND ARRIVAL BALCONY, CELESTIAL RETURN GATE & CAUSEWAY
  // =========================================================================
  buildPlatformSlab(-18, 18, 92, 134, ASTRAL.balconyY, 4.0, whiteMarbleMat, 56);
  buildStairFlight(-9.5, 9.5, 56, 92, ASTRAL.balconyY, ASTRAL.midOverlookY, 36, 'z', whiteMarbleMat);
  buildPlatformSlab(-16, 16, 24, 56, ASTRAL.midOverlookY, 4.0, whiteMarbleMat, 54);
  buildStairFlight(-11, 11, -14, 24, ASTRAL.midOverlookY, ASTRAL.sanctuaryPlazaY, 38, 'z', whiteMarbleMat);
  buildPlatformSlab(-32, 32, -64, -14, ASTRAL.sanctuaryPlazaY, 5.0, whiteStoneMat, 62);
  buildStairFlight(-56, -32, -50, -30, ASTRAL.sanctuaryPlazaY, ASTRAL.sanctuarySidePorchY, 26, 'x', whiteStoneMat);
  buildPlatformSlab(-72, -56, -54, -26, ASTRAL.sanctuarySidePorchY, 5.0, whiteStoneMat, 66);

  // Side Romanesque Colonnade Arcades along Grand Arrival Balcony & Mid Overlook (framing foreground!)
  const colArcadePierGeo = track(new THREE.BoxGeometry(1.6, 8.2, 1.6));
  const colArcadeArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(3.2, 5.4, 0.9), { depth: 1.5, bevelEnabled: false }),
  );
  colArcadeArchGeo.translate(0, 0, -0.75);
  colArcadeArchGeo.rotateY(Math.PI / 2);

  const arcadePosts: Array<[number, number, number]> = [];
  for (let z = 96; z <= 126; z += 5) {
    arcadePosts.push([-16.4, ASTRAL.balconyY, z], [16.4, ASTRAL.balconyY, z]);
  }
  for (let z = 28; z <= 52; z += 5) {
    arcadePosts.push([-14.6, ASTRAL.midOverlookY, z], [14.6, ASTRAL.midOverlookY, z]);
  }
  const instArcadePiers = new THREE.InstancedMesh(colArcadePierGeo, whiteMarbleMat, arcadePosts.length);
  const instArcadeArches = new THREE.InstancedMesh(colArcadeArchGeo, whiteMarbleMat, arcadePosts.length);
  arcadePosts.forEach((p, idx) => {
    dummy.position.set(p[0], p[1] + 4.1, p[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instArcadePiers.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(p[0], p[1] + 2.4, p[2] - 2.5);
    dummy.updateMatrix();
    instArcadeArches.setMatrixAt(idx, dummy.matrix);
  });
  [instArcadePiers, instArcadeArches].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // Ornate Celestial Return Gate directly behind spawn (x=0, y=152, z=130)
  const returnGateGroup = new THREE.Group();
  returnGateGroup.position.set(0, ASTRAL.balconyY, 130);
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
  const returnArch = new THREE.Mesh(returnArchGeo, whiteMarbleMat);
  returnArch.castShadow = true;
  returnGateGroup.add(returnArch);

  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 15.5, 2.8)), whiteMarbleMat);
    pillar.position.set(side * 4.8, 7.75, 0);
    pillar.castShadow = true;
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
      uniforms: {
        uTime: { value: 0 },
      },
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

  // Pierced Stone Balustrades along Upper Causeway & Balcony (InstancedMesh)
  const balusterPostGeo = track(new THREE.BoxGeometry(0.55, 1.35, 0.55));
  const balusterRailGeo = track(new THREE.BoxGeometry(0.65, 0.28, 3.6));
  const balusterCoords: Array<[number, number, number]> = [];
  for (let z = 96; z <= 128; z += 4) {
    balusterCoords.push([-17.2, ASTRAL.balconyY, z], [17.2, ASTRAL.balconyY, z]);
  }
  for (let z = 26; z <= 54; z += 4) {
    balusterCoords.push([-15.2, ASTRAL.midOverlookY, z], [15.2, ASTRAL.midOverlookY, z]);
  }
  for (let z = -62; z <= -16; z += 4.5) {
    balusterCoords.push([-31.2, ASTRAL.sanctuaryPlazaY, z], [31.2, ASTRAL.sanctuaryPlazaY, z]);
  }
  for (let z = -174; z <= -116; z += 5.5) {
    balusterCoords.push([-35.2, ASTRAL.sprawlPlazaY, z]);
  }

  const balPosts = new THREE.InstancedMesh(balusterPostGeo, whiteMarbleMat, balusterCoords.length);
  const balRails = new THREE.InstancedMesh(balusterRailGeo, whiteMarbleMat, balusterCoords.length);
  balusterCoords.forEach((bc, idx) => {
    dummy.position.set(bc[0], bc[1] + 0.68, bc[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    balPosts.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(bc[0], bc[1] + 1.38, bc[2]);
    dummy.updateMatrix();
    balRails.setMatrixAt(idx, dummy.matrix);
  });
  balPosts.instanceMatrix.needsUpdate = true;
  balRails.instanceMatrix.needsUpdate = true;
  balPosts.computeBoundingSphere();
  balRails.computeBoundingSphere();
  group.add(balPosts, balRails);

  // Veiled Statues on Square Plinths holding Golden Spiral Staffs (Image 3)
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

  createVeiledStatue(-12.5, ASTRAL.balconyY, 96, 0.35);
  createVeiledStatue(12.5, ASTRAL.balconyY, 96, -0.35);
  createVeiledStatue(-12, ASTRAL.midOverlookY, 32, 0.3);
  createVeiledStatue(12, ASTRAL.midOverlookY, 32, -0.3);
  createVeiledStatue(-14, ASTRAL.sanctuaryPlazaY, -22, 0.4);
  createVeiledStatue(14, ASTRAL.sanctuaryPlazaY, -22, -0.4);
  createVeiledStatue(-14, ASTRAL.sanctuaryPlazaY, -54, 0.25);
  createVeiledStatue(14, ASTRAL.sanctuaryPlazaY, -54, -0.25);
  createVeiledStatue(-24, ASTRAL.sprawlPlazaY, -128, 0.5);
  createVeiledStatue(24, ASTRAL.sprawlPlazaY, -128, -0.5);

  // =========================================================================
  // 3. WEST SANCTUARY FACADE & GRAND ERDTREE SANCTUARY + TAPERED ROOTS
  // =========================================================================
  const sanctuaryFacade = new THREE.Group();
  sanctuaryFacade.position.set(-76, ASTRAL.sanctuarySidePorchY, -40);
  group.add(sanctuaryFacade);

  const facadeWall = new THREE.Mesh(track(new THREE.BoxGeometry(16, 48, 68)), whiteStoneMat);
  facadeWall.position.set(-6, 24, 0);
  facadeWall.castShadow = true;
  facadeWall.receiveShadow = true;
  sanctuaryFacade.add(facadeWall);

  const facadePortal = new THREE.Mesh(
    track(new THREE.ExtrudeGeometry(createArchShape(11, 20, 2.5), { depth: 3.5, bevelEnabled: false })),
    whiteMarbleMat,
  );
  facadePortal.rotation.y = Math.PI / 2;
  facadePortal.position.set(2.0, 0, 0);
  sanctuaryFacade.add(facadePortal);

  const facadePortalGlow = new THREE.Mesh(track(new THREE.PlaneGeometry(9.6, 17)), goldenWindowMat);
  facadePortalGlow.rotation.y = Math.PI / 2;
  facadePortalGlow.position.set(2.2, 8.5, 0);
  sanctuaryFacade.add(facadePortalGlow);

  for (const wz of [-16, -8, 8, 16]) {
    const win = new THREE.Mesh(track(new THREE.BoxGeometry(0.6, 14, 3.2)), goldenWindowMat);
    win.position.set(2.1, 24, wz);
    sanctuaryFacade.add(win);
  }
  const facadeRose = new THREE.Mesh(track(new THREE.CircleGeometry(5.5, 20)), goldenWindowMat);
  facadeRose.rotation.y = Math.PI / 2;
  facadeRose.position.set(2.15, 31, 0);
  sanctuaryFacade.add(facadeRose);

  // Colossal Grand Erdtree Sanctuary Citadel Cluster (Images 2 & 4, framed cleanly on left third!)
  const erdtreeSanctuary = new THREE.Group();
  erdtreeSanctuary.position.set(-82, 134, -76);
  group.add(erdtreeSanctuary);

  const sancCliff = new THREE.Mesh(track(new THREE.CylinderGeometry(54, 74, 142, 10)), dragonStoneMat);
  sancCliff.position.set(0, -68, 0);
  erdtreeSanctuary.add(sancCliff);

  // Main Octagonal Sanctuary Rotunda + Recessed Dark Window Bays + Ribbed Golden Dome
  const mainRotunda = new THREE.Mesh(track(new THREE.CylinderGeometry(25, 28, 66, 8)), whiteStoneMat);
  mainRotunda.position.set(0, 33, 0);
  erdtreeSanctuary.add(mainRotunda);

  // Recessed arched window drum & buttresses around upper rotunda
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const buttress = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 68, 4.5)), whiteMarbleMat);
    buttress.position.set(Math.sin(ang) * 26, 34, Math.cos(ang) * 26);
    buttress.rotation.y = ang;
    erdtreeSanctuary.add(buttress);

    const bayWin = new THREE.Mesh(track(new THREE.BoxGeometry(3.5, 16, 1.2)), shadowStoneMat);
    bayWin.position.set(Math.sin(ang + Math.PI / 8) * 24.8, 52, Math.cos(ang + Math.PI / 8) * 24.8);
    bayWin.rotation.y = ang + Math.PI / 8;
    erdtreeSanctuary.add(bayWin);
  }

  const mainDome = new THREE.Mesh(
    track(new THREE.SphereGeometry(24.5, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52)),
    royalGoldMat,
  );
  mainDome.position.set(0, 66, 0);
  erdtreeSanctuary.add(mainDome);

  // Meridional ribs on the Golden Dome
  for (let r = 0; r < 4; r++) {
    const rib = new THREE.Mesh(track(new THREE.TorusGeometry(24.7, 0.65, 6, 24, Math.PI)), whiteMarbleMat);
    rib.position.set(0, 66, 0);
    rib.rotation.y = (r / 4) * Math.PI;
    erdtreeSanctuary.add(rib);
  }

  const mainFinial = new THREE.Mesh(track(new THREE.ConeGeometry(4.0, 24, 8)), royalGoldMat);
  mainFinial.position.set(0, 100, 0);
  erdtreeSanctuary.add(mainFinial);

  // Clustered multi-story Bell Towers with Golden Needle Spires
  const bellTowerSpecs = [
    { x: -30, z: -18, h: 74, r: 9.0, spireH: 32 },
    { x: 28, z: -22, h: 82, r: 10.0, spireH: 36 },
    { x: 24, z: 24, h: 62, r: 8.0, spireH: 26 },
    { x: -25, z: 26, h: 68, r: 8.5, spireH: 28 },
    { x: 0, z: -38, h: 90, r: 11.2, spireH: 40 },
  ];
  for (const bt of bellTowerSpecs) {
    const shaft = new THREE.Mesh(track(new THREE.BoxGeometry(bt.r * 1.65, bt.h, bt.r * 1.65)), whiteStoneMat);
    shaft.position.set(bt.x, bt.h * 0.5, bt.z);
    erdtreeSanctuary.add(shaft);

    const belfry = new THREE.Mesh(track(new THREE.CylinderGeometry(bt.r * 0.78, bt.r * 0.88, 16, 8)), whiteMarbleMat);
    belfry.position.set(bt.x, bt.h + 8, bt.z);
    erdtreeSanctuary.add(belfry);

    const spire = new THREE.Mesh(track(new THREE.ConeGeometry(bt.r * 0.85, bt.spireH, 8)), royalGoldMat);
    spire.position.set(bt.x, bt.h + 15.5 + bt.spireH * 0.5, bt.z);
    erdtreeSanctuary.add(spire);
  }

  // Tapered Organic Pale-Wood Erdtree Roots coiling tightly around towers & dome
  const taperedRootSpecs: Array<{ pts: THREE.Vector3[]; r0: number; r1: number }> = [
    {
      pts: [
        new THREE.Vector3(-36, -16, 22),
        new THREE.Vector3(-24, 30, 24),
        new THREE.Vector3(-2, 62, 26),
        new THREE.Vector3(24, 78, 12),
        new THREE.Vector3(34, 48, -18),
        new THREE.Vector3(18, 16, -24),
      ],
      r0: 4.5,
      r1: 0.6,
    },
    {
      pts: [
        new THREE.Vector3(-32, -10, -24),
        new THREE.Vector3(-18, 42, -20),
        new THREE.Vector3(14, 78, 18),
        new THREE.Vector3(6, 102, 2),
        new THREE.Vector3(-18, 86, -16),
        new THREE.Vector3(-26, 48, -18),
      ],
      r0: 3.9,
      r1: 0.5,
    },
    {
      pts: [
        new THREE.Vector3(26, -12, 22),
        new THREE.Vector3(30, 34, 16),
        new THREE.Vector3(20, 66, -8),
        new THREE.Vector3(2, 82, -28),
        new THREE.Vector3(-22, 54, -26),
      ],
      r0: 3.4,
      r1: 0.5,
    },
    {
      pts: [
        new THREE.Vector3(-32, 16, -4),
        new THREE.Vector3(-10, 68, -28),
        new THREE.Vector3(24, 88, -16),
        new THREE.Vector3(32, 56, 14),
        new THREE.Vector3(18, 22, 22),
      ],
      r0: 3.1,
      r1: 0.45,
    },
    {
      pts: [
        new THREE.Vector3(10, -8, 30),
        new THREE.Vector3(-12, 34, 32),
        new THREE.Vector3(-30, 58, 18),
        new THREE.Vector3(-22, 80, -10),
        new THREE.Vector3(-4, 62, -28),
      ],
      r0: 2.8,
      r1: 0.45,
    },
  ];
  for (const rs of taperedRootSpecs) {
    const geo = track(createTaperedTubeGeo(rs.pts, 28, 7, rs.r0, rs.r1));
    const rootMesh = new THREE.Mesh(geo, paleRootMat);
    erdtreeSanctuary.add(rootMesh);
  }

  // =========================================================================
  // 4. MIDDLE TIER — THE SPRAWL OF GOLDEN ROOFS (InstancedMesh Mega-City)
  // =========================================================================
  buildStairFlight(-10, 10, -112, -64, ASTRAL.sanctuaryPlazaY, ASTRAL.sprawlPlazaY, 44, 'z', whiteStoneMat);
  buildPlatformSlab(-36, 36, -178, -112, ASTRAL.sprawlPlazaY, 5.5, whiteStoneMat, 76);

  // Walkable Petrified Dragon Wing-Ramp & Wing-Shoulder Overlook Terrace
  buildStairFlight(36, 88, -150, -134, ASTRAL.dragonWingY, ASTRAL.sprawlPlazaY, 34, 'x', dragonStoneMat);
  buildPlatformSlab(88, 114, -154, -128, ASTRAL.dragonWingY, 5.0, dragonStoneMat, 72);

  // Dense Multi-Level White-Limestone & Golden-Roofed Townhouses across 900m+ valley
  interface CityBlockSpec {
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    ry: number;
    hasSpire: boolean;
  }
  const cityBuildings: CityBlockSpec[] = [];

  for (let i = 0; i < 400; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const band = Math.floor(i / 2);
    const bx = side * (34 + hash01(i * 3 + 1) * 390);
    const bz = 250 - hash01(i * 3 + 2) * 550;

    // Keep clear of central spine, Aqueduct Chasm, West Erdtree Sanctuary core, & East Dragon Overlook
    if (Math.abs(bx) < 30 && bz > -205) continue;
    if (bz < -205 && Math.abs(bx) < 110) continue;
    if (bx < -36 && bx > -145 && bz > -135 && bz < -20) continue;
    if (bx > 76 && bx < 175 && bz > -205 && bz < -105) continue;

    const distCenter = Math.abs(bx);
    const northSlope = THREE.MathUtils.clamp((bz + 280) / 530, 0, 1);
    const tierY =
      36 +
      northSlope * 46 +
      Math.min(34, distCenter * 0.085) +
      Math.floor(hash01(i * 5 + 3) * 3) * 8;

    const sx = 14 + hash01(band * 7 + 1) * 14;
    const sy = 15 + hash01(band * 7 + 2) * 20;
    const sz = 16 + hash01(band * 7 + 3) * 18;
    const ry = ((i % 4) * Math.PI) / 2 + (hash01(i * 11) - 0.5) * 0.22;

    cityBuildings.push({
      x: bx,
      y: tierY,
      z: bz,
      sx,
      sy,
      sz,
      ry,
      hasSpire: i % 4 === 0,
    });
  }

  // City terraced foundation cliffs under sprawl wings
  for (const side of [-1, 1]) {
    const wingTerrace = new THREE.Mesh(track(new THREE.BoxGeometry(375, 48, 560)), dragonStoneMat);
    wingTerrace.position.set(side * 240, 22, -25);
    group.add(wingTerrace);
  }

  const houseBodyGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const houseCorniceGeo = track(new THREE.BoxGeometry(1.06, 0.14, 1.06));
  const houseWindowBandGeo = track(new THREE.BoxGeometry(1.02, 0.22, 0.72));
  const houseRoofGeo = track(createPitchedRoofGeo(1.08, 0.55, 1.06));

  const instHouseBodies = new THREE.InstancedMesh(houseBodyGeo, whiteStoneMat, cityBuildings.length);
  const instHouseCornices = new THREE.InstancedMesh(houseCorniceGeo, whiteMarbleMat, cityBuildings.length);
  const instHouseWindows = new THREE.InstancedMesh(houseWindowBandGeo, shadowStoneMat, cityBuildings.length);
  const instHouseRoofs = new THREE.InstancedMesh(houseRoofGeo, royalGoldMat, cityBuildings.length);

  const spireItems = cityBuildings.filter((b) => b.hasSpire);
  const spireShaftGeo = track(new THREE.CylinderGeometry(2.4, 3.1, 24, 6));
  const spireCapGeo = track(new THREE.ConeGeometry(3.1, 16, 6));
  const instSpireShafts = new THREE.InstancedMesh(spireShaftGeo, whiteMarbleMat, spireItems.length);
  const instSpireCaps = new THREE.InstancedMesh(spireCapGeo, royalGoldMat, spireItems.length);

  let sIdx = 0;
  const roofCol = new THREE.Color();
  cityBuildings.forEach((b, i) => {
    dummy.position.set(b.x, b.y + b.sy * 0.5, b.z);
    dummy.rotation.set(0, b.ry, 0);
    dummy.scale.set(b.sx, b.sy, b.sz);
    dummy.updateMatrix();
    instHouseBodies.setMatrixAt(i, dummy.matrix);

    dummy.position.set(b.x, b.y + b.sy * 0.94, b.z);
    dummy.scale.set(b.sx, b.sy, b.sz);
    dummy.updateMatrix();
    instHouseCornices.setMatrixAt(i, dummy.matrix);

    dummy.position.set(b.x, b.y + b.sy * 0.62, b.z);
    dummy.scale.set(b.sx, b.sy, b.sz);
    dummy.updateMatrix();
    instHouseWindows.setMatrixAt(i, dummy.matrix);

    dummy.position.set(b.x, b.y + b.sy, b.z);
    dummy.scale.set(b.sx, b.sx * 0.55, b.sz);
    dummy.updateMatrix();
    instHouseRoofs.setMatrixAt(i, dummy.matrix);

    const gShade = 0.85 + hash01(i * 19 + 5) * 0.25;
    roofCol.setRGB(gShade, gShade * 0.92, gShade * 0.8);
    instHouseRoofs.setColorAt(i, roofCol);

    if (b.hasSpire) {
      const sScaleY = 0.9 + hash01(i * 23) * 0.5;
      const shaftH = 24 * sScaleY;
      dummy.position.set(b.x, b.y + b.sy + shaftH * 0.5 - 0.5, b.z);
      dummy.rotation.set(0, b.ry, 0);
      dummy.scale.set(1, sScaleY, 1);
      dummy.updateMatrix();
      instSpireShafts.setMatrixAt(sIdx, dummy.matrix);

      // Cap overlaps top of shaft by 1.2m so zero gap ever appears!
      dummy.position.set(b.x, b.y + b.sy + shaftH - 0.5 + 6.8, b.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instSpireCaps.setMatrixAt(sIdx, dummy.matrix);
      sIdx++;
    }
  });

  [
    instHouseBodies,
    instHouseCornices,
    instHouseWindows,
    instHouseRoofs,
    instSpireShafts,
    instSpireCaps,
  ].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingBox();
    im.computeBoundingSphere();
    group.add(im);
  });

  // =========================================================================
  // 5. COLOSSAL PETRIFIED DRAGON DRAPED OVER EASTERN RAMPARTS (Images 2 & 5)
  // Positioned cleanly NE of the Wing Overlook (148, 98, -182) for full silhouette!
  // =========================================================================
  const dragonGroup = new THREE.Group();
  dragonGroup.position.set(148, ASTRAL.dragonWingY, -182);
  dragonGroup.rotation.y = -0.36;
  group.add(dragonGroup);

  const dragonBastion = new THREE.Mesh(track(new THREE.BoxGeometry(46, 98, 52)), whiteStoneMat);
  dragonBastion.position.set(8, -48, -4);
  dragonGroup.add(dragonBastion);

  // Sculpted stone chest & shoulder mass anchoring torso, neck, and wings cleanly (zero open tube edges!)
  const dragonChest = new THREE.Mesh(track(new THREE.DodecahedronGeometry(8.4, 1)), dragonStoneMat);
  dragonChest.position.set(-2, 6, 10);
  dragonChest.scale.set(1.0, 0.9, 1.25);
  dragonGroup.add(dragonChest);

  // Tapered segmented dragon torso & coiled tail curving SE -> N
  const dragonTorso = new THREE.Mesh(
    track(
      createTaperedTubeGeo(
        [
          new THREE.Vector3(-2, 5, 10),
          new THREE.Vector3(6, 9, -2),
          new THREE.Vector3(16, 7, -20),
          new THREE.Vector3(28, -2, -40),
          new THREE.Vector3(46, -15, -56),
          new THREE.Vector3(60, -25, -64),
        ],
        24,
        9,
        7.6,
        1.2,
      ),
    ),
    dragonStoneMat,
  );
  dragonGroup.add(dragonTorso);

  // Sculpted stone rib rings snugly wrapped around dragon torso
  for (let r = 0; r < 6; r++) {
    const rib = new THREE.Mesh(track(new THREE.TorusGeometry(6.6 - r * 0.45, 0.75, 6, 14)), dragonStoneMat);
    rib.position.set(0 + r * 3.6, 7.5 - r * 0.6, 5 - r * 5.0);
    rib.rotation.x = Math.PI * 0.42;
    rib.rotation.y = -0.25;
    dragonGroup.add(rib);
  }

  // Proud S-Curved Dragon Neck + Horned Skull framed cleanly in sky
  const dragonNeck = new THREE.Mesh(
    track(
      createTaperedTubeGeo(
        [
          new THREE.Vector3(-2, 7, 10),
          new THREE.Vector3(-10, 20, 14),
          new THREE.Vector3(-18, 32, 10),
          new THREE.Vector3(-24, 38, 4),
        ],
        18,
        8,
        4.4,
        2.4,
      ),
    ),
    dragonStoneMat,
  );
  dragonGroup.add(dragonNeck);

  const dragonSkull = new THREE.Mesh(track(new THREE.ConeGeometry(4.2, 13.5, 6)), dragonStoneMat);
  dragonSkull.position.set(-29, 38.5, 1);
  dragonSkull.rotation.z = Math.PI * 0.56;
  dragonSkull.rotation.y = 0.25;
  dragonGroup.add(dragonSkull);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(track(new THREE.ConeGeometry(0.95, 9.5, 5)), dragonStoneMat);
    horn.position.set(-22, 44, 2 + side * 2.2);
    horn.rotation.z = -0.65;
    horn.rotation.x = side * 0.25;
    dragonGroup.add(horn);
  }

  // Sweeping Ribbed Stone Wings angled dramatically behind chest!
  const dWingShape = new THREE.Shape();
  dWingShape.moveTo(0, 0);
  dWingShape.lineTo(48, 26);
  dWingShape.quadraticCurveTo(38, 6, 48, -6);
  dWingShape.quadraticCurveTo(30, -2, 32, -16);
  dWingShape.quadraticCurveTo(16, -6, 0, -14);
  dWingShape.closePath();
  const dWingGeo = track(
    new THREE.ExtrudeGeometry(dWingShape, {
      depth: 1.4,
      bevelEnabled: true,
      bevelSize: 0.25,
      bevelThickness: 0.25,
    }),
  );

  for (let w = 0; w < 2; w++) {
    const wing = new THREE.Mesh(dWingGeo, dragonStoneMat);
    wing.position.set(1 + w * 5, 11 + w * 2, 2 - w * 10);
    wing.rotation.y = w === 0 ? -0.45 : -0.95;
    wing.rotation.x = w === 0 ? -0.18 : 0.14;
    dragonGroup.add(wing);

    for (let r = 0; r < 4; r++) {
      const spar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.45, 0.85, 38, 6)), dragonStoneMat);
      spar.position.set(15 + w * 4, 18 - r * 4.5, -2 - w * 10 - r * 4);
      spar.rotation.z = -1.02 - r * 0.2;
      spar.rotation.y = w === 0 ? -0.45 : -0.95;
      dragonGroup.add(spar);
    }
  }

  // =========================================================================
  // 6. LOWER TIER — STARLIT NOKRON AQUEDUCTS, BASIN & HORIZON CITADELS
  // =========================================================================
  buildStairFlight(-8.5, 8.5, -236, -178, ASTRAL.sprawlPlazaY, ASTRAL.aqueductMidY, 44, 'z', nokronStoneMat);
  buildPlatformSlab(-18, 18, -266, -236, ASTRAL.aqueductMidY, 4.5, nokronStoneMat, 46);
  buildStairFlight(-8.5, 8.5, -312, -266, ASTRAL.aqueductMidY, ASTRAL.aqueductDeckY, 36, 'z', nokronStoneMat);

  buildPlatformSlab(-10, 10, -410, -312, ASTRAL.aqueductDeckY, 3.2, nokronStoneMat, 0);
  buildPlatformSlab(-180, 180, -362, -342, ASTRAL.aqueductDeckY, 3.2, nokronStoneMat, 0);
  buildStairFlight(-10, 10, -438, -410, ASTRAL.aqueductDeckY, ASTRAL.nokronTempleY, 24, 'z', nokronStoneMat);
  buildPlatformSlab(-32, 32, -490, -438, ASTRAL.nokronTempleY, 4.0, nokronStoneMat, 12);

  // Monumental Two-Tier Stone Aqueduct Arches spanning x = -220..+220 (Image 6)
  const aqPierGeo = track(new THREE.BoxGeometry(5.6, 26, 18));
  const aqArchGeo = track(
    new THREE.ExtrudeGeometry(createArchShape(16, 11.5, 2.2), { depth: 18, bevelEnabled: false }),
  );
  aqArchGeo.translate(0, 0, -9);

  const aqBayCount = 19;
  const aqPiers = new THREE.InstancedMesh(aqPierGeo, nokronStoneMat, aqBayCount);
  const aqLowerArches = new THREE.InstancedMesh(aqArchGeo, nokronStoneMat, aqBayCount - 1);
  const aqUpperArches = new THREE.InstancedMesh(aqArchGeo, nokronStoneMat, (aqBayCount - 1) * 2);

  for (let i = 0; i < aqBayCount; i++) {
    const ax = -200 + i * 22;
    dummy.position.set(ax, 12.0, -352);
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

  // Monumental Aqueduct Gatehouse Towers flanking the bridge (Image 6 right & left towers!)
  for (const gx of [-178, -96, 96, 178]) {
    const gTower = new THREE.Group();
    gTower.position.set(gx, 0, -352);
    const base = new THREE.Mesh(track(new THREE.BoxGeometry(20, 48, 22)), nokronStoneMat);
    base.position.y = 24;
    gTower.add(base);
    const belfry = new THREE.Mesh(track(new THREE.BoxGeometry(16, 14, 18)), whiteMarbleMat);
    belfry.position.y = 54;
    gTower.add(belfry);
    const win = new THREE.Mesh(track(new THREE.BoxGeometry(6, 10, 23)), astralWindowMat);
    win.position.y = 38;
    gTower.add(win);
    const roof = new THREE.Mesh(track(new THREE.ConeGeometry(12, 16, 4)), nokronStoneMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 69;
    gTower.add(roof);
    group.add(gTower);
  }

  // Sunken Silver-White Nokron Domed Temple (Image 6 center-left domed temple)
  const nokronTemple = new THREE.Group();
  nokronTemple.position.set(0, ASTRAL.nokronTempleY, -496);
  group.add(nokronTemple);

  const tHall = new THREE.Mesh(track(new THREE.BoxGeometry(46, 30, 38)), nokronStoneMat);
  tHall.position.set(0, 15, 0);
  nokronTemple.add(tHall);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(track(new THREE.BoxGeometry(18, 24, 30)), nokronStoneMat);
    wing.position.set(side * 28, 12, 2);
    nokronTemple.add(wing);

    const turret = new THREE.Mesh(track(new THREE.BoxGeometry(9, 42, 9)), whiteMarbleMat);
    turret.position.set(side * 22, 21, 18);
    nokronTemple.add(turret);

    const spire = new THREE.Mesh(track(new THREE.ConeGeometry(5.5, 16, 6)), nokronStoneMat);
    spire.position.set(side * 22, 50, 18);
    nokronTemple.add(spire);
  }

  const tDrum = new THREE.Mesh(track(new THREE.CylinderGeometry(17.5, 18.5, 12, 12)), whiteMarbleMat);
  tDrum.position.set(0, 35, 0);
  nokronTemple.add(tDrum);

  const tDome = new THREE.Mesh(
    track(new THREE.SphereGeometry(18, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52)),
    nokronStoneMat,
  );
  tDome.position.set(0, 41, 0);
  nokronTemple.add(tDome);

  const tSpire = new THREE.Mesh(track(new THREE.ConeGeometry(2.8, 15, 8)), whiteMarbleMat);
  tSpire.position.set(0, 64, 0);
  nokronTemple.add(tSpire);

  const tPortalGlow = new THREE.Mesh(track(new THREE.BoxGeometry(8, 14, 1)), astralWindowMat);
  tPortalGlow.position.set(0, 7, 19.2);
  nokronTemple.add(tPortalGlow);

  const tRoseGlow = new THREE.Mesh(track(new THREE.CircleGeometry(4.2, 16)), astralWindowMat);
  tRoseGlow.position.set(0, 21, 19.2);
  nokronTemple.add(tRoseGlow);

  // Scenic Twin Nokron Domed Sanctum nested directly beside the Aqueduct arches (Image 6!)
  const sideSanctum = nokronTemple.clone();
  sideSanctum.position.set(-56, 2, -408);
  sideSanctum.scale.setScalar(0.95);
  group.add(sideSanctum);

  // Starlit Midnight Indigo Basin (y = 0, unwashed by directional diffuse bounce)
  const basinWaterMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x070a1c,
    }),
  );
  const basinWater = new THREE.Mesh(track(new THREE.PlaneGeometry(1500, 1500)), basinWaterMat);
  basinWater.rotation.x = -Math.PI / 2;
  basinWater.position.set(0, ASTRAL.waterY, -200);
  group.add(basinWater);

  // Sculpted Distant Glowing Horizon Citadels (Image 7 — stepped cliffs + pierced golden colonnades + slender spires!)
  const horizonMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x161934,
      roughness: 0.92,
      metalness: 0.06,
      envMapIntensity: 0.1,
    }),
  );
  const horizonSpecs = [
    { x: -340, z: -570, w: 94, h: 118, d: 58 },
    { x: -165, z: -615, w: 66, h: 146, d: 48 },
    { x: 45, z: -640, w: 122, h: 132, d: 68 },
    { x: 255, z: -595, w: 72, h: 152, d: 54 },
    { x: 440, z: -515, w: 98, h: 112, d: 60 },
    { x: -495, z: -380, w: 88, h: 108, d: 58 },
    { x: 515, z: -260, w: 82, h: 116, d: 60 },
  ];
  for (const hs of horizonSpecs) {
    const cg = new THREE.Group();
    cg.position.set(hs.x, 0, hs.z);
    cg.lookAt(0, 0, -150);

    const baseCliff = new THREE.Mesh(
      track(new THREE.CylinderGeometry(hs.w * 0.62, hs.w * 0.88, hs.h * 0.68, 7)),
      horizonMat,
    );
    baseCliff.position.y = hs.h * 0.34 - 6;
    cg.add(baseCliff);

    // Lower keep body below colonnade crown
    const upperKeep = new THREE.Mesh(
      track(new THREE.BoxGeometry(hs.w * 0.72, hs.h * 0.24, hs.d * 0.7)),
      horizonMat,
    );
    upperKeep.position.y = hs.h * 0.72 - 6;
    cg.add(upperKeep);

    // Exposed glowing golden colonnade frieze atop the keep framed by dark stone piers & cornice!
    const crownGlow = new THREE.Mesh(
      track(new THREE.BoxGeometry(hs.w * 0.68, 9.5, hs.d * 0.64)),
      goldenWindowMat,
    );
    crownGlow.position.y = hs.h * 0.88 - 6;
    cg.add(crownGlow);

    const crownRoof = new THREE.Mesh(
      track(new THREE.BoxGeometry(hs.w * 0.76, 4.5, hs.d * 0.74)),
      horizonMat,
    );
    crownRoof.position.y = hs.h * 0.88 + 0.5;
    cg.add(crownRoof);

    for (let p = -4; p <= 4; p++) {
      const pier = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 13.5, hs.d * 0.74)), horizonMat);
      pier.position.set(p * (hs.w * 0.082), hs.h * 0.88 - 6, 0);
      cg.add(pier);
    }

    for (const side of [-1, 1]) {
      const flankSpire = new THREE.Mesh(
        track(new THREE.ConeGeometry(hs.w * 0.12, hs.h * 0.52, 6)),
        horizonMat,
      );
      flankSpire.position.set(side * hs.w * 0.44, hs.h * 0.72, 4);
      cg.add(flankSpire);
    }

    group.add(cg);
  }

  // =========================================================================
  // 7. AUTUMN-GOLD TREES (InstancedMesh), GRACE WISPS & DRIFTING PARTICLES
  // =========================================================================
  const treeCoords: Array<[number, number, number, number]> = [];
  const fixedTrees: Array<[number, number, number, number]> = [
    [-13.5, ASTRAL.balconyY, 102, 1.15],
    [13.5, ASTRAL.balconyY, 102, 1.18],
    [-13.5, ASTRAL.balconyY, 118, 1.05],
    [13.5, ASTRAL.balconyY, 118, 1.12],
    [-12.5, ASTRAL.midOverlookY, 36, 1.22],
    [12.5, ASTRAL.midOverlookY, 36, 1.16],
    [-25, ASTRAL.sanctuaryPlazaY, -24, 1.35],
    [-25, ASTRAL.sanctuaryPlazaY, -52, 1.28],
    [25, ASTRAL.sanctuaryPlazaY, -24, 1.3],
    [25, ASTRAL.sanctuaryPlazaY, -52, 1.25],
    [-30, ASTRAL.sprawlPlazaY, -124, 1.3],
    [-30, ASTRAL.sprawlPlazaY, -166, 1.22],
    [30, ASTRAL.sprawlPlazaY, -166, 1.25],
  ];
  treeCoords.push(...fixedTrees);
  for (let i = 0; i < 95; i++) {
    const b = cityBuildings[(i * 3) % cityBuildings.length];
    if (!b) continue;
    treeCoords.push([b.x + b.sx * 0.65, b.y, b.z + b.sz * 0.65, 0.9 + hash01(i * 17) * 0.65]);
  }

  const tTrunkGeo = track(new THREE.CylinderGeometry(0.28, 0.55, 5.2, 6));
  const lobe1 = new THREE.DodecahedronGeometry(2.6, 1);
  lobe1.translate(0, 6.2, 0);
  const lobe2 = new THREE.DodecahedronGeometry(2.0, 1);
  lobe2.translate(1.4, 5.2, 0.8);
  const lobe3 = new THREE.DodecahedronGeometry(1.9, 1);
  lobe3.translate(-1.3, 5.5, -0.7);
  const tCanopyGeo = track(mergeGeometries([lobe1, lobe2, lobe3])!);
  lobe1.dispose();
  lobe2.dispose();
  lobe3.dispose();

  const instTreeTrunks = new THREE.InstancedMesh(tTrunkGeo, paleRootMat, treeCoords.length);
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
    treeCol.setHSL(0.055 + tone * 0.035, 0.85, 0.32 + tone * 0.12);
    instTreeCanopies.setColorAt(i, treeCol);
  });
  instTreeTrunks.instanceMatrix.needsUpdate = true;
  instTreeCanopies.instanceMatrix.needsUpdate = true;
  if (instTreeCanopies.instanceColor) instTreeCanopies.instanceColor.needsUpdate = true;
  instTreeTrunks.computeBoundingSphere();
  instTreeCanopies.computeBoundingSphere();
  group.add(instTreeTrunks, instTreeCanopies);

  // Subtle Elden-Ring-Style Sites of Grace (glowing golden spark + slender wisp, no giant white cone!)
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

    const wisp = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.03, 0.24, 2.2, 8, 1, true)),
      graceWispMat,
    );
    wisp.position.y = 1.25;
    gg.add(wisp);

    group.add(gg);
    graceWisps.push(gg);
  }

  // Strategic unshadowed accent lights inside Astral Capital (<= 4 PointLights)
  const causewayGlow = new THREE.PointLight(0xffbe66, 22, 95, 1.2);
  causewayGlow.position.set(0, ASTRAL.balconyY + 10, 108);
  group.add(causewayGlow);

  const sanctuaryGlow = new THREE.PointLight(0xffb858, 28, 120, 1.2);
  sanctuaryGlow.position.set(-22, ASTRAL.sanctuaryPlazaY + 14, -40);
  group.add(sanctuaryGlow);

  const dragonGlow = new THREE.PointLight(0xffae52, 26, 130, 1.2);
  dragonGlow.position.set(22, ASTRAL.sprawlPlazaY + 16, -145);
  group.add(dragonGlow);

  const nokronGlow = new THREE.PointLight(0x8cb4ff, 26, 140, 1.2);
  nokronGlow.position.set(0, ASTRAL.nokronTempleY + 14, -456);
  group.add(nokronGlow);

  // Drifting Golden Autumn Leaves + Cosmic Starlight Motes
  const leafCount = 280;
  const leafPos = new Float32Array(leafCount * 3);
  const leafPhase = new Float32Array(leafCount);
  for (let i = 0; i < leafCount; i++) {
    leafPos[i * 3] = (Math.random() - 0.5) * 90;
    leafPos[i * 3 + 1] = 85 + Math.random() * 82;
    leafPos[i * 3 + 2] = 128 - Math.random() * 280;
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
  const leafPoints = new THREE.Points(leafGeo, leafMat);
  group.add(leafPoints);

  const starDustCount = 520;
  const starDustPos = new Float32Array(starDustCount * 3);
  const starDustPhase = new Float32Array(starDustCount);
  for (let i = 0; i < starDustCount; i++) {
    starDustPos[i * 3] = (Math.random() - 0.5) * 320;
    starDustPos[i * 3 + 1] = 12 + Math.random() * 170;
    starDustPos[i * 3 + 2] = 140 - Math.random() * 640;
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
  const starDustPoints = new THREE.Points(starDustGeo, starDustMat);
  group.add(starDustPoints);

  const update = (elapsed: number, dt: number, playerX: number, _playerY: number, playerZ: number) => {
    skyDome.position.set(playerX, 0, playerZ);
    skyMat.uniforms.uTime.value = elapsed;
    portalVeilMat.uniforms.uTime.value = elapsed;

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
      if (y < 76) {
        y = 166;
        x = (Math.random() - 0.5) * 90;
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
