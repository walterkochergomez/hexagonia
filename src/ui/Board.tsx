import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject, type WheelEvent } from 'react';
import { graphOf } from '../engine/geometry';
import type { GameState } from '../engine/types';
import { useT } from '../app/i18n';
import { CardIcon, CityShape, KnightShape, MerchantShape, RobberShape, SettlementShape, ShipShape } from './art';
import { Coast, NumberToken, R, SX, SY, SeaFace, TOP_POINTS, TileDefs, TileFace, hexPoints, type LandTerrain } from './tiles';
import { reducedMotion } from './fx';

const px = (X: number, Y: number): [number, number] => [X * SX, Y * SY];
const BASE_POINTS = hexPoints(1);

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
  /** Número que acaba de salir: sus casillas se iluminan cuando terminan de rodar los dados. */
  flash: { key: string; number: number } | null;
  /** capas encima del tablero (dados, avisos), sin eventos de puntero */
  children?: ReactNode;
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

export function Board({ view, targets, onPick, flash, children }: Props) {
  const t = useT();
  const g = graphOf(view.board.hexes);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tf, setTf] = useState({ x: 0, y: 0, k: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; startX: number; startY: number; dist: number; k: number } | null>(null);
  const suppress = useRef(0);

  // casillas que producen: se encienden cuando los dados ya se detuvieron
  const [lit, setLit] = useState<{ key: string; number: number } | null>(null);
  const shownFlash = useRef(flash?.key); // la tirada que ya estaba al abrir la partida no se repite
  useEffect(() => {
    if (!flash || flash.key === shownFlash.current) return;
    shownFlash.current = flash.key;
    const on = setTimeout(() => setLit(flash), reducedMotion() ? 0 : 700);
    const off = setTimeout(() => setLit(null), reducedMotion() ? 900 : 2400);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [flash?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // encuadre: sin mar navegable basta con la isla y sus puertos, así la isla se ve más grande en el celular
  const openSea = view.settings.openSea;
  const box = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (xa: number, ya: number, xb: number, yb: number) => {
      x0 = Math.min(x0, xa); y0 = Math.min(y0, ya); x1 = Math.max(x1, xb); y1 = Math.max(y1, yb);
    };
    for (const h of Object.values(view.board.hexes)) {
      if (!openSea && h.terrain === 'sea') continue;
      const [x, y] = px(g.hexes[h.id].X, g.hexes[h.id].Y);
      grow(x - SX, y - R, x + SX, y + R + 6);
    }
    if (!openSea) {
      for (const hb of view.board.harbors) {
        const e = g.edges[hb.edge];
        const [ax, ay] = px(g.vertices[e.a].X, g.vertices[e.a].Y);
        const [bx, by] = px(g.vertices[e.b].X, g.vertices[e.b].Y);
        const [sx, sy] = px(g.hexes[hb.hex].X, g.hexes[hb.hex].Y);
        const qx = (ax + bx) / 2 + (sx - (ax + bx) / 2) * 0.62;
        const qy = (ay + by) / 2 + (sy - (ay + by) / 2) * 0.62;
        grow(qx - 17, qy - 17, qx + 17, qy + 19);
      }
    }
    const m = openSea ? 10 : 14;
    return { x: x0 - m, y: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m };
  }, [g, openSea, view.board.harbors]); // eslint-disable-line react-hooks/exhaustive-deps

  const scale = () => svgRef.current?.getScreenCTM()?.a ?? 1;
  const toUser = (cx: number, cy: number) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
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
      setTf((cur) => ({ ...cur, x: cur.x + (e.clientX - prev.x) / s, y: cur.y + (e.clientY - prev.y) / s }));
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
  const vpos = (v: string) => px(g.vertices[v].X, g.vertices[v].Y);
  const hpos = (h: string) => px(g.hexes[h].X, g.hexes[h].Y);
  const selected = new Set(targets?.selected ?? []);
  const name = (k: string) => t(k);

  // piezas nuevas: caen en su lugar
  const pieceKeys = [
    ...Object.entries(view.buildings).map(([v, b]) => `b:${v}:${b.kind}:${b.wall ? 'w' : ''}:${b.metro ?? ''}`),
    ...Object.keys(view.roads).map((e) => `r:${e}`),
    ...Object.keys(view.ships).map((e) => `s:${e}`),
    ...Object.entries(view.knights).map(([v, k]) => `k:${v}:${k.level}:${k.active ? 1 : 0}`),
  ];
  const fresh = useFresh(pieceKeys);

  const robberRef = useRef<SVGGElement>(null);
  const pirateRef = useRef<SVGGElement>(null);
  const robberAt = view.board.robber;
  const pirateAt = view.board.pirate;
  useHop(robberRef, robberAt ? hpos(robberAt) : null, robberAt);
  useHop(pirateRef, pirateAt ? hpos(pirateAt) : null, pirateAt);

  // mar, costa e isla: sólo cambian con el tablero, no al mover o acercar
  const landscape = useMemo(() => {
    const all = Object.values(view.board.hexes);
    const land = all.filter((h) => h.terrain !== 'sea').sort((a, b) => g.hexes[a.id].Y - g.hexes[b.id].Y || g.hexes[a.id].X - g.hexes[b.id].X);
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
            const on = !!lit && h.number === lit.number && !robbed;
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
  }, [view.board, lit?.key, lit?.number, t]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="board-wrap">
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
                  <g key={h} transform={`translate(${x} ${y})`} className={`target target-hex${selected.has(h) ? ' selected' : ''}`}
                    role="button" tabIndex={0} aria-label={name(`terrain.${view.board.hexes[h].terrain}`)}
                    onClick={() => pick('hex', h)} onKeyDown={keyPick('hex', h)}>
                    <polygon points={TOP_POINTS} />
                  </g>
                );
              })}
            </g>
          )}

          <g className="layer-routes">
            {Object.entries(view.roads).map(([e, r]) => {
              const ed = g.edges[e];
              const [ax, ay] = vpos(ed.a);
              const [bx, by] = vpos(ed.b);
              const k = 0.15;
              const x0 = ax + (bx - ax) * k, y0 = ay + (by - ay) * k, x1 = bx - (bx - ax) * k, y1 = by - (by - ay) * k;
              const d = `M${x0} ${y0} L${x1} ${y1}`;
              const isNew = fresh.has(`r:${e}`);
              return (
                <g key={e} className={`road p${colorOf(r.owner)}${isNew ? ' fresh-road' : ''}`}>
                  <path d={`M${x0 + 1.5} ${y0 + 2.6} L${x1 + 1.5} ${y1 + 2.6}`} className="road-shadow" pathLength={1} />
                  <path d={d} className="road-outline" pathLength={1} />
                  <path d={d} className="road-fill" pathLength={1} />
                  <path d={`M${x0} ${y0 - 1.3} L${x1} ${y1 - 1.3}`} className="road-shine" pathLength={1} />
                </g>
              );
            })}
            {Object.entries(view.ships).map(([e, r]) => {
              const ed = g.edges[e];
              const [x, y] = px(ed.X, ed.Y);
              return (
                <g key={e} transform={`translate(${x} ${y})`}>
                  <g className={fresh.has(`s:${e}`) ? 'fresh-drop' : undefined}><ShipShape color={colorOf(r.owner)} /></g>
                </g>
              );
            })}
          </g>

          <g className="layer-buildings">
            {Object.entries(view.buildings).map(([v, b]) => {
              const [x, y] = vpos(v);
              const isNew = fresh.has(`b:${v}:${b.kind}:${b.wall ? 'w' : ''}:${b.metro ?? ''}`);
              return (
                <g key={v} transform={`translate(${x} ${y})`}>
                  {isNew && <ellipse cx={1} cy={8} rx={13} ry={4} className="dust" />}
                  <g className={isNew ? 'fresh-drop' : undefined}>
                    {b.kind === 'city' ? <CityShape color={colorOf(b.owner)} wall={b.wall} metro={b.metro} damaged={b.damaged} /> : <SettlementShape color={colorOf(b.owner)} />}
                  </g>
                </g>
              );
            })}
            {Object.entries(view.knights).map(([v, k]) => {
              const [x, y] = vpos(v);
              const isNew = fresh.has(`k:${v}:${k.level}:${k.active ? 1 : 0}`);
              return (
                <g key={v} transform={`translate(${x} ${y})`}>
                  <g className={isNew ? 'fresh-drop' : undefined}><KnightShape color={colorOf(k.owner)} level={k.level} active={k.active} /></g>
                </g>
              );
            })}
          </g>

          <g className="layer-tokens">
            {robberAt && (() => {
              const [x, y] = hpos(robberAt);
              return <g transform={`translate(${x - 26} ${y + 4})`}><title>{t('piece.robber')}</title><g ref={robberRef}><g transform="scale(1.15)"><RobberShape /></g></g></g>;
            })()}
            {pirateAt && (() => {
              const [x, y] = hpos(pirateAt);
              return <g transform={`translate(${x} ${y})`}><title>{t('piece.pirate')}</title><g ref={pirateRef}><g transform="scale(1.5)"><ShipShape /></g></g></g>;
            })()}
            {view.board.merchant && (() => {
              const [x, y] = hpos(view.board.merchant.hex);
              return <g transform={`translate(${x + 26} ${y + 4})`}><title>{t('piece.merchant')}</title><MerchantShape color={colorOf(view.board.merchant.owner)} /></g>;
            })()}
          </g>

          {targets && (
            <g className="layer-targets">
              {(targets.edges ?? []).map((e) => {
                const ed = g.edges[e];
                const [ax, ay] = vpos(ed.a);
                const [bx, by] = vpos(ed.b);
                const k = 0.22;
                const d = `M${ax + (bx - ax) * k} ${ay + (by - ay) * k} L${bx - (bx - ax) * k} ${by - (by - ay) * k}`;
                return (
                  <g key={e} className={`target target-edge${selected.has(e) ? ' selected' : ''}`} role="button" tabIndex={0}
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
                  <g key={v} transform={`translate(${x} ${y})`} className={`target target-vertex${selected.has(v) ? ' selected' : ''}`}
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
      <div className="board-tools">
        <button type="button" className="icon-btn" aria-label={t('act.zoomIn')} title={t('act.zoomIn')} onClick={() => zoomAt(box.x + box.w / 2, box.y + box.h / 2, 1.25)}>+</button>
        <button type="button" className="icon-btn" aria-label={t('act.zoomOut')} title={t('act.zoomOut')} onClick={() => zoomAt(box.x + box.w / 2, box.y + box.h / 2, 0.8)}>−</button>
        <button type="button" className="icon-btn" aria-label={t('act.fit')} title={t('act.fit')} onClick={() => setTf({ x: 0, y: 0, k: 1 })}>⤢</button>
      </div>
    </div>
  );
}
