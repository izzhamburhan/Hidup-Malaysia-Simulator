import { describe, expect, it } from 'vitest';
import { MALAYSIA, mapStateByName } from '../src/data/malaysia';
import {
  anchorTiles,
  borderEdges,
  campusState,
  costNote,
  glyphSlots,
  kampungRoute,
  markerSummary,
  markersFor,
  payNote,
  tileCentroid,
} from '../src/components/map/mapModel';
import { makeGame } from './helpers';

describe('tileCentroid', () => {
  it('is the tile centre for a one-tile state', () => {
    expect(tileCentroid('Kuala Lumpur')).toEqual({ x: 3.5, y: 7.5 });
    expect(tileCentroid('Perlis')).toEqual({ x: 1.5, y: 0.5 });
  });

  it('is the mean of the tile centres for a bigger state, and null for an unknown one', () => {
    // Selangor: (2,6) (3,6) (2,7) (2,8) -> centres 2.5,3.5,2.5,2.5 / 6.5,6.5,7.5,8.5
    expect(tileCentroid('Selangor')).toEqual({ x: 2.75, y: 7.25 });
    expect(tileCentroid('Atlantis')).toBeNull();
  });
});

describe('anchorTiles', () => {
  it('lists every tile of the state, nearest the centroid first', () => {
    for (const s of MALAYSIA) {
      const tiles = anchorTiles(s.name);
      expect(tiles).toHaveLength(s.tiles.length);
      const c = tileCentroid(s.name)!;
      const d = (t: [number, number]) => (t[0] + 0.5 - c.x) ** 2 + (t[1] + 0.5 - c.y) ** 2;
      for (let i = 1; i < tiles.length; i++) expect(d(tiles[i - 1])).toBeLessThanOrEqual(d(tiles[i]));
    }
  });
});

describe('borderEdges', () => {
  it('a one-tile state has all four edges as border', () => {
    expect(borderEdges('Kuala Lumpur')).toHaveLength(4);
  });

  it('skips edges between two tiles of the same state', () => {
    const tiles = mapStateByName('Selangor')!.tiles.length;
    // 4 tiles in an L shape: 4 * 4 sides minus 2 per internal shared edge (3 internal edges).
    expect(borderEdges('Selangor')).toHaveLength(tiles * 4 - 2 * 3);
  });
});

describe('campusState', () => {
  it('is null for a life that never studied', () => {
    const s = makeGame();
    s.education.status = 'none';
    s.education.universityId = null;
    expect(campusState(s)).toBeNull();
  });

  it('is the university state while studying or after graduating, not after dropping out', () => {
    const s = makeGame();
    s.education.universityId = 'um';
    s.education.status = 'studying';
    expect(campusState(s)).toBe('Kuala Lumpur');
    s.education.status = 'graduated';
    expect(campusState(s)).toBe('Kuala Lumpur');
    s.education.status = 'dropped';
    expect(campusState(s)).toBeNull();
  });
});

describe('markersFor', () => {
  it('marks the residence', () => {
    const s = makeGame();
    expect(markersFor(s, s.location.state)).toContain('residence');
    expect(markersFor(s, 'Perlis')).toEqual([]);
  });

  it('marks a home state (kampung) only when it differs from the residence', () => {
    const s = makeGame({ homeState: 'Kelantan' });
    s.location.state = 'Selangor';
    expect(markersFor(s, 'Kelantan')).toEqual(['kampung']);
    s.location.state = 'Kelantan';
    expect(markersFor(s, 'Kelantan')).toEqual(['residence']);
  });

  it('marks the campus state and stamped states, in a fixed order', () => {
    const s = makeGame({ homeState: 'Kelantan' });
    s.location.state = 'Kuala Lumpur';
    s.education.universityId = 'um';
    s.education.status = 'studying';
    s.travel.stamps['Kuala Lumpur'] = 3;
    s.travel.stamps.Sabah = 40;
    expect(markersFor(s, 'Kuala Lumpur')).toEqual(['residence', 'campus', 'stamp']);
    expect(markersFor(s, 'Sabah')).toEqual(['stamp']);
  });
});

describe('glyphSlots', () => {
  it('puts each glyph on a tile of its own state, full size when it has room', () => {
    const s = makeGame({ homeState: 'Kelantan' });
    s.location.state = 'Selangor';
    s.education.universityId = 'ukm'; // Selangor campus too
    s.education.status = 'studying';
    const slots = glyphSlots(s, 'Selangor');
    expect(slots.map((g) => g.kind)).toEqual(['residence', 'campus']);
    const own = mapStateByName('Selangor')!.tiles.map(([c, r]) => `${c},${r}`);
    for (const g of slots) {
      expect(own).toContain(`${g.col},${g.row}`);
      expect(g.r).toBeCloseTo(0.42);
    }
    expect(`${slots[0].col},${slots[0].row}`).not.toBe(`${slots[1].col},${slots[1].row}`);
  });

  it('shrinks and splits the tile when a one-tile state carries two glyphs', () => {
    const s = makeGame();
    s.location.state = 'Kuala Lumpur';
    s.education.universityId = 'um';
    s.education.status = 'graduated';
    const [a, b] = glyphSlots(s, 'Kuala Lumpur');
    expect([a.kind, b.kind]).toEqual(['residence', 'campus']);
    expect(a.r).toBeLessThan(0.3);
    expect(a.x).toBeLessThan(3.5);
    expect(b.x).toBeGreaterThan(3.5);
  });

  it('gives stamps no glyph (they tint the state) and unmarked states none at all', () => {
    const s = makeGame();
    s.travel.stamps.Sabah = 2;
    expect(glyphSlots(s, 'Sabah')).toEqual([]);
    expect(glyphSlots(s, 'Perlis')).toEqual([]);
  });
});

describe('markerSummary', () => {
  it('names the state and says what is marked there in plain words', () => {
    const s = makeGame({ homeState: 'Kelantan' });
    s.location.state = 'Selangor';
    s.travel.stamps.Kelantan = 5;
    expect(markerSummary(s, 'Selangor')).toBe('Selangor. You live here.');
    expect(markerSummary(s, 'Kelantan')).toBe('Kelantan. Home state, your kampung. Stamped on your trip passport.');
    expect(markerSummary(s, 'Perlis')).toBe('Perlis.');
  });
});

describe('kampungRoute', () => {
  it('is null when you live in your home state', () => {
    const s = makeGame({ homeState: 'Selangor' });
    s.location.state = 'Selangor';
    expect(kampungRoute(s)).toBeNull();
  });

  it('runs from residence to home state when they differ', () => {
    const s = makeGame({ homeState: 'Sabah' });
    s.location.state = 'Selangor';
    expect(kampungRoute(s)).toEqual({ from: 'Selangor', to: 'Sabah' });
  });
});

describe('cost and pay notes', () => {
  it('describe the fictional factor relative to Selangor in plain words', () => {
    expect(costNote(1)).toMatch(/same as Selangor/);
    expect(costNote(1.12)).toMatch(/higher than Selangor/);
    expect(costNote(0.8)).toMatch(/lower than Selangor/);
    expect(payNote(1.08)).toMatch(/higher than Selangor/);
    expect(payNote(0.85)).toMatch(/lower than Selangor/);
  });

  it('uses "a bit" for small gaps and none for large ones', () => {
    expect(costNote(0.95)).toMatch(/a bit lower/);
    expect(costNote(0.8)).not.toMatch(/a bit/);
  });
});
