import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WorldTextureBundle } from './textures';
import { WORLD } from './terrainMath';
import { buildCitadelInterior } from './buildCitadelInterior';

export interface CatacombGateHandles {
  leftDoorPivot: THREE.Group;
  rightDoorPivot: THREE.Group;
  doorSealSeam: THREE.Mesh;
  soulBrazierLight: THREE.PointLight;
}

export interface WorldHandles {
  overworldGroup: THREE.Group;
  bonfireLight: THREE.PointLight;
  tunnelLight: THREE.PointLight;
  walkableMeshes: THREE.Object3D[];
  tunnelWalls: THREE.Object3D[];
  academyCastleGroup: THREE.Group;
  catacombGate: CatacombGateHandles;
  update: (elapsed: number, dt: number, playerZ?: number, playerY?: number, playerX?: number) => void;
  dispose: () => void;
}

function createArchShape(width: number, height: number, thickness: number): THREE.Shape {
  const halfW = width / 2;
  const springY = height * 0.52;
  const shape = new THREE.Shape();
  shape.moveTo(-halfW - thickness, 0);
  shape.lineTo(-halfW - thickness, springY);
  shape.quadraticCurveTo(-halfW - thickness, height + thickness, 0, height + thickness * 1.15);
  shape.quadraticCurveTo(halfW + thickness, height + thickness, halfW + thickness, springY);
  shape.lineTo(halfW + thickness, 0);
  shape.lineTo(halfW, 0);
  shape.lineTo(halfW, springY);
  shape.quadraticCurveTo(halfW, height, 0, height * 0.96);
  shape.quadraticCurveTo(-halfW, height, -halfW, springY);
  shape.lineTo(-halfW, 0);
  shape.closePath();
  return shape;
}

function createPointedWindowShape(w: number, h: number): THREE.Shape {
  const hw = w / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, h * 0.62);
  shape.quadraticCurveTo(-hw, h * 0.92, 0, h);
  shape.quadraticCurveTo(hw, h * 0.92, hw, h * 0.62);
  shape.lineTo(hw, 0);
  shape.closePath();
  return shape;
}

function createPitchedRoofGeometry(width: number, height: number, length: number): THREE.BufferGeometry {
  const hw = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -length / 2);
  geo.computeVertexNormals();
  return geo;
}

export function buildFantasyWorld(
  scene: THREE.Scene,
  textures: WorldTextureBundle,
): WorldHandles {
  const overworldGroup = new THREE.Group();
  scene.add(overworldGroup);

  const disposables: Array<{ dispose: () => void }> = [];
  const walkableMeshes: THREE.Object3D[] = [];
  const tunnelWalls: THREE.Object3D[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };
  const addWalkable = <T extends THREE.Object3D>(mesh: T): T => {
    walkableMeshes.push(mesh);
    return mesh;
  };

  // Shared PBR Materials
  const stoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.mossyStone.map,
      bumpMap: textures.mossyStone.bumpMap,
      bumpScale: 0.08,
      roughnessMap: textures.mossyStone.roughnessMap,
      roughness: 0.88,
      metalness: 0.04,
    }),
  );

  const flagstoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.flagstone.map,
      bumpMap: textures.flagstone.bumpMap,
      bumpScale: 0.05,
      roughnessMap: textures.flagstone.roughnessMap,
      roughness: 0.82,
      metalness: 0.05,
    }),
  );

  const marbleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.darkMarble.map,
      bumpMap: textures.darkMarble.bumpMap,
      bumpScale: 0.04,
      roughnessMap: textures.darkMarble.roughnessMap,
      roughness: 0.56,
      metalness: 0.14,
    }),
  );

  const gildedRoofMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.gildedRoof.map,
      bumpMap: textures.gildedRoof.bumpMap,
      bumpScale: 0.05,
      roughnessMap: textures.gildedRoof.roughnessMap,
      roughness: 0.42,
      metalness: 0.68,
    }),
  );

  const cliffMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.cliffRock.map,
      bumpMap: textures.cliffRock.bumpMap,
      bumpScale: 0.14,
      roughnessMap: textures.cliffRock.roughnessMap,
      roughness: 0.94,
      metalness: 0.02,
    }),
  );

  const barkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.bark.map,
      bumpMap: textures.bark.bumpMap,
      bumpScale: 0.12,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );

  const ironMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x262528,
      roughness: 0.48,
      metalness: 0.82,
    }),
  );

  const stainedGlassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffb85c,
      emissive: new THREE.Color(0xe68c2e),
      emissiveIntensity: 1.55,
      roughness: 0.25,
      metalness: 0.1,
    }),
  );

  const foliageMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xb97a32,
      roughness: 0.84,
      metalness: 0.02,
    }),
  );

  // =========================================================================
  // 1. GOLDEN-AMBER TWILIGHT SKY DOME & ATMOSPHERIC DEPTH
  // =========================================================================
  const skyGeo = track(new THREE.SphereGeometry(1250, 32, 20));
  const skyMat = track(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.28, 0.22, -0.93).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldDir;
        uniform vec3 uSunDir;
        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
          float up = clamp(dir.y, -0.2, 1.0);

          vec3 abyssCol = vec3(0.16, 0.14, 0.13);
          vec3 horizonCol = vec3(0.55, 0.44, 0.32);
          vec3 midSkyCol = vec3(0.37, 0.35, 0.38);
          vec3 zenithCol = vec3(0.14, 0.17, 0.24);

          vec3 col = mix(abyssCol, horizonCol, smoothstep(-0.18, 0.04, up));
          col = mix(col, midSkyCol, smoothstep(0.03, 0.30, up));
          col = mix(col, zenithCol, smoothstep(0.28, 0.82, up));

          // Low twilight sun halo behind citadel
          float sunDot = max(dot(dir, uSunDir), 0.0);
          col += vec3(0.95, 0.66, 0.30) * pow(sunDot, 12.0) * 0.52;
          col += vec3(1.0, 0.88, 0.62) * pow(sunDot, 90.0) * 0.65;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  overworldGroup.add(skyDome);

  // Volumetric slanted god-ray light shafts
  const rayMat = track(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffca7a) },
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
        uniform vec3 uColor;
        void main() {
          float vertFade = sin(vUv.y * 3.14159);
          float edgeFade = sin(vUv.x * 3.14159);
          float shimmer = 0.82 + 0.18 * sin(uTime * 0.55 + vUv.x * 6.0);
          float alpha = pow(vertFade, 1.4) * pow(edgeFade, 1.8) * 0.068 * shimmer;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    }),
  );
  const rayPlaneGeo = track(new THREE.PlaneGeometry(18, 125));
  const rayPlacements = [
    { x: -16, y: 42, z: -20, ry: 0.4, rz: -0.44 },
    { x: 18, y: 46, z: -78, ry: -0.35, rz: -0.42 },
    { x: -24, y: 55, z: -135, ry: 0.3, rz: -0.45 },
    { x: 24, y: 66, z: -195, ry: -0.25, rz: -0.4 },
  ];
  for (const rp of rayPlacements) {
    const ray = new THREE.Mesh(rayPlaneGeo, rayMat);
    ray.position.set(rp.x, rp.y, rp.z);
    ray.rotation.set(0.15, rp.ry, rp.rz);
    overworldGroup.add(ray);
  }

  // =========================================================================
  // 1B. LUSH DISTANT FOREST VALLEY BACKDROP (y = -45, below playable cliffs)
  // =========================================================================
  const valleyY = -45.0;
  const valleyFloorMat = track(
    new THREE.MeshLambertMaterial({
      color: 0x222c1e,
      map: textures.cliffRock.map,
    }),
  );
  const valleyFloorGeo = track(new THREE.PlaneGeometry(1500, 1600));
  const valleyFloor = new THREE.Mesh(valleyFloorGeo, valleyFloorMat);
  valleyFloor.rotation.x = -Math.PI / 2;
  valleyFloor.position.set(0, valleyY, -400);
  overworldGroup.add(valleyFloor);

  // Winding silver-grey mist rivers meandering through the deep valley floor
  const riverMat = track(
    new THREE.MeshLambertMaterial({
      color: 0x9aa8b0,
      emissive: new THREE.Color(0x313d44),
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.88,
    }),
  );
  const riverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-190, valleyY + 0.25, 110),
    new THREE.Vector3(-85, valleyY + 0.25, 35),
    new THREE.Vector3(24, valleyY + 0.25, -48),
    new THREE.Vector3(-28, valleyY + 0.25, -120),
    new THREE.Vector3(54, valleyY + 0.25, -195),
    new THREE.Vector3(165, valleyY + 0.25, -285),
  ]);
  const riverPoints = riverCurve.getPoints(44);
  const riverPositions: number[] = [];
  const riverIndices: number[] = [];
  for (let i = 0; i < riverPoints.length; i++) {
    const p = riverPoints[i];
    const next = riverPoints[Math.min(riverPoints.length - 1, i + 1)];
    const prev = riverPoints[Math.max(0, i - 1)];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len;
    const nz = tx / len;
    const halfWidth = 11.5 + Math.sin(i * 0.45) * 3.2;
    riverPositions.push(p.x - nx * halfWidth, p.y, p.z - nz * halfWidth);
    riverPositions.push(p.x + nx * halfWidth, p.y, p.z + nz * halfWidth);
    if (i < riverPoints.length - 1) {
      const base = i * 2;
      riverIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const riverGeo = track(new THREE.BufferGeometry());
  riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3));
  riverGeo.setIndex(riverIndices);
  riverGeo.computeVertexNormals();
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  overworldGroup.add(riverMesh);

  // Helper deterministic hash for natural forest scatter
  const valleyHash = (n: number) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  const dummy = new THREE.Object3D();

  // Dense mist-shrouded ancient evergreen forest (InstancedMesh: trunks + merged 2-tier pine cone)
  const pineCoords: Array<{ x: number; z: number; scale: number; rot: number }> = [];
  for (let i = 0; i < 520 && pineCoords.length < 260; i++) {
    const rx = (valleyHash(i * 3 + 1) - 0.5) * 310;
    const rz = 65 - valleyHash(i * 3 + 2) * 310;
    if (Math.hypot(rx, rz) < 25) continue;
    if (rz < -165 && Math.abs(rx) < 115) continue;
    if (rx > -26 && rx < 16 && rz < -90 && rz > -130) continue;
    let nearRiver = false;
    for (let k = 0; k < riverPoints.length; k += 2) {
      if (Math.hypot(rx - riverPoints[k].x, rz - riverPoints[k].z) < 14.5) {
        nearRiver = true;
        break;
      }
    }
    if (nearRiver) continue;
    pineCoords.push({
      x: rx,
      z: rz,
      scale: 0.98 + valleyHash(i * 3 + 3) * 1.18,
      rot: valleyHash(i * 7 + 5) * Math.PI * 2,
    });
  }

  const valleyBarkMat = track(
    new THREE.MeshLambertMaterial({
      color: 0x2f251d,
    }),
  );
  const pineFoliageMat = track(
    new THREE.MeshLambertMaterial({
      color: 0x80917a,
      map: textures.bark.map,
    }),
  );

  const pineTrunkGeo = track(new THREE.CylinderGeometry(0.32, 0.55, 6.2, 5));
  const pineLowerPart = new THREE.ConeGeometry(3.8, 10.2, 6);
  pineLowerPart.translate(0, 8.0, 0);
  const pineUpperPart = new THREE.ConeGeometry(2.6, 8.6, 6);
  pineUpperPart.translate(0, 13.4, 0);
  const pineCanopyGeo = track(mergeGeometries([pineLowerPart, pineUpperPart])!);
  pineLowerPart.dispose();
  pineUpperPart.dispose();

  const pineTrunks = new THREE.InstancedMesh(pineTrunkGeo, valleyBarkMat, pineCoords.length);
  const pineCanopies = new THREE.InstancedMesh(pineCanopyGeo, pineFoliageMat, pineCoords.length);
  const pineCol = new THREE.Color();

  pineCoords.forEach((pc, i) => {
    const s = pc.scale;
    dummy.position.set(pc.x, valleyY + 3.0 * s, pc.z);
    dummy.rotation.set(0, pc.rot, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    pineTrunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(pc.x, valleyY, pc.z);
    dummy.updateMatrix();
    pineCanopies.setMatrixAt(i, dummy.matrix);

    const shade = valleyHash(i * 11 + 9);
    pineCol.setHSL(0.32 + shade * 0.05, 0.36 + shade * 0.14, 0.062 + shade * 0.036);
    pineCanopies.setColorAt(i, pineCol);
  });
  pineTrunks.instanceMatrix.needsUpdate = true;
  pineCanopies.instanceMatrix.needsUpdate = true;
  if (pineCanopies.instanceColor) pineCanopies.instanceColor.needsUpdate = true;
  pineTrunks.computeBoundingSphere();
  pineCanopies.computeBoundingSphere();
  overworldGroup.add(pineTrunks, pineCanopies);

  // Gnarled dead trees scattered along riverbanks & forest edges
  const deadTreeCount = 75;
  const deadTrunkPart = new THREE.CylinderGeometry(0.18, 0.48, 8.5, 5);
  deadTrunkPart.translate(0, 4.2, 0);
  const deadLimbPart = new THREE.CylinderGeometry(0.08, 0.18, 4.4, 4);
  deadLimbPart.translate(0, 2.2, 0);
  deadLimbPart.rotateZ(-0.72);
  deadLimbPart.translate(0, 5.2, 0);
  const deadTreeGeo = track(mergeGeometries([deadTrunkPart, deadLimbPart])!);
  deadTrunkPart.dispose();
  deadLimbPart.dispose();

  const deadTrees = new THREE.InstancedMesh(deadTreeGeo, valleyBarkMat, deadTreeCount);
  for (let i = 0; i < deadTreeCount; i++) {
    const dx = (valleyHash(i * 5 + 17) - 0.5) * 260;
    const dz = 50 - valleyHash(i * 5 + 19) * 260;
    const s = 0.78 + valleyHash(i * 5 + 23) * 0.8;
    const tilt = (valleyHash(i * 5 + 29) - 0.5) * 0.26;
    const ry = valleyHash(i * 5 + 31) * Math.PI * 2;
    dummy.position.set(dx, valleyY, dz);
    dummy.rotation.set(tilt, ry, tilt * 0.5);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    deadTrees.setMatrixAt(i, dummy.matrix);
  }
  deadTrees.instanceMatrix.needsUpdate = true;
  deadTrees.computeBoundingSphere();
  overworldGroup.add(deadTrees);

  // Mossy rock formations in the deep valley
  const valleyRockCount = 75;
  const valleyRockGeo = track(new THREE.DodecahedronGeometry(3.4, 0));
  const valleyRockMat = track(
    new THREE.MeshLambertMaterial({
      color: 0x5c5b4f,
      map: textures.cliffRock.map,
    }),
  );
  const valleyRocks = new THREE.InstancedMesh(valleyRockGeo, valleyRockMat, valleyRockCount);
  for (let i = 0; i < valleyRockCount; i++) {
    const rx = (valleyHash(i * 7 + 41) - 0.5) * 290;
    const rz = 60 - valleyHash(i * 7 + 43) * 290;
    const sx = 0.7 + valleyHash(i * 7 + 47) * 1.9;
    const sy = 0.5 + valleyHash(i * 7 + 53) * 1.3;
    dummy.position.set(rx, valleyY + sy * 1.1, rz);
    dummy.rotation.set(i * 0.5, i * 1.2, i * 0.3);
    dummy.scale.set(sx, sy, sx * 0.9);
    dummy.updateMatrix();
    valleyRocks.setMatrixAt(i, dummy.matrix);
  }
  valleyRocks.instanceMatrix.needsUpdate = true;
  valleyRocks.computeBoundingSphere();
  overworldGroup.add(valleyRocks);

  // Distant ruined watchtowers & crumbling aqueduct pillars in the misty valley
  const ruinSpecs = [
    { x: -46, z: -74, h: 22, w: 6.5, hasLantern: true },
    { x: 54, z: -64, h: 19, w: 5.8, hasLantern: true },
    { x: -68, z: -132, h: 26, w: 7.2, hasLantern: false },
    { x: 64, z: -128, h: 21, w: 6.0, hasLantern: true },
    { x: -34, z: -22, h: 15, w: 5.0, hasLantern: false },
    { x: 42, z: -168, h: 24, w: 6.8, hasLantern: false },
  ];
  const lanternSpeckMat = track(new THREE.MeshBasicMaterial({ color: 0xffb34d }));
  const valleyStoneMat = track(
    new THREE.MeshLambertMaterial({
      color: 0x9e9584,
      map: textures.mossyStone.map,
    }),
  );
  for (const rs of ruinSpecs) {
    const tower = new THREE.Mesh(
      track(new THREE.BoxGeometry(rs.w, rs.h, rs.w)),
      valleyStoneMat,
    );
    tower.position.set(rs.x, valleyY + rs.h / 2, rs.z);
    tower.rotation.y = rs.x * 0.04;
    overworldGroup.add(tower);

    const crown = new THREE.Mesh(
      track(new THREE.BoxGeometry(rs.w * 0.52, 3.6, rs.w * 0.48)),
      valleyStoneMat,
    );
    crown.position.set(rs.x - rs.w * 0.2, valleyY + rs.h + 1.4, rs.z + rs.w * 0.15);
    overworldGroup.add(crown);

    if (rs.hasLantern) {
      const speck = new THREE.Mesh(track(new THREE.SphereGeometry(0.48, 5, 4)), lanternSpeckMat);
      speck.position.set(rs.x + rs.w * 0.52, valleyY + rs.h * 0.72, rs.z);
      overworldGroup.add(speck);
    }
  }

  // Crumbling valley aqueduct pillars along the silver mist river
  const aqPillarGeo = track(new THREE.BoxGeometry(3.4, 17, 3.4));
  const aqCoords = [
    [-62, -26],
    [-46, -34],
    [-30, -42],
    [32, -88],
    [48, -96],
    [64, -104],
  ];
  const aqPillars = new THREE.InstancedMesh(aqPillarGeo, valleyStoneMat, aqCoords.length);
  aqCoords.forEach((ac, idx) => {
    dummy.position.set(ac[0], valleyY + 7.5 - (idx % 2) * 1.8, ac[1]);
    dummy.rotation.set(0, 0.42, 0);
    dummy.scale.set(1, 1 - (idx % 3) * 0.14, 1);
    dummy.updateMatrix();
    aqPillars.setMatrixAt(idx, dummy.matrix);
  });
  aqPillars.instanceMatrix.needsUpdate = true;
  aqPillars.computeBoundingSphere();
  overworldGroup.add(aqPillars);

  // Drifting mist planes low in the forested valley (kept safely below Sunken Terrace y=-14)
  const mistLayerGeo = track(new THREE.PlaneGeometry(290, 170));
  const mistLayerMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x8f7c62,
      transparent: true,
      opacity: 0.19,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(mistLayerGeo, mistLayerMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((i % 2 === 0 ? -1 : 1) * 24, -27 - i * 3.5, -45 - i * 38);
    overworldGroup.add(m);
  }

  // =========================================================================
  // 1C. 360-DEGREE DISTANT MOUNTAIN RANGE HORIZON BACKDROP
  // =========================================================================
  const mountainMat = track(
    new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: textures.cliffRock.map,
    }),
  );
  const mountainPeakGeo = track(new THREE.ConeGeometry(44, 130, 6));
  mountainPeakGeo.translate(0, 65, 0);

  const mountainRidgeGeo = track(new THREE.DodecahedronGeometry(38, 0));

  const mountainSpecs: Array<{
    x: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    ry: number;
    hue: number;
    sat: number;
    light: number;
    isPeak: boolean;
  }> = [];

  const ringCenterZ = -95;
  // Inner mountain ring (r = 235..295m, pushed behind Citadel, extended Hinterland Woods, Academy & Hamlet)
  const innerCount = 44;
  for (let i = 0; i < innerCount; i++) {
    const angle = (i / innerCount) * Math.PI * 2 + (valleyHash(i * 13 + 3) - 0.5) * 0.06;
    let rad = 235 + valleyHash(i * 13 + 7) * 58;
    let mx = Math.sin(angle) * rad;
    let mz = ringCenterZ - Math.cos(angle) * rad;
    if (mz < -240 && mz > -1060 && mx > -310 && mx < 300) {
      rad = Math.max(rad, 1020);
      mx = Math.sin(angle) * rad;
      mz = ringCenterZ - Math.cos(angle) * rad;
    }

    // Dip mountain height directly behind the Citadel & Spectral Great Tree so the tree silhouettes cleanly
    const inTreeCorridor = mz < -265 && mx > -48 && mx < 115;
    const hFactor = inTreeCorridor ? 0.36 : 0.75 + valleyHash(i * 13 + 11) * 0.65;
    const wFactor = 0.85 + valleyHash(i * 13 + 17) * 0.65;
    const shade = valleyHash(i * 13 + 19);

    // Cool slate-frost tint for northern Hinterland & western Snowy Valley foothills; warm dusk for Sanctuary ring
    const isCoolAlpine = mz < -340 || mx < -170;

    mountainSpecs.push({
      x: mx,
      z: mz,
      sx: wFactor,
      sy: hFactor,
      sz: wFactor * (0.85 + valleyHash(i * 13 + 23) * 0.35),
      ry: valleyHash(i * 13 + 29) * Math.PI * 2,
      hue: isCoolAlpine ? 0.56 + shade * 0.03 : 0.08 + shade * 0.03,
      sat: isCoolAlpine ? 0.12 + shade * 0.06 : 0.14 + shade * 0.08,
      light: isCoolAlpine ? 0.26 + shade * 0.14 : 0.16 + shade * 0.08,
      isPeak: true,
    });

    // Flanking shoulder ridge crag to close horizon gaps
    const rAngle = angle + Math.PI / innerCount;
    let rRad = rad - 18;
    let rx = Math.sin(rAngle) * rRad;
    let rz = ringCenterZ - Math.cos(rAngle) * rRad;
    if (rz < -240 && rz > -1060 && rx > -310 && rx < 300) {
      rRad = Math.max(rRad, 1035);
      rx = Math.sin(rAngle) * rRad;
      rz = ringCenterZ - Math.cos(rAngle) * rRad;
    }
    const isCoolRidge = rz < -340 || rx < -170;
    mountainSpecs.push({
      x: rx,
      z: rz,
      sx: 1.2 + valleyHash(i * 17 + 31) * 0.65,
      sy: (inTreeCorridor ? 0.55 : 0.95 + valleyHash(i * 17 + 37) * 0.85),
      sz: 1.15 + valleyHash(i * 17 + 41) * 0.55,
      ry: valleyHash(i * 17 + 43) * Math.PI * 2,
      hue: isCoolRidge ? 0.56 + shade * 0.02 : 0.08 + shade * 0.02,
      sat: isCoolRidge ? 0.1 + shade * 0.05 : 0.12 + shade * 0.06,
      light: isCoolRidge ? 0.24 + shade * 0.12 : 0.14 + shade * 0.07,
      isPeak: false,
    });
  }

  // Outer colossal alpine skyline ring (r = 340..435m, 52 towering peaks)
  const outerCount = 52;
  for (let i = 0; i < outerCount; i++) {
    const angle = (i / outerCount) * Math.PI * 2 + (valleyHash(i * 19 + 5) - 0.5) * 0.05;
    let rad = 340 + valleyHash(i * 19 + 9) * 95;
    let mx = Math.sin(angle) * rad;
    let mz = ringCenterZ - Math.cos(angle) * rad;
    if (mz < -240 && mz > -1060 && mx > -310 && mx < 300) {
      rad = Math.max(rad, 1055);
      mx = Math.sin(angle) * rad;
      mz = ringCenterZ - Math.cos(angle) * rad;
    }
    const inTreeCorridor = mz < -310 && mx > -56 && mx < 120;
    const hFactor = inTreeCorridor ? 0.42 : 1.15 + valleyHash(i * 19 + 13) * 0.98;
    const wFactor = 1.15 + valleyHash(i * 19 + 17) * 0.85;
    const shade = valleyHash(i * 19 + 21);
    const isCoolOuter = mz < -340 || mx < -170;

    mountainSpecs.push({
      x: mx,
      z: mz,
      sx: wFactor,
      sy: hFactor,
      sz: wFactor * (0.9 + valleyHash(i * 19 + 27) * 0.35),
      ry: valleyHash(i * 19 + 33) * Math.PI * 2,
      hue: isCoolOuter ? 0.56 + shade * 0.03 : 0.075 + shade * 0.035,
      sat: isCoolOuter ? 0.12 + shade * 0.06 : 0.12 + shade * 0.08,
      light: isCoolOuter ? 0.3 + shade * 0.16 : 0.18 + shade * 0.09,
      isPeak: true,
    });
  }

  const peakItems = mountainSpecs.filter((m) => m.isPeak);
  const ridgeItems = mountainSpecs.filter((m) => !m.isPeak);

  const mountainPeaksMesh = new THREE.InstancedMesh(mountainPeakGeo, mountainMat, peakItems.length);
  const mountainCol = new THREE.Color();
  peakItems.forEach((m, idx) => {
    dummy.position.set(m.x, valleyY - 4, m.z);
    dummy.rotation.set(0, m.ry, 0);
    dummy.scale.set(m.sx, m.sy, m.sz);
    dummy.updateMatrix();
    mountainPeaksMesh.setMatrixAt(idx, dummy.matrix);
    mountainCol.setHSL(m.hue, m.sat, m.light);
    mountainPeaksMesh.setColorAt(idx, mountainCol);
  });
  mountainPeaksMesh.instanceMatrix.needsUpdate = true;
  if (mountainPeaksMesh.instanceColor) mountainPeaksMesh.instanceColor.needsUpdate = true;
  mountainPeaksMesh.computeBoundingBox();
  mountainPeaksMesh.computeBoundingSphere();
  overworldGroup.add(mountainPeaksMesh);

  const mountainRidgesMesh = new THREE.InstancedMesh(mountainRidgeGeo, mountainMat, ridgeItems.length);
  ridgeItems.forEach((m, idx) => {
    dummy.position.set(m.x, valleyY + 12 * m.sy, m.z);
    dummy.rotation.set((idx % 3) * 0.18, m.ry, (idx % 2) * 0.14);
    dummy.scale.set(m.sx, m.sy, m.sz);
    dummy.updateMatrix();
    mountainRidgesMesh.setMatrixAt(idx, dummy.matrix);
    mountainCol.setHSL(m.hue, m.sat, m.light);
    mountainRidgesMesh.setColorAt(idx, mountainCol);
  });
  mountainRidgesMesh.instanceMatrix.needsUpdate = true;
  if (mountainRidgesMesh.instanceColor) mountainRidgesMesh.instanceColor.needsUpdate = true;
  mountainRidgesMesh.computeBoundingBox();
  mountainRidgesMesh.computeBoundingSphere();
  overworldGroup.add(mountainRidgesMesh);

  // =========================================================================
  // 2. STARTING AREA — THE RUINED FIRELINK SANCTUARY (z ≈ 0)
  // =========================================================================
  const sanctuaryGroup = new THREE.Group();
  overworldGroup.add(sanctuaryGroup);

  // Cliff pedestal supporting the rotunda (grounded into y=-45 valley floor)
  const cliffBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(18.5, 13.0, 48, 16)),
    cliffMat,
  );
  cliffBase.position.set(0, -24.0, 0);
  cliffBase.receiveShadow = true;
  sanctuaryGroup.add(cliffBase);

  // Outer stone platform ring (y = 0, outside sunken pit r = 4.1..16.2)
  const rotundaRingShape = new THREE.Shape();
  rotundaRingShape.absarc(0, 0, 16.2, 0, Math.PI * 2, false);
  const pitHole = new THREE.Path();
  pitHole.absarc(0, 0, WORLD.pitOuterRadius - 0.15, 0, Math.PI * 2, true);
  rotundaRingShape.holes.push(pitHole);

  const rotundaFloorGeo = track(
    new THREE.ExtrudeGeometry(rotundaRingShape, { depth: 0.8, bevelEnabled: false, curveSegments: 32 }),
  );
  rotundaFloorGeo.rotateX(Math.PI / 2);
  // Normalize ExtrudeGeometry world-meter UVs so flagstones match architectural scale
  const rotUv = rotundaFloorGeo.attributes.uv;
  for (let i = 0; i < rotUv.count; i++) {
    rotUv.setXY(i, rotUv.getX(i) * 0.08, rotUv.getY(i) * 0.08);
  }
  rotUv.needsUpdate = true;
  const rotundaFloor = addWalkable(new THREE.Mesh(rotundaFloorGeo, flagstoneMat));
  rotundaFloor.position.y = 0.01;
  rotundaFloor.receiveShadow = true;
  sanctuaryGroup.add(rotundaFloor);

  // Stepped dark marble rim around sunken bonfire pit
  const pitRim = new THREE.Mesh(
    track(new THREE.TorusGeometry(WORLD.pitOuterRadius, 0.32, 8, 36)),
    marbleMat,
  );
  pitRim.rotation.x = Math.PI / 2;
  pitRim.position.y = -0.05;
  pitRim.receiveShadow = true;
  pitRim.castShadow = true;
  sanctuaryGroup.add(pitRim);

  const pitMidStep = addWalkable(
    new THREE.Mesh(track(new THREE.RingGeometry(WORLD.pitInnerRadius, WORLD.pitOuterRadius, 36)), marbleMat),
  );
  pitMidStep.rotation.x = -Math.PI / 2;
  pitMidStep.position.y = -0.32;
  pitMidStep.receiveShadow = true;
  sanctuaryGroup.add(pitMidStep);

  const pitFloor = addWalkable(
    new THREE.Mesh(track(new THREE.CircleGeometry(WORLD.pitInnerRadius + 0.35, 32)), flagstoneMat),
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = WORLD.pitDepth;
  pitFloor.receiveShadow = true;
  sanctuaryGroup.add(pitFloor);

  // Centerpiece Bonfire: Ash mound, coiled greatsword, glowing embers & PointLight
  const bonfireGroup = new THREE.Group();
  bonfireGroup.position.set(0, WORLD.pitDepth, 0);
  sanctuaryGroup.add(bonfireGroup);

  const ashMound = new THREE.Mesh(
    track(new THREE.ConeGeometry(1.18, 0.52, 12)),
    track(new THREE.MeshStandardMaterial({ color: 0x26211e, roughness: 0.96, metalness: 0.02 })),
  );
  ashMound.position.y = 0.24;
  ashMound.receiveShadow = true;
  bonfireGroup.add(ashMound);

  const emberCore = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.45, 10, 8)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xff6a1a,
        emissive: new THREE.Color(0xff5500),
        emissiveIntensity: 2.2,
        roughness: 0.4,
      }),
    ),
  );
  emberCore.scale.set(1.2, 0.4, 1.2);
  emberCore.position.y = 0.38;
  bonfireGroup.add(emberCore);

  // Charred logs & bones surrounding the bonfire embers
  const logGeo = track(new THREE.CylinderGeometry(0.08, 0.1, 1.15, 7));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const log = new THREE.Mesh(logGeo, barkMat);
    log.position.set(Math.cos(a) * 0.45, 0.25, Math.sin(a) * 0.45);
    log.rotation.z = Math.PI / 2 - 0.35;
    log.rotation.y = a;
    log.castShadow = true;
    bonfireGroup.add(log);
  }

  // Coiled Greatsword embedded in ash
  const coiledBladeMat = track(
    new THREE.MeshStandardMaterial({ color: 0x5c5b62, metalness: 0.85, roughness: 0.35 }),
  );
  const coiledBlade = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.11, 1.75, 0.035)),
    coiledBladeMat,
  );
  coiledBlade.position.set(0, 1.05, 0);
  coiledBlade.rotation.z = 0.14;
  coiledBlade.rotation.x = -0.06;
  coiledBlade.castShadow = true;
  bonfireGroup.add(coiledBlade);

  const coiledGuard = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.07, 0.08)), coiledBladeMat);
  coiledGuard.position.set(-0.08, 1.56, -0.03);
  coiledGuard.rotation.z = 0.14;
  bonfireGroup.add(coiledGuard);

  const coiledPommel = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.065, 0)), coiledBladeMat);
  coiledPommel.position.set(-0.14, 1.92, -0.06);
  bonfireGroup.add(coiledPommel);

  // Dynamic flame cones
  const flameMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xff8c2b,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const flameCones: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const fc = new THREE.Mesh(track(new THREE.ConeGeometry(0.28 - i * 0.06, 0.9 - i * 0.15, 7)), flameMat);
    fc.position.set((i - 1) * 0.12, 0.65 + i * 0.08, (i % 2 === 0 ? 1 : -1) * 0.08);
    bonfireGroup.add(fc);
    flameCones.push(fc);
  }

  const bonfireLight = new THREE.PointLight(0xff8c36, 12.0, 26, 1.4);
  bonfireLight.position.set(0, WORLD.pitDepth + 1.5, 0);
  overworldGroup.add(bonfireLight);

  // Crumbling Rotunda Columns & Gothic/Romanesque Archways (InstancedMesh + arches)
  const colShaftGeo = track(new THREE.CylinderGeometry(0.55, 0.64, 7.4, 12));
  const colCapGeo = track(new THREE.BoxGeometry(1.55, 0.55, 1.55));
  const colCount = 12;
  const rotundaCols = new THREE.InstancedMesh(colShaftGeo, stoneMat, colCount);
  const rotundaCaps = new THREE.InstancedMesh(colCapGeo, marbleMat, colCount);
  rotundaCols.castShadow = true;
  rotundaCols.receiveShadow = true;

  const archShape = createArchShape(5.4, 5.2, 0.72);
  const archGeo = track(
    new THREE.ExtrudeGeometry(archShape, { depth: 0.95, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06 }),
  );
  archGeo.translate(0, 0, -0.475);

  let colIdx = 0;
  for (let i = 0; i < colCount; i++) {
    const angle = (i / colCount) * Math.PI * 2;
    const x = Math.sin(angle) * 14.0;
    const z = -Math.cos(angle) * 14.0;
    const isNorthGap = z < -10.5 && Math.abs(x) < 5.6;
    const isSouthGap = z > 10.5 && Math.abs(x) < 4.5;

    if (isNorthGap || isSouthGap) {
      // Place low broken plinth stumps so count stays deterministic or scale to 0
      dummy.position.set(x, -100, z);
      dummy.scale.setScalar(0.01);
      dummy.updateMatrix();
      rotundaCols.setMatrixAt(colIdx, dummy.matrix);
      rotundaCaps.setMatrixAt(colIdx, dummy.matrix);
      colIdx++;
      continue;
    }

    const broken = i % 3 === 1;
    const hScale = broken ? 0.52 + (i % 2) * 0.22 : 1.0;
    dummy.position.set(x, (7.4 * hScale) / 2, z);
    dummy.rotation.set(0, -angle, 0);
    dummy.scale.set(1, hScale, 1);
    dummy.updateMatrix();
    rotundaCols.setMatrixAt(colIdx, dummy.matrix);

    if (!broken) {
      dummy.position.set(x, 7.55, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rotundaCaps.setMatrixAt(colIdx, dummy.matrix);
    } else {
      dummy.position.set(x, -100, z);
      dummy.scale.setScalar(0.01);
      dummy.updateMatrix();
      rotundaCaps.setMatrixAt(colIdx, dummy.matrix);
    }
    colIdx++;

    // Connect adjacent unbroken columns with crumbling Romanesque archways
    const nextI = (i + 1) % colCount;
    const nextBroken = nextI % 3 === 1;
    const nextAngle = (nextI / colCount) * Math.PI * 2;
    const nx = Math.sin(nextAngle) * 14.0;
    const nz = -Math.cos(nextAngle) * 14.0;
    const nextNorthGap = nz < -10.5 && Math.abs(nx) < 5.6;
    const nextSouthGap = nz > 10.5 && Math.abs(nx) < 4.5;

    if (!broken && !nextBroken && !nextNorthGap && !nextSouthGap) {
      const midX = (x + nx) * 0.5;
      const midZ = (z + nz) * 0.5;
      const arch = new THREE.Mesh(archGeo, stoneMat);
      arch.position.set(midX, 4.4, midZ);
      arch.rotation.y = Math.atan2(nx - x, nz - z) + Math.PI / 2;
      arch.castShadow = true;
      arch.receiveShadow = true;
      sanctuaryGroup.add(arch);
    }
  }
  rotundaCols.instanceMatrix.needsUpdate = true;
  rotundaCaps.instanceMatrix.needsUpdate = true;
  rotundaCols.computeBoundingSphere();
  rotundaCaps.computeBoundingSphere();
  sanctuaryGroup.add(rotundaCols, rotundaCaps);

  // Overgrown curved stone benches
  for (const side of [-1, 1]) {
    const bench = new THREE.Group();
    bench.position.set(side * 7.2, 0, 4.0);
    bench.rotation.y = side * 0.55;
    const seat = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 0.32, 0.9)), marbleMat);
    seat.position.y = 0.58;
    seat.castShadow = true;
    seat.receiveShadow = true;
    bench.add(seat);
    for (const lx of [-0.95, 0.95]) {
      const leg = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.5, 0.76)), stoneMat);
      leg.position.set(lx, 0.25, 0);
      leg.castShadow = true;
      bench.add(leg);
    }
    sanctuaryGroup.add(bench);
  }

  // Gnarled ancient tree leaning over eastern sanctuary wall
  const treeGroup = new THREE.Group();
  treeGroup.position.set(12.2, 0, -2.5);
  sanctuaryGroup.add(treeGroup);

  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.4, 2.5, -0.4),
    new THREE.Vector3(-0.8, 5.4, -0.9),
    new THREE.Vector3(-3.2, 8.2, -1.3),
    new THREE.Vector3(-5.8, 9.6, -0.6),
  ]);
  const trunkMesh = new THREE.Mesh(track(new THREE.TubeGeometry(trunkCurve, 18, 0.72, 8, false)), barkMat);
  trunkMesh.castShadow = true;
  treeGroup.add(trunkMesh);

  const branchCurves = [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.8, 5.4, -0.9),
      new THREE.Vector3(1.8, 7.8, 0.6),
      new THREE.Vector3(3.4, 9.1, 1.5),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.2, 8.2, -1.3),
      new THREE.Vector3(-4.5, 10.6, -2.9),
      new THREE.Vector3(-6.2, 11.4, -3.5),
    ]),
  ];
  for (const bc of branchCurves) {
    const bm = new THREE.Mesh(track(new THREE.TubeGeometry(bc, 10, 0.28, 7, false)), barkMat);
    bm.castShadow = true;
    treeGroup.add(bm);
  }

  // Golden-amber twilight leaf canopies on the ancient tree (InstancedMesh)
  const canopyGeo = track(new THREE.DodecahedronGeometry(0.95, 0));
  const canopyPositions = [
    [-5.8, 9.9, -0.6],
    [-4.2, 10.3, -1.8],
    [-6.3, 11.5, -3.5],
    [-2.4, 9.6, -1.1],
    [3.4, 9.3, 1.5],
    [1.8, 8.4, 0.6],
    [-5.1, 10.9, 0.7],
    [-6.9, 10.4, -2.2],
    [-3.5, 10.8, 0.2],
    [2.6, 9.6, 1.1],
  ];
  const treeCanopy = new THREE.InstancedMesh(canopyGeo, foliageMat, canopyPositions.length);
  const leafColor = new THREE.Color();
  canopyPositions.forEach((p, idx) => {
    dummy.position.set(p[0], p[1], p[2]);
    dummy.rotation.set(idx * 0.4, idx * 0.8, idx * 0.3);
    dummy.scale.set(1.35, 0.68, 1.2);
    dummy.updateMatrix();
    treeCanopy.setMatrixAt(idx, dummy.matrix);
    leafColor.setHSL(0.075 + (idx % 3) * 0.015, 0.62, 0.36 + (idx % 2) * 0.08);
    treeCanopy.setColorAt(idx, leafColor);
  });
  treeCanopy.instanceMatrix.needsUpdate = true;
  if (treeCanopy.instanceColor) treeCanopy.instanceColor.needsUpdate = true;
  treeCanopy.castShadow = true;
  treeGroup.add(treeCanopy);

  // =========================================================================
  // 3. THE PILGRIM'S ASCENT & GRAND VIADUCT (z = -14 to -166)
  // =========================================================================
  const viaductGroup = new THREE.Group();
  overworldGroup.add(viaductGroup);

  // Sanctuary Apron (-13.5 to -22)
  const apronMesh = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(10.6, 4.0, 9.5)), flagstoneMat),
  );
  apronMesh.position.set(0, -1.2, -17.8);
  apronMesh.rotation.x = 0.16;
  apronMesh.receiveShadow = true;
  viaductGroup.add(apronMesh);

  // Lower Monumental Stone Staircase (-22 to -52, rising y = 1.5 -> 10.0)
  const lowerSteps = 40;
  const stepGeo = track(new THREE.BoxGeometry(9.4, 0.45, 0.92));
  const lowerStairMesh = addWalkable(new THREE.InstancedMesh(stepGeo, flagstoneMat, lowerSteps));
  lowerStairMesh.receiveShadow = true;
  lowerStairMesh.castShadow = true;

  for (let i = 0; i < lowerSteps; i++) {
    const t = (i + 0.5) / lowerSteps;
    const z = THREE.MathUtils.lerp(WORLD.lowerStairStartZ, WORLD.lowerStairEndZ, t);
    const y = THREE.MathUtils.lerp(1.5, WORLD.viaductBaseY, t) - 0.18;
    dummy.position.set(0, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lowerStairMesh.setMatrixAt(i, dummy.matrix);
  }
  lowerStairMesh.instanceMatrix.needsUpdate = true;
  lowerStairMesh.computeBoundingBox();
  lowerStairMesh.computeBoundingSphere();
  viaductGroup.add(lowerStairMesh);

  // Solid rocky embankment under lower stairs (grounded into y=-45 valley floor)
  const lowerRampBase = new THREE.Mesh(track(new THREE.BoxGeometry(10.4, 18, 33)), cliffMat);
  lowerRampBase.position.set(0, -3.5, -36.5);
  lowerRampBase.rotation.x = 0.275;
  lowerRampBase.receiveShadow = true;
  viaductGroup.add(lowerRampBase);

  const lowerCliffAbutment = new THREE.Mesh(track(new THREE.BoxGeometry(10.2, 46, 30)), cliffMat);
  lowerCliffAbutment.position.set(0, -24.0, -37.5);
  lowerCliffAbutment.receiveShadow = true;
  viaductGroup.add(lowerCliffAbutment);

  // Grand Multi-Arched Viaduct Deck (-52 to -138)
  const deckSegs = 28;
  const deckGeo = track(new THREE.BoxGeometry(11.4, 1.4, 3.25));
  const viaductDeck = addWalkable(new THREE.InstancedMesh(deckGeo, flagstoneMat, deckSegs));
  viaductDeck.receiveShadow = true;
  viaductDeck.castShadow = true;

  for (let i = 0; i < deckSegs; i++) {
    const t = (i + 0.5) / deckSegs;
    const z = THREE.MathUtils.lerp(WORLD.viaductStartZ, WORLD.viaductEndZ, t);
    const camber = Math.sin(t * Math.PI) * 0.55;
    const slope = (Math.cos(t * Math.PI) * Math.PI * 0.55) / (WORLD.viaductStartZ - WORLD.viaductEndZ);
    dummy.position.set(0, WORLD.viaductBaseY + camber - 0.7, z);
    dummy.rotation.set(-slope, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    viaductDeck.setMatrixAt(i, dummy.matrix);
  }
  viaductDeck.instanceMatrix.needsUpdate = true;
  viaductDeck.computeBoundingBox();
  viaductDeck.computeBoundingSphere();
  viaductGroup.add(viaductDeck);

  // Viaduct Parapet Battlements (InstancedMesh along both sides, with a broken opening on east side at z = -55..-61)
  const parapetCount = 56;
  const parapetPostGeo = track(new THREE.BoxGeometry(0.75, 1.35, 1.1));
  const parapetMatrices: Array<{ pos: [number, number, number]; scaleY: number }> = [];
  for (let i = 0; i < parapetCount; i++) {
    const t = (i + 0.5) / parapetCount;
    const z = THREE.MathUtils.lerp(WORLD.viaductStartZ, WORLD.viaductEndZ, t);
    const camber = Math.sin(t * Math.PI) * 0.55;
    for (const side of [-1, 1]) {
      // Leave broken stone parapet gap on eastern edge (side === 1) near base of viaduct (-55..-61)
      if (side === 1 && z <= -54.8 && z >= -61.4) continue;
      parapetMatrices.push({
        pos: [side * 5.45, WORLD.viaductBaseY + camber + 0.58, z],
        scaleY: i % 2 === 0 ? 1.0 : 0.65,
      });
    }
  }
  const parapets = new THREE.InstancedMesh(parapetPostGeo, stoneMat, parapetMatrices.length);
  parapets.castShadow = true;
  parapets.receiveShadow = true;
  parapetMatrices.forEach((pm, idx) => {
    dummy.position.set(pm.pos[0], pm.pos[1], pm.pos[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, pm.scaleY, 1);
    dummy.updateMatrix();
    parapets.setMatrixAt(idx, dummy.matrix);
  });
  parapets.instanceMatrix.needsUpdate = true;
  parapets.computeBoundingSphere();
  viaductGroup.add(parapets);

  // Broken parapet rubble blocks marking the secret descent over the east edge
  const rubbleCoords: Array<[number, number, number, number]> = [
    [5.35, 10.22, -55.2, 0.35],
    [5.6, 10.12, -61.2, -0.42],
    [5.8, 9.3, -57.8, 0.18],
  ];
  for (const rc of rubbleCoords) {
    const rb = new THREE.Mesh(track(new THREE.BoxGeometry(0.85, 0.45, 0.95)), stoneMat);
    rb.position.set(rc[0], rc[1], rc[2]);
    rb.rotation.set(0.15, rc[3], -0.25);
    rb.castShadow = true;
    rb.receiveShadow = true;
    viaductGroup.add(rb);
  }

  // Colossal Multi-Arched Bridge Piers descending into the Forest Valley (y = -45)
  // Piers 3 (z=-103.2) and 4 (z=-119.6) form open vaulted twin-pillar portals across the Sunken Terrace!
  const pierCount = 6;
  const solidPierGeo = track(new THREE.BoxGeometry(10.8, 56, 3.8));
  const portalUpperGeo = track(new THREE.BoxGeometry(10.8, 12.2, 3.8));
  const portalColumnGeo = track(new THREE.BoxGeometry(2.1, 13.0, 3.6));
  const portalBaseGeo = track(new THREE.BoxGeometry(11.4, 32.0, 4.2));

  const spanArchShape = createArchShape(12.2, 7.6, 1.8);
  const spanArchGeo = track(
    new THREE.ExtrudeGeometry(spanArchShape, { depth: 9.8, bevelEnabled: false }),
  );
  spanArchGeo.translate(0, 0, -4.9);
  spanArchGeo.rotateY(Math.PI / 2);

  for (let i = 0; i < pierCount; i++) {
    const z = THREE.MathUtils.lerp(-54, -136, i / (pierCount - 1));
    if (i === 3 || i === 4) {
      // Open vaulted portal pier spanning the Sunken Catacomb Terrace (y = -14)
      const upperBlock = new THREE.Mesh(portalUpperGeo, stoneMat);
      upperBlock.position.set(0, 4.0, z);
      upperBlock.castShadow = true;
      upperBlock.receiveShadow = true;
      viaductGroup.add(upperBlock);

      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(portalColumnGeo, marbleMat);
        leg.position.set(side * 4.6, -8.0, z);
        leg.castShadow = true;
        leg.receiveShadow = true;
        viaductGroup.add(leg);
      }

      const underBase = new THREE.Mesh(portalBaseGeo, stoneMat);
      underBase.position.set(0, -30.5, z);
      underBase.receiveShadow = true;
      viaductGroup.add(underBase);
    } else {
      const pier = new THREE.Mesh(solidPierGeo, stoneMat);
      pier.position.set(0, -18.5, z);
      pier.castShadow = true;
      pier.receiveShadow = true;
      viaductGroup.add(pier);
    }

    if (i < pierCount - 1) {
      const nextZ = THREE.MathUtils.lerp(-54, -136, (i + 1) / (pierCount - 1));
      const midZ = (z + nextZ) * 0.5;
      const arch = new THREE.Mesh(spanArchGeo, stoneMat);
      arch.position.set(0, 1.1, midZ);
      arch.castShadow = true;
      arch.receiveShadow = true;
      viaductGroup.add(arch);
    }
  }

  // Upper Citadel Ascent Staircase (-138 to -166, y = 10 -> 18)
  const upperSteps = 34;
  const upperStepGeo = track(new THREE.BoxGeometry(12.4, 0.45, 0.95));
  const upperStairMesh = addWalkable(new THREE.InstancedMesh(upperStepGeo, flagstoneMat, upperSteps));
  upperStairMesh.receiveShadow = true;
  upperStairMesh.castShadow = true;

  for (let i = 0; i < upperSteps; i++) {
    const t = (i + 0.5) / upperSteps;
    const z = THREE.MathUtils.lerp(WORLD.upperStairStartZ, WORLD.upperStairEndZ, t);
    const y = THREE.MathUtils.lerp(WORLD.viaductBaseY, WORLD.courtyardY, t) - 0.18;
    const wScale = 0.85 + t * 0.25;
    dummy.position.set(0, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(wScale, 1, 1);
    dummy.updateMatrix();
    upperStairMesh.setMatrixAt(i, dummy.matrix);
  }
  upperStairMesh.instanceMatrix.needsUpdate = true;
  upperStairMesh.computeBoundingBox();
  upperStairMesh.computeBoundingSphere();
  viaductGroup.add(upperStairMesh);

  const upperRampBase = new THREE.Mesh(track(new THREE.BoxGeometry(14, 24, 32)), cliffMat);
  upperRampBase.position.set(0, 2.0, -152);
  upperRampBase.rotation.x = 0.28;
  upperRampBase.receiveShadow = true;
  viaductGroup.add(upperRampBase);

  // Towering Weathered Stone Sentinel Statues along the Viaduct
  const createSentinelStatue = (x: number, y: number, z: number, facingLeft: boolean) => {
    const sg = new THREE.Group();
    sg.position.set(x, y, z);
    sg.rotation.y = facingLeft ? -Math.PI / 2 : Math.PI / 2;

    const plinth = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 4.2, 3.2)), marbleMat);
    plinth.position.y = 2.1;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    sg.add(plinth);

    const robe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.95, 1.45, 5.2, 8)), stoneMat);
    robe.position.y = 6.7;
    robe.castShadow = true;
    sg.add(robe);

    const shoulders = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 1.1, 1.2)), stoneMat);
    shoulders.position.y = 9.1;
    shoulders.castShadow = true;
    sg.add(shoulders);

    const hood = new THREE.Mesh(track(new THREE.ConeGeometry(0.75, 1.5, 6)), stoneMat);
    hood.position.y = 10.3;
    hood.castShadow = true;
    sg.add(hood);

    const sword = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 5.2, 0.14)), marbleMat);
    sword.position.set(0, 6.8, 1.1);
    sg.add(sword);

    const guard = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 0.2, 0.22)), marbleMat);
    guard.position.set(0, 8.6, 1.1);
    sg.add(guard);

    viaductGroup.add(sg);
  };

  for (const z of [-68, -95, -122]) {
    const t = (WORLD.viaductStartZ - z) / (WORLD.viaductStartZ - WORLD.viaductEndZ);
    const y = WORLD.viaductBaseY + Math.sin(t * Math.PI) * 0.55 - 2.4;
    createSentinelStatue(-7.4, y, z, false);
    createSentinelStatue(7.4, y, z, true);
  }

  // Colossal Perched Stone Dragon Monument on the Eastern Chasm Cliff (Leyndell homage)
  const dragonCliff = new THREE.Group();
  dragonCliff.position.set(42, -10, -100);
  dragonCliff.rotation.y = -0.68;
  viaductGroup.add(dragonCliff);

  // Craggy rock pinnacle under the dragon (grounded into y=-45 valley floor)
  const dragonSpireBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(10.5, 16.5, 44, 8)),
    cliffMat,
  );
  dragonSpireBase.position.set(0, -15, 0);
  dragonSpireBase.receiveShadow = true;
  dragonCliff.add(dragonSpireBase);

  for (let i = 0; i < 3; i++) {
    const crag = new THREE.Mesh(track(new THREE.DodecahedronGeometry(11 - i * 2.2, 1)), cliffMat);
    crag.position.set((i - 1) * 3.5, 6 + i * 7, -i * 1.5);
    crag.scale.set(1.3, 1.6, 1.1);
    dragonCliff.add(crag);
  }

  const dragonBody = new THREE.Mesh(track(new THREE.CylinderGeometry(3.0, 4.6, 19, 9)), marbleMat);
  dragonBody.position.set(0, 27, 0);
  dragonBody.rotation.x = 0.58;
  dragonBody.castShadow = true;
  dragonCliff.add(dragonBody);

  const dragonNeck = new THREE.Mesh(track(new THREE.CylinderGeometry(1.5, 2.7, 12, 8)), marbleMat);
  dragonNeck.position.set(0, 36.5, 6.2);
  dragonNeck.rotation.x = 0.22;
  dragonNeck.castShadow = true;
  dragonCliff.add(dragonNeck);

  const dragonHead = new THREE.Mesh(track(new THREE.ConeGeometry(2.2, 6.8, 6)), marbleMat);
  dragonHead.position.set(0, 41.8, 9.6);
  dragonHead.rotation.x = Math.PI * 0.65;
  dragonHead.castShadow = true;
  dragonCliff.add(dragonHead);

  // Dragon horns
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(track(new THREE.ConeGeometry(0.45, 4.2, 5)), marbleMat);
    horn.position.set(side * 1.1, 44.2, 7.6);
    horn.rotation.x = -0.45;
    horn.rotation.z = -side * 0.25;
    dragonCliff.add(horn);
  }

  // Sculpted swept-back bat-like stone wings (ExtrudeGeometry silhouette + curved wing spars)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(24, 11);
  wingShape.quadraticCurveTo(18, 2, 22, -4);
  wingShape.quadraticCurveTo(13, -1, 14, -6);
  wingShape.quadraticCurveTo(7, -2, 0, -5);
  wingShape.closePath();
  const wingGeo = track(
    new THREE.ExtrudeGeometry(wingShape, { depth: 0.9, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2 }),
  );
  wingGeo.translate(0, 0, -0.45);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, marbleMat);
    wing.position.set(side * 2.0, 32, -1);
    wing.scale.x = side;
    wing.rotation.y = -side * 0.32;
    wing.rotation.x = -0.18;
    wing.castShadow = true;
    dragonCliff.add(wing);
  }

  // Flickering Iron Braziers along the Pilgrimage Road & Courtyard (InstancedMesh + 3 regional PointLights)
  const brazierPositions: Array<[number, number, number]> = [
    [-4.6, 0.0, -13.5],
    [4.6, 0.0, -13.5],
    [-4.3, 5.8, -37.0],
    [4.3, 5.8, -37.0],
    [-4.8, 10.2, -55.0],
    [4.8, 10.2, -55.0],
    [-4.8, 10.5, -95.0],
    [4.8, 10.5, -95.0],
    [-4.8, 10.2, -135.0],
    [4.8, 10.2, -135.0],
    [-6.0, 18.0, -166.0],
    [6.0, 18.0, -166.0],
    [-9.0, 18.0, -186.0],
    [9.0, 18.0, -186.0],
  ];

  const brazierPedestalGeo = track(new THREE.CylinderGeometry(0.26, 0.38, 1.45, 8));
  const brazierBowlGeo = track(new THREE.CylinderGeometry(0.55, 0.22, 0.42, 8));
  const brazierFlameGeo = track(new THREE.ConeGeometry(0.32, 0.75, 6));

  const brazierPeds = new THREE.InstancedMesh(brazierPedestalGeo, ironMat, brazierPositions.length);
  const brazierBowls = new THREE.InstancedMesh(brazierBowlGeo, ironMat, brazierPositions.length);
  const brazierFlames = new THREE.InstancedMesh(brazierFlameGeo, flameMat, brazierPositions.length);

  brazierPositions.forEach((bp, idx) => {
    dummy.position.set(bp[0], bp[1] + 0.72, bp[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    brazierPeds.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(bp[0], bp[1] + 1.55, bp[2]);
    dummy.updateMatrix();
    brazierBowls.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(bp[0], bp[1] + 1.95, bp[2]);
    dummy.updateMatrix();
    brazierFlames.setMatrixAt(idx, dummy.matrix);
  });
  brazierPeds.instanceMatrix.needsUpdate = true;
  brazierBowls.instanceMatrix.needsUpdate = true;
  brazierFlames.instanceMatrix.needsUpdate = true;
  brazierPeds.computeBoundingSphere();
  brazierBowls.computeBoundingSphere();
  brazierFlames.computeBoundingSphere();
  viaductGroup.add(brazierPeds, brazierBowls, brazierFlames);

  // Strategic unshadowed warm accent PointLights (within <= 4-6 light budget)
  const viaductGlowA = new THREE.PointLight(0xff9238, 9, 28, 1.4);
  viaductGlowA.position.set(0, 13.5, -56);
  overworldGroup.add(viaductGlowA);

  const viaductGlowB = new THREE.PointLight(0xff9238, 9, 28, 1.4);
  viaductGlowB.position.set(0, 13.8, -95);
  overworldGroup.add(viaductGlowB);

  const gateGlow = new THREE.PointLight(0xffa042, 14, 38, 1.3);
  gateGlow.position.set(0, 21.5, -172);
  overworldGroup.add(gateGlow);

  // =========================================================================
  // 3B. UNDER-VIADUCT LEDGES, SCAFFOLDING & SEALED CATACOMB GATE TERRACE
  // =========================================================================
  const underViaductGroup = new THREE.Group();
  overworldGroup.add(underViaductGroup);

  const timberMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x5c422c,
      map: textures.bark.map,
      bumpMap: textures.bark.bumpMap,
      bumpScale: 0.08,
      roughness: 0.88,
      metalness: 0.04,
    }),
  );

  const wetFlagstoneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x9ca4aa,
      map: textures.flagstone.map,
      bumpMap: textures.flagstone.bumpMap,
      bumpScale: 0.04,
      roughnessMap: textures.flagstone.roughnessMap,
      roughness: 0.22,
      metalness: 0.14,
    }),
  );

  const soulFlameMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x6ef6ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  // Ledge 1: Broken stone shelf outside east parapet (x: 4.9..9.8, z: -62..-54.5, y = 8.6)
  const ledge1 = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(4.9, 1.5, 7.5)), stoneMat),
  );
  ledge1.position.set(7.35, 7.85, -58.25);
  ledge1.castShadow = true;
  ledge1.receiveShadow = true;
  underViaductGroup.add(ledge1);

  for (const cz of [-55.6, -60.6]) {
    const corbel = new THREE.Mesh(track(new THREE.BoxGeometry(4.6, 1.2, 1.1)), stoneMat);
    corbel.position.set(6.5, 5.9, cz);
    corbel.rotation.z = 0.48;
    corbel.castShadow = true;
    corbel.receiveShadow = true;
    underViaductGroup.add(corbel);
  }

  // Helper to generate physical stone steps matching sloped stair rects
  const buildStoneStairFlight = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    yStart: number,
    yEnd: number,
    stepCount: number,
    axis: 'z' | 'x',
    parent: THREE.Group = underViaductGroup,
  ) => {
    const w = axis === 'z' ? maxX - minX : (maxX - minX) / stepCount + 0.22;
    const d = axis === 'z' ? (maxZ - minZ) / stepCount + 0.22 : maxZ - minZ;
    const stepH = Math.abs(yStart - yEnd) / stepCount + 0.3;
    const geo = track(new THREE.BoxGeometry(w, stepH, d));
    const mesh = addWalkable(new THREE.InstancedMesh(geo, flagstoneMat, stepCount));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    for (let i = 0; i < stepCount; i++) {
      const t = (i + 0.5) / stepCount;
      const sx = axis === 'z' ? (minX + maxX) * 0.5 : THREE.MathUtils.lerp(maxX, minX, t);
      const sz = axis === 'z' ? THREE.MathUtils.lerp(maxZ, minZ, t) : (minZ + maxZ) * 0.5;
      const sy = THREE.MathUtils.lerp(yStart, yEnd, t) - stepH * 0.5;
      dummy.position.set(sx, sy, sz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    parent.add(mesh);
    return mesh;
  };

  // Stairway 1: z = -62 -> -73, x = 5.8..9.8, y = 8.6 -> 3.0
  buildStoneStairFlight(5.8, 9.8, -73.0, -62.0, 8.6, 3.0, 14, 'z');

  // Helper for Timber & Iron Scaffolding Platforms clinging cleanly underneath deck without stair clipping
  const buildScaffoldingPlatform = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    y: number,
    strutOffsetsZ: number[],
  ) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;

    // Individual weathered timber planks
    const plankCount = 8;
    const plankGeo = track(new THREE.BoxGeometry(w, 0.28, d / plankCount - 0.05));
    const planks = addWalkable(new THREE.InstancedMesh(plankGeo, timberMat, plankCount));
    planks.castShadow = true;
    planks.receiveShadow = true;
    for (let i = 0; i < plankCount; i++) {
      const pz = THREE.MathUtils.lerp(
        minZ + d / (plankCount * 2),
        maxZ - d / (plankCount * 2),
        i / (plankCount - 1),
      );
      dummy.position.set(cx, y - 0.14, pz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      planks.setMatrixAt(i, dummy.matrix);
    }
    planks.instanceMatrix.needsUpdate = true;
    planks.computeBoundingBox();
    planks.computeBoundingSphere();
    underViaductGroup.add(planks);

    // Iron longitudinal under-beams strictly below deck (y - 0.42)
    for (const bx of [minX + 0.35, maxX - 0.35]) {
      const beam = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.3, d - 0.2)), ironMat);
      beam.position.set(bx, y - 0.42, cz);
      underViaductGroup.add(beam);
    }

    // Timber cross-joists + knee-braces anchored strictly below y - 0.45 at safe Z positions away from stair openings
    for (const bz of strutOffsetsZ) {
      const joist = new THREE.Mesh(track(new THREE.BoxGeometry(w - 0.4, 0.24, 0.24)), timberMat);
      joist.position.set(cx, y - 0.42, bz);
      underViaductGroup.add(joist);

      // Diagonal knee-brace tucked completely below the platform (from minX+0.2, y-2.9 up to maxX-0.6, y-0.55)
      const braceLen = Math.hypot(w * 0.72, 2.2);
      const brace = new THREE.Mesh(track(new THREE.BoxGeometry(braceLen, 0.22, 0.22)), timberMat);
      brace.position.set(cx - 0.15, y - 1.72, bz);
      brace.rotation.z = Math.atan2(2.2, w * 0.72);
      brace.castShadow = true;
      underViaductGroup.add(brace);

      // Vertical timber pier-support post along outer edge down to lower rock/scaffolding base
      const supportPost = new THREE.Mesh(track(new THREE.BoxGeometry(0.26, 7.2, 0.26)), timberMat);
      supportPost.position.set(maxX - 0.3, y - 3.9, bz);
      supportPost.castShadow = true;
      underViaductGroup.add(supportPost);

      const bracket = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 0.65, 0.42)), ironMat);
      bracket.position.set(maxX - 0.3, y - 0.45, bz);
      underViaductGroup.add(bracket);
    }

    // Outer east corner timber bollards (non-blocking visual cue for the cliff drop)
    for (const bz of [minZ + 0.35, maxZ - 0.35]) {
      const post = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 1.05, 0.24)), timberMat);
      post.position.set(maxX - 0.2, y + 0.45, bz);
      post.castShadow = true;
      underViaductGroup.add(post);
    }
  };

  // Scaffolding 1: x = 3.0..10.0, z = -80..-73, y = 3.0 (struts tucked at mid-span z = -75.3 & -77.7)
  buildScaffoldingPlatform(3.0, 10.0, -80.0, -73.0, 3.0, [-75.3, -77.7]);

  // Stairway 2: x = 5.5..9.6, z = -91..-80, y = 3.0 -> -4.5
  buildStoneStairFlight(5.5, 9.6, -91.0, -80.0, 3.0, -4.5, 16, 'z');

  // Scaffolding 2: x = 6.2..9.8, z = -100.8..-91.0, y = -4.5 (meets Stairway 3 cleanly along x = 6.2)
  buildScaffoldingPlatform(6.2, 9.8, -100.8, -91.0, -4.5, [-93.5, -98.0]);

  // Lower Stairway 3: descending west onto the Sunken Terrace (x: 6.2 -> -1.5, z: -100.8..-94.6, y: -4.5 -> -14.0)
  buildStoneStairFlight(-1.5, 6.2, -100.8, -94.6, -4.5, -14.0, 18, 'x');

  // Broad Sunken Catacomb Gate Terrace (x: -14.2..8.5, z: -122..-94, y = -14.0)
  const terraceFloor = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(23.2, 1.6, 28.4)), wetFlagstoneMat),
  );
  terraceFloor.position.set(-2.85, WORLD.terraceY - 0.8, -108.0);
  terraceFloor.receiveShadow = true;
  underViaductGroup.add(terraceFloor);

  // Terrace stone curb rim & rocky cliff pedestal descending to y = -45
  const terraceUnderRock = new THREE.Mesh(
    track(new THREE.BoxGeometry(21.4, 32.0, 27.0)),
    cliffMat,
  );
  terraceUnderRock.position.set(-2.8, -30.8, -108.0);
  terraceUnderRock.receiveShadow = true;
  underViaductGroup.add(terraceUnderRock);

  // Sunken Terrace Bonfire at (-2.5, -14.0, -110.5)
  const terraceBonfireGroup = new THREE.Group();
  terraceBonfireGroup.position.set(-2.5, WORLD.terraceY, -110.5);
  underViaductGroup.add(terraceBonfireGroup);

  const tbAsh = new THREE.Mesh(
    track(new THREE.ConeGeometry(1.1, 0.48, 10)),
    track(new THREE.MeshStandardMaterial({ color: 0x241f1c, roughness: 0.96, metalness: 0.02 })),
  );
  tbAsh.position.y = 0.22;
  terraceBonfireGroup.add(tbAsh);

  const tbEmber = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.42, 10, 8)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xff6a1a,
        emissive: new THREE.Color(0xff5500),
        emissiveIntensity: 2.1,
        roughness: 0.4,
      }),
    ),
  );
  tbEmber.scale.set(1.2, 0.4, 1.2);
  tbEmber.position.y = 0.36;
  terraceBonfireGroup.add(tbEmber);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const log = new THREE.Mesh(logGeo, barkMat);
    log.position.set(Math.cos(a) * 0.42, 0.24, Math.sin(a) * 0.42);
    log.rotation.z = Math.PI / 2 - 0.35;
    log.rotation.y = a;
    terraceBonfireGroup.add(log);
  }

  const tbSword = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 1.68, 0.035)), coiledBladeMat);
  tbSword.position.set(0, 1.0, 0);
  tbSword.rotation.z = -0.11;
  terraceBonfireGroup.add(tbSword);

  const tbGuard = new THREE.Mesh(track(new THREE.BoxGeometry(0.44, 0.065, 0.08)), coiledBladeMat);
  tbGuard.position.set(0.06, 1.48, 0);
  tbGuard.rotation.z = -0.11;
  terraceBonfireGroup.add(tbGuard);

  const terraceFlameCones: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const fc = new THREE.Mesh(track(new THREE.ConeGeometry(0.24 - i * 0.05, 0.8 - i * 0.12, 7)), flameMat);
    fc.position.set((i - 1) * 0.1, 0.62 + i * 0.08, (i % 2 === 0 ? 1 : -1) * 0.07);
    terraceBonfireGroup.add(fc);
    terraceFlameCones.push(fc);
  }

  const terraceBonfireLight = new THREE.PointLight(0xff8c36, 9.5, 22, 1.4);
  terraceBonfireLight.position.set(-2.5, WORLD.terraceY + 1.6, -110.5);
  overworldGroup.add(terraceBonfireLight);

  // Monumental Interactive Dungeon Entrance carved into Western Cliff Face (x = -14.2, z = -111.5, facing +X)
  const catacombGateGroup = new THREE.Group();
  catacombGateGroup.position.set(-14.2, WORLD.terraceY, -111.5);
  catacombGateGroup.rotation.y = Math.PI / 2; // local +Z faces +X onto the terrace; local -Z enters tunnel (-X)
  underViaductGroup.add(catacombGateGroup);

  // Framed canyon cliff portal walls leaving a clean 8.4m x 11.4m opening for the tunnel!
  for (const side of [-1, 1]) {
    const cliffFlank = new THREE.Mesh(track(new THREE.BoxGeometry(16, 56, 14)), cliffMat);
    cliffFlank.position.set(side * 12.2, 8, -7.8);
    cliffFlank.receiveShadow = true;
    catacombGateGroup.add(cliffFlank);
  }
  const cliffLintel = new THREE.Mesh(track(new THREE.BoxGeometry(8.8, 25, 14)), cliffMat);
  cliffLintel.position.set(0, 23.9, -7.8);
  cliffLintel.receiveShadow = true;
  catacombGateGroup.add(cliffLintel);

  // Outer Gothic Pointed Stone Archway + Relief Pilasters
  const catacombArchShape = createArchShape(8.4, 11.4, 2.2);
  const catacombArchGeo = track(
    new THREE.ExtrudeGeometry(catacombArchShape, { depth: 3.4, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.14 }),
  );
  catacombArchGeo.translate(0, 0, -1.7);
  const catacombArch = new THREE.Mesh(catacombArchGeo, stoneMat);
  catacombArch.position.set(0, 0, 0);
  catacombArch.castShadow = true;
  catacombArch.receiveShadow = true;
  catacombGateGroup.add(catacombArch);

  // Carved marble pilasters & relief frieze crowning the sealed threshold
  for (const side of [-1, 1]) {
    const pilaster = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 13.8, 2.8)), marbleMat);
    pilaster.position.set(side * 5.6, 6.9, 0.35);
    pilaster.castShadow = true;
    catacombGateGroup.add(pilaster);

    // Carved stone relief medallions on flanking pilasters
    for (const ry of [3.2, 6.4, 9.6]) {
      const relief = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.55, 0)), stoneMat);
      relief.position.set(side * 5.6, ry, 1.75);
      relief.scale.set(1.1, 1.35, 0.35);
      catacombGateGroup.add(relief);
    }
  }

  const tympanum = new THREE.Mesh(track(new THREE.BoxGeometry(9.6, 1.4, 2.2)), marbleMat);
  tympanum.position.set(0, 12.6, 0.4);
  catacombGateGroup.add(tympanum);

  // Heavy Iron-Bound Double Doors pivoted at outer jambs so they swing inward smoothly
  const doorOakMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x221d1a,
      map: textures.bark.map,
      roughness: 0.68,
      metalness: 0.25,
    }),
  );

  const leftDoorPivot = new THREE.Group();
  leftDoorPivot.position.set(-4.2, 0, -0.35);
  catacombGateGroup.add(leftDoorPivot);

  const rightDoorPivot = new THREE.Group();
  rightDoorPivot.position.set(4.2, 0, -0.35);
  catacombGateGroup.add(rightDoorPivot);

  for (const side of [-1, 1] as const) {
    const pivot = side === -1 ? leftDoorPivot : rightDoorPivot;
    const xOff = side === -1 ? 2.08 : -2.08;
    const knockerOff = side === -1 ? 3.25 : -3.25;

    const doorLeaf = new THREE.Mesh(track(new THREE.BoxGeometry(4.16, 11.4, 0.7)), doorOakMat);
    doorLeaf.position.set(xOff, 5.7, 0);
    doorLeaf.receiveShadow = true;
    pivot.add(doorLeaf);

    // Heavy horizontal iron strap bands & riveted bosses
    for (const sy of [1.8, 4.4, 7.0, 9.4]) {
      const strap = new THREE.Mesh(track(new THREE.BoxGeometry(4.0, 0.34, 0.85)), ironMat);
      strap.position.set(xOff, sy, 0.03);
      pivot.add(strap);
    }

    // Iron ring door knocker
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.45, 0.08, 6, 16)), ironMat);
    ring.position.set(knockerOff, 3.4, 0.49);
    pivot.add(ring);
  }

  // Dedicated pale-cyan arcane rune seam sealing the doors shut (fades cleanly when gate opens)
  const doorSealMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x6ef6ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const doorSealSeam = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 10.6, 0.12)), doorSealMat);
  doorSealSeam.position.set(0, 5.4, 0.05);
  catacombGateGroup.add(doorSealSeam);

  // Two Flickering Pale-Cyan Soul Braziers flanking the Dungeon Entrance
  const soulFlameCones: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const bx = 2.0; // local +Z on rotated gate = +X on terrace -> x = -12.2
    const bz = side * 5.2;
    const ped = new THREE.Mesh(track(new THREE.CylinderGeometry(0.32, 0.48, 1.75, 8)), ironMat);
    ped.position.set(bz, 0.88, bx);
    ped.castShadow = true;
    catacombGateGroup.add(ped);

    const bowl = new THREE.Mesh(track(new THREE.CylinderGeometry(0.72, 0.28, 0.55, 8)), ironMat);
    bowl.position.set(bz, 1.95, bx);
    catacombGateGroup.add(bowl);

    for (let k = 0; k < 2; k++) {
      const sf = new THREE.Mesh(
        track(new THREE.ConeGeometry(0.36 - k * 0.1, 1.05 - k * 0.2, 7)),
        soulFlameMat,
      );
      sf.position.set(bz + (k - 0.5) * 0.1, 2.55 + k * 0.12, bx);
      catacombGateGroup.add(sf);
      soulFlameCones.push(sf);
    }
  }

  const soulBrazierLight = new THREE.PointLight(0x52f2ff, 15.0, 26, 1.35);
  soulBrazierLight.position.set(-11.2, WORLD.terraceY + 3.2, -111.5);
  overworldGroup.add(soulBrazierLight);

  // =========================================================================
  // 3C. DESCENDING SUBTERRANEAN STONE TUNNEL & SEALED INNER CRYPT DOOR
  // =========================================================================
  const tunnelGroup = new THREE.Group();
  overworldGroup.add(tunnelGroup);

  const dampTunnelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x868a83,
      map: textures.mossyStone.map,
      bumpMap: textures.mossyStone.bumpMap,
      bumpScale: 0.09,
      roughnessMap: textures.mossyStone.roughnessMap,
      roughness: 0.72,
      metalness: 0.06,
      side: THREE.DoubleSide,
    }),
  );

  const addTunnelWall = (mesh: THREE.Mesh) => {
    tunnelWalls.push(mesh);
    tunnelGroup.add(mesh);
    return mesh;
  };

  // Entry Vestibule Floor (x: -21.0..-13.5, z: -115.2..-107.8, y = -14.0)
  const tunnelEntryFloor = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(8.0, 0.8, 7.6)), wetFlagstoneMat),
  );
  tunnelEntryFloor.position.set(-17.2, -14.4, -111.5);
  tunnelEntryFloor.receiveShadow = true;
  tunnelGroup.add(tunnelEntryFloor);

  // Entry Vestibule Arched Vault Shell & Rib Arches
  const tunnelArchShape = createArchShape(7.4, 6.2, 1.1);
  const entryVaultGeo = track(new THREE.ExtrudeGeometry(tunnelArchShape, { depth: 8.0, bevelEnabled: false }));
  entryVaultGeo.translate(0, 0, -4.0);
  entryVaultGeo.rotateY(Math.PI / 2);
  const entryVault = new THREE.Mesh(entryVaultGeo, dampTunnelMat);
  entryVault.position.set(-17.4, -14.0, -111.5);
  entryVault.receiveShadow = true;
  addTunnelWall(entryVault);

  // Descending Stone Stairway A (westward: x = -21.0 -> -33.0, y = -14.0 -> -19.0)
  buildStoneStairFlight(-33.0, -21.0, -115.0, -108.0, -14.0, -19.0, 16, 'x', tunnelGroup);

  // Under-stair solid masonry fill & Sloped Arched Ceiling for Stairway A
  const stairAUnder = new THREE.Mesh(track(new THREE.BoxGeometry(13.2, 5.2, 8.2)), cliffMat);
  stairAUnder.position.set(-27.0, -19.2, -111.5);
  stairAUnder.rotation.z = Math.atan2(5.0, 12.0);
  tunnelGroup.add(stairAUnder);

  const stairAVaultGeo = track(new THREE.ExtrudeGeometry(tunnelArchShape, { depth: 14.4, bevelEnabled: false }));
  stairAVaultGeo.translate(0, 0, -7.2);
  stairAVaultGeo.rotateY(Math.PI / 2);
  const stairAVault = new THREE.Mesh(stairAVaultGeo, dampTunnelMat);
  stairAVault.position.set(-27.0, -16.5, -111.5);
  stairAVault.rotation.z = Math.atan2(5.0, 12.0);
  addTunnelWall(stairAVault);

  // Mid-Vault Turn Landing (x: -40.0..-33.0, z: -115.2..-107.8, y = -19.0)
  const tunnelTurnFloor = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(7.6, 0.8, 7.8)), wetFlagstoneMat),
  );
  tunnelTurnFloor.position.set(-36.5, -19.4, -111.5);
  tunnelTurnFloor.receiveShadow = true;
  tunnelGroup.add(tunnelTurnFloor);

  // Mid-Vault Corner Enclosure Walls & Ceiling (connects Arm 1 westward cleanly to Arm 2 northward)
  const turnWestWall = new THREE.Mesh(track(new THREE.BoxGeometry(1.0, 8.0, 9.2)), dampTunnelMat);
  turnWestWall.position.set(-40.6, -15.5, -111.5);
  addTunnelWall(turnWestWall);

  const turnSouthWall = new THREE.Mesh(track(new THREE.BoxGeometry(9.0, 8.0, 1.0)), dampTunnelMat);
  turnSouthWall.position.set(-36.5, -15.5, -107.3);
  addTunnelWall(turnSouthWall);

  const turnCeiling = new THREE.Mesh(track(new THREE.BoxGeometry(10.8, 1.2, 9.6)), dampTunnelMat);
  turnCeiling.position.set(-35.8, -12.2, -111.5);
  addTunnelWall(turnCeiling);

  // Descending Stone Stairway B (northward: z = -115.0 -> -129.0, y = -19.0 -> -26.0)
  buildStoneStairFlight(-40.0, -33.0, -129.0, -115.0, -19.0, -26.0, 20, 'z', tunnelGroup);

  const stairBSlope = -Math.atan2(7.0, 14.0);
  const stairBUnder = new THREE.Mesh(track(new THREE.BoxGeometry(8.2, 3.8, 15.6)), cliffMat);
  stairBUnder.position.set(-36.5, -24.4, -122.0);
  stairBUnder.rotation.x = stairBSlope;
  tunnelGroup.add(stairBUnder);

  const stairBVaultGeo = track(new THREE.ExtrudeGeometry(tunnelArchShape, { depth: 14.2, bevelEnabled: false }));
  stairBVaultGeo.translate(0, 0, -7.1);
  const stairBVault = new THREE.Mesh(stairBVaultGeo, dampTunnelMat);
  stairBVault.position.set(-36.5, -22.5, -122.0);
  stairBVault.rotation.x = stairBSlope;
  addTunnelWall(stairBVault);

  // Deep Crypt Vestibule Floor (x: -40.0..-33.0, z: -137.4..-129.0, y = -26.0)
  const tunnelCryptFloor = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(7.6, 0.8, 8.6)), wetFlagstoneMat),
  );
  tunnelCryptFloor.position.set(-36.5, -26.4, -133.1);
  tunnelCryptFloor.receiveShadow = true;
  tunnelGroup.add(tunnelCryptFloor);

  const cryptVaultGeo = track(new THREE.ExtrudeGeometry(tunnelArchShape, { depth: 9.2, bevelEnabled: false }));
  cryptVaultGeo.translate(0, 0, -4.6);
  const cryptVault = new THREE.Mesh(cryptVaultGeo, dampTunnelMat);
  cryptVault.position.set(-36.5, -26.0, -133.2);
  addTunnelWall(cryptVault);

  const cryptEndWall = new THREE.Mesh(track(new THREE.BoxGeometry(9.6, 8.5, 1.4)), dampTunnelMat);
  cryptEndWall.position.set(-36.5, -22.0, -137.7);
  addTunnelWall(cryptEndWall);

  // Structural Stone Arch Ribs along both arms of the tunnel
  const ribGeo = track(new THREE.ExtrudeGeometry(createArchShape(7.2, 6.0, 0.55), { depth: 0.55, bevelEnabled: false }));
  ribGeo.translate(0, 0, -0.275);
  for (const rx of [-16.0, -21.0, -25.5, -30.0]) {
    const t = rx < -21.0 ? (-21.0 - rx) / 12.0 : 0;
    const ribY = -14.0 - t * 5.0;
    const rib = new THREE.Mesh(ribGeo, marbleMat);
    rib.position.set(rx, ribY, -111.5);
    rib.rotation.y = Math.PI / 2;
    tunnelGroup.add(rib);
  }
  for (const rz of [-116.5, -121.0, -125.5, -130.5, -135.2]) {
    const t = rz > -129.0 ? (-115.0 - rz) / 14.0 : 1;
    const ribY = -19.0 - t * 7.0;
    const rib = new THREE.Mesh(ribGeo, marbleMat);
    rib.position.set(-36.5, ribY, rz);
    tunnelGroup.add(rib);
  }

  // Flickering Pale-Cyan & Warm Amber Wall Sconces inside the Descending Tunnel
  const tunnelSconceSpecs: Array<{ x: number; y: number; z: number; ry: number; cyan: boolean }> = [
    { x: -17.5, y: -11.4, z: -114.8, ry: 0, cyan: true },
    { x: -17.5, y: -11.4, z: -108.2, ry: Math.PI, cyan: false },
    { x: -24.5, y: -12.9, z: -114.8, ry: 0, cyan: false },
    { x: -29.5, y: -15.0, z: -108.2, ry: Math.PI, cyan: true },
    { x: -36.5, y: -16.4, z: -108.2, ry: Math.PI, cyan: false },
    { x: -39.8, y: -18.5, z: -119.0, ry: Math.PI / 2, cyan: true },
    { x: -33.2, y: -20.8, z: -124.0, ry: -Math.PI / 2, cyan: false },
    { x: -39.8, y: -23.3, z: -131.5, ry: Math.PI / 2, cyan: true },
    { x: -33.2, y: -23.3, z: -131.5, ry: -Math.PI / 2, cyan: true },
  ];

  const sconceArmGeo = track(new THREE.BoxGeometry(0.14, 0.16, 0.55));
  const sconceCupGeo = track(new THREE.CylinderGeometry(0.24, 0.11, 0.28, 7));
  const sconceFlameGeo = track(new THREE.ConeGeometry(0.18, 0.55, 6));
  const tunnelSconceFlames: THREE.Mesh[] = [];

  for (const sc of tunnelSconceSpecs) {
    const sg = new THREE.Group();
    sg.position.set(sc.x, sc.y, sc.z);
    sg.rotation.y = sc.ry;

    const arm = new THREE.Mesh(sconceArmGeo, ironMat);
    arm.position.set(0, 0, 0.24);
    sg.add(arm);

    const cup = new THREE.Mesh(sconceCupGeo, ironMat);
    cup.position.set(0, 0.16, 0.48);
    sg.add(cup);

    const fl = new THREE.Mesh(sconceFlameGeo, sc.cyan ? soulFlameMat : flameMat);
    fl.position.set(0, 0.52, 0.48);
    sg.add(fl);
    tunnelSconceFlames.push(fl);

    tunnelGroup.add(sg);
  }

  // Smaller Sealed Ancient Iron-Bound Crypt Door at Tunnel End (x = -36.5, y = -26.0, z = -136.8)
  const innerCryptDoorGroup = new THREE.Group();
  innerCryptDoorGroup.position.set(-36.5, -26.0, -136.85);
  tunnelGroup.add(innerCryptDoorGroup);

  const innerArchGeo = track(new THREE.ExtrudeGeometry(createArchShape(4.6, 5.4, 1.0), { depth: 1.0, bevelEnabled: false }));
  innerArchGeo.translate(0, 0, -0.5);
  const innerArch = new THREE.Mesh(innerArchGeo, marbleMat);
  innerCryptDoorGroup.add(innerArch);

  for (const side of [-1, 1]) {
    const innerLeaf = new THREE.Mesh(track(new THREE.BoxGeometry(2.26, 5.3, 0.42)), doorOakMat);
    innerLeaf.position.set(side * 1.15, 2.65, -0.15);
    innerCryptDoorGroup.add(innerLeaf);

    for (const sy of [0.9, 2.2, 3.5, 4.6]) {
      const strap = new THREE.Mesh(track(new THREE.BoxGeometry(2.18, 0.2, 0.5)), ironMat);
      strap.position.set(side * 1.15, sy, -0.12);
      innerCryptDoorGroup.add(strap);
    }
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.26, 0.05, 6, 12)), ironMat);
    ring.position.set(side * 0.48, 1.8, 0.14);
    innerCryptDoorGroup.add(ring);
  }

  const innerSealMedallion = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.45, 0)), soulFlameMat);
  innerSealMedallion.position.set(0, 2.7, 0.14);
  innerSealMedallion.scale.set(1.0, 1.4, 0.3);
  innerCryptDoorGroup.add(innerSealMedallion);

  const astralPortalRingMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x9ab4ff,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const astralPortalRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.85, 0.08, 8, 24)),
    astralPortalRingMat,
  );
  astralPortalRing.position.set(0, 2.7, 0.16);
  innerCryptDoorGroup.add(astralPortalRing);

  // Single dynamic budget-safe PointLight illuminating the tunnel interior as the player descends
  const tunnelLight = new THREE.PointLight(0x88dce8, 0, 22, 1.35);
  tunnelLight.position.set(-22, -12, -111.5);
  overworldGroup.add(tunnelLight);

  // =========================================================================
  // 4. COLOSSAL HIGH FANTASY CITADEL & GOLDEN GREAT TREE (z = -166 to -360)
  // =========================================================================
  const citadelGroup = new THREE.Group();
  overworldGroup.add(citadelGroup);

  // Upper Plateau Cliff Mass hollowed cleanly around the cylindrical Spiral Tower (stopping before Misty Hinterland Woods)
  for (const side of [-1, 1]) {
    const cliffWing = new THREE.Mesh(track(new THREE.BoxGeometry(88.0, 72, 120)), cliffMat);
    cliffWing.position.set(side * 66.5, -18.5, -234.0);
    cliffWing.receiveShadow = true;
    citadelGroup.add(cliffWing);
  }
  const courtyardUnderCliff = new THREE.Mesh(track(new THREE.BoxGeometry(46, 72, 36)), cliffMat);
  courtyardUnderCliff.position.set(0, -18.5, -191.5);
  courtyardUnderCliff.receiveShadow = true;
  citadelGroup.add(courtyardUnderCliff);

  const subBedrockCliff = new THREE.Mesh(track(new THREE.BoxGeometry(46, 40, 92)), cliffMat);
  subBedrockCliff.position.set(0, -34.5, -248.0);
  subBedrockCliff.receiveShadow = true;
  citadelGroup.add(subBedrockCliff);

  // Retaining bastion walls & buttress pilasters along the cliff front (-174)
  const cliffRetainingWall = new THREE.Mesh(track(new THREE.BoxGeometry(178, 36, 10)), stoneMat);
  cliffRetainingWall.position.set(0, 0, -175);
  cliffRetainingWall.receiveShadow = true;
  cliffRetainingWall.castShadow = true;
  citadelGroup.add(cliffRetainingWall);

  const wallPilasterGeo = track(new THREE.BoxGeometry(4.2, 42, 4.2));
  const wallPilasters = new THREE.InstancedMesh(wallPilasterGeo, marbleMat, 12);
  wallPilasters.castShadow = true;
  let wpIdx = 0;
  for (let i = 0; i < 6; i++) {
    for (const side of [-1, 1]) {
      dummy.position.set(side * (16 + i * 13.5), 1, -170);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      wallPilasters.setMatrixAt(wpIdx++, dummy.matrix);
    }
  }
  wallPilasters.instanceMatrix.needsUpdate = true;
  wallPilasters.computeBoundingSphere();
  citadelGroup.add(wallPilasters);

  // Grand Flagstone Courtyard (-166 to -208, y = 18)
  const courtyardFloor = addWalkable(
    new THREE.Mesh(track(new THREE.BoxGeometry(46, 1.2, 44)), flagstoneMat),
  );
  courtyardFloor.position.set(0, WORLD.courtyardY - 0.6, -187);
  courtyardFloor.receiveShadow = true;
  citadelGroup.add(courtyardFloor);

  // Courtyard Arched Colonnade Pillars (InstancedMesh — all 8 slots populated!)
  const colPillarsGeo = track(new THREE.CylinderGeometry(0.95, 1.12, 12.5, 10));
  const courtyardColCount = 8;
  const courtyardCols = new THREE.InstancedMesh(colPillarsGeo, marbleMat, courtyardColCount);
  courtyardCols.castShadow = true;
  courtyardCols.receiveShadow = true;
  let ccIdx = 0;
  for (let i = 0; i < 4; i++) {
    const z = -172 - i * 9.3;
    for (const side of [-1, 1]) {
      dummy.position.set(side * 13.5, WORLD.courtyardY + 6.25, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      courtyardCols.setMatrixAt(ccIdx++, dummy.matrix);
    }
  }
  courtyardCols.instanceMatrix.needsUpdate = true;
  courtyardCols.computeBoundingSphere();
  citadelGroup.add(courtyardCols);

  // Colonnade Roof Beams
  for (const side of [-1, 1]) {
    const beam = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 2.2, 34)), stoneMat);
    beam.position.set(side * 13.5, WORLD.courtyardY + 13.2, -186);
    beam.castShadow = true;
    citadelGroup.add(beam);
  }

  // Grand Cathedral Gatehouse (z = -208)
  const gateArchShape = createArchShape(14, 19, 4.5);
  const gateArchGeo = track(
    new THREE.ExtrudeGeometry(gateArchShape, { depth: 9, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25 }),
  );
  gateArchGeo.translate(0, 0, -4.5);
  const gatehouseArch = new THREE.Mesh(gateArchGeo, stoneMat);
  gatehouseArch.position.set(0, WORLD.courtyardY, -210);
  gatehouseArch.castShadow = true;
  gatehouseArch.receiveShadow = true;
  citadelGroup.add(gatehouseArch);

  // Twin Gatehouse Bastion Towers flanking the entrance
  for (const side of [-1, 1]) {
    const bastion = new THREE.Mesh(track(new THREE.BoxGeometry(14, 62, 14)), stoneMat);
    bastion.position.set(side * 15, WORLD.courtyardY + 31, -212);
    bastion.castShadow = true;
    bastion.receiveShadow = true;
    citadelGroup.add(bastion);

    const spire = new THREE.Mesh(track(new THREE.ConeGeometry(8.6, 26, 4)), gildedRoofMat);
    spire.position.set(side * 15, WORLD.courtyardY + 75, -212);
    spire.rotation.y = Math.PI / 4;
    spire.castShadow = true;
    citadelGroup.add(spire);
  }

  // Concentric Curtain Walls split around the 14m-wide open gatehouse portal
  for (const side of [-1, 1]) {
    const wallWing = new THREE.Mesh(track(new THREE.BoxGeometry(81, 42, 12)), stoneMat);
    wallWing.position.set(side * 47.5, WORLD.courtyardY + 18, -222);
    wallWing.castShadow = true;
    wallWing.receiveShadow = true;
    citadelGroup.add(wallWing);
  }
  const outerGateLintel = new THREE.Mesh(track(new THREE.BoxGeometry(14.5, 22, 12)), stoneMat);
  outerGateLintel.position.set(0, WORLD.courtyardY + 28, -222);
  outerGateLintel.castShadow = true;
  outerGateLintel.receiveShadow = true;
  citadelGroup.add(outerGateLintel);

  // Stepped Golden-Roofed Lower Citadel District Houses (Leyndell-inspired foreground city tiers)
  const houseBodyGeo = track(new THREE.BoxGeometry(14, 14, 18));
  const houseRoofGeo = track(createPitchedRoofGeometry(15.6, 8.5, 19.2));
  const housePositions = [
    [-42, 10, -182, 0.15],
    [-64, 14, -195, -0.1],
    [-34, 16, -204, 0.05],
    [42, 10, -184, -0.18],
    [66, 15, -196, 0.12],
    [35, 16, -205, -0.05],
    [-55, 22, -234, 0.08],
    [55, 22, -234, -0.08],
    [-82, 18, -216, 0.25],
    [82, 18, -216, -0.25],
  ];
  const districtBodies = new THREE.InstancedMesh(houseBodyGeo, stoneMat, housePositions.length);
  const districtRoofs = new THREE.InstancedMesh(houseRoofGeo, gildedRoofMat, housePositions.length);
  districtBodies.castShadow = true;
  districtBodies.receiveShadow = true;
  districtRoofs.castShadow = true;

  housePositions.forEach((hp, i) => {
    dummy.position.set(hp[0], hp[1] + 7, hp[2]);
    dummy.rotation.set(0, hp[3], 0);
    dummy.scale.set(1 + (i % 3) * 0.2, 1 + (i % 2) * 0.35, 1);
    dummy.updateMatrix();
    districtBodies.setMatrixAt(i, dummy.matrix);

    dummy.position.set(hp[0], hp[1] + 14 * (1 + (i % 2) * 0.35), hp[2]);
    dummy.updateMatrix();
    districtRoofs.setMatrixAt(i, dummy.matrix);
  });
  districtBodies.instanceMatrix.needsUpdate = true;
  districtRoofs.instanceMatrix.needsUpdate = true;
  districtBodies.computeBoundingSphere();
  districtRoofs.computeBoundingSphere();
  citadelGroup.add(districtBodies, districtRoofs);

  // Upper Central Cathedral Nave Superstructure (above hollow Tier 1 vault y = 48..90)
  const naveBody = new THREE.Mesh(track(new THREE.BoxGeometry(44, 42, 68)), stoneMat);
  naveBody.position.set(0, WORLD.courtyardY + 51, -258);
  naveBody.castShadow = true;
  naveBody.receiveShadow = true;
  citadelGroup.add(naveBody);

  const naveRoof = new THREE.Mesh(track(createPitchedRoofGeometry(48, 28, 72)), gildedRoofMat);
  naveRoof.position.set(0, WORLD.courtyardY + 72, -258);
  naveRoof.castShadow = true;
  citadelGroup.add(naveRoof);

  // Intricate Rows of Flying Buttresses flanking the Cathedral Nave (InstancedMesh)
  const buttressPillarGeo = track(new THREE.BoxGeometry(4.2, 62, 5.2));
  const buttressArchGeo = track(new THREE.BoxGeometry(14, 3.6, 3.2));
  const buttressCount = 12;
  const buttressPillars = new THREE.InstancedMesh(buttressPillarGeo, stoneMat, buttressCount);
  const buttressArches = new THREE.InstancedMesh(buttressArchGeo, marbleMat, buttressCount);
  buttressPillars.castShadow = true;
  buttressArches.castShadow = true;

  let bIdx = 0;
  for (let i = 0; i < 6; i++) {
    const bz = -232 - i * 10.5;
    for (const side of [-1, 1]) {
      dummy.position.set(side * 32, WORLD.courtyardY + 31, bz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      buttressPillars.setMatrixAt(bIdx, dummy.matrix);

      dummy.position.set(side * 26.5, WORLD.courtyardY + 54, bz);
      dummy.rotation.set(0, 0, -side * 0.52);
      dummy.updateMatrix();
      buttressArches.setMatrixAt(bIdx, dummy.matrix);
      bIdx++;
    }
  }
  buttressPillars.instanceMatrix.needsUpdate = true;
  buttressArches.instanceMatrix.needsUpdate = true;
  buttressPillars.computeBoundingSphere();
  buttressArches.computeBoundingSphere();
  citadelGroup.add(buttressPillars, buttressArches);

  // Cluster of Soaring Needle-Sharp Gothic Spires & Glowing Amber Stained-Glass Windows
  const spireSpecs = [
    { x: 0, y: 48, z: -262, r: 13, h: 66, spireH: 52 },
    { x: -30, y: 18, z: -242, r: 8.5, h: 74, spireH: 40 },
    { x: 30, y: 18, z: -242, r: 8.5, h: 74, spireH: 40 },
    { x: -56, y: 18, z: -268, r: 9.5, h: 68, spireH: 36 },
    { x: 56, y: 18, z: -268, r: 9.5, h: 68, spireH: 36 },
    { x: -24, y: 18, z: -288, r: 10.5, h: 82, spireH: 44 },
    { x: 24, y: 18, z: -288, r: 10.5, h: 82, spireH: 44 },
    { x: -78, y: 18, z: -245, r: 7.8, h: 56, spireH: 30 },
    { x: 78, y: 18, z: -245, r: 7.8, h: 56, spireH: 30 },
  ];

  const lancetShape = createPointedWindowShape(3.2, 13);
  const lancetGeo = track(new THREE.ShapeGeometry(lancetShape));

  for (const sp of spireSpecs) {
    const tower = new THREE.Mesh(
      track(new THREE.CylinderGeometry(sp.r * 0.86, sp.r, sp.h, 8)),
      stoneMat,
    );
    tower.position.set(sp.x, sp.y + sp.h / 2, sp.z);
    tower.castShadow = true;
    tower.receiveShadow = true;
    citadelGroup.add(tower);

    const needle = new THREE.Mesh(
      track(new THREE.ConeGeometry(sp.r * 0.94, sp.spireH, 8)),
      gildedRoofMat,
    );
    needle.position.set(sp.x, sp.y + sp.h + sp.spireH / 2, sp.z);
    needle.castShadow = true;
    citadelGroup.add(needle);

    // Glowing amber stained-glass lancet windows facing south toward the player
    const winMesh = new THREE.Mesh(lancetGeo, stainedGlassMat);
    winMesh.position.set(sp.x, sp.y + sp.h * 0.62, sp.z + sp.r * 0.92);
    citadelGroup.add(winMesh);
  }

  // Grand Rose Window with Gothic Stone Tracery on Citadel Facade
  const roseWindow = new THREE.Mesh(track(new THREE.CircleGeometry(7.2, 24)), stainedGlassMat);
  roseWindow.position.set(0, WORLD.courtyardY + 54, -223.8);
  citadelGroup.add(roseWindow);

  const roseFrame = new THREE.Mesh(track(new THREE.TorusGeometry(7.4, 0.75, 8, 24)), marbleMat);
  roseFrame.position.set(0, WORLD.courtyardY + 54, -223.5);
  citadelGroup.add(roseFrame);

  for (let i = 0; i < 4; i++) {
    const mullion = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 14.4, 0.5)), marbleMat);
    mullion.position.set(0, WORLD.courtyardY + 54, -223.4);
    mullion.rotation.z = (i * Math.PI) / 4;
    citadelGroup.add(mullion);
  }

  // =========================================================================
  // 4B. 3-TIER DESCENDING CITADEL INTERIOR & THE MISTY HINTERLAND WOODS
  // =========================================================================
  const citadelInterior = buildCitadelInterior({
    scene: overworldGroup,
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
    indoorWalls: tunnelWalls,
    createArchShape,
    createPointedWindowShape,
  });

  // =========================================================================
  // 5. COLOSSAL SPECTRAL GREAT TREE VEILED IN MIST (Beyond Citadel & Woods)
  // =========================================================================
  const greatTreeGroup = new THREE.Group();
  greatTreeGroup.position.set(190, -14, -495);
  overworldGroup.add(greatTreeGroup);

  const greatTreeMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xf4c468,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const greatTreeCoreMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xffe49c,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const gtTrunk = new THREE.Mesh(track(new THREE.CylinderGeometry(8.5, 22, 235, 12)), greatTreeCoreMat);
  gtTrunk.position.y = 117.5;
  greatTreeGroup.add(gtTrunk);

  // Sweeping spectral Great Tree boughs & translucent golden canopy
  const boughAngles = [-0.9, -0.5, -0.15, 0.2, 0.55, 0.95];
  for (let i = 0; i < boughAngles.length; i++) {
    const a = boughAngles[i];
    const boughCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 162, 0),
      new THREE.Vector3(Math.sin(a) * 38, 202 + (i % 2) * 14, Math.cos(a) * 18 - 10),
      new THREE.Vector3(Math.sin(a) * 76, 236 + (i % 3) * 12, Math.cos(a) * 30 - 15),
    ]);
    const bough = new THREE.Mesh(
      track(new THREE.TubeGeometry(boughCurve, 12, 3.6, 7, false)),
      greatTreeMat,
    );
    greatTreeGroup.add(bough);

    const cloud = new THREE.Mesh(track(new THREE.IcosahedronGeometry(36, 1)), greatTreeMat);
    cloud.position.set(Math.sin(a) * 68, 240 + (i % 2) * 16, Math.cos(a) * 20 - 10);
    cloud.scale.set(1.6, 0.68, 1.1);
    greatTreeGroup.add(cloud);
  }

  // =========================================================================
  // 6. RISING BONFIRE EMBERS & FLOATING TWILIGHT DUST MOTES
  // =========================================================================
  const emberCount = 130;
  const emberPos = new Float32Array(emberCount * 3);
  const emberSpeeds = new Float32Array(emberCount);
  for (let i = 0; i < emberCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.random() * 1.1;
    emberPos[i * 3] = Math.cos(angle) * rad;
    emberPos[i * 3 + 1] = WORLD.pitDepth + 0.35 + Math.random() * 5.2;
    emberPos[i * 3 + 2] = Math.sin(angle) * rad;
    emberSpeeds[i] = 0.75 + Math.random() * 1.3;
  }
  const emberGeo = track(new THREE.BufferGeometry());
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = track(
    new THREE.PointsMaterial({
      size: 0.24,
      map: textures.glowSprite,
      color: 0xffaa44,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const emberPoints = new THREE.Points(emberGeo, emberMat);
  overworldGroup.add(emberPoints);

  const dustCount = 720;
  const dustPos = new Float32Array(dustCount * 3);
  const dustPhase = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 90;
    dustPos[i * 3 + 1] = 0.5 + Math.random() * 28;
    dustPos[i * 3 + 2] = 18 - Math.random() * 225;
    dustPhase[i] = Math.random() * Math.PI * 2;
  }
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = track(
    new THREE.PointsMaterial({
      size: 0.32,
      map: textures.glowSprite,
      color: 0xf7d694,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  overworldGroup.add(dustPoints);

  // Drifting warm fireflies & distant lantern motes among the deep valley treetops
  const fireflyCount = 190;
  const fireflyPos = new Float32Array(fireflyCount * 3);
  const fireflyPhase = new Float32Array(fireflyCount);
  for (let i = 0; i < fireflyCount; i++) {
    fireflyPos[i * 3] = (Math.random() - 0.5) * 210;
    fireflyPos[i * 3 + 1] = valleyY + 1.5 + Math.random() * 14.0;
    fireflyPos[i * 3 + 2] = 40 - Math.random() * 230;
    fireflyPhase[i] = Math.random() * Math.PI * 2;
  }
  const fireflyGeo = track(new THREE.BufferGeometry());
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
  const fireflyMat = track(
    new THREE.PointsMaterial({
      size: 0.72,
      map: textures.glowSprite,
      color: 0xffd170,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const fireflyPoints = new THREE.Points(fireflyGeo, fireflyMat);
  overworldGroup.add(fireflyPoints);

  const update = (elapsed: number, dt: number, playerZ = 0, playerY = 0, playerX = 0) => {
    skyDome.position.set(playerX, 0, playerZ);
    rayMat.uniforms.uTime.value = elapsed;
    citadelInterior.update(elapsed, dt, playerZ, playerY, playerX);

    // Flicker bonfire lights and flame cones organically
    const flicker =
      1.0 +
      Math.sin(elapsed * 7.8) * 0.14 +
      Math.sin(elapsed * 13.7) * 0.09 +
      Math.cos(elapsed * 21.3) * 0.05;
    bonfireLight.intensity = 12.5 * flicker;
    terraceBonfireLight.intensity = 9.5 * flicker;
    for (let i = 0; i < flameCones.length; i++) {
      const fc = flameCones[i];
      fc.scale.set(0.92 + flicker * 0.08, 0.85 + Math.sin(elapsed * 11 + i * 2) * 0.2, 0.92 + flicker * 0.08);
      fc.rotation.y = elapsed * (1.2 + i * 0.4);
    }
    for (let i = 0; i < terraceFlameCones.length; i++) {
      const fc = terraceFlameCones[i];
      fc.scale.set(0.92 + flicker * 0.08, 0.85 + Math.cos(elapsed * 10 + i * 2) * 0.2, 0.92 + flicker * 0.08);
      fc.rotation.y = -elapsed * (1.1 + i * 0.35);
    }

    // Eerie pale-cyan soul brazier flicker at the Sealed Catacomb Gate
    const soulFlicker = 1.0 + Math.sin(elapsed * 5.2) * 0.12 + Math.cos(elapsed * 9.4) * 0.08;
    soulBrazierLight.intensity = 15.0 * soulFlicker;
    for (let i = 0; i < soulFlameCones.length; i++) {
      const sf = soulFlameCones[i];
      sf.scale.set(0.94 + soulFlicker * 0.06, 0.88 + Math.sin(elapsed * 7.5 + i) * 0.16, 0.94 + soulFlicker * 0.06);
      sf.rotation.y = elapsed * (1.4 + (i % 2) * 0.5);
    }

    // Flicker subterranean tunnel sconce flames
    for (let i = 0; i < tunnelSconceFlames.length; i++) {
      const fl = tunnelSconceFlames[i];
      fl.scale.set(
        0.92 + soulFlicker * 0.08,
        0.85 + Math.sin(elapsed * 9.5 + i * 1.7) * 0.18,
        0.92 + soulFlicker * 0.08,
      );
      fl.rotation.y = elapsed * (1.6 + (i % 3) * 0.4);
    }

    // Update rising bonfire embers
    const eAttr = emberGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < emberCount; i++) {
      let y = eAttr.getY(i) + emberSpeeds[i] * dt;
      let x = eAttr.getX(i) + Math.sin(elapsed * 2.4 + i) * 0.28 * dt;
      let z = eAttr.getZ(i) + Math.cos(elapsed * 2.1 + i * 1.3) * 0.28 * dt;
      if (y > WORLD.pitDepth + 6.0) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.75;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        y = WORLD.pitDepth + 0.4;
      }
      eAttr.setXYZ(i, x, y, z);
    }
    eAttr.needsUpdate = true;

    // Update drifting golden twilight dust motes
    const dAttr = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dustCount; i++) {
      const p = dustPhase[i];
      let x = dAttr.getX(i) + Math.sin(elapsed * 0.4 + p) * 0.16 * dt;
      let y = dAttr.getY(i) + Math.cos(elapsed * 0.35 + p * 1.3) * 0.12 * dt;
      if (x > 45) x = -45;
      if (x < -45) x = 45;
      dAttr.setXY(i, x, y);
    }
    dAttr.needsUpdate = true;

    // Update drifting forest valley fireflies
    const fAttr = fireflyGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fireflyCount; i++) {
      const p = fireflyPhase[i];
      const fx = fAttr.getX(i) + Math.sin(elapsed * 0.65 + p) * 0.38 * dt;
      const fy = fAttr.getY(i) + Math.cos(elapsed * 0.8 + p * 1.7) * 0.24 * dt;
      fAttr.setXY(i, fx, fy);
    }
    fAttr.needsUpdate = true;
  };

  overworldGroup.updateMatrixWorld(true);

  return {
    overworldGroup,
    bonfireLight,
    tunnelLight,
    walkableMeshes,
    tunnelWalls,
    academyCastleGroup: citadelInterior.academyCastleGroup,
    catacombGate: {
      leftDoorPivot,
      rightDoorPivot,
      doorSealSeam,
      soulBrazierLight,
    },
    update,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}
