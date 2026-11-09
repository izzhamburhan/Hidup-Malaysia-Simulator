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
          store your email or name, and you can delete the cloud copy any time in Settings. Signing in is never required to play.
        </p>
        <p>
          <b>Optional Friends (needs Google sign-in).</b> If you turn on Friends, we store a display name you choose, your pixel look, life stage, job, home state, age, day, achievements, travel stamps and a rough net worth range
          (never exact money) so friends you swap codes with can see them. Chat messages, gifts and friend requests between friends are stored too. We still do not keep your Google name or email. Messages are
          filtered for rude words and you can block or report anyone (a report keeps a copy of the last 20 messages of that chat for the game owner). You can turn Friends off in Settings to delete your friend card, code, friends list, inbox, blocks and your messages. Reports you were part of are kept for safety, and gifts you already sent stay in the inboxes of your friends until they open them.
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
