import { flagFor } from '../data/stateFlags';
import { cx } from './ui';

/** A state or federal territory flag at a 2:1 ratio. Renders nothing for an unknown state. */
export function StateFlag({ state, width = 28, className }: { state: string; width?: number; className?: string }) {
  const flag = flagFor(state);
  if (!flag) return null;
  return (
    <img
      src={`./flags/${flag.file}`}
      alt={`Flag of ${state}`}
      width={width}
      height={width / 2}
      loading="lazy"
      className={cx('inline-block shrink-0 rounded-[2px] border border-ink/15 object-cover', className)}
      style={{ width, height: width / 2 }}
    />
  );
}