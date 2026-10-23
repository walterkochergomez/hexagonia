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
