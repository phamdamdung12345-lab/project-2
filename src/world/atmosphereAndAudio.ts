import type { ZoneId } from './terrainMath';

export type BiomeAtmosphereKey =
  | 'astral'
  | 'academy'
  | 'river-approach'
  | 'hinterland'
  | 'hamlet'
  | 'snowpass'
  | 'cloister'
  | 'twilight';

export interface BiomeAtmospherePreset {
  key: BiomeAtmosphereKey;
  fogHex: number;
  fogDensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  sunHex: number;
  sunIntensity: number;
  rimHex: number;
  rimIntensity: number;
  particleHex: number;
}

export const BIOME_ATMOSPHERES: Record<BiomeAtmosphereKey, BiomeAtmospherePreset> = {
  astral: {
    key: 'astral',
    fogHex: 0x13112b,
    fogDensity: 0.0014,
    hemiSkyHex: 0x738ad4,
    hemiGroundHex: 0x261c3d,
    hemiIntensity: 1.02,
    sunHex: 0xd8e2ff,
    sunIntensity: 1.85,
    rimHex: 0xffaa44,
    rimIntensity: 1.15,
    particleHex: 0xffcf6e, // Golden star-dust embers
  },
  academy: {
    key: 'academy',
    fogHex: 0x122633,
    fogDensity: 0.0022,
    hemiSkyHex: 0x628fb2,
    hemiGroundHex: 0x182530,
    hemiIntensity: 0.88,
    sunHex: 0x9fd8ff,
    sunIntensity: 1.85,
    rimHex: 0xffbe55,
    rimIntensity: 0.95,
    particleHex: 0xb6ecff, // Pale blue-white glintstone spores
  },
  'river-approach': {
    key: 'river-approach',
    fogHex: 0x223d4c,
    fogDensity: 0.0052,
    hemiSkyHex: 0x6a8ea6,
    hemiGroundHex: 0x212f36,
    hemiIntensity: 0.92,
    sunHex: 0xaad4ee,
    sunIntensity: 1.55,
    rimHex: 0xf4b668,
    rimIntensity: 0.8,
    particleHex: 0xb8e6fa,
  },
  hinterland: {
    key: 'hinterland',
    fogHex: 0x324b58,
    fogDensity: 0.0125,
    hemiSkyHex: 0x6c8ca0,
    hemiGroundHex: 0x283333,
    hemiIntensity: 0.9,
    sunHex: 0xb8d4e4,
    sunIntensity: 1.35,
    rimHex: 0xe6ad66,
    rimIntensity: 0.72,
    particleHex: 0xc8ebff,
  },
  hamlet: {
    key: 'hamlet',
    fogHex: 0x3b515c,
    fogDensity: 0.0135,
    hemiSkyHex: 0x7694a8,
    hemiGroundHex: 0x2f2b26,
    hemiIntensity: 0.92,
    sunHex: 0xc2d8e6,
    sunIntensity: 1.35,
    rimHex: 0xf4ae5c,
    rimIntensity: 0.78,
    particleHex: 0xd8edff,
  },
  snowpass: {
    key: 'snowpass',
    fogHex: 0x627785,
    fogDensity: 0.0155,
    hemiSkyHex: 0x96aec2,
    hemiGroundHex: 0x4b5661,
    hemiIntensity: 1.05,
    sunHex: 0xdbe9f5,
    sunIntensity: 1.55,
    rimHex: 0xffca85,
    rimIntensity: 0.72,
    particleHex: 0xe8f6ff,
  },
  cloister: {
    key: 'cloister',
    fogHex: 0x2f2c2b,
    fogDensity: 0.0085,
    hemiSkyHex: 0x6a7890,
    hemiGroundHex: 0x26201b,
    hemiIntensity: 0.68,
    sunHex: 0xe4c28e,
    sunIntensity: 0.75,
    rimHex: 0x8ea8d4,
    rimIntensity: 0.6,
    particleHex: 0xf7d89c,
  },
  twilight: {
    key: 'twilight',
    fogHex: 0x6d5a45,
    fogDensity: 0.004,
    hemiSkyHex: 0x7e97bd,
    hemiGroundHex: 0x382a1f,
    hemiIntensity: 1.02,
    sunHex: 0xffc175,
    sunIntensity: 1.85,
    rimHex: 0x9fb5d9,
    rimIntensity: 0.72,
    particleHex: 0xffd788,
  },
};

export function selectBiomeAtmosphere(
  realm: 'overworld' | 'astral',
  posX: number,
  posY: number,
  posZ: number,
  freeCamAerial: boolean,
): BiomeAtmospherePreset {
  let preset: BiomeAtmospherePreset;
  if (realm === 'astral') {
    preset = BIOME_ATMOSPHERES.astral;
  } else if (posZ <= -274.0 && (posY < -0.5 || posZ <= -584.0)) {
    if (posX <= -205.0) {
      preset = BIOME_ATMOSPHERES.snowpass;
    } else if (posX <= -145.0) {
      preset = BIOME_ATMOSPHERES.hamlet;
    } else if (posZ <= -584.0) {
      preset = BIOME_ATMOSPHERES.academy;
    } else if (posZ <= -525.0) {
      preset = BIOME_ATMOSPHERES['river-approach'];
    } else {
      preset = BIOME_ATMOSPHERES.hinterland;
    }
  } else if (posZ <= -224.0 && posZ > -274.0 && posY <= 9.5) {
    preset = BIOME_ATMOSPHERES.cloister;
  } else {
    preset = BIOME_ATMOSPHERES.twilight;
  }

  if (freeCamAerial) {
    return {
      ...preset,
      fogDensity: Math.min(preset.fogDensity, 0.0008),
    };
  }
  return preset;
}

export function wrapParticleAxis(value: number, center: number, radius: number): number {
  const span = radius * 2;
  let rel = value - center;
  if (rel > radius) {
    rel = ((rel + radius) % span) - radius;
  } else if (rel < -radius) {
    rel = span - ((-rel - radius) % span) - radius;
  }
  return center + rel;
}

export interface WindModulation {
  gain: number;
  lowFreqHz: number;
  highFreqHz: number;
}

export function computeWindModulation(params: {
  speed: number;
  grounded: boolean;
  elevationY: number;
  isSprinting: boolean;
  realm: 'overworld' | 'astral';
}): WindModulation {
  const speedNorm = Math.min(1, Math.max(0, params.speed / 11.0));
  const elevBase = params.realm === 'astral' ? Math.max(0, (params.elevationY - 40) / 115) : Math.max(0, (params.elevationY - 10) / 35);
  const elevFactor = Math.min(1, elevBase);
  const airBonus = params.grounded ? 0 : 0.28;
  const sprintBonus = params.isSprinting ? 0.16 : 0;

  const gain = Math.min(0.32, 0.055 + elevFactor * 0.095 + speedNorm * 0.065 + airBonus * 0.18 + sprintBonus * 0.12);
  const lowFreqHz = 175 + elevFactor * 145 + speedNorm * 95 + (params.grounded ? 0 : 65);
  const highFreqHz = 360 + elevFactor * 240 + speedNorm * 190 + (params.grounded ? 0 : 120);

  return { gain, lowFreqHz, highFreqHz };
}

// Astral D minor-9th (D2, A2, E3, F3) vs Sunken Academy / Overworld C Lydian/Dorian (C2, G2, D3, F#3)
export const ASTRAL_DRONE_FREQS: readonly [number, number, number, number] = [73.42, 110.0, 164.81, 174.61];
export const OVERWORLD_DRONE_FREQS: readonly [number, number, number, number] = [65.41, 98.0, 146.83, 185.0];

export function selectDroneChord(
  realm: 'overworld' | 'astral',
  _zone: ZoneId,
): readonly [number, number, number, number] {
  return realm === 'astral' ? ASTRAL_DRONE_FREQS : OVERWORLD_DRONE_FREQS;
}
