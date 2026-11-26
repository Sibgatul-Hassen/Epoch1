/**
 * The same score drives the tree, synthesizer, playback cursor and WAV export.
 * Interval split -> note onset. Left/right child -> related pentatonic degree.
 * Depth -> smaller time windows and softer notes. Horizontal position -> stereo pan.
 * Terminal branch -> a little extra chime. Phrase recursion -> a changing tonal centre.
 */
export const presets = [
  {
    name: "Tidal Fold",
    color: "#83e9f2",
    voice: "Felt keys",
    key: "D major pentatonic",
    root: 50,
    scale: [0, 2, 4, 7, 9],
    depth: 5,
    spread: 49,
    tempo: 64,
    seed: 2471,
    ambienceName: "Tide",
    body: "Felt keys and a slow wash of tide.",
  },
  {
    name: "Orchid Orbit",
    color: "#f2a5dd",
    voice: "Glass bells",
    key: "A minor pentatonic",
    root: 57,
    scale: [0, 3, 5, 7, 10],
    depth: 4,
    spread: 62,
    tempo: 56,
    seed: 8103,
    ambienceName: "Wind",
    body: "Glass bells suspended in soft wind.",
  },
  {
    name: "Amber Bloom",
    color: "#ffb478",
    voice: "Warm plucks",
    key: "G major pentatonic",
    root: 55,
    scale: [0, 2, 4, 7, 9],
    depth: 5,
    spread: 36,
    tempo: 72,
    seed: 3907,
    ambienceName: "Rain",
    body: "Warm plucks over a veil of rain.",
  },
];
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function settingsFor(index) {
  const { depth, spread, tempo, seed } = presets[index];
  return {
    index,
    depth,
    spread,
    tempo,
    seed,
    space: 30,
    ambience: 22,
    pulse: true,
  };
}
export function sanitize(input = {}) {
  const finite = (value, fallback) =>
    value !== "" && Number.isFinite(Number(value)) ? Number(value) : fallback;
  const index = clamp(Math.round(finite(input.index, 0)), 0, 2);
  const defaults = settingsFor(index);
  const limit = (key, lo, hi) =>
    clamp(Math.round(finite(input[key], defaults[key])), lo, hi);
  return {
    index,
    depth: limit("depth", 1, 6),
    spread: limit("spread", 0, 100),
    tempo: limit("tempo", 48, 84),
    seed: finite(input.seed, 1) >>> 0,
    space: limit("space", 0, 100),
    ambience: limit("ambience", 0, 100),
    pulse: input.pulse !== false,
  };
}
export function randomSource(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function compose(input) {
  const settings = sanitize(input);
  const preset = presets[clamp(Math.round(settings.index), 0, 2)];
  const depth = clamp(Math.round(settings.depth), 1, 6);
  const tempo = clamp(settings.tempo, 48, 84);
  const spread = clamp(settings.spread, 0, 100);
  const random = randomSource(settings.seed);
  const beatsPerPhrase = 16 + 8 * Math.max(0, depth - 4);
  const phraseLength = (beatsPerPhrase * 60) / tempo;
  const phraseCount = Math.min(
    6 + (settings.seed % 3),
    Math.floor(168 / phraseLength),
  );
  const span = phraseCount * phraseLength;
  const phrases = [];
  const events = [];
  const eighth = 60 / tempo / 2;
  const minGap = settings.pulse ? Math.max(0.12, eighth - 0.000001) : 0.12;

  function growPhrase(number, centre) {
    if (number === phraseCount) return;
    const phraseDepth = clamp(
      depth - (number % 3 === 1 && depth > 2 ? 1 : 0),
      1,
      6,
    );
    const skew = (spread - 50) / 165 + (random() - 0.5) * 0.12;
    const start = number * phraseLength;
    const candidates = [];
    function divide(left, right, level, degree, parent, side) {
      const ratio = clamp(
        0.5 + skew * side + (random() - 0.5) * 0.075,
        0.2,
        0.8,
      );
      const point = left + (right - left) * ratio;
      const slot = clamp(degree, 0, 12);
      const midi =
        preset.root + preset.scale[slot % 5] + 12 * Math.floor(slot / 5);
      const freeTime = 0.14 + point * (phraseLength - 0.28);
      const onset = settings.pulse
        ? clamp(
            Math.round(freeTime / eighth) * eighth,
            eighth,
            phraseLength - eighth,
          )
        : freeTime;
      const note = {
        id: candidates.length,
        parent,
        level,
        point,
        side,
        leaf: true,
        time: start + onset,
        hz: 440 * 2 ** ((midi - 69) / 12),
        pan: (point - 0.5) * 1.4,
        velocity: 0.77 ** level,
        variant: random(),
      };
      candidates.push(note);
      if (level === phraseDepth) return;
      divide(
        left,
        point,
        level + 1,
        slot - (random() > 0.6 ? 2 : 1),
        note.id,
        -1,
      );
      divide(
        point,
        right,
        level + 1,
        slot + (random() < spread / 100 ? 2 : 1),
        note.id,
        1,
      );
    }
    divide(0, 1, 0, centre, -1, 1);
    // Reserve the structurally important ancestors first. Never leave an orphan.
    const accepted = new Map();
    for (const note of candidates.sort(
      (a, b) => a.level - b.level || a.time - b.time,
    )) {
      if (note.parent >= 0 && !accepted.has(note.parent)) continue;
      if (
        [...accepted.values()].some(
          (other) => Math.abs(other.time - note.time) < minGap,
        )
      )
        continue;
      if (note.parent >= 0) accepted.get(note.parent).leaf = false;
      accepted.set(note.id, note);
    }
    const notes = [...accepted.values()];
    phrases.push({
      number,
      start,
      end: start + phraseLength,
      depth: phraseDepth,
      notes,
    });
    events.push(...notes);
    const nextDegree = [3, 5, 2, 4, 1, 3, 2, 0][number];
    growPhrase(number + 1, number + 2 === phraseCount ? 0 : nextDegree);
  }
  growPhrase(0, 3);
  const cadence = {
    id: -2,
    parent: -1,
    level: 0,
    point: 0.5,
    leaf: true,
    time: span + 0.2,
    hz: 440 * 2 ** ((preset.root - 69) / 12),
    velocity: 1,
    pan: 0,
    variant: 0.5,
  };
  events.push(cadence);
  return {
    phrases,
    events: events.sort((a, b) => a.time - b.time),
    cadence,
    span,
    phraseLength,
    duration: span + 5.5,
  };
}
export function clock(seconds) {
  const whole = Math.max(0, Math.floor(seconds || 0));
  return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
}
