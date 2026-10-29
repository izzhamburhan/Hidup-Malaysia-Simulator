import { useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { MALAYSIA, MAP_COLS, MAP_ROWS, mapStateByName, type MapState, type Region } from '../data/malaysia';
import { formatDuration } from '../engine/calendar';
import { formatRM } from '../engine/core';
import { viewAction } from '../engine/simulationEngine';
import { useLoadedGame } from '../hooks/useGame';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useT } from '../hooks/useT';
import type { StringKey } from '../i18n';
import { borderEdges, compareTier, glyphSlots, kampungRoute, markersFor, tileCentroid, type GlyphKind, type MarkerKind } from './map/mapModel';
import { StateFlag } from './StateFlag';
import { Button, Card, Disclaimer, Modal, Pill, SectionTitle, cx } from './ui';

// Stylised pixel-tile map of Malaysia, NOT TO SCALE. Draws src/data/malaysia.ts and the player's
// markers (see map/mapModel.ts); trips and moving go through the engine via viewAction/request.

const SEA = '#dde9f7';
const SEA_DOT = '#c3d6ec';
const PAPER = '#fbf7ef';
const INK = '#1d1b16';
const STAMP = '#9a6b00';
const STAMP_FILL = '#f2cf5b';
const ROUTE = '#c2410c';

// Game palette tones (teal / gold / hibiscus / leaf / sky), kept light so pins and gaps stand out.
const REGION_FILL: Record<Region, string> = {
  north: '#9cc7c1',
  'east-coast': '#e3c8a4',
  central: '#f0b48e',
  south: '#a9cfae',
  borneo: '#8fb8d6',
};

const GLYPH_FILL: Record<GlyphKind, string> = { residence: '#c2410c', kampung: '#e7b432', campus: '#155e5f' };

const MARKER_ICON: Record<MarkerKind, string> = { residence: '📍', kampung: '🏡', campus: '🎓', stamp: '✓' };

/** One pin: a coloured disc with a pixel symbol, drawn on the [-1, 1] square scaled to `r`. */
function Glyph({ kind, x, y, r }: { kind: GlyphKind; x: number; y: number; r: number }) {
  const ink = kind === 'kampung' ? INK : '#fff';
  return (
    <g transform={`translate(${x} ${y}) scale(${r})`} shapeRendering="crispEdges" aria-hidden="true">
      <circle r="1" fill={GLYPH_FILL[kind]} stroke="#fff" strokeWidth="0.2" />
      {kind === 'residence' && (
        <>
          <polygon points="-0.62,0.02 0,-0.58 0.62,0.02" fill={ink} />
          <rect x="-0.4" y="0.02" width="0.8" height="0.52" fill={ink} />
        </>
      )}
      {kind === 'kampung' && <polygon points="0,0.58 -0.62,-0.04 -0.62,-0.34 -0.36,-0.56 0,-0.3 0.36,-0.56 0.62,-0.34 0.62,-0.04" fill={ink} />}
      {kind === 'campus' && (
        <>
          <polygon points="0,-0.55 0.72,-0.15 0,0.25 -0.72,-0.15" fill={ink} />
          <rect x="-0.36" y="0.1" width="0.72" height="0.4" fill={ink} />
        </>
      )}
    </g>
  );
}

const LEGEND: { kind: MarkerKind; text: StringKey }[] = [
  { kind: 'residence', text: 'map.legend.residence' },
  { kind: 'kampung', text: 'map.legend.kampung' },
  { kind: 'campus', text: 'map.legend.campus' },
  { kind: 'stamp', text: 'map.legend.stamp' },
];

const SUMMARY_KEY: Record<MarkerKind, StringKey> = {
  residence: 'map.sum.residence',
  kampung: 'map.sum.kampung',
  campus: 'map.sum.campus',
  stamp: 'map.sum.stamp',
};

const TIER_KEY: Record<ReturnType<typeof compareTier>, StringKey> = {
  same: 'map.cmp.same',
  bitHigher: 'map.cmp.bitHigher',
  higher: 'map.cmp.higher',
  bitLower: 'map.cmp.bitLower',
  lower: 'map.cmp.lower',
};

function LegendKey({ kind }: { kind: MarkerKind }) {
  return (
    <svg width="18" height="18" viewBox="0 0 1 1" aria-hidden="true" className="shrink-0">
      {kind === 'stamp' ? <rect x="0.1" y="0.1" width="0.8" height="0.8" fill={STAMP_FILL} stroke={STAMP} strokeWidth="0.16" /> : <Glyph kind={kind} x={0.5} y={0.5} r={0.44} />}
    </svg>
  );
}

/** "My Malaysia": the pixel map with the player's markers, and a state sheet to travel or move. */
export function PixelMap() {
  const { state } = useLoadedGame();
  const t = useT();
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  /** Screen-reader text for a state: its name plus what is marked there. */
  const summary = (name: string) => [`${name}.`, ...markersFor(state, name).map((m) => t(SUMMARY_KEY[m]))].join(' ');
  const route = kampungRoute(state);
  const from = route && tileCentroid(route.from);
  const to = route && tileCentroid(route.to);
  const stamped = MALAYSIA.filter((s) => state.travel.stamps[s.name] !== undefined);
  const open = (name: string) => setPicked(name);

  return (
    <div>
      <SectionTitle>{t('map.title')}</SectionTitle>
      <Card className="p-2">
        <svg viewBox={`-0.5 -0.5 ${MAP_COLS + 1} ${MAP_ROWS + 1}`} className="block h-auto w-full" role="group" aria-label={t('map.aria')}>
          <defs>
            <pattern id="map-sea-dots" width="2" height="2" patternUnits="userSpaceOnUse">
              <rect x="0.5" y="0.5" width="0.2" height="0.2" fill={SEA_DOT} />
            </pattern>
          </defs>
          <rect x="-0.5" y="-0.5" width={MAP_COLS + 1} height={MAP_ROWS + 1} rx="0.5" fill={SEA} />
          <rect x="-0.5" y="-0.5" width={MAP_COLS + 1} height={MAP_ROWS + 1} rx="0.5" fill="url(#map-sea-dots)" shapeRendering="crispEdges" />
          <g fill="#57524a" fontSize="0.62" fontStyle="italic" textAnchor="middle" aria-hidden="true">
            <text x="12.8" y="2.4">{t('map.sea')}</text>
          </g>

          {MALAYSIA.map((s) => (
            <StateShape key={s.name} def={s} summary={summary(s.name)} stamped={markersFor(state, s.name).includes('stamp')} onOpen={open} />
          ))}

          {/* Outlines of stamped states sit above every gap line so they read as a border. */}
          <g stroke={STAMP} strokeWidth="0.16" strokeLinecap="square" pointerEvents="none" aria-hidden="true">
            {stamped.flatMap((s) => borderEdges(s.name).map((e, i) => <line key={`${s.name}-${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />))}
          </g>

          {from && to && (
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={ROUTE}
              strokeWidth="0.16"
              strokeLinecap="round"
              strokeDasharray="0.05 0.4"
              className={reduced ? undefined : 'map-route-flow'}
              pointerEvents="none"
              aria-hidden="true"
            />
          )}

          <g pointerEvents="none">
            {MALAYSIA.flatMap((s) => glyphSlots(state, s.name).map((g) => <Glyph key={`${s.name}-${g.kind}`} kind={g.kind} x={g.x} y={g.y} r={g.r} />))}
          </g>
        </svg>
      </Card>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft" aria-label={t('map.key')}>
        {LEGEND.map((l) => (
          <li key={l.kind} className="flex items-center gap-1.5">
            <LegendKey kind={l.kind} />
            {t(l.text)}
          </li>
        ))}
        {route && (
          <li className="flex items-center gap-1.5">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
              <line x1="2" y1="9" x2="16" y2="9" stroke={ROUTE} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="0.1 5" />
            </svg>
            {t('map.legend.route')}
          </li>
        )}
      </ul>
      <p className="mt-1 text-[11px] text-ink-soft">{t('map.notScale')}</p>

      <SectionTitle>{t('map.all')}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {MALAYSIA.map((s) => {
          const marks = markersFor(state, s.name);
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => open(s.name)}
              aria-label={summary(s.name)}
              className={cx(
                'hit-44 flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition',
                marks.length ? 'border-teal/40 bg-teal-soft text-teal' : 'border-ink/10 bg-white text-ink-soft hover:border-teal/40',
              )}
            >
              {s.name}
              {marks.length > 0 && (
                <span aria-hidden="true" className="text-xs">
                  {marks.map((m) => MARKER_ICON[m]).join('')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <StateSheet name={picked} onClose={() => setPicked(null)} />
    </div>
  );
}

/** One state: its tiles, a gap line along its outline, and keyboard / tap access. */
function StateShape({ def, summary, stamped, onOpen }: { def: MapState; summary: string; stamped: boolean; onOpen: (name: string) => void }) {
  const edges = borderEdges(def.name);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={summary}
      className="map-state"
      onClick={() => onOpen(def.name)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(def.name);
        }
      }}
    >
      <g shapeRendering="crispEdges">
        {def.tiles.map(([c, r]) => (
          <rect key={`${c},${r}`} x={c} y={r} width="1" height="1" fill={stamped ? STAMP_FILL : REGION_FILL[def.region]} />
        ))}
        {/* The gap: a thin paper line along the outline separates neighbouring states. */}
        <g stroke={PAPER} strokeWidth="0.1" strokeLinecap="square">
          {edges.map((e, i) => (
            <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
          ))}
        </g>
      </g>
    </g>
  );
}

const MARKER_PILL: Record<MarkerKind, { tone: 'teal' | 'gold' | 'blue' | 'green'; text: StringKey }> = {
  residence: { tone: 'teal', text: 'map.legend.residence' },
  kampung: { tone: 'gold', text: 'map.pill.kampung' },
  campus: { tone: 'blue', text: 'map.pill.campus' },
  stamp: { tone: 'green', text: 'map.legend.stamp' },
};

function StateSheet({ name, onClose }: { name: string | null; onClose: () => void }) {
  const { state, request } = useLoadedGame();
  const t = useT();
  const def = mapStateByName(name);
  const trip = def ? viewAction(state, 'trip-state', def.name) : null;
  const move = def ? viewAction(state, 'move-state', def.name) : null;
  const go = (view: NonNullable<typeof trip>) => {
    onClose();
    request(view);
  };
  return (
    <Modal open={!!def} onClose={onClose} title={def?.name}>
      {def && (
        <div>
          <div className="flex items-center gap-3">
            <StateFlag state={def.name} width={72} />
            <div className="flex flex-wrap gap-1">
              {markersFor(state, def.name).map((m) => (
                <Pill key={m} tone={MARKER_PILL[m].tone}>
                  {m === 'stamp' && <Check size={11} aria-hidden="true" />}
                  {t(MARKER_PILL[m].text)}
                </Pill>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm leading-snug text-ink">{def.blurb}</p>
          <div className="mt-3 rounded-xl bg-paper-2 p-3 text-sm leading-snug text-ink-soft">
            <div>{t(TIER_KEY[compareTier(def.costFactor)], { what: t('map.what.cost') })}</div>
            <div className="mt-0.5">{t(TIER_KEY[compareTier(def.payFactor)], { what: t('map.what.pay') })}</div>
            <div className="mt-1 text-[11px]">{t('map.estimates')}</div>
          </div>
          {(trip || move) && (
            <div className="mt-4 grid gap-3">
              {trip && <SheetButton view={trip} label={t('map.sheet.trip')} variant="primary" onPick={go} />}
              {move && <SheetButton view={move} label={t('map.sheet.move')} variant="secondary" onPick={go} />}
            </div>
          )}
          <Disclaimer>{t('map.flags')}</Disclaimer>
        </div>
      )}
    </Modal>
  );
}

function SheetButton({ view, label, variant, onPick }: { view: NonNullable<ReturnType<typeof viewAction>>; label: string; variant: 'primary' | 'secondary'; onPick: (v: NonNullable<ReturnType<typeof viewAction>>) => void }) {
  const detail = [view.cost > 0 ? formatRM(view.cost, view.cost % 1 ? 2 : 0) : null, view.minutes > 0 ? formatDuration(view.minutes) : null].filter(Boolean).join(' · ');
  return (
    <div>
      <Button variant={variant} className="min-h-[44px] w-full" disabled={!view.available} onClick={() => onPick(view)}>
        {label}
        {detail && <span className="text-xs font-medium opacity-80">{detail}</span>}
      </Button>
      {!view.available && view.reason && (
        <div className="mt-1 flex items-start gap-1 text-[11px] font-medium text-hibiscus">
          <Lock size={11} className="mt-0.5 shrink-0" aria-hidden="true" /> {view.reason}
        </div>
      )}
    </div>
  );
}
