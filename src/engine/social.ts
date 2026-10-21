// Relationships (dating, partners, family, friends) and the fictional social feed.

import { friendPosts, invitePosts, worldPosts } from '../data/feed';
import { interests, npcNames, traits } from '../data/lifestyle';
import { addMemory, addPost, adjustFamily, applyStats, clamp, handleOf, highlight, log, nextId, playerPost, round2 } from './core';
import { queueEvent } from './events';
import { chance, nextRandom, pick, randInt } from './rng';
import type { GameState, PartnerStage } from './types';

export const STAGE_LABEL: Record<PartnerStage, string> = {
  talking: 'Talking',
  dating: 'Dating',
  committed: 'In a relationship',
  engaged: 'Engaged',
  married: 'Married',
};

export function relationshipStatus(state: GameState): string {
  const p = state.relationships.partner;
  return p ? `${STAGE_LABEL[p.stage]} (${p.name})` : 'Single';
}

/** Meet someone new. Compatibility is hidden-ish and partly random. */
export function meetSomeone(state: GameState, where: string): string | null {
  const r = state.relationships;
  if (r.partner && r.partner.stage !== 'talking') return null;
  if (r.prospects.length >= 3) r.prospects.pop();
  const taken = new Set([r.partner?.name, ...r.prospects.map((p) => p.name), ...r.exes]);
  const names = npcNames.filter((n) => !taken.has(n));
  if (!names.length) return null;
  const person = {
    id: nextId(state, 'npc'),
    name: pick(state, names),
    trait: pick(state, traits),
    interest: pick(state, interests),
    compatibility: randInt(state, 30, 92),
    metDay: state.clock.day,
  };
  r.prospects.unshift(person);
  return `You met ${person.name} at ${where}: ${person.trait}, into ${person.interest}.`;
}

export function startTalking(state: GameState, prospectId: string): string {
  const r = state.relationships;
  const p = r.prospects.find((x) => x.id === prospectId);
  if (!p) throw new Error('That person is no longer around.');
  r.prospects = r.prospects.filter((x) => x.id !== prospectId);
  r.partner = {
    id: p.id,
    name: p.name,
    trait: p.trait,
    interest: p.interest,
    stage: 'talking',
    trust: 30,
    compatibility: p.compatibility,
    satisfaction: 50,
    sinceDay: state.clock.day,
    lastContactDay: state.clock.day,
    longDistance: false,
    memories: [],
  };
  return `You and ${p.name} swapped numbers. The "hi" has been sent. Now you wait (not too obsessively).`;
}

export function chatPartner(state: GameState): string[] {
  const p = state.relationships.partner!;
  const gain = 1 + p.compatibility / 40;
  p.trust = round2(clamp(p.trust + gain));
  p.satisfaction = round2(clamp(p.satisfaction + gain + 1));
  p.lastContactDay = state.clock.day;
  applyStats(state, { happiness: 2, stress: -1 });
  return [`Good conversation with ${p.name}.`];
}

export function goOnDate(state: GameState, quality: number, label: string): string[] {
  const r = state.relationships;
  const p = r.partner!;
  const fit = p.compatibility / 100;
  const vibe = nextRandom(state) * 0.6 + fit * 0.7;
  const lines: string[] = [];
  p.lastContactDay = state.clock.day;
  r.dates += 1;
  state.counters.dates += 1;
  state.today.socialised = true;
  if (vibe > 0.55) {
    p.trust = round2(clamp(p.trust + 4 + quality));
    p.satisfaction = round2(clamp(p.satisfaction + 6 + quality * 1.5));
    applyStats(state, { happiness: 7 + quality, stress: -4 });
    const memory = `${label} with ${p.name}`;
    p.memories.unshift(memory);
    if (p.memories.length > 10) p.memories.length = 10;
    addMemory(state, memory);
    lines.push(`Great ${label.toLowerCase()} with ${p.name}. Time flew.`);
  } else {
    p.satisfaction = round2(clamp(p.satisfaction + 1));
    applyStats(state, { happiness: 2 });
    lines.push(`The ${label.toLowerCase()} was... fine. Some awkward silences, but you both tried.`);
  }
  if (p.stage === 'talking' && r.dates >= 2 && p.trust >= 42) {
    p.stage = 'dating';
    lines.push(`You and ${p.name} are officially dating! 💞`);
    log(state, 'milestone', `Now dating ${p.name}.`);
    highlight(state, `Started dating ${p.name}`);
  }
  return lines;
}

export function deepTalk(state: GameState): string[] {
  const p = state.relationships.partner!;
  p.lastContactDay = state.clock.day;
  const honest = nextRandom(state) < 0.5 + p.compatibility / 200;
  if (honest) {
    p.trust = round2(clamp(p.trust + 7));
    p.satisfaction = round2(clamp(p.satisfaction + 4));
    delete state.flags.misunderstanding;
    applyStats(state, { stress: -5, happiness: 3 });
    return ['You talked about the real stuff: money, family, the future. You understand each other better.'];
  }
  p.trust = round2(clamp(p.trust + 2));
  applyStats(state, { stress: 2 });
  return ['A heavy conversation. Not everything got resolved, but you were both honest.'];
}

export function defineRelationship(state: GameState): string[] {
  const p = state.relationships.partner!;
  const ok = p.trust >= 60 && p.satisfaction >= 55 && nextRandom(state) < 0.55 + p.compatibility / 200;
  if (ok) {
    p.stage = 'committed';
    p.sinceDay = state.clock.day;
    applyStats(state, { happiness: 10 });
    log(state, 'milestone', `In a relationship with ${p.name}.`);
    playerPost(state, `Off the market 💑 @${handleOf(p.name)}`);
    return [`${p.name} said yes. It's official! 💑`];
  }
  p.satisfaction = round2(clamp(p.satisfaction - 4));
  return [`${p.name} wants to take things slower. That's okay - pace matters.`];
}

export function propose(state: GameState): string[] {
  const p = state.relationships.partner!;
  const ok = nextRandom(state) < 0.35 + p.trust / 200 + p.compatibility / 300;
  if (ok) {
    p.stage = 'engaged';
    p.sinceDay = state.clock.day;
    applyStats(state, { happiness: 18 });
    adjustFamily(state, 5);
    log(state, 'milestone', `💍 Engaged to ${p.name}!`);
    highlight(state, `Engaged to ${p.name}`);
    playerPost(state, 'Engaged! 💍 Thank you for saying yes.');
    return [`${p.name} said YES! 💍`];
  }
  p.satisfaction = round2(clamp(p.satisfaction - 8));
  applyStats(state, { happiness: -10, stress: 6 });
  return [`${p.name} said they need more time. It stings, but the relationship isn't over.`];
}

export function marry(state: GameState, budgetLabel: string): string[] {
  const p = state.relationships.partner!;
  p.stage = 'married';
  p.sinceDay = state.clock.day;
  p.satisfaction = round2(clamp(p.satisfaction + 10));
  applyStats(state, { happiness: 20, stress: -5 });
  adjustFamily(state, 8);
  addMemory(state, `${budgetLabel} wedding with ${p.name}`);
  log(state, 'milestone', `💐 Married ${p.name} (${budgetLabel} wedding).`);
  playerPost(state, `Just married 💐 Thank you to everyone who came!`);
  return [`You married ${p.name}. Kenduri done, hearts full, feet sore.`];
}

export function breakUp(state: GameState, initiatedByPartner = false): string[] {
  const r = state.relationships;
  const p = r.partner;
  if (!p) return [];
  r.exes.push(p.name);
  r.partner = null;
  applyStats(state, { happiness: initiatedByPartner ? -18 : -10, stress: 8 });
  log(state, 'event', initiatedByPartner ? `${p.name} ended the relationship.` : `You and ${p.name} broke up.`);
  return [initiatedByPartner ? `${p.name} ended things. Give yourself time.` : `You ended things with ${p.name}. It hurts, but it was honest.`];
}

/** End-of-day relationship drift. Neglect lowers satisfaction gently. */
export function dailyRelationships(state: GameState): void {
  const r = state.relationships;
  const day = state.clock.day;
  const p = r.partner;
  if (p) {
    const gap = day - p.lastContactDay;
    const tolerance = p.stage === 'married' ? 5 : p.longDistance ? 4 : 3;
    if (gap > tolerance) p.satisfaction = round2(clamp(p.satisfaction - (p.stage === 'talking' ? 3 : 1.5)));
    if (p.stage === 'talking' && gap > 7) {
      r.partner = null;
      log(state, 'event', `You and ${p.name} stopped talking. No drama, just drifted apart.`);
      return;
    }
    if (p.satisfaction < 22 && p.trust < 45 && p.stage !== 'talking' && !state.events.pending.some((e) => e.eventId === 'relationship-crisis')) {
      const last = state.events.cooldowns['relationship-crisis'];
      if (last === undefined || day - last > 10) queueEvent(state, 'relationship-crisis');
    }
    if (p.satisfaction > 60) applyStats(state, { happiness: 0.5 });
  }
  if (day - r.lastFamilyContactDay > 14) r.family = round2(clamp(r.family - 0.4));
  if (day - r.lastFriendsDay > 10) r.friends = round2(clamp(r.friends - 0.4));
}

/** Daily fictional feed posts from friends, the world and invitations. */
export function generateFeedPosts(state: GameState): void {
  const count = randInt(state, 1, 2);
  for (let i = 0; i < count; i++) {
    const author = pick(state, npcNames);
    addPost(state, { author, handle: `@${handleOf(author)}`, text: pick(state, friendPosts), kind: 'friend', likes: randInt(state, 2, 240) });
  }
  if (chance(state, 0.35)) {
    const w = pick(state, worldPosts);
    addPost(state, { author: w.author, handle: `@${handleOf(w.author)}`, text: w.text, kind: 'world', likes: randInt(state, 20, 900) });
  }
  if (chance(state, 0.18)) {
    const inv = pick(state, invitePosts);
    const author = pick(state, npcNames);
    addPost(state, {
      author,
      handle: `@${handleOf(author)}`,
      text: inv.text,
      kind: 'invite',
      likes: randInt(state, 5, 80),
      invite: { eventId: inv.eventId, label: inv.label, used: false },
    });
  }
}

export function likePost(state: GameState, postId: string): string {
  const post = state.feed.find((p) => p.id === postId);
  if (!post) return 'Post not found.';
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  if (post.liked && post.kind === 'friend') state.relationships.friends = round2(clamp(state.relationships.friends + 0.3));
  return post.liked ? 'Liked.' : 'Unliked.';
}

export function acceptInvite(state: GameState, postId: string): string {
  const post = state.feed.find((p) => p.id === postId);
  if (!post?.invite || post.invite.used) return 'That invite is no longer open.';
  post.invite.used = true;
  queueEvent(state, post.invite.eventId, { friend: post.author });
  return `You replied to ${post.author}.`;
}
