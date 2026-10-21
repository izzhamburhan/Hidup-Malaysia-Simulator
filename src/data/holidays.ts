// SIMULATED holiday calendar. Lunar and Islamic-calendar festivals move every
// year in reality; the game pins them to fixed simulated dates so every
// playthrough sees them. Do not read these dates as the real calendar.

export interface Holiday {
  id: string;
  name: string;
  month: number; // 1-12
  day: number;
  /** Days off work / class. */
  daysOff: number;
  festive: boolean;
  /** Scheduled event fired on the morning of the holiday, if any. */
  eventId?: string;
  greeting: string;
}

export const holidays: Holiday[] = [
  { id: 'new-year', name: 'New Year', month: 1, day: 1, daysOff: 1, festive: false, eventId: 'new-year-resolution', greeting: 'New year, new me (same bank balance).' },
  { id: 'cny', name: 'Chinese New Year', month: 2, day: 6, daysOff: 2, festive: true, eventId: 'festive-cny', greeting: 'Gong Xi Fa Cai! 🧧' },
  { id: 'labour', name: 'Labour Day', month: 5, day: 1, daysOff: 1, festive: false, greeting: 'A day off for everyone who works. Rest well.' },
  { id: 'raya', name: 'Hari Raya Aidilfitri', month: 3, day: 21, daysOff: 2, festive: true, eventId: 'festive-raya', greeting: 'Selamat Hari Raya, maaf zahir dan batin. 🌙' },
  { id: 'wesak', name: 'Wesak Day', month: 5, day: 12, daysOff: 1, festive: false, greeting: 'Selamat Hari Wesak.' },
  { id: 'agong', name: "Agong's Birthday", month: 6, day: 2, daysOff: 1, festive: false, greeting: 'A public holiday mid-year. Long weekend vibes.' },
  { id: 'haji', name: 'Hari Raya Aidiladha', month: 5, day: 28, daysOff: 1, festive: true, eventId: 'festive-haji', greeting: 'Selamat Hari Raya Aidiladha.' },
  { id: 'merdeka', name: 'Merdeka Day', month: 8, day: 31, daysOff: 1, festive: false, eventId: 'merdeka', greeting: 'Merdeka! 🇲🇾' },
  { id: 'malaysia-day', name: 'Malaysia Day', month: 9, day: 16, daysOff: 1, festive: false, greeting: 'Selamat Hari Malaysia. One country, many kuih.' },
  { id: 'deepavali', name: 'Deepavali', month: 10, day: 29, daysOff: 1, festive: true, eventId: 'festive-deepavali', greeting: 'Happy Deepavali! 🪔' },
  { id: 'christmas', name: 'Christmas', month: 12, day: 25, daysOff: 1, festive: true, eventId: 'festive-christmas', greeting: 'Merry Christmas! 🎄' },
];

/** University semester breaks (simulated) are handled by the education engine. */
export function holidayOn(month: number, day: number): Holiday | undefined {
  return holidays.find((h) => {
    if (h.month !== month) return false;
    return day >= h.day && day < h.day + h.daysOff;
  });
}

export function holidayStartingOn(month: number, day: number): Holiday | undefined {
  return holidays.find((h) => h.month === month && h.day === day);
}
