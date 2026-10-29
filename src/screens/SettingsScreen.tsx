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
    setMessage(t('settings.backupDone'));
  };

  return (
    <div>
      <SectionTitle>{t('settings.save')}</SectionTitle>
      <Card>
        <KeyValue label={t('settings.character')} value={`${state.character.name} (${state.mode})`} />
        <KeyValue label={t('settings.saveVersion')} value={state.version} />
        <KeyValue label={t('settings.lastSave')} value={saveError ? <span className="text-hibiscus">{t('settings.saveFailed')}</span> : lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : '—'} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={download}>
            <Download size={16} /> {t('settings.export')}
          </Button>
          <Button variant="secondary" onClick={onExit}>
            {t('menu.main')}
          </Button>
        </div>
        <Disclaimer>{t('settings.local')}</Disclaimer>
      </Card>

      <SectionTitle>{t('settings.import.title')}</SectionTitle>
      <Card>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={t('settings.import.placeholder')}
          className="h-24 w-full rounded-xl border border-ink/15 bg-white p-2 font-mono text-xs"
          aria-label={t('settings.import.aria')}
        />
        <Button
          variant="secondary"
          className="mt-2 w-full"
          disabled={!importText.trim()}
          onClick={() => {
            const err = importSave(importText);
            setMessage(err ?? t('settings.imported'));
            if (!err) setImportText('');
          }}
        >
          <Upload size={16} /> {t('settings.import.btn')}
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
                <button key={l} type="button" onClick={() => setSettings({ language: l })} aria-pressed={settings.language === l} className={settings.language === l ? 'hit-44 h-8 rounded-full bg-teal px-3 text-white' : 'hit-44 h-8 px-3 text-ink-soft'}>
                  {l === 'en' ? 'English' : 'Bahasa Malaysia'}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-ink-soft">{t('settings.language.hint')}</p>
        </div>
        <Toggle
          label={t('settings.comparison')}
          hint={t('settings.comparison.hint')}
          checked={state.flags.comparisonAnxiety !== false}
          onChange={(v) => interact('setting', 'comparisonAnxiety', v)}
        />
        <Toggle label={t('settings.actionGames')} hint={t('settings.actionGames.hint')} checked={settings.actionGames} onChange={(v) => setSettings({ actionGames: v })} />
        <Toggle label={t('settings.sound')} hint={t('settings.sound.hint')} checked={settings.sound} onChange={(v) => setSettings({ sound: v })} />
        <Toggle label={t('settings.vibration')} hint={t('settings.vibration.hint')} checked={settings.vibration} onChange={(v) => setSettings({ vibration: v })} />
        <Toggle label={t('settings.motion')} hint={t('settings.motion.hint')} checked={settings.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} />
        <Toggle label={t('settings.tutorial')} hint={t('settings.tutorial.hint')} checked={!settings.tutorialSeen} onChange={(v) => setSettings({ tutorialSeen: !v })} />
      </Card>

      <SectionTitle>{t('settings.privacy')}</SectionTitle>
      <Card className="space-y-3">
        {analyticsConfigured() && (
          <Toggle
            label={t('settings.analytics')}
            hint={t('settings.analytics.hint')}
            checked={!settings.analyticsOptOut}
            onChange={(v) => setSettings({ analyticsOptOut: !v })}
          />
        )}
        <Button variant="secondary" className="w-full" onClick={() => setPrivacy(true)}>
          {t('settings.privacy.read')}
        </Button>
      </Card>

      <SectionTitle>{t('settings.credits')}</SectionTitle>
      <Card className="mb-3 space-y-1 text-xs text-ink-soft">
        <p>
          <span className="font-pixel text-base font-bold text-ink">Pixelify Sans</span> {t('settings.credits.font')}{' '}
          <a href="./fonts/PixelifySans-OFL.txt" target="_blank" rel="noreferrer" className="font-semibold text-teal underline">
            {t('settings.credits.licence')}
          </a>
          .
        </p>
      </Card>
      <Card className="space-y-2 text-xs text-ink-soft">
        <p>{t('settings.credits.flags')}</p>
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
                    {t('settings.credits.by', { author: f.author ?? '' })}{' '}
                    <a href={CC_BY_SA_3} target="_blank" rel="noreferrer" className="underline">
                      CC BY-SA 3.0
                    </a>
                  </>
                ) : (
                  t('settings.credits.pd')
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <SectionTitle>{t('settings.danger')}</SectionTitle>
      <Button variant="danger" className="w-full" onClick={() => setConfirmReset(true)}>
        <Trash2 size={16} /> {t('settings.reset')}
      </Button>
      {message && <p className="mt-3 text-center text-sm text-ink-soft">{message}</p>}

      <PrivacyNotice open={privacy} onClose={() => setPrivacy(false)} />

      <SectionTitle>{t('settings.about')}</SectionTitle>
      <Card className="text-xs leading-relaxed text-ink-soft">
        {t('settings.about.body')}
      </Card>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t('settings.reset.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetAll();
                onExit();
              }}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">{t('settings.reset.body', { name: state.character.name })}</p>
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
