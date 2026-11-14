import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createWorldTextures } from './textures';
import { buildFantasyWorld } from './buildWorld';
import { buildAstralCapital } from './buildAstralCapital';
import { createKnight, animateKnight } from './knight';
import {
  BIOME_ATMOSPHERES,
  selectBiomeAtmosphere,
  wrapParticleAxis,
} from './atmosphereAndAudio';
import { createFantasyAudioEngine } from './audio';
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
    pointerLocked: boolean;
    bloomEnabled: boolean;
    audioMuted: boolean;
    audioInitialized: boolean;
    zone: ZoneId;
  }) => void;
}

export interface EngineController {
  setPlaying: (playing: boolean) => void;
  toggleFreeCam: () => void;
  togglePointerLock: () => void;
  toggleBloom: () => void;
  toggleAudioMute: () => void;
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
const _targetFogCol = new THREE.Color(0x6d5a45);
const _targetHemiSkyCol = new THREE.Color(0x7e97bd);
const _targetHemiGroundCol = new THREE.Color(0x382a1f);
const _targetSunCol = new THREE.Color(0xffc175);
const _targetRimCol = new THREE.Color(0x9fb5d9);
const _targetParticleCol = new THREE.Color(0xffd788);

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

function createTwilightStarlightEnvTexture(renderer: THREE.WebGLRenderer): THREE.Texture {
  const envScene = new THREE.Scene();
  const skyGeo = new THREE.SphereGeometry(40, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      void main() {
        float up = clamp(vDir.y, -1.0, 1.0);
        vec3 nadir = vec3(0.035, 0.045, 0.095);
        vec3 horizon = vec3(0.32, 0.48, 0.72);
        vec3 zenith = vec3(0.055, 0.075, 0.22);
        vec3 col = mix(nadir, horizon, smoothstep(-0.35, 0.05, up));
        col = mix(col, zenith, smoothstep(0.05, 0.75, up));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const envSky = new THREE.Mesh(skyGeo, skyMat);
  envScene.add(envSky);

  const rimGeo = new THREE.CircleGeometry(10, 24);
  const goldRimMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.65, 0.72),
    side: THREE.DoubleSide,
  });
  const goldRimCard = new THREE.Mesh(rimGeo, goldRimMat);
  goldRimCard.position.set(18, 12, -22);
  goldRimCard.lookAt(0, 0, 0);
  envScene.add(goldRimCard);

  const moonMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.25, 1.55, 2.25),
    side: THREE.DoubleSide,
  });
  const moonCard = new THREE.Mesh(rimGeo, moonMat);
  moonCard.position.set(-20, 18, 16);
  moonCard.lookAt(0, 0, 0);
  envScene.add(moonCard);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envTex = pmrem.fromScene(envScene, 0.04).texture;

  skyGeo.dispose();
  skyMat.dispose();
  rimGeo.dispose();
  goldRimMat.dispose();
  moonMat.dispose();
  pmrem.dispose();
  return envTex;
}

function createSoftMoteTexture(): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.32, 'rgba(255, 255, 255, 0.65)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.14)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function mountFantasyEngine(
  container: HTMLElement,
  callbacks: EngineCallbacks,
  initialPlaying: boolean,
): EngineController {
  const isSoftwareGl = detectSoftwareWebGL();
  const initW = container.clientWidth || window.innerWidth;
  const initH = container.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initW, initH);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('data-testid', 'world-canvas');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BIOME_ATMOSPHERES.twilight.fogHex);
  scene.fog = new THREE.FogExp2(BIOME_ATMOSPHERES.twilight.fogHex, BIOME_ATMOSPHERES.twilight.fogDensity);

  // Custom procedural twilight & starlight PMREM environment cubemap
  const envTex = createTwilightStarlightEnvTexture(renderer);
  scene.environment = envTex;
  scene.environmentIntensity = 0.72;

  const camera = new THREE.PerspectiveCamera(56, initW / initH, 0.2, 2600);

  // Post-processing: Selective Unreal Bloom + OutputPass (bypassed on SwiftShader software GL)
  let bloomEnabled = true;
  const composerTarget = new THREE.WebGLRenderTarget(initW, initH, {
    type: THREE.HalfFloatType,
  });
  const composer = new EffectComposer(renderer, composerTarget);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(initW, initH), 0.34, 0.48, 0.84);
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  // Lighting: Cool-cerulean HemisphereLight, primary DirectionalLight (intensity 1.85), & warm RimLight
  const hemiLight = new THREE.HemisphereLight(
    BIOME_ATMOSPHERES.twilight.hemiSkyHex,
    BIOME_ATMOSPHERES.twilight.hemiGroundHex,
    BIOME_ATMOSPHERES.twilight.hemiIntensity,
  );
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(
    BIOME_ATMOSPHERES.twilight.sunHex,
    BIOME_ATMOSPHERES.twilight.sunIntensity,
  );
  sunLight.position.set(42, 46, -38);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 4;
  sunLight.shadow.camera.far = 160;
  sunLight.shadow.camera.left = -17;
  sunLight.shadow.camera.right = 17;
  sunLight.shadow.camera.top = 17;
  sunLight.shadow.camera.bottom = -17;
  sunLight.shadow.camera.updateProjectionMatrix();
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.025;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const rimLight = new THREE.DirectionalLight(
    BIOME_ATMOSPHERES.twilight.rimHex,
    BIOME_ATMOSPHERES.twilight.rimIntensity,
  );
  rimLight.position.set(-48, 32, 54);
  scene.add(rimLight);

  // Build Textures, Overworld, Astral Royal Capital, Knight, and Audio Engine
  const textures = createWorldTextures(renderer);
  const world = buildFantasyWorld(scene, textures);
  const astralCapital = buildAstralCapital(scene, textures, renderer);
  const knight = createKnight();
  scene.add(knight.root);
  const audioEngine = createFantasyAudioEngine();

  // Single-Draw-Call Batched Atmospheric Motes (750 particles in 45m radius around player)
  const PARTICLE_COUNT = 750;
  const PARTICLE_RADIUS = 45;
  const moteTex = createSoftMoteTexture();
  const motePositions = new Float32Array(PARTICLE_COUNT * 3);
  const moteSeeds = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    motePositions[i * 3] = (Math.random() - 0.5) * PARTICLE_RADIUS * 2;
    motePositions[i * 3 + 1] = -6 + Math.random() * 32;
    motePositions[i * 3 + 2] = (Math.random() - 0.5) * PARTICLE_RADIUS * 2;
    moteSeeds[i] = Math.random() * Math.PI * 2;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = new THREE.PointsMaterial({
    size: 0.42,
    map: moteTex,
    color: BIOME_ATMOSPHERES.twilight.particleHex,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const motePoints = new THREE.Points(moteGeo, moteMat);
  motePoints.frustumCulled = false;
  scene.add(motePoints);

  const urlSpawn =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('spawn') : null;

  // Player & Camera State
  let activeRealm: RealmId = 'overworld';
  let isPlaying = initialPlaying;
  let freeCam = urlSpawn === 'aerial';
  let isPointerLocked = false;
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
  } else if (urlSpawn === 'hinterland') {
    posX = 0;
    posZ = -278.0;
    posY = TOWER.tier3Y;
  } else if (urlSpawn === 'clearing') {
    posX = -2.8;
    posZ = HINTERLAND.clearingCz + 5.2;
    posY = WORLD.hinterlandY;
  } else if (urlSpawn === 'alcove') {
    posX = 24.0;
    posZ = -475.0;
    posY = WORLD.hinterlandY;
    knightYaw = -1.12;
  } else if (urlSpawn === 'river') {
    posX = 0;
    posZ = -544.0;
    posY = WORLD.hinterlandY;
  } else if (urlSpawn === 'lakegate') {
    posX = 0;
    posZ = -583.5;
    posY = WORLD.hinterlandY;
  } else if (urlSpawn === 'lakebonfire') {
    posX = ACADEMY.bonfireX - 3.2;
    posZ = ACADEMY.bonfireZ + 3.0;
    posY = ACADEMY.causewayY + 0.15;
  } else if (urlSpawn === 'academy') {
    posX = 0;
    posZ = -805.0;
    posY = ACADEMY.castleBaseY;
  } else if (urlSpawn === 'forecourt') {
    posX = 0;
    posZ = -872.0;
    posY = ACADEMY.forecourtY;
  } else if (urlSpawn === 'westcloister') {
    posX = -114.0;
    posZ = -772.0;
    posY = ACADEMY.westCloisterY;
  } else if (urlSpawn === 'eastharbor') {
    posX = 114.0;
    posZ = -772.0;
    posY = ACADEMY.eastBastionY;
  } else if (urlSpawn === 'trail') {
    posX = -80.0;
    posZ = getRiversideTrailZ(-80.0);
    posY = getHinterlandGroundY(posX, posZ);
    knightYaw = Math.PI / 2;
  } else if (urlSpawn === 'hamlet') {
    posX = -166.0;
    posZ = -548.0;
    posY = HAMLET.hamletY;
    knightYaw = Math.PI / 2;
  } else if (urlSpawn === 'snowpass') {
    posX = -218.0;
    posZ = getSnowPassCenterZ(-218.0);
    posY = getHinterlandGroundY(posX, posZ);
    knightYaw = Math.PI / 2;
  } else if (urlSpawn === 'tunneldoor') {
    gateOpened = true;
    world.catacombGate.leftDoorPivot.rotation.y = 1.32;
    world.catacombGate.rightDoorPivot.rotation.y = -1.32;
    world.catacombGate.doorSealSeam.visible = false;
    posX = -36.5;
    posY = -26.0;
    posZ = -133.5;
    knightYaw = 0;
  } else if (urlSpawn === 'aerial') {
    posX = 0.0;
    posZ = -544.0;
    posY = getHinterlandGroundY(posX, posZ);
    knightYaw = 0;
  } else if (
    urlSpawn === 'astral' ||
    urlSpawn === 'astral-rear' ||
    urlSpawn === 'astral-west' ||
    urlSpawn === 'astral-east' ||
    urlSpawn === 'astral-sprawl' ||
    urlSpawn === 'astral-dragon' ||
    urlSpawn === 'astral-bridge' ||
    urlSpawn === 'astral-fortress' ||
    urlSpawn === 'astral-aqueduct' ||
    urlSpawn === 'astral-shrine' ||
    urlSpawn === 'astral-abbey'
  ) {
    activeRealm = 'astral';
    world.overworldGroup.visible = false;
    astralCapital.group.visible = true;
    camera.far = 5600;
    camera.updateProjectionMatrix();

    if (urlSpawn === 'astral-rear') {
      posX = 0;
      posY = ASTRAL.rearPlazaY;
      posZ = 212;
      knightYaw = Math.PI;
    } else if (urlSpawn === 'astral-west') {
      posX = -182;
      posY = ASTRAL.wardPlazaY;
      posZ = -34;
      knightYaw = 0;
    } else if (urlSpawn === 'astral-east') {
      posX = 194;
      posY = ASTRAL.wardPlazaY;
      posZ = -36;
      knightYaw = 0;
    } else if (urlSpawn === 'astral-sprawl') {
      posX = 0;
      posY = ASTRAL.cityPlazaY;
      posZ = -28;
      knightYaw = 0;
    } else if (
      urlSpawn === 'astral-dragon' ||
      urlSpawn === 'astral-bridge' ||
      urlSpawn === 'astral-fortress'
    ) {
      posX = 44;
      posY = ASTRAL.citadelTerraceY;
      posZ = -155;
      knightYaw = -Math.PI / 2;
    } else if (urlSpawn === 'astral-aqueduct') {
      posX = 0;
      posY = ASTRAL.aqueductDeckY;
      posZ = -356;
      knightYaw = 0;
    } else if (urlSpawn === 'astral-shrine') {
      posX = 0;
      posY = ASTRAL.shrineHarborY;
      posZ = -454;
      knightYaw = 0;
    } else if (urlSpawn === 'astral-abbey') {
      posX = 0;
      posY = ASTRAL.shrineSummitY;
      posZ = -614;
      knightYaw = 0;
    } else {
      posX = ASTRAL.spawnPos.x;
      posY = ASTRAL.spawnPos.y;
      posZ = ASTRAL.spawnPos.z;
      knightYaw = 0;
    }
  }
  let velY = 0;
  let grounded = true;
  let walkPhase = 0;
  let lastStepIndex = 0;

  // Dodge-roll state
  let isRolling = false;
  let rollTimer = 0;
  let rollLandPlayed = false;
  const rollDuration = 0.55;
  let rollDirX = 0;
  let rollDirZ = -1;

  // Apply immediate initial atmosphere so frame 1 matches the spawn biome exactly
  {
    const initAtmos = selectBiomeAtmosphere(
      activeRealm,
      posX,
      posY,
      posZ,
      urlSpawn === 'aerial' && freeCam,
    );
    scene.background = new THREE.Color(initAtmos.fogHex);
    (scene.fog as THREE.FogExp2).color.setHex(initAtmos.fogHex);
    (scene.fog as THREE.FogExp2).density = initAtmos.fogDensity;
    hemiLight.color.setHex(initAtmos.hemiSkyHex);
    hemiLight.groundColor.setHex(initAtmos.hemiGroundHex);
    hemiLight.intensity = initAtmos.hemiIntensity;
    sunLight.color.setHex(initAtmos.sunHex);
    sunLight.intensity = initAtmos.sunIntensity;
    rimLight.color.setHex(initAtmos.rimHex);
    rimLight.intensity = initAtmos.rimIntensity;
    moteMat.color.setHex(initAtmos.particleHex);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      motePositions[i * 3] += posX;
      motePositions[i * 3 + 1] += posY + 4;
      motePositions[i * 3 + 2] += posZ;
    }
    (moteGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  // Camera orbit state
  let camYaw =
    urlSpawn === 'terrace' ||
    urlSpawn === 'cloister' ||
    urlSpawn === 'trail' ||
    urlSpawn === 'hamlet' ||
    urlSpawn === 'snowpass'
      ? Math.PI / 2
      : urlSpawn === 'astral-dragon' ||
          urlSpawn === 'astral-bridge' ||
          urlSpawn === 'astral-fortress'
        ? -Math.PI / 2
        : urlSpawn === 'astral-rear'
          ? Math.PI
          : urlSpawn === 'alcove'
            ? -1.12
            : 0;
  let camPitch =
    urlSpawn === 'forecourt'
      ? -0.18
      : urlSpawn === 'astral-dragon' ||
          urlSpawn === 'astral-bridge' ||
          urlSpawn === 'astral-fortress' ||
          urlSpawn === 'astral-sprawl'
        ? 0.08
        : urlSpawn === 'astral'
          ? 0.24
          : urlSpawn === 'astral-shrine' || urlSpawn === 'astral-abbey' || urlSpawn === 'astral-aqueduct'
            ? 0.1
            : activeRealm === 'astral'
              ? 0.14
              : 0.12;
  let camDist =
    urlSpawn === 'forecourt'
      ? 7.5
      : urlSpawn === 'astral'
        ? 6.4
        : urlSpawn === 'astral-dragon' ||
            urlSpawn === 'astral-bridge' ||
            urlSpawn === 'astral-fortress'
          ? 7.4
          : urlSpawn === 'astral-shrine' || urlSpawn === 'astral-abbey' || urlSpawn === 'astral-aqueduct'
            ? 8.4
            : activeRealm === 'astral'
              ? 7.2
              : 5.8;
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
  const freeCamPos =
    urlSpawn === 'aerial' ? new THREE.Vector3(-42, 118, -305) : new THREE.Vector3(0, 12, 14);
  let freeYaw = urlSpawn === 'aerial' ? 0.08 : 0;
  let freePitch = urlSpawn === 'aerial' ? -0.35 : -0.1;

  // Zone & Prompt Tracking
  const computeZone = (): ZoneId =>
    activeRealm === 'astral' ? getAstralZoneAtPosition(posZ, posY, posX) : getZoneAtPosition(posZ, posY, posX);
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
  let lastReportedPointerLocked = false;
  let lastReportedBloomEnabled = bloomEnabled;
  let lastReportedAudioMuted = audioEngine.isMuted();
  let lastReportedAudioInit = audioEngine.isInitialized();

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
    pointerLocked: isPointerLocked,
    bloomEnabled,
    audioMuted: lastReportedAudioMuted,
    audioInitialized: lastReportedAudioInit,
    zone: currentZone,
  });

  // Input State
  const keys = new Set<string>();
  const lastTapTime: Record<string, number> = {};
  const minCamPitch = (-12 * Math.PI) / 180;
  const maxCamPitch = (72 * Math.PI) / 180;

  const requestPointerLock = () => {
    if (!isPlaying || isDead || gateOpening || portalTransitionActive) return;
    try {
      const dom = renderer.domElement as unknown as {
        requestPointerLock?: () => Promise<void> | void;
      };
      const maybePromise = dom.requestPointerLock?.();
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
        (maybePromise as Promise<void>).catch(() => {});
      }
    } catch {
      // Ignore pointer lock rejection in restricted/headless contexts
    }
  };

  const exitPointerLock = () => {
    try {
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock?.();
      }
    } catch {
      // Ignore
    }
  };

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
    rollLandPlayed = false;
    audioEngine.playDodgeRollStart();
  };

  const syncPromptState = () => {
    const near = computeNearBonfire() !== null;
    const nearG = activeRealm === 'overworld' && findNearCatacombGate(posX, posY, posZ, gateOpened);
    const portal = computePortalState();
    const audioMuted = audioEngine.isMuted();
    const audioInit = audioEngine.isInitialized();
    if (
      activeRealm !== lastReportedRealm ||
      near !== lastNearBonfire ||
      nearG !== lastNearGate ||
      portal.near !== lastPortalState.near ||
      portal.label !== lastPortalState.label ||
      gateOpening !== lastReportedGateOpening ||
      gateOpened !== lastReportedGateOpened ||
      isResting !== lastReportedResting ||
      freeCam !== lastReportedFreeCam ||
      isPointerLocked !== lastReportedPointerLocked ||
      bloomEnabled !== lastReportedBloomEnabled ||
      audioMuted !== lastReportedAudioMuted ||
      audioInit !== lastReportedAudioInit
    ) {
      lastReportedRealm = activeRealm;
      lastNearBonfire = near;
      lastNearGate = nearG;
      lastPortalState = portal;
      lastReportedGateOpening = gateOpening;
      lastReportedGateOpened = gateOpened;
      lastReportedResting = isResting;
      lastReportedFreeCam = freeCam;
      lastReportedPointerLocked = isPointerLocked;
      lastReportedBloomEnabled = bloomEnabled;
      lastReportedAudioMuted = audioMuted;
      lastReportedAudioInit = audioInit;
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
        pointerLocked: isPointerLocked,
        bloomEnabled,
        audioMuted,
        audioInitialized: audioInit,
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
      camera.far = 5600;
      camera.updateProjectionMatrix();

      posX = ASTRAL.spawnPos.x;
      posY = ASTRAL.spawnPos.y;
      posZ = ASTRAL.spawnPos.z;
      knightYaw = 0;
      camYaw = 0;
      targetCamYaw = 0;
      camPitch = 0.24;
      targetCamPitch = 0.24;
      camDist = 6.4;
      targetCamDist = 6.4;

      const aPreset = BIOME_ATMOSPHERES.astral;
      scene.background = new THREE.Color(aPreset.fogHex);
      (scene.fog as THREE.FogExp2).color.setHex(aPreset.fogHex);
      (scene.fog as THREE.FogExp2).density = aPreset.fogDensity;
      hemiLight.color.setHex(aPreset.hemiSkyHex);
      hemiLight.groundColor.setHex(aPreset.hemiGroundHex);
      hemiLight.intensity = aPreset.hemiIntensity;
      sunLight.color.setHex(aPreset.sunHex);
      sunLight.intensity = aPreset.sunIntensity;
      rimLight.color.setHex(aPreset.rimHex);
      rimLight.intensity = aPreset.rimIntensity;
      moteMat.color.setHex(aPreset.particleHex);
    } else {
      astralCapital.group.visible = false;
      world.overworldGroup.visible = true;
      camera.far = 2600;
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

      const cPreset = BIOME_ATMOSPHERES.cloister;
      scene.background = new THREE.Color(cPreset.fogHex);
      (scene.fog as THREE.FogExp2).color.setHex(cPreset.fogHex);
      (scene.fog as THREE.FogExp2).density = cPreset.fogDensity;
      hemiLight.color.setHex(cPreset.hemiSkyHex);
      hemiLight.groundColor.setHex(cPreset.hemiGroundHex);
      hemiLight.intensity = cPreset.hemiIntensity;
      sunLight.color.setHex(cPreset.sunHex);
      sunLight.intensity = cPreset.sunIntensity;
      rimLight.color.setHex(cPreset.rimHex);
      rimLight.intensity = cPreset.rimIntensity;
      moteMat.color.setHex(cPreset.particleHex);
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
    audioEngine.unlock();

    if (!wasDown) {
      if (code === 'KeyB') {
        bloomEnabled = !bloomEnabled;
        bloomPass.enabled = bloomEnabled;
        syncPromptState();
        return;
      }

      if (code === 'KeyM') {
        audioEngine.setMuted(!audioEngine.isMuted());
        syncPromptState();
        return;
      }

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

      if (code === 'KeyY' && !gateOpening && !portalTransitionActive) {
        if (document.pointerLockElement === renderer.domElement) {
          exitPointerLock();
        } else {
          requestPointerLock();
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
          audioEngine.playPortalTransition(portalTransitionTarget);
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
        audioEngine.playJump();
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

  const onCanvasClick = () => {
    audioEngine.unlock();
    syncPromptState();
    if (!isPlaying || isDead || gateOpening || portalTransitionActive) return;
    if (document.pointerLockElement !== renderer.domElement) {
      requestPointerLock();
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isPlaying || isDead || gateOpening || portalTransitionActive) return;
    if (document.pointerLockElement !== renderer.domElement) return;
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;

    if (freeCam) {
      freeYaw -= dx * 0.0024;
      freePitch = THREE.MathUtils.clamp(freePitch - dy * 0.0022, -1.35, 1.35);
    } else {
      targetCamYaw -= dx * 0.0026;
      targetCamPitch = THREE.MathUtils.clamp(targetCamPitch + dy * 0.0022, minCamPitch, maxCamPitch);
    }
  };

  const onPointerLockChange = () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
    syncPromptState();
  };

  const onPointerLockError = () => {
    isPointerLocked = false;
    syncPromptState();
  };

  const onWheel = (e: WheelEvent) => {
    if (!isPlaying || freeCam || isDead) return;
    targetCamDist = THREE.MathUtils.clamp(targetCamDist + e.deltaY * 0.005, 3.0, 14.5);
  };

  const onBlur = () => {
    keys.clear();
    exitPointerLock();
  };

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
    if (!isSoftwareGl && bloomEnabled) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('click', onCanvasClick);
  window.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('pointerlockerror', onPointerLockError);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  let frameId = 0;
  let disposed = false;
  let lastTime = performance.now();
  let elapsed = 0;
  let tickCount = 0;
  let lastAcademyScale = 1.0;

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
      pointerLocked: isPointerLocked,
      bloomEnabled,
      audioMuted: audioEngine.isMuted(),
      audioInitialized: audioEngine.isInitialized(),
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
      // Keep the expanded colossal Sunken Arcane Academy at true 1.0x world scale
      // so West Cloister stairs, East Harbor sky-bridge, and multi-tier ramparts align seamlessly.
      lastAcademyScale = 1.0;
      world.academyCastleGroup.scale.setScalar(1.0);
      world.academyCastleGroup.updateMatrixWorld();

      world.update(elapsed, dt, posZ, posY, posX);
    }

    // Smoothly blend resting pose
    restBlend = THREE.MathUtils.damp(restBlend, isResting ? 1 : 0, 7.5, dt);

    let horizontalSpeed = 0;
    const strafeDot = 0;
    const forwardDot = 1;
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
        if (!rollLandPlayed && rollTimer >= 0.43) {
          rollLandPlayed = true;
          audioEngine.playDodgeRollLand();
        }
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

        // Smooth character rotation toward camera-relative movement direction
        const targetYaw = Math.atan2(-_moveDir.x, -_moveDir.z);
        let diff = targetYaw - knightYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        knightYaw += diff * (1 - Math.exp(-12 * dt));
      }

      // Swept Continuous 3D Raycast + Analytical Multi-Tier Floor Collision (100% solid staircases!)
      const wasGrounded = grounded;
      const preImpactVelY = velY;
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

      if (!wasGrounded && grounded && !isRolling) {
        audioEngine.playLand(preImpactVelY);
      }

      // Lethal Fall Detection
      const fell = activeRealm === 'astral' ? isAstralLethalFall(posY) : isLethalFall(posY);
      if (fell) {
        isDead = true;
        deathTimer = 0;
        isRolling = false;
        isResting = false;
        keys.clear();
        exitPointerLock();
        callbacks.onDeathStateChange(true);
      }

      if (horizontalSpeed > 0.2 && grounded && !isRolling) {
        walkPhase += dt * (isSprinting ? 12.5 : 6.5);
        const stepIdx = Math.floor(walkPhase / Math.PI);
        if (stepIdx !== lastStepIndex) {
          lastStepIndex = stepIdx;
          audioEngine.playFootstep(isSprinting);
        }
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
        const waterSurfaceY =
          activeRealm === 'astral'
            ? ASTRAL.waterY
            : posZ <= -584.0 && posX > -155.0
              ? ACADEMY.lakeWaterY
              : posZ <= -538.0 && posZ > -584.0
                ? HINTERLAND.riverWaterY
                : -999;
        const minCamY = Math.max(
          camGround !== null ? camGround + 0.85 : -999,
          waterSurfaceY > -900 ? waterSurfaceY + 0.7 : -999,
        );
        if (minCamY > -900 && _desiredCamPos.y < minCamY) {
          _desiredCamPos.y = minCamY;
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
      velY,
      grounded,
      isSprinting,
      isRolling,
      rollProgress: Math.min(1, rollTimer / rollDuration),
      isResting,
      restBlend,
      isPushingGate: gateOpening,
      pushProgress: gateOpening ? Math.min(1, gateAnimTimer / gateAnimDuration) : 0,
      strafeDot,
      forwardDot,
      walkPhase,
      elapsed,
      dt,
    });

    // Smooth atmospheric fog, hemisphere/sun/rim tints & single-draw-call motes
    const preset = selectBiomeAtmosphere(
      activeRealm,
      posX,
      posY,
      posZ,
      urlSpawn === 'aerial' && freeCam,
    );
    _targetFogCol.setHex(preset.fogHex);
    _targetHemiSkyCol.setHex(preset.hemiSkyHex);
    _targetHemiGroundCol.setHex(preset.hemiGroundHex);
    _targetSunCol.setHex(preset.sunHex);
    _targetRimCol.setHex(preset.rimHex);
    _targetParticleCol.setHex(preset.particleHex);

    const atmosLerp = 1 - Math.exp(-3.2 * dt);
    const fogExp = scene.fog as THREE.FogExp2;
    fogExp.color.lerp(_targetFogCol, atmosLerp);
    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(_targetFogCol, atmosLerp);
    }
    fogExp.density = THREE.MathUtils.damp(fogExp.density, preset.fogDensity, 3.2, dt);

    hemiLight.color.lerp(_targetHemiSkyCol, atmosLerp);
    hemiLight.groundColor.lerp(_targetHemiGroundCol, atmosLerp);
    hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, preset.hemiIntensity, 3.2, dt);

    sunLight.color.lerp(_targetSunCol, atmosLerp);
    sunLight.intensity = THREE.MathUtils.damp(sunLight.intensity, preset.sunIntensity, 3.2, dt);

    rimLight.color.lerp(_targetRimCol, atmosLerp);
    rimLight.intensity = THREE.MathUtils.damp(rimLight.intensity, preset.rimIntensity, 3.2, dt);

    moteMat.color.lerp(_targetParticleCol, atmosLerp);

    // Update 750 drifting atmospheric motes in a 45m radius around the knight
    const mAttr = moteGeo.attributes.position as THREE.BufferAttribute;
    const moteCenterY = posY + 4;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const seed = moteSeeds[i];
      let mx = mAttr.getX(i) + Math.sin(elapsed * 0.45 + seed) * 0.65 * dt;
      let my = mAttr.getY(i) + (0.28 + Math.cos(elapsed * 0.6 + seed * 1.3) * 0.22) * dt;
      let mz = mAttr.getZ(i) + Math.cos(elapsed * 0.38 + seed * 0.7) * 0.65 * dt;

      mx = wrapParticleAxis(mx, posX, PARTICLE_RADIUS);
      mz = wrapParticleAxis(mz, posZ, PARTICLE_RADIUS);
      if (my > moteCenterY + 26) my -= 32;
      else if (my < moteCenterY - 8) my += 32;

      mAttr.setXYZ(i, mx, my, mz);
    }
    mAttr.needsUpdate = true;

    // Tight 34m x 34m directional shadow frustum dynamically tracking the knight every frame
    sunLight.target.position.set(posX, posY, posZ);
    if (activeRealm === 'astral') {
      sunLight.position.set(posX + 42, posY + 46, posZ + 32);
      rimLight.position.set(posX - 48, posY + 28, posZ - 38);
    } else if (posZ <= -584.0 && posX > -145.0) {
      sunLight.position.set(posX - 38, posY + 44, posZ + 36);
      rimLight.position.set(posX + 44, posY + 26, posZ - 32);
    } else {
      sunLight.position.set(posX + 40, posY + 44, posZ - 36);
      rimLight.position.set(posX - 44, posY + 28, posZ + 38);
    }
    sunLight.target.updateMatrixWorld();

    // Update continuous procedural audio landscape
    audioEngine.update({
      elapsed,
      dt,
      realm: activeRealm,
      zone: currentZone,
      speed: horizontalSpeed,
      grounded,
      elevationY: posY,
      isSprinting,
      isResting,
    });
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

    if (!isSoftwareGl && bloomEnabled) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
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
    pointerLocked: isPointerLocked,
    bloomEnabled,
    audioMuted: audioEngine.isMuted(),
    audioInitialized: audioEngine.isInitialized(),
    particleCount: PARTICLE_COUNT,
    knightYaw: Number(knightYaw.toFixed(4)),
    orbitYaw: Number(camYaw.toFixed(4)),
    targetCamYaw: Number(targetCamYaw.toFixed(4)),
    camPitch: Number(camPitch.toFixed(4)),
    targetCamPitch: Number(targetCamPitch.toFixed(4)),
    camX: Number(camera.position.x.toFixed(3)),
    camY: Number(camera.position.y.toFixed(3)),
    camZ: Number(camera.position.z.toFixed(3)),
    camYaw: Number(camera.rotation.y.toFixed(4)),
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
        audioEngine.unlock();
        currentZone = computeZone();
        callbacks.onZoneEnter(currentZone);
        syncPromptState();
      } else {
        isPlaying = playing;
        if (!playing) {
          exitPointerLock();
        }
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
    togglePointerLock: () => {
      if (!isPlaying || isDead || portalTransitionActive || gateOpening) return;
      audioEngine.unlock();
      if (document.pointerLockElement === renderer.domElement) {
        exitPointerLock();
      } else {
        requestPointerLock();
      }
      syncPromptState();
    },
    toggleBloom: () => {
      bloomEnabled = !bloomEnabled;
      bloomPass.enabled = bloomEnabled;
      syncPromptState();
    },
    toggleAudioMute: () => {
      audioEngine.unlock();
      audioEngine.setMuted(!audioEngine.isMuted());
      syncPromptState();
    },
    dispose: () => {
      disposed = true;
      exitPointerLock();
      delete (window as unknown as Record<string, unknown>).__playerState;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('click', onCanvasClick);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('pointerlockerror', onPointerLockError);
      renderer.domElement.removeEventListener('wheel', onWheel);
      audioEngine.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      moteTex.dispose();
      composer.dispose();
      composerTarget.dispose();
      bloomPass.dispose();
      outputPass.dispose();
      renderPass.dispose();
      astralCapital.dispose();
      world.dispose();
      knight.dispose();
      textures.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
