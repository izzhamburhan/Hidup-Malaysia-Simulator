// Neutral initials badge for real organisations (companies, universities,
// statutory bodies). Deliberately NOT a logo: game palette only, plain text,
// one shape for everyone, so nothing imitates a brand mark.

import { cx } from './ui';

export type BadgeKind = 'company' | 'public-uni' | 'private-uni' | 'gov' | 'fictional';

const STRIPE: Record<BadgeKind, string> = {
  company: 'bg-teal-2',
  'public-uni': 'bg-sky',
  'private-uni': 'bg-hibiscus',
  gov: 'bg-gold',
  fictional: 'bg-ink-soft',
};

export function OrgBadge({ text, kind = 'company', size = 40, className, title }: { text: string; kind?: BadgeKind; size?: number; className?: string; title?: string }) {
  const label = text.slice(0, 5);
  const font = label.length <= 2 ? 0.38 : label.length === 3 ? 0.3 : label.length === 4 ? 0.25 : 0.21;
  return (
    <span
      title={title ?? text}
      aria-label={title ?? text}
      className={cx('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink/15 bg-paper-2 font-black tracking-tight text-ink', className)}
      style={{ width: size, height: size, fontSize: size * font }}
    >
      <span className={cx('absolute inset-x-0 top-0 h-1', STRIPE[kind])} aria-hidden />
      {label}
    </span>
  );
}
