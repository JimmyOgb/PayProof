import { createConfig, http, injected } from "wagmi";
import { arcMainnet } from "@/lib/arc/chain";
import { getArcConfig } from "@/lib/arc/config";

const arcConfig = getArcConfig();

/**
 * Wagmi configuration targeting Arc Mainnet.
 * Configured with standard injected wallet provider (MetaMask, Rabby, Coinbase Wallet, etc.)
 */
export const wagmiConfig = createConfig({
  chains: [arcMainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [arcMainnet.id]: http(arcConfig.rpcUrl),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
