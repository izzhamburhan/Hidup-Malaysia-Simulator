// Pixel-art vehicle sprites: one generic body per shape, painted in the model's colour.
// Never a logo, badge, grille design or photo of a real model (see CLAUDE.md, Data honesty).

import type { VehicleShape } from '../data/vehicles';

// b body, d body in shadow, w window, k tyre / trim, h hub, l lamp, . empty. Facing right.
const SHAPES: Record<VehicleShape, string[]> = {
  hatchback: [
    '......bbbbbbbbbbb.........',
    '.....bwwwwwbwwwwwb........',
    '....bwwwwwwbwwwwwwb.......',
    '..bbbbbbbbbbbbbbbbbbbbbb..',
    '.bbbbbbbbbbbbbbbbbbbbbbbl.',
    '.bbbbbbbbbbbbbbbbbbbbbbbb.',
    '.dddkkkkddddddddddkkkkddd.',
    '...kkhhkk........kkhhkk...',
    '....kkkk..........kkkk....',
  ],
  sedan: [
    '.......bbbbbbbbbbb........',
    '......bwwwwwbwwwwwb.......',
    '.....bwwwwwwbwwwwwwb......',
    '.bbbbbbbbbbbbbbbbbbbbbbbb.',
    'bbbbbbbbbbbbbbbbbbbbbbbbbl',
    'bbbbbbbbbbbbbbbbbbbbbbbbbb',
    'dddkkkkddddddddddddkkkkddd',
    '..kkhhkk..........kkhhkk..',
    '...kkkk............kkkk...',
  ],
  mpv: [
    '...bbbbbbbbbbbbbbbbb......',
    '..bwwwwwbwwwwwbwwwwwb.....',
    '..bwwwwwbwwwwwbwwwwwwb....',
    '..bwwwwwbwwwwwbwwwwwwwb...',
    '.bbbbbbbbbbbbbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbbbbbbbbbbbbbl',
    '.bbbbbbbbbbbbbbbbbbbbbbbbb',
    '.dddkkkkddddddddddkkkkdddd',
    '...kkhhkk........kkhhkk...',
    '....kkkk..........kkkk....',
  ],
  suv: [
    '....bbbbbbbbbbbbbbb.......',
    '...bwwwwwbwwwwwwwwwb......',
    '...bwwwwwbwwwwwwwwwwb.....',
    '.bbbbbbbbbbbbbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbbbbbbbbbbbbbl',
    '.bbbbbbbbbbbbbbbbbbbbbbbbb',
    '.ddkkkkkkddddddddkkkkkkddd',
    '..kkkhhkkk......kkkhhkkk..',
    '...kkkkkk........kkkkkk...',
  ],
  scooter: [
    '................kk........',
    '...............kbb........',
    '......bbbbbbb...bb........',
    '.....bbbbbbbbbbbbbl.......',
    '......dddbbbbbbbbb........',
    '....kkk..bbbbbb..kkk......',
    '...kkhkk........kkhkk.....',
    '....kkk..........kkk......',
  ],
  motorbike: [
    '.................kk.......',
    '................kbb.......',
    '.......bbbbb...bbb........',
    '.....bbbbbbbbbbbbbbl......',
    '......ddkkkbbbbbbbd.......',
    '...kkkk...kkkk....kkkk....',
    '..kkhhkk.........kkhhkk...',
    '...kkkk...........kkkk....',
  ],
};

const FIXED: Record<string, string> = { w: '#bfe3f5', k: '#1f2937', h: '#9ca3af', l: '#fcd34d' };

export function VehicleSprite({ shape, color, size = 48, title }: { shape: VehicleShape; color: string; size?: number; title?: string }) {
  const rows = SHAPES[shape];
  const w = rows[0].length;
  const h = rows.length;
  const cells: { x: number; y: number; fill: string; shade?: boolean }[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '.') return;
      cells.push({ x, y, fill: c === 'b' || c === 'd' ? color : FIXED[c], shade: c === 'd' });
    }),
  );
  return (
    <svg viewBox={`-1 -1 ${w + 2} ${h + 2}`} width={size} height={(size * (h + 2)) / (w + 2)} shapeRendering="crispEdges" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {/* A soft outline so white and silver paint still reads on light cards. */}
      {cells.map(({ x, y }) => (
        <rect key={`o${x}-${y}`} x={x - 0.15} y={y - 0.15} width={1.3} height={1.3} fill="#00000040" />
      ))}
      {cells.map(({ x, y, fill, shade }) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={1} height={1} fill={fill} />
          {shade && <rect x={x} y={y} width={1} height={1} fill="#00000040" />}
        </g>
      ))}
    </svg>
  );
}