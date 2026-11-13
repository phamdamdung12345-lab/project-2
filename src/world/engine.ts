import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createWorldTextures } from './textures';
import { buildFantasyWorld } from './buildWorld';
import { buildAstralCapital } from './buildAstralCapital';
import { createKnight, animateKnight } from './knight';
import {
  WORLD,
  TOWER,
  HINTERLAND,
  ACADEMY,
  HAMLET,
  BONFIRES,
  BonfireSite,
  ZoneId,
  sampleFloorHeight,
  resolveVerticalStep,
  resolveObstacleCollisions,
  getZoneAtPosition,
  findNearestBonfire,
  findNearCatacombGate,
  findNearTunnelAstralDoor,
  isLethalFall,
  getRiversideTrailZ,
  getSnowPassCenterZ,
  getHinterlandGroundY,
  computeAcademyScale,
} from './terrainMath';
import {
  ASTRAL,
  ASTRAL_GRACE_SITES,
  sampleAstralFloorHeight,
  resolveAstralVerticalStep,
  resolveAstralObstacleCollisions,
  getAstralZoneAtPosition,
  findNearestAstralGrace,
  findNearAstralReturnGate,
  isAstralLethalFall,
} from './astralCapitalMath';

export type RealmId = 'overworld' | 'astral';

export interface EngineCallbacks {
  onZoneEnter: (zone: ZoneId) => void;
  onDeathStateChange: (isDead: boolean) => void;
  onCheckpointLit: (checkpointName: string) => void;
  onPortalFadeChange: (opacity: number) => void;
  onPromptStateChange: (state: {
    realm: RealmId;
    nearBonfire: boolean;
    nearGate: boolean;
    nearAstralPortal: boolean;
    portalLabel: string;
    gateOpening: boolean;
    gateOpened: boolean;
    isResting: boolean;
    freeCam: boolean;
    zone: ZoneId;
  }) => void;
}

export interface EngineController {
  setPlaying: (playing: boolean) => void;
  toggleFreeCam: () => void;
  dispose: () => void;
}

const _camFwd = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _raycaster = new THREE.Raycaster();
const _rayOrigin = new THREE.Vector3();
const _rayDown = new THREE.Vector3(0, -1, 0);
const _camRayOrigin = new THREE.Vector3();
const _camRayDir = new THREE.Vector3();
const _rayHits: THREE.Intersection[] = [];
const _twilightFogCol = new THREE.Color(0x7c674f);
const _cloisterFogCol = new THREE.Color(0x3a3735);
const _hinterlandFogCol = new THREE.Color(0x3d5966);
const _lakeFogCol = new THREE.Color(0x1f4354);
const _hamletFogCol = new THREE.Color(0x49626b);
const _snowPassFogCol = new THREE.Color(0x718691);
const _astralFogCol = new THREE.Color(0x1b1a36);
const _targetFogCol = new THREE.Color(0x7c674f);

function detectSoftwareWebGL(): boolean {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param) || '');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export function mountFantasyEngine(
  container: HTMLElement,
  callbacks: EngineCallbacks,
  initialPlaying: boolean,
): EngineController {
  const isSoftwareGl = detectSoftwareWebGL();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('data-testid', 'world-canvas');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7c674f);
  scene.fog = new THREE.FogExp2(0x7c674f, 0.0042);

  // Studio environment reflections for armor & gilded citadel roofs
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(
    56,
    (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
    0.2,
    1700,
  );

  // Lighting: Warm low-angle golden twilight sun + Cool slate-blue hemisphere fill
  const hemiLight = new THREE.HemisphereLight(0x7e97bd, 0x3b2d22, 1.05);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffb969, 2.55);
  sunLight.position.set(85, 58, -140);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 380;
  sunLight.shadow.camera.left = -95;
  sunLight.shadow.camera.right = 95;
  sunLight.shadow.camera.top = 95;
  sunLight.shadow.camera.bottom = -95;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.025;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const rimLight = new THREE.DirectionalLight(0x9fb5d9, 0.65);
  rimLight.position.set(-60, 40, 80);
  scene.add(rimLight);

  // Build Textures, Overworld, Astral Royal Capital, and Knight
  const textures = createWorldTextures(renderer);
  const world = buildFantasyWorld(scene, textures);
  const astralCapital = buildAstralCapital(scene, textures, renderer);
  const knight = createKnight();
  scene.add(knight.root);

  // Player & Camera State
  let activeRealm: RealmId = 'overworld';
  let isPlaying = initialPlaying;
  let freeCam = false;
  let isResting = false;
  let restBlend = 0;
  let isDead = false;
  let deathTimer = 0;
  let gateOpening = false;
  let gateOpened = false;
  let gateAnimTimer = 0;
  const gateAnimDuration = 2.15;

  // 0.8s Celestial Fade Portal Transition State
  let portalTransitionActive = false;
  let portalTransitionTarget: RealmId = 'astral';
  let portalTransitionTimer = 0;
  let portalSwapped = false;
  const portalTransitionDuration = 0.8;

  let activeCheckpoint: BonfireSite = BONFIRES[0];
  let activeAstralCheckpoint: BonfireSite = ASTRAL_GRACE_SITES[0];

  const urlSpawn =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('spawn') : null;
  let posX: number = WORLD.spawnPos.x;
  let posZ: number = WORLD.spawnPos.z;
  let posY: number = sampleFloorHeight(posX, WORLD.spawnPos.y + 0.5, posZ) ?? 0;
  let knightYaw = 0;

  if (urlSpawn === 'terrace') {
    posX = -9.5;
    posZ = WORLD.catacombGatePos.z;
    posY = WORLD.terraceY;
    knightYaw = Math.PI / 2;
  } else if (urlSpawn === 'courtyard') {
    posX = 0;
    posZ = -200.0;
    posY = WORLD.courtyardY;
  } else if (urlSpawn === 'nave') {
    posX = 0;
    posZ = -236.5;
    posY = TOWER.tier1Y;
  } else if (urlSpawn === 'cloister') {
    posX = -11.5;
    posZ = TOWER.cz;
    posY = TOWER.tier2Y;
    knightYaw = Math.PI / 2;
    scene.background = _cloisterFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_cloisterFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0085;
  } else if (urlSpawn === 'hinterland') {
    posX = 0;
    posZ = -278.0;
    posY = TOWER.tier3Y;
    scene.background = _hinterlandFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_hinterlandFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0135;
  } else if (urlSpawn === 'clearing') {
    posX = -2.8;
    posZ = HINTERLAND.clearingCz + 5.2;
    posY = WORLD.hinterlandY;
    scene.background = _hinterlandFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_hinterlandFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0135;
  } else if (urlSpawn === 'alcove') {
    posX = 24.0;
    posZ = -475.0;
    posY = WORLD.hinterlandY;
    knightYaw = -1.12;
    scene.background = _hinterlandFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_hinterlandFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0135;
  } else if (urlSpawn === 'river') {
    posX = 0;
    posZ = -544.0;
    posY = WORLD.hinterlandY;
    scene.background = _hinterlandFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_hinterlandFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0056;
  } else if (urlSpawn === 'lakegate') {
    posX = 0;
    posZ = -583.5;
    posY = WORLD.hinterlandY;
    scene.background = _lakeFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_lakeFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0038;
  } else if (urlSpawn === 'lakebonfire') {
    posX = ACADEMY.bonfireX - 3.2;
    posZ = ACADEMY.bonfireZ + 3.0;
    posY = ACADEMY.causewayY + 0.15;
    scene.background = _lakeFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_lakeFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0038;
  } else if (urlSpawn === 'academy') {
    posX = 0;
    posZ = -805.0;
    posY = ACADEMY.castleBaseY;
    scene.background = _lakeFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_lakeFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0038;
  } else if (urlSpawn === 'forecourt') {
    posX = 0;
    posZ = -872.0;
    posY = ACADEMY.forecourtY;
    scene.background = _lakeFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_lakeFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0038;
  } else if (urlSpawn === 'trail') {
    posX = -80.0;
    posZ = getRiversideTrailZ(-80.0);
    posY = getHinterlandGroundY(posX, posZ);
    knightYaw = Math.PI / 2;
    scene.background = _hamletFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_hamletFogCol);
    (scene.fog as THREE.FogExp2).density = 0.014;
  } else if (urlSpawn === 'hamlet') {
    posX = -166.0;
    posZ = -548.0;
    posY = HAMLET.hamletY;
    knightYaw = Math.PI / 2;
    scene.background = _hamletFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_hamletFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0145;
  } else if (urlSpawn === 'snowpass') {
    posX = -218.0;
    posZ = getSnowPassCenterZ(-218.0);
    posY = getHinterlandGroundY(posX, posZ);
    knightYaw = Math.PI / 2;
    scene.background = _snowPassFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_snowPassFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0165;
  } else if (urlSpawn === 'tunneldoor') {
    gateOpened = true;
    world.catacombGate.leftDoorPivot.rotation.y = 1.32;
    world.catacombGate.rightDoorPivot.rotation.y = -1.32;
    world.catacombGate.doorSealSeam.visible = false;
    posX = -36.5;
    posY = -26.0;
    posZ = -133.5;
    knightYaw = 0;
    scene.background = _cloisterFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_cloisterFogCol);
    (scene.fog as THREE.FogExp2).density = 0.0085;
  } else if (
    urlSpawn === 'astral' ||
    urlSpawn === 'astral-sprawl' ||
    urlSpawn === 'astral-dragon' ||
    urlSpawn === 'astral-aqueduct'
  ) {
    activeRealm = 'astral';
    world.overworldGroup.visible = false;
    astralCapital.group.visible = true;
    camera.far = 3500;
    camera.updateProjectionMatrix();
    scene.background = _astralFogCol.clone();
    (scene.fog as THREE.FogExp2).color.copy(_astralFogCol);
    (scene.fog as THREE.FogExp2).density = 0.00115;
    hemiLight.color.setHex(0x8ea4e8);
    hemiLight.groundColor.setHex(0x4e3c2c);
    hemiLight.intensity = 1.3;
    sunLight.color.setHex(0xffce84);
    sunLight.intensity = 2.35;
    rimLight.color.setHex(0x6f8cff);
    rimLight.intensity = 1.15;

    if (urlSpawn === 'astral-sprawl') {
      posX = 0;
      posY = ASTRAL.sprawlPlazaY;
      posZ = -142;
    } else if (urlSpawn === 'astral-dragon') {
      posX = 92;
      posY = ASTRAL.dragonWingY;
      posZ = -142;
      knightYaw = -0.68;
    } else if (urlSpawn === 'astral-aqueduct') {
      posX = 10;
      posY = ASTRAL.aqueductMidY;
      posZ = -252;
      knightYaw = 0.36;
    } else {
      posX = ASTRAL.spawnPos.x;
      posY = ASTRAL.spawnPos.y;
      posZ = ASTRAL.spawnPos.z;
    }
  }
  let velY = 0;
  let grounded = true;
  let walkPhase = 0;

  // Dodge-roll state
  let isRolling = false;
  let rollTimer = 0;
  const rollDuration = 0.56;
  let rollDirX = 0;
  let rollDirZ = -1;

  // Camera orbit state
  let camYaw =
    urlSpawn === 'terrace' ||
    urlSpawn === 'cloister' ||
    urlSpawn === 'trail' ||
    urlSpawn === 'hamlet' ||
    urlSpawn === 'snowpass'
      ? Math.PI / 2
      : urlSpawn === 'astral-dragon'
        ? -0.68
        : urlSpawn === 'astral-aqueduct'
          ? 0.36
          : urlSpawn === 'alcove'
            ? -1.12
            : 0;
  let camPitch =
    urlSpawn === 'forecourt'
      ? -0.18
      : urlSpawn === 'astral-dragon'
        ? -0.06
        : activeRealm === 'astral'
          ? 0.10
          : 0.12;
  let camDist = urlSpawn === 'forecourt' ? 7.5 : activeRealm === 'astral' ? 7.2 : 5.8;
  let targetCamYaw = camYaw;
  let targetCamPitch = camPitch;
  let targetCamDist = camDist;

  const camPosCurrent = new THREE.Vector3(
    posX + Math.sin(camYaw) * camDist,
    posY + 2.4,
    posZ + Math.cos(camYaw) * camDist,
  );
  const camLookCurrent = new THREE.Vector3(posX, posY + (urlSpawn === 'forecourt' ? 8.5 : 1.95), posZ);

  // Free-roam camera coordinates
  const freeCamPos = new THREE.Vector3(0, 12, 14);
  let freeYaw = 0;
  let freePitch = -0.1;

  // Zone & Prompt Tracking
  const computeZone = (): ZoneId =>
    activeRealm === 'astral' ? getAstralZoneAtPosition(posZ, posY) : getZoneAtPosition(posZ, posY, posX);
  const computeNearBonfire = (): BonfireSite | null =>
    activeRealm === 'astral'
      ? findNearestAstralGrace(posX, posY, posZ)
      : findNearestBonfire(posX, posY, posZ);
  const computePortalState = (): { near: boolean; label: string } => {
    if (activeRealm === 'overworld') {
      return findNearTunnelAstralDoor(posX, posY, posZ, gateOpened)
        ? { near: true, label: '[E] Enter Astral Royal Capital' }
        : { near: false, label: '' };
    }
    return findNearAstralReturnGate(posX, posY, posZ)
      ? { near: true, label: '[E] Return to Viaduct Basement' }
      : { near: false, label: '' };
  };

  let currentZone: ZoneId = computeZone();
  let lastNearBonfire = computeNearBonfire() !== null;
  let lastNearGate = activeRealm === 'overworld' && findNearCatacombGate(posX, posY, posZ, gateOpened);
  let lastPortalState = computePortalState();
  let lastReportedRealm: RealmId = activeRealm;
  let lastReportedGateOpening = false;
  let lastReportedGateOpened = gateOpened;
  let lastReportedResting = false;
  let lastReportedFreeCam = false;

  if (isPlaying) {
    callbacks.onZoneEnter(currentZone);
  }
  callbacks.onPromptStateChange({
    realm: activeRealm,
    nearBonfire: lastNearBonfire,
    nearGate: lastNearGate,
    nearAstralPortal: lastPortalState.near,
    portalLabel: lastPortalState.label,
    gateOpening,
    gateOpened,
    isResting,
    freeCam,
    zone: currentZone,
  });

  // Input State
  const keys = new Set<string>();
  const lastTapTime: Record<string, number> = {};
  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  const raycastFloorAt = (x: number, maxStartY: number, minEndY: number, z: number): number | null => {
    _rayOrigin.set(x, maxStartY, z);
    _raycaster.set(_rayOrigin, _rayDown);
    _raycaster.near = 0;
    _raycaster.far = Math.max(0.5, maxStartY - minEndY);
    _rayHits.length = 0;
    const targets = activeRealm === 'astral' ? astralCapital.walkableMeshes : world.walkableMeshes;
    _raycaster.intersectObjects(targets, false, _rayHits);
    return _rayHits.length > 0 ? _rayHits[0].point.y : null;
  };

  const triggerRoll = (dirX: number, dirZ: number) => {
    if (isRolling || !grounded || freeCam || !isPlaying || isDead || gateOpening || portalTransitionActive)
      return;
    isResting = false;
    const len = Math.hypot(dirX, dirZ);
    if (len > 0.01) {
      rollDirX = dirX / len;
      rollDirZ = dirZ / len;
      knightYaw = Math.atan2(-rollDirX, -rollDirZ);
    } else {
      rollDirX = -Math.sin(knightYaw);
      rollDirZ = -Math.cos(knightYaw);
    }
    isRolling = true;
    rollTimer = 0;
  };

  const syncPromptState = () => {
    const near = computeNearBonfire() !== null;
    const nearG = activeRealm === 'overworld' && findNearCatacombGate(posX, posY, posZ, gateOpened);
    const portal = computePortalState();
    if (
      activeRealm !== lastReportedRealm ||
      near !== lastNearBonfire ||
      nearG !== lastNearGate ||
      portal.near !== lastPortalState.near ||
      portal.label !== lastPortalState.label ||
      gateOpening !== lastReportedGateOpening ||
      gateOpened !== lastReportedGateOpened ||
      isResting !== lastReportedResting ||
      freeCam !== lastReportedFreeCam
    ) {
      lastReportedRealm = activeRealm;
      lastNearBonfire = near;
      lastNearGate = nearG;
      lastPortalState = portal;
      lastReportedGateOpening = gateOpening;
      lastReportedGateOpened = gateOpened;
      lastReportedResting = isResting;
      lastReportedFreeCam = freeCam;
      callbacks.onPromptStateChange({
        realm: activeRealm,
        nearBonfire: near,
        nearGate: nearG,
        nearAstralPortal: portal.near,
        portalLabel: portal.label,
        gateOpening,
        gateOpened,
        isResting,
        freeCam,
        zone: currentZone,
      });
    }
  };

  const applyRealmSwap = (target: RealmId) => {
    activeRealm = target;
    velY = 0;
    grounded = true;
    isRolling = false;
    isResting = false;
    restBlend = 0;

    if (target === 'astral') {
      world.overworldGroup.visible = false;
      astralCapital.group.visible = true;
      camera.far = 3500;
      camera.updateProjectionMatrix();

      posX = ASTRAL.spawnPos.x;
      posY = ASTRAL.spawnPos.y;
      posZ = ASTRAL.spawnPos.z;
      knightYaw = 0;
      camYaw = 0;
      targetCamYaw = 0;
      camPitch = 0.14;
      targetCamPitch = 0.14;
      camDist = 6.8;
      targetCamDist = 6.8;

      scene.background = _astralFogCol.clone();
      (scene.fog as THREE.FogExp2).color.copy(_astralFogCol);
      (scene.fog as THREE.FogExp2).density = 0.00115;
      hemiLight.color.setHex(0x8ea4e8);
      hemiLight.groundColor.setHex(0x4e3c2c);
      hemiLight.intensity = 1.3;
      sunLight.color.setHex(0xffce84);
      sunLight.intensity = 2.35;
      rimLight.color.setHex(0x6f8cff);
      rimLight.intensity = 1.15;
    } else {
      astralCapital.group.visible = false;
      world.overworldGroup.visible = true;
      camera.far = 1700;
      camera.updateProjectionMatrix();

      gateOpened = true;
      posX = -36.5;
      posY = -26.0;
      posZ = -133.2;
      knightYaw = Math.PI;
      camYaw = Math.PI;
      targetCamYaw = Math.PI;
      camPitch = 0.12;
      targetCamPitch = 0.12;
      camDist = 5.4;
      targetCamDist = 5.4;

      scene.background = _cloisterFogCol.clone();
      (scene.fog as THREE.FogExp2).color.copy(_cloisterFogCol);
      (scene.fog as THREE.FogExp2).density = 0.0085;
      hemiLight.color.setHex(0x7e97bd);
      hemiLight.groundColor.setHex(0x3b2d22);
      hemiLight.intensity = 0.85;
      sunLight.color.setHex(0xffb969);
      sunLight.intensity = 1.25;
      rimLight.color.setHex(0x9fb5d9);
      rimLight.intensity = 0.65;
    }

    const horizDist = Math.cos(camPitch) * camDist;
    const vertDist = Math.sin(camPitch) * camDist;
    camPosCurrent.set(
      posX + Math.sin(camYaw) * horizDist,
      posY + 1.7 + vertDist,
      posZ + Math.cos(camYaw) * horizDist,
    );
    camLookCurrent.set(posX, posY + 1.95, posZ);
    camera.position.copy(camPosCurrent);
    camera.lookAt(camLookCurrent);

    currentZone = computeZone();
    callbacks.onZoneEnter(currentZone);
    syncPromptState();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    const wasDown = keys.has(code);
    keys.add(code);

    if (!isPlaying || isDead) return;

    if (!wasDown) {
      if (code === 'KeyC' && !gateOpening && !portalTransitionActive) {
        freeCam = !freeCam;
        if (freeCam) {
          freeCamPos.copy(camera.position);
          freeYaw = camYaw;
          freePitch = -camPitch * 0.6;
        }
        syncPromptState();
        return;
      }

      if (gateOpening || portalTransitionActive) return;

      if (code === 'KeyE' && !freeCam) {
        const nearest = computeNearBonfire();
        if (nearest) {
          isResting = !isResting;
          if (activeRealm === 'astral') {
            activeAstralCheckpoint = nearest;
          } else {
            activeCheckpoint = nearest;
          }
          if (isResting) {
            const dx = nearest.x - posX;
            const dz = nearest.z - posZ;
            if (Math.hypot(dx, dz) > 0.2) {
              knightYaw = Math.atan2(-dx, -dz);
            }
            callbacks.onCheckpointLit(nearest.name);
          }
          syncPromptState();
          return;
        }

        const portal = computePortalState();
        if (portal.near) {
          portalTransitionActive = true;
          portalTransitionTarget = activeRealm === 'overworld' ? 'astral' : 'overworld';
          portalTransitionTimer = 0;
          portalSwapped = false;
          isRolling = false;
          isResting = false;
          keys.clear();
          callbacks.onPortalFadeChange(1);
          return;
        }

        if (activeRealm === 'overworld' && findNearCatacombGate(posX, posY, posZ, gateOpened)) {
          gateOpening = true;
          gateAnimTimer = 0;
          isRolling = false;
          isResting = false;
          velY = 0;
          grounded = true;
          keys.clear();
          syncPromptState();
        }
        return;
      }

      if (code === 'Space' && !freeCam && grounded && !isRolling) {
        isResting = false;
        velY = 8.4;
        grounded = false;
        syncPromptState();
        return;
      }

      if (
        (code === 'ControlLeft' ||
          code === 'ControlRight' ||
          code === 'AltLeft' ||
          code === 'AltRight') &&
        !freeCam
      ) {
        if (code === 'AltLeft' || code === 'AltRight') e.preventDefault();
        _camFwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
        _camRight.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
        let dx = 0;
        let dz = 0;
        if (keys.has('KeyW') || keys.has('ArrowUp')) {
          dx += _camFwd.x;
          dz += _camFwd.z;
        }
        if (keys.has('KeyS') || keys.has('ArrowDown')) {
          dx -= _camFwd.x;
          dz -= _camFwd.z;
        }
        if (keys.has('KeyD') || keys.has('ArrowRight')) {
          dx += _camRight.x;
          dz += _camRight.z;
        }
        if (keys.has('KeyA') || keys.has('ArrowLeft')) {
          dx -= _camRight.x;
          dz -= _camRight.z;
        }
        triggerRoll(dx, dz);
        return;
      }

      // Double-tap WASD for dodge roll
      if (
        !freeCam &&
        (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD')
      ) {
        const now = performance.now();
        const prev = lastTapTime[code] || 0;
        lastTapTime[code] = now;
        if (now - prev < 260) {
          _camFwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
          _camRight.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
          let dx = 0;
          let dz = 0;
          if (code === 'KeyW') {
            dx = _camFwd.x;
            dz = _camFwd.z;
          }
          if (code === 'KeyS') {
            dx = -_camFwd.x;
            dz = -_camFwd.z;
          }
          if (code === 'KeyD') {
            dx = _camRight.x;
            dz = _camRight.z;
          }
          if (code === 'KeyA') {
            dx = -_camRight.x;
            dz = -_camRight.z;
          }
          triggerRoll(dx, dz);
          lastTapTime[code] = 0;
        }
      }
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!isPlaying || isDead) return;
    isDragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging || !isPlaying || isDead) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    if (freeCam) {
      freeYaw -= dx * 0.0045;
      freePitch = THREE.MathUtils.clamp(freePitch - dy * 0.0045, -1.35, 1.35);
    } else {
      targetCamYaw -= dx * 0.0055;
      targetCamPitch = THREE.MathUtils.clamp(targetCamPitch + dy * 0.0045, -0.25, 1.15);
    }
  };

  const onPointerUp = () => {
    isDragging = false;
  };

  const onWheel = (e: WheelEvent) => {
    if (!isPlaying || freeCam || isDead) return;
    targetCamDist = THREE.MathUtils.clamp(targetCamDist + e.deltaY * 0.005, 3.0, 14.5);
  };

  const onBlur = () => {
    keys.clear();
    isDragging = false;
  };

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  let frameId = 0;
  let disposed = false;
  let lastTime = performance.now();
  let elapsed = 0;
  let tickCount = 0;
  let lastAcademyScale: number = ACADEMY.scaleFar;

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext | null;
    if (!gl || typeof gl.fenceSync !== 'function') {
      frameId = window.setTimeout(cb, 20);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    if (!sync) {
      frameId = window.setTimeout(cb, 20);
      return;
    }
    const poll = () => {
      if (disposed) {
        gl.deleteSync(sync);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 20);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function respawnAtCheckpoint() {
    const cp = activeRealm === 'astral' ? activeAstralCheckpoint : activeCheckpoint;
    posX = cp.respawnX;
    posY = cp.respawnY;
    posZ = cp.respawnZ;
    velY = 0;
    grounded = true;
    isRolling = false;
    isResting = false;
    restBlend = 0;
    gateOpening = false;

    // Face toward the bonfire or scenic vista upon respawn
    const dx = cp.x - posX;
    const dz = cp.z - posZ;
    knightYaw = Math.hypot(dx, dz) > 0.1 ? Math.atan2(-dx, -dz) : 0;

    camYaw = knightYaw;
    targetCamYaw = knightYaw;
    camPitch = activeRealm === 'astral' ? 0.14 : 0.12;
    targetCamPitch = camPitch;
    camDist = activeRealm === 'astral' ? 6.8 : 5.8;
    targetCamDist = camDist;

    const horizDist = Math.cos(camPitch) * camDist;
    const vertDist = Math.sin(camPitch) * camDist;
    camPosCurrent.set(
      posX + Math.sin(camYaw) * horizDist,
      posY + 1.7 + vertDist,
      posZ + Math.cos(camYaw) * horizDist,
    );
    camLookCurrent.set(posX, posY + 1.95, posZ);
    camera.position.copy(camPosCurrent);
    camera.lookAt(camLookCurrent);

    currentZone = computeZone();
    isDead = false;
    deathTimer = 0;
    callbacks.onDeathStateChange(false);
    const portal = computePortalState();
    callbacks.onPromptStateChange({
      realm: activeRealm,
      nearBonfire: computeNearBonfire() !== null,
      nearGate: activeRealm === 'overworld' && findNearCatacombGate(posX, posY, posZ, gateOpened),
      nearAstralPortal: portal.near,
      portalLabel: portal.label,
      gateOpening: false,
      gateOpened,
      isResting: false,
      freeCam,
      zone: currentZone,
    });
  }

  function stepSimulation(dt: number) {
    // Handle smooth 0.8s Celestial Portal Fade Transition
    if (portalTransitionActive) {
      portalTransitionTimer += dt;
      if (!portalSwapped && portalTransitionTimer >= portalTransitionDuration * 0.5) {
        portalSwapped = true;
        applyRealmSwap(portalTransitionTarget);
        callbacks.onPortalFadeChange(0);
      }
      if (portalTransitionTimer >= portalTransitionDuration) {
        portalTransitionActive = false;
        callbacks.onPortalFadeChange(0);
      }
    }

    if (activeRealm === 'astral') {
      astralCapital.update(elapsed, dt, freeCam ? freeCamPos.x : posX, posY, freeCam ? freeCamPos.z : posZ);
    } else {
      // Dynamic forced-perspective scale illusion for the Raya Lucaria-inspired Academy Citadel:
      // Towers at 2.6x from >=220m away and smoothly settles to true 1.0x proportions by <=45m.
      const viewerX = freeCam ? freeCamPos.x : posX;
      const viewerZ = freeCam ? freeCamPos.z : posZ;
      const distToAcademy =
        viewerZ <= ACADEMY.castleBaseZ && viewerZ >= -980 && Math.abs(viewerX) < 110
          ? 0
          : Math.hypot(viewerX - ACADEMY.castleBaseX, viewerZ - ACADEMY.castleBaseZ);
      lastAcademyScale = computeAcademyScale(distToAcademy);
      world.academyCastleGroup.scale.setScalar(lastAcademyScale);
      world.academyCastleGroup.updateMatrixWorld();

      world.update(elapsed, dt, posZ, posY, posX);
    }

    // Smoothly blend resting pose
    restBlend = THREE.MathUtils.damp(restBlend, isResting ? 1 : 0, 7.5, dt);

    let horizontalSpeed = 0;
    const isSprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && !isResting;

    if (isPlaying && isDead) {
      // Hold dramatic camera overlooking the abyss for 2.5s before respawning at active bonfire
      deathTimer += dt;
      velY -= 12.0 * dt;
      posY += velY * dt;
      _desiredLook.set(posX, posY + 1.2, posZ);
      camLookCurrent.lerp(_desiredLook, 1 - Math.exp(-5 * dt));
      camera.lookAt(camLookCurrent);

      if (deathTimer >= 2.5) {
        respawnAtCheckpoint();
      }
    } else if (isPlaying && freeCam) {
      // Free-Roam Photo Camera flight
      const flySpeed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 28 : 13;
      const cosP = Math.cos(freePitch);
      _camFwd
        .set(-Math.sin(freeYaw) * cosP, Math.sin(freePitch), -Math.cos(freeYaw) * cosP)
        .normalize();
      _camRight.crossVectors(_camFwd, _up).normalize();

      if (keys.has('KeyW') || keys.has('ArrowUp')) freeCamPos.addScaledVector(_camFwd, flySpeed * dt);
      if (keys.has('KeyS') || keys.has('ArrowDown'))
        freeCamPos.addScaledVector(_camFwd, -flySpeed * dt);
      if (keys.has('KeyD') || keys.has('ArrowRight'))
        freeCamPos.addScaledVector(_camRight, flySpeed * dt);
      if (keys.has('KeyA') || keys.has('ArrowLeft'))
        freeCamPos.addScaledVector(_camRight, -flySpeed * dt);
      if (keys.has('Space')) freeCamPos.y += flySpeed * 0.7 * dt;
      if (keys.has('KeyQ') || keys.has('ControlLeft')) freeCamPos.y -= flySpeed * 0.7 * dt;

      camera.position.copy(freeCamPos);
      _desiredLook.copy(freeCamPos).add(_camFwd);
      camera.lookAt(_desiredLook);
    } else if (isPlaying && gateOpening) {
      // Dramatic Dark Souls-style double-door push & inward swing sequence
      gateAnimTimer += dt;
      const openPhase = THREE.MathUtils.clamp((gateAnimTimer - 0.28) / 1.72, 0, 1);
      const easeOpen = openPhase * openPhase * (3 - 2 * openPhase);

      // Step knight into position facing the doors (-X) and lean forward pushing
      const targetPushX = -13.15 - easeOpen * 0.65;
      posX = THREE.MathUtils.damp(posX, targetPushX, 8, dt);
      posZ = THREE.MathUtils.damp(posZ, WORLD.catacombGatePos.z, 8, dt);
      posY = WORLD.terraceY;
      velY = 0;
      grounded = true;

      let yawDiff = Math.PI / 2 - knightYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      knightYaw += yawDiff * (1 - Math.exp(-10 * dt));

      // Swing heavy double doors inward smoothly into the tunnel
      world.catacombGate.leftDoorPivot.rotation.y = 1.32 * easeOpen;
      world.catacombGate.rightDoorPivot.rotation.y = -1.32 * easeOpen;

      const sealMat = world.catacombGate.doorSealSeam.material as THREE.MeshBasicMaterial;
      sealMat.opacity = Math.max(0, 0.9 * (1 - easeOpen * 4.5));
      if (easeOpen > 0.22) {
        world.catacombGate.doorSealSeam.visible = false;
      }

      // Dramatic over-the-shoulder angle framing knight + parting doors + tunnel descent
      _desiredCamPos.set(posX + 4.2, posY + 2.35, posZ + 2.1);
      _desiredLook.set(-18.5, posY + 3.1, WORLD.catacombGatePos.z);
      const camFollowRate = 1 - Math.exp(-6 * dt);
      camPosCurrent.lerp(_desiredCamPos, camFollowRate);
      camLookCurrent.lerp(_desiredLook, camFollowRate);
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);

      if (gateAnimTimer >= gateAnimDuration) {
        gateOpening = false;
        gateOpened = true;
        targetCamYaw = Math.PI / 2;
        camYaw = Math.PI / 2;
        syncPromptState();
      }
    } else if (isPlaying) {
      // Third-person character movement relative to camera yaw
      _camFwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      _camRight.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
      _moveDir.set(0, 0, 0);

      if (keys.has('KeyW') || keys.has('ArrowUp')) _moveDir.add(_camFwd);
      if (keys.has('KeyS') || keys.has('ArrowDown')) _moveDir.sub(_camFwd);
      if (keys.has('KeyD') || keys.has('ArrowRight')) _moveDir.add(_camRight);
      if (keys.has('KeyA') || keys.has('ArrowLeft')) _moveDir.sub(_camRight);

      if (_moveDir.lengthSq() > 0.001) {
        if (isResting) {
          isResting = false;
          syncPromptState();
        }
        _moveDir.normalize();
      }

      const prevX = posX;
      const prevY = posY;
      const prevZ = posZ;

      if (isRolling) {
        rollTimer += dt;
        const speed = 11.2 * (1 - (rollTimer / rollDuration) * 0.35);
        const resolved =
          activeRealm === 'astral'
            ? resolveAstralObstacleCollisions(
                posX + rollDirX * speed * dt,
                posY,
                posZ + rollDirZ * speed * dt,
                0.45,
              )
            : resolveObstacleCollisions(
                posX + rollDirX * speed * dt,
                posY,
                posZ + rollDirZ * speed * dt,
                0.45,
                gateOpened,
              );
        posX = resolved.x;
        posZ = resolved.z;
        horizontalSpeed = speed;
        if (rollTimer >= rollDuration) {
          isRolling = false;
        }
      } else if (_moveDir.lengthSq() > 0.001) {
        const moveSpeed = isSprinting ? 10.6 : 5.6;
        const resolved =
          activeRealm === 'astral'
            ? resolveAstralObstacleCollisions(
                posX + _moveDir.x * moveSpeed * dt,
                posY,
                posZ + _moveDir.z * moveSpeed * dt,
                0.45,
              )
            : resolveObstacleCollisions(
                posX + _moveDir.x * moveSpeed * dt,
                posY,
                posZ + _moveDir.z * moveSpeed * dt,
                0.45,
                gateOpened,
              );
        posX = resolved.x;
        posZ = resolved.z;
        horizontalSpeed = moveSpeed;

        // Smooth character rotation toward movement direction
        const targetYaw = Math.atan2(-_moveDir.x, -_moveDir.z);
        let diff = targetYaw - knightYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        knightYaw += diff * (1 - Math.exp(-12 * dt));
      }

      // Swept Continuous 3D Raycast + Analytical Multi-Tier Floor Collision (100% solid staircases!)
      const rayFloor = raycastFloorAt(
        posX,
        Math.max(prevY, posY) + 1.15,
        Math.min(prevY, posY) - 2.6,
        posZ,
      );
      const vStep =
        activeRealm === 'astral'
          ? resolveAstralVerticalStep({
              prevX,
              prevY,
              prevZ,
              nextX: posX,
              nextZ: posZ,
              velY,
              grounded,
              dt,
              raycastFloor: rayFloor,
            })
          : resolveVerticalStep({
              prevX,
              prevY,
              prevZ,
              nextX: posX,
              nextZ: posZ,
              velY,
              grounded,
              dt,
              raycastFloor: rayFloor,
            });
      posY = vStep.y;
      velY = vStep.velY;
      grounded = vStep.grounded;

      // Lethal Fall Detection
      const fell = activeRealm === 'astral' ? isAstralLethalFall(posY) : isLethalFall(posY);
      if (fell) {
        isDead = true;
        deathTimer = 0;
        isRolling = false;
        isResting = false;
        keys.clear();
        callbacks.onDeathStateChange(true);
      }

      if (horizontalSpeed > 0.2 && grounded && !isRolling) {
        walkPhase += dt * (isSprinting ? 12.5 : 8.2);
      }

      // Check Zone Discovery, Bonfire, and Portal proximity
      const nextZone = computeZone();
      if (nextZone !== currentZone) {
        currentZone = nextZone;
        callbacks.onZoneEnter(nextZone);
        syncPromptState();
      } else {
        syncPromptState();
      }

      // Third-Person Damped Camera Orbit (or Cinematic Bonfire Angle when resting)
      if (isResting) {
        const cineAngle = Math.sin(elapsed * 0.14) * 0.28 + 0.55;
        _desiredCamPos.set(
          posX + Math.sin(cineAngle) * 4.4,
          posY + 1.85,
          posZ + Math.cos(cineAngle) * 4.4,
        );
        if (activeRealm === 'astral') {
          _desiredLook.set(activeAstralCheckpoint.x, activeAstralCheckpoint.y + 1.4, activeAstralCheckpoint.z);
        } else if (activeCheckpoint.id === 'catacomb-terrace') {
          _desiredLook.set(-12.5, WORLD.terraceY + 3.2, -111.5);
        } else if (activeCheckpoint.id === 'ashen-cloister') {
          _desiredLook.set(-16.2, TOWER.tier2Y + 1.1, TOWER.cz);
        } else if (activeCheckpoint.id === 'moonlit-clearing') {
          _desiredLook.set(HINTERLAND.clearingCx, WORLD.hinterlandY + 1.1, HINTERLAND.clearingCz);
        } else if (activeCheckpoint.id === 'ashenbrook-hamlet') {
          _desiredLook.set(HAMLET.bonfireX, HAMLET.hamletY + 1.1, HAMLET.bonfireZ);
        } else if (activeCheckpoint.id === 'academy-lake') {
          _desiredLook.set(ACADEMY.bonfireX, ACADEMY.causewayY + 1.2, ACADEMY.bonfireZ);
        } else {
          _desiredLook.set(0, WORLD.pitDepth + 1.0, -4.0);
        }
      } else {
        camYaw = THREE.MathUtils.damp(camYaw, targetCamYaw, 11, dt);
        camPitch = THREE.MathUtils.damp(camPitch, targetCamPitch, 11, dt);
        camDist = THREE.MathUtils.damp(camDist, targetCamDist, 10, dt);

        const horizDist = Math.cos(camPitch) * camDist;
        const vertDist = Math.sin(camPitch) * camDist;
        _desiredCamPos.set(
          posX + Math.sin(camYaw) * horizDist,
          posY + 1.7 + vertDist,
          posZ + Math.cos(camYaw) * horizDist,
        );

        // Keep camera safely above the surface tier the knight is currently standing on
        const inTunnel = activeRealm === 'overworld' && posX < -13.0 && posY < -10.0;
        const inCitadelInterior = activeRealm === 'overworld' && posZ <= -210.5 && posZ >= -287.5;
        const inIndoor = inTunnel || inCitadelInterior;
        const camGround =
          activeRealm === 'astral'
            ? sampleAstralFloorHeight(_desiredCamPos.x, posY + 1.5, _desiredCamPos.z, 1.5)
            : sampleFloorHeight(_desiredCamPos.x, posY + (inIndoor ? 3.2 : 1.2), _desiredCamPos.z, 0.6);
        if (camGround !== null && _desiredCamPos.y < camGround + 0.85) {
          _desiredCamPos.y = camGround + 0.85;
        }

        // Pull camera cleanly inside tunnel & Citadel Spiral Tower vaults so walls/ceilings never clip view
        if (inIndoor) {
          _camRayOrigin.set(posX, posY + 1.55, posZ);
          _camRayDir.subVectors(_desiredCamPos, _camRayOrigin);
          const wantDist = _camRayDir.length();
          if (wantDist > 0.05) {
            _camRayDir.divideScalar(wantDist);
            _raycaster.set(_camRayOrigin, _camRayDir);
            _raycaster.near = 0.2;
            _raycaster.far = wantDist;
            _rayHits.length = 0;
            _raycaster.intersectObjects(world.tunnelWalls, false, _rayHits);
            if (_rayHits.length > 0) {
              const safeDist = Math.max(1.3, _rayHits[0].distance - 0.45);
              _desiredCamPos.copy(_camRayOrigin).addScaledVector(_camRayDir, safeDist);
            }
          }
          const ceilingCap = posZ > -265.0 && posY > 14.0 ? 18.0 : 5.2;
          if (_desiredCamPos.y > posY + ceilingCap) {
            _desiredCamPos.y = posY + ceilingCap;
          }
        }

        _desiredLook.set(posX, posY + 1.95, posZ);
      }

      const camFollowRate = 1 - Math.exp(-10 * dt);
      camPosCurrent.lerp(_desiredCamPos, camFollowRate);
      camLookCurrent.lerp(_desiredLook, camFollowRate);
      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);
    } else {
      // Title Screen Vista: Slow atmospheric camera pan overlooking sanctuary -> viaduct -> citadel
      const pan = Math.sin(elapsed * 0.18) * 3.2;
      _desiredCamPos.set(pan - 1.6, 3.3 + Math.sin(elapsed * 0.25) * 0.28, 13.6);
      _desiredLook.set(0, 12.5, -75);
      camera.position.lerp(_desiredCamPos, 1 - Math.exp(-3 * dt));
      camPosCurrent.copy(camera.position);
      camLookCurrent.lerp(_desiredLook, 1 - Math.exp(-3 * dt));
      camera.lookAt(camLookCurrent);
    }

    // Dynamic subterranean tunnel light tracking player progression underground
    if (activeRealm === 'overworld' && posX < -12.5 && posY < -10.5 && (gateOpening || gateOpened)) {
      world.tunnelLight.position.set(
        THREE.MathUtils.damp(world.tunnelLight.position.x, Math.min(-15.5, posX - 1.5), 8, dt),
        THREE.MathUtils.damp(world.tunnelLight.position.y, posY + 3.2, 8, dt),
        THREE.MathUtils.damp(world.tunnelLight.position.z, posZ, 8, dt),
      );
      world.tunnelLight.intensity = THREE.MathUtils.damp(world.tunnelLight.intensity, 12.5, 6, dt);
    } else {
      world.tunnelLight.intensity = THREE.MathUtils.damp(world.tunnelLight.intensity, 0, 6, dt);
    }

    // Update Knight Transform & Contact Shadow
    knight.root.position.set(posX, posY, posZ);
    knight.root.rotation.y = knightYaw;
    const floorBeneath =
      raycastFloorAt(posX, posY + 0.5, posY - 4.0, posZ) ??
      (activeRealm === 'astral'
        ? sampleAstralFloorHeight(posX, posY, posZ, 0.35)
        : sampleFloorHeight(posX, posY, posZ, 0.35));
    if (floorBeneath !== null) {
      knight.contactShadow.position.y = Math.max(0.02, floorBeneath - posY + 0.025);
      (knight.contactShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        0.6 - (posY - floorBeneath) * 0.18,
      );
    } else {
      (knight.contactShadow.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    animateKnight(knight, {
      speed: horizontalSpeed,
      grounded,
      isSprinting,
      isRolling,
      rollProgress: Math.min(1, rollTimer / rollDuration),
      isResting,
      restBlend,
      isPushingGate: gateOpening,
      pushProgress: gateOpening ? Math.min(1, gateAnimTimer / gateAnimDuration) : 0,
      walkPhase,
      elapsed,
    });

    // Smooth atmospheric fog & sky/lighting shift across realms & zones
    let targetFogDensity = 0.0042;
    let targetHemi = 1.05;
    let targetSun = 2.55;
    if (activeRealm === 'astral') {
      _targetFogCol.copy(_astralFogCol);
      targetFogDensity = 0.00115;
      targetHemi = 1.3;
      targetSun = 2.35;
    } else if (posZ <= -274.0 && (posY < -0.5 || posZ <= -584.0)) {
      if (posX <= -205.0) {
        _targetFogCol.copy(_snowPassFogCol);
        targetFogDensity = 0.0165;
        targetHemi = 1.05;
        targetSun = 1.15;
      } else if (posX <= -145.0) {
        _targetFogCol.copy(_hamletFogCol);
        targetFogDensity = 0.0145;
        targetHemi = 0.88;
        targetSun = 0.85;
      } else if (posZ <= -584.0) {
        _targetFogCol.copy(_lakeFogCol);
        targetFogDensity = 0.0034;
        targetHemi = 0.84;
        targetSun = 1.48;
      } else if (posZ <= -525.0) {
        _targetFogCol.copy(_hinterlandFogCol).lerp(_lakeFogCol, 0.45);
        targetFogDensity = 0.0056;
        targetHemi = 0.9;
        targetSun = 0.9;
      } else {
        _targetFogCol.copy(_hinterlandFogCol);
        targetFogDensity = 0.0135;
        targetHemi = 0.88;
        targetSun = 0.95;
      }
    } else if (posZ <= -224.0 && posZ > -274.0 && posY <= 9.5) {
      _targetFogCol.copy(_cloisterFogCol);
      targetFogDensity = 0.0085;
      targetHemi = 0.65;
      targetSun = 0.45;
    } else {
      _targetFogCol.copy(_twilightFogCol);
    }
    const atmosLerp = 1 - Math.exp(-3.2 * dt);
    const fogExp = scene.fog as THREE.FogExp2;
    fogExp.color.lerp(_targetFogCol, atmosLerp);
    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(_targetFogCol, atmosLerp);
    }
    fogExp.density = THREE.MathUtils.damp(fogExp.density, targetFogDensity, 3.2, dt);
    hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, targetHemi, 3.2, dt);
    sunLight.intensity = THREE.MathUtils.damp(sunLight.intensity, targetSun, 3.2, dt);

    // Keep directional shadow frustum centered near player/midground
    if (activeRealm === 'astral') {
      sunLight.target.position.set(posX, posY - 12, posZ - 65);
      sunLight.position.set(posX + 120, posY + 110, posZ + 90);
    } else if (posZ <= -584.0 && posX > -145.0) {
      sunLight.target.position.set(posX, posY + 8, posZ - 45);
      sunLight.position.set(posX - 95, posY + 78, sunLight.target.position.z + 85);
    } else {
      sunLight.target.position.set(posX, posY, posZ - 35);
      sunLight.position.set(posX + 85, posY + 68, sunLight.target.position.z - 80);
    }
    sunLight.target.updateMatrixWorld();
  }

  function tick() {
    if (disposed) return;
    const now = performance.now();
    const rawDt = Math.min((now - lastTime) / 1000, isSoftwareGl ? 0.28 : 0.05);
    lastTime = now;

    const substeps = rawDt > 0.025 ? Math.ceil(rawDt / 0.025) : 1;
    const subDt = rawDt / substeps;
    for (let s = 0; s < substeps; s++) {
      elapsed += subDt;
      stepSimulation(subDt);
    }
    renderer.render(scene, camera);
    tickCount++;

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  (window as unknown as Record<string, unknown>).__playerState = () => ({
    realm: activeRealm,
    x: Number(posX.toFixed(2)),
    y: Number(posY.toFixed(2)),
    z: Number(posZ.toFixed(2)),
    grounded,
    zone: currentZone,
    nearGate: lastNearGate,
    nearAstralPortal: lastPortalState.near,
    gateOpening,
    gateOpened,
    isDead,
    freeCam,
    cameraFar: camera.far,
    overworldVisible: world.overworldGroup.visible,
    astralVisible: astralCapital.group.visible,
    academyScale: Number(lastAcademyScale.toFixed(3)),
    tickCount,
  });

  tick();

  return {
    setPlaying: (playing: boolean) => {
      if (playing && !isPlaying) {
        isPlaying = true;
        currentZone = computeZone();
        callbacks.onZoneEnter(currentZone);
        syncPromptState();
      } else {
        isPlaying = playing;
      }
    },
    toggleFreeCam: () => {
      if (!isPlaying || isDead || portalTransitionActive) return;
      freeCam = !freeCam;
      if (freeCam) {
        freeCamPos.copy(camera.position);
        freeYaw = camYaw;
        freePitch = -camPitch * 0.6;
      }
      syncPromptState();
    },
    dispose: () => {
      disposed = true;
      delete (window as unknown as Record<string, unknown>).__playerState;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      astralCapital.dispose();
      world.dispose();
      textures.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
