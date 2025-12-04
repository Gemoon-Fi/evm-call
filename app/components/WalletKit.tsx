"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  monad,
  monadTestnet,
  sepolia,
} from "wagmi/chains";

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
export default function WalletKit({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  // Create a QueryClient instance
  const queryClient = new QueryClient();

  const config = getDefaultConfig({
    appName: "EVM Inspector",
    projectId: "EVM_DEBUG_PROJECT_ID",
    chains: [mainnet, polygon, optimism, arbitrum, base, monad, monadTestnet,sepolia],
    ssr: true, // If your dApp uses server side rendering (SSR)
  });

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
