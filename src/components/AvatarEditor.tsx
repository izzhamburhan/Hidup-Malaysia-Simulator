import { Dices } from 'lucide-react';
import { hairColors, hairStyles, headwears, outfitColors, outfits, skinTones, suitsGender } from '../data/appearance';
import { randomAppearance } from '../engine/appearance';
import type { Appearance, Gender, Mood } from '../engine/types';
import { PixelAvatar } from './PixelAvatar';
import { Button, cx } from './ui';

const MOODS: { id: Mood; label: string }[] = [
  { id: 'happy', label: '😄' },
  { id: 'neutral', label: '🙂' },
  { id: 'tired', label: '😴' },
  { id: 'stressed', label: '😰' },
];

export function AvatarEditor({ value, onChange, preview, onPreview, gender }: { value: Appearance; onChange: (a: Appearance) => void; preview: Mood; onPreview: (m: Mood) => void; gender?: Gender | null }) {
  const set = <K extends keyof Appearance>(k: K, v: Appearance[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-3">
      <div className="flex items-end gap-3">
        <div className="relative flex h-36 w-32 shrink-0 items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-teal-soft to-paper-2">
          <PixelAvatar appearance={value} mood={preview} size={112} bob />
        </div>
        <div className="flex-1 space-y-2">
          <Button variant="secondary" className="w-full" onClick={() => onChange(randomAppearance(Math.floor(Math.random() * 1e9), gender))}>
            <Dices size={16} /> Randomise
          </Button>
          <div className="flex justify-between gap-1" role="group" aria-label="Preview expression">
            {MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onPreview(m.id)}
                aria-pressed={preview === m.id}
                className={cx('flex-1 rounded-lg border py-1 text-base', preview === m.id ? 'border-teal bg-teal-soft' : 'border-ink/10 bg-paper')}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-snug text-ink-soft">Your character's face reacts to energy, stress, mood and health.</p>
        </div>
      </div>

      <Row label="Skin">
        {skinTones.map((c, i) => (
          <Swatch key={c} color={c} active={value.skin === i} onClick={() => set('skin', i)} label={`Skin tone ${i + 1}`} />
        ))}
      </Row>
      <Row label="Headwear">
        {headwears.filter((h) => suitsGender(gender, 'headwear', h.id)).map((h) => (
          <Pill key={h.id} active={value.headwear === h.id} onClick={() => set('headwear', h.id)}>
            {h.label}
          </Pill>
        ))}
      </Row>
      {value.headwear !== 'tudung' && (
        <>
          <Row label="Hair">
            {hairStyles.filter((h) => suitsGender(gender, 'hair', h.id)).map((h) => (
              <Pill key={h.id} active={value.hair === h.id} onClick={() => set('hair', h.id)}>
                {h.label}
              </Pill>
            ))}
          </Row>
          <Row label="Hair colour">
            {hairColors.map((c, i) => (
              <Swatch key={c} color={c} active={value.hairColor === i} onClick={() => set('hairColor', i)} label={`Hair colour ${i + 1}`} />
            ))}
          </Row>
        </>
      )}
      <Row label="Outfit">
        {outfits.filter((o) => suitsGender(gender, 'outfit', o.id)).map((o) => (
          <Pill key={o.id} active={value.outfit === o.id} onClick={() => set('outfit', o.id)}>
            {o.label}
          </Pill>
        ))}
      </Row>
      <Row label="Colour">
        {outfitColors.map((c, i) => (
          <Swatch key={c} color={c} active={value.outfitColor === i} onClick={() => set('outfitColor', i)} label={`Outfit colour ${i + 1}`} />
        ))}
      </Row>
      <Row label="Glasses">
        <Pill active={!value.glasses} onClick={() => set('glasses', false)}>
          No
        </Pill>
        <Pill active={value.glasses} onClick={() => set('glasses', true)}>
          Yes 🤓
        </Pill>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx('rounded-full border px-3 py-1 text-xs font-semibold transition', active ? 'border-teal bg-teal text-white' : 'border-ink/15 bg-paper text-ink')}
    >
      {children}
    </button>
  );
}

function Swatch({ color, active, onClick, label }: { color: string; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cx('h-8 w-8 rounded-full border-2 transition', active ? 'border-teal ring-2 ring-teal/30' : 'border-white shadow-[0_0_0_1px_rgba(29,27,22,0.15)]')}
      style={{ background: color }}
    />
  );
}
