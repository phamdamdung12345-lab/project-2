export type ZoneId =
  | 'sanctuary'
  | 'viaduct'
  | 'citadel'
  | 'nave'
  | 'cloister'
  | 'hinterland'
  | 'hamlet'
  | 'academy-grounds'
  | 'catacomb'
  | 'tunnel'
  | 'astral-sanctuary'
  | 'astral-sprawl'
  | 'astral-aqueduct';

export interface ZoneInfo {
  id: ZoneId;
  title: string;
  subtitle: string;
}

export const ZONES: Record<ZoneId, ZoneInfo> = {
  sanctuary: {
    id: 'sanctuary',
    title: 'ASHEN FIRELINK SANCTUARY',
    subtitle: 'Ruined Cliffside Rotunda',
  },
  viaduct: {
    id: 'viaduct',
    title: "THE PILGRIM'S VIADUCT",
    subtitle: 'Span Above the Pale Mist',
  },
  citadel: {
    id: 'citadel',
    title: 'CITADEL OF FALLEN GOLD',
    subtitle: 'Outer Gates of the High Bastion',
  },
  nave: {
    id: 'nave',
    title: 'HALL OF THE FALLEN SOVEREIGN',
    subtitle: "The Sovereign's Rotunda & Spire Shaft",
  },
  cloister: {
    id: 'cloister',
    title: 'THE ASHEN CLOISTER',
    subtitle: 'Mid-Shaft Gallery & Armory',
  },
  hinterland: {
    id: 'hinterland',
    title: 'MISTY HINTERLAND WOODS',
    subtitle: 'Whispering Trail, Moonlit River & Arcane Wall',
  },
  hamlet: {
    id: 'hamlet',
    title: 'ASHENBROOK HAMLET',
    subtitle: 'Lantern-Lit Foothill Village Before the Snow Pass',
  },
  'academy-grounds': {
    id: 'academy-grounds',
    title: 'SUNKEN ARCANE ACADEMY GROUNDS',
    subtitle: 'Flooded Causeway Beneath the Starlit Spires',
  },
  catacomb: {
    id: 'catacomb',
    title: 'SUNKEN CATACOMB GATE',
    subtitle: 'Sealed Threshold Beneath the Viaduct',
  },
  tunnel: {
    id: 'tunnel',
    title: 'CATACOMB DESCENT',
    subtitle: 'Subterranean Crypt Passage',
  },
  'astral-sanctuary': {
    id: 'astral-sanctuary',
    title: 'ASTRAL ROYAL SANCTUARY',
    subtitle: 'Grand Arrival Balcony & Royal Citadel Terrace',
  },
  'astral-sprawl': {
    id: 'astral-sprawl',
    title: 'GILDED ISLAND CAPITAL',
    subtitle: 'Golden-Roofed City & Dark Stone Fortress Bridge',
  },
  'astral-aqueduct': {
    id: 'astral-aqueduct',
    title: 'STARLIT SEA AQUEDUCTS',
    subtitle: 'Coastal Cliffs & Eternal Ocean Horizon',
  },
};

export interface BonfireSite {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  respawnX: number;
  respawnY: number;
  respawnZ: number;
}

export const TOWER = {
  cx: 0,
  cz: -246.0,
  wallRadius: 17.5,
  shaftRadius: 7.2,
  stairInnerRadius: 11.2,
  tier1Y: 18.0,
  tier2Y: 4.0,
  tier3Y: -10.0,
  // Flight 1: Tier 1 (18.0) -> Tier 2 (4.0), 1 full counter-clockwise turn from SE (+0.65)
  f1StartAng: 0.65,
  f1EndAng: 0.65 - Math.PI * 2, // -5.6332 (SE)
  // Cutout on Tier 1 outer ring [11.2..17.5] for clear headroom above descending Flight 1
  f1CutoutMinAng: -1.22,
  f1CutoutMaxAng: 0.65,
  // Flight 2: Tier 2 (4.0) -> Tier 3 (-10.0), 1.13 counter-clockwise turns from ENE (-0.35) to NNE (-7.45)
  f2StartAng: -0.35,
  f2EndAng: -7.45, // wraps to -1.167 (NNE, right beside Rear Gatehouse entrance)
  // Cutout on Tier 2 outer ring [11.2..17.5] for clear headroom above descending Flight 2
  f2CutoutMinAng: -2.48,
  f2CutoutMaxAng: -0.35,
} as const;

export const HINTERLAND = {
  stepsStartZ: -286.0,
  stepsEndZ: -292.0,
  trailStartZ: -292.0,
  trailEndZ: -462.0, // ~2.58x longer winding forest approach
  clearingCx: 0,
  clearingCz: -480.0,
  clearingRadius: 18.0,
  northWoodsStartZ: -496.0,
  northWoodsEndZ: -552.0,
  riverWaterY: -14.15,
  bridgeStartZ: -552.0,
  bridgeEndZ: -582.0,
  bridgeHalfW: 3.6,
  outerGateZ: -585.5,
  academyPlazaEndZ: -602.0,
  academyGateZ: -596.0,
  alcoveEntryZMin: -482.5,
  alcoveEntryZMax: -473.5,
} as const;

export const ACADEMY = {
  lakeWaterY: -14.15,
  gateStepsStartZ: -602.0,
  gateStepsEndZ: -610.0,
  causewayStartZ: -610.0,
  causewayStraightZ: -785.0,
  causewayHalfW: 7.0,
  causewayY: -13.65,
  waterGateZ: -652.0,
  junctionZ: -740.0,
  midIslandCx: 11.4,
  midIslandCz: -700.0,
  midIslandRadius: 13.5,
  bonfireX: 11.4,
  bonfireZ: -700.0,
  westCloisterMinX: -148.0,
  westCloisterMaxX: -92.0,
  westCloisterMinZ: -812.0,
  westCloisterMaxZ: -756.0,
  westCloisterY: -11.5,
  eastRotundaCx: 120.0,
  eastRotundaCz: -784.0,
  eastRotundaRadius: 28.0,
  eastBastionY: -12.0,
  castleBaseX: 0,
  castleBaseY: -13.65,
  castleBaseZ: -820.0,
  lowerStairEndZ: -842.0,
  midLandingEndZ: -852.0,
  midLandingY: -3.65,
  upperStairEndZ: -874.0,
  forecourtEndZ: -906.0,
  forecourtY: 6.35,
  cathedralDoorZ: -906.0,
  scaleFarDist: 220.0,
  scaleNearDist: 45.0,
  scaleFar: 2.6,
  scaleNear: 1.0,
} as const;

export const HAMLET = {
  trailStartX: -4.0,
  trailEndX: -162.0,
  hamletCx: -182.0,
  hamletCz: -548.0,
  hamletRadius: 23.0,
  hamletY: -11.5,
  bonfireX: -182.0,
  bonfireZ: -548.0,
  passStartX: -202.0,
  passEndX: -252.0,
  passEndY: -3.2,
  passGateX: -253.5,
} as const;

export const WORLD = {
  bonfirePos: { x: 0, y: -0.65, z: 0 },
  spawnPos: { x: 0, y: 0, z: 8.5 },
  lethalFallY: -35.0,
  rotundaRadius: 15.8,
  pitOuterRadius: 4.1,
  pitInnerRadius: 2.6,
  pitDepth: -0.65,
  apronStartZ: -13.5,
  lowerStairStartZ: -22.0,
  lowerStairEndZ: -52.0,
  viaductStartZ: -52.0,
  viaductEndZ: -138.0,
  viaductHalfWidth: 5.5,
  viaductBaseY: 10.0,
  upperStairStartZ: -138.0,
  upperStairEndZ: -166.0,
  courtyardEndZ: -208.0,
  courtyardHalfWidth: 21.0,
  courtyardY: 18.0,
  cloisterY: TOWER.tier2Y,
  gatehouseY: TOWER.tier3Y,
  gatehouseStartZ: -262.0,
  gatehouseEndZ: -286.0,
  hinterlandY: -12.0,
  hinterlandStepsEndZ: HINTERLAND.stepsEndZ,
  hinterlandEndZ: ACADEMY.cathedralDoorZ,
  terraceY: -14.0,
  catacombDoorX: -13.2,
  catacombGatePos: { x: -14.2, y: -14.0, z: -111.5 },
  tunnelEndDoorZ: -136.5,
} as const;

export const BONFIRES: BonfireSite[] = [
  {
    id: 'firelink',
    name: 'Firelink Sanctuary',
    x: 0,
    y: -0.65,
    z: 0,
    respawnX: 0,
    respawnY: 0,
    respawnZ: 8.5,
  },
  {
    id: 'catacomb-terrace',
    name: 'Sunken Catacomb Terrace',
    x: -2.5,
    y: -14.0,
    z: -110.5,
    respawnX: 0.5,
    respawnY: -14.0,
    respawnZ: -110.5,
  },
  {
    id: 'ashen-cloister',
    name: 'Ashen Cloister',
    x: -16.2,
    y: TOWER.tier2Y,
    z: TOWER.cz,
    respawnX: -13.2,
    respawnY: TOWER.tier2Y,
    respawnZ: TOWER.cz,
  },
  {
    id: 'moonlit-clearing',
    name: 'Moonlit Clearing',
    x: HINTERLAND.clearingCx,
    y: WORLD.hinterlandY,
    z: HINTERLAND.clearingCz,
    respawnX: -2.8,
    respawnY: WORLD.hinterlandY,
    respawnZ: HINTERLAND.clearingCz + 4.4,
  },
  {
    id: 'ashenbrook-hamlet',
    name: 'Ashenbrook Hamlet',
    x: HAMLET.bonfireX,
    y: HAMLET.hamletY,
    z: HAMLET.bonfireZ,
    respawnX: HAMLET.bonfireX + 4.2,
    respawnY: HAMLET.hamletY,
    respawnZ: HAMLET.bonfireZ + 1.2,
  },
  {
    id: 'academy-lake',
    name: 'Flooded Academy Causeway',
    x: ACADEMY.bonfireX,
    y: ACADEMY.causewayY + 0.15,
    z: ACADEMY.bonfireZ,
    respawnX: ACADEMY.bonfireX - 3.6,
    respawnY: ACADEMY.causewayY + 0.15,
    respawnZ: ACADEMY.bonfireZ + 3.2,
  },
];

export interface CircleCollider {
  x: number;
  yMin: number;
  yMax: number;
  z: number;
  r: number;
}

export interface WalkableRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  yStart: number; // height at maxZ (south edge) or maxX (east edge when slopeAxis === 'x')
  yEnd: number; // height at minZ (north edge) or minX (west edge when slopeAxis === 'x')
  slopeAxis?: 'z' | 'x'; // default 'z'
}

/**
 * Analytic centerline X of the extended Whispering Path from Rear Gatehouse (-292) to Moonlit Clearing (-462).
 */
export function getWhisperingTrailX(z: number): number {
  const u = Math.max(
    0,
    Math.min(1, (HINTERLAND.trailStartZ - z) / (HINTERLAND.trailStartZ - HINTERLAND.trailEndZ)),
  );
  return Math.sin(u * Math.PI * 3.0) * 10.5 * Math.sin(u * Math.PI);
}

/**
 * Winding centerline Z of the Moonlit River flowing east-west in front of the Sunken Arcane Academy
 * and curving alongside the left-hand riverside trail toward Ashenbrook Hamlet.
 */
export function getRiverCenterZ(x: number): number {
  if (x >= -125.0) {
    return -567.0 + Math.sin(x * 0.035) * 1.4;
  }
  const u = Math.max(0, Math.min(1, (-125.0 - x) / 80.0));
  const bend = u * u * (3 - 2 * u);
  return -567.0 + Math.sin(-125.0 * 0.035) * 1.4 - bend * 18.0;
}

/**
 * Winding centerline Z of the Left-Hand Riverside Trail leading from near the Academy Bridge
 * west along the riverbank to Ashenbrook Hamlet (-182, -548).
 */
export function getRiversideTrailZ(x: number): number {
  const u = Math.max(0, Math.min(1, (-4.0 - x) / 158.0));
  const riverZ = getRiverCenterZ(x);
  // Stays ~17.5m south of the river center, smoothly joining -548.0 at Hamlet entrance (-162)
  const bankOffset = 18.0 + Math.sin(u * Math.PI) * 2.5;
  const hamletBlend = smoothstep(0.75, 1.0, u);
  return (riverZ + bankOffset) * (1 - hamletBlend) + HAMLET.hamletCz * hamletBlend;
}

/**
 * Centerline Z of the rocky Snowy Valley Pass climbing west behind Ashenbrook Hamlet (-202 -> -252).
 */
export function getSnowPassCenterZ(x: number): number {
  const u = Math.max(0, Math.min(1, (HAMLET.passStartX - x) / (HAMLET.passStartX - HAMLET.passEndX)));
  return HAMLET.hamletCz + Math.sin(u * Math.PI) * 3.8;
}

/**
 * Analytic winding centerline X of the sunken cobblestone causeway crossing the flooded Academy lake (-610 -> -785).
 */
export function getLakeCausewayX(z: number): number {
  if (z >= ACADEMY.causewayStartZ) return 0;
  if (z <= ACADEMY.causewayStraightZ) return 0;
  const u = (ACADEMY.causewayStartZ - z) / (ACADEMY.causewayStartZ - ACADEMY.causewayStraightZ);
  // Smooth S-curve peaking near +11.4m at the mid-lake Bonfire island (z = -700, u ≈ 0.514)
  return Math.sin(u * Math.PI) * 11.4 + Math.sin(u * Math.PI * 2.0) * 1.2;
}

/**
 * Walkable deck height along the sunken lake causeway, with subtle shallow-water stone dips.
 */
export function getLakeCausewayY(z: number): number {
  if (z >= ACADEMY.causewayStartZ) return ACADEMY.causewayY;
  const islandDist = Math.abs(z - ACADEMY.midIslandCz);
  const islandLift = (1 - smoothstep(4.0, 14.0, islandDist)) * 0.15;
  const ripple = Math.sin(z * 0.085) * 0.12;
  const endFade = smoothstep(-782.0, -765.0, z);
  return ACADEMY.causewayY + ripple * endFade + islandLift;
}

/**
 * Analytic curved centerline Z & elevation Y of the West Sunken Cloister & Aqueduct Viaduct (x: +4 -> -92).
 */
export function getWestViaductZ(x: number): number {
  const u = smoothstep(4.0, -92.0, x);
  return ACADEMY.junctionZ - 44.0 * u;
}

export function getWestViaductY(x: number): number {
  const u = smoothstep(4.0, -92.0, x);
  return ACADEMY.causewayY + (ACADEMY.westCloisterY - ACADEMY.causewayY) * u;
}

/**
 * Analytic curved centerline Z & elevation Y of the East Astronomical Pier Promenade (x: +8 -> +94).
 */
export function getEastPromenadeZ(x: number): number {
  const u = smoothstep(8.0, 94.0, x);
  return ACADEMY.junctionZ - 44.0 * u;
}

export function getEastPromenadeY(x: number): number {
  const u = smoothstep(8.0, 94.0, x);
  return ACADEMY.causewayY + (ACADEMY.eastBastionY - ACADEMY.causewayY) * u;
}

/**
 * Distance-based forced perspective scale for the colossal Raya Lucaria-inspired Academy Citadel.
 * Scales smoothly from 2.6x at >=220m down to 1.0x at <=45m using smoothstep.
 */
export function computeAcademyScale(horizontalDist: number): number {
  const u = smoothstep(ACADEMY.scaleNearDist, ACADEMY.scaleFarDist, horizontalDist);
  return ACADEMY.scaleNear + (ACADEMY.scaleFar - ACADEMY.scaleNear) * u;
}

/**
 * Continuous undulating forest ground height across Misty Hinterland Woods, Riverside Trail,
 * Ashenbrook Hamlet (-11.5), and climbing Snowy Valley Pass (-11.5 -> -3.2).
 */
export function getHinterlandGroundY(x: number, z: number): number {
  // Snowy Valley Pass climb behind Ashenbrook Hamlet (x < -202)
  if (x <= HAMLET.passStartX) {
    const passT = Math.max(
      0,
      Math.min(1, (HAMLET.passStartX - x) / (HAMLET.passStartX - HAMLET.passEndX)),
    );
    const climb = passT * passT * (3 - 2 * passT);
    const ridge = Math.sin(passT * Math.PI * 3.0) * 0.22 * Math.sin(passT * Math.PI);
    return HAMLET.hamletY + climb * (HAMLET.passEndY - HAMLET.hamletY) + ridge;
  }

  // Smooth blend from forest (-12.0) to Ashenbrook Hamlet plateau (-11.5) near x = -140..-164
  const hamletDist = Math.hypot(x - HAMLET.hamletCx, z - HAMLET.hamletCz);
  const hamletFlat = 1 - smoothstep(HAMLET.hamletRadius - 1.0, HAMLET.hamletRadius + 16.0, hamletDist);

  // Gentle rolling forest terrain undulations (fades cleanly to 0 at flat structures!)
  const clearingDist = Math.hypot(x - HINTERLAND.clearingCx, z - HINTERLAND.clearingCz);
  const flatSteps = 1 - smoothstep(-293.0, -308.0, z);
  const flatClearing = 1 - smoothstep(18.0, 29.0, clearingDist);
  const flatAlcove =
    x > 12.0 && z > -486.0 && z < -458.0 ? 1 - smoothstep(12.0, 20.0, x) * 0.0 : 0;
  const flatRiverAndAcademy = smoothstep(-538.0, -549.0, z);

  const undulationWeight =
    (1 - flatSteps) *
    (1 - flatClearing) *
    (1 - flatAlcove) *
    (1 - flatRiverAndAcademy) *
    (1 - hamletFlat);

  const wave =
    Math.sin((z + 295.0) * 0.042) * 0.72 +
    Math.cos(x * 0.055 + z * 0.025) * 0.28;

  const baseForestY = WORLD.hinterlandY + wave * undulationWeight;
  return baseForestY * (1 - hamletFlat) + HAMLET.hamletY * hamletFlat;
}

/**
 * Parabolic arched stone bridge height spanning the Moonlit River (-552 to -582) to the Sunken Arcane Academy.
 */
export function getFootbridgeY(z: number): number {
  const t = Math.max(
    0,
    Math.min(1, (HINTERLAND.bridgeStartZ - z) / (HINTERLAND.bridgeStartZ - HINTERLAND.bridgeEndZ)),
  );
  return WORLD.hinterlandY + Math.sin(t * Math.PI) * 1.75;
}

/**
 * Under-viaduct descending cliffside ledges, crumbling stairways,
 * timber-and-iron scaffolding platforms, and the broad Sunken Catacomb Terrace.
 */
export const UNDER_VIADUCT_PLATFORMS: WalkableRect[] = [
  // Ledge 1: Broken stone shelf just below east broken parapet at z = -55..-62
  { minX: 4.9, maxX: 9.8, minZ: -62.0, maxZ: -54.5, yStart: 8.6, yEnd: 8.6 },
  // Crumbling Stone Stairway 1: descending z = -62 -> -73, y = 8.6 -> 3.0
  { minX: 5.8, maxX: 9.8, minZ: -73.0, maxZ: -62.0, yStart: 8.6, yEnd: 3.0, slopeAxis: 'z' },
  // Timber & Iron Scaffolding Platform 1 (clinging to Pier 1/2 at z = -73..-80)
  { minX: 3.0, maxX: 10.0, minZ: -80.0, maxZ: -73.0, yStart: 3.0, yEnd: 3.0 },
  // Narrow Cliffside Stairway 2 (hugs east side of Pier 2 cleanly): z = -80 -> -91, y = 3.0 -> -4.5
  { minX: 5.5, maxX: 9.6, minZ: -91.0, maxZ: -80.0, yStart: 3.0, yEnd: -4.5, slopeAxis: 'z' },
  // Timber & Iron Scaffolding Platform 2 (between Pier 2 & Pier 3 at z = -91..-100.8, x = 6.2..9.8)
  { minX: 6.2, maxX: 9.8, minZ: -100.8, maxZ: -91.0, yStart: -4.5, yEnd: -4.5 },
  // Lower Stone Stairway 3: descending west/inward x = 6.2 -> -1.5, z = -100.8 -> -94.6
  { minX: -1.5, maxX: 6.2, minZ: -100.8, maxZ: -94.6, yStart: -4.5, yEnd: -14.0, slopeAxis: 'x' },
  // Broad Sunken Catacomb Gate Terrace beneath central viaduct arches
  { minX: -14.2, maxX: 8.5, minZ: -122.0, maxZ: -94.0, yStart: -14.0, yEnd: -14.0 },
];

/**
 * Descending subterranean stone tunnel beyond the Sunken Catacomb Gate.
 */
export const TUNNEL_PLATFORMS: WalkableRect[] = [
  { minX: -21.0, maxX: -13.2, minZ: -115.2, maxZ: -107.8, yStart: -14.0, yEnd: -14.0 },
  { minX: -33.0, maxX: -21.0, minZ: -115.0, maxZ: -108.0, yStart: -14.0, yEnd: -19.0, slopeAxis: 'x' },
  { minX: -40.0, maxX: -33.0, minZ: -115.2, maxZ: -107.8, yStart: -19.0, yEnd: -19.0 },
  { minX: -40.0, maxX: -33.0, minZ: -129.0, maxZ: -115.0, yStart: -19.0, yEnd: -26.0, slopeAxis: 'z' },
  { minX: -40.0, maxX: -33.0, minZ: -137.0, maxZ: -129.0, yStart: -26.0, yEnd: -26.0 },
];

/**
 * Linear connector platforms for Citadel Gatehouse Vestibule, West Cloister Chapel, Tier 3 Rear Gatehouse,
 * Rear Mossy Steps, and Academy Plaza beyond the Moonlit River Bridge.
 */
export const CITADEL_LINEAR_PLATFORMS: WalkableRect[] = [
  // Outer Gatehouse Archway Threshold & Entry Vestibule (-208 -> -232, y = 18.0)
  { minX: -7.5, maxX: 7.5, minZ: -232.0, maxZ: -207.5, yStart: 18.0, yEnd: 18.0 },
  // Tier 1 North Sovereign Throne Dais stepped overlook (x = -4.2..4.2, z = -256..-262.5)
  { minX: -4.2, maxX: 4.2, minZ: -259.0, maxZ: -257.2, yStart: 18.0, yEnd: 18.6, slopeAxis: 'z' },
  { minX: -4.2, maxX: 4.2, minZ: -263.5, maxZ: -259.0, yStart: 18.6, yEnd: 18.6 },
  // Tier 2 West Ashen Cloister & Bonfire Chapel Alcove (x = -21.5..-14.0, z = -251.5..-240.5, y = 4.0)
  { minX: -21.5, maxX: -14.0, minZ: -251.5, maxZ: -240.5, yStart: 4.0, yEnd: 4.0 },
  // Tier 3 Rear Gatehouse Hall (-260 -> -286, x = -11..11, y = -10.0)
  { minX: -11.0, maxX: 11.0, minZ: -286.0, maxZ: -259.5, yStart: -10.0, yEnd: -10.0 },
  // Rear Gatehouse Mossy Stone Steps (-286 -> -292, y = -10.0 -> -12.0)
  { minX: -6.0, maxX: 6.0, minZ: -292.0, maxZ: -286.0, yStart: -10.0, yEnd: -12.0, slopeAxis: 'z' },
  // Far-bank Outer Academy Gatehouse Plaza (-582 -> -602, y = -12.0)
  { minX: -12.5, maxX: 12.5, minZ: -602.5, maxZ: -581.5, yStart: -12.0, yEnd: -12.0 },
  // Broad Steps Descending from Outer Gatehouse Plaza down onto the Widened Lake Causeway (-602 -> -610)
  { minX: -7.0, maxX: 7.0, minZ: -610.2, maxZ: -602.0, yStart: -12.0, yEnd: ACADEMY.causewayY, slopeAxis: 'z' },
  // Three-Way Causeway Junction Plaza (connects Central Causeway, West Viaduct, and East Promenade at z=-740)
  { minX: -8.0, maxX: 20.0, minZ: -751.0, maxZ: -729.0, yStart: ACADEMY.causewayY, yEnd: ACADEMY.causewayY },
  // Straight Grand Approach to Academy Entrance Stairway (-785 -> -820, 14m wide)
  { minX: -7.0, maxX: 7.0, minZ: -820.2, maxZ: -784.5, yStart: ACADEMY.causewayY, yEnd: ACADEMY.castleBaseY },
  // Front Lower Harbor Dock Connectors from Main Approach onto West/East Seawall Terraces (y=-13.65 -> -11.65)
  { minX: -16.2, maxX: -6.8, minZ: -822.0, maxZ: -812.0, yStart: ACADEMY.castleBaseY, yEnd: -11.65, slopeAxis: 'x' },
  { minX: 6.8, maxX: 16.2, minZ: -822.0, maxZ: -812.0, yStart: -11.65, yEnd: ACADEMY.castleBaseY, slopeAxis: 'x' },
  // Lower Waterline Seawall Terraces & Switchback Staircases up to Mid-Tier Perimeter Promenade (-11.65 -> -3.65)
  { minX: -86.0, maxX: -16.0, minZ: -842.0, maxZ: -820.0, yStart: -11.65, yEnd: -11.65 },
  { minX: 16.0, maxX: 86.0, minZ: -842.0, maxZ: -820.0, yStart: -11.65, yEnd: -11.65 },
  { minX: -84.0, maxX: -74.0, minZ: -844.0, maxZ: -820.0, yStart: -11.65, yEnd: ACADEMY.midLandingY, slopeAxis: 'z' },
  { minX: 74.0, maxX: 84.0, minZ: -844.0, maxZ: -820.0, yStart: -11.65, yEnd: ACADEMY.midLandingY, slopeAxis: 'z' },
  // West Wing: Flooded Western Cloister Courtyard & Ascent Staircase into Academy Left Terrace
  {
    minX: ACADEMY.westCloisterMinX,
    maxX: ACADEMY.westCloisterMaxX,
    minZ: ACADEMY.westCloisterMinZ,
    maxZ: ACADEMY.westCloisterMaxZ,
    yStart: ACADEMY.westCloisterY,
    yEnd: ACADEMY.westCloisterY,
  },
  {
    minX: -112.0,
    maxX: -100.0,
    minZ: -844.0,
    maxZ: ACADEMY.westCloisterMinZ,
    yStart: ACADEMY.westCloisterY,
    yEnd: ACADEMY.midLandingY,
    slopeAxis: 'z',
  },
  // East Wing: Stepped Harbor Docks & Elevated Arched Sky-Bridge into Academy Right Curtain Terrace
  { minX: 106.0, maxX: 134.0, minZ: -758.5, maxZ: -744.0, yStart: -13.85, yEnd: ACADEMY.eastBastionY, slopeAxis: 'z' },
  { minX: 106.0, maxX: 118.0, minZ: -844.0, maxZ: -810.0, yStart: ACADEMY.eastBastionY, yEnd: ACADEMY.midLandingY, slopeAxis: 'z' },
  // Academy Grand Lower Cascading Stairway (-820 -> -842, y = -13.65 -> -3.65)
  { minX: -7.0, maxX: 7.0, minZ: -842.0, maxZ: -820.0, yStart: ACADEMY.castleBaseY, yEnd: ACADEMY.midLandingY, slopeAxis: 'z' },
  // Academy Mid-Tier Perimeter Rampart Promenade & Central Astrolabe Landing (-844 -> -880, x: -118..+120, y = -3.65)
  { minX: -118.0, maxX: -10.5, minZ: -880.0, maxZ: -844.0, yStart: ACADEMY.midLandingY, yEnd: ACADEMY.midLandingY },
  { minX: -11.0, maxX: 11.0, minZ: -852.0, maxZ: -842.0, yStart: ACADEMY.midLandingY, yEnd: ACADEMY.midLandingY },
  { minX: 10.5, maxX: 120.0, minZ: -880.0, maxZ: -844.0, yStart: ACADEMY.midLandingY, yEnd: ACADEMY.midLandingY },
  // Academy Upper Grand Stairway & Flanking Wing Switchback Stairways (-852 -> -874, y = -3.65 -> +6.35)
  { minX: -6.0, maxX: 6.0, minZ: -874.0, maxZ: -852.0, yStart: ACADEMY.midLandingY, yEnd: ACADEMY.forecourtY, slopeAxis: 'z' },
  { minX: -64.0, maxX: -54.0, minZ: -874.0, maxZ: -852.0, yStart: ACADEMY.midLandingY, yEnd: ACADEMY.forecourtY, slopeAxis: 'z' },
  { minX: 54.0, maxX: 64.0, minZ: -874.0, maxZ: -852.0, yStart: ACADEMY.midLandingY, yEnd: ACADEMY.forecourtY, slopeAxis: 'z' },
  // Widened Academy Grand Cathedral Forecourt & Wing Terraces (-874 -> -906, x: -76..+76, y = +6.35)
  { minX: -76.0, maxX: 76.0, minZ: ACADEMY.forecourtEndZ, maxZ: -874.0, yStart: ACADEMY.forecourtY, yEnd: ACADEMY.forecourtY },
];

const TUNNEL_CORRIDORS = [
  { minX: -39.6, maxX: -13.2, minZ: -114.6, maxZ: -108.4 },
  { minX: -39.6, maxX: -33.4, minZ: -136.4, maxZ: -108.4 },
] as const;

export function getWorldColliders(): CircleCollider[] {
  const colliders: CircleCollider[] = [];

  // Rotunda perimeter columns at r = 14.0
  const numColumns = 12;
  for (let i = 0; i < numColumns; i++) {
    const angle = (i / numColumns) * Math.PI * 2;
    const x = Math.sin(angle) * 14.0;
    const z = -Math.cos(angle) * 14.0;
    if (z < -10.5 && Math.abs(x) < 5.6) continue;
    if (z > 10.5 && Math.abs(x) < 4.5) continue;
    colliders.push({ x, yMin: -2, yMax: 9, z, r: 0.95 });
  }

  // Overgrown curved stone benches inside sanctuary
  colliders.push({ x: -7.2, yMin: -1, yMax: 3, z: 4.0, r: 1.1 });
  colliders.push({ x: 7.2, yMin: -1, yMax: 3, z: 4.0, r: 1.1 });

  // Firelink bonfire central ash mound
  colliders.push({ x: 0, yMin: -2, yMax: 2, z: 0, r: 1.05 });

  // Sunken terrace bonfire mound
  colliders.push({ x: -2.5, yMin: -16, yMax: -11, z: -110.5, r: 1.05 });

  // Twin vaulted pier columns standing on Sunken Catacomb Terrace
  for (const pz of [-103.2, -119.6]) {
    colliders.push({ x: -4.6, yMin: -16, yMax: -1, z: pz, r: 1.35 });
    colliders.push({ x: 4.6, yMin: -16, yMax: -1, z: pz, r: 1.35 });
  }

  // Citadel courtyard colonnade pillars (outer courtyard at y = 18)
  for (let i = 0; i < 4; i++) {
    const z = -172 - i * 9.3;
    colliders.push({ x: -13.5, yMin: 16, yMax: 32, z, r: 1.25 });
    colliders.push({ x: 13.5, yMin: 16, yMax: 32, z, r: 1.25 });
  }

  // Spiral Tower Tier 1 Gothic ring columns at r = 13.8 (skipping South vestibule & North throne & Flight 1 cutout)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const normA = Math.atan2(Math.sin(a), Math.cos(a));
    if (normA >= -1.35 && normA <= 0.78) continue; // Flight 1 stairwell opening
    if (Math.abs(normA - Math.PI / 2) < 0.55) continue; // South gatehouse entrance
    if (Math.abs(normA + Math.PI / 2) < 0.48) continue; // North throne dais
    colliders.push({
      x: Math.cos(a) * 13.8,
      yMin: 16.5,
      yMax: 44.0,
      z: TOWER.cz + Math.sin(a) * 13.8,
      r: 0.9,
    });
  }

  // Tier 1 Sovereign's Stone Throne at North Dais (x = 0, z = -261.2)
  colliders.push({ x: 0, yMin: 16.5, yMax: 25.0, z: -261.2, r: 1.35 });

  // Tier 2 Ashen Cloister Bonfire mound (West Chapel at (-16.2, 4.0, -246))
  colliders.push({ x: -16.2, yMin: 2.0, yMax: 8.0, z: TOWER.cz, r: 1.1 });

  // Tier 2 Silent Stone Knight Statues & Monastery Tables around West/South-West/North-West gallery
  const t2Statues: Array<[number, number]> = [
    [-19.5, TOWER.cz - 3.6],
    [-19.5, TOWER.cz + 3.6],
    [Math.cos(Math.PI * 0.85) * 14.2, TOWER.cz + Math.sin(Math.PI * 0.85) * 14.2],
    [Math.cos(-Math.PI * 0.85) * 14.2, TOWER.cz + Math.sin(-Math.PI * 0.85) * 14.2],
  ];
  for (const [sx, sz] of t2Statues) {
    colliders.push({ x: sx, yMin: 2.0, yMax: 10.0, z: sz, r: 0.95 });
  }

  // Tier 3 Rear Gatehouse portcullis flanking buttress piers
  for (const gz of [-267.0, -282.0]) {
    colliders.push({ x: -7.2, yMin: -12, yMax: 2, z: gz, r: 1.15 });
    colliders.push({ x: 7.2, yMin: -12, yMax: 2, z: gz, r: 1.15 });
  }

  // Misty Hinterland Woods: Soul Lantern stone pedestals along stretched Whispering Path
  const whisperLanternZs = [-306, -330, -356, -384, -412, -440, -512, -536];
  for (let i = 0; i < whisperLanternZs.length; i++) {
    const lz = whisperLanternZs[i];
    const side = i % 2 === 0 ? -1 : 1;
    const lx = lz < -496 ? side * 5.2 : getWhisperingTrailX(lz) + side * 4.8;
    colliders.push({
      x: lx,
      yMin: -15,
      yMax: -3,
      z: lz,
      r: 0.65,
    });
  }

  // Moonlit Clearing: Bonfire mound + Ruined Belfry Shrine archway pillars (centered at z = -480)
  colliders.push({
    x: HINTERLAND.clearingCx,
    yMin: -14,
    yMax: -6,
    z: HINTERLAND.clearingCz,
    r: 1.1,
  });
  colliders.push({ x: -12.6, yMin: -14, yMax: -2, z: -487.5, r: 1.25 });
  colliders.push({ x: -6.8, yMin: -14, yMax: -2, z: -490.5, r: 1.25 });

  // Hidden Side Alcove: Craggy mossy outcrop, Fallen Petrified Knight Statue & Ancient Gravestone
  colliders.push({ x: 21.5, yMin: -14, yMax: -2, z: -463.5, r: 2.8 });
  colliders.push({ x: 34.8, yMin: -14, yMax: -2, z: -469.5, r: 3.4 });
  colliders.push({ x: 29.5, yMin: -14, yMax: -4, z: -466.5, r: 1.0 });

  // Sunken Arcane Academy Outer Gatehouse flanking soul braziers & gate jamb piers
  colliders.push({ x: -8.2, yMin: -14, yMax: -4, z: -592.0, r: 0.9 });
  colliders.push({ x: 8.2, yMin: -14, yMax: -4, z: -592.0, r: 0.9 });

  // Flooded Academy Lake Causeway: Mid-Lake Bonfire mound, Outer Water-Gatehouse piers, Statues & Wing Landmarks
  colliders.push({
    x: ACADEMY.bonfireX,
    yMin: -16,
    yMax: -6,
    z: ACADEMY.bonfireZ,
    r: 1.15,
  });
  const wgCx = getLakeCausewayX(ACADEMY.waterGateZ);
  colliders.push({ x: wgCx - 6.6, yMin: -16, yMax: 12, z: ACADEMY.waterGateZ, r: 1.6 });
  colliders.push({ x: wgCx + 6.6, yMin: -16, yMax: 12, z: ACADEMY.waterGateZ, r: 1.6 });
  for (const sz of [-632.0, -674.0, -764.0, -800.0]) {
    const scx = getLakeCausewayX(sz);
    colliders.push({ x: scx - 5.9, yMin: -16, yMax: -4, z: sz, r: 1.0 });
    colliders.push({ x: scx + 5.9, yMin: -16, yMax: -4, z: sz, r: 1.0 });
  }
  // West Cloister Courtyard: Gazebo center columns & raised tree planters (leaving 6m central & outer avenues open)
  for (const [gx, gz] of [
    [-136, -770],
    [-104, -770],
    [-136, -798],
    [-104, -798],
  ]) {
    colliders.push({ x: gx, yMin: -14, yMax: 0, z: gz, r: 1.5 });
  }
  // East Harbor Rotunda: Coastal Watchtower (center 138, -784) & Center Astrolabe Sundial
  colliders.push({ x: 138.0, yMin: -15, yMax: 42, z: -784.0, r: 7.4 });
  colliders.push({ x: ACADEMY.eastRotundaCx, yMin: -14, yMax: -5, z: ACADEMY.eastRotundaCz, r: 1.75 });
  // Academy Forecourt braziers & wing guardian statues
  colliders.push({ x: -8.5, yMin: 4, yMax: 12, z: -892.0, r: 0.9 });
  colliders.push({ x: 8.5, yMin: 4, yMax: 12, z: -892.0, r: 0.9 });
  colliders.push({ x: -34.0, yMin: 4, yMax: 14, z: -892.0, r: 1.3 });
  colliders.push({ x: 34.0, yMin: 4, yMax: 14, z: -892.0, r: 1.3 });

  // Snowy Valley Pass Gate stone piers & fused cliff shoulders (zero walk-around gap!)
  const passGateZ = getSnowPassCenterZ(HAMLET.passEndX);
  colliders.push({ x: HAMLET.passGateX + 0.5, yMin: -6, yMax: 12, z: passGateZ - 4.4, r: 1.8 });
  colliders.push({ x: HAMLET.passGateX + 0.5, yMin: -6, yMax: 12, z: passGateZ + 4.4, r: 1.8 });

  // Ashenbrook Hamlet: Center Bonfire, Stone Village Well & 6 Cottages
  colliders.push({
    x: HAMLET.bonfireX,
    yMin: -14,
    yMax: -5,
    z: HAMLET.bonfireZ,
    r: 1.1,
  });
  // Stone Village Well
  colliders.push({ x: HAMLET.hamletCx + 7.5, yMin: -14, yMax: -5, z: HAMLET.hamletCz + 6.5, r: 1.4 });
  // 6 Rustic Cottages around the village perimeter
  const cottageFootprints: Array<[number, number, number]> = [
    [-172, -534, 4.4],
    [-190, -532, 4.6],
    [-168, -560, 4.4],
    [-192, -562, 4.6],
    [-200, -537, 4.2],
    [-176, -564, 4.2],
  ];
  for (const [cx, cz, cr] of cottageFootprints) {
    colliders.push({ x: cx, yMin: -14, yMax: 2, z: cz, r: cr });
  }

  return colliders;
}

const STATIC_COLLIDERS = getWorldColliders();

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function evalRectHeight(p: WalkableRect, x: number, z: number): number {
  if (p.yStart === p.yEnd) {
    return p.yStart;
  }
  if (p.slopeAxis === 'x') {
    const t = Math.max(0, Math.min(1, (p.maxX - x) / (p.maxX - p.minX)));
    return p.yStart + t * (p.yEnd - p.yStart);
  }
  const t = Math.max(0, Math.min(1, (p.maxZ - z) / (p.maxZ - p.minZ)));
  return p.yStart + t * (p.yEnd - p.yStart);
}

function pushSpiralCandidates(
  heights: number[],
  r: number,
  ang: number,
  rMin: number,
  rMax: number,
  thetaStart: number,
  thetaEnd: number,
  yStart: number,
  yEnd: number,
) {
  if (r < rMin || r > rMax) return;
  const lo = Math.min(thetaStart, thetaEnd);
  const hi = Math.max(thetaStart, thetaEnd);
  for (let k = -2; k <= 1; k++) {
    const theta = ang + k * Math.PI * 2;
    if (theta >= lo - 0.02 && theta <= hi + 0.02) {
      const t = Math.max(0, Math.min(1, (theta - thetaStart) / (thetaEnd - thetaStart)));
      heights.push(yStart + t * (yEnd - yStart));
    }
  }
}

/**
 * Returns all candidate floor surface elevations at world (x, z) so overlapping multi-tier floors,
 * spiral staircase flights, and under-viaduct ledges never snap to upper floors from underneath.
 */
export function getCandidateSurfaceHeights(x: number, z: number): number[] {
  const heights: number[] = [];

  // 1. Sanctuary Rotunda (r <= 16.0, z >= -15.5)
  if (z >= -15.5 && Math.hypot(x, z) <= 16.0) {
    const distFromCenter = Math.hypot(x, z);
    if (distFromCenter <= WORLD.pitOuterRadius) {
      const pitT = smoothstep(WORLD.pitInnerRadius, WORLD.pitOuterRadius, distFromCenter);
      heights.push(WORLD.pitDepth * (1 - pitT));
    } else if (z < WORLD.apronStartZ) {
      const t = smoothstep(WORLD.apronStartZ, WORLD.lowerStairStartZ, z);
      heights.push(t * 1.5);
    } else {
      heights.push(0);
    }
  }

  // 2. North Sanctuary Apron & Lower Staircase (-13.5 to -52.0)
  if (z <= -13.5 && z >= WORLD.lowerStairEndZ) {
    const halfW = z > -22.0 ? 5.3 : 4.75;
    if (Math.abs(x) <= halfW) {
      if (z > WORLD.lowerStairStartZ) {
        const t = smoothstep(WORLD.apronStartZ, WORLD.lowerStairStartZ, z);
        heights.push(t * 1.5);
      } else {
        const stairT = Math.max(
          0,
          Math.min(1, (WORLD.lowerStairStartZ - z) / (WORLD.lowerStairStartZ - WORLD.lowerStairEndZ)),
        );
        heights.push(1.5 + stairT * (WORLD.viaductBaseY - 1.5));
      }
    }
  }

  // 3. The Pilgrim's Viaduct Deck (-52.0 to -138.0)
  if (z <= WORLD.viaductStartZ && z >= WORLD.viaductEndZ && Math.abs(x) <= WORLD.viaductHalfWidth) {
    const bridgeT = (WORLD.viaductStartZ - z) / (WORLD.viaductStartZ - WORLD.viaductEndZ);
    const camber = Math.sin(bridgeT * Math.PI) * 0.55;
    heights.push(WORLD.viaductBaseY + camber);
  }

  // 4. Upper Citadel Ascent Staircase (-138.0 to -166.0)
  if (z <= WORLD.upperStairStartZ && z >= WORLD.upperStairEndZ) {
    const stairT =
      (WORLD.upperStairStartZ - z) / (WORLD.upperStairStartZ - WORLD.upperStairEndZ);
    const halfW = 5.5 + stairT * 1.4;
    if (Math.abs(x) <= halfW) {
      heights.push(WORLD.viaductBaseY + stairT * (WORLD.courtyardY - WORLD.viaductBaseY));
    }
  }

  // 5. Citadel of Fallen Gold Courtyard (-166.0 to -209.0)
  if (z <= WORLD.upperStairEndZ && z >= -209.0 && Math.abs(x) <= 23.0) {
    heights.push(WORLD.courtyardY);
  }

  // 6. Secret Under-Viaduct Ledges, Scaffolding, and Sunken Catacomb Terrace
  for (let i = 0; i < UNDER_VIADUCT_PLATFORMS.length; i++) {
    const p = UNDER_VIADUCT_PLATFORMS[i];
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) {
      heights.push(evalRectHeight(p, x, z));
    }
  }

  // 7. Descending Subterranean Catacomb Tunnel
  for (let i = 0; i < TUNNEL_PLATFORMS.length; i++) {
    const p = TUNNEL_PLATFORMS[i];
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) {
      heights.push(evalRectHeight(p, x, z));
    }
  }

  // 8. 3-Tier Vertical Spiral Tower inside Citadel of Fallen Gold
  const tdx = x - TOWER.cx;
  const tdz = z - TOWER.cz;
  const tr = Math.hypot(tdx, tdz);
  if (tr <= TOWER.wallRadius + 0.6) {
    const tang = Math.atan2(tdz, tdx);

    // Tier 1 Ring Floor (r: 7.2..17.5, y = 18.0), minus Flight 1 stairwell cutout
    if (tr >= TOWER.shaftRadius - 0.3 && tr <= TOWER.wallRadius + 0.5) {
      const inF1Cutout =
        tr > TOWER.stairInnerRadius - 0.05 &&
        tang >= TOWER.f1CutoutMinAng &&
        tang <= TOWER.f1CutoutMaxAng;
      if (!inF1Cutout) {
        heights.push(TOWER.tier1Y);
      }
    }

    // Tier 2 Ring Floor (r: 7.2..17.5, y = 4.0), minus Flight 2 stairwell cutout
    if (tr >= TOWER.shaftRadius - 0.3 && tr <= TOWER.wallRadius + 0.5) {
      const inF2Cutout =
        tr > TOWER.stairInnerRadius - 0.05 &&
        tang >= TOWER.f2CutoutMinAng &&
        tang <= TOWER.f2CutoutMaxAng;
      if (!inF2Cutout) {
        heights.push(TOWER.tier2Y);
      }
    }

    // Tier 3 Full Circular Base Floor (r: 0..17.5, y = -10.0) looking up the 28m spiral shaft
    if (tr <= TOWER.wallRadius + 0.5) {
      heights.push(TOWER.tier3Y);
    }

    // Flight 1 Spiral Staircase (y = 18.0 -> 4.0)
    pushSpiralCandidates(
      heights,
      tr,
      tang,
      TOWER.stairInnerRadius - 0.25,
      TOWER.wallRadius + 0.35,
      TOWER.f1StartAng,
      TOWER.f1EndAng,
      TOWER.tier1Y,
      TOWER.tier2Y,
    );

    // Flight 2 Spiral Staircase (y = 4.0 -> -10.0)
    pushSpiralCandidates(
      heights,
      tr,
      tang,
      TOWER.stairInnerRadius - 0.25,
      TOWER.wallRadius + 0.35,
      TOWER.f2StartAng,
      TOWER.f2EndAng,
      TOWER.tier2Y,
      TOWER.tier3Y,
    );
  }

  // 9. Citadel Linear Connectors & Expanded Misty Hinterland Woods
  for (let i = 0; i < CITADEL_LINEAR_PLATFORMS.length; i++) {
    const p = CITADEL_LINEAR_PLATFORMS[i];
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) {
      heights.push(evalRectHeight(p, x, z));
    }
  }

  // Extended Whispering Path (-292 to -463)
  if (z <= -291.5 && z >= -464.0) {
    const cx = getWhisperingTrailX(z);
    if (Math.abs(x - cx) <= 7.8) {
      heights.push(getHinterlandGroundY(x, z));
    }
  }

  // Moonlit Clearing Circular Hub (centered (0, -480), radius 18.5m)
  if (Math.hypot(x - HINTERLAND.clearingCx, z - HINTERLAND.clearingCz) <= HINTERLAND.clearingRadius + 0.8) {
    heights.push(WORLD.hinterlandY);
  }

  // Hidden Side Alcove East of Moonlit Clearing (x: 13.5..39.2, z: -483.5..-461.5)
  if (x >= 13.5 && x <= 39.2 && z >= -483.5 && z <= -461.5) {
    heights.push(WORLD.hinterlandY);
  }

  // Lengthened North Woods from Clearing (-496) to Near Riverbank (-552)
  if (z <= -495.5 && z >= -552.5 && Math.abs(x) <= 8.5) {
    heights.push(getHinterlandGroundY(x, z));
  }

  // Grand Arched Stone Bridge spanning the Moonlit River (-552 to -582)
  if (
    z <= HINTERLAND.bridgeStartZ + 0.5 &&
    z >= HINTERLAND.bridgeEndZ - 0.5 &&
    Math.abs(x) <= HINTERLAND.bridgeHalfW
  ) {
    heights.push(getFootbridgeY(z));
  }

  // Left-Hand Riverside Trail (-4 -> -162 along near riverbank)
  if (x <= -3.5 && x >= -163.0) {
    const trailZ = getRiversideTrailZ(x);
    if (Math.abs(z - trailZ) <= 7.5) {
      heights.push(getHinterlandGroundY(x, z));
    }
  }

  // Ashenbrook Hamlet Foothill Village Plateau ((-182, -548), radius 23.5m)
  if (Math.hypot(x - HAMLET.hamletCx, z - HAMLET.hamletCz) <= HAMLET.hamletRadius + 0.8) {
    heights.push(HAMLET.hamletY);
  }

  // Rocky Snowy Valley Pass climbing west behind Ashenbrook Hamlet (-202 -> -252, tapering into Gate Cliffs)
  if (x <= -201.0 && x >= HAMLET.passEndX - 0.5) {
    const passZ = getSnowPassCenterZ(x);
    const gateTaper = smoothstep(-238.0, HAMLET.passEndX, x);
    const halfW = 5.8 - gateTaper * 2.2;
    if (Math.abs(z - passZ) <= halfW) {
      heights.push(getHinterlandGroundY(x, z));
    }
  }

  // Flooded Academy Lake Widened Winding Causeway (-610 -> -785) & Mid-Lake Bonfire Island
  if (z <= -609.5 && z >= ACADEMY.causewayStraightZ - 0.5) {
    const cx = getLakeCausewayX(z);
    if (Math.abs(x - cx) <= ACADEMY.causewayHalfW) {
      heights.push(getLakeCausewayY(z));
    }
  }
  if (Math.hypot(x - ACADEMY.midIslandCx, z - ACADEMY.midIslandCz) <= ACADEMY.midIslandRadius + 0.6) {
    heights.push(ACADEMY.causewayY + 0.15);
  }

  // West Wing Curved Two-Tier Viaduct (x: +4 -> -92)
  if (x <= 4.5 && x >= -92.5) {
    const vz = getWestViaductZ(x);
    if (Math.abs(z - vz) <= 5.0) {
      heights.push(getWestViaductY(x));
    }
  }

  // East Wing Astronomical Pier Promenade (x: +8 -> +94) & Harbor Rotunda
  if (x >= 7.5 && x <= 94.5) {
    const pz = getEastPromenadeZ(x);
    if (Math.abs(z - pz) <= 5.0) {
      heights.push(getEastPromenadeY(x));
    }
  }
  if (Math.hypot(x - ACADEMY.eastRotundaCx, z - ACADEMY.eastRotundaCz) <= ACADEMY.eastRotundaRadius + 0.6) {
    heights.push(ACADEMY.eastBastionY);
  }

  return heights;
}

/**
 * Finds the highest walkable floor directly beneath (or up to stepUpMargin above) currentY.
 * Returns null if the knight has stepped off into open air over the valley!
 */
export function sampleFloorHeight(
  x: number,
  currentY: number,
  z: number,
  stepUpMargin = 1.15,
): number | null {
  const candidates = getCandidateSurfaceHeights(x, z);
  let best: number | null = null;
  for (let i = 0; i < candidates.length; i++) {
    const h = candidates[i];
    if (h <= currentY + stepUpMargin) {
      if (best === null || h > best) {
        best = h;
      }
    }
  }
  return best;
}

/**
 * Continuous / swept vertical ground resolver for anti-tunneling while sprinting + jumping on stairs.
 */
export function resolveVerticalStep(params: {
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
  const { prevX, prevY, prevZ, nextX, nextZ, dt, raycastFloor } = params;
  let { velY, grounded } = params;

  const midX = (prevX + nextX) * 0.5;
  const midZ = (prevZ + nextZ) * 0.5;

  if (!grounded) {
    velY -= 21.0 * dt;
    const nextY = prevY + velY * dt;
    const sweepHigh = Math.max(prevY, nextY);
    const stepTol = velY <= 0 ? 0.95 : 0.42;

    const endFloor = sampleFloorHeight(nextX, sweepHigh, nextZ, stepTol);
    const midFloor = sampleFloorHeight(midX, sweepHigh, midZ, stepTol);
    let catchFloor: number | null = endFloor;
    if (raycastFloor !== undefined && raycastFloor !== null && raycastFloor <= sweepHigh + stepTol) {
      if (catchFloor === null || raycastFloor > catchFloor) {
        catchFloor = raycastFloor;
      }
    }
    if (midFloor !== null && endFloor === null && nextY <= midFloor) {
      catchFloor = midFloor;
    }

    if (catchFloor !== null && nextY <= catchFloor) {
      return { y: catchFloor, velY: 0, grounded: true };
    }
    return { y: nextY, velY, grounded: false };
  }

  // Grounded state: generous step-up onto steep stairs & spiral steps while sprinting
  const analyticFloor = sampleFloorHeight(nextX, prevY, nextZ, 1.25);
  let floorY = analyticFloor;
  if (raycastFloor !== undefined && raycastFloor !== null && raycastFloor <= prevY + 1.25) {
    if (floorY === null || raycastFloor > floorY) {
      floorY = raycastFloor;
    }
  }

  if (floorY === null || prevY - floorY > 0.95) {
    return { y: prevY, velY: 0, grounded: false };
  }

  const alpha = 1 - Math.exp(-24 * dt);
  let nextY = prevY + (floorY - prevY) * alpha;
  if (Math.abs(nextY - floorY) < 0.01) nextY = floorY;
  return { y: nextY, velY: 0, grounded: true };
}

/**
 * Legacy helper returning the highest surface height at (x, z) or -45 for flat checks.
 */
export function getWalkableHeight(x: number, z: number): number {
  const candidates = getCandidateSurfaceHeights(x, z);
  if (candidates.length === 0) return -45.0;
  return Math.max(...candidates);
}

function clampToCorridorUnion(
  corridors: ReadonlyArray<{ minX: number; maxX: number; minZ: number; maxZ: number }>,
  x: number,
  z: number,
  r: number,
): { x: number; z: number } {
  for (let i = 0; i < corridors.length; i++) {
    const c = corridors[i];
    if (x >= c.minX + r && x <= c.maxX - r && z >= c.minZ + r && z <= c.maxZ - r) {
      return { x, z };
    }
  }
  let bestX = x;
  let bestZ = z;
  let bestDistSq = Infinity;
  for (let i = 0; i < corridors.length; i++) {
    const c = corridors[i];
    const cx = Math.max(c.minX + r, Math.min(c.maxX - r, x));
    const cz = Math.max(c.minZ + r, Math.min(c.maxZ - r, z));
    const dSq = (cx - x) * (cx - x) + (cz - z) * (cz - z);
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestX = cx;
      bestZ = cz;
    }
  }
  return { x: bestX, z: bestZ };
}

function clampWoodsPerimeter(x: number, z: number, r: number): { x: number; z: number } {
  // 1. Rear Gatehouse steps (-286..-292)
  if (z >= -292.0 && z <= -285.5 && Math.abs(x) <= 5.6 - r) return { x, z };
  // 2. Extended Whispering Path (-292..-464)
  if (z <= -291.5 && z >= -464.0) {
    const trailX = getWhisperingTrailX(z);
    if (Math.abs(x - trailX) <= 7.0 - r) return { x, z };
  }
  // 3. Moonlit Clearing circle (r <= 18.0)
  const cdx = x - HINTERLAND.clearingCx;
  const cdz = z - HINTERLAND.clearingCz;
  if (cdx * cdx + cdz * cdz <= (HINTERLAND.clearingRadius - r) * (HINTERLAND.clearingRadius - r)) {
    return { x, z };
  }
  // 4. Hidden Side Alcove (East branch from Moonlit Clearing)
  if (x >= 13.5 && x <= 38.6 - r && z >= -482.8 + r && z <= -462.2 - r) return { x, z };
  // 5. North Woods (-495..-552.5) -> Academy Bridge (-552..-582) -> Outer Gatehouse (-582..-610)
  if (z <= -495.5 && z >= -552.5 && Math.abs(x) <= 7.8 - r) return { x, z };
  if (z < -552.5 && z >= -582.0 && Math.abs(x) <= HINTERLAND.bridgeHalfW - 0.35 - r) return { x, z };
  // Outer Gatehouse doorway narrowing cleanly at z ∈ [-587.5, -583.0] (|x| <= 5.2 - r), widening onto Plaza [-602..-587.5]
  if (z < -582.0 && z >= -587.5 && Math.abs(x) <= 5.2 - r) return { x, z };
  if (z < -587.5 && z >= -602.0 && Math.abs(x) <= 12.0 - r) return { x, z };
  if (z < -602.0 && z >= -610.0 && Math.abs(x) <= ACADEMY.causewayHalfW - r) return { x, z };

  // 5B. Flooded Academy Lake Causeway (-610..-785), Junction Plaza & Mid-Lake Bonfire Island
  if (z < -610.0 && z >= ACADEMY.causewayStraightZ) {
    const cx = getLakeCausewayX(z);
    if (Math.abs(x - cx) <= ACADEMY.causewayHalfW - 0.35 - r) return { x, z };
  }
  if (z <= -729.0 && z >= -751.0 && x >= -8.0 + r && x <= 20.0 - r) return { x, z };
  const mdx = x - ACADEMY.midIslandCx;
  const mdz = z - ACADEMY.midIslandCz;
  if (mdx * mdx + mdz * mdz <= (ACADEMY.midIslandRadius - r) * (ACADEMY.midIslandRadius - r)) {
    return { x, z };
  }

  // 5B-West. Curved Viaduct, Flooded Western Cloister Courtyard & West Ascent Stair
  if (x <= 4.0 && x >= -92.0 && Math.abs(z - getWestViaductZ(x)) <= 4.6 - r) return { x, z };
  if (
    x >= ACADEMY.westCloisterMinX + r &&
    x <= ACADEMY.westCloisterMaxX - r &&
    z >= ACADEMY.westCloisterMinZ + r &&
    z <= ACADEMY.westCloisterMaxZ - r
  ) {
    return { x, z };
  }
  if (x >= -112.0 + r && x <= -100.0 - r && z >= -844.0 && z <= ACADEMY.westCloisterMinZ) {
    return { x, z };
  }

  // 5B-East. East Promenade, Harbor Rotunda, Stepped Docks & Sky-Bridge
  if (x >= 8.0 && x <= 94.0 && Math.abs(z - getEastPromenadeZ(x)) <= 4.6 - r) return { x, z };
  const edx = x - ACADEMY.eastRotundaCx;
  const edz = z - ACADEMY.eastRotundaCz;
  if (edx * edx + edz * edz <= (ACADEMY.eastRotundaRadius - r) * (ACADEMY.eastRotundaRadius - r)) {
    return { x, z };
  }
  if (x >= 106.0 + r && x <= 134.0 - r && z >= -758.5 && z <= -744.0 - r) return { x, z };
  if (x >= 106.0 + r && x <= 118.0 - r && z >= -844.0 && z <= -810.0) return { x, z };

  // 5C. Straight Grand Approach, Seawall Docks, Switchback Stairs, Perimeter Promenade & Widened Forecourt
  if (z < ACADEMY.causewayStraightZ && z >= -820.0 && Math.abs(x) <= ACADEMY.causewayHalfW - 0.35 - r) {
    return { x, z };
  }
  if (z <= -812.0 && z >= -844.0 && x >= -86.0 + r && x <= -6.8) return { x, z };
  if (z <= -812.0 && z >= -844.0 && x >= 6.8 && x <= 86.0 - r) return { x, z };
  if (z < -820.0 && z >= ACADEMY.lowerStairEndZ && Math.abs(x) <= 6.6 - r) return { x, z };
  if (z <= ACADEMY.lowerStairEndZ && z >= -880.0 + r && x >= -118.0 + r && x <= 120.0 - r) {
    if (z >= ACADEMY.midLandingEndZ && (Math.abs(x) <= 10.6 - r || z <= -844.0)) return { x, z };
    // Upper stairways + forecourt zone (-852..-906)
    if (Math.abs(x) <= 5.6 - r) return { x, z };
    if (x >= -64.0 + r && x <= -54.0 - r) return { x, z };
    if (x >= 54.0 + r && x <= 64.0 - r) return { x, z };
    if (z >= -880.0 + r && z <= -844.0 && (x < -10.5 || x > 10.5)) return { x, z };
  }
  if (z < ACADEMY.upperStairEndZ && z >= ACADEMY.cathedralDoorZ + 0.8 + r && x >= -76.0 + r && x <= 76.0 - r) {
    return { x, z };
  }

  // 6. Left-Hand Riverside Trail (-4 -> -162)
  if (x <= -3.5 && x >= -162.5) {
    const rTrailZ = getRiversideTrailZ(x);
    if (Math.abs(z - rTrailZ) <= 6.8 - r) return { x, z };
  }
  // 7. Ashenbrook Hamlet Foothill Village ((-182, -548), r <= 23.0)
  const hdx = x - HAMLET.hamletCx;
  const hdz = z - HAMLET.hamletCz;
  if (hdx * hdx + hdz * hdz <= (HAMLET.hamletRadius - r) * (HAMLET.hamletRadius - r)) {
    return { x, z };
  }
  // 8. Snowy Valley Pass (-202 -> -252) tightly fused with cliff shoulders & gate piers
  if (x <= -201.5 && x >= HAMLET.passEndX + r) {
    const passZ = getSnowPassCenterZ(x);
    const gateTaper = smoothstep(-238.0, HAMLET.passEndX, x);
    const halfPassW = 5.0 - gateTaper * 2.1 - r;
    if (Math.abs(z - passZ) <= halfPassW) return { x, z };
  }

  // Project onto nearest valid walkable zone
  const candidates: Array<{ x: number; z: number }> = [];

  if (z > -464.5) {
    const cz = Math.max(-464.0, Math.min(-286.0, z));
    const maxW = cz > -292.0 ? 5.6 - r : 7.0 - r;
    const center = cz > -292.0 ? 0 : getWhisperingTrailX(cz);
    candidates.push({ x: Math.max(center - maxW, Math.min(center + maxW, x)), z: cz });
  }

  // Moonlit Clearing rim projection
  const cDist = Math.hypot(cdx, cdz) || 1;
  const maxCR = HINTERLAND.clearingRadius - r;
  candidates.push({
    x: HINTERLAND.clearingCx + (cdx / cDist) * Math.min(cDist, maxCR),
    z: HINTERLAND.clearingCz + (cdz / cDist) * Math.min(cDist, maxCR),
  });

  // East Alcove projection
  candidates.push({
    x: Math.max(13.5, Math.min(38.6 - r, x)),
    z: Math.max(-482.8 + r, Math.min(-462.2 - r, z)),
  });

  // North Woods / Academy Bridge / Outer Gatehouse projections
  candidates.push({
    x: Math.max(-(7.8 - r), Math.min(7.8 - r, x)),
    z: Math.max(-552.5, Math.min(-495.5, z)),
  });
  const bHalf = HINTERLAND.bridgeHalfW - 0.35 - r;
  candidates.push({
    x: Math.max(-bHalf, Math.min(bHalf, x)),
    z: Math.max(-582.0, Math.min(-552.5, z)),
  });
  candidates.push({
    x: Math.max(-(5.2 - r), Math.min(5.2 - r, x)),
    z: Math.max(-587.5, Math.min(-582.0, z)),
  });
  candidates.push({
    x: Math.max(-(12.0 - r), Math.min(12.0 - r, x)),
    z: Math.max(-602.0, Math.min(-587.5, z)),
  });
  candidates.push({
    x: Math.max(-(ACADEMY.causewayHalfW - r), Math.min(ACADEMY.causewayHalfW - r, x)),
    z: Math.max(-610.0, Math.min(-602.0, z)),
  });

  // Flooded Academy Lake Causeway, Junction Plaza & Mid-Lake Island projections
  const clampedLakeZ = Math.max(ACADEMY.causewayStraightZ, Math.min(-610.0, z));
  const lakeCx = getLakeCausewayX(clampedLakeZ);
  candidates.push({
    x: Math.max(lakeCx - (ACADEMY.causewayHalfW - 0.35 - r), Math.min(lakeCx + (ACADEMY.causewayHalfW - 0.35 - r), x)),
    z: clampedLakeZ,
  });
  candidates.push({
    x: Math.max(-8.0 + r, Math.min(20.0 - r, x)),
    z: Math.max(-751.0, Math.min(-729.0, z)),
  });
  const mDist = Math.hypot(mdx, mdz) || 1;
  const maxMR = ACADEMY.midIslandRadius - r;
  candidates.push({
    x: ACADEMY.midIslandCx + (mdx / mDist) * Math.min(mDist, maxMR),
    z: ACADEMY.midIslandCz + (mdz / mDist) * Math.min(mDist, maxMR),
  });

  // West Wing projections
  const clampedWestX = Math.max(-92.0, Math.min(4.0, x));
  const wVz = getWestViaductZ(clampedWestX);
  candidates.push({
    x: clampedWestX,
    z: Math.max(wVz - (4.6 - r), Math.min(wVz + (4.6 - r), z)),
  });
  candidates.push({
    x: Math.max(ACADEMY.westCloisterMinX + r, Math.min(ACADEMY.westCloisterMaxX - r, x)),
    z: Math.max(ACADEMY.westCloisterMinZ + r, Math.min(ACADEMY.westCloisterMaxZ - r, z)),
  });
  candidates.push({
    x: Math.max(-112.0 + r, Math.min(-100.0 - r, x)),
    z: Math.max(-844.0, Math.min(ACADEMY.westCloisterMinZ, z)),
  });

  // East Wing projections
  const clampedEastX = Math.max(8.0, Math.min(94.0, x));
  const ePz = getEastPromenadeZ(clampedEastX);
  candidates.push({
    x: clampedEastX,
    z: Math.max(ePz - (4.6 - r), Math.min(ePz + (4.6 - r), z)),
  });
  const eDist = Math.hypot(edx, edz) || 1;
  const maxER = ACADEMY.eastRotundaRadius - r;
  candidates.push({
    x: ACADEMY.eastRotundaCx + (edx / eDist) * Math.min(eDist, maxER),
    z: ACADEMY.eastRotundaCz + (edz / eDist) * Math.min(eDist, maxER),
  });
  candidates.push({
    x: Math.max(106.0 + r, Math.min(134.0 - r, x)),
    z: Math.max(-758.5, Math.min(-744.0 - r, z)),
  });
  candidates.push({
    x: Math.max(106.0 + r, Math.min(118.0 - r, x)),
    z: Math.max(-844.0, Math.min(-810.0, z)),
  });

  // Straight Approach, Seawall Docks, Perimeter Promenade & Academy Citadel Stairways + Forecourt projections
  candidates.push({
    x: Math.max(-(ACADEMY.causewayHalfW - 0.35 - r), Math.min(ACADEMY.causewayHalfW - 0.35 - r, x)),
    z: Math.max(-820.0, Math.min(ACADEMY.causewayStraightZ, z)),
  });
  candidates.push({
    x: Math.max(-86.0 + r, Math.min(-6.8, x)),
    z: Math.max(-842.0, Math.min(-812.0, z)),
  });
  candidates.push({
    x: Math.max(6.8, Math.min(86.0 - r, x)),
    z: Math.max(-842.0, Math.min(-812.0, z)),
  });
  candidates.push({
    x: Math.max(-(6.6 - r), Math.min(6.6 - r, x)),
    z: Math.max(ACADEMY.lowerStairEndZ, Math.min(-820.0, z)),
  });
  candidates.push({
    x: Math.max(-118.0 + r, Math.min(120.0 - r, x)),
    z: Math.max(-880.0 + r, Math.min(ACADEMY.lowerStairEndZ, z)),
  });
  candidates.push({
    x: Math.max(-(5.6 - r), Math.min(5.6 - r, x)),
    z: Math.max(ACADEMY.upperStairEndZ, Math.min(ACADEMY.midLandingEndZ, z)),
  });
  candidates.push({
    x: Math.max(-64.0 + r, Math.min(-54.0 - r, x)),
    z: Math.max(ACADEMY.upperStairEndZ, Math.min(ACADEMY.midLandingEndZ, z)),
  });
  candidates.push({
    x: Math.max(54.0 + r, Math.min(64.0 - r, x)),
    z: Math.max(ACADEMY.upperStairEndZ, Math.min(ACADEMY.midLandingEndZ, z)),
  });
  candidates.push({
    x: Math.max(-76.0 + r, Math.min(76.0 - r, x)),
    z: Math.max(ACADEMY.cathedralDoorZ + 0.8 + r, Math.min(ACADEMY.upperStairEndZ, z)),
  });

  // Left-Hand Riverside Trail projection
  const clampedTrailX = Math.max(-162.5, Math.min(-3.5, x));
  const rTrailZ = getRiversideTrailZ(clampedTrailX);
  candidates.push({
    x: clampedTrailX,
    z: Math.max(rTrailZ - (6.8 - r), Math.min(rTrailZ + (6.8 - r), z)),
  });

  // Ashenbrook Hamlet rim projection
  const hDist = Math.hypot(hdx, hdz) || 1;
  const maxHR = HAMLET.hamletRadius - r;
  candidates.push({
    x: HAMLET.hamletCx + (hdx / hDist) * Math.min(hDist, maxHR),
    z: HAMLET.hamletCz + (hdz / hDist) * Math.min(hDist, maxHR),
  });

  // Snowy Valley Pass projection
  const clampedPassX = Math.max(HAMLET.passEndX + r, Math.min(-201.5, x));
  const passZ = getSnowPassCenterZ(clampedPassX);
  const gateTaper = smoothstep(-238.0, HAMLET.passEndX, clampedPassX);
  const halfPassW = 5.0 - gateTaper * 2.1 - r;
  candidates.push({
    x: clampedPassX,
    z: Math.max(passZ - halfPassW, Math.min(passZ + halfPassW, z)),
  });

  let best = candidates[0];
  let bestD = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const d = (c.x - x) * (c.x - x) + (c.z - z) * (c.z - z);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * Resolves solid obstacle collisions ONLY (columns, benches, bonfire mounds,
 * Spiral Tower cylindrical walls & balustrades, Rear Gatehouse, Misty Hinterland Woods boundary,
 * Sunken Catacomb Gate, and tunnel walls).
 * All outer cliff/stair/viaduct edge barriers remain REMOVED so the knight can freely jump or fall off any ledge!
 */
export function resolveObstacleCollisions(
  targetX: number,
  currentY: number,
  targetZ: number,
  actorRadius = 0.45,
  gateOpened = false,
): { x: number; z: number } {
  let x = targetX;
  let z = targetZ;

  // 1. Citadel Outer Gatehouse & South Vestibule (-207.2 -> -230.0)
  if (z < -207.2 && z > -229.2 && currentY > 12.0) {
    if (Math.abs(x) > 6.6 - actorRadius) {
      if (z > -212.5) {
        z = -208.5 + actorRadius;
      } else {
        x = Math.sign(x) * (6.6 - actorRadius);
      }
    }
  }

  // 2. Citadel 3-Tier Vertical Spiral Tower (centered at (0, -246))
  const tdx = x - TOWER.cx;
  const tdz = z - TOWER.cz;
  const tr = Math.hypot(tdx, tdz);

  if (z <= -228.8 && z >= -263.8) {
    const inSouthEntry = z > -231.5 && Math.abs(x) < 6.6 - actorRadius && currentY > 14.0;
    const inNorthExit = z < -259.5 && Math.abs(x) < 6.2 - actorRadius && currentY < -5.5;
    const inWestChapel =
      x < -15.5 && Math.abs(tdz) < 4.9 - actorRadius && currentY >= 1.5 && currentY <= 9.5;

    if (inWestChapel) {
      x = Math.max(-21.0 + actorRadius, x);
      z = Math.max(TOWER.cz - (4.9 - actorRadius), Math.min(TOWER.cz + (4.9 - actorRadius), z));
    } else if (!inSouthEntry && !inNorthExit) {
      // Clamp within outer cylindrical masonry wall (r <= 17.5 - actorRadius)
      const maxR = TOWER.wallRadius - actorRadius;
      if (tr > maxR && tr > 0.001) {
        x = TOWER.cx + (tdx / tr) * maxR;
        z = TOWER.cz + (tdz / tr) * maxR;
      }
    }

    const rNow = Math.hypot(x - TOWER.cx, z - TOWER.cz);
    const tang = Math.atan2(z - TOWER.cz, x - TOWER.cx);

    // Central shaft balustrade on Tier 1 & Tier 2 (r >= 7.2 + actorRadius)
    if (currentY > 15.0 || (currentY >= 1.8 && currentY <= 7.8)) {
      const minShaftR = TOWER.shaftRadius + actorRadius;
      if (rNow < minShaftR) {
        if (rNow > 0.001) {
          x = TOWER.cx + ((x - TOWER.cx) / rNow) * minShaftR;
          z = TOWER.cz + ((z - TOWER.cz) / rNow) * minShaftR;
        } else {
          z = TOWER.cz + minShaftR;
        }
      }
    }

    // Inner spiral staircase balustrade while descending Flight 1 or Flight 2
    if ((currentY >= 5.2 && currentY <= 16.8) || (currentY >= -8.8 && currentY <= 2.8)) {
      const minStairR = TOWER.stairInnerRadius + actorRadius;
      if (rNow < minStairR) {
        if (rNow > 0.001) {
          x = TOWER.cx + ((x - TOWER.cx) / rNow) * minStairR;
          z = TOWER.cz + ((z - TOWER.cz) / rNow) * minStairR;
        } else {
          z = TOWER.cz + minStairR;
        }
      }
    }

    // Solid parapet separating Tier 1 North from Flight 1 stairwell cutout (ang = -1.22)
    if (currentY > 17.1 && rNow > TOWER.stairInnerRadius + 0.1) {
      if (tang > TOWER.f1CutoutMinAng - 0.06 && tang < TOWER.f1CutoutMinAng + 0.18) {
        const safeA = TOWER.f1CutoutMinAng - 0.06;
        x = TOWER.cx + Math.cos(safeA) * rNow;
        z = TOWER.cz + Math.sin(safeA) * rNow;
      }
    }

    // Solid parapet separating Tier 2 North-West from Flight 2 stairwell cutout (ang = -2.48)
    if (currentY >= 2.8 && currentY <= 6.2 && rNow > TOWER.stairInnerRadius + 0.1) {
      if (tang > TOWER.f2CutoutMinAng - 0.06 && tang < TOWER.f2CutoutMinAng + 0.18) {
        const safeA = TOWER.f2CutoutMinAng - 0.06;
        x = TOWER.cx + Math.cos(safeA) * rNow;
        z = TOWER.cz + Math.sin(safeA) * rNow;
      }
    }

    // Masonry under-wedge blocking low headroom underneath bottom of Flight 1 on Tier 2
    if (currentY >= 2.0 && currentY <= 6.5 && rNow > TOWER.stairInnerRadius + 0.1) {
      if (tang > 2.22 && tang < 2.58) {
        const safeA = 2.58;
        x = TOWER.cx + Math.cos(safeA) * rNow;
        z = TOWER.cz + Math.sin(safeA) * rNow;
      }
    }

    // Masonry under-wedge blocking low headroom underneath bottom of Flight 2 on Tier 3
    if (currentY < -7.0 && rNow > TOWER.stairInnerRadius + 0.1) {
      if (tang > 0.55 && tang < 0.92) {
        const safeA = 0.92;
        x = TOWER.cx + Math.cos(safeA) * rNow;
        z = TOWER.cz + Math.sin(safeA) * rNow;
      }
    }
  }

  // 3. Tier 3 Vaulted Rear Gatehouse Hall (-263.8 -> -286.0)
  if (z < -263.8 && z > -286.2) {
    const maxW = z < -283.5 ? 5.6 - actorRadius : 10.2 - actorRadius;
    x = Math.max(-maxW, Math.min(maxW, x));
  }

  // 4. Misty Hinterland Woods & Branches (z <= -286.0)
  if (z <= -286.0) {
    const clamped = clampWoodsPerimeter(x, z, actorRadius);
    x = clamped.x;
    z = clamped.z;
  }

  // 5. Sunken Catacomb Gate cliff wall & Subterranean Tunnel walls
  if (currentY < -5 && z > -150) {
    if (!gateOpened) {
      if (z <= -92 && z >= -126 && x < WORLD.catacombDoorX + actorRadius) {
        x = WORLD.catacombDoorX + actorRadius;
      }
    } else if (x < WORLD.catacombDoorX + actorRadius) {
      if (x >= -14.2 && (z < -114.6 + actorRadius || z > -108.4 - actorRadius)) {
        if (z <= -92 && z >= -126) {
          x = WORLD.catacombDoorX + actorRadius;
        }
      } else {
        const clamped = clampToCorridorUnion(TUNNEL_CORRIDORS, x, z, actorRadius);
        x = clamped.x;
        z = clamped.z;
      }
    }
  }

  // 6. Solid circular obstacle colliders (columns, statues, bonfires, lanterns, fallen knight)
  for (let i = 0; i < STATIC_COLLIDERS.length; i++) {
    const c = STATIC_COLLIDERS[i];
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

/**
 * Spatial zone trigger lookup for the 3-second Elden Ring-style area discovery banner.
 */
export function getZoneAtPosition(z: number, y = 0, x = 0): ZoneId {
  // Subterranean Descending Tunnel beyond the Sunken Catacomb Gate
  if (x < -15.5 && y <= -12.5 && z <= -106 && z >= -140) {
    return 'tunnel';
  }
  // Sunken Catacomb Gate Terrace beneath the viaduct
  if (y <= -9.5 && z <= -92 && z >= -124 && x <= 8.5) {
    return 'catacomb';
  }
  // Ashenbrook Hamlet Foothill Village & Snowy Valley Pass
  if (z <= -286.0 && x <= -154.0 && y <= -1.5) {
    return 'hamlet';
  }
  // Flooded Sunken Arcane Academy Grounds beyond the opened outer gatehouse (z <= -586)
  if (z <= -586.0) {
    return 'academy-grounds';
  }
  // Misty Hinterland Woods beyond the Citadel rear gatehouse steps
  if (z <= -286.0 && y <= -8.5) {
    return 'hinterland';
  }
  // Tier 2 Ashen Cloister & Tier 3 Rear Gatehouse inside the Vertical Spiral Tower
  if (z <= -228.0 && z >= -286.5 && y <= 8.5) {
    return 'cloister';
  }
  // Tier 1 Sovereign's Rotunda & upper Flight 1 spiral stairs
  if (z <= -213.5 && y > 8.5) {
    return 'nave';
  }
  if (z > -50.0) {
    return 'sanctuary';
  }
  if (z > -144.0) {
    return 'viaduct';
  }
  return 'citadel';
}

export function findNearestBonfire(
  x: number,
  y: number,
  z: number,
  threshold = 4.6,
): BonfireSite | null {
  for (let i = 0; i < BONFIRES.length; i++) {
    const b = BONFIRES[i];
    const dy = Math.abs(y - b.y);
    if (dy > 3.0) continue;
    const dx = x - b.x;
    const dz = z - b.z;
    if (dx * dx + dz * dz <= threshold * threshold) {
      return b;
    }
  }
  return null;
}

export function findNearCatacombGate(
  x: number,
  y: number,
  z: number,
  gateOpened: boolean,
): boolean {
  if (gateOpened) return false;
  if (Math.abs(y - WORLD.terraceY) > 2.5) return false;
  return x >= -14.2 && x <= -9.2 && z >= -116.0 && z <= -107.0;
}

export function findNearTunnelAstralDoor(
  x: number,
  y: number,
  z: number,
  gateOpened: boolean,
): boolean {
  if (!gateOpened) return false;
  if (Math.abs(y - -26.0) > 2.8) return false;
  return x >= -40.2 && x <= -32.8 && z >= -137.4 && z <= -131.5;
}

export function isNearBonfire(x: number, z: number, threshold = 4.6, y = 0): boolean {
  return findNearestBonfire(x, y, z, threshold) !== null;
}

export function isLethalFall(y: number): boolean {
  return y < WORLD.lethalFallY;
}
