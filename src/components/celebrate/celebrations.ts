// Presentation only: spot the big moments between two states so the UI can throw confetti.

import { achievements, challenges } from '../../data/achievements';
import { companyById } from '../../data/companies';
import { vehicleById } from '../../data/vehicles';
import type { GameState } from '../../engine/types';

export type CelebrationKind = 'married' | 'graduated' | 'home' | 'engaged' | 'promotion' | 'job' | 'vehicle' | 'challenge' | 'achievement';

export interface Celebration {
  kind: CelebrationKind;
  icon: string;
  title: string;
  sub: string;
}

const ORDER: CelebrationKind[] = ['married', 'graduated', 'home', 'engaged', 'promotion', 'job', 'vehicle', 'challenge', 'achievement'];

export function celebrationsBetween(prev: GameState, next: GameState): Celebration[] {
  if (prev.createdAt !== next.createdAt) return [];
  const out: Celebration[] = [];

  const pStage = prev.relationships.partner?.stage;
  const nStage = next.relationships.partner?.stage;
  const partner = next.relationships.partner?.name ?? '';
  if (nStage === 'married' && pStage !== 'married') out.push({ kind: 'married', icon: '💐', title: 'Selamat pengantin baru!', sub: `You married ${partner}.` });
  else if (nStage === 'engaged' && pStage !== 'engaged') out.push({ kind: 'engaged', icon: '💍', title: 'Engaged!', sub: `${partner} said yes.` });

  if (next.education.status === 'graduated' && prev.education.status !== 'graduated') {
    out.push({ kind: 'graduated', icon: '🎓', title: 'Graduated!', sub: 'Konvo day. The family group chat is very proud.' });
  }
  if (next.housing.ownedPropertyId && !prev.housing.ownedPropertyId) out.push({ kind: 'home', icon: '🔑', title: 'Rumah sendiri!', sub: 'Your very own home.' });

  const pJob = prev.career.job;
  const nJob = next.career.job;
  if (nJob && (!pJob || pJob.companyId !== nJob.companyId)) {
    out.push({ kind: 'job', icon: '💼', title: 'Dapat kerja!', sub: `${nJob.title} at ${companyById(nJob.companyId)?.name ?? 'a new company'}.` });
  } else if (nJob && pJob && pJob.title !== nJob.title) {
    out.push({ kind: 'promotion', icon: '🚀', title: 'Naik pangkat!', sub: `You're now ${nJob.title}.` });
  }

  if (next.transport.vehicleId && next.transport.vehicleId !== prev.transport.vehicleId) {
    const v = vehicleById(next.transport.vehicleId);
    out.push({ kind: 'vehicle', icon: v?.icon ?? '🚗', title: 'New ride!', sub: v ? `You got a ${v.name}.` : 'Vroom vroom.' });
  }

  for (const c of challenges) {
    if (next.challenges.completed[c.id] !== undefined && prev.challenges.completed[c.id] === undefined) {
      out.push({ kind: 'challenge', icon: '🎯', title: 'Challenge complete!', sub: c.title });
    }
  }
  for (const a of achievements) {
    if (next.achievements[a.id] !== undefined && prev.achievements[a.id] === undefined) {
      out.push({ kind: 'achievement', icon: a.icon, title: `Achievement: ${a.title}`, sub: a.description });
    }
  }

  return out.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}