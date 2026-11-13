import type { BonfireSite, CircleCollider, WalkableRect } from './terrainMath';

export type AstralZoneId = 'astral-sanctuary' | 'astral-sprawl' | 'astral-aqueduct';

export const ASTRAL = {
  // Overall mega-realm bounds (>= 900m x 900m, > 220m vertical span)
  minX: -520,
  maxX: 520,
  minZ: -580,
  maxZ: 420,
  waterY: 0,
  maxPeakY: 278,
  lethalFallY: -18,

  // Spawn & Return Gate on Grand Arrival Balcony
  spawnPos: { x: 0, y: 152, z: 110 },
  returnGatePos: { x: 0, y: 152, z: 129.5 },

  // Key elevations across the 3 tiers
  balconyY: 152,
  midOverlookY: 134,
  sanctuaryPlazaY: 114,
  sanctuarySidePorchY: 128,
  sprawlPlazaY: 78,
  dragonWingY: 98,
  aqueductMidY: 48,
  aqueductDeckY: 26,
  nokronTempleY: 14,
} as const;

export const ASTRAL_ZONES: Record<
  AstralZoneId,
  { id: AstralZoneId; title: string; subtitle: string }
> = {
  'astral-sanctuary': {
    id: 'astral-sanctuary',
    title: 'ASTRAL ROYAL SANCTUARY',
    subtitle: 'Grand Arrival Balcony & Erdtree Causeway',
  },
  'astral-sprawl': {
    id: 'astral-sprawl',
    title: 'SPRAWL OF FALLEN GOLD',
    subtitle: 'Gilded City & The Petrified Dragon Rampart',
  },
  'astral-aqueduct': {
    id: 'astral-aqueduct',
    title: 'STARLIT NOKRON AQUEDUCTS',
    subtitle: 'Eternal Basin Beneath the Celestial Nebula',
  },
};

export const ASTRAL_GRACE_SITES: BonfireSite[] = [
  {
    id: 'astral-balcony',
    name: 'Grand Arrival Balcony',
    x: -8.5,
    y: ASTRAL.balconyY,
    z: 100,
    respawnX: 0,
    respawnY: ASTRAL.balconyY,
    respawnZ: 110,
  },
  {
    id: 'astral-sanctuary-plaza',
    name: 'Erdtree Sanctuary Plaza',
    x: -12,
    y: ASTRAL.sanctuaryPlazaY,
    z: -38,
    respawnX: -6,
    respawnY: ASTRAL.sanctuaryPlazaY,
    respawnZ: -38,
  },
  {
    id: 'astral-sprawl-plaza',
    name: 'Avenue of Fallen Gold',
    x: 0,
    y: ASTRAL.sprawlPlazaY,
    z: -145,
    respawnX: -5,
    respawnY: ASTRAL.sprawlPlazaY,
    respawnZ: -145,
  },
  {
    id: 'astral-nokron-temple',
    name: 'Starlit Aqueduct Sanctum',
    x: 0,
    y: ASTRAL.nokronTempleY,
    z: -456,
    respawnX: 0,
    respawnY: ASTRAL.nokronTempleY,
    respawnZ: -448,
  },
];

/**
 * Walkable surfaces across all 3 tiers of the Astral Royal Capital.
 * Every slope & landing overlaps cleanly by >= 0.35m for zero-seam traversal.
 */
export const ASTRAL_WALKABLE_RECTS: WalkableRect[] = [
  // 1. Upper Tier — Grand Arrival Balcony & Celestial Return Gate
  {
    minX: -18,
    maxX: 18,
    minZ: 92,
    maxZ: 134,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.balconyY,
  },
  // Upper Stair Flight 1 (z: 92 -> 56, y: 152 -> 134)
  {
    minX: -9.5,
    maxX: 9.5,
    minZ: 56,
    maxZ: 92,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.midOverlookY,
  },
  // Mid Royal Overlook Plaza (z: 56 -> 24, y: 134)
  {
    minX: -16,
    maxX: 16,
    minZ: 24,
    maxZ: 56,
    yStart: ASTRAL.midOverlookY,
    yEnd: ASTRAL.midOverlookY,
  },
  // Upper Stair Flight 2 (z: 24 -> -14, y: 134 -> 114)
  {
    minX: -11,
    maxX: 11,
    minZ: -14,
    maxZ: 24,
    yStart: ASTRAL.midOverlookY,
    yEnd: ASTRAL.sanctuaryPlazaY,
  },
  // Sanctuary Forecourt Plaza (z: -14 -> -64, y: 114)
  {
    minX: -32,
    maxX: 32,
    minZ: -64,
    maxZ: -14,
    yStart: ASTRAL.sanctuaryPlazaY,
    yEnd: ASTRAL.sanctuaryPlazaY,
  },
  // West Sanctuary Facade Ceremonial Steps (x: -32 -> -56, y: 114 -> 128)
  {
    minX: -56,
    maxX: -32,
    minZ: -50,
    maxZ: -30,
    yStart: ASTRAL.sanctuaryPlazaY,
    yEnd: ASTRAL.sanctuarySidePorchY,
    slopeAxis: 'x',
  },
  // West Sanctuary Cathedral Porch (x: -72 -> -56, y: 128)
  {
    minX: -72,
    maxX: -56,
    minZ: -54,
    maxZ: -26,
    yStart: ASTRAL.sanctuarySidePorchY,
    yEnd: ASTRAL.sanctuarySidePorchY,
  },

  // 2. Middle Tier — Descent & Central Dragon Plaza
  // Grand Descent Staircase (z: -64 -> -112, y: 114 -> 78)
  {
    minX: -10,
    maxX: 10,
    minZ: -112,
    maxZ: -64,
    yStart: ASTRAL.sanctuaryPlazaY,
    yEnd: ASTRAL.sprawlPlazaY,
  },
  // Middle Tier Central Dragon Plaza (z: -112 -> -178, y: 78)
  {
    minX: -36,
    maxX: 36,
    minZ: -178,
    maxZ: -112,
    yStart: ASTRAL.sprawlPlazaY,
    yEnd: ASTRAL.sprawlPlazaY,
  },
  // Walkable Petrified Dragon Wing-Ramp (x: 36 -> 88, z: -150..-134, y: 78 -> 98)
  {
    minX: 36,
    maxX: 88,
    minZ: -150,
    maxZ: -134,
    yStart: ASTRAL.dragonWingY,
    yEnd: ASTRAL.sprawlPlazaY,
    slopeAxis: 'x',
  },
  // Petrified Dragon Wing-Shoulder Overlook Platform (x: 88 -> 114, z: -154..-128, y: 98)
  {
    minX: 88,
    maxX: 114,
    minZ: -154,
    maxZ: -128,
    yStart: ASTRAL.dragonWingY,
    yEnd: ASTRAL.dragonWingY,
  },

  // 3. Lower Tier — Starlit Nokron Aqueducts & Basin
  // Chasm Descent Flight A (z: -178 -> -236, y: 78 -> 48)
  {
    minX: -8.5,
    maxX: 8.5,
    minZ: -236,
    maxZ: -178,
    yStart: ASTRAL.sprawlPlazaY,
    yEnd: ASTRAL.aqueductMidY,
  },
  // Intermediate Aqueduct Overlook Terrace (z: -236 -> -266, y: 48)
  {
    minX: -18,
    maxX: 18,
    minZ: -266,
    maxZ: -236,
    yStart: ASTRAL.aqueductMidY,
    yEnd: ASTRAL.aqueductMidY,
  },
  // Chasm Descent Flight B (z: -266 -> -312, y: 48 -> 26)
  {
    minX: -8.5,
    maxX: 8.5,
    minZ: -312,
    maxZ: -266,
    yStart: ASTRAL.aqueductMidY,
    yEnd: ASTRAL.aqueductDeckY,
  },
  // Monumental North-South Aqueduct Spine (z: -312 -> -410, y: 26)
  {
    minX: -10,
    maxX: 10,
    minZ: -410,
    maxZ: -312,
    yStart: ASTRAL.aqueductDeckY,
    yEnd: ASTRAL.aqueductDeckY,
  },
  // Monumental Cross-Basin Two-Tier East-West Aqueduct Deck (x: -180..180, z: -362..-342, y: 26)
  {
    minX: -180,
    maxX: 180,
    minZ: -362,
    maxZ: -342,
    yStart: ASTRAL.aqueductDeckY,
    yEnd: ASTRAL.aqueductDeckY,
  },
  // Temple Descent Flight (z: -410 -> -438, y: 26 -> 14)
  {
    minX: -10,
    maxX: 10,
    minZ: -438,
    maxZ: -410,
    yStart: ASTRAL.aqueductDeckY,
    yEnd: ASTRAL.nokronTempleY,
  },
  // Sunken Silver-White Nokron Temple Forecourt Island (z: -438 -> -490, y: 14)
  {
    minX: -32,
    maxX: 32,
    minZ: -490,
    maxZ: -438,
    yStart: ASTRAL.nokronTempleY,
    yEnd: ASTRAL.nokronTempleY,
  },
];

export const ASTRAL_COLLIDERS: CircleCollider[] = [
  // Celestial Return Gate Flanking Pillars at z = 130
  { x: -4.8, yMin: 150, yMax: 168, z: 130, r: 1.35 },
  { x: 4.8, yMin: 150, yMax: 168, z: 130, r: 1.35 },
  // Grace beacon plinths
  { x: -8.5, yMin: 150, yMax: 156, z: 100, r: 1.1 },
  { x: -12, yMin: 112, yMax: 118, z: -38, r: 1.1 },
  { x: 0, yMin: 76, yMax: 82, z: -145, r: 1.1 },
  { x: 0, yMin: 12, yMax: 18, z: -456, r: 1.1 },
  // Sanctuary Plaza veiled statues on square plinths
  { x: -14, yMin: 112, yMax: 122, z: -22, r: 1.5 },
  { x: 14, yMin: 112, yMax: 122, z: -22, r: 1.5 },
  { x: -14, yMin: 112, yMax: 122, z: -54, r: 1.5 },
  { x: 14, yMin: 112, yMax: 122, z: -54, r: 1.5 },
  // Dragon Plaza colonnade lanterns/statues
  { x: -24, yMin: 76, yMax: 88, z: -128, r: 1.5 },
  { x: -24, yMin: 76, yMax: 88, z: -162, r: 1.5 },
  { x: 24, yMin: 76, yMax: 88, z: -128, r: 1.5 },
  { x: 24, yMin: 76, yMax: 88, z: -162, r: 1.5 },
  // Nokron Temple facade pillars
  { x: -12, yMin: 12, yMax: 28, z: -478, r: 2.0 },
  { x: 12, yMin: 12, yMax: 28, z: -478, r: 2.0 },
];

export function sampleAstralFloorHeight(
  x: number,
  currentY: number,
  z: number,
  maxStepUp = 1.65,
): number | null {
  let bestY: number | null = null;
  let bestDist = Infinity;

  for (let i = 0; i < ASTRAL_WALKABLE_RECTS.length; i++) {
    const r = ASTRAL_WALKABLE_RECTS[i];
    if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue;
    const t =
      r.slopeAxis === 'x'
        ? (r.maxX - x) / Math.max(0.001, r.maxX - r.minX)
        : (r.maxZ - z) / Math.max(0.001, r.maxZ - r.minZ);
    const clampedT = Math.max(0, Math.min(1, t));
    const floorY = r.yStart + (r.yEnd - r.yStart) * clampedT;

    if (floorY > currentY + maxStepUp) continue;
    const d = Math.abs(floorY - currentY);
    if (d < bestDist || (d === bestDist && (bestY === null || floorY > bestY))) {
      bestDist = d;
      bestY = floorY;
    }
  }

  return bestY;
}

export function resolveAstralVerticalStep(params: {
  prevX: number;
  prevY: number;
  prevZ: number;
  nextX: number;
  nextZ: number;
  velY: number;
  grounded: boolean;
  dt: number;
  raycastFloor?: number | null;
}): { y: number; velY: number; grounded: boolean } {
  const { prevY, nextX, nextZ, dt, raycastFloor } = params;
  let { velY, grounded } = params;

  const analyticalTarget = sampleAstralFloorHeight(nextX, prevY, nextZ, grounded ? 1.85 : 1.0);
  const rayTarget =
    raycastFloor !== undefined && raycastFloor !== null && raycastFloor <= prevY + (grounded ? 1.85 : 1.0)
      ? raycastFloor
      : null;

  let floorTarget: number | null = null;
  if (analyticalTarget !== null && rayTarget !== null) {
    floorTarget = Math.max(analyticalTarget, rayTarget);
  } else {
    floorTarget = analyticalTarget ?? rayTarget;
  }

  if (grounded) {
    if (floorTarget !== null && Math.abs(floorTarget - prevY) <= 1.85) {
      return { y: floorTarget, velY: 0, grounded: true };
    }
    grounded = false;
  }

  const gravity = -24.0;
  velY += gravity * dt;
  const nextY = prevY + velY * dt;

  const landingAnalytic = sampleAstralFloorHeight(nextX, prevY + 0.55, nextZ, 1.35);
  const landingRay =
    raycastFloor !== undefined && raycastFloor !== null && raycastFloor <= prevY + 1.35
      ? raycastFloor
      : null;
  let landingFloor: number | null = null;
  if (landingAnalytic !== null && landingRay !== null) {
    landingFloor = Math.max(landingAnalytic, landingRay);
  } else {
    landingFloor = landingAnalytic ?? landingRay;
  }

  if (velY <= 0 && landingFloor !== null && nextY <= landingFloor + 0.08 && prevY >= landingFloor - 0.85) {
    return { y: landingFloor, velY: 0, grounded: true };
  }

  return { y: nextY, velY, grounded: false };
}

export function resolveAstralObstacleCollisions(
  targetX: number,
  currentY: number,
  targetZ: number,
  actorRadius = 0.45,
): { x: number; z: number } {
  let x = targetX;
  let z = targetZ;

  // Solid threshold at Celestial Return Gate on Grand Arrival Balcony
  if (currentY > 145 && z > 130.5 - actorRadius && Math.abs(x) < 18) {
    z = 130.5 - actorRadius;
  }

  // West Sanctuary Cathedral sealed portal doorway wall (x = -71.5)
  if (currentY > 122 && z >= -55 && z <= -25 && x < -71.2 + actorRadius) {
    x = -71.2 + actorRadius;
  }

  // Sunken Nokron Temple sealed north wall (z = -488)
  if (currentY < 22 && Math.abs(x) < 33 && z < -488 + actorRadius) {
    z = -488 + actorRadius;
  }

  for (let i = 0; i < ASTRAL_COLLIDERS.length; i++) {
    const c = ASTRAL_COLLIDERS[i];
    if (currentY < c.yMin || currentY > c.yMax) continue;
    const dx = x - c.x;
    const dz = z - c.z;
    const minDist = c.r + actorRadius;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        x = c.x + (dx / dist) * minDist;
        z = c.z + (dz / dist) * minDist;
      } else {
        z = c.z + minDist;
      }
    }
  }

  return { x, z };
}

export function getAstralZoneAtPosition(z: number, y: number): AstralZoneId {
  if (z <= -220 || y < 52) {
    return 'astral-aqueduct';
  }
  if (z <= -66 || y < 108) {
    return 'astral-sprawl';
  }
  return 'astral-sanctuary';
}

export function findNearestAstralGrace(
  x: number,
  y: number,
  z: number,
  threshold = 4.6,
): BonfireSite | null {
  for (let i = 0; i < ASTRAL_GRACE_SITES.length; i++) {
    const b = ASTRAL_GRACE_SITES[i];
    if (Math.abs(y - b.y) > 3.2) continue;
    const dx = x - b.x;
    const dz = z - b.z;
    if (dx * dx + dz * dz <= threshold * threshold) {
      return b;
    }
  }
  return null;
}

export function findNearAstralReturnGate(x: number, y: number, z: number): boolean {
  if (Math.abs(y - ASTRAL.returnGatePos.y) > 3.2) return false;
  const dx = x - ASTRAL.returnGatePos.x;
  const dz = z - ASTRAL.returnGatePos.z;
  return dx * dx + dz * dz <= 5.4 * 5.4;
}

export function isAstralLethalFall(y: number): boolean {
  return y < ASTRAL.lethalFallY;
}
