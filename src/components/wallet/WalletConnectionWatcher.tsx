"use client";

/**
 * WalletConnectionWatcher — renders nothing; synchronises wagmi wallet state
 * into the Zustand stores.
 *
 * On connect   → stores address in usePlayerStore, fetches /holders/{address},
 *                stores owned IDs in useNormieStore. Empty result = guest mode.
 * On disconnect → clears both.
 *
 * Security: read-only. No signing, no transactions, no private key access.
 */
import { useEffect } from "react";
import { useAccount } from "wagmi";
import normiesApi from "@/api/normiesApi";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useNormieStore } from "@/store/useNormieStore";

export default function WalletConnectionWatcher() {
  const { address, isConnected } = useAccount();

  const setWalletAddress = usePlayerStore((s) => s.setWalletAddress);
  const setOwnedIds = useNormieStore((s) => s.setOwnedIds);
  const setHoldingsLoading = useNormieStore((s) => s.setHoldingsLoading);

  useEffect(() => {
    if (!isConnected || !address) {
      setWalletAddress(null);
      setOwnedIds([]);
      return;
    }

    setWalletAddress(address);
    setHoldingsLoading(true);

    normiesApi
      .getHoldings(address)
      .then((ids) => {
        // ids is number[] — empty array is valid (guest mode, not an error)
        setOwnedIds(Array.isArray(ids) ? ids : []);
      })
      .catch(() => {
        // Network error or API down — treat as no holdings so the game stays
        // usable; the player can still enter a Normie ID manually.
        setOwnedIds([]);
      })
      .finally(() => {
        setHoldingsLoading(false);
      });
  }, [address, isConnected, setWalletAddress, setOwnedIds, setHoldingsLoading]);

  return null;
}
