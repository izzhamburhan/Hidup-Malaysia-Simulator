import { achievements } from '../../data/achievements';
import { festiveOutfits, headwears, lockedHeadwears, lockedOutfits, outfitColors, outfits, suitsGender } from '../../data/appearance';
import { festiveOutfitKey } from '../../engine/festive';
import { viewAction } from '../../engine/simulationEngine';
import type { Appearance } from '../../engine/types';
import { useLoadedGame } from '../../hooks/useGame';
import { PixelAvatar } from '../PixelAvatar';
import { Modal, SectionTitle, cx } from '../ui';

const titleOf = (id: string) => achievements.find((a) => a.id === id)?.title ?? id;

/** Change outfit, colour, headwear and glasses. Locked items say which achievement unlocks them. */
export function Wardrobe({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, request } = useLoadedGame();
  const look = state.character.appearance;
  const has = (achievement?: string) => !achievement || state.achievements[achievement] !== undefined;
  const wear = (param: string) => {
    const v = viewAction(state, 'change-outfit', param);
    if (v?.available) request(v, 'list');
  };

  const gender = state.character.gender;
  const outfitItems = [...outfits.map((o) => ({ ...o, achievement: undefined as string | undefined })), ...lockedOutfits].filter((o) => suitsGender(gender, 'outfit', o.id));
  const headItems = [...headwears.map((h) => ({ id: h.id, label: h.label, achievement: undefined as string | undefined })), ...lockedHeadwears].filter((h) => suitsGender(gender, 'headwear', h.id));
  const festiveItems = festiveOutfits.filter((o) => suitsGender(gender, 'outfit', o.id));

  return (
    <Modal open={open} onClose={onClose} title="👕 Wardrobe">
      <div className="-mt-1 mb-2 flex items-center justify-center rounded-2xl bg-paper-2 py-2">
        <PixelAvatar appearance={look} size={92} bob title="Your look" />
      </div>
      <SectionTitle>Outfit</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {outfitItems.map((o) => (
          <Tile key={o.id} label={o.label} preview={{ ...look, outfit: o.id }} active={look.outfit === o.id} lockedBy={has(o.achievement) ? undefined : titleOf(o.achievement!)} onClick={() => wear(`outfit:${o.id}`)} />
        ))}
      </div>
      <SectionTitle>Festive</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {festiveItems.map((o) => (
          <Tile key={o.id} label={o.label} preview={{ ...look, outfit: o.id }} active={look.outfit === o.id} lockedBy={state.flags[festiveOutfitKey(o.season)] !== undefined ? undefined : `${o.seasonName} wishes`} onClick={() => wear(`outfit:${o.id}`)} />
        ))}
      </div>
      <SectionTitle>Colour</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {outfitColors.map((c, i) => (
          <button key={c} type="button" onClick={() => wear(`color:${i}`)} aria-label={`Colour ${i + 1}`} aria-pressed={look.outfitColor === i} className={cx('h-9 w-9 rounded-full border-2 shadow-sm', look.outfitColor === i ? 'border-ink ring-2 ring-teal/40' : 'border-white')} style={{ background: c }} />
        ))}
      </div>
      <SectionTitle>On your head</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {headItems.map((h) => (
          <Tile key={h.id} label={h.label} preview={{ ...look, headwear: h.id }} active={look.headwear === h.id} lockedBy={has(h.achievement) ? undefined : titleOf(h.achievement!)} onClick={() => wear(`headwear:${h.id}`)} />
        ))}
      </div>
      <SectionTitle>Glasses</SectionTitle>
      <div className="grid grid-cols-2 gap-2 pb-1">
        <Tile label="No glasses" preview={{ ...look, glasses: false }} active={!look.glasses} onClick={() => wear('glasses:off')} />
        <Tile label="Glasses" preview={{ ...look, glasses: true }} active={look.glasses} onClick={() => wear('glasses:on')} />
      </div>
    </Modal>
  );
}

function Tile({ label, preview, active, lockedBy, onClick }: { label: string; preview: Appearance; active: boolean; lockedBy?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={lockedBy ? undefined : onClick}
      aria-disabled={!!lockedBy}
      aria-pressed={active}
      title={lockedBy ? `Unlock with "${lockedBy}"` : label}
      className={cx('flex flex-col items-center rounded-2xl border p-1.5 text-center', active ? 'border-teal bg-teal-soft' : 'border-ink/10 bg-white', lockedBy && 'bg-paper-2')}
    >
      <span className={cx('relative', lockedBy && 'opacity-40 grayscale')}>
        <PixelAvatar appearance={preview} size={44} title={label} />
      </span>
      <span className="mt-0.5 line-clamp-1 text-[11px] font-semibold leading-tight">{lockedBy ? `🔒 ${label}` : label}</span>
      {lockedBy && <span className="line-clamp-2 text-[9px] font-semibold leading-tight text-hibiscus">Unlock: {lockedBy}</span>}
    </button>
  );
}