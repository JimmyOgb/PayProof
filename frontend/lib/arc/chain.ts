import { defineChain } from "viem";

/**
 * Arc Mainnet Viem Chain Definition
 *
 * Arc is an EVM-compatible Layer 1 blockchain built by Circle.
 * Key properties:
 * - Native Gas Asset: USDC (18 decimals at protocol layer)
 * - Chain ID: 5042
 * - Block Explorer: https://explorer.arc.io
 * - JSON-RPC: https://rpc.mainnet.arc.io
 * - Predeployed ERC-20 Interface: 0x3600000000000000000000000000000000000000
 */
export const arcMainnet = defineChain({
  id: 5042,
  name: "Arc",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.mainnet.arc.io",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.mainnet.arc.io",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || "https://explorer.arc.io",
    },
  },
  contracts: {
    // Official predeployed ERC-20 interface for USDC on Arc Mainnet
    usdc: {
      address: (process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS ||
        "0x3600000000000000000000000000000000000000") as `0x${string}`,
    },
  },
});
