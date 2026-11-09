import { describe, expect, it } from 'vitest';
import { ALLOWED_PHRASES, BLOCKED_EN, BLOCKED_MS, BLOCKED_PHRASES } from '../src/data/blockedWords';
import { hasBlockedWord, maskText } from '../src/lib/wordFilter';

describe('word filter: blocked words', () => {
  it('masks English and Bahasa Malaysia words, keeping the length', () => {
    expect(maskText('what the fuck')).toBe('what the ****');
    expect(maskText('Kau memang SIAL')).toBe('Kau memang ****');
    expect(maskText('puki dan pukimak')).toBe('**** dan *******');
    expect(maskText('dasar bangsat, celaka!')).toBe('dasar *******, ******!');
  });

  it('is case-insensitive and ignores accents', () => {
    expect(hasBlockedWord('FuCk')).toBe(true);
    expect(hasBlockedWord('Fúck')).toBe(true);
    expect(hasBlockedWord('SHIT')).toBe(true);
  });

  it('catches repeated letters, leetspeak and separators', () => {
    expect(hasBlockedWord('fuuuuck')).toBe(true);
    expect(hasBlockedWord('sh1t')).toBe(true);
    expect(hasBlockedWord('b!tch')).toBe(true);
    expect(hasBlockedWord('@ss')).toBe(true);
    expect(hasBlockedWord('a$$hole')).toBe(true);
    expect(hasBlockedWord('f*ck')).toBe(true);
    expect(maskText('f.u.c.k you')).toBe('******* you');
    expect(maskText('s-h-i-t')).toBe('*******');
    expect(maskText('f u c k')).toBe('*******');
    expect(maskText('mother-fucker')).toBe('*************');
    expect(maskText('what-the-fuck')).toBe('what-the-****');
    expect(hasBlockedWord('fu.ck')).toBe(true);
    expect(hasBlockedWord('p u k i m a k')).toBe(true);
  });

  it('catches common endings of English words', () => {
    expect(hasBlockedWord('fucking')).toBe(true);
    expect(hasBlockedWord('bitches')).toBe(true);
    expect(hasBlockedWord('assholes')).toBe(true);
    expect(hasBlockedWord('pissed')).toBe(true);
    expect(hasBlockedWord('fuckin')).toBe(true);
  });

  it('does not mask innocent words that contain a fragment', () => {
    for (const ok of [
      'class', 'assess', 'assessment', 'Scunthorpe', 'bass', 'mass', 'passion', 'cockpit', 'cocktail', 'Dickens',
      'shitake', 'shiitake', 'analysis', 'grass', 'classic', 'pukis', 'mamak', 'nasi lemak', 'Seri Harapan',
      'Penang', 'hello', 'peacock', 'babysit', 'sialang', 'kotelnich', 'raccoon', 'accommodation', 'assistant',
      'Butterworth', 'Kota Kinabalu', 'tahun', 'taikoo', 'jadual', 'pantai', 'burung', 'kerling', 'Cockburn',
    ]) {
      expect(hasBlockedWord(ok), ok).toBe(false);
      expect(maskText(ok), ok).toBe(ok);
    }
  });

  it('does not mask numbers that only look like leetspeak, or stray asterisks', () => {
    expect(hasBlockedWord('455')).toBe(false);
    expect(hasBlockedWord('***')).toBe(false);
    expect(hasBlockedWord('a*s')).toBe(false);
    expect(hasBlockedWord('U.S.A')).toBe(false);
    expect(hasBlockedWord('e.g. a b c d')).toBe(false);
  });

  it('keeps emoji and ordinary punctuation untouched', () => {
    const text = 'Jom makan 🍜😀 lepas kelas! Okay?';
    expect(maskText(text)).toBe(text);
    expect(maskText('fuck 😀 you')).toBe('**** 😀 you');
  });

  it('every listed word is caught as itself and none is empty', () => {
    for (const w of [...BLOCKED_EN, ...BLOCKED_MS]) {
      expect(w.length).toBeGreaterThan(2);
      expect(hasBlockedWord(w), w).toBe(true);
    }
    for (const phrase of BLOCKED_PHRASES) expect(hasBlockedWord(phrase.join(' ')), phrase.join(' ')).toBe(true);
    for (const phrase of ALLOWED_PHRASES) expect(hasBlockedWord(phrase.join(' ')), phrase.join(' ')).toBe(false);
  });

  it('handles empty text', () => {
    expect(maskText('')).toBe('');
    expect(hasBlockedWord('')).toBe(false);
  });
});

describe('word filter: links and phone numbers', () => {
  it('hides links', () => {
    expect(maskText('see https://example.com/page now')).toBe('see [hidden] now');
    expect(maskText('go to www.example.my')).toBe('go to [hidden]');
    expect(maskText('add me on insta.com')).toBe('add me on [hidden]');
    expect(maskText('http://a.b')).toBe('[hidden]');
    expect(maskText('visit shop.co.my today')).toBe('visit [hidden] today');
  });

  it('hides phone numbers in common shapes', () => {
    expect(maskText('call 0123456789')).toBe('call [hidden]');
    expect(maskText('call 012-345 6789 ok')).toBe('call [hidden] ok');
    expect(maskText('wa +60 12-345 6789')).toBe('wa [hidden]');
    expect(maskText('(03) 1234 5678')).toBe('[hidden]');
    expect(maskText('1234567')).toBe('[hidden]');
  });

  it('keeps short numbers, prices and dates', () => {
    expect(maskText('I have 123456 points')).toBe('I have 123456 points');
    expect(maskText('RM1,000,000')).toBe('RM1,000,000');
    expect(maskText('meet on 12-11-2026')).toBe('meet on 12-11-2026');
    expect(maskText('on 2026-11-12 at 10.30')).toBe('on 2026-11-12 at 10.30');
    expect(maskText('Day 400 and age 23')).toBe('Day 400 and age 23');
  });

  it('hasBlockedWord is about words only', () => {
    expect(hasBlockedWord('https://example.com')).toBe(false);
    expect(hasBlockedWord('0123456789')).toBe(false);
  });

  it('masks words and links together', () => {
    expect(maskText('fuck www.x.com 0123456789')).toBe('**** [hidden] [hidden]');
  });
});

describe('word filter: tricks and false positives', () => {
  it('sees through invisible characters, full-width letters and look-alike letters', () => {
    expect(maskText('f\u200Buck')).toBe('*****');
    expect(maskText('fu\u00ADck you')).toBe('***** you');
    expect(maskText('f\u2060u\uFEFFck')).toBe('******');
    expect(maskText('\uFF46\uFF55\uFF43\uFF4B')).toBe('****');
    expect(maskText('\u0455h\u0456t')).toBe('****'); // Cyrillic s and i
    expect(hasBlockedWord('p\u043Ern')).toBe(true); // Cyrillic o
    expect(hasBlockedWord('\u03C1\u03BFrn')).toBe(true); // Greek rho and omicron
    expect(hasBlockedWord('f\u03C5ck')).toBe(true); // Greek upsilon
    expect(hasBlockedWord('\u041F\u0440\u0438\u0432\u0435\u0442 \u043C\u0438\u0440')).toBe(false); // honest Cyrillic text
  });

  it('masks the original span, including the invisible characters', () => {
    expect(maskText('a f\u200Buck b')).toBe('a ***** b');
  });

  it('hides messenger links, .me domains and handles', () => {
    expect(maskText('wa.me/60123456789')).toBe('[hidden]');
    expect(maskText('chat t.me/aina_my now')).toBe('chat [hidden] now');
    expect(maskText('find me at aina.me')).toBe('find me at [hidden]');
    expect(maskText('add @aina_99 ok')).toBe('add [hidden] ok');
    expect(maskText('my ig: aina.my')).toBe('my [hidden]');
    expect(maskText('Insta: aina99 pls')).toBe('[hidden] pls');
    expect(maskText('tiktok:aina99')).toBe('[hidden]');
    expect(maskText('telegram: @aina')).toBe('[hidden]');
    expect(maskText('whatsapp: 0123456789')).toBe('[hidden]');
    expect(maskText('WhatsApp: aina99')).toBe('[hidden]');
  });

  it('keeps everyday text that only looks close', () => {
    for (const ok of ['call me later', 'give it to me.', 'email me', 'a @ b', 'meet @ 8', 'ig is fun', 'tiktok: ok', 'whatsapp: me']) {
      expect(maskText(ok), ok).toBe(ok);
    }
  });

  it('still hides an email address once', () => {
    expect(maskText('mail aina@example.com please')).toBe('mail [hidden] please');
  });

  it('masks self-harm, bullying and sexual terms, also across spaces', () => {
    expect(maskText('just kys')).toBe('just ***');
    expect(maskText('go kill yourself')).toBe(`go ${'*'.repeat(13)}`);
    expect(maskText('Kill   urself!')).toBe(`${'*'.repeat(13)}!`);
    expect(maskText('kill-your-self')).toBe('**************');
    expect(maskText('you should go die')).toBe('you should ******');
    expect(maskText('bunuh diri la')).toBe('********** la');
    expect(maskText('send nudes')).toBe('send *****');
    expect(maskText('so horny')).toBe('so *****');
    expect(maskText('porn and sex')).toBe('**** and ***');
    expect(maskText('boobs')).toBe('*****');
    expect(maskText('video lucah')).toBe('video *****');
    expect(maskText('gambar bogel')).toBe('gambar *****');
    expect(hasBlockedWord('s3x')).toBe(true);
  });

  it('leaves innocent words next to the new terms alone', () => {
    for (const ok of ['Essex', 'Sussex', 'nudge', 'kill the lights', 'go diet', 'die hard', 'go to Kuala Lumpur', 'bunuh nyamuk', 'killer']) {
      expect(maskText(ok), ok).toBe(ok);
    }
  });

  it('does not mask mild words or a mole', () => {
    expect(maskText('aku pokai minggu ni')).toBe('aku pokai minggu ni');
    expect(maskText('ada tahi lalat di pipi')).toBe('ada tahi lalat di pipi');
    expect(maskText('Tahi   Lalat')).toBe('Tahi   Lalat');
    expect(maskText('dick')).toBe('dick');
    expect(maskText('Dickens and Moby Dick')).toBe('Dickens and Moby Dick');
    expect(maskText('dickhead')).toBe('********');
    expect(maskText('tahi')).toBe('****');
    expect(maskText('tahi kau')).toBe('**** kau');
  });
});
