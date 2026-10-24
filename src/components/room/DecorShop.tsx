import { DECOR_SLOTS, DECOR_SLOT_LABEL, decorItems } from '../../data/decor';
import { formatRM } from '../../engine/core';
import { viewAction } from '../../engine/simulationEngine';
import { useLoadedGame } from '../../hooks/useGame';
import { Modal, SectionTitle, cx } from '../ui';

/** Buy and arrange decor for the Home room. Every button routes through the engine. */
export function DecorShop({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, request } = useLoadedGame();
  const run = (id: 'buy-decor' | 'place-decor', param: string) => {
    const v = viewAction(state, id, param);
    if (!v) return;
    if (v.available) onClose();
    request(v, 'list');
  };
  return (
    <Modal open={open} onClose={onClose} title="🛋️ Decorate your place">
      <p className="-mt-1 mb-1 text-xs text-ink-soft">Prices are fictional game estimates. Decor makes home a little happier every day, and comes with you when you move.</p>
      {DECOR_SLOTS.map((slot) => (
        <div key={slot}>
          <SectionTitle>{DECOR_SLOT_LABEL[slot]}</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {decorItems
              .filter((d) => d.slot === slot)
              .map((d) => {
                const owned = state.decor.owned.includes(d.id);
                const inUse = state.decor.placed[slot] === d.id;
                const tooPricey = !owned && state.finance.cash < d.price;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => run(owned ? 'place-decor' : 'buy-decor', d.id)}
                    aria-disabled={inUse || tooPricey}
                    className={cx(
                      'flex items-center gap-2 rounded-2xl border p-2.5 text-left transition active:scale-[0.98]',
                      inUse ? 'border-teal bg-teal-soft' : 'border-ink/10 bg-white',
                    )}
                  >
                    <span className={cx('text-3xl', tooPricey && 'opacity-50 grayscale')}>{d.icon}</span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-[13px] font-semibold leading-tight">{d.name}</span>
                      <span className={cx('block text-[11px] font-bold', inUse ? 'text-teal' : owned ? 'text-ink-soft' : tooPricey ? 'text-hibiscus' : 'text-ink-soft')}>
                        {inUse ? 'In use' : owned ? 'Owned · tap to use' : formatRM(d.price)}
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </Modal>
  );
}