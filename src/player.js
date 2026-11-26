import { clamp, sanitize } from "./recursion.js";
import { waveFile } from "./synth.js";
export class Player {
  constructor() {
    this.level = 0.6;
    this.loop = false;
    this.offset = 0;
    this.quick = new Map();
    this.full = new Map();
    this.pending = null;
    this.background = null;
  }
  unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.level;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.samples = new Float32Array(this.analyser.fftSize);
      this.smoothed = 0;
      this.analyser.connect(this.master);
      this.master.connect(this.context.destination);
    }
    return this.context.resume();
  }
  energy() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    let sum = 0;
    for (const sample of this.samples) sum += sample * sample;
    const rms = Math.sqrt(sum / this.samples.length);
    this.smoothed += 0.28 * (Math.min(1, rms * 8) - this.smoothed);
    return this.smoothed;
  }
  // Delay between the audio clock and what reaches the speaker (larger on phones and
  // Bluetooth). The visuals subtract it so they follow the sound the listener hears.
  latency() {
    if (!this.context) return 0;
    const value = this.context.outputLatency || this.context.baseLatency || 0;
    return Math.min(0.5, Math.max(0, value));
  }
  setVolume(value) {
    this.level = clamp(value, 0, 1);
    if (this.master)
      this.master.gain.setTargetAtTime(
        this.level,
        this.context.currentTime,
        0.025,
      );
  }
  position() {
    if (!this.active) return this.offset;
    const elapsed =
      this.context.currentTime - this.active.started + this.active.offset;
    const duration = this.active.buffer.duration;
    if (this.loop && elapsed >= duration)
      return 1 + ((elapsed - duration) % (duration - 1));
    return Math.min(elapsed, duration);
  }
  silence(fade = 0.045) {
    this.offset = this.position();
    const old = this.active;
    this.active = null;
    if (!old) return;
    const now = this.context.currentTime;
    old.source.onended = null;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0, now + fade);
    old.source.stop(now + fade + 0.02);
    old.source.onended = () => {
      old.source.disconnect();
      old.gain.disconnect();
    };
  }
  static key(settings) {
    return JSON.stringify(sanitize(settings));
  }
  // Keep recently used renders. Openings are small (16 s); full pieces are large,
  // so only the two most recent full renders are kept.
  remember(cache, key, track, limit) {
    cache.delete(key);
    cache.set(key, track);
    while (cache.size > limit) cache.delete(cache.keys().next().value);
  }
  cancelPending() {
    if (!this.pending) return;
    this.pending.worker.terminate();
    this.pending.reject(new DOMException("Superseded", "AbortError"));
    this.pending = null;
  }
  // Start a render worker. Each job posts the quick opening first (unless mode is
  // "full"), then the full piece (unless mode is "quick").
  spawn(key, settings, mode) {
    const worker = new Worker(new URL("./audio-worker.js", import.meta.url), {
      type: "module",
    });
    const job = { key, worker, listeners: [], quickTrack: null };
    const finish = () => {
      worker.terminate();
      if (this.pending === job) this.pending = null;
      if (this.background === job) this.background = null;
    };
    job.promise = new Promise((resolve, reject) => {
      job.reject = reject;
      worker.onmessage = ({ data }) => {
        if (data.kind === "error") {
          finish();
          reject(new Error(data.error));
          return;
        }
        const track = {
          key,
          pcm: data,
          buffer: null,
          looped: false,
          partial: data.kind === "quick",
        };
        if (track.partial) {
          this.remember(this.quick, key, track, 8);
          job.quickTrack = track;
          for (const listener of job.listeners.splice(0)) listener(track);
          if (mode === "quick") {
            finish();
            resolve(track);
          }
          return;
        }
        this.remember(this.full, key, track, 2);
        finish();
        resolve(track);
      };
      worker.onerror = (event) => {
        finish();
        reject(new Error(event.message || "Rendering failed"));
      };
    });
    worker.postMessage({ settings, mode });
    return job;
  }
  // Resolves with the full render. onQuick(track) is called as soon as an opening
  // render is available (immediately if it is cached), so playback can begin at once.
  prepare(settings, onQuick = null) {
    const key = Player.key(settings);
    const full = this.full.get(key);
    if (full) return Promise.resolve(full);
    if (this.pending?.key === key) {
      if (onQuick) {
        const ready = this.pending.quickTrack || this.quick.get(key);
        if (ready) queueMicrotask(() => onQuick(ready));
        else this.pending.listeners.push(onQuick);
      }
      return this.pending.promise;
    }
    this.cancelPending();
    const quick = this.quick.get(key);
    if (quick && onQuick) queueMicrotask(() => onQuick(quick));
    const job = this.spawn(key, settings, quick ? "full" : "both");
    if (onQuick && !quick) job.listeners.push(onQuick);
    this.pending = job;
    return job.promise;
  }
  // Render the openings of likely choices in the background, one at a time, so
  // pressing Play on them starts instantly.
  async prewarm(list) {
    for (const settings of list) {
      const key = Player.key(settings);
      if (this.quick.has(key) || this.full.has(key)) continue;
      const job = this.spawn(key, settings, "quick");
      this.background = job;
      await job.promise.catch(() => {});
    }
  }
  start(track, offset = 0, fade = 0.055) {
    const ctx = this.context;
    if (!track.buffer) {
      track.buffer = ctx.createBuffer(
        2,
        track.pcm.left.length,
        track.pcm.sampleRate,
      );
      track.buffer.copyToChannel(track.pcm.left, 0);
      track.buffer.copyToChannel(track.pcm.right, 1);
    }
    if (!track.partial && track.looped !== this.loop) {
      const count = track.pcm.sampleRate,
        end = track.buffer.length - count;
      for (const [ch, raw] of [track.pcm.left, track.pcm.right].entries()) {
        const tail = raw.slice(end);
        if (this.loop)
          for (let i = 0; i < count; i++) {
            const angle = ((i / (count - 1)) * Math.PI) / 2;
            tail[i] = tail[i] * Math.cos(angle) + raw[i] * Math.sin(angle);
          }
        track.buffer.copyToChannel(tail, ch, end);
      }
      track.looped = this.loop;
    }
    this.silence(fade);
    const source = ctx.createBufferSource(),
      gain = ctx.createGain(),
      now = ctx.currentTime;
    source.buffer = track.buffer;
    source.loop = this.loop && !track.partial;
    source.loopStart = 1;
    source.loopEnd = track.buffer.duration;
    source.connect(gain);
    gain.connect(this.analyser);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + fade);
    const start = clamp(offset, 0, track.buffer.duration - 0.025);
    this.active = {
      source,
      gain,
      buffer: track.buffer,
      started: now,
      offset: start,
      track,
    };
    source.onended = () => {
      if (this.active?.source === source) {
        this.active = null;
        if (track.partial) {
          // The opening ran out before the full render arrived: hold the place.
          this.offset = track.buffer.duration;
          this.onstall?.();
        } else {
          this.offset = 0;
          this.onend?.();
        }
      }
      source.disconnect();
      gain.disconnect();
    };
    source.start(now, start);
  }
  async download(settings, name, prepared = null) {
    const track = prepared || (await this.prepare(settings));
    const blob = new Blob([waveFile(track.pcm, 1)], { type: "audio/wav" });
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
