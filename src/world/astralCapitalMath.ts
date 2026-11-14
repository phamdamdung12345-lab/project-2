import type { BonfireSite, CircleCollider, WalkableRect } from './terrainMath';

export type AstralZoneId = 'astral-sanctuary' | 'astral-sprawl' | 'astral-aqueduct';

export const ASTRAL = {
  // Colossal 360-degree archipelago bounds (>= 1200m x 1360m, > 260m vertical span)
  minX: -620,
  maxX: 620,
  minZ: -800,
  maxZ: 560,
  waterY: 0,
  maxPeakY: 278,
  lethalFallY: -14,

  // Spawn & Return Gate on Grand Arrival Balcony (offset to West alcove so South Promenade behind spawn is 100% open!)
  spawnPos: { x: 0, y: 152, z: 97 },
  returnGatePos: { x: -15.5, y: 152, z: 116 },

  // Key elevations across Rear Plaza, Wards, Viaducts, Citadel & Sea Sanctuary
  balconyY: 152,
  rearPlazaY: 152,
  cityPlazaY: 78,
  wardPlazaY: 78,
  citadelTerraceY: 114,
  fortressCourtyardY: 114,
  westGardenY: 78,
  aqueductMidY: 48,
  aqueductDeckY: 26,
  shrineHarborY: 18,
  shrineCloisterY: 38,
  shrineSummitY: 58,
  nokronTempleY: 58,

  // Aliases kept compatible for engine spawn & checks
  midOverlookY: 115,
  sanctuaryPlazaY: 114,
  sanctuarySidePorchY: 114,
  sprawlPlazaY: 78,
  dragonWingY: 114,
} as const;

export const ASTRAL_ZONES: Record<
  AstralZoneId,
  { id: AstralZoneId; title: string; subtitle: string }
> = {
  'astral-sanctuary': {
    id: 'astral-sanctuary',
    title: 'ASTRAL ROYAL SANCTUARY',
    subtitle: 'Grand Arrival Balcony, Rear Erdtree Plaza & Royal Citadel',
  },
  'astral-sprawl': {
    id: 'astral-sprawl',
    title: 'GILDED ARCHIPELAGO CAPITAL',
    subtitle: 'Outer Wards, Elevated Sky-Viaducts & Dark Stone Fortress',
  },
  'astral-aqueduct': {
    id: 'astral-aqueduct',
    title: 'STARLIT SEA SANCTUARY',
    subtitle: 'Symmetrical Sea-Aqueducts, Tidal Harbor & Celestial Abbey',
  },
};

export const ASTRAL_GRACE_SITES: BonfireSite[] = [
  {
    id: 'astral-balcony',
    name: 'Grand Arrival Balcony',
    x: 11,
    y: ASTRAL.balconyY,
    z: 102,
    respawnX: 0,
    respawnY: ASTRAL.balconyY,
    respawnZ: 97,
  },
  {
    id: 'astral-rear-plaza',
    name: 'Rear Royal Erdtree Plaza',
    x: 0,
    y: ASTRAL.rearPlazaY,
    z: 242,
    respawnX: 0,
    respawnY: ASTRAL.rearPlazaY,
    respawnZ: 234,
  },
  {
    id: 'astral-sprawl-plaza',
    name: 'Golden City Grand Plaza',
    x: -14,
    y: ASTRAL.cityPlazaY,
    z: -42,
    respawnX: 0,
    respawnY: ASTRAL.cityPlazaY,
    respawnZ: -42,
  },
  {
    id: 'astral-west-ward',
    name: 'West Rotunda Ward',
    x: -182,
    y: ASTRAL.wardPlazaY,
    z: -42,
    respawnX: -172,
    respawnY: ASTRAL.wardPlazaY,
    respawnZ: -42,
  },
  {
    id: 'astral-east-ward',
    name: 'East Bastion Ward',
    x: 194,
    y: ASTRAL.wardPlazaY,
    z: -42,
    respawnX: 184,
    respawnY: ASTRAL.wardPlazaY,
    respawnZ: -42,
  },
  {
    id: 'astral-sanctuary-plaza',
    name: 'Royal Citadel Terrace',
    x: -16,
    y: ASTRAL.citadelTerraceY,
    z: -155,
    respawnX: 0,
    respawnY: ASTRAL.citadelTerraceY,
    respawnZ: -155,
  },
  {
    id: 'astral-fortress-gate',
    name: 'Cragstone Fortress Courtyard',
    x: 184,
    y: ASTRAL.fortressCourtyardY,
    z: -155,
    respawnX: 176,
    respawnY: ASTRAL.fortressCourtyardY,
    respawnZ: -155,
  },
  {
    id: 'astral-shrine-harbor',
    name: 'Tidal Harbor Gate',
    x: -16,
    y: ASTRAL.shrineHarborY,
    z: -456,
    respawnX: 0,
    respawnY: ASTRAL.shrineHarborY,
    respawnZ: -456,
  },
  {
    id: 'astral-nokron-temple',
    name: 'Celestial Abbey Forecourt',
    x: 0,
    y: ASTRAL.shrineSummitY,
    z: -622,
    respawnX: 0,
    respawnY: ASTRAL.shrineSummitY,
    respawnZ: -616,
  },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Walkable surfaces across the 360° Astral Royal Archipelago:
 * Rear Royal Plaza, Elevated Sky-Viaducts, West/East Outer Wards,
 * Dark Stone Fortress, Sea-Aqueducts, and Celestial Sea Sanctuary Island.
 */
export const ASTRAL_WALKABLE_RECTS: WalkableRect[] = [
  // --- CENTRAL UPPER PROMENADE & REAR ROYAL PLAZA (BEHIND SPAWN) ---
  // 1. Grand Arrival Balcony
  {
    minX: -20,
    maxX: 20,
    minZ: 92,
    maxZ: 134,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.balconyY,
  },
  // 2. Triumphal Arch Promenade linking Arrival Balcony south into Rear Royal Plaza
  {
    minX: -24,
    maxX: 24,
    minZ: 134,
    maxZ: 186,
    yStart: ASTRAL.rearPlazaY,
    yEnd: ASTRAL.rearPlazaY,
  },
  // 3. Rear Royal & Erdtree Terrace Grand Plaza
  {
    minX: -76,
    maxX: 76,
    minZ: 186,
    maxZ: 298,
    yStart: ASTRAL.rearPlazaY,
    yEnd: ASTRAL.rearPlazaY,
  },
  // 4. Southern Panoramic Ocean Overlook Bridge & Gazebo Terrace
  {
    minX: -14,
    maxX: 14,
    minZ: 298,
    maxZ: 388,
    yStart: ASTRAL.rearPlazaY,
    yEnd: ASTRAL.rearPlazaY,
  },
  {
    minX: -22,
    maxX: 22,
    minZ: 388,
    maxZ: 424,
    yStart: ASTRAL.rearPlazaY,
    yEnd: ASTRAL.rearPlazaY,
  },

  // --- MAIN CENTRAL SPINE (BALCONY -> CITY PLAZA -> ROYAL CITADEL -> FORTRESS) ---
  {
    minX: -12,
    maxX: 12,
    minZ: -6,
    maxZ: 92,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.cityPlazaY,
  },
  {
    minX: -48,
    maxX: 48,
    minZ: -74,
    maxZ: -6,
    yStart: ASTRAL.cityPlazaY,
    yEnd: ASTRAL.cityPlazaY,
  },
  {
    minX: -16,
    maxX: 16,
    minZ: -124,
    maxZ: -74,
    yStart: ASTRAL.cityPlazaY,
    yEnd: ASTRAL.citadelTerraceY,
  },
  {
    minX: -54,
    maxX: 54,
    minZ: -188,
    maxZ: -124,
    yStart: ASTRAL.citadelTerraceY,
    yEnd: ASTRAL.citadelTerraceY,
  },
  {
    minX: 54,
    maxX: 158,
    minZ: -166,
    maxZ: -144,
    yStart: ASTRAL.citadelTerraceY,
    yEnd: ASTRAL.fortressCourtyardY,
    slopeAxis: 'x',
  },
  {
    minX: 158,
    maxX: 224,
    minZ: -186,
    maxZ: -124,
    yStart: ASTRAL.fortressCourtyardY,
    yEnd: ASTRAL.fortressCourtyardY,
  },

  // --- ELEVATED SKY-VIADUCT NETWORK (y = 152 HIGH ABOVE CITY & CHANNEL) ---
  // West High Sky-Viaduct (Balcony -20 -> West Sky Gatehouse -172)
  {
    minX: -172,
    maxX: -20,
    minZ: 102,
    maxZ: 116,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.balconyY,
    slopeAxis: 'x',
  },
  // West Sky Gatehouse Landing
  {
    minX: -214,
    maxX: -172,
    minZ: 96,
    maxZ: 122,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.balconyY,
  },
  // West Viaduct Overlook Spur (high scenic sky-walkway)
  {
    minX: -190,
    maxX: -176,
    minZ: -10,
    maxZ: 96,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.balconyY,
  },
  // West Viaduct Switchback Stairway (y: 152 -> 78 down into West Outer Ward Plaza)
  {
    minX: -212,
    maxX: -194,
    minZ: 14,
    maxZ: 96,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.wardPlazaY,
  },
  // East High Sky-Viaduct (Balcony +20 -> East Sky Gatehouse +172 across Ocean Channel)
  {
    minX: 20,
    maxX: 172,
    minZ: 102,
    maxZ: 116,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.balconyY,
    slopeAxis: 'x',
  },
  // East Sky Gatehouse Landing
  {
    minX: 172,
    maxX: 214,
    minZ: 96,
    maxZ: 122,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.balconyY,
  },
  // East Viaduct Switchback Stairway (y: 152 -> 78 down into East Outer Ward Plaza)
  {
    minX: 194,
    maxX: 212,
    minZ: 24,
    maxZ: 96,
    yStart: ASTRAL.balconyY,
    yEnd: ASTRAL.wardPlazaY,
  },

  // --- WEST OUTER WARD, COASTAL DOCKS & WEST SEA-AQUEDUCT LINK ---
  {
    minX: -146,
    maxX: -48,
    minZ: -54,
    maxZ: -26,
    yStart: ASTRAL.cityPlazaY,
    yEnd: ASTRAL.wardPlazaY,
    slopeAxis: 'x',
  },
  {
    minX: -214,
    maxX: -146,
    minZ: -96,
    maxZ: 14,
    yStart: ASTRAL.wardPlazaY,
    yEnd: ASTRAL.wardPlazaY,
  },
  // West Ward North Link connecting West Ward Plaza to West Cliff Garden Overlook
  {
    minX: -146,
    maxX: -98,
    minZ: -136,
    maxZ: -54,
    yStart: ASTRAL.wardPlazaY,
    yEnd: ASTRAL.westGardenY,
  },
  // West Coastal Descent Stairway (y: 78 -> 26 down to West Harbor Docks)
  {
    minX: -206,
    maxX: -184,
    minZ: -196,
    maxZ: -96,
    yStart: ASTRAL.wardPlazaY,
    yEnd: ASTRAL.aqueductDeckY,
  },
  // West Harbor Docks & Sea-Aqueduct West Bastion (connects cleanly to x=-180 Aqueduct!)
  {
    minX: -228,
    maxX: -160,
    minZ: -362,
    maxZ: -196,
    yStart: ASTRAL.aqueductDeckY,
    yEnd: ASTRAL.aqueductDeckY,
  },

  // --- EAST OUTER WARD, FORTRESS SOUTH ASCENT & EAST SEA-AQUEDUCT LINK ---
  // East Chasm Sky-Bridge (y = 78 spanning from Lower City Plaza +48 across Ocean Channel)
  {
    minX: 48,
    maxX: 154,
    minZ: -54,
    maxZ: -26,
    yStart: ASTRAL.cityPlazaY,
    yEnd: ASTRAL.wardPlazaY,
    slopeAxis: 'x',
  },
  // East Outer Ward Plaza & Watchtower Bastion
  {
    minX: 154,
    maxX: 242,
    minZ: -80,
    maxZ: 24,
    yStart: ASTRAL.wardPlazaY,
    yEnd: ASTRAL.wardPlazaY,
  },
  // East Fortress South Stairway (y: 78 -> 114 into Dark Stone Fortress South Gate!)
  {
    minX: 176,
    maxX: 202,
    minZ: -124,
    maxZ: -80,
    yStart: ASTRAL.wardPlazaY,
    yEnd: ASTRAL.fortressCourtyardY,
  },
  // East Harbor Coastal Promenade Ramp/Stair (y: 78 -> 26 east of Fortress down to East Harbor Pier)
  {
    minX: 226,
    maxX: 248,
    minZ: -280,
    maxZ: -80,
    yStart: ASTRAL.wardPlazaY,
    yEnd: ASTRAL.aqueductDeckY,
  },
  // East Harbor Pier & Sea-Aqueduct East Bastion (connects cleanly to x=+120 Aqueduct!)
  {
    minX: 118,
    maxX: 248,
    minZ: -362,
    maxZ: -280,
    yStart: ASTRAL.aqueductDeckY,
    yEnd: ASTRAL.aqueductDeckY,
  },

  // --- WEST COASTAL CLIFF DESCENT TO AQUEDUCT MID ---
  {
    minX: -98,
    maxX: -54,
    minZ: -165,
    maxZ: -145,
    yStart: ASTRAL.citadelTerraceY,
    yEnd: ASTRAL.westGardenY,
    slopeAxis: 'x',
  },
  {
    minX: -128,
    maxX: -98,
    minZ: -184,
    maxZ: -136,
    yStart: ASTRAL.westGardenY,
    yEnd: ASTRAL.westGardenY,
  },
  {
    minX: -120,
    maxX: -102,
    minZ: -244,
    maxZ: -184,
    yStart: ASTRAL.westGardenY,
    yEnd: ASTRAL.aqueductMidY,
  },
  {
    minX: -124,
    maxX: 0,
    minZ: -276,
    maxZ: -244,
    yStart: ASTRAL.aqueductMidY,
    yEnd: ASTRAL.aqueductMidY,
  },
  {
    minX: -18,
    maxX: 0,
    minZ: -342,
    maxZ: -276,
    yStart: ASTRAL.aqueductMidY,
    yEnd: ASTRAL.aqueductDeckY,
  },

  // --- STARLIT SEA AQUEDUCTS & CELESTIAL SEA SANCTUARY ISLAND ---
  // Cross-Basin Sea-Aqueduct Deck (linked cleanly on BOTH ends to West & East Harbor Docks!)
  {
    minX: -180,
    maxX: 120,
    minZ: -362,
    maxZ: -342,
    yStart: ASTRAL.aqueductDeckY,
    yEnd: ASTRAL.aqueductDeckY,
  },
  // Monumental Aqueduct Causeway Spine
  {
    minX: -13,
    maxX: 13,
    minZ: -412,
    maxZ: -342,
    yStart: ASTRAL.aqueductDeckY,
    yEnd: ASTRAL.aqueductDeckY,
  },
  // Harbor Gate Descent Flight (y: 26 -> 18)
  {
    minX: -12,
    maxX: 12,
    minZ: -440,
    maxZ: -412,
    yStart: ASTRAL.aqueductDeckY,
    yEnd: ASTRAL.shrineHarborY,
  },
  // Symmetrical Tidal Harbor Courtyard & Pier Wings (y = 18)
  {
    minX: -66,
    maxX: 66,
    minZ: -478,
    maxZ: -440,
    yStart: ASTRAL.shrineHarborY,
    yEnd: ASTRAL.shrineHarborY,
  },
  // Winding Pilgrimage Stairway I (East Cliff Ascent: y: 18 -> 38)
  {
    minX: 16,
    maxX: 34,
    minZ: -526,
    maxZ: -478,
    yStart: ASTRAL.shrineHarborY,
    yEnd: ASTRAL.shrineCloisterY,
  },
  // Mid Cloister Loggia Terrace (y = 38)
  {
    minX: -36,
    maxX: 36,
    minZ: -556,
    maxZ: -526,
    yStart: ASTRAL.shrineCloisterY,
    yEnd: ASTRAL.shrineCloisterY,
  },
  // Winding Pilgrimage Stairway II (West Switchback Ascent: y: 38 -> 58)
  {
    minX: -34,
    maxX: -16,
    minZ: -604,
    maxZ: -556,
    yStart: ASTRAL.shrineCloisterY,
    yEnd: ASTRAL.shrineSummitY,
  },
  // Crowning Abbey Forecourt Terrace (y = 58)
  {
    minX: -38,
    maxX: 38,
    minZ: -652,
    maxZ: -604,
    yStart: ASTRAL.shrineSummitY,
    yEnd: ASTRAL.shrineSummitY,
  },
];

/**
 * Analytical rocky island & ocean channel heightfield shared between 3D cliff mesh
 * generation and grounded buildings/foliage. Clamped strictly underneath every
 * ground-level walkable plaza and staircase so rock NEVER pokes through walkways!
 */
export function sampleIslandTerrainY(x: number, z: number): number {
  const wobble =
    Math.sin(x * 0.022 + z * 0.017) * 14 +
    Math.cos(x * 0.045 - z * 0.038) * 7 +
    Math.sin(x * 0.09 + z * 0.08) * 3.2;

  // 1. Massively Expanded 360-degree Royal Island & Lateral Wards Plateau
  const mainDist = Math.hypot(x / 315, (z + 25) / 310);
  const mainMask = 1 - smoothstep(0.65, 1.06, mainDist + wobble * 0.002);
  let y = -14 + mainMask * 89; // base island ~75m

  // 2. Central-North Royal Citadel Peak (under Royal Citadel & Terrace y=114)
  const citadelDist = Math.hypot(x / 92, (z + 178) / 88);
  const citadelPeak = 1 - smoothstep(0.45, 1.0, citadelDist + wobble * 0.002);
  y = Math.max(y, -12 + citadelPeak * 123.5);

  // 3. Expanded South Promontory & Rear Royal Erdtree Plateau (under Balcony + Rear Plaza y=152)
  const rearDist = Math.hypot(x / 108, (z - 210) / 140);
  const rearMask = 1 - smoothstep(0.45, 1.02, rearDist + wobble * 0.0018);
  y = Math.max(y, -12 + rearMask * 159.5);

  // 4. Carve the Starlit Ocean Channel between Main Island & East Ward / Fortress Headland
  const channelCenter = 104 + Math.sin(z * 0.022) * 8;
  const channelDist = Math.abs(x - channelCenter);
  const channelCarve = 1 - smoothstep(20, 44, channelDist);
  y = y * (1 - channelCarve) + -14 * channelCarve;

  // 5. East Rugged Headland (Dark Stone Fortress z=-155 & East Ward z=-30)
  const fortDist = Math.hypot((x - 196) / 76, (z + 145) / 88);
  const fortMask = 1 - smoothstep(0.48, 1.02, fortDist + wobble * 0.003);
  y = Math.max(y, -12 + fortMask * 124);

  const eastWardDist = Math.hypot((x - 198) / 78, (z + 25) / 95);
  const eastWardMask = 1 - smoothstep(0.45, 1.04, eastWardDist + wobble * 0.0025);
  y = Math.max(y, -12 + eastWardMask * 87);

  // 6. West Outer Ward & Harbor Headland
  const westWardDist = Math.hypot((x + 185) / 86, (z + 45) / 145);
  const westWardMask = 1 - smoothstep(0.45, 1.05, westWardDist + wobble * 0.0024);
  y = Math.max(y, -12 + westWardMask * 87);

  // 7. West Coastal Cliffs & Celestial Sea Sanctuary Island (z ~ -580..-690)
  const westCliffDist = Math.hypot((x + 112) / 50, (z + 205) / 105);
  const westMask = 1 - smoothstep(0.45, 1.0, westCliffDist + wobble * 0.002);
  y = Math.max(y, -12 + westMask * 78);

  const sanctumDist = Math.hypot(x / 120, (z + 585) / 155);
  const sanctumMask = 1 - smoothstep(0.32, 1.02, sanctumDist + wobble * 0.0024);
  const abbeyPeakDist = Math.hypot(x / 68, (z + 686) / 68);
  const abbeyPeakMask = 1 - smoothstep(0.28, 1.0, abbeyPeakDist + wobble * 0.002);
  y = Math.max(y, -12 + sanctumMask * 27.5, -12 + abbeyPeakMask * 66);

  // Sea stacks flanking archipelago
  const stack1 = 1 - smoothstep(0.25, 1.0, Math.hypot((x + 340) / 58, (z + 320) / 58));
  const stack2 = 1 - smoothstep(0.25, 1.0, Math.hypot((x - 340) / 58, (z + 340) / 58));
  const stack3 = 1 - smoothstep(0.25, 1.0, Math.hypot((x - 335) / 50, (z - 40) / 50));
  const stack4 = 1 - smoothstep(0.22, 1.0, Math.hypot((x + 150) / 44, (z + 560) / 44));
  const stack5 = 1 - smoothstep(0.22, 1.0, Math.hypot((x - 152) / 44, (z + 585) / 46));
  y = Math.max(
    y,
    -12 + stack1 * 56,
    -12 + stack2 * 64,
    -12 + stack3 * 46,
    -12 + stack4 * 44,
    -12 + stack5 * 48,
  );

  // Subtle rolling grass relief on upper plateaus away from paved spines
  if (y > 42 && (Math.abs(x) > 46 || z > 10)) {
    y += Math.sin(x * 0.055) * Math.cos(z * 0.055) * 2.2;
  }

  // Universal Walkway Clearance Cap: NEVER allow terrain to rise above the lowest walkable floor at (x, z)!
  let minFloorAtXZ: number | null = null;
  for (let i = 0; i < ASTRAL_WALKABLE_RECTS.length; i++) {
    const r = ASTRAL_WALKABLE_RECTS[i];
    if (x < r.minX - 2.5 || x > r.maxX + 2.5 || z < r.minZ - 2.5 || z > r.maxZ + 2.5) continue;
    const t =
      r.slopeAxis === 'x'
        ? (r.maxX - x) / Math.max(0.001, r.maxX - r.minX)
        : (r.maxZ - z) / Math.max(0.001, r.maxZ - r.minZ);
    const clampedT = Math.max(0, Math.min(1, t));
    const fy = r.yStart + (r.yEnd - r.yStart) * clampedT;
    if (minFloorAtXZ === null || fy < minFloorAtXZ) {
      minFloorAtXZ = fy;
    }
  }
  if (minFloorAtXZ !== null) {
    y = Math.min(y, minFloorAtXZ - 2.4);
  }

  return y;
}

export const ASTRAL_COLLIDERS: CircleCollider[] = [
  // Celestial Return Gate Flanking Pillars at (-15.5, 152, 116)
  { x: -15.5, yMin: 150, yMax: 168, z: 111.5, r: 1.25 },
  { x: -15.5, yMin: 150, yMax: 168, z: 120.5, r: 1.25 },
  // Triumphal Arch Gatehouse Piers at z = 158 (clear central 16m opening!)
  { x: -14.5, yMin: 150, yMax: 185, z: 158, r: 3.4 },
  { x: 14.5, yMin: 150, yMax: 185, z: 158, r: 3.4 },
  // West & East High Sky-Viaduct Gatehouse Piers
  { x: -182, yMin: 150, yMax: 175, z: 100.5, r: 1.9 },
  { x: -182, yMin: 150, yMax: 175, z: 117.5, r: 1.9 },
  { x: 182, yMin: 150, yMax: 175, z: 100.5, r: 1.9 },
  { x: 182, yMin: 150, yMax: 175, z: 117.5, r: 1.9 },
  // Grace beacon plinths
  { x: 11, yMin: 150, yMax: 156, z: 102, r: 1.1 },
  { x: 0, yMin: 150, yMax: 156, z: 242, r: 1.1 },
  { x: -14, yMin: 76, yMax: 82, z: -42, r: 1.1 },
  { x: -182, yMin: 76, yMax: 82, z: -42, r: 1.1 },
  { x: 194, yMin: 76, yMax: 82, z: -42, r: 1.1 },
  { x: -16, yMin: 112, yMax: 118, z: -155, r: 1.1 },
  { x: 184, yMin: 112, yMax: 118, z: -155, r: 1.1 },
  { x: -16, yMin: 16, yMax: 22, z: -456, r: 1.1 },
  { x: 0, yMin: 56, yMax: 62, z: -622, r: 1.1 },
  // Royal Citadel & Rear Plaza veiled statues
  { x: -24, yMin: 112, yMax: 122, z: -136, r: 1.5 },
  { x: 24, yMin: 112, yMax: 122, z: -136, r: 1.5 },
  { x: -28, yMin: 150, yMax: 162, z: 208, r: 1.5 },
  { x: 28, yMin: 150, yMax: 162, z: 208, r: 1.5 },
  { x: -28, yMin: 150, yMax: 162, z: 274, r: 1.5 },
  { x: 28, yMin: 150, yMax: 162, z: 274, r: 1.5 },
  // Lower City Plaza veiled statues
  { x: -26, yMin: 76, yMax: 88, z: -26, r: 1.5 },
  { x: 26, yMin: 76, yMax: 88, z: -26, r: 1.5 },
  { x: -26, yMin: 76, yMax: 88, z: -60, r: 1.5 },
  { x: 26, yMin: 76, yMax: 88, z: -60, r: 1.5 },
  // Dark Stone Fortress Barbican Gate flanking piers (opening centered at z = -155)
  { x: 160, yMin: 112, yMax: 134, z: -166, r: 2.2 },
  { x: 160, yMin: 112, yMax: 134, z: -144, r: 2.2 },
  // Sea-Shrine Harbor Gate flanking piers (opening centered at x = 0, z = -440)
  { x: -13.5, yMin: 16, yMax: 34, z: -440, r: 2.0 },
  { x: 13.5, yMin: 16, yMax: 34, z: -440, r: 2.0 },
  // Rear Plaza Planter Plinths & Overlook Bridge Gate Piers
  { x: -22, yMin: 150, yMax: 162, z: 206, r: 3.0 },
  { x: 22, yMin: 150, yMax: 162, z: 206, r: 3.0 },
  { x: -36, yMin: 150, yMax: 162, z: 224, r: 3.0 },
  { x: 36, yMin: 150, yMax: 162, z: 224, r: 3.0 },
  { x: -36, yMin: 150, yMax: 162, z: 260, r: 3.0 },
  { x: 36, yMin: 150, yMax: 162, z: 260, r: 3.0 },
  { x: -22, yMin: 150, yMax: 162, z: 278, r: 3.0 },
  { x: 22, yMin: 150, yMax: 162, z: 278, r: 3.0 },
  { x: -14.2, yMin: 150, yMax: 170, z: 298, r: 2.0 },
  { x: 14.2, yMin: 150, yMax: 170, z: 298, r: 2.0 },
  // Crowning Abbey facade piers
  { x: -14, yMin: 56, yMax: 74, z: -644, r: 2.0 },
  { x: 14, yMin: 56, yMax: 74, z: -644, r: 2.0 },
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

  // Royal Citadel north facade wall (z = -187.2)
  if (currentY >= 110 && Math.abs(x) < 55 && z < -187.2 + actorRadius) {
    z = -187.2 + actorRadius;
  }

  // Dark Stone Fortress outer eastern keep wall (x = 222)
  if (currentY >= 110 && x > 222 - actorRadius && z >= -186 && z <= -124) {
    x = 222 - actorRadius;
  }

  // Crowning Celestial Abbey sealed north wall (z = -650.5)
  if (currentY >= 54 && currentY < 72 && Math.abs(x) < 39 && z < -650.5 + actorRadius) {
    z = -650.5 + actorRadius;
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

export function getAstralZoneAtPosition(z: number, y: number, x = 0): AstralZoneId {
  if (z <= -225 || y < 52) {
    return 'astral-aqueduct';
  }
  if (x >= 140 || x <= -140 || (z <= 8 && z >= -118 && y < 105)) {
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
  return dx * dx + dz * dz <= 5.6 * 5.6;
}

export function isAstralLethalFall(y: number): boolean {
  return y < ASTRAL.lethalFallY;
}
