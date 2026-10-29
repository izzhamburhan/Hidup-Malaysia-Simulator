// Malaysia's 13 states and 3 federal territories for the game map, trips and moving.
// The map is a STYLISED PIXEL-TILE MAP, NOT TO SCALE and not a survey of real borders: each state
// is a small cluster of grid tiles placed roughly where it sits. Cost-of-living and pay factors are
// FICTIONAL GAME ESTIMATES relative to Selangor (1.0), the baseline the game's prices were tuned for.
// They are not statistics. Blurbs are friendly game flavour about places, food and nature.

export type Region = 'north' | 'east-coast' | 'central' | 'south' | 'borneo';

export interface MapState {
  /** Same spelling as STATE_FLAGS[].state and character.homeState. */
  name: string;
  short: string;
  region: Region;
  /** Grid tiles [column, row] on a 26 x 12 board; Peninsular left, Borneo right. */
  tiles: [number, number][];
  /** Fictional living-cost factor for rent and everyday prices, Selangor = 1. */
  costFactor: number;
  /** Fictional factor on new job offers, Selangor = 1. */
  payFactor: number;
  blurb: string;
}

export const MAP_COLS = 26;
export const MAP_ROWS = 12;
/** Where lives start unless they live with family: the Klang Valley. */
export const DEFAULT_RESIDENCE = 'Selangor';

export const MALAYSIA: MapState[] = [
  { name: 'Perlis', short: 'PLS', region: 'north', tiles: [[1, 0]], costFactor: 0.85, payFactor: 0.88, blurb: 'The smallest state: paddy fields, limestone hills and sweet harumanis mangoes.' },
  { name: 'Kedah', short: 'KDH', region: 'north', tiles: [[1, 1], [2, 1], [1, 2], [2, 2]], costFactor: 0.85, payFactor: 0.88, blurb: 'The rice bowl: endless paddy fields, with island hopping just offshore.' },
  { name: 'Pulau Pinang', short: 'PNG', region: 'north', tiles: [[0, 3]], costFactor: 1.0, payFactor: 0.98, blurb: 'Island heritage streets, wall murals and hawker food worth the queue.' },
  { name: 'Perak', short: 'PRK', region: 'north', tiles: [[1, 3], [2, 3], [1, 4], [2, 4], [3, 4], [2, 5], [3, 5]], costFactor: 0.88, payFactor: 0.9, blurb: 'Limestone caves, old tin-mining towns and a famous cup of white coffee.' },
  { name: 'Kelantan', short: 'KTN', region: 'east-coast', tiles: [[4, 1], [5, 1], [3, 2], [4, 2], [5, 2], [4, 3]], costFactor: 0.8, payFactor: 0.85, blurb: 'Kites, batik and wau, with nasi kerabu for breakfast.' },
  { name: 'Terengganu', short: 'TRG', region: 'east-coast', tiles: [[6, 2], [5, 3], [6, 3], [7, 3], [5, 4], [6, 4], [7, 4]], costFactor: 0.85, payFactor: 0.87, blurb: 'Turquoise islands, turtle beaches and nasi dagang mornings.' },
  { name: 'Pahang', short: 'PHG', region: 'east-coast', tiles: [[4, 4], [4, 5], [5, 5], [6, 5], [7, 5], [4, 6], [5, 6], [6, 6], [7, 6], [4, 7], [5, 7], [6, 7], [7, 7], [5, 8], [6, 8]], costFactor: 0.88, payFactor: 0.9, blurb: 'The biggest peninsular state: cool highlands, tea hills and old rainforest.' },
  { name: 'Selangor', short: 'SGR', region: 'central', tiles: [[2, 6], [3, 6], [2, 7], [2, 8]], costFactor: 1.0, payFactor: 1.0, blurb: 'Busy, fast and full of malls, with fireflies by the river at night.' },
  { name: 'Kuala Lumpur', short: 'KUL', region: 'central', tiles: [[3, 7]], costFactor: 1.12, payFactor: 1.08, blurb: 'Tall towers, famous traffic jams and teh tarik at 2 AM.' },
  { name: 'Putrajaya', short: 'PJY', region: 'central', tiles: [[3, 8]], costFactor: 1.0, payFactor: 1.0, blurb: 'A planned city of lakes, bridges and wide, quiet boulevards.' },
  { name: 'Negeri Sembilan', short: 'NSN', region: 'south', tiles: [[4, 8], [3, 9], [4, 9]], costFactor: 0.9, payFactor: 0.92, blurb: 'Curved Minang rooftops, weekend beaches and fiery masak lemak.' },
  { name: 'Melaka', short: 'MLK', region: 'south', tiles: [[3, 10]], costFactor: 0.92, payFactor: 0.92, blurb: 'An old trading port of red buildings, river cruises and chicken rice balls.' },
  { name: 'Johor', short: 'JHR', region: 'south', tiles: [[5, 9], [6, 9], [7, 9], [4, 10], [5, 10], [6, 10], [7, 10], [5, 11], [6, 11]], costFactor: 0.95, payFactor: 0.96, blurb: 'The southern gateway: long drives, seafood by the sea and mee rebus.' },
  { name: 'Labuan', short: 'LBN', region: 'borneo', tiles: [[19, 4]], costFactor: 0.95, payFactor: 0.95, blurb: 'A small island off Borneo with quiet beaches and calm evenings.' },
  { name: 'Sabah', short: 'SBH', region: 'borneo', tiles: [[22, 2], [21, 3], [22, 3], [23, 3], [24, 3], [20, 4], [21, 4], [22, 4], [23, 4], [24, 4], [25, 4], [20, 5], [21, 5], [22, 5], [23, 5], [24, 5]], costFactor: 0.92, payFactor: 0.9, blurb: 'The land below the wind: a famous mountain, coral reefs and Kaamatan.' },
  { name: 'Sarawak', short: 'SWK', region: 'borneo', tiles: [[17, 5], [18, 5], [14, 6], [15, 6], [16, 6], [17, 6], [18, 6], [19, 6], [20, 6], [12, 7], [13, 7], [14, 7], [15, 7], [16, 7], [17, 7], [12, 8], [13, 8], [14, 8]], costFactor: 0.92, payFactor: 0.9, blurb: 'Land of the hornbills: rainforest, longhouses, Gawai and Sarawak laksa.' },
];

export const mapStateByName = (name: string | null | undefined) => MALAYSIA.find((s) => s.name === name);
