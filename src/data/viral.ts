// Viral Hari Ini cards. ORIGINAL, FICTIONAL and just for fun: every line is written for this game,
// copies no post, headline, meme or image, and names no real person, party, brand or platform.
// A card is a light "everyone knows this feeling" joke, never a claim about the news.
// The pictures are pixel art: drawn in code from the scene palettes below, or (item 1) the owner's
// own cat picture, shrunk to 192x108 pixels in public/viral/.

export type ViralSceneId = 'sunset' | 'rain' | 'night' | 'noon' | 'dawn' | 'dusk';

export interface ViralScene {
  /** Sky colours, top to bottom (stepped bands, so it reads as pixel art). */
  sky: [string, string, string];
  ground: string;
  /** A second ground tone for the pixel texture. */
  ground2: string;
  sun: 'sun' | 'moon' | null;
  sunColor: string;
  rain: boolean;
  stars: boolean;
}

export const VIRAL_SCENES: Record<ViralSceneId, ViralScene> = {
  sunset: { sky: ['#5b3a8c', '#e0704a', '#f4b25a'], ground: '#3f7d3a', ground2: '#357033', sun: 'sun', sunColor: '#fff3b8', rain: false, stars: false },
  rain: { sky: ['#4b5870', '#66758c', '#8895a8'], ground: '#355f4a', ground2: '#2e5441', sun: null, sunColor: '#ffffff', rain: true, stars: false },
  night: { sky: ['#0f1535', '#1b2552', '#2c3a72'], ground: '#1f4a3c', ground2: '#1a4034', sun: 'moon', sunColor: '#f4efd2', rain: false, stars: true },
  noon: { sky: ['#4aa8e0', '#78c2ee', '#a8dcf6'], ground: '#4f9a3f', ground2: '#448a36', sun: 'sun', sunColor: '#fff6a8', rain: false, stars: false },
  dawn: { sky: ['#7a6fb8', '#f08aa0', '#ffd09a'], ground: '#4a8a48', ground2: '#3f7a3e', sun: 'sun', sunColor: '#fff0c8', rain: false, stars: false },
  dusk: { sky: ['#3a2f6e', '#a8507a', '#f09060'], ground: '#2f6a40', ground2: '#285d38', sun: 'moon', sunColor: '#ffe0b0', rain: false, stars: false },
};

export interface ViralItem {
  id: string;
  scene: ViralSceneId;
  /** Optional ready-made pixel picture in public/viral/ (used instead of the drawn scene). */
  image?: string;
  /** The topic tag shown above the line. */
  topic: { en: string; ms: string };
  /** The joke. At most 140 characters each. */
  line: { en: string; ms: string };
}

export const VIRAL_ITEMS: ViralItem[] = [
  {
    id: 'oyen-golden-hour',
    scene: 'sunset',
    image: 'oyen-sunset.png',
    topic: { en: 'Golden hour', ms: 'Waktu emas' },
    line: { en: 'Oyen: "Monday can wait. I am busy with golden hour."', ms: 'Oyen: "Isnin tunggu dulu. Aku sibuk dengan matahari terbenam."' },
  },
  {
    id: 'hujan-lebat',
    scene: 'rain',
    topic: { en: 'Heavy rain', ms: 'Hujan lebat' },
    line: { en: 'Heavy rain again. The plan to go out has become a plan to sleep.', ms: 'Hujan lebat lagi. Rancangan nak keluar dah jadi rancangan nak tidur.' },
  },
  {
    id: 'gaji-masuk',
    scene: 'noon',
    topic: { en: 'Payday', ms: 'Hari gaji' },
    line: { en: 'Salary in at 12:00. Gone by 12:05. Not magic, just auto-debit.', ms: 'Gaji masuk pukul 12. Hilang pukul 12:05. Bukan sihir, itu auto-debit.' },
  },
  {
    id: 'teh-tarik',
    scene: 'dusk',
    topic: { en: 'Mamak time', ms: 'Waktu mamak' },
    line: { en: 'One teh tarik, three hours of life advice. Fair trade.', ms: 'Satu teh tarik, tiga jam nasihat hidup. Adil.' },
  },
  {
    id: 'jalan-sesak',
    scene: 'noon',
    topic: { en: 'Traffic', ms: 'Jalan sesak' },
    line: { en: 'The map app says 20 minutes. The first 20 minutes is leaving the car park.', ms: 'App peta kata 20 minit. 20 minit pertama untuk keluar dari parking.' },
  },
  {
    id: 'musim-durian',
    scene: 'dawn',
    topic: { en: 'Durian season', ms: 'Musim durian' },
    line: { en: 'Durian season: thinner wallet, happier nose.', ms: 'Musim durian: dompet makin nipis, hidung makin gembira.' },
  },
  {
    id: 'cuti-panjang',
    scene: 'sunset',
    topic: { en: 'Long weekend', ms: 'Cuti panjang' },
    line: { en: 'Long weekend! Everyone escapes the city, on the very same highway.', ms: 'Cuti panjang! Semua orang lari dari bandar, di lebuh raya yang sama.' },
  },
  {
    id: 'tidur-awal',
    scene: 'night',
    topic: { en: 'Sleep', ms: 'Tidur' },
    line: { en: '"Sleeping early tonight." 2 a.m.: still scrolling.', ms: '"Malam ni tidur awal." Pukul 2 pagi: masih scroll.' },
  },
  {
    id: 'hari-isnin',
    scene: 'dawn',
    topic: { en: 'Monday', ms: 'Hari Isnin' },
    line: { en: 'Monday is not a day. It is a patience test with a coffee queue.', ms: 'Isnin bukan hari. Ia ujian sabar lengkap dengan barisan kopi.' },
  },
  {
    id: 'cuaca-panas',
    scene: 'noon',
    topic: { en: 'Hot weather', ms: 'Cuaca panas' },
    line: { en: 'Not "feels like 35". It feels like being slow-cooked. Pass the fan.', ms: 'Bukan "rasa 35 darjah". Rasa macam dimasak perlahan. Tolong bagi kipas.' },
  },
];

export const viralById = (id: string | null | undefined): ViralItem | undefined => VIRAL_ITEMS.find((i) => i.id === id);