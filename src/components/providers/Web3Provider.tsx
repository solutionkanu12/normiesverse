"use client";

/**
 * Web3Provider — RainbowKit + wagmi + TanStack Query stack.
 *
 * Wraps the entire app so any component can call useAccount(), useConnect(),
 * etc. No transaction signing is ever requested — read-only identity only.
 *
 * Wallets enabled:
 *   - Phantom (Ethereum)
 *   - MetaMask
 *   - OKX Wallet
 *   - WalletConnect (covers all mobile / hardware wallets)
 *   - Coinbase Wallet
 *   - Rainbow
 *
 * Requires NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local.
 * Get a free project ID at https://cloud.walletconnect.com
 */

import "@rainbow-me/rainbowkit/styles.css";

import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  okxWallet,
  phantomWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import WalletConnectionWatcher from "@/components/wallet/WalletConnectionWatcher";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

// RainbowKit requires a non-empty projectId even when WalletConnect isn't used
// (browser-extension wallets work without it). We fall back to a placeholder so
// the app loads; WalletConnect itself only activates when a real ID is configured.
const resolvedProjectId = projectId || "placeholder_add_to_env_local_for_wc";

const wagmiConfig = getDefaultConfig({
  appName: "NormiesVerse",
  projectId: resolvedProjectId,
  chains: [mainnet],
  wallets: [
    {
      groupName: "Recommended",
      // Browser-extension wallets — work without a WalletConnect project ID
      wallets: [phantomWallet, metaMaskWallet, okxWallet],
    },
    {
      groupName: "More Wallets",
      // WalletConnect-dependent wallets — fully functional when projectId is set
      wallets: [walletConnectWallet, coinbaseWallet, rainbowWallet],
    },
  ],
  ssr: true,
});

/** RainbowKit theme matching the NormiesVerse palette. */
const rkTheme = darkTheme({
  accentColor: "#4fc3f7",        // Electric Blue/Cyan
  accentColorForeground: "#03040a",
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

export default function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  // QueryClient is created inside component state so it's not shared across
  // requests in SSR (Next.js App Router best-practice).
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rkTheme} modalSize="compact">
          {/* Syncs wallet state → Zustand stores. Renders nothing. */}
          <WalletConnectionWatcher />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
