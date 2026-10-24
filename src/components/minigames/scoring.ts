// Pure scoring for the mini-games: every game ends in a 0-100 score.

const pct = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 100);

/** Share of the gap to the bus that was closed. */
export function busScore(closed: number, gap: number): number {
  return gap <= 0 ? 100 : pct(closed / gap);
}

/** Average closeness of each pour to the target level (0-1), with a 0.35 tolerance. */
export function pourScore(levels: number[], target: number): number {
  if (!levels.length) return 0;
  const each = levels.map((l) => 1 - Math.min(1, Math.abs(l - target) / 0.35));
  return pct(each.reduce((a, b) => a + b, 0) / levels.length);
}

/** Items tapped in the right position. */
export function orderScore(order: string[], picked: string[]): number {
  if (!order.length) return 0;
  return pct(order.filter((id, i) => picked[i] === id).length / order.length);
}
