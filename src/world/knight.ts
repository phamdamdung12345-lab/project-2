import * as THREE from 'three';

export interface KnightRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  capeStrips: THREE.Mesh[];
  lanternLight: THREE.PointLight;
  lanternFlame: THREE.Mesh;
  contactShadow: THREE.Mesh;
}

export interface KnightAnimState {
  speed: number; // horizontal ground speed
  grounded: boolean;
  isSprinting: boolean;
  isRolling: boolean;
  rollProgress: number; // 0..1
  isResting: boolean;
  restBlend: number; // 0..1
  isPushingGate?: boolean;
  pushProgress?: number; // 0..1
  walkPhase: number;
  elapsed: number;
}

/**
 * Constructs a composite dark fantasy knight (dark plate armor, pauldrons,
 * visored helm, greatsword on back, warm hip lantern, and tattered crimson cape)
 * pivoted at bottom-center (0, 0, 0).
 */
export function createKnight(): KnightRig {
  const root = new THREE.Group();

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.92;
  root.add(bodyPivot);

  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x3b3e45,
    metalness: 0.82,
    roughness: 0.34,
  });

  const trimGoldMat = new THREE.MeshStandardMaterial({
    color: 0xb68d4c,
    metalness: 0.88,
    roughness: 0.28,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x2a1f18,
    metalness: 0.08,
    roughness: 0.86,
  });

  const capeMat = new THREE.MeshStandardMaterial({
    color: 0x6e1a1a,
    metalness: 0.04,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x8d939e,
    metalness: 0.92,
    roughness: 0.22,
  });

  // Contact shadow disc under feet
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0,0,0,0.62)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.65, 24),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.025;
  root.add(contactShadow);

  // Pelvis / Waist + Armored Tassets
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.22, 8), darkSteelMat);
  pelvis.position.y = -0.02;
  pelvis.castShadow = true;
  bodyPivot.add(pelvis);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.08, 10), leatherMat);
  belt.position.y = 0.06;
  bodyPivot.add(belt);

  // Side tasset plates
  for (const side of [-1, 1]) {
    const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.24), darkSteelMat);
    tasset.position.set(side * 0.2, -0.1, 0);
    tasset.rotation.z = side * 0.16;
    tasset.castShadow = true;
    bodyPivot.add(tasset);
  }

  // Cuirass (Chestplate)
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.21, 0.48, 8), darkSteelMat);
  chest.position.y = 0.3;
  chest.scale.set(1.06, 1, 0.82);
  chest.castShadow = true;
  bodyPivot.add(chest);

  // Brass chest trim ridge
  const chestRidge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.04), trimGoldMat);
  chestRidge.position.set(0, 0.31, -0.22);
  bodyPivot.add(chestRidge);

  // Gorget (Neck guard)
  const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 0.1, 10), darkSteelMat);
  gorget.position.y = 0.56;
  bodyPivot.add(gorget);

  // Head & Fluted Visored Helm
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.64;
  bodyPivot.add(headGroup);

  const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.24, 10), darkSteelMat);
  helm.position.y = 0.13;
  helm.castShadow = true;
  headGroup.add(helm);

  const helmDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.142, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    darkSteelMat,
  );
  helmDome.position.y = 0.24;
  helmDome.castShadow = true;
  headGroup.add(helmDome);

  // Visor beak facing -Z (forward)
  const visor = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 4), darkSteelMat);
  visor.rotation.x = -Math.PI / 2;
  visor.rotation.z = Math.PI / 4;
  visor.position.set(0, 0.14, -0.14);
  visor.scale.set(1, 1, 0.72);
  headGroup.add(visor);

  // Helm crest
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.26), trimGoldMat);
  crest.position.set(0, 0.33, 0.02);
  headGroup.add(crest);

  // Left & Right Shoulder Pauldrons + Arms
  const makeArm = (side: -1 | 1) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.33, 0.48, 0);

    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.65),
      darkSteelMat,
    );
    pauldron.rotation.z = -side * 0.35;
    pauldron.scale.set(1.1, 0.9, 1.05);
    pauldron.castShadow = true;
    armPivot.add(pauldron);

    const pauldronTrim = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.014, 6, 12), trimGoldMat);
    pauldronTrim.rotation.x = Math.PI / 2;
    pauldronTrim.rotation.y = -side * 0.35;
    pauldronTrim.position.y = -0.02;
    armPivot.add(pauldronTrim);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.065, 0.28, 8), leatherMat);
    upperArm.position.y = -0.16;
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.28, 8), darkSteelMat);
    forearm.position.set(0, -0.42, -0.03);
    forearm.rotation.x = -0.15;
    forearm.castShadow = true;
    armPivot.add(forearm);

    const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.1), darkSteelMat);
    gauntlet.position.set(0, -0.57, -0.05);
    armPivot.add(gauntlet);

    bodyPivot.add(armPivot);
    return armPivot;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs (Hip -> Thigh -> Knee -> Shin/Greave -> Boot)
  const makeLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, -0.08, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.078, 0.4, 8), darkSteelMat);
    thigh.position.y = -0.2;
    thigh.castShadow = true;
    hip.add(thigh);

    const shinPivot = new THREE.Group();
    shinPivot.position.y = -0.4;
    hip.add(shinPivot);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.082, 8, 6), darkSteelMat);
    shinPivot.add(knee);

    const greave = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.058, 0.38, 8), darkSteelMat);
    greave.position.y = -0.2;
    greave.castShadow = true;
    shinPivot.add(greave);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.22), leatherMat);
    boot.position.set(0, -0.4, -0.04);
    boot.castShadow = true;
    shinPivot.add(boot);

    bodyPivot.add(hip);
    return { hip, shinPivot };
  };

  const leftLegPair = makeLeg(-1);
  const rightLegPair = makeLeg(1);

  // Sheathed Greatsword across Back (+Z side)
  const swordGroup = new THREE.Group();
  swordGroup.position.set(0.05, 0.38, 0.24);
  swordGroup.rotation.z = -0.52;
  swordGroup.rotation.x = 0.08;
  bodyPivot.add(swordGroup);

  const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.24, 0.045), leatherMat);
  scabbard.position.y = -0.15;
  scabbard.castShadow = true;
  swordGroup.add(scabbard);

  const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 4), bladeMat);
  bladeTip.position.y = -0.85;
  bladeTip.rotation.x = Math.PI;
  bladeTip.rotation.y = Math.PI / 4;
  swordGroup.add(bladeTip);

  const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.06), trimGoldMat);
  crossguard.position.y = 0.48;
  swordGroup.add(crossguard);

  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.26, 8), leatherMat);
  hilt.position.y = 0.62;
  swordGroup.add(hilt);

  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), trimGoldMat);
  pommel.position.y = 0.76;
  swordGroup.add(pommel);

  // Warm Hip Lantern on right hip
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(0.27, 0.02, -0.06);
  bodyPivot.add(lanternGroup);

  const lanternCage = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.14, 6), trimGoldMat);
  lanternCage.position.y = -0.07;
  lanternGroup.add(lanternCage);

  const lanternFlame = new THREE.Mesh(
    new THREE.SphereGeometry(0.036, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffb347 }),
  );
  lanternFlame.position.y = -0.07;
  lanternGroup.add(lanternFlame);

  const lanternLight = new THREE.PointLight(0xffa445, 2.2, 8.5, 1.8);
  lanternLight.position.set(0.28, -0.06, -0.1);
  lanternGroup.add(lanternLight);

  // Tattered Flowing Crimson Cape (4 articulated strips anchored at shoulders)
  const capeStrips: THREE.Mesh[] = [];
  const stripConfigs = [
    { x: -0.17, w: 0.15, h: 1.06, rotY: -0.12 },
    { x: -0.055, w: 0.17, h: 1.16, rotY: -0.04 },
    { x: 0.055, w: 0.17, h: 1.14, rotY: 0.04 },
    { x: 0.17, w: 0.15, h: 1.04, rotY: 0.12 },
  ];

  for (const cfg of stripConfigs) {
    const geo = new THREE.PlaneGeometry(cfg.w, cfg.h, 1, 5);
    geo.translate(0, -cfg.h / 2, 0); // pivot at top edge
    const strip = new THREE.Mesh(geo, capeMat);
    strip.position.set(cfg.x, 0.54, 0.19);
    strip.rotation.y = cfg.rotY;
    strip.castShadow = true;
    bodyPivot.add(strip);
    capeStrips.push(strip);
  }

  return {
    root,
    bodyPivot,
    headGroup,
    leftLeg: leftLegPair.hip,
    rightLeg: rightLegPair.hip,
    leftShin: leftLegPair.shinPivot,
    rightShin: rightLegPair.shinPivot,
    leftArm,
    rightArm,
    capeStrips,
    lanternLight,
    lanternFlame,
    contactShadow,
  };
}

/**
 * Updates procedural gait, sprint lean, dodge-roll tuck, bonfire kneeling,
 * and dynamic cape billow.
 */
export function animateKnight(rig: KnightRig, state: KnightAnimState): void {
  const {
    speed,
    grounded,
    isSprinting,
    isRolling,
    rollProgress,
    restBlend,
    isPushingGate,
    pushProgress = 0,
    walkPhase,
    elapsed,
  } = state;

  // Flicker hip lantern gently
  const flicker = 1.0 + Math.sin(elapsed * 9.3) * 0.12 + Math.sin(elapsed * 17.1) * 0.07;
  rig.lanternLight.intensity = 2.1 * flicker;
  rig.lanternFlame.scale.setScalar(0.92 + 0.14 * flicker);

  // Two-handed heavy stone/iron gate push animation
  if (isPushingGate) {
    const brace = Math.sin(Math.min(1, pushProgress * 1.4) * Math.PI * 0.5);
    const stepCycle = Math.sin(pushProgress * Math.PI * 3.0);
    rig.bodyPivot.position.y = 0.88 - brace * 0.06;
    rig.bodyPivot.rotation.x = -0.26 * brace;
    rig.headGroup.rotation.x = 0.14 * brace;

    // Both arms extended forward (-Z) pressing gauntlets against double doors
    rig.leftArm.rotation.x = 1.38 * brace + Math.sin(pushProgress * 12) * 0.03;
    rig.rightArm.rotation.x = 1.38 * brace - Math.sin(pushProgress * 12) * 0.03;
    rig.leftArm.rotation.z = -0.18 * brace;
    rig.rightArm.rotation.z = 0.18 * brace;

    // Braced pushing stance
    rig.leftLeg.rotation.x = 0.44 * brace + stepCycle * 0.12;
    rig.rightLeg.rotation.x = -0.46 * brace - stepCycle * 0.12;
    rig.leftShin.rotation.x = 0.35 * brace;
    rig.rightShin.rotation.x = 0.25 * brace;

    for (let i = 0; i < rig.capeStrips.length; i++) {
      rig.capeStrips[i].rotation.x = 0.34 + Math.sin(elapsed * 2.8 + i) * 0.06;
    }
    return;
  }

  // Resting / kneeling pose blend at Bonfire
  if (restBlend > 0.01) {
    const rb = restBlend;
    rig.bodyPivot.position.y = THREE.MathUtils.lerp(0.92, 0.56, rb);
    rig.bodyPivot.rotation.x = THREE.MathUtils.lerp(0, 0.18, rb);
    rig.headGroup.rotation.x = THREE.MathUtils.lerp(0, 0.25, rb);

    // One knee down, one leg bent forward
    rig.rightLeg.rotation.x = THREE.MathUtils.lerp(0, 1.35, rb);
    rig.rightShin.rotation.x = THREE.MathUtils.lerp(0, -1.45, rb);
    rig.leftLeg.rotation.x = THREE.MathUtils.lerp(0, -1.15, rb);
    rig.leftShin.rotation.x = THREE.MathUtils.lerp(0, 1.35, rb);

    rig.leftArm.rotation.x = THREE.MathUtils.lerp(0, -0.55, rb);
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(0, -0.45, rb);

    for (let i = 0; i < rig.capeStrips.length; i++) {
      rig.capeStrips[i].rotation.x = 0.35 + Math.sin(elapsed * 1.8 + i) * 0.05;
    }
    if (rb > 0.9) return;
  }

  // Dodge-roll forward somersault
  if (isRolling) {
    const p = rollProgress;
    const tuckArc = Math.sin(p * Math.PI);
    rig.bodyPivot.position.y = 0.62 - tuckArc * 0.16;
    rig.bodyPivot.rotation.x = -p * Math.PI * 2;
    rig.leftLeg.rotation.x = -0.9;
    rig.rightLeg.rotation.x = -0.9;
    rig.leftShin.rotation.x = 1.4;
    rig.rightShin.rotation.x = 1.4;
    rig.leftArm.rotation.x = -1.0;
    rig.rightArm.rotation.x = -1.0;
    for (let i = 0; i < rig.capeStrips.length; i++) {
      rig.capeStrips[i].rotation.x = 0.85;
    }
    return;
  }

  // Standard walk / sprint / jump / idle
  const moveFactor = Math.min(1, speed / 5.5);
  const strideAmp = isSprinting ? 0.78 : 0.56 * moveFactor;
  const armAmp = isSprinting ? 0.62 : 0.42 * moveFactor;
  const bob = grounded ? Math.abs(Math.sin(walkPhase)) * 0.055 * moveFactor : 0;

  rig.bodyPivot.position.y = 0.92 + bob;
  rig.bodyPivot.rotation.x = isSprinting ? -0.14 : -0.05 * moveFactor;
  rig.headGroup.rotation.x = isSprinting ? 0.1 : Math.sin(elapsed * 1.4) * 0.03;

  if (!grounded) {
    rig.leftLeg.rotation.x = -0.45;
    rig.rightLeg.rotation.x = 0.32;
    rig.leftShin.rotation.x = 0.7;
    rig.rightShin.rotation.x = 0.25;
    rig.leftArm.rotation.x = -0.65;
    rig.rightArm.rotation.x = 0.35;
  } else if (moveFactor > 0.04) {
    const s = Math.sin(walkPhase);
    rig.leftLeg.rotation.x = s * strideAmp;
    rig.rightLeg.rotation.x = -s * strideAmp;
    rig.leftShin.rotation.x = Math.max(0, -s) * 0.65 * moveFactor;
    rig.rightShin.rotation.x = Math.max(0, s) * 0.65 * moveFactor;

    rig.leftArm.rotation.x = -s * armAmp;
    rig.rightArm.rotation.x = s * armAmp;
    rig.leftArm.rotation.z = 0.08;
    rig.rightArm.rotation.z = -0.08;
  } else {
    // Calm breathing idle
    const breath = Math.sin(elapsed * 1.9);
    rig.bodyPivot.position.y = 0.92 + breath * 0.012;
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftShin.rotation.x = 0;
    rig.rightShin.rotation.x = 0;
    rig.leftArm.rotation.x = breath * 0.03;
    rig.rightArm.rotation.x = -breath * 0.03;
    rig.leftArm.rotation.z = 0.08;
    rig.rightArm.rotation.z = -0.08;
  }

  // Cape billow based on speed & wind
  const windBase = 0.14 + moveFactor * (isSprinting ? 0.68 : 0.42);
  for (let i = 0; i < rig.capeStrips.length; i++) {
    const strip = rig.capeStrips[i];
    const wave = Math.sin(elapsed * (3.2 + moveFactor * 4.5) + i * 1.15) * (0.06 + moveFactor * 0.14);
    strip.rotation.x = windBase + wave;
    strip.rotation.z = Math.cos(elapsed * 2.4 + i * 0.9) * (0.02 + moveFactor * 0.04);
  }
}
