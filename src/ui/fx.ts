// Efectos de animación fuera de React: cartas que vuelan, rebotes y confeti.
// Todo pasa en una capa fija sin eventos de puntero y respeta «reducir movimiento».

export function reducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export type Point = { x: number; y: number };
export type Spot = Element | Point | null | undefined;

let layer: HTMLDivElement | null = null;
function fxLayer(): HTMLDivElement {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }
  return layer;
}

export function visible(el: Element | null | undefined): el is Element {
  return !!el && el.getClientRects().length > 0;
}

export function firstVisible(selectors: string[]): Element | null {
  for (const s of selectors) {
    for (const el of document.querySelectorAll(s)) if (visible(el)) return el;
  }
  return null;
}

function pointOf(s: Spot): Point | null {
  if (!s) return null;
  if (s instanceof Element) {
    if (!visible(s)) return null;
    const r = s.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return s;
}

/** Copia del dibujo de una carta desde los modelos ocultos que pinta React (así el arte vive en un solo lugar). */
function cardNode(card: string): Node | null {
  const svg = document.querySelector(`.fx-sprites [data-sprite="${card}"] svg`);
  return svg ? svg.cloneNode(true) : null;
}

export interface Flight {
  from: Spot;
  to: Spot;
  /** recurso, «back» (carta tapada) o «dev» (carta de desarrollo) */
  card: string;
  delay?: number;
  /** termina desvaneciéndose (al banco o a la basura) */
  vanish?: boolean;
}

/** Lanza cartas en arco de un punto a otro; al llegar, el destino da un saltito. */
export function fly(flights: Flight[]) {
  if (reducedMotion() || typeof document === 'undefined') return;
  const L = fxLayer();
  for (const f of flights) {
    const a = pointOf(f.from);
    const b = pointOf(f.to);
    const node = cardNode(f.card);
    if (!a || !b || !node) continue;
    const el = document.createElement('div');
    el.className = 'fx-card';
    el.appendChild(node);
    el.style.left = `${a.x}px`;
    el.style.top = `${a.y}px`;
    L.appendChild(el);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lift = Math.min(110, 34 + Math.hypot(dx, dy) * 0.2);
    const end = f.vanish ? 0 : 0.9;
    const anim = el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(.25)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1.15)', opacity: 1, offset: 0.16 },
        { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - lift}px)) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6)`, opacity: end },
      ],
      { duration: 920, delay: f.delay ?? 0, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'backwards' },
    );
    anim.onfinish = () => {
      el.remove();
      if (!f.vanish && f.to instanceof Element) bump(f.to);
    };
    anim.oncancel = () => el.remove();
  }
}

export function bump(el: Element) {
  if (reducedMotion()) return;
  (el as HTMLElement).animate?.(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
    { duration: 280, easing: 'cubic-bezier(.3,1.6,.5,1)' },
  );
}

/** Confeti en los colores de los jugadores, para el final de la partida. */
export function confetti(colors: string[], count = 120) {
  if (reducedMotion() || typeof document === 'undefined' || !colors.length) return;
  const L = fxLayer();
  const W = window.innerWidth;
  const H = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('i');
    el.className = 'fx-confetti';
    const w = 6 + Math.random() * 7;
    el.style.width = `${w}px`;
    el.style.height = `${w * 0.42}px`;
    el.style.background = colors[i % colors.length];
    el.style.left = `${Math.random() * W}px`;
    el.style.top = '-16px';
    L.appendChild(el);
    const sway = (Math.random() - 0.5) * 220;
    const spin = (Math.random() - 0.5) * 1440;
    const anim = el.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${sway * 0.6}px, ${H * 0.5}px) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${sway}px, ${H + 40}px) rotate(${spin}deg)`, opacity: 0.85 },
      ],
      { duration: 2200 + Math.random() * 1600, delay: Math.random() * 700, easing: 'cubic-bezier(.3,.55,.45,1)', fill: 'backwards' },
    );
    anim.onfinish = () => el.remove();
  }
}
