import { describe, expect, it } from 'vitest';
import { actionCatalogue } from '../src/engine/actions';
import { ACTIVITIES, ROOMS, activityFor } from '../src/components/room/activity';

describe('activityFor (which animation and room an action plays)', () => {
  it('maps every action in the catalogue to a known activity with a known room', () => {
    for (const a of actionCatalogue) {
      const act = activityFor(a.id);
      expect(ACTIVITIES[act], a.id).toBeDefined();
      expect(ROOMS[ACTIVITIES[act].room], a.id).toBeDefined();
    }
  });

  it('plays the obvious animation for the everyday actions', () => {
    expect(activityFor('run')).toBe('run');
    expect(ACTIVITIES.run.room).toBe('park');
    expect(activityFor('eat', 'nasi-lemak')).toBe('eat');
    expect(ACTIVITIES.eat.room).toBe('kitchen');
    expect(activityFor('sleep', '8')).toBe('sleep');
    expect(ACTIVITIES.sleep.room).toBe('bedroom');
    expect(activityFor('work-shift')).toBe('work');
    expect(ACTIVITIES.work.room).toBe('office');
    expect(activityFor('attend-class')).toBe('study');
    expect(ACTIVITIES.study.room).toBe('campus');
    expect(activityFor('gym')).toBe('workout');
    expect(ACTIVITIES.workout.room).toBe('gym');
  });

  it('falls back to idle for an unknown id', () => {
    expect(activityFor('not-a-real-action')).toBe('idle');
  });
});