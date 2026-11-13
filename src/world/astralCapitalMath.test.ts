import test from 'node:test';
import assert from 'node:assert/strict';
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
import { findNearTunnelAstralDoor } from './terrainMath';

test('Astral Royal Capital meets >=900m x 900m footprint and >220m vertical elevation span', () => {
  assert.ok(ASTRAL.maxX - ASTRAL.minX >= 900, 'Horizontal X span must be >= 900m');
  assert.ok(ASTRAL.maxZ - ASTRAL.minZ >= 900, 'Horizontal Z span must be >= 900m');
  assert.ok(ASTRAL.maxPeakY - ASTRAL.waterY > 220, 'Vertical elevation span must exceed 220m');
});

test('Grand Arrival Balcony spawn and Return Gate behind spawn behave accurately', () => {
  const spawnY = sampleAstralFloorHeight(ASTRAL.spawnPos.x, ASTRAL.spawnPos.y, ASTRAL.spawnPos.z);
  assert.equal(spawnY, ASTRAL.balconyY);
  assert.equal(getAstralZoneAtPosition(ASTRAL.spawnPos.z, ASTRAL.balconyY), 'astral-sanctuary');

  assert.equal(findNearAstralReturnGate(0, ASTRAL.balconyY, 128), true);
  assert.equal(findNearAstralReturnGate(0, ASTRAL.balconyY, 110), false);

  // Overworld basement crypt door trigger only activates when outer catacomb gate is open
  assert.equal(findNearTunnelAstralDoor(-36.5, -26.0, -134.5, false), false);
  assert.equal(findNearTunnelAstralDoor(-36.5, -26.0, -134.5, true), true);
  assert.equal(findNearTunnelAstralDoor(-36.5, -19.0, -111.5, true), false);
});

test('Continuous traversal from Grand Arrival Balcony (y=152) down through all 3 tiers to Nokron Temple (y=14)', () => {
  let py: number = ASTRAL.balconyY;
  for (let z = 110; z >= -480; z -= 0.5) {
    const h = sampleAstralFloorHeight(0, py, z);
    assert.notEqual(h, null, `Astral spine floor missing at z=${z}`);
    const stepDelta = Math.abs((h as number) - py);
    assert.ok(
      stepDelta < 0.45,
      `Discontinuity along Astral spine at z=${z}: prev=${py.toFixed(2)}, curr=${(h as number).toFixed(2)}`,
    );
    py = h as number;
  }
  assert.equal(py, ASTRAL.nokronTempleY);
  assert.equal(getAstralZoneAtPosition(-145, ASTRAL.sprawlPlazaY), 'astral-sprawl');
  assert.equal(getAstralZoneAtPosition(-352, ASTRAL.aqueductDeckY), 'astral-aqueduct');
});

test('West Sanctuary Cathedral steps and East Petrified Dragon Wing-Ramp are continuously walkable', () => {
  // Climb West Sanctuary Steps (x: -32 -> -64, z = -40, y: 114 -> 128)
  let py: number = ASTRAL.sanctuaryPlazaY;
  for (let x = -32; x >= -66; x -= 0.5) {
    const h = sampleAstralFloorHeight(x, py, -40);
    assert.notEqual(h, null, `Sanctuary steps missing at x=${x}`);
    assert.ok(Math.abs((h as number) - py) < 0.45);
    py = h as number;
  }
  assert.equal(py, ASTRAL.sanctuarySidePorchY);

  // Climb East Petrified Dragon Wing-Ramp (x: 34 -> 100, z = -142, y: 78 -> 98)
  py = ASTRAL.sprawlPlazaY;
  for (let x = 34; x <= 104; x += 0.5) {
    const h = sampleAstralFloorHeight(x, py, -142);
    assert.notEqual(h, null, `Dragon wing ramp missing at x=${x}`);
    assert.ok(Math.abs((h as number) - py) < 0.45);
    py = h as number;
  }
  assert.equal(py, ASTRAL.dragonWingY);

  // Cross-Basin Two-Tier Nokron Aqueduct Bridge (x: -175..175, z = -352, y = 26)
  for (let x = -175; x <= 175; x += 25) {
    assert.equal(sampleAstralFloorHeight(x, ASTRAL.aqueductDeckY, -352), ASTRAL.aqueductDeckY);
  }
});

test('Sprinting and jumping along Astral staircases never clips through floors and Grace beacons detect properly', () => {
  let z = 92;
  let y: number = ASTRAL.balconyY;
  let velY = 8.4;
  let grounded = false;
  const dt = 0.025;

  for (let i = 0; i < 120 && z >= 56; i++) {
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

  // Obstacle & back wall colliders + grace beacons
  const backClamp = resolveAstralObstacleCollisions(0, ASTRAL.balconyY, 145, 0.45);
  assert.ok(backClamp.z <= 133.5);
  assert.equal(isAstralLethalFall(ASTRAL.lethalFallY - 0.5), true);

  for (const g of ASTRAL_GRACE_SITES) {
    assert.equal(findNearestAstralGrace(g.x + 1.5, g.y, g.z + 1.5)?.id, g.id);
  }
});
