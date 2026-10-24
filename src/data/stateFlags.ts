// Official flags of Malaysia's states and federal territories, shown next to the player's home
// state. Files are unmodified copies from Wikimedia Commons in public/flags/, credited below; the
// CC BY-SA ones keep that licence and their author's credit. Used for identification only: no
// state government endorses or is connected with this game.

export interface StateFlag {
  state: string;
  /** File name under public/flags/. */
  file: string;
  license: 'Public domain' | 'CC BY-SA 3.0';
  /** Required for CC BY-SA files. */
  author?: string;
  source: string;
}

const commons = (name: string) => `https://commons.wikimedia.org/wiki/File:${name}`;
export const CC_BY_SA_3 = 'https://creativecommons.org/licenses/by-sa/3.0/';

export const STATE_FLAGS: StateFlag[] = [
  { state: 'Johor', file: 'johor.svg', license: 'Public domain', source: commons('Flag_of_Johor.svg') },
  { state: 'Kedah', file: 'kedah.svg', license: 'Public domain', source: commons('Flag_of_Kedah.svg') },
  { state: 'Kelantan', file: 'kelantan.svg', license: 'CC BY-SA 3.0', author: 'Mysid', source: commons('Flag_of_Kelantan.svg') },
  { state: 'Melaka', file: 'melaka.svg', license: 'Public domain', source: commons('Flag_of_Malacca.svg') },
  { state: 'Negeri Sembilan', file: 'negeri-sembilan.svg', license: 'Public domain', source: commons('Flag_of_Negeri_Sembilan.svg') },
  { state: 'Pahang', file: 'pahang.svg', license: 'Public domain', source: commons('Flag_of_Pahang.svg') },
  { state: 'Perak', file: 'perak.svg', license: 'Public domain', source: commons('Flag_of_Perak.svg') },
  { state: 'Perlis', file: 'perlis.svg', license: 'Public domain', source: commons('Flag_of_Perlis.svg') },
  { state: 'Pulau Pinang', file: 'pulau-pinang.svg', license: 'Public domain', source: commons('Flag_of_Penang_(Malaysia).svg') },
  { state: 'Sabah', file: 'sabah.svg', license: 'Public domain', source: commons('Flag_of_Sabah.svg') },
  { state: 'Sarawak', file: 'sarawak.svg', license: 'CC BY-SA 3.0', author: 'Matthew A. Lockhart', source: commons('Flag_of_Sarawak.svg') },
  { state: 'Selangor', file: 'selangor.svg', license: 'CC BY-SA 3.0', author: 'Mysid', source: commons('Flag_of_Selangor.svg') },
  { state: 'Terengganu', file: 'terengganu.svg', license: 'CC BY-SA 3.0', author: 'Mysid', source: commons('Flag_of_Terengganu.svg') },
  { state: 'Kuala Lumpur', file: 'kuala-lumpur.svg', license: 'Public domain', source: commons('Flag_of_Kuala_Lumpur,_Malaysia.svg') },
  { state: 'Putrajaya', file: 'putrajaya.svg', license: 'Public domain', source: commons('Flag_of_Putrajaya.svg') },
  { state: 'Labuan', file: 'labuan.svg', license: 'Public domain', source: commons('Flag_of_Labuan.svg') },
];

export const flagFor = (state: string | undefined) => STATE_FLAGS.find((f) => f.state === state);