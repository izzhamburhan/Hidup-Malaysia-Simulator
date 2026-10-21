// Catalogue integrity checks shared by the MCP data_validate tool.
// Mirrors tests/data.test.ts and tests/events.test.ts.

import { universities } from '../../src/data/universities';
import { courses } from '../../src/data/courses';
import { companies } from '../../src/data/companies';
import { jobs } from '../../src/data/jobs';
import { foods } from '../../src/data/foods';
import { vehicles } from '../../src/data/vehicles';
import { housingOptions, properties } from '../../src/data/housing';
import { hustleDefs, shopItems } from '../../src/data/lifestyle';
import { backgrounds } from '../../src/data/backgrounds';
import { achievements, challenges } from '../../src/data/achievements';
import { holidays } from '../../src/data/holidays';
import { invitePosts } from '../../src/data/feed';
import { actionCatalogue } from '../../src/engine/actions';
import { allEvents, eventById } from '../../src/engine/events';
import { newGame } from '../../src/engine/simulationEngine';

export function validateCatalogues(): { ok: boolean; problems: string[]; counts: Record<string, number> } {
  const problems: string[] = [];
  const lists: Record<string, { id: string }[]> = {
    universities, courses, companies, jobs, foods, vehicles, housingOptions, properties, hustleDefs, shopItems, backgrounds, achievements, challenges, holidays,
    actions: actionCatalogue, events: allEvents(),
  };
  const counts: Record<string, number> = {};
  for (const [name, list] of Object.entries(lists)) {
    counts[name] = list.length;
    const seen = new Set<string>();
    for (const x of list) {
      if (seen.has(x.id)) problems.push(`${name}: duplicate id ${x.id}`);
      seen.add(x.id);
    }
  }
  for (const u of universities) if (!courses.some((c) => u.fields.includes(c.field))) problems.push(`university ${u.id} has no courses`);
  for (const j of jobs) if (!companies.some((c) => j.industries.includes(c.industry))) problems.push(`job ${j.id} has no employer`);
  for (const id of [...holidays.flatMap((h) => (h.eventId ? [h.eventId] : [])), ...invitePosts.map((p) => p.eventId)]) {
    if (!eventById(id)) problems.push(`missing event ${id}`);
  }
  const probe = newGame({ name: 'Probe', startAge: 23, homeState: 'Selangor', backgroundId: 'middle', lifeStage: 'fresh_grad', mode: 'chaotic', seed: 1 });
  for (const e of allEvents()) {
    const choices = typeof e.choices === 'function' ? e.choices(probe, { friend: 'Aiman' }) : e.choices;
    if (choices.length < 2) problems.push(`event ${e.id}: fewer than 2 choices`);
    if (!choices.some((c) => !c.cost && !c.requires)) problems.push(`event ${e.id}: no always-available choice`);
    for (const c of choices) for (const o of c.outcomes) {
      if (o.followUp && eventById(o.followUp.eventId)?.trigger !== 'scheduled') problems.push(`event ${e.id}: follow-up ${o.followUp.eventId} is not a scheduled event`);
    }
  }
  if (allEvents().length < 50) problems.push('fewer than 50 events');
  return { ok: problems.length === 0, problems, counts };
}
