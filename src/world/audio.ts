import type { ZoneId } from './terrainMath';
import {
  ASTRAL_DRONE_FREQS,
  OVERWORLD_DRONE_FREQS,
  computeWindModulation,
  selectDroneChord,
} from './atmosphereAndAudio';

export interface FantasyAudioUpdateParams {
  elapsed: number;
  dt: number;
  realm: 'overworld' | 'astral';
  zone: ZoneId;
  speed: number;
  grounded: boolean;
  elevationY: number;
  isSprinting: boolean;
  isResting: boolean;
}

export interface FantasyAudioEngine {
  unlock: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  isInitialized: () => boolean;
  update: (params: FantasyAudioUpdateParams) => void;
  playFootstep: (isSprinting: boolean) => void;
  playJump: () => void;
  playLand: (impactVel: number) => void;
  playDodgeRollStart: () => void;
  playDodgeRollLand: () => void;
  playPortalTransition: (toRealm: 'overworld' | 'astral') => void;
  dispose: () => void;
}

const BELL_NOTES_ASTRAL = [880, 987.77, 1174.66, 1318.51]; // A5, B5, D6, E6
const WATER_CHIMES_ACADEMY = [587.33, 739.99, 880, 1108.73]; // D5, F#5, A5, C#6

export function createFantasyAudioEngine(): FantasyAudioEngine {
  let ctx: AudioContext | null = null;
  let compressor: DynamicsCompressorNode | null = null;
  let masterGain: GainNode | null = null;
  let reverbInput: GainNode | null = null;
  let windGainNode: GainNode | null = null;
  let windLowFilter: BiquadFilterNode | null = null;
  let windHighFilter: BiquadFilterNode | null = null;
  let droneFilter: BiquadFilterNode | null = null;
  let droneGainNode: GainNode | null = null;
  let droneOscs: OscillatorNode[] = [];
  let lfoNodes: OscillatorNode[] = [];
  let noiseBuffer: AudioBuffer | null = null;
  let windSource: AudioBufferSourceNode | null = null;

  let muted = false;
  let initialized = false;
  let disposed = false;
  let nextBellTime = 0;
  let nextRippleTime = 0;
  let currentChord: readonly [number, number, number, number] = OVERWORLD_DRONE_FREQS;

  function buildPinkNoiseBuffer(ac: AudioContext): AudioBuffer {
    const length = ac.sampleRate * 3;
    const buffer = ac.createBuffer(2, length, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = Math.max(-0.95, Math.min(0.95, (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08));
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  function ensureGraph() {
    if (disposed || initialized) return;
    const AudioCtx =
      typeof window !== 'undefined'
        ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AudioCtx) return;

    try {
      ctx = new AudioCtx();
    } catch {
      return;
    }

    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.2;

    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.78;

    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Shared Stereo Feedback Delay Reverb Bus (320ms L / 470ms R cross-fed, 45% feedback, 1200Hz LPF)
    reverbInput = ctx.createGain();
    reverbInput.gain.value = 0.55;

    const delayL = ctx.createDelay(1.0);
    const delayR = ctx.createDelay(1.0);
    delayL.delayTime.value = 0.32;
    delayR.delayTime.value = 0.47;

    const dampL = ctx.createBiquadFilter();
    const dampR = ctx.createBiquadFilter();
    dampL.type = 'lowpass';
    dampR.type = 'lowpass';
    dampL.frequency.value = 1200;
    dampR.frequency.value = 1200;

    const fbL = ctx.createGain();
    const fbR = ctx.createGain();
    fbL.gain.value = 0.45;
    fbR.gain.value = 0.45;

    const wetMerger = ctx.createChannelMerger(2);
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.42;

    reverbInput.connect(delayL);
    reverbInput.connect(delayR);
    delayL.connect(dampL);
    delayR.connect(dampR);
    dampL.connect(fbL);
    dampR.connect(fbR);
    // Cross-feed stereo reflections
    fbL.connect(delayR);
    fbR.connect(delayL);

    dampL.connect(wetMerger, 0, 0);
    dampR.connect(wetMerger, 0, 1);
    wetMerger.connect(wetGain);
    wetGain.connect(compressor);

    // Noise Buffer for Wind + Foley
    noiseBuffer = buildPinkNoiseBuffer(ctx);

    // Dual-Bandpass LFO-Modulated Stereo Wind Engine
    windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    windLowFilter = ctx.createBiquadFilter();
    windLowFilter.type = 'bandpass';
    windLowFilter.frequency.value = 240;
    windLowFilter.Q.value = 1.65;

    windHighFilter = ctx.createBiquadFilter();
    windHighFilter.type = 'bandpass';
    windHighFilter.frequency.value = 520;
    windHighFilter.Q.value = 2.1;

    windGainNode = ctx.createGain();
    windGainNode.gain.value = 0.06;

    const windLfo1 = ctx.createOscillator();
    windLfo1.frequency.value = 0.11;
    const windLfo1Depth = ctx.createGain();
    windLfo1Depth.gain.value = 110;
    windLfo1.connect(windLfo1Depth);
    windLfo1Depth.connect(windLowFilter.frequency);

    const windLfo2 = ctx.createOscillator();
    windLfo2.frequency.value = 0.17;
    const windLfo2Depth = ctx.createGain();
    windLfo2Depth.gain.value = 190;
    windLfo2.connect(windLfo2Depth);
    windLfo2Depth.connect(windHighFilter.frequency);

    windSource.connect(windLowFilter);
    windSource.connect(windHighFilter);
    windLowFilter.connect(windGainNode);
    windHighFilter.connect(windGainNode);
    windGainNode.connect(compressor);
    windGainNode.connect(reverbInput);

    windSource.start();
    windLfo1.start();
    windLfo2.start();
    lfoNodes.push(windLfo1, windLfo2);

    // Ethereal 4-Oscillator Biome Ambient Drone + Sweeping Lowpass (240..520Hz)
    droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 340;
    droneFilter.Q.value = 0.9;

    const droneLfo = ctx.createOscillator();
    droneLfo.frequency.value = 0.07;
    const droneLfoDepth = ctx.createGain();
    droneLfoDepth.gain.value = 135;
    droneLfo.connect(droneLfoDepth);
    droneLfoDepth.connect(droneFilter.frequency);
    droneLfo.start();
    lfoNodes.push(droneLfo);

    droneGainNode = ctx.createGain();
    droneGainNode.gain.value = 0.095;

    const detunes = [-6, 4, -8, 7];
    const oscTypes: OscillatorType[] = ['sine', 'triangle', 'sine', 'triangle'];
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      osc.type = oscTypes[i];
      osc.frequency.value = currentChord[i];
      osc.detune.value = detunes[i];
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = i < 2 ? 0.28 : 0.16;
      osc.connect(voiceGain);
      voiceGain.connect(droneFilter);
      osc.start();
      droneOscs.push(osc);
    }

    droneFilter.connect(droneGainNode);
    droneGainNode.connect(compressor);
    droneGainNode.connect(reverbInput);

    nextBellTime = ctx.currentTime + 2.5;
    nextRippleTime = ctx.currentTime + 3.0;
    initialized = true;
  }

  function triggerCelestialBell(freq: number, gainPeak: number, dur: number) {
    if (!ctx || !compressor || !reverbInput || muted) return;
    const t = ctx.currentTime;
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const env = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, t);
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.0, t);
    modGain.gain.setValueAtTime(freq * 0.45, t);
    modGain.gain.exponentialRampToValueAtTime(1.0, t + dur * 0.7);

    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gainPeak, t + 0.025);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(env);
    env.connect(reverbInput);
    env.connect(compressor);

    carrier.start(t);
    mod.start(t);
    carrier.stop(t + dur + 0.05);
    mod.stop(t + dur + 0.05);
  }

  function playNoiseBurst(params: {
    filterType: BiquadFilterType;
    freqStart: number;
    freqEnd: number;
    q: number;
    gainPeak: number;
    duration: number;
    delaySec?: number;
    reverbSend?: number;
  }) {
    if (!ctx || !noiseBuffer || !compressor || !reverbInput || muted) return;
    const t = ctx.currentTime + (params.delaySec || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = params.filterType;
    filter.frequency.setValueAtTime(params.freqStart, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, params.freqEnd), t + params.duration);
    filter.Q.value = params.q;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(params.gainPeak, t + Math.min(0.018, params.duration * 0.2));
    env.gain.exponentialRampToValueAtTime(0.0001, t + params.duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(compressor);
    if (params.reverbSend && params.reverbSend > 0) {
      const send = ctx.createGain();
      send.gain.value = params.reverbSend;
      env.connect(send);
      send.connect(reverbInput);
    }

    const offset = Math.random() * Math.max(0.1, noiseBuffer.duration - params.duration - 0.1);
    src.start(t, offset, params.duration + 0.02);
  }

  const unlock = () => {
    if (disposed) return;
    if (!initialized) {
      ensureGraph();
    }
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  };

  const setMuted = (nextMuted: boolean) => {
    muted = nextMuted;
    if (ctx && masterGain) {
      const t = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.78, t + 0.14);
    }
  };

  const update = (params: FantasyAudioUpdateParams) => {
    if (!initialized || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;

    // 1. Update Wind Engine
    const windMod = computeWindModulation({
      speed: params.speed,
      grounded: params.grounded,
      elevationY: params.elevationY,
      isSprinting: params.isSprinting,
      realm: params.realm,
    });
    if (windGainNode && windLowFilter && windHighFilter) {
      const targetWindGain = params.isResting ? windMod.gain * 0.55 : windMod.gain;
      windGainNode.gain.setTargetAtTime(targetWindGain, t, 0.22);
      windLowFilter.frequency.setTargetAtTime(windMod.lowFreqHz, t, 0.25);
      windHighFilter.frequency.setTargetAtTime(windMod.highFreqHz, t, 0.25);
    }

    // 2. Smoothly glide Drone Harmonies between Astral Royal Capital & Overworld/Academy
    const desiredChord = selectDroneChord(params.realm, params.zone);
    if (desiredChord !== currentChord) {
      currentChord = desiredChord;
      for (let i = 0; i < droneOscs.length; i++) {
        droneOscs[i].frequency.setTargetAtTime(desiredChord[i], t, 0.9);
      }
    }
    if (droneGainNode) {
      const baseDrone = params.realm === 'astral' ? 0.105 : 0.088;
      droneGainNode.gain.setTargetAtTime(params.isResting ? baseDrone * 1.25 : baseDrone, t, 0.45);
    }

    // 3. Occasional Ethereal Celestial Bells (Astral) or Water Shimmer Chimes (Academy)
    if (!muted) {
      if (params.realm === 'astral' && t >= nextBellTime) {
        const note = BELL_NOTES_ASTRAL[Math.floor(Math.random() * BELL_NOTES_ASTRAL.length)];
        triggerCelestialBell(note, 0.038, 3.2);
        nextBellTime = t + 4.8 + Math.random() * 5.2;
      } else if (params.realm === 'overworld' && params.zone === 'academy-grounds' && t >= nextRippleTime) {
        const note = WATER_CHIMES_ACADEMY[Math.floor(Math.random() * WATER_CHIMES_ACADEMY.length)];
        triggerCelestialBell(note, 0.022, 2.4);
        nextRippleTime = t + 4.2 + Math.random() * 5.5;
      }
    }
  };

  const playFootstep = (isSprinting: boolean) => {
    if (!initialized || !ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;
    const pitchJitter = 0.88 + Math.random() * 0.24;

    // 1. Stone boot heel impact (110..180Hz)
    const tapOsc = ctx.createOscillator();
    const tapEnv = ctx.createGain();
    tapOsc.type = 'triangle';
    const baseHz = (isSprinting ? 158 : 132) * pitchJitter;
    tapOsc.frequency.setValueAtTime(baseHz, t);
    tapOsc.frequency.exponentialRampToValueAtTime(52, t + 0.055);
    tapEnv.gain.setValueAtTime(isSprinting ? 0.24 : 0.16, t);
    tapEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
    tapOsc.connect(tapEnv);
    if (compressor) tapEnv.connect(compressor);
    tapOsc.start(t);
    tapOsc.stop(t + 0.075);

    // 2. Subtle grit scuff
    playNoiseBurst({
      filterType: 'bandpass',
      freqStart: 480 * pitchJitter,
      freqEnd: 260,
      q: 1.5,
      gainPeak: isSprinting ? 0.14 : 0.085,
      duration: 0.055,
      reverbSend: 0.18,
    });

    // 3. Metallic chainmail / plate greave clink (2400..4200Hz)
    playNoiseBurst({
      filterType: 'bandpass',
      freqStart: (2600 + Math.random() * 1400),
      freqEnd: 2200,
      q: 4.5,
      gainPeak: isSprinting ? 0.095 : 0.052,
      duration: 0.068,
      delaySec: 0.01,
      reverbSend: 0.28,
    });
  };

  const playJump = () => {
    if (!initialized || !ctx || ctx.state !== 'running' || muted) return;
    // Cloth & air takeoff whoosh + plate shift
    playNoiseBurst({
      filterType: 'bandpass',
      freqStart: 320,
      freqEnd: 940,
      q: 1.4,
      gainPeak: 0.18,
      duration: 0.18,
      reverbSend: 0.25,
    });
    playNoiseBurst({
      filterType: 'bandpass',
      freqStart: 3100,
      freqEnd: 2400,
      q: 4.0,
      gainPeak: 0.075,
      duration: 0.09,
      reverbSend: 0.25,
    });
  };

  const playLand = (impactVel: number) => {
    if (!initialized || !ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;
    const weight = Math.min(1.3, Math.max(0.5, Math.abs(impactVel) / 10.0));

    // Weighted 75Hz stone-and-plate thud
    const thudOsc = ctx.createOscillator();
    const thudEnv = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(84, t);
    thudOsc.frequency.exponentialRampToValueAtTime(36, t + 0.14);
    thudEnv.gain.setValueAtTime(0.32 * weight, t);
    thudEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    thudOsc.connect(thudEnv);
    if (compressor) thudEnv.connect(compressor);
    if (reverbInput) {
      const send = ctx.createGain();
      send.gain.value = 0.25;
      thudEnv.connect(send);
      send.connect(reverbInput);
    }
    thudOsc.start(t);
    thudOsc.stop(t + 0.18);

    // Stone impact grit & armor settle clink
    playNoiseBurst({
      filterType: 'lowpass',
      freqStart: 560,
      freqEnd: 160,
      q: 0.9,
      gainPeak: 0.22 * weight,
      duration: 0.12,
      reverbSend: 0.3,
    });
    playNoiseBurst({
      filterType: 'bandpass',
      freqStart: 3000,
      freqEnd: 2300,
      q: 3.8,
      gainPeak: 0.11 * weight,
      duration: 0.11,
      delaySec: 0.025,
      reverbSend: 0.35,
    });
  };

  const playDodgeRollStart = () => {
    if (!initialized || !ctx || ctx.state !== 'running' || muted) return;
    // 0.45s cloth & air dive whoosh + mid-tuck plate clatter
    playNoiseBurst({
      filterType: 'bandpass',
      freqStart: 540,
      freqEnd: 190,
      q: 1.25,
      gainPeak: 0.24,
      duration: 0.42,
      reverbSend: 0.32,
    });
    playNoiseBurst({
      filterType: 'bandpass',
      freqStart: 2800,
      freqEnd: 3600,
      q: 4.2,
      gainPeak: 0.12,
      duration: 0.14,
      delaySec: 0.08,
      reverbSend: 0.35,
    });
  };

  const playDodgeRollLand = () => {
    if (!initialized || !ctx || ctx.state !== 'running' || muted) return;
    // Double-foot recovery plant
    playFootstep(false);
    playNoiseBurst({
      filterType: 'bandpass',
      freqStart: 240,
      freqEnd: 130,
      q: 1.4,
      gainPeak: 0.13,
      duration: 0.075,
      delaySec: 0.07,
      reverbSend: 0.22,
    });
    playNoiseBurst({
      filterType: 'bandpass',
      freqStart: 3150,
      freqEnd: 2500,
      q: 4.0,
      gainPeak: 0.07,
      duration: 0.075,
      delaySec: 0.075,
      reverbSend: 0.25,
    });
  };

  const playPortalTransition = (toRealm: 'overworld' | 'astral') => {
    if (!initialized || !ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;

    // Deep sub-bass swell (0.8s)
    const sub = ctx.createOscillator();
    const subEnv = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(48, t);
    sub.frequency.linearRampToValueAtTime(toRealm === 'astral' ? 73.42 : 65.41, t + 0.42);
    sub.frequency.exponentialRampToValueAtTime(36, t + 0.88);
    subEnv.gain.setValueAtTime(0.0001, t);
    subEnv.gain.linearRampToValueAtTime(0.35, t + 0.28);
    subEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    sub.connect(subEnv);
    if (compressor) subEnv.connect(compressor);
    sub.start(t);
    sub.stop(t + 0.95);

    // Shimmering harmonic chord sweep through long reverb
    const chord = toRealm === 'astral' ? ASTRAL_DRONE_FREQS : OVERWORLD_DRONE_FREQS;
    chord.forEach((f, idx) => {
      triggerCelestialBell(f * 4, 0.055 - idx * 0.006, 1.9 + idx * 0.2);
    });
  };

  const dispose = () => {
    disposed = true;
    for (const o of droneOscs) {
      try {
        o.stop();
      } catch {
        // Ignore
      }
    }
    for (const l of lfoNodes) {
      try {
        l.stop();
      } catch {
        // Ignore
      }
    }
    if (windSource) {
      try {
        windSource.stop();
      } catch {
        // Ignore
      }
    }
    droneOscs = [];
    lfoNodes = [];
    windSource = null;
    if (ctx) {
      void ctx.close().catch(() => {});
      ctx = null;
    }
    initialized = false;
  };

  return {
    unlock,
    setMuted,
    isMuted: () => muted,
    isInitialized: () => initialized,
    update,
    playFootstep,
    playJump,
    playLand,
    playDodgeRollStart,
    playDodgeRollLand,
    playPortalTransition,
    dispose,
  };
}
