// Preset reaction stickers for chat between friends who play online. Original, friendly phrases in
// English and Bahasa Malaysia; no free text, no real people. Emoji follow the halal-friendly rules
// (tests/content.test.ts scans all of src/).

export interface StickerDef {
  id: string;
  emoji: string;
  en: string;
  ms: string;
}

export const STICKERS: StickerDef[] = [
  { id: 'semangat', emoji: '💪', en: 'Semangat!', ms: 'Semangat!' },
  { id: 'jom-lepak', emoji: '🍵', en: 'Jom lepak!', ms: 'Jom lepak!' },
  { id: 'tahniah', emoji: '🎉', en: 'Tahniah!', ms: 'Tahniah!' },
  { id: 'rindu', emoji: '🤗', en: 'Rindu la!', ms: 'Rindu la!' },
  { id: 'gelak', emoji: '😂', en: 'Hahaha', ms: 'Hahaha' },
  { id: 'ok', emoji: '👍', en: 'Okay boss', ms: 'Okay boss' },
  { id: 'sabar', emoji: '🙏', en: 'Sabar ya', ms: 'Sabar ya' },
  { id: 'syok', emoji: '😎', en: 'Syok!', ms: 'Syok!' },
];

export const stickerById = (id: string | undefined): StickerDef | undefined => STICKERS.find((s) => s.id === id);
