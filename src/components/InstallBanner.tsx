import { useEffect, useState } from 'react';
import { useGame } from '../hooks/useGame';
import { useT } from '../hooks/useT';
import { track } from '../lib/analytics';
import { canPromptInstall, isIOS, isStandalone, onInstallChange, promptInstall, shouldOfferInstall } from '../lib/install';
import { Button, Modal } from './ui';

/** Re-renders when the browser's install prompt becomes available or is used. */
function useInstallable() {
  const [, bump] = useState(0);
  useEffect(() => onInstallChange(() => bump((n) => n + 1)), []);
  return { canPrompt: canPromptInstall(), ios: isIOS(), standalone: isStandalone() };
}

/** Install the game, or show the iPhone steps. Returns whether something was offered. */
export function useInstall() {
  const info = useInstallable();
  const [iosHelp, setIosHelp] = useState(false);
  const install = async (source: string) => {
    if (info.canPrompt) {
      const ok = await promptInstall();
      track('install', { source, ok });
    } else if (info.ios) {
      setIosHelp(true);
      track('install', { source: `${source}_ios` });
    }
  };
  return { ...info, install, iosHelp, closeIosHelp: () => setIosHelp(false) };
}

export function IosInstallHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={`📲 ${t('install.title')}`}>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>{t('install.ios.1')}</li>
        <li>{t('install.ios.2')}</li>
        <li>{t('install.ios.3')}</li>
      </ol>
      <Button className="mt-4 w-full" onClick={onClose}>
        OK
      </Button>
    </Modal>
  );
}

/** A small card on Home once the player has lived a day. */
export function InstallBanner({ day }: { day: number }) {
  const { settings, setSettings } = useGame();
  const t = useT();
  const inst = useInstall();
  if (!shouldOfferInstall({ standalone: inst.standalone, dismissed: settings.installDismissed, day, canPrompt: inst.canPrompt, ios: inst.ios })) {
    return <IosInstallHelp open={inst.iosHelp} onClose={inst.closeIosHelp} />;
  }
  return (
    <section className="flex items-center gap-3 rounded-2xl border border-sky/30 bg-sky-soft p-3">
      <img src="./icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl shadow-sm" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold leading-tight">{t('install.title')}</div>
        <div className="text-[11px] leading-snug text-ink-soft">{t('install.body')}</div>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button type="button" onClick={() => inst.install('banner')} className="rounded-full bg-sky px-3 py-1 text-xs font-bold text-white shadow-sm active:scale-95">
          {t('install.button')}
        </button>
        <button type="button" onClick={() => setSettings({ installDismissed: true })} className="text-[11px] font-semibold text-ink-soft">
          {t('install.later')}
        </button>
      </div>
      <IosInstallHelp open={inst.iosHelp} onClose={inst.closeIosHelp} />
    </section>
  );
}