// Payday planner stepper maths (UI input only; the engine validates the final split).
import type { BudgetSplit } from '../engine/types';

export type Bucket = keyof BudgetSplit;

/**
 * Move 5% into `bucket` (dir +1) or out of it (dir -1), keeping the total at 100.
 * Wants is the flex bucket: it gives and takes first; when wants itself changes, needs flexes.
 */
export function stepSplit(split: BudgetSplit, bucket: Bucket, dir: 1 | -1): BudgetSplit {
  const next = { ...split };
  const flexOrder: Bucket[] = bucket === 'wants' ? ['needs', 'save'] : ['wants', bucket === 'needs' ? 'save' : 'needs'];
  if (dir > 0) {
    const donor = flexOrder.find((b) => next[b] >= 5);
    if (!donor || next[bucket] >= 100) return split;
    next[donor] -= 5;
    next[bucket] += 5;
  } else {
    if (next[bucket] < 5) return split;
    next[bucket] -= 5;
    next[flexOrder[0]] += 5;
  }
  return next;
}
