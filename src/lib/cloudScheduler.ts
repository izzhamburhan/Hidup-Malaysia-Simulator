// Debounced "push to the cloud" scheduler. The game autosaves after every action; syncing each one
// would waste the free quota, so pushes wait for a quiet moment. UI layer only.

export interface PushScheduler {
  /** Note that the local save changed; a push follows after the quiet delay. */
  schedule(): void;
  /** Push right now if one is waiting (used when the tab is hidden or closing). */
  flush(): Promise<void>;
  /** Drop any waiting push (sign out, daily slot). */
  cancel(): void;
}

export interface PushSchedulerOptions {
  delayMs: number;
  /** False while signed out, in the daily slot, or while a conflict is unresolved. */
  canPush: () => boolean;
  push: () => Promise<unknown>;
}

export function createPushScheduler(opts: PushSchedulerOptions): PushScheduler {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let dirty = false;

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  async function run(): Promise<void> {
    if (!opts.canPush()) {
      dirty = false;
      return;
    }
    if (running) {
      dirty = true;
      return;
    }
    running = true;
    dirty = false;
    try {
      await opts.push();
    } catch {
      /* the caller records failures; a failed push must never break the next one */
    } finally {
      running = false;
      if (dirty) schedule();
    }
  }

  function schedule(): void {
    clear();
    timer = setTimeout(() => {
      timer = undefined;
      void run();
    }, opts.delayMs);
  }

  return {
    schedule,
    async flush() {
      if (timer === undefined) return;
      clear();
      await run();
    },
    cancel() {
      clear();
      dirty = false;
    },
  };
}