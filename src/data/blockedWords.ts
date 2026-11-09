// Word lists used ONLY to mask chat text and display names (src/lib/wordFilter.ts). They are never shown
// to the player and never used to punish: a match is replaced by asterisks. The lists hold common English
// and Bahasa Malaysia vulgarities, sexual terms, self-harm and bullying phrases, and ethnic, religious or
// personal slurs. They are plain lowercase letters (the filter handles case, accents, look-alike letters,
// repeated letters, symbols such as sh1t and f.u.c.k), and they are kept compact on purpose: whole words
// only, so innocent words that contain a fragment stay safe.
// Do not add mild words (damn, hell, bodoh, pokai, dick) or everyday food and place names (mamak, pukis).

/** English entries. The filter also matches common endings (s, es, ed, ing, in) for these. */
export const BLOCKED_EN: readonly string[] = [
  'fuck', 'fuk', 'fck', 'fucker', 'motherfucker', 'mofo', 'shit', 'shite', 'bullshit', 'shithead',
  'bitch', 'bastard', 'asshole', 'arsehole', 'ass', 'arse', 'dickhead', 'cock', 'cunt',
  'pussy', 'whore', 'slut', 'twat', 'wanker', 'bollocks', 'piss', 'porn', 'retard',
  'retarded', 'faggot', 'fag', 'dyke', 'tranny', 'nigger', 'nigga', 'chink', 'gook',
  'wetback', 'kike', 'paki', 'coon', 'towelhead', 'darkie',
  'kys', 'sex', 'nude', 'horny', 'boob',
];

/** Bahasa Malaysia (and common Hokkien, Indonesian and Tamil street) entries. Exact words, no endings. */
export const BLOCKED_MS: readonly string[] = [
  'puki', 'pukimak', 'pukima', 'kimak', 'pantat', 'butoh', 'burit', 'kote', 'lancau', 'lanjiao',
  'cibai', 'chibai', 'sial', 'sialan', 'celaka', 'bangsat', 'babi', 'anjing', 'jubur', 'sundal',
  'pelacur', 'lonte', 'haramjadah', 'jadah', 'taik', 'tahi', 'pepek', 'memek', 'kontol', 'ngentot',
  'jancuk', 'keling', 'kling', 'sakai', 'jakun', 'pondan', 'bapok', 'kanina', 'knn',
  'bogel', 'lucah',
];

/** Self-harm and bullying phrases of several words, each word lowercase letters. Matched across spaces and separators. */
export const BLOCKED_PHRASES: readonly (readonly string[])[] = [
  ['kill', 'yourself'], ['kill', 'urself'], ['kill', 'your', 'self'], ['hang', 'yourself'], ['go', 'die'],
  ['bunuh', 'diri'], ['gantung', 'diri'],
];

/** Innocent phrases that hold a listed word ("tahi lalat" is a mole): a match inside one of these is left alone. */
export const ALLOWED_PHRASES: readonly (readonly string[])[] = [['tahi', 'lalat']];

export const BLOCKED_WORDS: readonly string[] = [...BLOCKED_EN, ...BLOCKED_MS, ...BLOCKED_PHRASES.map((p) => p.join(' '))];
