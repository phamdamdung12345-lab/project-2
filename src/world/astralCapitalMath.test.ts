import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASTRAL,
  ASTRAL_GRACE_SITES,
  sampleIslandTerrainY,
  sampleAstralFloorHeight,
  resolveAstralVerticalStep,
  resolveAstralObstacleCollisions,
  getAstralZoneAtPosition,
  findNearestAstralGrace,
  findNearAstralReturnGate,
  isAstralLethalFall,
} from './astralCapitalMath';
import { findNearTunnelAstralDoor } from './terrainMath';

test('Astral Royal Capital meets >=900m x 900m footprint, >220m elevation span, and island/channel topography', () => {
  assert.ok(ASTRAL.maxX - ASTRAL.minX >= 900, 'Horizontal X span must be >= 900m');
  assert.ok(ASTRAL.maxZ - ASTRAL.minZ >= 900, 'Horizontal Z span must be >= 900m');
  assert.ok(ASTRAL.maxPeakY - ASTRAL.waterY > 220, 'Vertical elevation span must exceed 220m');

  // Main island plateau, citadel peak, ocean channel, and dark fortress headland heights
  assert.ok(sampleIslandTerrainY(-60, -30) > 65, 'Golden city plateau must sit solidly above ocean');
  assert.ok(sampleIslandTerrainY(0, -178) > 105, 'Royal Citadel peak must support y=114 terrace');
  assert.ok(sampleIslandTerrainY(104, -155) < 0, 'Ocean channel under bridge must dip below sea level');
  assert.ok(sampleIslandTerrainY(196, -155) > 105, 'Dark Stone Fortress headland must rise out of ocean');
});

test('Grand Arrival Balcony spawn, West alcove Return Gate, and open South Promenade behave accurately', () => {
  const spawnY = sampleAstralFloorHeight(ASTRAL.spawnPos.x, ASTRAL.spawnPos.y, ASTRAL.spawnPos.z);
  assert.equal(spawnY, ASTRAL.balconyY);
  assert.equal(getAstralZoneAtPosition(ASTRAL.spawnPos.z, ASTRAL.balconyY), 'astral-sanctuary');

  // Return Gate moved to West alcove (-15.5, 152, 116) leaving south passage (x=0, z=134+) open
  assert.equal(findNearAstralReturnGate(-15.5, ASTRAL.balconyY, 116), true);
  assert.equal(findNearAstralReturnGate(0, ASTRAL.balconyY, 128), false);
  assert.equal(findNearAstralReturnGate(0, ASTRAL.balconyY, 110), false);

  assert.equal(findNearTunnelAstralDoor(-36.5, -26.0, -134.5, false), false);
  assert.equal(findNearTunnelAstralDoor(-36.5, -26.0, -134.5, true), true);
  assert.equal(findNearTunnelAstralDoor(-36.5, -19.0, -111.5, true), false);
});

test('360-degree exploration: Rear Royal Plaza & Overlook behind spawn (z: 97 -> 420)', () => {
  let py: number = ASTRAL.balconyY;
  for (let z = 97; z <= 420; z += 0.5) {
    const h = sampleAstralFloorHeight(0, py, z);
    assert.notEqual(h, null, `Rear Royal Promenade floor missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.2);
    py = h as number;
  }
  assert.equal(py, ASTRAL.rearPlazaY);

  // Walking behind spawn through Triumphal Arch is unobstructed (no invisible z=130.5 wall!)
  const behindArch = resolveAstralObstacleCollisions(0, ASTRAL.balconyY, 158, 0.45);
  assert.equal(behindArch.x, 0);
  assert.equal(behindArch.z, 158);
});

test('West & East High Sky-Viaducts connect to Outer Wards, Harbors, Sea-Aqueduct & East Fortress South Gate', () => {
  // 1. West High Sky-Viaduct (x: 0 -> -204 at z=109, y=152) -> Switchback Stair (z: 96 -> 14, y: 152->78)
  let py: number = ASTRAL.balconyY;
  for (let x = 0; x >= -204; x -= 0.5) {
    const h = sampleAstralFloorHeight(x, py, 109);
    assert.notEqual(h, null, `West Sky-Viaduct missing at x=${x}`);
    assert.ok(Math.abs((h as number) - py) < 0.25);
    py = h as number;
  }
  assert.equal(py, ASTRAL.balconyY);

  for (let z = 96; z >= 14; z -= 0.5) {
    const h = sampleAstralFloorHeight(-203, py, z);
    assert.notEqual(h, null, `West Switchback Stair missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.6);
    py = h as number;
  }
  assert.equal(py, ASTRAL.wardPlazaY);

  // 2. West Ward Plaza (z: 14 -> -96) -> West Coastal Stair -> West Harbor (y=26) -> Cross-Basin Sea-Aqueduct -> East Harbor Pier
  for (let z = 14; z >= -96; z -= 0.5) {
    const h = sampleAstralFloorHeight(-195, py, z);
    assert.notEqual(h, null, `West Ward missing at z=${z}`);
    py = h as number;
  }
  for (let z = -96; z >= -196; z -= 0.5) {
    const h = sampleAstralFloorHeight(-195, py, z);
    assert.notEqual(h, null, `West Coastal Descent missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.45);
    py = h as number;
  }
  assert.equal(py, ASTRAL.aqueductDeckY);

  for (let z = -196; z >= -352; z -= 0.5) {
    const h = sampleAstralFloorHeight(-170, py, z);
    assert.notEqual(h, null, `West Harbor Dock missing at z=${z}`);
    py = h as number;
  }
  // Traverse entire Cross-Basin Sea-Aqueduct continuously from West Harbor (-170) to East Harbor (+190) — ZERO dead ends!
  for (let x = -170; x <= 190; x += 0.5) {
    const h = sampleAstralFloorHeight(x, py, -352);
    assert.notEqual(h, null, `Cross-Basin Sea-Aqueduct gap at x=${x}`);
    assert.equal(h, ASTRAL.aqueductDeckY);
    py = h as number;
  }

  // 3. East Harbor Ramp -> East Outer Ward (y=78) -> East Fortress South Gate Stair (y=78 -> 114)
  for (let z = -280; z <= -80; z += 0.5) {
    const h = sampleAstralFloorHeight(236, py, z);
    assert.notEqual(h, null, `East Harbor Coastal Promenade missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.45);
    py = h as number;
  }
  assert.equal(py, ASTRAL.wardPlazaY);

  for (let z = -80; z >= -124; z -= 0.5) {
    const h = sampleAstralFloorHeight(188, py, z);
    assert.notEqual(h, null, `East Fortress South Stair missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.55);
    py = h as number;
  }
  assert.equal(py, ASTRAL.fortressCourtyardY);
});

test('Unobstructed traversal from Balcony (y=152) -> Lower City Plaza (y=78) -> Royal Citadel Terrace (y=114)', () => {
  let py: number = ASTRAL.balconyY;
  for (let z = 110; z >= -155; z -= 0.5) {
    const h = sampleAstralFloorHeight(0, py, z);
    assert.notEqual(h, null, `Astral grand spine floor missing at z=${z}`);
    const stepDelta = Math.abs((h as number) - py);
    assert.ok(
      stepDelta < 0.45,
      `Discontinuity along Astral spine at z=${z}: prev=${py.toFixed(2)}, curr=${(h as number).toFixed(2)}`,
    );
    py = h as number;
  }
  assert.equal(py, ASTRAL.citadelTerraceY);
  assert.equal(getAstralZoneAtPosition(-42, ASTRAL.cityPlazaY, 0), 'astral-sprawl');
  assert.equal(getAstralZoneAtPosition(-155, ASTRAL.citadelTerraceY, 0), 'astral-sanctuary');
});

test('Monumental Multi-Arched Bridge connects Royal Citadel to Dark Stone Fortress & West Path reaches Sea Sanctum', () => {
  // Cross Monumental Stone Bridge (x: 0 -> 210, z = -155, y = 114)
  let py: number = ASTRAL.citadelTerraceY;
  for (let x = 0; x <= 210; x += 0.5) {
    const h = sampleAstralFloorHeight(x, py, -155);
    assert.notEqual(h, null, `Monumental bridge/courtyard missing at x=${x}`);
    assert.ok(Math.abs((h as number) - py) < 0.45);
    py = h as number;
  }
  assert.equal(py, ASTRAL.fortressCourtyardY);
  assert.equal(getAstralZoneAtPosition(-155, ASTRAL.fortressCourtyardY, 190), 'astral-sprawl');

  // West Coastal Descent from Royal Citadel Terrace (-54 -> -110) down to Sea-Aqueduct & Sanctum
  py = ASTRAL.citadelTerraceY;
  for (let x = -54; x >= -110; x -= 0.5) {
    const h = sampleAstralFloorHeight(x, py, -155);
    assert.notEqual(h, null, `West terrace ramp missing at x=${x}`);
    assert.ok(Math.abs((h as number) - py) < 0.45);
    py = h as number;
  }
  assert.equal(py, ASTRAL.westGardenY);

  for (let z = -155; z >= -260; z -= 0.5) {
    const h = sampleAstralFloorHeight(-110, py, z);
    assert.notEqual(h, null, `West cliff stair A missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.45);
    py = h as number;
  }
  assert.equal(py, ASTRAL.aqueductMidY);

  for (let x = -110; x <= -9; x += 0.5) {
    const h = sampleAstralFloorHeight(x, py, -260);
    assert.notEqual(h, null);
    py = h as number;
  }
  for (let z = -260; z >= -460; z -= 0.5) {
    const h = sampleAstralFloorHeight(-5, py, z);
    assert.notEqual(h, null, `Coastal stair B / aqueduct causeway / harbor missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.45);
    py = h as number;
  }
  assert.equal(py, ASTRAL.shrineHarborY);

  // Tidal Harbor Courtyard -> Winding Pilgrimage Stair I (x=25) -> Mid Cloister Terrace (y=38)
  for (let x = -5; x <= 25; x += 0.5) {
    const h = sampleAstralFloorHeight(x, py, -460);
    assert.notEqual(h, null);
    py = h as number;
  }
  for (let z = -460; z >= -540; z -= 0.5) {
    const h = sampleAstralFloorHeight(25, py, z);
    assert.notEqual(h, null, `Pilgrimage stair I missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.45);
    py = h as number;
  }
  assert.equal(py, ASTRAL.shrineCloisterY);

  // Cloister Loggia Terrace -> Winding Pilgrimage Stair II (x=-25) -> Abbey Forecourt Summit (y=58)
  for (let x = 25; x >= -25; x -= 0.5) {
    const h = sampleAstralFloorHeight(x, py, -540);
    assert.notEqual(h, null);
    py = h as number;
  }
  for (let z = -540; z >= -622; z -= 0.5) {
    const h = sampleAstralFloorHeight(-25, py, z);
    assert.notEqual(h, null, `Pilgrimage stair II missing at z=${z}`);
    assert.ok(Math.abs((h as number) - py) < 0.45);
    py = h as number;
  }
  assert.equal(py, ASTRAL.shrineSummitY);
  assert.equal(getAstralZoneAtPosition(-352, ASTRAL.aqueductDeckY, 0), 'astral-aqueduct');
  assert.equal(getAstralZoneAtPosition(-622, ASTRAL.shrineSummitY, 0), 'astral-aqueduct');

  // Verify terrain NEVER pokes through Coastal Stair A, Overlook, Stair B, or Sea Sanctuary floors!
  for (let z = -180; z >= -342; z -= 4) {
    for (const x of [-111, -105, -9, -4]) {
      const floorH = sampleAstralFloorHeight(x, ASTRAL.westGardenY + 2, z, 60);
      if (floorH !== null) {
        const terrY = sampleIslandTerrainY(x, z);
        assert.ok(
          terrY < floorH - 1.5,
          `Terrain ${terrY.toFixed(2)} pokes through staircase/landing ${floorH.toFixed(2)} at (${x}, ${z})`,
        );
      }
    }
  }
  for (let z = -440; z >= -650; z -= 4) {
    for (let x = -34; x <= 34; x += 10) {
      const floorH = sampleAstralFloorHeight(x, ASTRAL.shrineSummitY + 2, z, 60);
      if (floorH !== null) {
        const terrY = sampleIslandTerrainY(x, z);
        assert.ok(
          terrY < floorH - 0.5,
          `Terrain ${terrY.toFixed(2)} bleeds through Sea Sanctuary floor ${floorH.toFixed(2)} at (${x}, ${z})`,
        );
      }
    }
  }
});

test('Sprinting and jumping along Astral staircases never clips through floors and Grace beacons detect properly', () => {
  let z = 92;
  let y: number = ASTRAL.balconyY;
  let velY = 8.4;
  let grounded = false;
  const dt = 0.025;

  for (let i = 0; i < 160 && z >= -6; i++) {
    const nextZ = z - 10.6 * dt;
    const step = resolveAstralVerticalStep({
      prevX: 0,
      prevY: y,
      prevZ: z,
      nextX: 0,
      nextZ,
      velY,
      grounded,
      dt,
    });
    z = nextZ;
    y = step.y;
    velY = step.velY;
    grounded = step.grounded;

    const floor = sampleAstralFloorHeight(0, y + 0.8, z, 1.5);
    assert.notEqual(floor, null);
    assert.ok(y >= (floor as number) - 0.1);
    if (grounded) {
      velY = 8.4;
      grounded = false;
    }
  }

  assert.equal(isAstralLethalFall(ASTRAL.lethalFallY - 0.5), true);

  for (const g of ASTRAL_GRACE_SITES) {
    assert.equal(findNearestAstralGrace(g.x + 1.5, g.y, g.z + 1.5)?.id, g.id);
  }
});
