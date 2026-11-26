import {clamp, compose, presets, randomSource, sanitize} from "./recursion.js";

export const sampleRate = 44100;
const peakTarget = 10 ** (-3 / 20);
const rmsTarget = 0.1;
const tableSize = 8192;
const sine = Float32Array.from({length: tableSize}, (_, i) => Math.sin(2 * Math.PI * i / tableSize));
const oscillator = phase => sine[Math.floor(phase) & (tableSize - 1)];

function addVoice(channels, note, life, gain, mood, pad = false) {
  const first = Math.round(note.time * sampleRate);
  const count = Math.min(channels.left.length - first, Math.ceil(life * sampleRate));
  const increment = tableSize * note.hz / sampleRate;
  const leftGain = Math.sqrt((1 - note.pan) * 0.5) * gain;
  const rightGain = Math.sqrt((1 + note.pan) * 0.5) * gain;
  const attack = pad ? 0.8 : [0.065, 0.035, 0.022][mood];
  const decayStep = Math.exp(-(pad ? 1.7 : 5.1) / (life * sampleRate));
  const partial = [2, 2.997, 3][mood];
  let decay = 1;
  for (let n = 0; n < count; n++) {
    const time = n / sampleRate;
    const phase = n * increment;
    const envelope = Math.min(1, time / attack, (life - time) / (pad ? 0.7 : 0.2)) * decay;
    const detail = (1 - time / life) * (pad ? 0.11 : 0.23);
    const chime = note.leaf && !pad ? 0.055 * oscillator(phase * 4.003) : 0;
    const value = envelope * (oscillator(phase) + detail * oscillator(phase * partial) + chime);
    channels.left[first + n] += value * leftGain;
    channels.right[first + n] += value * rightGain;
    decay *= decayStep;
  }
}
function addAmbience(channels, settings) {
  const amount = clamp(settings.ambience / 100, 0, 1);
  if (!amount) return;
  const random = randomSource(settings.seed + 191);
  const mood = settings.index;
  const lowPass = hz => 1 - Math.exp(-2 * Math.PI * hz / sampleRate);
  const tideFilter = lowPass(420), rainUpper = lowPass(6000), rainLower = lowPass(3000);
  let lowerL=0, lowerR=0, droplet=0, dropPhase=0, dropPitch=0;
  const period = [9, 13, 6][settings.index] * sampleRate;
  let leftNoise = 0, rightNoise = 0, slow = 0;
  for (let i = 0; i < channels.left.length; i++) {
    const motion = oscillator(i * tableSize / period);
    const smoothing = mood === 0 ? tideFilter : mood === 1 ? (0.10 + 0.06 * motion) : rainUpper;
    leftNoise += smoothing * (random() * 2 - 1 - leftNoise);
    rightNoise += smoothing * (random() * 2 - 1 - rightNoise);
    slow += 0.002 * (leftNoise - slow);
    const swell = 0.55 + 0.20 * oscillator(i * tableSize / period) + 0.15 * oscillator(i * tableSize / (period * 1.71));
    const lower = mood === 2 ? rainLower : 0.038 + 0.015 * motion;
    lowerL += lower * (leftNoise - lowerL); lowerR += lower * (rightNoise - lowerR);
    if (mood === 2 && random() < 1 / (0.44 * sampleRate)) {
      droplet = 0.075; dropPhase=0; dropPitch=(2100+random()*2300)*tableSize/sampleRate;
    }
    const tick = droplet * oscillator(dropPhase);
    droplet *= 0.9984; dropPhase += dropPitch;
    const level = amount * swell * [0.86, 0.77, 0.72][mood];
    channels.left[i] += ((mood === 0 ? leftNoise + slow * 0.25 : leftNoise - lowerL) + tick) * level;
    channels.right[i] += ((mood === 0 ? rightNoise + slow * 0.25 : rightNoise - lowerR) + tick) * level;
  }
}
// Parallel damped combs build reflections. Two serial allpasses diffuse them.
// Delay-dependent feedback reaches -60 dB in about three seconds.
function reverberate(channel, wet, stereoOffset) {
  if (!wet) return;
  const combLengths = [1557, 1617, 1491, 1422, 1277, 1356].map(n => n + stereoOffset);
  const combs = combLengths.map(length => ({
    line: new Float32Array(length), index: 0, memory: 0, feedback: 0.001 ** (length / (3 * sampleRate))
  }));
  const diffusers = [556, 441].map(n => ({line: new Float32Array(n + stereoOffset), index: 0}));
  let bass = 0;
  const cutoff = 1 - Math.exp(-2 * Math.PI * 180 / sampleRate);
  for (let i = 0; i < channel.length; i++) {
    const dry = channel[i];
    bass += cutoff * (dry - bass);
    const send = (dry - bass) * 0.35;
    let reflections = 0;
    for (const comb of combs) {
      const echo = comb.line[comb.index];
      comb.memory = 0.64 * echo + 0.36 * comb.memory;
      comb.line[comb.index] = send + comb.memory * comb.feedback;
      if (++comb.index === comb.line.length) comb.index = 0;
      reflections += echo;
    }
    let diffuse = reflections / combs.length;
    for (const filter of diffusers) {
      const delayed = filter.line[filter.index];
      const output = delayed - 0.5 * diffuse;
      filter.line[filter.index] = diffuse + 0.5 * output;
      if (++filter.index === filter.line.length) filter.index = 0;
      diffuse = output;
    }
    channel[i] = dry * (1 - wet * 0.28) + diffuse * wet;
  }
}
function master(channels) {
  let peak = 0, energy = 0;
  const lookAhead = Math.round(0.005 * sampleRate);
  const release = Math.exp(-1 / (0.08 * sampleRate));
  let attenuation = 1;
  for (let i = 0; i < channels.left.length; i++) {
    const amplitude = Math.max(Math.abs(channels.left[i]), Math.abs(channels.right[i]));
    const ahead = Math.min(channels.left.length - 1, i + lookAhead);
    const forecast = Math.max(amplitude, Math.abs(channels.left[ahead]), Math.abs(channels.right[ahead]));
    const target = forecast > 0.82 ? 0.82 / forecast : 1;
    attenuation += (target - attenuation) * (target < attenuation ? 0.0113 : 1 - release);
    const fade = Math.min(1, i / (0.35 * sampleRate), (channels.left.length - 1 - i) / (0.8 * sampleRate));
    channels.left[i] *= attenuation * fade;
    channels.right[i] *= attenuation * fade;
    peak = Math.max(peak, amplitude * attenuation * fade);
    energy += channels.left[i] ** 2 + channels.right[i] ** 2;
  }
  const rms = Math.sqrt(energy / (2 * channels.left.length));
  const normalization = rms > 0 ? Math.min(rmsTarget / rms, peakTarget / peak) : 1;
  for (let i = 0; i < channels.left.length; i++) {
    channels.left[i] *= normalization;
    channels.right[i] *= normalization;
  }
}
export function render(input) {
  const settings = sanitize(input);
  const score = compose(settings);
  const length = Math.ceil(score.duration * sampleRate);
  const channels = {left: new Float32Array(length), right: new Float32Array(length), sampleRate};
  const root = 440 * 2 ** ((presets[settings.index].root - 69) / 12);
  for (const phrase of score.phrases) {
    for (let half = 0; half < 2; half++) {
      const time = phrase.start + half * score.phraseLength / 2;
      const life = score.phraseLength / 2 + 0.65;
      addVoice(channels, {time, hz: root / 2, pan: -0.24}, life, 0.084, 0, true);
      addVoice(channels, {time: time + 0.12, hz: root * 0.75, pan: 0.24}, life, 0.048, 0, true);
    }
  }
  for (const note of score.events) {
    const life = (settings.index === 1 ? 3.1 : 2.15) * (1 - note.level * 0.055);
    addVoice(channels, note, life, 0.34 * note.velocity, settings.index);
  }
  addAmbience(channels, settings);
  const wet = clamp(settings.space / 100, 0, 1);
  reverberate(channels.left, wet, 0);
  reverberate(channels.right, wet, 23);
  master(channels);
  return channels;
}
export function waveFile({left, right, sampleRate}, volume = 1) {
  const size = left.length * 4;
  const buffer = new ArrayBuffer(44 + size);
  const view = new DataView(buffer);
  function label(at, text) {
    for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i));
  }
  label(0, "RIFF");
  view.setUint32(4, 36 + size, true);
  label(8, "WAVE"); label(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true); view.setUint16(34, 16, true);
  label(36, "data"); view.setUint32(40, size, true);
  function pcm(value) {
    const limited = clamp(value * volume, -1, 1);
    return Math.round(limited * (limited < 0 ? 32768 : 32767));
  }
  for (let i = 0; i < left.length; i++) {
    view.setInt16(44 + i * 4, pcm(left[i]), true);
    view.setInt16(46 + i * 4, pcm(right[i]), true);
  }
  return buffer;
}