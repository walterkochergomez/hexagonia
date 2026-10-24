import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject, type WheelEvent } from 'react';
import { graphOf } from '../engine/geometry';
import type { GameState } from '../engine/types';
import { useT } from '../app/i18n';
import { prefs, usePrefs } from '../app/prefs';
import { CamelShape, CardIcon, CityShape, FleetShape, FortShape, GiftToken, Huts, KnightShape, LandingFlag, MerchantShape, RobberShape, SettlementShape, ShipShape, VillageShape } from './art';
import { portName } from './format';
import { Coast, NumberToken, Palm, R, SX, SY, SeaFace, TOP_POINTS, TileDefs, TileFace, hexPoints, turn, type LandTerrain } from './tiles';
import type { FishGround } from '../engine/types';
import { reducedMotion } from './fx';

const px = (X: number, Y: number): [number, number] => [X * SX, Y * SY];
const BASE_POINTS = hexPoints(1);
/** Inclinación de la vista en perspectiva (grados). */
export const TILT = 40;
const TILT_COS = Math.cos((TILT * Math.PI) / 180);

export interface Targets {
  vertices?: string[];
  edges?: string[];
  hexes?: string[];
  selected?: string[];
}

interface Props {
  view: GameState;
  targets: Targets | null;
  onPick?: (kind: 'vertex' | 'edge' | 'hex', id: string) => void;
  /** Números que acaban de salir: sus casillas se iluminan cuando terminan de rodar los dados. */
  flash: { key: string; numbers: number[] } | null;
  /** capas encima del tablero (dados, avisos), sin eventos de puntero */
  children?: ReactNode;
  /** Ilustración fija (manuales): sin gestos, sin herramientas, sin giro ni inclinación. */
  still?: boolean;
  /** con `still`: número cuyas casillas se ven encendidas */
  lit?: number | null;
  /** con `still`: dibujo extra encima de las piezas, en coordenadas del tablero */
  overlay?: (at: BoardPos) => ReactNode;
  /** con `still`: descripción para lectores de pantalla */
  label?: string;
  /** con `still`: false si la página ya tiene las definiciones de las fichas */
  defs?: boolean;
  /** con `still`: margen extra alrededor (arriba, derecha, abajo, izquierda) para dibujos que salen de la isla */
  pad?: [number, number, number, number];
}

export interface BoardPos {
  v: (id: string) => [number, number];
  e: (id: string) => [number, number];
  h: (id: string) => [number, number];
}

/** Claves que aparecieron desde la última vez (para que las piezas nuevas caigan en su lugar). */
function useFresh(keys: string[]): Set<string> {
  const prev = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const sig = keys.join('|');
  useLayoutEffect(() => {
    const now = new Set(keys);
    const before = prev.current;
    prev.current = now;
    if (!before || reducedMotion()) return;
    const added = keys.filter((k) => !before.has(k));
    if (!added.length) return;
    setFresh(new Set(added));
    const id = setTimeout(() => setFresh(new Set()), 1100);
    return () => clearTimeout(id);
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  return fresh;
}

/** Hace saltar una pieza desde su casilla anterior. */
function useHop(ref: RefObject<SVGGElement | null>, pos: [number, number] | null, posKey: string | null) {
  const prev = useRef<{ key: string | null; pos: [number, number] | null }>({ key: posKey, pos });
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = { key: posKey, pos };
    if (!before.pos || !pos || before.key === posKey || reducedMotion()) return;
    const dx = before.pos[0] - pos[0];
    const dy = before.pos[1] - pos[1];
    ref.current?.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: `translate(${dx / 2}px, ${dy / 2 - 34}px) scale(1.12)`, offset: 0.5 },
        { transform: 'translate(0px, 0px)' },
      ],
      { duration: 680, easing: 'cubic-bezier(.35,.65,.35,1)' },
    );
  }, [posKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Board({ view, targets, onPick, flash, children, still = false, lit: litFixed = null, overlay, label, defs = true, pad }: Props) {
  const t = useT();
  const prefsNow = usePrefs();
  // el tablero gira en pasos de 60°: como las casillas son hexágonos, basta con mover los centros y todo queda derecho
  const rot = still ? 0 : (prefsNow.boardRot % 6) * 60;
  const boardTilt = !still && prefsNow.boardTilt;
  const boardRot = prefsNow.boardRot;
  const g = graphOf(view.board.hexes);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tf, setTf] = useState({ x: 0, y: 0, k: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; startX: number; startY: number; dist: number; k: number } | null>(null);
  const suppress = useRef(0);

  // casillas que producen: se encienden cuando los dados ya se detuvieron
  const [litNow, setLit] = useState<{ key: string; numbers: number[] } | null>(null);
  const lit = still ? (litFixed ? { key: 'fig', numbers: [litFixed] } : null) : litNow;
  const shownFlash = useRef(flash?.key); // la tirada que ya estaba al abrir la partida no se repite
  useEffect(() => {
    if (!flash || flash.key === shownFlash.current) return;
    shownFlash.current = flash.key;
    const on = setTimeout(() => setLit(flash), reducedMotion() ? 0 : 700);
    const off = setTimeout(() => setLit(null), reducedMotion() ? 900 : 2400);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [flash?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const at = (X: number, Y: number): [number, number] => turn(px(X, Y), rot);
  const vpos = (v: string) => at(g.vertices[v].X, g.vertices[v].Y);
  const hpos = (h: string) => at(g.hexes[h].X, g.hexes[h].Y);
  /** Marca del caladero: en el mar, frente a los tres cruces de la costa. */
  const groundPos = (gr: FishGround): [number, number] => {
    const c = hpos(gr.hex);
    const vs = gr.vertices.map(vpos);
    const k: [number, number] = [(vs[0][0] + vs[1][0] + vs[2][0]) / 3, (vs[0][1] + vs[1][1] + vs[2][1]) / 3];
    return [k[0] + (c[0] - k[0]) * 0.62, k[1] + (c[1] - k[1]) * 0.62];
  };
  /** Río: curva suave por el centro de sus casillas y los lados que cruza, hasta la desembocadura. */
  const riverPath = (r: string[], i: number): string => {
    const cr = view.river!.crossings;
    const mids: string[] = [];
    // los cruces se guardaron río por río: (largo - 1) internos y la desembocadura
    let k = 0;
    for (let j = 0; j < i; j++) k += view.river!.rivers[j].length;
    for (let j = 0; j < r.length; j++) mids.push(cr[k + j]);
    const pts: [number, number][] = [];
    const c0 = hpos(r[0]);
    pts.push([c0[0], c0[1] - 14]);
    for (let j = 0; j < r.length; j++) {
      if (j > 0) pts.push(hpos(r[j]));
      const m = mids[j];
      if (m) pts.push(at(g.edges[m].X, g.edges[m].Y));
    }
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let j = 0; j + 1 < pts.length; j++) {
      const p0 = pts[Math.max(0, j - 1)], p1 = pts[j], p2 = pts[j + 1], p3 = pts[Math.min(pts.length - 1, j + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };
  // con la vista inclinada, las piezas se estiran hacia arriba para que parezcan de pie
  const stand = boardTilt ? `translate(0 8) scale(1 ${(1 / TILT_COS).toFixed(3)}) translate(0 -8)` : undefined;

  // encuadre: sin mar navegable basta con la isla y sus puertos, así la isla se ve más grande en el celular
  const openSea = view.settings.openSea;
  const box = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (xa: number, ya: number, xb: number, yb: number) => {
      x0 = Math.min(x0, xa); y0 = Math.min(y0, ya); x1 = Math.max(x1, xb); y1 = Math.max(y1, yb);
    };
    for (const h of Object.values(view.board.hexes)) {
      if (!openSea && h.terrain === 'sea') continue;
      const [x, y] = hpos(h.id);
      grow(x - SX, y - R, x + SX, y + R + 6);
    }
    if (!openSea) {
      for (const hb of view.board.harbors) {
        const e = g.edges[hb.edge];
        const [ax, ay] = vpos(e.a);
        const [bx, by] = vpos(e.b);
        const [sx, sy] = hpos(hb.hex);
        const qx = (ax + bx) / 2 + (sx - (ax + bx) / 2) * 0.62;
        const qy = (ay + by) / 2 + (sy - (ay + by) / 2) * 0.62;
        grow(qx - 17, qy - 17, qx + 17, qy + 19);
      }
      for (const gr of view.fish?.grounds ?? []) {
        const [x, y] = groundPos(gr);
        grow(x - 19, y - 19, x + 19, y + 19);
      }
    }
    const m = still ? 26 : openSea ? 10 : 14;
    const [pt, pr, pb, pl] = still && pad ? pad : [0, 0, 0, 0];
    return { x: x0 - m - pl, y: y0 - m - pt, w: x1 - x0 + 2 * m + pl + pr, h: y1 - y0 + 2 * m + pt + pb };
  }, [g, openSea, view.board.harbors, view.fish?.grounds, rot, still, pad?.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  // al girar o inclinar se vuelve al encuadre completo
  useEffect(() => setTf({ x: 0, y: 0, k: 1 }), [rot, boardTilt]);

  /** Escala de pantalla del SVG sin contar la perspectiva (la inclinación la pone el CSS). */
  const scale = () => {
    const svg = svgRef.current;
    if (!svg) return 1;
    return Math.min(svg.clientWidth / box.w, svg.clientHeight / box.h) || 1;
  };
  const toUser = (cx: number, cy: number) => {
    const svg = svgRef.current;
    if (!svg || boardTilt) return { x: box.x + box.w / 2, y: box.y + box.h / 2 }; // en perspectiva se acerca al centro
    const r = svg.getBoundingClientRect();
    const s = scale();
    const ox = (r.width - box.w * s) / 2;
    const oy = (r.height - box.h * s) / 2;
    return { x: box.x + (cx - r.left - ox) / s, y: box.y + (cy - r.top - oy) / s };
  };
  const zoomAt = (ux: number, uy: number, factor: number) => {
    setTf((cur) => {
      const k = Math.min(4, Math.max(0.6, cur.k * factor));
      const r = k / cur.k;
      return { k, x: ux - (ux - cur.x) * r, y: uy - (uy - cur.y) * r };
    });
  };

  const onWheel = (e: WheelEvent) => {
    const p = toUser(e.clientX, e.clientY);
    zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };
  const onDown = (e: PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 1) gesture.current = { moved: false, startX: e.clientX, startY: e.clientY, dist: 0, k: tf.k };
    if (pts.length === 2 && gesture.current) gesture.current.dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };
  const onMove = (e: PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const gs = gesture.current;
    if (pts.length === 1) {
      if (!gs.moved && Math.hypot(e.clientX - gs.startX, e.clientY - gs.startY) < 7) return;
      if (!gs.moved) (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      gs.moved = true;
      const s = scale();
      const sy = boardTilt ? s * TILT_COS : s;
      setTf((cur) => ({ ...cur, x: cur.x + (e.clientX - prev.x) / s, y: cur.y + (e.clientY - prev.y) / sy }));
    } else if (pts.length === 2 && gs.dist > 0) {
      gs.moved = true;
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const c = toUser((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      zoomAt(c.x, c.y, d / gs.dist);
      gs.dist = d;
    }
  };
  const onUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (gesture.current?.moved) suppress.current = Date.now();
    if (!pointers.current.size) gesture.current = null;
  };

  const pick = (kind: 'vertex' | 'edge' | 'hex', id: string) => {
    if (Date.now() - suppress.current < 250) return;
    onPick?.(kind, id);
  };
  const keyPick = (kind: 'vertex' | 'edge' | 'hex', id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick?.(kind, id);
    }
  };

  const colorOf = (seat: number) => view.players[seat]?.color ?? 0;
  const selected = new Set(targets?.selected ?? []);
  const name = (k: string) => t(k);

  // piezas nuevas: caen en su lugar
  const pieceKeys = [
    ...Object.entries(view.buildings).map(([v, b]) => `b:${v}:${b.kind}:${b.wall ? 'w' : ''}:${b.metro ?? ''}`),
    ...Object.keys(view.roads).map((e) => `r:${e}`),
    ...Object.keys(view.ships).map((e) => `s:${e}`),
    ...Object.entries(view.knights).map(([v, k]) => `k:${v}:${k.level}:${k.active ? 1 : 0}`),
    ...(view.caravan?.routes.flat() ?? []).map((e) => `c:${e}`),
  ];
  const fresh = useFresh(pieceKeys);

  const robberRef = useRef<SVGGElement>(null);
  const pirateRef = useRef<SVGGElement>(null);
  const robberAt = view.board.robber;
  const pirateAt = view.board.pirate;
  useHop(robberRef, robberAt ? hpos(robberAt) : null, robberAt && `${robberAt}:${rot}`);
  useHop(pirateRef, pirateAt ? hpos(pirateAt) : null, pirateAt && `${pirateAt}:${rot}`);
  const fleetRef = useRef<SVGGElement>(null);
  const fleetAt = view.bastions && view.bastions.fleet !== null ? view.bastions.loop[view.bastions.fleet] : null;
  useHop(fleetRef, fleetAt ? hpos(fleetAt) : null, fleetAt && `${fleetAt}:${rot}`);

  // mar, costa e isla: sólo cambian con el tablero o el giro, no al mover o acercar
  const landscape = useMemo(() => {
    const all = Object.values(view.board.hexes);
    const land = all.filter((h) => h.terrain !== 'sea').sort((a, b) => hpos(a.id)[1] - hpos(b.id)[1] || hpos(a.id)[0] - hpos(b.id)[0]);
    const sea = all.filter((h) => h.terrain === 'sea');
    const centers = land.filter((h) => h.terrain !== 'fog').map((h) => hpos(h.id));
    return (
      <>
        <g className="layer-sea">
          {sea.map((h) => {
            const [cx, cy] = hpos(h.id);
            return <g key={h.id} transform={`translate(${cx} ${cy})`} className="hex t-sea"><title>{name('terrain.sea')}</title><SeaFace id={h.id} /></g>;
          })}
        </g>
        <Coast centers={centers} />
        <g className="island-base">{centers.map(([x, y], i) => <polygon key={i} points={BASE_POINTS} transform={`translate(${x} ${y})`} />)}</g>
        <g className="layer-hexes">
          {land.map((h) => {
            const [cx, cy] = hpos(h.id);
            const robbed = h.id === view.board.robber;
            const on = !!lit && h.number !== null && lit.numbers.includes(h.number) && !robbed;
            return (
              <g key={h.id} transform={`translate(${cx} ${cy})`} className={`hex t-${h.terrain}${robbed ? ' robbed' : ''}${on ? ' lit' : ''}`} data-hex={h.id}>
                <title>{name(`terrain.${h.terrain}`) + (h.number ? ` ${h.number}` : '')}</title>
                <TileFace terrain={h.terrain as LandTerrain} id={h.id} />
                {robbed && <polygon points={TOP_POINTS} className="robbed-shade" />}
                {on && <polygon key={`g${lit!.key}`} points={TOP_POINTS} className="lit-glow" />}
                {h.number && (
                  <g transform="translate(0 8)">
                    {on && <circle key={`r${lit!.key}`} r={16} className="lit-ring" />}
                    <NumberToken n={h.number} />
                  </g>
                )}
              </g>
            );
          })}
        </g>
        {view.river && (
          <g className="layer-rivers" aria-hidden="true">
            {view.river.rivers.map((r, i) => {
              const d = riverPath(r, i);
              return (
                <g key={i} className="river">
                  <path d={d} className="river-bank" />
                  <path d={d} className="river-water" />
                  <path d={d} className="river-shine" />
                  <circle cx={hpos(r[0])[0]} cy={hpos(r[0])[1] - 14} r={6} className="river-spring" />
                </g>
              );
            })}
            {/* las fichas de número quedan sobre el agua */}
            {view.river.rivers.flat().map((h) => {
              const hx = view.board.hexes[h];
              if (!hx.number) return null;
              const [cx, cy] = hpos(h);
              const on = !!lit && lit.numbers.includes(hx.number) && h !== view.board.robber;
              return <g key={h} transform={`translate(${cx} ${cy + 8})`}>{on && <circle r={16} className="lit-ring" />}<NumberToken n={hx.number} /></g>;
            })}
          </g>
        )}
        {view.fish && (
          <g className="layer-fish">
            {view.fish.lakes.map((l) => {
              const [cx, cy] = hpos(l);
              const blocked = view.board.robber === l;
              return (
                <g key={l} transform={`translate(${cx} ${cy})`} className={`lake-numbers${blocked ? ' robbed' : ''}`}>
                  <title>{t('fish.lakeTitle')}</title>
                  {[2, 3, 11, 12].map((n, i) => {
                    const on = !!lit && lit.numbers.includes(n) && !blocked;
                    return (
                      <g key={n} transform={`translate(${i % 2 ? 12 : -12} ${i < 2 ? -6 : 16})`} className={`mini-token${on ? ' lit' : ''}`}>
                        <circle r={9.6} className="mini-disc" />
                        <text y={3.6} textAnchor="middle">{n}</text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
            {view.fish.grounds.map((gr) => {
              const [x, y] = groundPos(gr);
              const on = !!lit && lit.numbers.includes(gr.n);
              const [cx, cy] = hpos(gr.hex);
              const coast = gr.vertices.map(vpos);
              return (
                <g key={gr.hex} className={`ground${on ? ' lit' : ''}`}>
                  <title>{t('fish.groundTitle', { n: gr.n })}</title>
                  <path d={`M${coast[0][0]} ${coast[0][1]} Q${(cx + x) / 2} ${(cy + y) / 2} ${coast[2][0]} ${coast[2][1]}`} className="ground-net" />
                  <g transform={`translate(${x} ${y})`}>
                    <circle r={16.5} className="ground-disc" />
                    <path d="M-7 4 Q-2 -1 4 3.2 Q-2 7 -7 4 Z M4 3.2 L8 0.4 L7.6 6 Z" className="ground-fish" />
                    <text y={-1.6} textAnchor="middle" className={`ground-n${gr.n === 6 || gr.n === 8 ? ' hot' : ''}`}>{gr.n}</text>
                  </g>
                </g>
              );
            })}
          </g>
        )}
        {view.caravan && (() => {
          const [cx, cy] = hpos(view.caravan.oasis);
          return (
            <g className="layer-oasis" aria-hidden="true">
              <g transform={`translate(${cx} ${cy})`}>
                <ellipse cx={0} cy={10} rx={15} ry={8} className="oasis-pool" />
                <Palm x={-14} y={6} s={1.05} />
                <Palm x={16} y={2} s={0.9} />
              </g>
              {view.caravan.starts.map((v) => {
                const [x, y] = vpos(v);
                return <g key={v} transform={`translate(${x} ${y})`} className="caravan-start"><path d="M-6 3 L0 -7 L6 3 Z" /></g>;
              })}
            </g>
          );
        })()}
        {view.bastions && view.bastions.loop.length > 2 && (() => {
          // recorrido de la flota: curva cerrada por los centros del circuito, con flechas en sentido horario
          const pts = view.bastions.loop.map(hpos);
          const n = pts.length;
          let d = `M${pts[0][0]} ${pts[0][1]}`;
          for (let j = 0; j < n; j++) {
            const p0 = pts[(j - 1 + n) % n], p1 = pts[j], p2 = pts[(j + 1) % n], p3 = pts[(j + 2) % n];
            const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
            const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
            d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
          }
          return (
            <g className="layer-loop">
              <title>{t('fort.loopTitle')}</title>
              <path d={d} className="fleet-loop" />
              {pts.filter((_, j) => j % 2 === 0).map((p1, j) => {
                const k = j * 2;
                const p2 = pts[(k + 1) % n];
                const ang = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;
                const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
                return <path key={k} d="M-4 -3.4 L4 0 L-4 3.4 Z" transform={`translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${ang.toFixed(0)})`} className="fleet-arrow" />;
              })}
            </g>
          );
        })()}
        {view.tribe && (
          <g className="layer-tribe">
            {view.tribe.hexes.map((h) => {
              const [x, y] = hpos(h);
              return <g key={h} transform={`translate(${x} ${y - 10})`}><Huts /></g>;
            })}
          </g>
        )}
        {view.works && (
          <g className="layer-sites">
            {[...view.works.strait.map((v) => ['strait', v] as const), ...view.works.waste.map((v) => ['waste', v] as const)].map(([kind, v]) => {
              const [x, y] = vpos(v);
              return (
                <g key={`${kind}${v}`} transform={`translate(${x} ${y})`}>
                  <title>{t(kind === 'strait' ? 'works.straitTitle' : 'works.wasteTitle')}</title>
                  <circle r={8.2} className={`site-disc ${kind}`} />
                  {kind === 'strait'
                    ? <path d="M-5.4 -1.4 Q-2.7 -4 0 -1.4 Q2.7 1.2 5.4 -1.4 M-5.4 2.8 Q-2.7 0.2 0 2.8 Q2.7 5.4 5.4 2.8" className="site-glyph" />
                    : <path d="M-5 3.4 L-3 -3.6 L-1 2 L1 -4.6 L3 2.2 L5 -2.6" className="site-glyph" />}
                </g>
              );
            })}
          </g>
        )}
        <g className="layer-harbors">
          {view.board.harbors.map((hb) => {
            const e = g.edges[hb.edge];
            const [ax, ay] = vpos(e.a);
            const [bx, by] = vpos(e.b);
            const [sx, sy] = hpos(hb.hex);
            const mx = (ax + bx) / 2;
            const my = (ay + by) / 2;
            const qx = mx + (sx - mx) * 0.62;
            const qy = my + (sy - my) * 0.62;
            const planks = `M${ax} ${ay} L${qx} ${qy} M${bx} ${by} L${qx} ${qy}`;
            return (
              <g key={hb.edge} className="harbor">
                <title>{hb.kind === 'any' ? t('harbor.any') : t('harbor.res', { res: t(`res.${hb.kind}`) })}</title>
                <path d={planks} className="plank" />
                <path d={planks} className="plank-top" />
                <circle cx={ax} cy={ay} r={2.4} className="post" />
                <circle cx={bx} cy={by} r={2.4} className="post" />
                <g transform={`translate(${qx} ${qy})`}>
                  <ellipse cx={1.2} cy={2.4} rx={14} ry={13.4} className="badge-shadow" />
                  <circle r={13.6} className="badge" />
                  {hb.kind === 'any' ? (
                    <text y={4} textAnchor="middle">3:1</text>
                  ) : (
                    <>
                      <g transform="translate(-8 -14.2)"><CardIcon card={hb.kind} size={16} /></g>
                      <text y={10.6} textAnchor="middle" className="small">2:1</text>
                    </>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      </>
    );
  }, [view.board, view.river?.rivers, view.fish?.grounds, view.fish?.lakes, view.caravan?.oasis, view.bastions?.loop, view.works, lit?.key, lit?.numbers.join(), t, rot]); // eslint-disable-line react-hooks/exhaustive-deps

  const routes = () => (
    <>
      {Object.entries(view.roads).map(([e, r]) => {
        const ed = g.edges[e];
        const [ax, ay] = vpos(ed.a);
        const [bx, by] = vpos(ed.b);
        if (r.bridge) {
          const k = 0.1;
          const x0 = ax + (bx - ax) * k, y0 = ay + (by - ay) * k, x1 = bx - (bx - ax) * k, y1 = by - (by - ay) * k;
          const len = Math.hypot(x1 - x0, y1 - y0) || 1;
          const nx = (-(y1 - y0) / len) * 5, ny = ((x1 - x0) / len) * 5;
          return (
            <g key={e} className={`bridge p${colorOf(r.owner)}${fresh.has(`r:${e}`) ? ' fresh-road' : ''}`}>
              <path d={`M${x0 + 1.5} ${y0 + 3} L${x1 + 1.5} ${y1 + 3}`} className="road-shadow" pathLength={1} />
              <path d={`M${x0} ${y0} L${x1} ${y1}`} className="bridge-deck" pathLength={1} />
              <path d={`M${x0} ${y0} L${x1} ${y1}`} className="bridge-planks" pathLength={1} />
              <path d={`M${x0 + nx} ${y0 + ny} L${x1 + nx} ${y1 + ny} M${x0 - nx} ${y0 - ny} L${x1 - nx} ${y1 - ny}`} className="bridge-rail" />
            </g>
          );
        }
        const k = 0.15;
        const x0 = ax + (bx - ax) * k, y0 = ay + (by - ay) * k, x1 = bx - (bx - ax) * k, y1 = by - (by - ay) * k;
        const d = `M${x0} ${y0} L${x1} ${y1}`;
        const isNew = fresh.has(`r:${e}`);
        return (
          <g key={e} className={`road p${colorOf(r.owner)}${isNew ? ' fresh-road' : ''}${r.broken ? ' broken' : ''}`}>
            <path d={`M${x0 + 1.5} ${y0 + 2.6} L${x1 + 1.5} ${y1 + 2.6}`} className="road-shadow" pathLength={1} />
            <path d={d} className="road-outline" pathLength={1} />
            <path d={d} className="road-fill" pathLength={1} />
            <path d={`M${x0} ${y0 - 1.3} L${x1} ${y1 - 1.3}`} className="road-shine" pathLength={1} />
          </g>
        );
      })}
      {view.caravan?.routes.flat().map((e) => {
        const [x, y] = at(g.edges[e].X, g.edges[e].Y);
        return <g key={`c${e}`} transform={`translate(${x} ${y - 3})`} className={fresh.has(`c:${e}`) ? 'camel fresh-drop' : 'camel'}><g transform={stand}><CamelShape /></g></g>;
      })}
      {Object.entries(view.ships).map(([e, r]) => {
        const ed = g.edges[e];
        const [x, y] = at(ed.X, ed.Y);
        return (
          <g key={e} transform={`translate(${x} ${y})`}>
            <g transform={stand}><g className={fresh.has(`s:${e}`) ? 'fresh-drop' : undefined}><ShipShape color={colorOf(r.owner)} war={r.war} /></g></g>
          </g>
        );
      })}
    </>
  );
  /** Regalos, aldeas, bastiones y desembarcos: cambian durante la partida. */
  const marks = () => (
    <>
      {view.tribe?.gifts.map((gf) => {
        const ed = g.edges[gf.edge];
        const sea = ed.hexes.find((h) => view.board.hexes[h]?.terrain === 'sea') ?? ed.hexes[0];
        const [mx, my] = at(ed.X, ed.Y);
        const [sx, sy] = hpos(sea);
        const x = mx + (sx - mx) * 0.5, y = my + (sy - my) * 0.5;
        const title = gf.kind === 'vp' ? t('tribe.giftVp') : gf.kind === 'dev' ? t('tribe.giftDev') : t('tribe.giftHarbor', { what: portName(gf.harbor ?? 'any', t) });
        return (
          <g key={`g${gf.edge}`} className="gift-spot">
            <title>{title}</title>
            <path d={`M${mx} ${my} L${x} ${y}`} className="gift-tether" />
            <g transform={`translate(${x} ${y})`}><GiftToken kind={gf.kind} harbor={gf.harbor} /></g>
          </g>
        );
      })}
      {view.looms?.villages.map((vil) => {
        const [x, y] = vpos(vil.v);
        const on = !!lit && lit.numbers.includes(vil.n) && vil.cloth > 0;
        return (
          <g key={`v${vil.v}`} transform={`translate(${x} ${y})`} className="village-spot" data-village={vil.v}>
            <title>{t('looms.villageTitle', { n: vil.n, cloth: vil.cloth })}</title>
            <g transform={stand}><VillageShape n={vil.n} cloth={vil.cloth} linked={vil.linked.map(colorOf)} lit={on} /></g>
          </g>
        );
      })}
      {view.bastions?.forts.map((f) => {
        // el tramo que le falta a la ruta: punteado del color del jugador
        if (f.taken || !f.plan.length) return null;
        const built = Object.keys(view.ships).filter((e) => view.ships[e].owner === f.seat && f.plan.includes(e)).length;
        const rest = f.plan.slice(built);
        if (!rest.length) return null;
        const pts = rest.map((e) => at(g.edges[e].X, g.edges[e].Y));
        const d = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}`;
        return <path key={`lane${f.seat}`} d={d} className={`lane p${colorOf(f.seat)}`} />;
      })}
      {view.bastions?.forts.map((f) => {
        const owner = view.players[f.seat]?.name ?? '';
        const out: ReactNode[] = [];
        if (!f.taken) {
          const [x, y] = vpos(f.v);
          out.push(<g key={`f${f.v}`} transform={`translate(${x} ${y})`}><title>{t('fort.title', { name: owner, n: f.chips })}</title><g transform={stand}><g transform="scale(1.3)"><FortShape color={colorOf(f.seat)} chips={f.chips} /></g></g></g>);
        }
        if (!view.buildings[f.landing]) {
          const [x, y] = vpos(f.landing);
          out.push(<g key={`l${f.landing}`} transform={`translate(${x} ${y})`}><title>{t('fort.landingTitle', { name: owner })}</title><g transform={stand}><g transform="scale(1.3)"><LandingFlag color={colorOf(f.seat)} /></g></g></g>);
        }
        return out;
      })}
    </>
  );
  const pieces = () => (
    <>
      {Object.entries(view.buildings).map(([v, b]) => {
        const [x, y] = vpos(v);
        const isNew = fresh.has(`b:${v}:${b.kind}:${b.wall ? 'w' : ''}:${b.metro ?? ''}`);
        return (
          <g key={v} transform={`translate(${x} ${y})`}>
            {isNew && <ellipse cx={1} cy={8} rx={13} ry={4} className="dust" />}
            <g transform={stand}>
              <g className={isNew ? 'fresh-drop' : undefined}>
                {b.kind === 'city' ? <CityShape color={colorOf(b.owner)} wall={b.wall} metro={b.metro} damaged={b.damaged} /> : <SettlementShape color={colorOf(b.owner)} />}
              </g>
            </g>
          </g>
        );
      })}
      {Object.entries(view.knights).map(([v, k]) => {
        const [x, y] = vpos(v);
        const isNew = fresh.has(`k:${v}:${k.level}:${k.active ? 1 : 0}`);
        return (
          <g key={v} transform={`translate(${x} ${y})`}>
            <g transform={stand}><g className={isNew ? 'fresh-drop' : undefined}><KnightShape color={colorOf(k.owner)} level={k.level} active={k.active} /></g></g>
          </g>
        );
      })}
    </>
  );
  const tokens = () => (
    <>
      {robberAt && (() => {
        const [x, y] = hpos(robberAt);
        return <g transform={`translate(${x - 26} ${y + 4})`}><title>{t('piece.robber')}</title><g ref={robberRef}><g transform={stand}><g transform="scale(1.15)"><RobberShape /></g></g></g></g>;
      })()}
      {pirateAt && (() => {
        const [x, y] = hpos(pirateAt);
        return <g transform={`translate(${x} ${y})`}><title>{t('piece.pirate')}</title><g ref={pirateRef}><g transform={stand}><g transform="scale(1.5)"><ShipShape /></g></g></g></g>;
      })()}
      {fleetAt && (() => {
        const [x, y] = hpos(fleetAt);
        return <g transform={`translate(${x} ${y})`}><title>{t('piece.fleet')}</title><g ref={fleetRef}><g transform={stand}><g transform="scale(1.35)"><FleetShape /></g></g></g></g>;
      })()}
      {view.board.merchant && (() => {
        const [x, y] = hpos(view.board.merchant.hex);
        return <g transform={`translate(${x + 26} ${y + 4})`}><title>{t('piece.merchant')}</title><g transform={stand}><MerchantShape color={colorOf(view.board.merchant.owner)} /></g></g>;
      })()}
    </>
  );

  if (still) {
    return (
      <svg className="board still" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label ?? t('app.name')}>
        {defs && <TileDefs />}
        {landscape}
        <g className="layer-routes">{routes()}</g>
        <g className="layer-marks">{marks()}</g>
        <g className="layer-buildings">{pieces()}</g>
        <g className="layer-tokens">{tokens()}</g>
        {overlay && <g className="layer-overlay">{overlay({ v: vpos, h: hpos, e: (id) => at(g.edges[id].X, g.edges[id].Y) })}</g>}
      </svg>
    );
  }

  return (
    <div className={`board-wrap${boardTilt ? ' tilted' : ''}`}>
      <svg
        ref={svgRef}
        className="board"
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="application"
        aria-label={t('app.name')}
      >
        <TileDefs />
        <g transform={`translate(${tf.x} ${tf.y}) scale(${tf.k})`}>
          {landscape}

          {targets?.hexes && (
            <g className="layer-targets hex-targets">
              {targets.hexes.map((h) => {
                const [x, y] = hpos(h);
                return (
                  <g key={h} data-target-hex={h} transform={`translate(${x} ${y})`} className={`target target-hex${selected.has(h) ? ' selected' : ''}`}
                    role="button" tabIndex={0} aria-label={name(`terrain.${view.board.hexes[h].terrain}`)}
                    onClick={() => pick('hex', h)} onKeyDown={keyPick('hex', h)}>
                    <polygon points={TOP_POINTS} />
                  </g>
                );
              })}
            </g>
          )}

          <g className="layer-routes">{routes()}</g>
          <g className="layer-marks">{marks()}</g>
          <g className="layer-buildings">{pieces()}</g>
          <g className="layer-tokens">{tokens()}</g>

          {targets && (
            <g className="layer-targets">
              {(targets.edges ?? []).map((e) => {
                const ed = g.edges[e];
                const [ax, ay] = vpos(ed.a);
                const [bx, by] = vpos(ed.b);
                const k = 0.22;
                const d = `M${ax + (bx - ax) * k} ${ay + (by - ay) * k} L${bx - (bx - ax) * k} ${by - (by - ay) * k}`;
                return (
                  <g key={e} data-edge={e} className={`target target-edge${selected.has(e) ? ' selected' : ''}`} role="button" tabIndex={0}
                    aria-label={t('pick.road')} onClick={() => pick('edge', e)} onKeyDown={keyPick('edge', e)}>
                    <circle cx={(ax + bx) / 2} cy={(ay + by) / 2} r={13} className="hit-dot" />
                    <path d={d} className="hit" />
                    <path d={d} className="mark" />
                  </g>
                );
              })}
              {(targets.vertices ?? []).map((v) => {
                const [x, y] = vpos(v);
                return (
                  <g key={v} data-vertex={v} transform={`translate(${x} ${y})`} className={`target target-vertex${selected.has(v) ? ' selected' : ''}`}
                    role="button" tabIndex={0} aria-label={t('pick.settlement')} onClick={() => pick('vertex', v)} onKeyDown={keyPick('vertex', v)}>
                    <circle r={22} className="hit" />
                    <circle r={8} className="mark" />
                  </g>
                );
              })}
            </g>
          )}
        </g>
      </svg>
      {children}
      <div className="board-view-tools">
        <button type="button" className="icon-btn" aria-label={t('act.rotate')} title={t('act.rotate')} onClick={() => prefs.set({ boardRot: (boardRot + 1) % 6 })}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="tool-icon"><path d="M19.4 12.6A7.5 7.5 0 1 1 16.8 6.2" /><path d="M17.6 2.8 L17.6 7.2 L13.2 7.2" /></svg>
        </button>
        <button type="button" className={`icon-btn${boardTilt ? ' on' : ''}`} aria-pressed={boardTilt} aria-label={boardTilt ? t('act.flat') : t('act.tilt')} title={boardTilt ? t('act.flat') : t('act.tilt')} onClick={() => prefs.set({ boardTilt: !boardTilt })}>
          {boardTilt
            ? <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="tool-icon"><rect x="5" y="5" width="14" height="14" rx="1.5" /><path d="M5 12 H19 M12 5 V19" /></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="tool-icon"><path d="M8 7 H16 L20 18 H4 Z" /><path d="M6 12.5 H18 M12 7 V18" /></svg>}
        </button>
      </div>
      <div className="board-tools">
        <button type="button" className="icon-btn" aria-label={t('act.zoomIn')} title={t('act.zoomIn')} onClick={() => zoomAt(box.x + box.w / 2, box.y + box.h / 2, 1.25)}>+</button>
        <button type="button" className="icon-btn" aria-label={t('act.zoomOut')} title={t('act.zoomOut')} onClick={() => zoomAt(box.x + box.w / 2, box.y + box.h / 2, 0.8)}>−</button>
        <button type="button" className="icon-btn" aria-label={t('act.fit')} title={t('act.fit')} onClick={() => setTf({ x: 0, y: 0, k: 1 })}>⤢</button>
      </div>
    </div>
  );
}
