// Plain-language privacy note, shown from the landing page and Settings.

import { analyticsConfigured } from '../lib/analytics';
import { Button, Modal } from './ui';

export function PrivacyNotice({ open, onClose }: { open: boolean; onClose: () => void }) {
  const on = analyticsConfigured();
  return (
    <Modal open={open} onClose={onClose} title="Privacy" footer={<Button onClick={onClose}>Got it</Button>}>
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          <b>Your game stays on your device.</b> Your save, character and settings are stored in this browser (LocalStorage). As a guest there is no account and nothing is uploaded.
          Clearing your browser data or using another device starts fresh, unless you export a backup in Settings or turn on cloud save.
        </p>
        <p>
          <b>Optional Google cloud save.</b> If you sign in with Google, a copy of your save is stored in Google Firebase under an anonymous user ID so you can continue on another device. We do not
          store your email or name, and you can delete the cloud copy any time in Settings. While you are signed in we also note when you open the game and on which days you played (dates only),
          so we can see how often people come back. Signing in is never required to play.
        </p>
        {on ? (
          <p>
            <b>Anonymous usage stats.</b> To improve the game we count visits and which features are used (for example "a game started" or "the gym was used"), using Umami, a
            cookie-free analytics service. At a few milestone days we also note your character's choices (such as home state or job) and rough ranges of in-game money (for example
            "savings between RM2k and RM10k"), never exact amounts. We never send your character's name, your save, or anything that identifies you. We respect your browser's Do
            Not Track setting, and you can switch stats off in Settings at any time.
          </p>
        ) : (
          <p>
            <b>No analytics.</b> This version does not send any usage statistics.
          </p>
        )}
        <p>
          <b>No ads, no tracking cookies, no selling of data.</b> The game is free. If that ever changes, this note will be updated first.
        </p>
        <p className="text-xs text-ink-soft">
          Everything in the game is fiction. Real universities and companies appear as names only; salaries, prices and payroll are simplified game estimates.
        </p>
      </div>
    </Modal>
  );
}