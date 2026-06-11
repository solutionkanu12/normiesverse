/**
 * Procedural audio asset generator.
 *
 * Synthesizes every ambient loop + SFX the game uses as plain WAV files into
 * public/audio/ — no external samples, everything is additive/FM synthesis
 * and filtered noise written sample-by-sample. Ambient loop oscillators use
 * frequencies snapped via {@link loopFreq} so `freq * duration` is a whole
 * number of cycles — the waveform value (and slope) match at t=0 and
 * t=duration, so Howler's `loop: true` has no audible seam.
 *
 * Run: npm run gen:audio
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SAMPLE_RATE = 22050;
const OUT_DIR = join(process.cwd(), "public", "audio");

// ---------------------------------------------------------------------------
// PRNG + WAV encoding
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBuffer(seconds: number): Float64Array {
  return new Float64Array(Math.round(seconds * SAMPLE_RATE));
}

/** Snap a frequency so `freq * durationSec` is a whole number of cycles — perfectly loopable. */
function loopFreq(freq: number, durationSec: number): number {
  return Math.max(1, Math.round(freq * durationSec)) / durationSec;
}

function writeWav(name: string, buf: Float64Array) {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const scale = peak > 0 ? 0.92 / peak : 1;

  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    const s = Math.max(-1, Math.min(1, buf[i] * scale));
    data.writeInt16LE(Math.round(s * 0x7fff), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  writeFileSync(join(OUT_DIR, name), Buffer.concat([header, data]));
  console.log(`  wrote ${name} (${(buf.length / SAMPLE_RATE).toFixed(2)}s)`);
}

// ---------------------------------------------------------------------------
// Synthesis primitives
// ---------------------------------------------------------------------------

type Env = (t: number, dur: number) => number;

const env = {
  const: (v = 1): Env => () => v,
  expDecay: (rate: number): Env => (t) => Math.exp(-rate * t),
  attackRelease: (attack: number, release: number): Env => (t, dur) => {
    if (t < attack) return t / attack;
    const relStart = dur - release;
    if (t > relStart) return Math.max(0, (dur - t) / release);
    return 1;
  },
  /** Periodic decaying impulse — a "thump" every 1/rate seconds. */
  pulseTrain: (rate: number, decay: number): Env => (t) => {
    const local = (t * rate) % 1;
    return Math.exp(-decay * (local / rate));
  },
};

/** Add a sine tone (with optional amplitude envelope) into `buf`. */
function addTone(buf: Float64Array, freq: number, gain: number, e: Env = env.const(), phase = 0) {
  const dur = buf.length / SAMPLE_RATE;
  const w = 2 * Math.PI * freq;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    buf[i] += Math.sin(w * t + phase) * gain * e(t, dur);
  }
}

/** Additive harmonic stack (brighter, sawtooth-ish timbre) for synths/bells. */
function addRichTone(buf: Float64Array, freq: number, gain: number, e: Env = env.const(), harmonics = 5) {
  for (let h = 1; h <= harmonics; h++) {
    addTone(buf, freq * h, gain / h, e);
  }
}

/** Add an exponential frequency sweep (f0 → f1) sine. */
function addSweep(buf: Float64Array, f0: number, f1: number, gain: number, e: Env = env.const()) {
  const dur = buf.length / SAMPLE_RATE;
  let phase = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    const f = f0 * Math.pow(f1 / f0, t / dur);
    phase += (2 * Math.PI * f) / SAMPLE_RATE;
    buf[i] += Math.sin(phase) * gain * e(t, dur);
  }
}

/** Add seeded white noise. */
function addNoise(buf: Float64Array, gain: number, seed: number, e: Env = env.const()) {
  const rng = mulberry32(seed);
  const dur = buf.length / SAMPLE_RATE;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    buf[i] += (rng() * 2 - 1) * gain * e(t, dur);
  }
}

/** One-pole low-pass filter, in place — turns white noise into wind/rumble. */
function lowpass(buf: Float64Array, alpha: number) {
  let prev = 0;
  for (let i = 0; i < buf.length; i++) {
    prev += alpha * (buf[i] - prev);
    buf[i] = prev;
  }
}

/** Mix `src` into `dst` starting at `offsetSec`, scaled by `gain`. */
function mixAt(dst: Float64Array, src: Float64Array, offsetSec: number, gain = 1) {
  const offset = Math.round(offsetSec * SAMPLE_RATE);
  for (let i = 0; i < src.length && offset + i < dst.length; i++) {
    dst[offset + i] += src[i] * gain;
  }
}

// ---------------------------------------------------------------------------
// Ambient loops
// ---------------------------------------------------------------------------

/** Nexus — calm deep-space pad with a slow "breathing" tremolo + cosmic hiss. */
function genAmbientNexus(): Float64Array {
  const dur = 8;
  const buf = makeBuffer(dur);

  const breathe: Env = (t) => 0.75 + 0.25 * Math.sin(2 * Math.PI * loopFreq(0.125, dur) * t);
  addTone(buf, loopFreq(55, dur), 0.22, breathe);
  addTone(buf, loopFreq(110, dur), 0.14, breathe);
  addTone(buf, loopFreq(164.81, dur), 0.09, breathe);
  addTone(buf, loopFreq(220, dur), 0.05, breathe);

  const shimmer: Env = (t) => 0.4 + 0.6 * Math.max(0, Math.sin(2 * Math.PI * loopFreq(0.25, dur) * t));
  addTone(buf, loopFreq(1760, dur), 0.025, shimmer);

  const hiss = makeBuffer(dur);
  addNoise(hiss, 1, 7);
  lowpass(hiss, 0.02);
  mixAt(buf, hiss, 0, 0.5);

  return buf;
}

/** Cyberpunk — pulsing neon bass + a 4-note arpeggio + filtered rain. */
function genAmbientCyberpunk(): Float64Array {
  const dur = 4;
  const buf = makeBuffer(dur);

  const pulse: Env = (t) => Math.pow(Math.abs(Math.sin(2 * Math.PI * loopFreq(0.5, dur) * t)), 3);
  addRichTone(buf, loopFreq(110, dur), 0.22, pulse, 3);

  const notes = [220, 277.18, 329.63, 440];
  notes.forEach((f, i) => {
    const slot = dur / notes.length;
    const noteEnv: Env = (t) => {
      const local = t - i * slot;
      if (local < 0 || local > slot) return 0;
      return Math.exp(-6 * local);
    };
    addRichTone(buf, loopFreq(f, dur), 0.1, noteEnv, 3);
  });

  const rain = makeBuffer(dur);
  addNoise(rain, 1, 99);
  lowpass(rain, 0.35);
  mixAt(buf, rain, 0, 0.18);

  return buf;
}

/** Frozen — gusting wind, a cold pad, and sparse ice-chime bells. */
function genAmbientFrozen(): Float64Array {
  const dur = 8;
  const buf = makeBuffer(dur);

  const wind = makeBuffer(dur);
  addNoise(wind, 1, 13);
  lowpass(wind, 0.015);
  const gust: Env = (t) => 0.5 + 0.5 * Math.sin(2 * Math.PI * loopFreq(0.125, dur) * t);
  for (let i = 0; i < wind.length; i++) {
    wind[i] *= gust(i / SAMPLE_RATE, dur);
  }
  mixAt(buf, wind, 0, 1.1);

  addTone(buf, loopFreq(110, dur), 0.12, env.const());
  addTone(buf, loopFreq(220, dur), 0.06, env.const());

  [1.4, 3.9, 6.3].forEach((time, i) => {
    const bell = makeBuffer(1.2);
    addTone(bell, 1760 * (1 + i * 0.05), 0.5, env.expDecay(2.2));
    addTone(bell, 2640 * (1 + i * 0.05), 0.25, env.expDecay(3));
    mixAt(buf, bell, time, 0.18);
  });

  return buf;
}

/** Void — a beating sub-bass drone, dissonant high pad, and glitch blips. */
function genAmbientVoid(): Float64Array {
  const dur = 8;
  const buf = makeBuffer(dur);

  addTone(buf, loopFreq(41.25, dur), 0.26, env.const());
  addTone(buf, loopFreq(41.5, dur), 0.22, env.const());

  addTone(buf, loopFreq(1320, dur), 0.02, env.const());
  addTone(buf, loopFreq(1330, dur), 0.018, env.const());

  const rng = mulberry32(2024);
  for (let i = 0; i < 10; i++) {
    const time = rng() * (dur - 0.1);
    const blip = makeBuffer(0.05);
    addTone(blip, 800 + rng() * 2400, 0.6, env.expDecay(60));
    mixAt(buf, blip, time, 0.3);
  }

  return buf;
}

/** Boss — dissonant low drone, a ~1Hz heartbeat, and a tense tremolo overtone. */
function genAmbientBoss(): Float64Array {
  const dur = 8;
  const buf = makeBuffer(dur);

  addTone(buf, loopFreq(55, dur), 0.22, env.const());
  addTone(buf, loopFreq(56.875, dur), 0.18, env.const());

  const beat = makeBuffer(dur);
  addTone(beat, loopFreq(60, dur), 1, env.pulseTrain(loopFreq(1, dur), 14));
  mixAt(buf, beat, 0, 0.35);

  const tremolo: Env = (t) => 0.5 + 0.5 * Math.sin(2 * Math.PI * loopFreq(2, dur) * t);
  addTone(buf, loopFreq(220, dur), 0.05, tremolo);

  return buf;
}

// ---------------------------------------------------------------------------
// SFX (one-shots)
// ---------------------------------------------------------------------------

/** UI click/tick. */
function genSfxUi(): Float64Array {
  const buf = makeBuffer(0.07);
  addTone(buf, 1500, 0.5, env.expDecay(60));
  addNoise(buf, 0.3, 555, env.expDecay(80));
  return buf;
}

/** Portal whoosh — rising sweep + filtered air. */
function genSfxPortal(): Float64Array {
  const buf = makeBuffer(0.7);
  const e = env.attackRelease(0.05, 0.45);
  addSweep(buf, 260, 1400, 0.5, e);
  addSweep(buf, 520, 2800, 0.2, e);
  const air = makeBuffer(0.7);
  addNoise(air, 1, 321, e);
  lowpass(air, 0.1);
  mixAt(buf, air, 0, 0.3);
  return buf;
}

/** Reality Core pickup — bright FM bell. */
function genSfxCore(): Float64Array {
  const buf = makeBuffer(1.4);
  addTone(buf, 880, 0.5, env.expDecay(2.2));
  addTone(buf, 1320, 0.3, env.expDecay(3.2));
  addTone(buf, 1760, 0.18, env.expDecay(4.2));
  return buf;
}

/** Quest update — short two-note "ding-dong". */
function genSfxQuest(): Float64Array {
  const buf = makeBuffer(0.6);
  addTone(buf, 660, 0.5, env.expDecay(7));
  const second = makeBuffer(0.6);
  addTone(second, 880, 0.5, env.expDecay(6));
  mixAt(buf, second, 0.12, 1);
  return buf;
}

/** Achievement unlock — 4-note ascending arpeggio. */
function genSfxAchievement(): Float64Array {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const buf = makeBuffer(1.0);
  notes.forEach((f, i) => {
    const note = makeBuffer(0.4);
    addTone(note, f, 0.45, env.expDecay(8));
    addTone(note, f * 2, 0.15, env.expDecay(10));
    mixAt(buf, note, i * 0.15, 1);
  });
  return buf;
}

/** Boss strike impact — low thud + noise crunch. */
function genSfxHit(): Float64Array {
  const buf = makeBuffer(0.35);
  addTone(buf, 80, 0.7, env.expDecay(18));
  const noise = makeBuffer(0.35);
  addNoise(noise, 1, 808, env.expDecay(30));
  lowpass(noise, 0.2);
  mixAt(buf, noise, 0, 0.5);
  return buf;
}

/** Danger / XOR alert — harsh wobbling square siren. */
function genSfxAlert(): Float64Array {
  const dur = 0.4;
  const buf = makeBuffer(dur);
  const e = env.attackRelease(0.01, 0.2);
  let phase = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    const f = 220 + 80 * Math.sin(2 * Math.PI * 14 * t);
    phase += (2 * Math.PI * f) / SAMPLE_RATE;
    buf[i] = Math.sign(Math.sin(phase)) * 0.35 * e(t, dur);
  }
  return buf;
}

/** Victory — major chord swell + a high sparkle. */
function genSfxVictory(): Float64Array {
  const dur = 2.6;
  const buf = makeBuffer(dur);
  const chord = [261.63, 329.63, 392.0, 523.25];
  const e = env.attackRelease(0.4, 1.8);
  chord.forEach((f) => addRichTone(buf, f, 0.14, e, 4));
  const sparkle: Env = (t) => Math.max(0, Math.sin(2 * Math.PI * 1.5 * t)) * e(t, dur);
  addTone(buf, 2093, 0.06, sparkle);
  return buf;
}

// ---------------------------------------------------------------------------

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log("Generating procedural audio assets…");

  writeWav("ambient-nexus.wav", genAmbientNexus());
  writeWav("ambient-cyberpunk.wav", genAmbientCyberpunk());
  writeWav("ambient-frozen.wav", genAmbientFrozen());
  writeWav("ambient-void.wav", genAmbientVoid());
  writeWav("ambient-boss.wav", genAmbientBoss());

  writeWav("sfx-ui.wav", genSfxUi());
  writeWav("sfx-portal.wav", genSfxPortal());
  writeWav("sfx-core.wav", genSfxCore());
  writeWav("sfx-quest.wav", genSfxQuest());
  writeWav("sfx-achievement.wav", genSfxAchievement());
  writeWav("sfx-hit.wav", genSfxHit());
  writeWav("sfx-alert.wav", genSfxAlert());
  writeWav("sfx-victory.wav", genSfxVictory());

  console.log("Done.");
}

main();
