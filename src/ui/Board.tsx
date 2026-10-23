import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { graphOf } from '../engine/geometry';
import type { GameState } from '../engine/types';
import { useT } from '../app/i18n';
import { CityShape, KnightShape, MerchantShape, Pips, RES_TERRAIN, RobberShape, SettlementShape, ShipShape, TerrainGlyph } from './art';

const R = 50;
const SX = (Math.sqrt(3) / 2) * R;
const SY = R / 2;
const px = (X: number, Y: number): [number, number] => [X * SX, Y * SY];
const HEX_POINTS = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]].map(([x, y]) => `${(x * SX * 0.985).toFixed(2)},${(y * SY * 0.985).toFixed(2)}`).join(' ');

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
  flash: { key: string; number: number } | null;
}

export function Board({ view, targets, onPick, flash }: Props) {
  const t = useT();
  const g = graphOf(view.board.hexes);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tf, setTf] = useState({ x: 0, y: 0, k: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; startX: number; startY: number; dist: number; k: number } | null>(null);
  const suppress = useRef(0);

  const box = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const h of Object.values(g.hexes)) {
      const [x, y] = px(h.X, h.Y);
      x0 = Math.min(x0, x - SX);
      x1 = Math.max(x1, x + SX);
      y0 = Math.min(y0, y - R);
      y1 = Math.max(y1, y + R);
    }
    const m = 8;
    return { x: x0 - m, y: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m };
  }, [g]);

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
        <g transform={`translate(${tf.x} ${tf.y}) scale(${tf.k})`}>
          <g className="layer-hexes">
            {Object.values(view.board.hexes).map((h) => {
              const [cx, cy] = hpos(h.id);
              const hot = h.number === 6 || h.number === 8;
              return (
                <g key={h.id} transform={`translate(${cx} ${cy})`} className={`hex t-${h.terrain}${h.id === view.board.robber ? ' robbed' : ''}`}>
                  <title>{name(`terrain.${h.terrain}`) + (h.number ? ` ${h.number}` : '')}</title>
                  <polygon points={HEX_POINTS} className="tile" />
                  {h.terrain === 'sea' ? <TerrainGlyph terrain="sea" /> : <g transform={`translate(0 ${h.number ? -22 : -2})`}><TerrainGlyph terrain={h.terrain} /></g>}
                  {flash && h.number === flash.number && h.terrain !== 'sea' && <polygon key={flash.key} points={HEX_POINTS} className="flash" />}
                  {h.number && (
                    <g className={`token${hot ? ' hot' : ''}`} transform="translate(0 8)">
                      <circle r={14} />
                      <text y={3.5} textAnchor="middle">{h.number}</text>
                      <g transform="translate(0 9)"><Pips n={h.number} /></g>
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
              const qx = mx + (sx - mx) * 0.6;
              const qy = my + (sy - my) * 0.6;
              return (
                <g key={hb.edge} className="harbor">
                  <title>{hb.kind === 'any' ? t('harbor.any') : t('harbor.res', { res: t(`res.${hb.kind}`) })}</title>
                  <path d={`M${ax} ${ay} L${qx} ${qy} M${bx} ${by} L${qx} ${qy}`} className="pier" />
                  <g transform={`translate(${qx} ${qy})`}>
                    <circle r={15} className="badge" />
                    {hb.kind === 'any' ? (
                      <text y={4} textAnchor="middle">3:1</text>
                    ) : (
                      <>
                        <svg x={-7.5} y={-13} width={15} height={15} viewBox="-15 -15 30 30" className={`card-icon t-${RES_TERRAIN[hb.kind]}`}>
                          <rect x={-14} y={-14} width={28} height={28} rx={7} className="bg" />
                          <TerrainGlyph terrain={RES_TERRAIN[hb.kind]} />
                        </svg>
                        <text y={11} textAnchor="middle" className="small">2:1</text>
                      </>
                    )}
                  </g>
                </g>
              );
            })}
          </g>

          <g className="layer-routes">
            {Object.entries(view.roads).map(([e, r]) => {
              const ed = g.edges[e];
              const [ax, ay] = vpos(ed.a);
              const [bx, by] = vpos(ed.b);
              const k = 0.15;
              const d = `M${ax + (bx - ax) * k} ${ay + (by - ay) * k} L${bx - (bx - ax) * k} ${by - (by - ay) * k}`;
              return (
                <g key={e} className="road">
                  <path d={d} className="road-outline" />
                  <path d={d} className={`road-fill pstroke p${colorOf(r.owner)}`} />
                </g>
              );
            })}
            {Object.entries(view.ships).map(([e, r]) => {
              const ed = g.edges[e];
              const [x, y] = px(ed.X, ed.Y);
              return <g key={e} transform={`translate(${x} ${y})`}><ShipShape color={colorOf(r.owner)} /></g>;
            })}
          </g>

          <g className="layer-buildings">
            {Object.entries(view.buildings).map(([v, b]) => {
              const [x, y] = vpos(v);
              return (
                <g key={v} transform={`translate(${x} ${y})`}>
                  {b.kind === 'city' ? <CityShape color={colorOf(b.owner)} wall={b.wall} metro={b.metro} damaged={b.damaged} /> : <SettlementShape color={colorOf(b.owner)} />}
                </g>
              );
            })}
            {Object.entries(view.knights).map(([v, k]) => {
              const [x, y] = vpos(v);
              return <g key={v} transform={`translate(${x} ${y})`}><KnightShape color={colorOf(k.owner)} level={k.level} active={k.active} /></g>;
            })}
          </g>

          <g className="layer-tokens">
            {view.board.robber && (() => {
              const [x, y] = hpos(view.board.robber);
              return <g transform={`translate(${x - 26} ${y + 6})`}><title>{t('piece.robber')}</title><RobberShape /></g>;
            })()}
            {view.board.pirate && (() => {
              const [x, y] = hpos(view.board.pirate);
              return <g transform={`translate(${x} ${y}) scale(1.5)`}><title>{t('piece.pirate')}</title><ShipShape /></g>;
            })()}
            {view.board.merchant && (() => {
              const [x, y] = hpos(view.board.merchant.hex);
              return <g transform={`translate(${x + 26} ${y + 6})`}><title>{t('piece.merchant')}</title><MerchantShape color={colorOf(view.board.merchant.owner)} /></g>;
            })()}
          </g>

          {targets && (
            <g className="layer-targets">
              {(targets.hexes ?? []).map((h) => {
                const [x, y] = hpos(h);
                return (
                  <g key={h} transform={`translate(${x} ${y})`} className={`target target-hex${selected.has(h) ? ' selected' : ''}`}
                    role="button" tabIndex={0} aria-label={name(`terrain.${view.board.hexes[h].terrain}`)}
                    onClick={() => pick('hex', h)} onKeyDown={keyPick('hex', h)}>
                    <polygon points={HEX_POINTS} />
                  </g>
                );
              })}
              {(targets.edges ?? []).map((e) => {
                const ed = g.edges[e];
                const [ax, ay] = vpos(ed.a);
                const [bx, by] = vpos(ed.b);
                const k = 0.22;
                const d = `M${ax + (bx - ax) * k} ${ay + (by - ay) * k} L${bx - (bx - ax) * k} ${by - (by - ay) * k}`;
                return (
                  <g key={e} className={`target target-edge${selected.has(e) ? ' selected' : ''}`} role="button" tabIndex={0}
                    aria-label={t('pick.road')} onClick={() => pick('edge', e)} onKeyDown={keyPick('edge', e)}>
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
                    <circle r={15} className="hit" />
                    <circle r={8} className="mark" />
                  </g>
                );
              })}
            </g>
          )}
        </g>
      </svg>
      <div className="board-tools">
        <button type="button" className="icon-btn" aria-label={t('act.zoomIn')} title={t('act.zoomIn')} onClick={() => zoomAt(box.x + box.w / 2, box.y + box.h / 2, 1.25)}>+</button>
        <button type="button" className="icon-btn" aria-label={t('act.zoomOut')} title={t('act.zoomOut')} onClick={() => zoomAt(box.x + box.w / 2, box.y + box.h / 2, 0.8)}>−</button>
        <button type="button" className="icon-btn" aria-label={t('act.fit')} title={t('act.fit')} onClick={() => setTf({ x: 0, y: 0, k: 1 })}>⤢</button>
      </div>
    </div>
  );
}
