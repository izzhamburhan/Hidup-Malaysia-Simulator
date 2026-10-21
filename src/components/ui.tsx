import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

const variants: Record<Variant, string> = {
  primary: 'bg-teal text-white hover:bg-teal-2 disabled:bg-teal/40',
  secondary: 'bg-white text-ink border border-ink/15 hover:border-teal/50 disabled:text-ink/40',
  ghost: 'bg-transparent text-teal hover:bg-teal-soft disabled:text-ink/30',
  danger: 'bg-hibiscus text-white hover:brightness-110 disabled:bg-hibiscus/40',
  gold: 'bg-gold text-ink hover:brightness-105 disabled:bg-gold/40',
};

export function Button({ variant = 'primary', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx('rounded-2xl border border-ink/10 p-4 shadow-[0_1px_0_rgba(29,27,22,0.04)]', !/\bbg-/.test(className ?? '') && 'bg-white', className)}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between first:mt-0">
      <h2 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">{children}</h2>
      {action}
    </div>
  );
}

export function StatBar({ label, value, tone = 'teal', invert = false, compact = false }: { label: string; value: number; tone?: 'teal' | 'gold' | 'hibiscus' | 'leaf' | 'sky'; invert?: boolean; compact?: boolean }) {
  const v = Math.round(Math.max(0, Math.min(100, value)));
  const danger = invert ? v >= 75 : v <= 20;
  const colors: Record<string, string> = { teal: 'bg-teal-2', gold: 'bg-gold', hibiscus: 'bg-hibiscus', leaf: 'bg-leaf', sky: 'bg-sky' };
  return (
    <div className={compact ? '' : 'space-y-1'}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink-soft">{label}</span>
        <span className={cx('tabular-nums font-semibold', danger ? 'text-hibiscus' : 'text-ink')}>{v}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-paper-2" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cx('h-full rounded-full transition-all duration-500', danger ? 'bg-hibiscus' : colors[tone])} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function Pill({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'gold' | 'red' | 'green' | 'blue'; className?: string }) {
  const tones = {
    neutral: 'bg-paper-2 text-ink-soft',
    teal: 'bg-teal-soft text-teal',
    gold: 'bg-gold-soft text-[#7a5a00]',
    red: 'bg-hibiscus-soft text-hibiscus',
    green: 'bg-leaf-soft text-leaf',
    blue: 'bg-sky-soft text-sky',
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}>{children}</span>;
}

export function Modal({ open, onClose, title, children, footer, dismissable = true }: { open: boolean; onClose?: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; dismissable?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" onClick={dismissable ? onClose : undefined}>
      <div className="anim-rise max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {(title || (dismissable && onClose)) && (
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="font-display text-lg font-bold leading-tight text-ink">{title}</div>
            {dismissable && onClose && (
              <button type="button" onClick={onClose} className="rounded-full p-1 text-ink-soft hover:bg-paper-2" aria-label="Close">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        {children}
        {footer && <div className="mt-4 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center">
      <div className="text-3xl">{icon}</div>
      <div className="mt-2 font-semibold">{title}</div>
      {children && <div className="mt-1 text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; icon?: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition',
            value === t.id ? 'border-teal bg-teal text-white' : 'border-ink/10 bg-white text-ink-soft hover:border-teal/40',
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function KeyValue({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className={cx('text-right tabular-nums', strong ? 'font-bold text-ink' : 'font-medium')}>{value}</span>
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[11px] leading-snug text-ink-soft">ⓘ {children}</p>;
}
