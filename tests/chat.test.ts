import { describe, expect, it } from 'vitest';
import { CHAT_SCRIPTS } from '../src/data/chats';
import { chatScriptFor, chatThreads } from '../src/engine/chat';
import { performAction } from '../src/engine/simulationEngine';
import type { GameState, PartnerStage } from '../src/engine/types';
import { makeGame } from './helpers';

function withPartner(stage: PartnerStage = 'dating'): GameState {
  const s = makeGame({ seed: 21 });
  s.relationships.partner = {
    id: 'p1', name: 'Mira', trait: 'funny', interest: 'food', stage, trust: 40, compatibility: 60, satisfaction: 50,
    sinceDay: 0, lastContactDay: -3, longDistance: false, memories: [],
  } as GameState['relationships']['partner'];
  return s;
}

describe('chat', () => {
  it('always has friends and family, and a partner thread only with a partner', () => {
    expect(chatThreads(makeGame()).map((t) => t.id)).toEqual(['friends', 'family']);
    expect(chatThreads(withPartner()).map((t) => t.id)).toEqual(['partner', 'friends', 'family']);
  });

  it('has well-formed scripts for every thread and partner stage', () => {
    expect(new Set(CHAT_SCRIPTS.map((c) => c.id)).size).toBe(CHAT_SCRIPTS.length);
    for (const c of CHAT_SCRIPTS) {
      expect(c.opener.length, c.id).toBeGreaterThan(0);
      expect(c.replies.length, c.id).toBe(3);
      expect(new Set(c.replies.map((r) => r.id)).size, c.id).toBe(3);
      for (const r of c.replies) for (const v of Object.values(r.effect)) expect(Math.abs(v as number), `${c.id}/${r.id}`).toBeLessThanOrEqual(8);
    }
    for (const stage of ['talking', 'dating', 'committed', 'engaged', 'married'] as PartnerStage[]) {
      expect(chatScriptFor(withPartner(stage), 'partner'), stage).not.toBeNull();
    }
    expect(chatScriptFor(makeGame(), 'friends')).not.toBeNull();
    expect(chatScriptFor(makeGame(), 'family')).not.toBeNull();
  });

  it('picks the same script for the same day and fits the stage', () => {
    const a = chatScriptFor(withPartner('married'), 'partner')!;
    const b = chatScriptFor(withPartner('married'), 'partner')!;
    expect(a.id).toBe(b.id);
    expect(!a.stages || a.stages.includes('married')).toBe(true);
  });

  it('replies once a day through the engine, with the reply mattering', () => {
    const s = makeGame({ seed: 21 });
    s.relationships.friends = 40;
    const script = chatScriptFor(s, 'friends')!;
    const best = [...script.replies].sort((x, y) => (y.effect.friends ?? 0) - (x.effect.friends ?? 0))[0];
    const before = JSON.stringify(s);
    const r = performAction(s, 'chat-reply', `friends:${best.id}`);
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    expect(r.state.relationships.friends).toBeCloseTo(40 + (best.effect.friends ?? 0), 2);
    expect(r.feedback.lines.join(' ')).toContain(best.reply);
    const again = performAction(r.state, 'chat-reply', `friends:${best.id}`);
    expect(again.feedback.ok).toBe(false);
    expect(again.feedback.error).toMatch(/tomorrow/i);
    expect(performAction(s, 'chat-reply', 'friends:not-a-reply').feedback.ok).toBe(false);
    expect(performAction(s, 'chat-reply', 'partner:x').feedback.ok).toBe(false);
  });

  it('a partner reply builds trust and counts as contact', () => {
    const s = withPartner('dating');
    const script = chatScriptFor(s, 'partner')!;
    const warm = [...script.replies].sort((x, y) => (y.effect.trust ?? 0) - (x.effect.trust ?? 0))[0];
    const r = performAction(s, 'chat-reply', `partner:${warm.id}`);
    expect(r.feedback.ok, r.feedback.error).toBe(true);
    expect(r.state.relationships.partner!.lastContactDay).toBe(r.state.clock.day);
    expect(r.state.relationships.partner!.trust).toBeGreaterThan(40);
  });
});