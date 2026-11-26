import { clamp, presets, randomSource } from "./recursion.js";

const palettes = [
  {
    sky: "#071620",
    light: "82,220,239",
    far: "20,87,110",
    twig: "177,247,244",
    tilt: -0.13,
    fan: 0.62,
  },
  {
    sky: "#181224",
    light: "240,136,206",
    far: "105,52,119",
    twig: "255,209,232",
    tilt: 0.08,
    fan: 0.76,
  },
  {
    sky: "#201710",
    light: "255,160,88",
    far: "115,63,34",
    twig: "255,221,165",
    tilt: 0.16,
    fan: 0.87,
  },
];
const rgba = (rgb, alpha) => "rgba(" + rgb + "," + alpha + ")";
const tau = 2 * Math.PI;
function haze(ctx, x, y, radius, rgb, strength) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgba(rgb, strength));
  gradient.addColorStop(0.4, rgba(rgb, strength * 0.35));
  gradient.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
}
function line(ctx, a, b, control, progress = 1) {
  const mid = {
    x: a.x + (control.x - a.x) * progress,
    y: a.y + (control.y - a.y) * progress,
  };
  const end = {
    x:
      (1 - progress) ** 2 * a.x +
      2 * (1 - progress) * progress * control.x +
      progress ** 2 * b.x,
    y:
      (1 - progress) ** 2 * a.y +
      2 * (1 - progress) * progress * control.y +
      progress ** 2 * b.y,
  };
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y);
  ctx.stroke();
}
function atmosphere(ctx, palette, random) {
  ctx.fillStyle = palette.sky;
  ctx.fillRect(0, 0, 1000, 570);
  haze(ctx, 510, 285, 460, palette.far, 0.65);
  haze(ctx, 520, 410, 300, palette.light, 0.11);
  for (let i = 0; i < 590; i++) {
    const x = random() * 1000,
      y = random() * 560,
      size = random() > 0.94 ? 1.4 : 0.65;
    ctx.fillStyle = rgba(palette.twig, 0.12 + random() * 0.53);
    ctx.fillRect(x, y, size, size);
  }
  ctx.strokeStyle = rgba(palette.light, 0.13);
  ctx.lineWidth = 0.75;
  for (const r of [126, 190, 242]) {
    ctx.beginPath();
    ctx.ellipse(524, 339, r * 1.45, r * 0.77, -0.28, 3.38, 5.68);
    ctx.stroke();
  }
  // A quiet horizon and its interference lines anchor the tree in its field.
  for (let i = 0; i < 58; i++) {
    const y = 456 + i * 2.15,
      drift = random() * 120;
    ctx.beginPath();
    ctx.moveTo(70 + drift, y);
    ctx.bezierCurveTo(260, y - 9, 490, y + 5, 620 + random() * 320, y - 4);
    ctx.strokeStyle = rgba(palette.light, 0.025 + random() * 0.08);
    ctx.stroke();
  }
}
function treeLayout(phrase, settings) {
  const palette = palettes[settings.index],
    geometry = new Map();
  const origin = {
    x: 497,
    y: 483,
    angle: -Math.PI / 2 + palette.tilt,
    length: 127,
  };
  for (const note of phrase.notes) {
    const parent = geometry.get(note.parent);
    const a = parent ? parent.b : origin;
    const jitter = note.variant - 0.5;
    const angle = parent
      ? parent.angle +
        note.side *
          (palette.fan * 0.86 ** Math.max(0, note.level - 1) +
            (settings.spread - 50) / 180 +
            jitter * 0.34) +
        palette.tilt * 0.18
      : origin.angle;
    const length = parent
      ? parent.length * (0.74 + note.variant * 0.13)
      : origin.length;
    const b = {
      x: a.x + Math.cos(angle) * length * 1.22,
      y: a.y + Math.sin(angle) * length,
    };
    const bend = (parent ? note.side : 1) * (0.16 + jitter * 0.1);
    const control = {
      x: (a.x + b.x) / 2 + Math.sin(angle) * length * bend,
      y: (a.y + b.y) / 2 - Math.cos(angle) * length * bend,
    };
    geometry.set(note.id, { note, a, b, control, angle, length });
  }
  const items = [...geometry.values()];
  const xs = [],
    ys = [];
  for (const { a, b, control, length, note } of items) {
    const plume = note.leaf ? length * 0.92 : 0;
    xs.push(a.x, control.x, b.x - plume, b.x + plume);
    ys.push(a.y, control.y, b.y - plume, b.y + plume);
  }
  const left = Math.min(...xs),
    right = Math.max(...xs),
    top = Math.min(...ys),
    bottom = Math.max(...ys);
  const scale = Math.min(1.24, 865 / (right - left), 440 / (bottom - top));
  const visited = new Set();
  for (const branch of items) {
    for (const p of [branch.a, branch.b, branch.control]) {
      if (visited.has(p)) continue;
      visited.add(p);
      p.x = 500 + (p.x - (left + right) / 2) * scale;
      p.y = 486 + (p.y - bottom) * scale;
    }
    branch.length *= scale;
  }
  return geometry;
}
function filament(ctx, branch, palette, random) {
  const { a, b, control, note, angle, length } = branch;
  const width = 8.5 * 0.73 ** note.level + 0.5;
  ctx.strokeStyle = rgba(palette.light, 0.13);
  ctx.lineWidth = width * 1.9;
  line(ctx, a, b, control);
  for (let j = 0; j < Math.ceil(width * 2.4); j++) {
    const spread = (random() - 0.5) * width * 3.5;
    const offset = {
      x: control.x + Math.sin(angle) * spread,
      y: control.y - Math.cos(angle) * spread,
    };
    ctx.strokeStyle = rgba(
      j % 4 ? palette.light : palette.twig,
      0.25 + random() * 0.55,
    );
    ctx.lineWidth = 0.42 + random() * 0.7;
    line(ctx, { x: a.x + (random() - 0.5) * width, y: a.y }, b, offset);
  }
  // Small barbs follow the limb tangent, making the stroke read like a feather.
  // These decorative filaments never add musical nodes or change the note timing.
  if (note.level >= 2) {
    const count = note.leaf ? 36 : 20;
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count,
        inv = 1 - u;
      const start = {
        x: inv * inv * a.x + 2 * inv * u * control.x + u * u * b.x,
        y: inv * inv * a.y + 2 * inv * u * control.y + u * u * b.y,
      };
      const side = i % 2 === 0 ? -1 : 1;
      const size =
        length * (0.06 + 0.28 * Math.sin(Math.PI * u)) * (0.5 + random());
      const dir = angle + side * (0.44 + random() * 0.6);
      const tip = {
        x: start.x + size * Math.cos(dir),
        y: start.y + size * Math.sin(dir),
      };
      const mid = {
        x: start.x + size * Math.cos(angle) * 0.62,
        y: start.y + size * Math.sin(angle) * 0.62,
      };
      ctx.lineWidth = 0.52;
      ctx.strokeStyle = rgba(palette.twig, 0.23 + 0.25 * random());
      line(ctx, start, tip, mid);
      ctx.fillStyle = rgba(palette.light, 0.5);
      ctx.fillRect(tip.x, tip.y, 1.1, 1.1);
    }
  }
  if (note.leaf) {
    // A luminous plume marks a terminal note. Only the large endpoints are score events.
    for (let strand = 0; strand < 58; strand++) {
      const direction = angle + (random() - 0.5) * 1.18,
        distance = (0.16 + random() * 0.88) * length * 1.09;
      const end = {
        x: b.x + Math.cos(direction) * distance * 1.22,
        y: b.y + Math.sin(direction) * distance,
      };
      const cp = {
        x: b.x + Math.cos(angle) * distance * 0.65,
        y: b.y + Math.sin(angle) * distance * 0.65,
      };
      ctx.strokeStyle = rgba(palette.twig, 0.09 + random() * 0.29);
      ctx.lineWidth = 0.55;
      line(ctx, b, end, cp);
      ctx.fillStyle = rgba(palette.twig, 0.22 + random() * 0.65);
      ctx.fillRect(end.x, end.y, 0.8 + random() * 1.1, 0.8 + random() * 1.1);
    }
  }
  ctx.fillStyle = rgba(palette.twig, 0.86);
  ctx.beginPath();
  ctx.arc(b.x, b.y, note.level === 0 ? 2.7 : 1.75, 0, tau);
  ctx.fill();
}
function fit(ctx, width, height) {
  const scale = Math.min(width / 1000, height / 570);
  ctx.setTransform(
    scale,
    0,
    0,
    scale,
    (width - 1000 * scale) / 2,
    (height - 570 * scale) / 2,
  );
}
// Cache the still field per phrase and size. Playback only draws active edges and nodes.
export function makeField(canvas, score, settings, phraseIndex = 0) {
  const phrase = score.phrases[phraseIndex],
    palette = palettes[settings.index];
  const geometry = treeLayout(phrase, settings);
  const base = document.createElement("canvas");
  base.width = canvas.width;
  base.height = canvas.height;
  const ctx = base.getContext("2d");
  ctx.fillStyle = palette.sky;
  ctx.fillRect(0, 0, base.width, base.height);
  fit(ctx, base.width, base.height);
  const random = randomSource(settings.seed + phraseIndex * 127);
  atmosphere(ctx, palette, random);
  const background = document.createElement("canvas");
  background.width = base.width;
  background.height = base.height;
  background.getContext("2d").drawImage(base, 0, 0);
  const origin = geometry.get(0).a;
  for (const branch of geometry.values())
    filament(ctx, branch, palette, random);
  haze(ctx, origin.x, origin.y, 32, palette.light, 0.45);
  ctx.fillStyle = rgba(palette.twig, 0.9);
  ctx.fillRect(origin.x - 3, origin.y - 1, 6, 2);
  const grown = document.createElement("canvas");
  grown.width = base.width;
  grown.height = base.height;
  return {
    base,
    background,
    grown,
    geometry,
    palette,
    phrase,
    origin,
    lit: new Set(),
    last: -1,
  };
}
export function drawField(
  canvas,
  field,
  time = null,
  reduced = false,
  cadenceTime = null,
) {
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(field.base, 0, 0);
  if (time === null) return;
  if (!reduced) {
    const grow = field.grown.getContext("2d");
    if (field.last < 0 || time < field.last) {
      grow.setTransform(1, 0, 0, 1, 0, 0);
      grow.drawImage(field.background, 0, 0);
      grow.globalAlpha = 0.2;
      grow.drawImage(field.base, 0, 0);
      grow.globalAlpha = 1;
      field.lit.clear();
    }
    fit(grow, canvas.width, canvas.height);
    for (const branch of field.geometry.values()) {
      if (branch.note.time > time || field.lit.has(branch.note.id)) continue;
      filament(grow, branch, field.palette, randomSource(branch.note.id + 731));
      field.lit.add(branch.note.id);
    }
    field.last = time;
    ctx.drawImage(field.grown, 0, 0);
  }
  fit(ctx, canvas.width, canvas.height);
  for (const branch of field.geometry.values()) {
    const elapsed = time - branch.note.time;
    if (elapsed < 0 || elapsed > 1.35) continue;
    const opacity = 1 - elapsed / 1.35,
      { a, b, control } = branch;
    let ancestor = field.geometry.get(branch.note.parent);
    ctx.strokeStyle = rgba(field.palette.twig, opacity * 0.52);
    ctx.lineWidth = 1.6;
    while (ancestor) {
      line(ctx, ancestor.a, ancestor.b, ancestor.control);
      ancestor = field.geometry.get(ancestor.note.parent);
    }
    ctx.strokeStyle = rgba(field.palette.twig, opacity);
    ctx.lineWidth = 2;
    line(ctx, a, b, control, reduced ? 1 : clamp(elapsed / 0.24, 0, 1));
    if (!reduced)
      haze(
        ctx,
        b.x,
        b.y,
        12 + elapsed * 15,
        field.palette.light,
        opacity * 0.68,
      );
    ctx.fillStyle = rgba("255,250,241", opacity);
    ctx.beginPath();
    ctx.arc(b.x, b.y, reduced ? 3 : 2.5 + opacity * 3, 0, tau);
    ctx.fill();
  }
  if (cadenceTime !== null && time >= cadenceTime && time < cadenceTime + 2) {
    haze(
      ctx,
      field.origin.x,
      field.origin.y,
      reduced ? 12 : 32,
      field.palette.twig,
      0.8 * (1 - (time - cadenceTime) / 2),
    );
  }
}
// Note density over time. Bars before `progress` (0–1) are drawn brighter, so the
// strip doubles as a progress bar that lines up exactly with the playhead.
export function drawScoreStrip(canvas, score, index, progress = 0) {
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const bins = Array(108).fill(0);
  for (const n of score.events) {
    const bin = Math.min(107, Math.floor((n.time / score.duration) * 108));
    bins[bin] += n.velocity * (0.7 + n.variant);
  }
  const max = Math.max(...bins, 1);
  const color = presets[index].color;
  bins.forEach((value, i) => {
    const height = 2 + ((h - 3) * value) / max;
    ctx.fillStyle = color;
    ctx.globalAlpha = (i + 0.5) / bins.length <= progress ? 0.9 : 0.34;
    ctx.fillRect(
      (i * w) / bins.length,
      (h - height) / 2,
      Math.max(1, w / bins.length - 1.5),
      height,
    );
  });
  ctx.globalAlpha = 1;
}
