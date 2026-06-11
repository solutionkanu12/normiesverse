/**
 * Batch helpers for fetching many Normies at once.
 *
 * The rate limiter already throttles individual calls, but firing 10,000
 * promises at once would queue an enormous backlog. The batcher bounds
 * concurrency and assembles convenient per-Normie bundles, while still routing
 * every request through the cache + limiter in {@link normiesApi}.
 */

import normiesApi from "./normiesApi";
import type { CanvasInfo, NormieTraits, PixelString } from "./types";

/** A composited snapshot of one Normie, enough to seed avatar + world. */
export interface NormieBundle {
  id: number;
  pixels: PixelString;
  traits: NormieTraits;
  canvas: CanvasInfo;
}

/** Run `task` over `items` with at most `concurrency` in flight at a time. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await task(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

/** Fetch the core data bundle for a single Normie. */
export async function fetchNormieBundle(id: number): Promise<NormieBundle> {
  const [pixels, traits, canvas] = await Promise.all([
    normiesApi.getPixels(id),
    normiesApi.getTraits(id),
    normiesApi.getCanvasInfo(id),
  ]);
  return { id, pixels, traits, canvas };
}

export interface BatchResult<T> {
  id: number;
  value?: T;
  error?: Error;
}

/**
 * Fetch bundles for many IDs. Failures are captured per-ID rather than
 * rejecting the whole batch (a burned/unminted Normie shouldn't sink the grid).
 */
export function fetchNormieBundles(
  ids: readonly number[],
  concurrency = 5,
): Promise<BatchResult<NormieBundle>[]> {
  return mapWithConcurrency(ids, concurrency, async (id) => {
    try {
      return { id, value: await fetchNormieBundle(id) };
    } catch (error) {
      return { id, error: error as Error };
    }
  });
}
