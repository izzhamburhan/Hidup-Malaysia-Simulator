// Viral Hari Ini cards. ORIGINAL, FICTIONAL and just for fun: every line is written for this game,
// copies no post, headline, meme or image, and names no real person, party, brand or platform.
// A card is a light "everyone knows this feeling" joke, never a claim about the news.
// One picture, one card. The cat card uses the owner's own picture, pixelated to 270x152 for the game
// and kept at full quality (1080x608) for Save; the other cards are pixel illustrations drawn in code
// (src/lib/viralSprites.ts), each with its own scene and sprite. Educational lines are light game tips,
// not financial or medical advice.

import type { ViralSpriteId } from '../lib/viralSprites';

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
  /** What is drawn on the scene when the card has no ready-made picture. */
  sprite?: ViralSpriteId;
  /** Optional ready-made pixel picture in public/viral/ (used instead of the drawn scene). */
  image?: string;
  /** The full-quality original of the picture, used by Save (public/viral/). */
  original?: string;
  /** The topic tag shown above the line. */
  topic: { en: string; ms: string };
  /** The joke. At most 140 characters each. */
  line: { en: string; ms: string };
}

/** One picture, one card: a ready-made picture in public/viral/ (pixelated + original), or its own drawn scene and sprite. */
export const VIRAL_ITEMS: ViralItem[] = [
  {
    id: 'oyen-golden-hour',
    scene: 'sunset',
    image: 'oyen-sunset.png',
    original: 'oyen-sunset-original.jpg',
    topic: { en: 'Golden hour', ms: 'Waktu emas' },
    line: { en: 'Oyen: "Monday can wait. I am busy with golden hour."', ms: 'Oyen: "Isnin tunggu dulu. Aku sibuk dengan matahari terbenam."' },
  },
  {
    id: 'gaji-masuk',
    scene: 'noon',
    sprite: 'tabung',
    topic: { en: 'Payday', ms: 'Hari gaji' },
    line: { en: 'Payday tip: pay yourself first. Move savings out before the shopping app opens.', ms: 'Tip gaji: bayar diri sendiri dulu. Asingkan simpanan sebelum buka app membeli-belah.' },
  },
  {
    id: 'dana-kecemasan',
    scene: 'rain',
    sprite: 'umbrella',
    topic: { en: 'Emergency fund', ms: 'Dana kecemasan' },
    line: { en: 'An emergency fund is an umbrella for your wallet. Save it before it rains.', ms: 'Dana kecemasan ialah payung untuk dompet. Simpan sebelum hujan turun.' },
  },
  {
    id: 'teh-tarik',
    scene: 'dusk',
    sprite: 'teh',
    topic: { en: 'Small treats', ms: 'Belanja kecil' },
    line: { en: 'A RM2 teh tarik a day is RM60 a month. Small treats add up, so enjoy them on purpose.', ms: 'Teh tarik RM2 sehari jadi RM60 sebulan. Belanja kecil pun berkumpul, jadi nikmati dengan sedar.' },
  },
  {
    id: 'tidur-cukup',
    scene: 'night',
    sprite: 'bed',
    topic: { en: 'Sleep', ms: 'Tidur' },
    line: { en: 'Sleep is a free charger. Your phone is at 100%. You are at 12%.', ms: 'Tidur ialah pengecas percuma. Telefon kau 100%. Kau 12%.' },
  },
  {
    id: 'air-kosong',
    scene: 'noon',
    sprite: 'water',
    topic: { en: 'Hot weather', ms: 'Cuaca panas' },
    line: { en: 'Hot day? Water first, then the third iced tea.', ms: 'Cuaca panas? Air kosong dulu, baru teh ais yang ketiga.' },
  },
  {
    id: 'keluar-awal',
    scene: 'dawn',
    sprite: 'traffic',
    topic: { en: 'Traffic', ms: 'Jalan sesak' },
    line: { en: 'Leave 15 minutes early: the cheapest way to cut stress.', ms: 'Bertolak 15 minit awal: cara paling murah kurangkan stres.' },
  },
];

export const viralById = (id: string | null | undefined): ViralItem | undefined => VIRAL_ITEMS.find((i) => i.id === id);