/**
 * useNormieStore — the chosen Normie and wallet holdings.
 *
 * ownedIds: token IDs from /holders/{address} — empty array means guest mode
 * (no Normies owned), not an error.
 *
 * id / pixels / traits / metadata / canvas: the *selected* Normie that seeds
 * the entire game. Populated by the NormieDataPipeline in Phase 3.
 */
import { create } from "zustand";
import type { CanvasInfo, NormieMetadata, NormieTraits, PixelString } from "@/api/types";

export interface NormieState {
  /** Token IDs owned by the connected wallet ([] = guest / no wallet). */
  ownedIds: number[];
  /** True while /holders fetch is in-flight. */
  holdingsLoading: boolean;

  /** Selected token ID (0–9999), or null before selection. */
  id: number | null;
  pixels: PixelString | null;
  traits: NormieTraits | null;
  metadata: NormieMetadata | null;
  canvas: CanvasInfo | null;
  loading: boolean;
  error: string | null;

  setOwnedIds: (ids: number[]) => void;
  setHoldingsLoading: (loading: boolean) => void;
  setId: (id: number | null) => void;
  setData: (data: Partial<Pick<NormieState, "pixels" | "traits" | "metadata" | "canvas">>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initial = {
  ownedIds: [] as number[],
  holdingsLoading: false,
  id: null as number | null,
  pixels: null as PixelString | null,
  traits: null as NormieTraits | null,
  metadata: null as NormieMetadata | null,
  canvas: null as CanvasInfo | null,
  loading: false,
  error: null as string | null,
};

export const useNormieStore = create<NormieState>((set) => ({
  ...initial,
  setOwnedIds: (ownedIds) => set({ ownedIds }),
  setHoldingsLoading: (holdingsLoading) => set({ holdingsLoading }),
  setId: (id) => set({ id }),
  setData: (data) => set(data),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initial }),
}));
