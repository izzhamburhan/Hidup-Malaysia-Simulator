import { decorActions } from './decorActions';
import { lifeActions } from './lifeActions';
import { ownershipActions } from './ownershipActions';
import { peopleActions } from './peopleActions';
import { petActions } from './petActions';
import type { ActionDef } from './types';
import { wardrobeActions } from './wardrobeActions';
import { workActions } from './workActions';

export const actionCatalogue: ActionDef[] = [...lifeActions, ...workActions, ...peopleActions, ...ownershipActions, ...petActions, ...decorActions, ...wardrobeActions];

const byId = new Map<string, ActionDef>();
for (const a of actionCatalogue) {
  if (byId.has(a.id)) throw new Error(`Duplicate action id ${a.id}`);
  byId.set(a.id, a);
}

export const actionById = (id: string) => byId.get(id);
export * from './types';