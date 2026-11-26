// "What is recursion?" page: four small visual lessons.
// 1. A tree drawn by a recursive function, grown one level at a time.
// 2. (static) The base case and the recursive step.
// 3. The call stack, stepping through a small call tree.
// 4. Splitting time recursively into notes, with a short audible example.
const NS = "http://www.w3.org/2000/svg";
const byId = (id) => document.getElementById(id);
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const timers = new Set();
const later = (fn, ms) => {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
  return t;
};
const clearTimers = () => {
  for (const t of timers) clearTimeout(t);
  timers.clear();
};
function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
}
function stepper(container, values, initial, onPick) {
  container.replaceChildren();
  const buttons = values.map((value) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = value;
    b.setAttribute("aria-label", "Depth " + value);
    b.onclick = () => onPick(value, true);
    container.append(b);
    return b;
  });
  const select = (value) =>
    buttons.forEach((b, i) => b.setAttribute("aria-pressed", values[i] === value));
  select(initial);
  return select;
}

// ---------- 1. Grow a tree ----------
let growDepth = 0,
  growSelect;
function growTree(depth, animate) {
  const svg = byId("grow-tree");
  svg.replaceChildren();
  // The recursive function itself: draw a branch, then call itself twice.
  function grow(x, y, angle, length, level) {
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    const line = el(
      "line",
      { x1: x, y1: y, x2, y2, class: "branch lvl" + Math.min(level, 5), "stroke-width": Math.max(1.2, 7 - level * 1.2) },
      svg,
    );
    if (animate && level === depth) {
      const len = Math.hypot(x2 - x, y2 - y);
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      requestAnimationFrame(() => requestAnimationFrame(() => (line.style.strokeDashoffset = 0)));
    }
    if (level === depth) {
      el("circle", { cx: x2, cy: y2, r: 3.2, class: "tip" + (animate ? " pop" : "") }, svg);
      return; // base case
    }
    grow(x2, y2, angle - 0.46, length * 0.72, level + 1);
    grow(x2, y2, angle + 0.46, length * 0.72, level + 1);
  }
  grow(200, 282, -Math.PI / 2, 78, 0);
  byId("grow-calls").textContent = 2 ** (depth + 1) - 1;
}
function setGrow(depth, user = false) {
  if (user) clearTimers();
  growDepth = depth;
  growSelect(depth);
  growTree(depth, !motion.matches);
}

// ---------- 3. Call stack ----------
// Call tree of grow(2): 7 calls. Positions for a small binary tree diagram.
const stackNodes = [];
(function build(id, depth, x, y, spread, parent) {
  stackNodes.push({ id, depth, x, y, parent });
  if (depth === 0) return;
  build(stackNodes.length, depth - 1, x - spread, y + 72, spread / 2, id);
  build(stackNodes.length, depth - 1, x + spread, y + 72, spread / 2, id);
})(0, 2, 180, 30, 92, -1);
// Event list in execution order: enter a call, later return from it.
const stackEvents = [];
(function walk(id) {
  stackEvents.push({ type: "call", id });
  stackNodes.filter((n) => n.parent === id).forEach((child) => walk(child.id));
  stackEvents.push({ type: "return", id });
})(0);
let stackIndex = -1,
  stackRunning = false;
function drawStack() {
  const svg = byId("stack-tree");
  svg.replaceChildren();
  const done = new Set(),
    open = [];
  for (let i = 0; i <= stackIndex; i++) {
    const e = stackEvents[i];
    if (e.type === "call") open.push(e.id);
    else {
      open.pop();
      done.add(e.id);
    }
  }
  const current = open[open.length - 1];
  for (const n of stackNodes)
    if (n.parent >= 0) {
      const p = stackNodes[n.parent];
      el("line", { x1: p.x, y1: p.y, x2: n.x, y2: n.y, class: "edge" + (open.includes(n.id) ? " live" : "") }, svg);
    }
  for (const n of stackNodes) {
    const state = n.id === current ? "active" : open.includes(n.id) ? "waiting" : done.has(n.id) ? "done" : "idle";
    const g = el("g", { class: "node " + state }, svg);
    el("circle", { cx: n.x, cy: n.y, r: 19 }, g);
    const t = el("text", { x: n.x, y: n.y + 4.5, "text-anchor": "middle" }, g);
    t.textContent = n.depth;
  }
  const frames = byId("stack-frames");
  frames.replaceChildren(
    ...open
      .slice()
      .reverse()
      .map((id, i) => {
        const li = document.createElement("li");
        li.textContent = "grow(depth " + stackNodes[id].depth + ")";
        if (i === 0) li.className = "top";
        return li;
      }),
  );
  const e = stackEvents[stackIndex];
  byId("stack-status").textContent = !e
    ? "Press Run"
    : stackIndex === stackEvents.length - 1
      ? "Done: 7 calls, all returned"
      : e.type === "call"
        ? stackNodes[e.id].depth === 0
          ? "depth 0: base case, stop"
          : "call grow(depth " + stackNodes[e.id].depth + ")"
        : "return from depth " + stackNodes[e.id].depth;
}
function stackStep() {
  if (stackIndex >= stackEvents.length - 1) stackIndex = -1;
  stackIndex++;
  drawStack();
}
function runStack() {
  clearTimers();
  stackRunning = true;
  stackIndex = -1;
  const tick = () => {
    stackStep();
    if (stackIndex < stackEvents.length - 1 && stackRunning) later(tick, 650);
    else stackRunning = false;
  };
  tick();
}

// ---------- 4. Split time into notes ----------
const scale = [0, 2, 4, 7, 9, 12, 14, 16];
let splitDepth = 3,
  splitSelect,
  audio;
function splitNotes(depth) {
  const notes = [];
  (function divide(left, right, level, parent) {
    const point = (left + right) / 2;
    const id = notes.length;
    notes.push({ id, point, level, parent });
    if (level === depth) return; // base case
    divide(left, point, level + 1, id);
    divide(point, right, level + 1, id);
  })(0, 1, 0, -1);
  return notes;
}
function drawSplit(active = new Set()) {
  const svg = byId("split-svg");
  svg.replaceChildren();
  const notes = splitNotes(splitDepth);
  const x = (p) => 30 + p * 540,
    y = (l) => 40 + l * (170 / Math.max(1, splitDepth));
  // time axis
  el("line", { x1: 30, y1: 232, x2: 570, y2: 232, class: "axis" }, svg);
  const label = el("text", { x: 570, y: 248, "text-anchor": "end", class: "axis-label" }, svg);
  label.textContent = "time →";
  for (const n of notes) {
    if (n.parent >= 0) {
      const p = notes[n.parent];
      el("line", { x1: x(p.point), y1: y(p.level), x2: x(n.point), y2: y(n.level), class: "edge" }, svg);
    }
    el("line", { x1: x(n.point), y1: y(n.level), x2: x(n.point), y2: 232, class: "drop" + (active.has(n.id) ? " on" : "") }, svg);
  }
  for (const n of notes)
    el("circle", { cx: x(n.point), cy: y(n.level), r: Math.max(4, 10 - n.level * 1.6), class: "note lvl" + n.level + (active.has(n.id) ? " on" : "") }, svg);
}
function playSplit() {
  clearTimers();
  const notes = splitNotes(splitDepth).sort((a, b) => a.point - b.point);
  if (!audio) audio = new AudioContext();
  audio.resume();
  const span = 4.2,
    start = audio.currentTime + 0.08;
  const lit = new Set();
  for (const n of notes) {
    const t = start + n.point * span;
    const osc = audio.createOscillator(),
      gain = audio.createGain(),
      pan = audio.createStereoPanner();
    osc.type = "sine";
    osc.frequency.value = 293.66 * 2 ** (scale[n.level] / 12);
    const peak = 0.22 * 0.78 ** n.level;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    pan.pan.value = (n.point - 0.5) * 1.2;
    osc.connect(gain).connect(pan).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 1.7);
    later(() => {
      lit.add(n.id);
      drawSplit(lit);
    }, (t - audio.currentTime) * 1000);
  }
  later(() => drawSplit(), (span + 1.4) * 1000);
}

// ---------- page lifecycle ----------
let ready = false;
function setup() {
  growSelect = stepper(byId("grow-steps"), [0, 1, 2, 3, 4, 5, 6], 0, setGrow);
  splitSelect = stepper(byId("split-steps"), [1, 2, 3, 4], splitDepth, (d) => {
    clearTimers();
    splitDepth = d;
    splitSelect(d);
    drawSplit();
  });
  byId("stack-play").onclick = runStack;
  byId("stack-next").onclick = () => {
    clearTimers();
    stackRunning = false;
    stackStep();
  };
  byId("split-play").onclick = playSplit;
  ready = true;
}
export function enter() {
  if (!ready) setup();
  clearTimers();
  stackIndex = -1;
  drawStack();
  drawSplit();
  if (motion.matches) return setGrow(4);
  // Grow the tree on arrival, one level at a time.
  setGrow(0);
  for (let d = 1; d <= 4; d++) later(() => setGrow(d), d * 650);
}
export function leave() {
  clearTimers();
  stackRunning = false;
  if (audio) audio.close();
  audio = null;
}
