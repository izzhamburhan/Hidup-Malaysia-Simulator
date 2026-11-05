// The signed-in player's Google profile picture, with a friendly initials fallback. The picture is
// loaded straight from Google and shown on this device only; it is never stored or uploaded by us.

import { useState } from 'react';
import { initialsOf } from '../lib/cloudSync';
import type { CloudUser } from '../lib/firebaseClient';

export function UserAvatar({ user, size = 36 }: { user: CloudUser; size?: number }) {
  const [broken, setBroken] = useState(false);
  const box = { width: size, height: size };
  if (user.photoURL && !broken) {
    return <img src={user.photoURL} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setBroken(true)} className="rounded-full object-cover" style={box} />;
  }
  return (
    <span className="grid place-items-center rounded-full bg-gold font-bold text-ink" style={{ ...box, fontSize: Math.round(size * 0.4) }} aria-hidden>
      {initialsOf(user.name)}
    </span>
  );
}