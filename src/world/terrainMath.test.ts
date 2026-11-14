import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD,
  TOWER,
  HINTERLAND,
  ACADEMY,
  HAMLET,
  BONFIRES,
  ZONES,
  getWhisperingTrailX,
  getRiverCenterZ,
  getRiversideTrailZ,
  getSnowPassCenterZ,
  getLakeCausewayX,
  getWestViaductZ,
  getEastPromenadeZ,
  computeAcademyScale,
  getHinterlandGroundY,
  getFootbridgeY,
  sampleFloorHeight,
  resolveVerticalStep,
  getWalkableHeight,
  resolveObstacleCollisions,
  getZoneAtPosition,
  findNearestBonfire,
  findNearCatacombGate,
  isLethalFall,
} from './terrainMath';

test('spawn position is walkable, unobstructed, and inside sanctuary', () => {
  const h = sampleFloorHeight(WORLD.spawnPos.x, WORLD.spawnPos.y, WORLD.spawnPos.z);
  assert.equal(h, 0);
  assert.equal(getZoneAtPosition(WORLD.spawnPos.z, 0, 0), 'sanctuary');
});

test('upper pilgrimage path maintains continuous height from sanctuary to citadel', () => {
  let prevY = 0;
  for (let z = 8; z >= -202; z -= 0.5) {
    const h = sampleFloorHeight(0, prevY, z);
    assert.notEqual(h, null, `Centerline (0, ${z}) must have floor`);
    const stepDelta = Math.abs((h as number) - prevY);
    assert.ok(
      stepDelta < 0.35,
      `Height discontinuity at z=${z}: prev=${prevY.toFixed(3)}, curr=${(h as number).toFixed(3)}`,
    );
    prevY = h as number;
  }
  assert.equal(getWalkableHeight(0, -190), WORLD.courtyardY);
});

test('sprinting and jumping up and down staircases never clips through stairs', () => {
  // Stairway 3 (x: -1.5 -> 6.2, y: -14.0 -> -4.5)
  let x = -0.5;
  let y = -12.7;
  const z = -97.5;
  let velY = 8.4;
  let grounded = false;
  const dt = 0.025;

  for (let i = 0; i < 60 && x <= 6.0; i++) {
    const nextX = x + 10.6 * dt;
    const step = resolveVerticalStep({
      prevX: x,
      prevY: y,
      prevZ: z,
      nextX,
      nextZ: z,
      velY,
      grounded,
      dt,
    });
    x = nextX;
    y = step.y;
    velY = step.velY;
    grounded = step.grounded;
    const floor = sampleFloorHeight(x, y + 0.5, z, 0.8);
    assert.notEqual(floor, null, `Stairway 3 floor must exist at x=${x.toFixed(2)}`);
    assert.ok(
      y >= (floor as number) - 0.08,
      `Knight clipped through Stairway 3 at x=${x.toFixed(2)}`,
    );
    if (grounded) {
      velY = 8.4;
      grounded = false;
    }
  }

  // Lower Monumental Staircase (z: -50 -> -22)
  let sz = -49.0;
  let sy = 9.5;
  let sVelY = 8.4;
  let sGrounded = false;
  for (let i = 0; i < 120 && sz <= -23.0; i++) {
    const nextZ = sz + 10.6 * dt;
    const step = resolveVerticalStep({
      prevX: 0,
      prevY: sy,
      prevZ: sz,
      nextX: 0,
      nextZ,
      velY: sVelY,
      grounded: sGrounded,
      dt,
    });
    sz = nextZ;
    sy = step.y;
    sVelY = step.velY;
    sGrounded = step.grounded;
    const floor = sampleFloorHeight(0, sy + 1.5, sz, 1.5);
    assert.notEqual(floor, null, `Lower stair floor must exist at z=${sz.toFixed(2)}`);
    assert.ok(
      sy >= (floor as number) - 0.08,
      `Knight clipped through Lower Stair at z=${sz.toFixed(2)}`,
    );
    if (sGrounded) {
      sVelY = 8.4;
      sGrounded = false;
    }
  }
});

test('bridge edges have NO invisible barriers and falling past -35 triggers lethal fall', () => {
  const res = resolveObstacleCollisions(12, 10, -90);
  assert.equal(res.x, 12);
  assert.equal(sampleFloorHeight(12, 10, -90), null);
  assert.equal(isLethalFall(-34.9), false);
  assert.equal(isLethalFall(-35.1), true);
});

test('under-viaduct descending path reaches Sunken Catacomb Gate terrace continuously', () => {
  let y = sampleFloorHeight(6.5, 10.0, -56);
  assert.equal(y, 8.6);
  y = sampleFloorHeight(7.5, y!, -68);
  assert.ok(y !== null && y < 8.6 && y > 3.0);
  y = sampleFloorHeight(6.5, 3.2, -76);
  assert.equal(y, 3.0);
  y = sampleFloorHeight(7.5, y!, -86);
  assert.ok(y !== null && y < 3.0 && y > -4.5);
  y = sampleFloorHeight(7.8, -4.2, -94);
  assert.equal(y, -4.5);
  y = sampleFloorHeight(0, -11.0, -98);
  assert.ok(y !== null && y <= -11.0);
  y = sampleFloorHeight(-8.0, -13.5, -111);
  assert.equal(y, -14.0);
  assert.equal(getZoneAtPosition(-111, -14.0, -8.0), 'catacomb');

  assert.equal(findNearCatacombGate(-12.0, -14.0, -111.5, false), true);
  assert.equal(findNearCatacombGate(-12.0, -14.0, -111.5, true), false);

  const closedClamp = resolveObstacleCollisions(-20, -14.0, -111.5, 0.45, false);
  assert.ok(closedClamp.x >= WORLD.catacombDoorX);
});

test('opened catacomb gate allows descending subterranean tunnel to sealed inner crypt door', () => {
  const insideEntry = resolveObstacleCollisions(-18, -14.0, -111.5, 0.45, true);
  assert.equal(insideEntry.x, -18);
  assert.equal(getZoneAtPosition(-111.5, -14.0, -18), 'tunnel');
  assert.equal(ZONES.tunnel.title, 'CATACOMB DESCENT');

  let py = -14.0;
  for (let x = -14.0; x >= -36.5; x -= 0.5) {
    const h = sampleFloorHeight(x, py, -111.5);
    assert.notEqual(h, null);
    assert.ok(Math.abs((h as number) - py) < 0.35);
    py = h as number;
  }
  assert.equal(py, -19.0);

  for (let z = -111.5; z >= -135.5; z -= 0.5) {
    const h = sampleFloorHeight(-36.5, py, z);
    assert.notEqual(h, null);
    assert.ok(Math.abs((h as number) - py) < 0.35);
    py = h as number;
  }
  assert.equal(py, -26.0);

  const wallClamp = resolveObstacleCollisions(-45, -26.0, -133, 0.45, true);
  assert.ok(wallClamp.x >= -39.6);
  const innerDoorClamp = resolveObstacleCollisions(-36.5, -26.0, -142, 0.45, true);
  assert.ok(innerDoorClamp.z >= -136.5);
});

test('all 6 bonfire checkpoints detect Firelink, Sunken Terrace, Ashen Cloister, Moonlit Clearing, Ashenbrook Hamlet, and Academy Lake', () => {
  assert.equal(findNearestBonfire(1.5, 0, 1.5)?.id, BONFIRES[0].id);
  assert.equal(findNearestBonfire(-1.5, -14.0, -110.0)?.id, BONFIRES[1].id);
  assert.equal(findNearestBonfire(-13.8, TOWER.tier2Y, TOWER.cz)?.id, BONFIRES[2].id);
  assert.equal(
    findNearestBonfire(1.2, WORLD.hinterlandY, HINTERLAND.clearingCz + 1.5)?.id,
    BONFIRES[3].id,
  );
  assert.equal(
    findNearestBonfire(HAMLET.bonfireX + 1.5, HAMLET.hamletY, HAMLET.bonfireZ + 1.0)?.id,
    BONFIRES[4].id,
  );
  assert.equal(
    findNearestBonfire(ACADEMY.bonfireX - 2.0, ACADEMY.causewayY + 0.15, ACADEMY.bonfireZ + 1.5)?.id,
    BONFIRES[5].id,
  );
});

test('3-Tier Vertical Spiral Tower traverses smoothly through Sovereign Rotunda, Spiral Flights 1 & 2, Ashen Cloister, and Rear Gatehouse', () => {
  // Open outer gate enters Tier 1 Sovereign's Rotunda
  const gatePass = resolveObstacleCollisions(0, 18.0, -215, 0.45, false);
  assert.equal(gatePass.z, -215);
  assert.equal(getZoneAtPosition(-232, TOWER.tier1Y, 0), 'nave');
  assert.equal(ZONES.nave.title, 'HALL OF THE FALLEN SOVEREIGN');

  // Cylindrical tower outer wall (r = 17.5) and inner central shaft balustrade (r = 7.2) clamp cleanly on Tier 1
  const shaftClamp = resolveObstacleCollisions(0, TOWER.tier1Y, TOWER.cz, 0.45, false);
  assert.ok(Math.hypot(shaftClamp.x - TOWER.cx, shaftClamp.z - TOWER.cz) >= TOWER.shaftRadius + 0.44);
  const wallClamp = resolveObstacleCollisions(24, TOWER.tier1Y, TOWER.cz, 0.45, false);
  assert.ok(Math.hypot(wallClamp.x - TOWER.cx, wallClamp.z - TOWER.cz) <= TOWER.wallRadius - 0.44);

  // Flight 1 spiral descent (theta: +0.65 -> +0.65 - 2*PI, y: 18.0 -> 4.0) across +-PI branch cut
  const rMid = 14.3;
  let py: number = TOWER.tier1Y;
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const theta = TOWER.f1StartAng + t * (TOWER.f1EndAng - TOWER.f1StartAng);
    const sx = TOWER.cx + Math.cos(theta) * rMid;
    const sz = TOWER.cz + Math.sin(theta) * rMid;
    const h = sampleFloorHeight(sx, py, sz);
    assert.notEqual(h, null, `Flight 1 floor missing at t=${t.toFixed(2)}`);
    assert.ok(Math.abs((h as number) - py) < 0.45, `Flight 1 jump at t=${t.toFixed(2)}: ${py} -> ${h}`);
    py = h as number;
  }
  assert.ok(Math.abs(py - TOWER.tier2Y) < 0.05);

  // Tier 2 West Ashen Cloister Chapel & Bonfire zone
  assert.equal(getZoneAtPosition(TOWER.cz, TOWER.tier2Y, -16.0), 'cloister');
  assert.equal(sampleFloorHeight(-18.0, TOWER.tier2Y, TOWER.cz), TOWER.tier2Y);

  // Flight 2 spiral descent (theta: -0.35 -> -7.45, y: 4.0 -> -10.0) landing beside Rear Gatehouse
  py = TOWER.tier2Y;
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    const theta = TOWER.f2StartAng + t * (TOWER.f2EndAng - TOWER.f2StartAng);
    const sx = TOWER.cx + Math.cos(theta) * rMid;
    const sz = TOWER.cz + Math.sin(theta) * rMid;
    const h = sampleFloorHeight(sx, py, sz);
    assert.notEqual(h, null, `Flight 2 floor missing at t=${t.toFixed(2)}`);
    assert.ok(Math.abs((h as number) - py) < 0.45, `Flight 2 jump at t=${t.toFixed(2)}: ${py} -> ${h}`);
    py = h as number;
  }
  assert.ok(Math.abs(py - TOWER.tier3Y) < 0.05);

  // Tier 3 central shaft floor is solid (r=0, y=-10) to gaze 28m up the tower, leading north out Rear Gatehouse
  assert.equal(sampleFloorHeight(0, TOWER.tier3Y, TOWER.cz), TOWER.tier3Y);
  assert.equal(sampleFloorHeight(0, TOWER.tier3Y, -278), TOWER.tier3Y);
});

test('sprinting and jumping down Spiral Flight 1 and Spiral Flight 2 never clips through steps', () => {
  const rMid = 14.3;
  const dt = 0.025;

  // Sprint + jump down Flight 1
  let theta = TOWER.f1StartAng - 0.1;
  let x = TOWER.cx + Math.cos(theta) * rMid;
  let z = TOWER.cz + Math.sin(theta) * rMid;
  let y = TOWER.tier1Y - 0.2;
  let velY = 8.4;
  let grounded = false;
  const angularStep = (10.6 * dt) / rMid;

  for (let i = 0; i < 160 && theta >= TOWER.f1EndAng + 0.1; i++) {
    theta -= angularStep;
    const nextX = TOWER.cx + Math.cos(theta) * rMid;
    const nextZ = TOWER.cz + Math.sin(theta) * rMid;
    const step = resolveVerticalStep({
      prevX: x,
      prevY: y,
      prevZ: z,
      nextX,
      nextZ,
      velY,
      grounded,
      dt,
    });
    x = nextX;
    z = nextZ;
    y = step.y;
    velY = step.velY;
    grounded = step.grounded;

    const expected = TOWER.tier1Y + ((theta - TOWER.f1StartAng) / (TOWER.f1EndAng - TOWER.f1StartAng)) * (TOWER.tier2Y - TOWER.tier1Y);
    assert.ok(y >= expected - 0.12, `Clipped Flight 1 at theta=${theta.toFixed(2)}: y=${y.toFixed(2)} < ${expected.toFixed(2)}`);
    if (grounded) {
      velY = 8.4;
      grounded = false;
    }
  }

  // Sprint + jump down Flight 2
  theta = TOWER.f2StartAng - 0.1;
  x = TOWER.cx + Math.cos(theta) * rMid;
  z = TOWER.cz + Math.sin(theta) * rMid;
  y = TOWER.tier2Y - 0.2;
  velY = 8.4;
  grounded = false;
  for (let i = 0; i < 180 && theta >= TOWER.f2EndAng + 0.1; i++) {
    theta -= angularStep;
    const nextX = TOWER.cx + Math.cos(theta) * rMid;
    const nextZ = TOWER.cz + Math.sin(theta) * rMid;
    const step = resolveVerticalStep({
      prevX: x,
      prevY: y,
      prevZ: z,
      nextX,
      nextZ,
      velY,
      grounded,
      dt,
    });
    x = nextX;
    z = nextZ;
    y = step.y;
    velY = step.velY;
    grounded = step.grounded;

    const expected = TOWER.tier2Y + ((theta - TOWER.f2StartAng) / (TOWER.f2EndAng - TOWER.f2StartAng)) * (TOWER.tier3Y - TOWER.tier2Y);
    assert.ok(y >= expected - 0.12, `Clipped Flight 2 at theta=${theta.toFixed(2)}: y=${y.toFixed(2)} < ${expected.toFixed(2)}`);
    if (grounded) {
      velY = 8.4;
      grounded = false;
    }
  }
});

test('extended Misty Hinterland Woods connects Whispering Path, Moonlit Clearing, Moonlit River Bridge, Arcane Academy, and Fallen Knight Alcove', () => {
  // Rear Gatehouse steps -> extended undulating Whispering Path -> Moonlit Clearing (-480)
  let py: number = TOWER.tier3Y;
  for (let z = -284; z >= -476; z -= 0.5) {
    const tx = z <= -292 && z >= HINTERLAND.trailEndZ ? getWhisperingTrailX(z) : 0;
    const h = sampleFloorHeight(tx, py, z);
    assert.notEqual(h, null, `Whispering Path floor missing at (${tx.toFixed(2)}, ${z})`);
    assert.ok(Math.abs((h as number) - py) < 0.35);
    py = h as number;
  }
  assert.equal(py, WORLD.hinterlandY);
  assert.equal(getZoneAtPosition(-360, WORLD.hinterlandY, getWhisperingTrailX(-360)), 'hinterland');
  assert.equal(ZONES.hinterland.title, 'MISTY HINTERLAND WOODS');

  // Main Branch: Moonlit Clearing -> North Woods -> Arched River Bridge (-552..-582) -> Open Outer Gatehouse -> Academy Plaza (-602)
  for (let z = -494; z >= -601.5; z -= 0.5) {
    const h = sampleFloorHeight(0, py, z);
    assert.notEqual(h, null, `Main forest branch missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.35);
    py = h as number;
  }
  assert.ok(getFootbridgeY(-567) > HINTERLAND.riverWaterY + 3.0);
  const openOuterGateWalk = resolveObstacleCollisions(0, WORLD.hinterlandY, -596, 0.45, false);
  assert.equal(openOuterGateWalk.z, -596);
  assert.equal(getZoneAtPosition(-590, WORLD.hinterlandY, 0), 'academy-grounds');
  assert.equal(ZONES['academy-grounds'].title, 'SUNKEN ARCANE ACADEMY GROUNDS');

  // Hidden Side Alcove: East branch from Moonlit Clearing (-480) to Fallen Petrified Knight & Gravestone
  const alcoveWalk = resolveObstacleCollisions(26.0, WORLD.hinterlandY, -476.0, 0.45, false);
  assert.equal(alcoveWalk.x, 26.0);
  assert.equal(sampleFloorHeight(26.0, WORLD.hinterlandY, -476.0), WORLD.hinterlandY);
  const alcoveBoundary = resolveObstacleCollisions(45.0, WORLD.hinterlandY, -476.0, 0.45, false);
  assert.ok(alcoveBoundary.x <= 38.6);
});

test('Left-Hand Riverside Trail leads to Ashenbrook Hamlet and Snowy Pass Gate has zero cliff walk-around gap', () => {
  // River stays cleanly north of Academy Wall (z=-584) on east and north of Hamlet cottages (-564) on west
  assert.ok(getRiverCenterZ(0) > -570 && getRiverCenterZ(-100) > -570);
  assert.ok(getRiverCenterZ(-182) < -576);

  // Traverse Left-Hand Riverside Trail from south of bridge (x=-4) to Ashenbrook Hamlet (x=-162)
  let py = getHinterlandGroundY(-4, getRiversideTrailZ(-4));
  for (let x = -4; x >= -162; x -= 0.5) {
    const tz = getRiversideTrailZ(x);
    const h = sampleFloorHeight(x, py, tz);
    assert.notEqual(h, null, `Riverside trail floor missing at (${x}, ${tz.toFixed(2)})`);
    assert.ok(Math.abs((h as number) - py) < 0.35);
    py = h as number;
  }

  // Inside Ashenbrook Hamlet plateau
  assert.equal(getZoneAtPosition(HAMLET.hamletCz, HAMLET.hamletY, HAMLET.hamletCx), 'hamlet');
  assert.equal(ZONES.hamlet.title, 'ASHENBROOK HAMLET');
  assert.equal(sampleFloorHeight(HAMLET.hamletCx + 4, HAMLET.hamletY, HAMLET.hamletCz), HAMLET.hamletY);

  // Climb Snowy Valley Pass (-202 -> -252, y: -11.5 -> -3.2) and verify tight cliff fusion into Pass Gate piers
  py = HAMLET.hamletY;
  for (let x = -202; x >= HAMLET.passEndX; x -= 0.5) {
    const pz = getSnowPassCenterZ(x);
    const h = sampleFloorHeight(x, py, pz);
    assert.notEqual(h, null, `Snow pass floor missing at (${x}, ${pz.toFixed(2)})`);
    assert.ok(Math.abs((h as number) - py) < 0.35);
    py = h as number;
  }
  assert.ok(Math.abs(py - HAMLET.passEndY) < 0.05);
  assert.equal(getZoneAtPosition(getSnowPassCenterZ(-235), py, -235), 'hamlet');

  const gateZ = getSnowPassCenterZ(HAMLET.passEndX);
  const passGateStop = resolveObstacleCollisions(-260, HAMLET.passEndY, gateZ, 0.45, false);
  assert.ok(passGateStop.x >= HAMLET.passEndX);
  // Trying to walk around either side of the Snowy Pass Gate pier is tightly clamped inside the gate width
  const sideGapAttempt = resolveObstacleCollisions(HAMLET.passEndX, HAMLET.passEndY, gateZ + 7.0, 0.45, false);
  assert.ok(Math.abs(sideGapAttempt.z - gateZ) < 4.0);
});

test('Flooded Academy Lake Causeway, Grand Stairway, and 2.6x->1.0x Dynamic Scale Illusion behave seamlessly', () => {
  // Dynamic forced-perspective scale curve
  assert.equal(computeAcademyScale(240), 2.6);
  assert.equal(computeAcademyScale(220), 2.6);
  const midScale = computeAcademyScale(132.5);
  assert.ok(midScale > 1.75 && midScale < 1.85, `Expected ~1.8 at midpoint, got ${midScale}`);
  assert.equal(computeAcademyScale(45), 1.0);
  assert.equal(computeAcademyScale(0), 1.0);

  // Continuous walk from Outer Plaza (-602) -> Gate Steps -> Lake Causeway -> Mid-Lake Bonfire Island -> Cathedral Doors (-896)
  let py: number = WORLD.hinterlandY;
  for (let z = -602; z >= ACADEMY.cathedralDoorZ + 1.0; z -= 0.5) {
    const cx = getLakeCausewayX(z);
    const h = sampleFloorHeight(cx, py, z);
    assert.notEqual(h, null, `Academy causeway/stair floor missing at (${cx.toFixed(2)}, ${z})`);
    assert.ok(
      Math.abs((h as number) - py) < 0.42,
      `Height jump along Academy route at z=${z}: ${py.toFixed(2)} -> ${(h as number).toFixed(2)}`,
    );
    py = h as number;
  }
  assert.ok(Math.abs(py - ACADEMY.forecourtY) < 0.05);
  assert.equal(getZoneAtPosition(-885, ACADEMY.forecourtY, 0), 'academy-grounds');

  // Sealed Grand Cathedral Doors stop player cleanly at forecourtEndZ (-906)
  const doorStop = resolveObstacleCollisions(0, ACADEMY.forecourtY, -920, 0.45, false);
  assert.ok(doorStop.z >= ACADEMY.cathedralDoorZ);
});

test('Three-Way Academy Causeway Network (14m Central, West Cloister Viaduct, East Harbor Bastion) and Switchback Stairs connect continuously', () => {
  // 1. Central 14m causeway width & open Outer Water-Gatehouse center passage
  const edgeRight = resolveObstacleCollisions(6.2, ACADEMY.causewayY, -638, 0.45, false);
  assert.equal(edgeRight.x, 6.2);
  const waterGateClear = resolveObstacleCollisions(
    getLakeCausewayX(ACADEMY.waterGateZ),
    ACADEMY.causewayY,
    ACADEMY.waterGateZ,
    0.45,
    false,
  );
  assert.equal(waterGateClear.z, ACADEMY.waterGateZ);

  // 2. West Wing: Junction (4, -740) -> Curved Viaduct -> West Cloister Courtyard -> Ascent Stair -> Perimeter -> Forecourt
  let py: number = ACADEMY.causewayY;
  for (let x = 4; x >= -92; x -= 1.0) {
    const vz = getWestViaductZ(x);
    const h = sampleFloorHeight(x, py, vz);
    assert.notEqual(h, null, `West Viaduct missing at x=${x}`);
    assert.ok(Math.abs((h as number) - py) < 0.35);
    py = h as number;
  }
  assert.ok(Math.abs(py - ACADEMY.westCloisterY) < 0.05);

  for (let z = -760; z >= -844; z -= 1.0) {
    const h = sampleFloorHeight(-106, py, z);
    assert.notEqual(h, null, `West Cloister / Ascent stair missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.4);
    py = h as number;
  }
  assert.ok(Math.abs(py - ACADEMY.midLandingY) < 0.05);

  for (let z = -852; z >= -874; z -= 0.5) {
    const h = sampleFloorHeight(-59, py, z);
    assert.notEqual(h, null, `West Upper Wing stair missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.35);
    py = h as number;
  }
  assert.ok(Math.abs(py - ACADEMY.forecourtY) < 0.05);

  // 3. East Wing: Junction (8, -740) -> Promenade -> Harbor Rotunda -> Stepped Docks & Sky-Bridge -> Forecourt
  py = ACADEMY.causewayY;
  for (let x = 8; x <= 94; x += 1.0) {
    const pz = getEastPromenadeZ(x);
    const h = sampleFloorHeight(x, py, pz);
    assert.notEqual(h, null, `East Promenade missing at x=${x}`);
    assert.ok(Math.abs((h as number) - py) < 0.35);
    py = h as number;
  }
  assert.ok(Math.abs(py - ACADEMY.eastBastionY) < 0.05);

  // Stepped Harbor Dock descent
  const dockLow = sampleFloorHeight(120, -13.5, -745);
  assert.ok(dockLow !== null && dockLow < ACADEMY.eastBastionY && dockLow > ACADEMY.lakeWaterY);

  // Sky-Bridge up to Academy East Rampart -> East Upper Wing Stair -> Forecourt
  for (let z = -810; z >= -844; z -= 1.0) {
    const h = sampleFloorHeight(112, py, z);
    assert.notEqual(h, null, `East Sky-Bridge missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.4);
    py = h as number;
  }
  assert.ok(Math.abs(py - ACADEMY.midLandingY) < 0.05);

  for (let z = -852; z >= -874; z -= 0.5) {
    const h = sampleFloorHeight(59, py, z);
    assert.notEqual(h, null, `East Upper Wing stair missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.35);
    py = h as number;
  }
  assert.ok(Math.abs(py - ACADEMY.forecourtY) < 0.05);

  // 4. Eastern Harbor Watchtower solid collider blocks center while leaving perimeter walkable
  const towerPush = resolveObstacleCollisions(138, ACADEMY.eastBastionY, -784, 0.45, false);
  assert.ok(Math.hypot(towerPush.x - 138, towerPush.z - (-784)) >= 7.8);
});
