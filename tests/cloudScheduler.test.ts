import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPushScheduler } from '../src/lib/cloudScheduler';

describe('cloud push scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('turns many quick autosaves into one push after the delay', async () => {
    const push = vi.fn(async () => {});
    const s = createPushScheduler({ delayMs: 20_000, canPush: () => true, push });
    for (let i = 0; i < 10; i++) {
      s.schedule();
      await vi.advanceTimersByTimeAsync(1_000);
    }
    expect(push).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('flush pushes straight away when a push is waiting, and only once', async () => {
    const push = vi.fn(async () => {});
    const s = createPushScheduler({ delayMs: 20_000, canPush: () => true, push });
    s.schedule();
    await s.flush();
    expect(push).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('flush does nothing when nothing is waiting', async () => {
    const push = vi.fn(async () => {});
    const s = createPushScheduler({ delayMs: 20_000, canPush: () => true, push });
    await s.flush();
    expect(push).not.toHaveBeenCalled();
  });

  it('never pushes while signed out or in the daily slot (canPush false)', async () => {
    const push = vi.fn(async () => {});
    let allowed = false;
    const s = createPushScheduler({ delayMs: 1_000, canPush: () => allowed, push });
    s.schedule();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(push).not.toHaveBeenCalled();
    allowed = true;
    s.schedule();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('cancel drops a waiting push', async () => {
    const push = vi.fn(async () => {});
    const s = createPushScheduler({ delayMs: 1_000, canPush: () => true, push });
    s.schedule();
    s.cancel();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(push).not.toHaveBeenCalled();
  });

  it('does not overlap pushes: a change during a push triggers one more afterwards', async () => {
    let release: () => void = () => {};
    const push = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const s = createPushScheduler({ delayMs: 1_000, canPush: () => true, push });
    s.schedule();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(push).toHaveBeenCalledTimes(1);
    s.schedule();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(push).toHaveBeenCalledTimes(1); // first push still running
    release();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(push).toHaveBeenCalledTimes(2);
    release();
  });

  it('a failing push does not break later pushes', async () => {
    const push = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const s = createPushScheduler({ delayMs: 1_000, canPush: () => true, push });
    s.schedule();
    await vi.advanceTimersByTimeAsync(1_000);
    s.schedule();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(push).toHaveBeenCalledTimes(2);
  });
});