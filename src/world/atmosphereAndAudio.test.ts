import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASTRAL_DRONE_FREQS,
  BIOME_ATMOSPHERES,
  OVERWORLD_DRONE_FREQS,
  computeWindModulation,
  selectBiomeAtmosphere,
  selectDroneChord,
  wrapParticleAxis,
} from './atmosphereAndAudio';

test('selectBiomeAtmosphere returns exact Astral Royal Sanctuary and Sunken Academy presets', () => {
  const astral = selectBiomeAtmosphere('astral', 0, 152, 120, false);
  assert.equal(astral.key, 'astral');
  assert.equal(astral.fogHex, 0x13112b);
  assert.equal(astral.fogDensity, 0.0014);
  assert.equal(astral.sunHex, 0xd8e2ff);
  assert.equal(astral.rimHex, 0xffaa44);

  const academy = selectBiomeAtmosphere('overworld', 0, -14, -760, false);
  assert.equal(academy.key, 'academy');
  assert.equal(academy.fogHex, 0x122633);
  assert.equal(academy.fogDensity, 0.0022);
  assert.equal(academy.sunHex, 0x9fd8ff);
  assert.equal(academy.rimHex, 0xffbe55);
  assert.equal(BIOME_ATMOSPHERES.astral.sunIntensity, 1.85);
});

test('selectBiomeAtmosphere reduces fog density in aerial free-cam override', () => {
  const aerial = selectBiomeAtmosphere('overworld', 0, 118, -305, true);
  assert.equal(aerial.fogDensity, 0.0008);
});

test('wrapParticleAxis keeps all particles strictly within [-radius, +radius] of player', () => {
  const r = 45;
  assert.ok(Math.abs(wrapParticleAxis(102, 50, r) - 50) <= r);
  assert.ok(Math.abs(wrapParticleAxis(-12, 50, r) - 50) <= r);
  assert.equal(wrapParticleAxis(70, 50, r), 70);
});

test('computeWindModulation increases wind gain and cutoff on sprint, jump, and high bridges', () => {
  const idle = computeWindModulation({
    speed: 0,
    grounded: true,
    elevationY: 0,
    isSprinting: false,
    realm: 'overworld',
  });
  const sprintBridge = computeWindModulation({
    speed: 10.6,
    grounded: true,
    elevationY: 152,
    isSprinting: true,
    realm: 'astral',
  });
  const airborne = computeWindModulation({
    speed: 6,
    grounded: false,
    elevationY: 152,
    isSprinting: false,
    realm: 'astral',
  });

  assert.ok(sprintBridge.gain > idle.gain);
  assert.ok(sprintBridge.lowFreqHz > idle.lowFreqHz);
  assert.ok(airborne.gain > idle.gain);
  assert.ok(airborne.highFreqHz > idle.highFreqHz);
});

test('selectDroneChord matches Astral minor-9th and Academy Lydian/Dorian voicings', () => {
  assert.deepEqual(selectDroneChord('astral', 'astral-sanctuary'), ASTRAL_DRONE_FREQS);
  assert.deepEqual(selectDroneChord('overworld', 'academy-grounds'), OVERWORLD_DRONE_FREQS);
});
