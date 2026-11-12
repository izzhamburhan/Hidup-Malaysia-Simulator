// Viral Hari Ini: the once-a-day funny card. Save it as a picture, hang it in the room, or skip.

import { useState } from 'react';
import { Download, Frame } from 'lucide-react';
import { VIRAL_ITEMS, VIRAL_SCENES, viralById, type ViralItem } from '../../data/viral';
import { useT } from '../../hooks/useT';
import { useGame } from '../../hooks/useGame';
import { useViral } from '../../hooks/useViral';
import { renderViralCard } from '../../lib/viralCard';
import { Button, Modal, cx } from '../ui';
import { ViralPicture } from './ViralPicture';

export function ViralSheet({ open, itemId, onClose }: { open: boolean; itemId: string | null; onClose: () => void }) {
  const t = useT();
  const { settings } = useGame();
  const { store, hang } = useViral();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const lang = settings.language === 'ms' ? 'ms' : 'en';
  const item: ViralItem | undefined = viralById(pickedId ?? itemId);
  const earlier = VIRAL_ITEMS.filter((i) => store.seen.includes(i.id));
  if (!item) return null;
  const onWall = store.poster === item.id;

  const save = async () => {
    try {
      const blob = await renderViralCard(item, VIRAL_SCENES[item.scene], lang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hidup-malaysia-viral-${item.id}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setNote(t('viral.saved'));
    } catch {
      setNote(t('viral.saveFail'));
    }
  };

  const close = () => {
    setPickedId(null);
    setNote(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title={t('viral.title')}>
      <p className="mb-3 text-xs text-ink-soft">{t('viral.sub')}</p>
      <ViralPicture item={item} label={item.topic[lang]} className="aspect-video w-full rounded-2xl border-2 border-gold shadow-md" />
      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-teal">{item.topic[lang]}</p>
      <p className="font-display mt-1 text-lg font-black leading-snug text-ink">{item.line[lang]}</p>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <Button variant="gold" className="min-h-[48px]" onClick={() => void save()}>
          <Download size={18} aria-hidden /> {t('viral.save')}
        </Button>
        <Button variant="secondary" className="min-h-[48px]" onClick={() => hang(onWall ? null : item.id)} aria-pressed={onWall}>
          <Frame size={18} aria-hidden /> {onWall ? t('viral.roomOn') : t('viral.room')}
        </Button>
        <Button variant="ghost" className="min-h-[44px]" onClick={close}>
          {t('viral.skip')}
        </Button>
      </div>
      {note && (
        <p role="status" className="mt-2 text-center text-xs font-semibold text-ink-soft">
          {note}
        </p>
      )}

      {earlier.length > 1 && (
        <div className="mt-4 border-t border-ink/10 pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">{t('viral.earlier')}</p>
          <div className="flex flex-wrap gap-2">
            {earlier.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  setPickedId(e.id);
                  setNote(null);
                }}
                aria-pressed={e.id === item.id}
                className={cx('min-h-[36px] rounded-full border px-3 text-xs font-bold', e.id === item.id ? 'border-teal bg-teal text-white' : 'border-ink/15 bg-white text-ink')}
              >
                {e.topic[lang]}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}