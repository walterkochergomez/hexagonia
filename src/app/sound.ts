import { prefs } from './prefs';

let ctx: AudioContext | null = null;

/** Dos notas suaves para avisar que te toca. */
export function chime() {
  if (!prefs.get().sound) return;
  try {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    [523.25, 783.99].forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.12);
      g.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35);
      o.connect(g).connect(ctx!.destination);
      o.start(now + i * 0.12);
      o.stop(now + i * 0.12 + 0.4);
    });
  } catch {
    /* sin audio */
  }
}

/** Traqueteo corto de dados: golpecitos de ruido filtrado con ritmo irregular. */
export function diceSound() {
  if (!prefs.get().sound) return;
  try {
    ctx ??= new AudioContext();
    const c = ctx;
    const now = c.currentTime;
    const len = Math.floor(c.sampleRate * 0.03);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const hits = [0, 0.07, 0.15, 0.2, 0.29, 0.36, 0.48, 0.56];
    hits.forEach((at, i) => {
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1800 + Math.random() * 1600;
      f.Q.value = 2.5;
      const g = c.createGain();
      g.gain.value = (i === hits.length - 1 ? 0.22 : 0.12) * (0.7 + Math.random() * 0.6);
      src.connect(f).connect(g).connect(c.destination);
      src.start(now + at + Math.random() * 0.02);
    });
  } catch {
    /* sin audio */
  }
}
