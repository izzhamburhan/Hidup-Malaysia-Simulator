import { describe, expect, it } from 'vitest';
import { actionCatalogue } from '../src/engine/actions';
import { ACTIVITIES, ROOMS, activityFor, daylight, lampOn, skyIcon, wallItemFor } from '../src/components/room/activity';

const at = (h: number, m = 0) => h * 60 + m;

describe('daylight (the room follows the clock, never the action)', () => {
  it('splits the day into morning, day, dusk and night', () => {
    expect(daylight(at(4, 59))).toBe('night');
    expect(daylight(at(5))).toBe('morning');
    expect(daylight(at(10, 59))).toBe('morning');
    expect(daylight(at(11))).toBe('day');
    expect(daylight(at(16))).toBe('dusk');
    expect(daylight(at(19, 29))).toBe('dusk');
    expect(daylight(at(19, 30))).toBe('night');
    expect(daylight(at(23, 59))).toBe('night');
    expect(daylight(at(0))).toBe('night');
  });

  it('switches the lamp on at night, and off while sleeping', () => {
    expect(lampOn(at(21, 35), 'idle')).toBe(true);
    expect(lampOn(at(21, 35), 'run')).toBe(true);
    expect(lampOn(at(21, 35), 'sleep')).toBe(false);
    expect(lampOn(at(18), 'idle')).toBe(false);
    expect(lampOn(at(9), 'idle')).toBe(false);
  });

  it('shows the sky badge for the time', () => {
    expect(skyIcon(at(8))).toBe('🌤️');
    expect(skyIcon(at(13))).toBe('☀️');
    expect(skyIcon(at(18))).toBe('🌇');
    expect(skyIcon(at(22))).toBe('🌙');
  });

  it('gives no room a time of day of its own', () => {
    for (const [id, room] of Object.entries(ROOMS)) {
      expect('dark' in room, id).toBe(false);
      // Outdoor rooms take their sky from the clock: no sun at midnight.
      for (const m of [at(0), at(22)]) expect(['☀️', '☁️', '🌤️'], `${id} at night`).not.toContain(wallItemFor(room, m));
    }
    expect(wallItemFor(ROOMS.park, at(13))).toBe('☁️');
    expect(wallItemFor(ROOMS.kitchen, at(22))).toBe(ROOMS.kitchen.wallItem);
  });
});

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