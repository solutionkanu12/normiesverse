/**
 * Sliding-window rate limiter.
 *
 * The Normies API allows 60 requests per minute per IP (sliding window).
 * This limiter queues calls so that no more than `limit` acquisitions happen
 * in any rolling `windowMs` period. When the budget is exhausted, callers
 * await until the oldest in-window request ages out.
 */
export class SlidingWindowRateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  /** Timestamps (ms) of recent acquisitions, oldest first. */
  private hits: number[] = [];
  /** Serializes waiters so they wake in arrival order. */
  private chain: Promise<void> = Promise.resolve();

  constructor(limit = 60, windowMs = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /** Drop timestamps that have aged out of the current window. */
  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    let i = 0;
    while (i < this.hits.length && this.hits[i] <= cutoff) i++;
    if (i > 0) this.hits.splice(0, i);
  }

  /**
   * Acquire a slot, waiting if the window is full. Resolves once the call is
   * cleared to proceed (and records the hit).
   */
  acquire(): Promise<void> {
    // Chain ensures FIFO ordering and that concurrent callers don't all read a
    // stale `hits` length before any of them records its hit.
    const run = this.chain.then(() => this.waitForSlot());
    // Swallow errors on the chain itself so one rejection can't poison the queue.
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async waitForSlot(): Promise<void> {
    // Loop because after sleeping, other waiters/time may shift the window.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const now = Date.now();
      this.prune(now);
      if (this.hits.length < this.limit) {
        this.hits.push(now);
        return;
      }
      const oldest = this.hits[0];
      const waitMs = oldest + this.windowMs - now;
      await delay(Math.max(waitMs, 0) + 1);
    }
  }

  /** Number of requests still allowed in the current window (diagnostic). */
  remaining(): number {
    this.prune(Date.now());
    return Math.max(0, this.limit - this.hits.length);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Shared limiter instance for all Normies API traffic from this process. */
export const normiesRateLimiter = new SlidingWindowRateLimiter(60, 60_000);
