import { describe, expect, it } from 'vitest';
import { chatPartner, dailyRelationships, goOnDate, meetSomeone, startTalking } from '../src/engine/social';
import { performAction } from '../src/engine/simulationEngine';
import { at, makeGame } from './helpers';

describe('relationships', () => {
  it('meeting someone creates a prospect; talking makes them a partner', () => {
    const s = makeGame();
    expect(meetSomeone(s, 'the mamak')).toMatch(/You met/);
    const p = s.relationships.prospects[0];
    startTalking(s, p.id);
    expect(s.relationships.partner?.stage).toBe('talking');
    expect(s.relationships.prospects).toHaveLength(0);
  });

  it('dates and chats build trust until you are dating', () => {
    const s = makeGame();
    meetSomeone(s, 'a social event');
    startTalking(s, s.relationships.prospects[0].id);
    s.relationships.partner!.compatibility = 95;
    for (let i = 0; i < 4; i++) {
      chatPartner(s);
      goOnDate(s, 2, 'Dinner');
    }
    expect(s.relationships.partner!.stage).toBe('dating');
    expect(s.relationships.partner!.trust).toBeGreaterThan(45);
  });

  it('neglect lowers satisfaction gently, and talking-stage contacts drift away', () => {
    const s = makeGame();
    meetSomeone(s, 'an app');
    startTalking(s, s.relationships.prospects[0].id);
    s.relationships.partner!.stage = 'dating';
    const sat = s.relationships.partner!.satisfaction;
    at(s, 6, 12);
    dailyRelationships(s);
    expect(s.relationships.partner!.satisfaction).toBeLessThan(sat);

    const t = makeGame();
    meetSomeone(t, 'an app');
    startTalking(t, t.relationships.prospects[0].id);
    at(t, 10, 12);
    dailyRelationships(t);
    expect(t.relationships.partner).toBeNull();
  });

  it('being single is valid: no penalties for having no partner', () => {
    const s = makeGame();
    const h = s.stats.happiness;
    dailyRelationships(s);
    expect(s.stats.happiness).toBe(h);
  });

  it('family actions raise the family bond', () => {
    const s = makeGame();
    const r = performAction(s, 'call-parents');
    expect(r.state.relationships.family).toBeGreaterThan(s.relationships.family);
  });
});
