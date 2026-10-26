import { useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useLoadedGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { CC_BY_SA_3, STATE_FLAGS } from '../data/stateFlags';
import { StateFlag } from '../components/StateFlag';
import { IosInstallHelp, useInstall } from '../components/InstallBanner';
import { Button, Card, Disclaimer, KeyValue, Modal, SectionTitle } from '../components/ui';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { analyticsConfigured } from '../lib/analytics';

export function SettingsScreen({ onExit }: { onExit: () => void }) {
  const { state, settings, setSettings, interact, exportSave, importSave, resetAll, lastSavedAt, saveError } = useLoadedGame();
  const [confirmReset, setConfirmReset] = useState(false);
  const t = useT();
  const inst = useInstall();
  const [privacy, setPrivacy] = useState(false);
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const download = () => {
    const text = exportSave();
    if (!text) return;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hidup-malaysia-${state.character.name.replace(/\W+/g, '-').toLowerCase()}-day${state.clock.day + 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Backup downloaded.');
  };

  return (
    <div>
      <SectionTitle>Save</SectionTitle>
      <Card>
        <KeyValue label="Character" value={`${state.character.name} (${state.mode})`} />
        <KeyValue label="Save version" value={state.version} />
        <KeyValue label="Last autosave" value={saveError ? <span className="text-hibiscus">Failed — storage unavailable</span> : lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : '—'} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={download}>
            <Download size={16} /> Export backup
          </Button>
          <Button variant="secondary" onClick={onExit}>
            Main menu
          </Button>
        </div>
        <Disclaimer>Saves live only in this browser (LocalStorage). Nothing is uploaded.</Disclaimer>
      </Card>

      <SectionTitle>Import a backup</SectionTitle>
      <Card>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste exported save JSON here"
          className="h-24 w-full rounded-xl border border-ink/15 bg-white p-2 font-mono text-xs"
          aria-label="Save JSON"
        />
        <Button
          variant="secondary"
          className="mt-2 w-full"
          disabled={!importText.trim()}
          onClick={() => {
            const err = importSave(importText);
            setMessage(err ?? 'Backup imported.');
            if (!err) setImportText('');
          }}
        >
          <Upload size={16} /> Import (replaces current life)
        </Button>
      </Card>

      {!inst.standalone && (inst.canPrompt || inst.ios) && (
        <>
          <SectionTitle>📲 {t('settings.install')}</SectionTitle>
          <Card>
            <p className="mb-2 text-xs text-ink-soft">{t('settings.install.hint')}</p>
            <Button className="w-full" onClick={() => inst.install('settings')}>
              {t('install.button')}
            </Button>
          </Card>
          <IosInstallHelp open={inst.iosHelp} onClose={inst.closeIosHelp} />
        </>
      )}

      <SectionTitle>{t('settings.gameplay')}</SectionTitle>
      <Card className="space-y-3">
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{t('settings.language')}</span>
            <div className="flex rounded-full bg-paper-2 p-0.5 text-xs font-bold" role="group" aria-label="Language / Bahasa">
              {(['en', 'ms'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setSettings({ language: l })} aria-pressed={settings.language === l} className={settings.language === l ? 'rounded-full bg-teal px-3 py-1 text-white' : 'px-3 py-1 text-ink-soft'}>
                  {l === 'en' ? 'English' : 'Bahasa Malaysia'}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-ink-soft">{t('settings.language.hint')}</p>
        </div>
        <Toggle
          label="Comparison anxiety"
          hint="Scrolling the feed while unhappy can raise stress."
          checked={state.flags.comparisonAnxiety !== false}
          onChange={(v) => interact('setting', 'comparisonAnxiety', v)}
        />
        <Toggle label={t('settings.actionGames')} hint={t('settings.actionGames.hint')} checked={settings.actionGames} onChange={(v) => setSettings({ actionGames: v })} />
        <Toggle label={t('settings.sound')} hint={t('settings.sound.hint')} checked={settings.sound} onChange={(v) => setSettings({ sound: v })} />
        <Toggle label={t('settings.vibration')} hint={t('settings.vibration.hint')} checked={settings.vibration} onChange={(v) => setSettings({ vibration: v })} />
        <Toggle label={t('settings.motion')} hint={t('settings.motion.hint')} checked={settings.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} />
        <Toggle label="Show 'How to play' again" hint="Replays the intro next time you open the game." checked={!settings.tutorialSeen} onChange={(v) => setSettings({ tutorialSeen: !v })} />
      </Card>

      <SectionTitle>Privacy</SectionTitle>
      <Card className="space-y-3">
        {analyticsConfigured() && (
          <Toggle
            label="Share anonymous usage stats"
            hint="Cookie-free counts of visits and features used. Never your name or save."
            checked={!settings.analyticsOptOut}
            onChange={(v) => setSettings({ analyticsOptOut: !v })}
          />
        )}
        <Button variant="secondary" className="w-full" onClick={() => setPrivacy(true)}>
          Read the privacy note
        </Button>
      </Card>

      <SectionTitle>Credits</SectionTitle>
      <Card className="space-y-2 text-xs text-ink-soft">
        <p>State and federal territory flags are from Wikimedia Commons, shown for identification only. No state government is connected with this game.</p>
        <ul className="space-y-1">
          {STATE_FLAGS.map((f) => (
            <li key={f.state} className="flex items-center gap-2">
              <StateFlag state={f.state} width={20} />
              <span className="min-w-0 flex-1">
                <a href={f.source} target="_blank" rel="noreferrer" className="font-semibold text-teal underline">
                  {f.state}
                </a>
                {' · '}
                {f.license === 'CC BY-SA 3.0' ? (
                  <>
                    by {f.author},{' '}
                    <a href={CC_BY_SA_3} target="_blank" rel="noreferrer" className="underline">
                      CC BY-SA 3.0
                    </a>
                  </>
                ) : (
                  'Public domain'
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <SectionTitle>Danger zone</SectionTitle>
      <Button variant="danger" className="w-full" onClick={() => setConfirmReset(true)}>
        <Trash2 size={16} /> Reset all game data
      </Button>
      {message && <p className="mt-3 text-center text-sm text-ink-soft">{message}</p>}

      <PrivacyNotice open={privacy} onClose={() => setPrivacy(false)} />

      <SectionTitle>About</SectionTitle>
      <Card className="text-xs leading-relaxed text-ink-soft">
        HIDUP MALAYSIA is a fictional life simulator. Real universities and companies appear only as names and do not imply vacancies, fees or rankings. Salaries, prices, rents and calories are game
        estimates. Payroll is a simplified simulation based on published KWSP, PERKESO and LHDN rates — not an official calculation. Holiday dates use a simulated calendar. Political parties and the town of
        Seri Harapan are fictional.
      </Card>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Delete everything?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetAll();
                onExit();
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">This permanently deletes {state.character.name}'s save and your settings from this browser. Export a backup first if you might want it back.</p>
      </Modal>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-ink-soft">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-teal" />
    </label>
  );
}