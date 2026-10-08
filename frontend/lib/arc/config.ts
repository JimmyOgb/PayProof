import { arcMainnet } from "./chain";

/**
 * Centralized Arc Mainnet Configuration Module
 *
 * All chain-specific configurations, RPC endpoints, explorers, and token
 * addresses are defined here and referenced uniformly across the application.
 *
 * Note on decimals:
 * - Arc native protocol gas and msg.value use 18 decimals (weiUSDC).
 * - Arc predeployed ERC-20 contract (0x3600...0000) uses 6 decimals (standard USDC).
 */
export interface ArcConfig {
  chainId: number;
  chainName: string;
  currencySymbol: string;
  currencyDecimals: number; // 18 decimals for native EVM gas/value
  usdcDecimals: number; // 6 decimals for official ERC-20 contract interface
  rpcUrl: string;
  rpcFallbackUrl?: string;
  explorerUrl: string;
  usdcContractAddress: `0x${string}`;
}

export const ARC_MAINNET_CHAIN_ID = 5042;
export const DEFAULT_ARC_RPC_URL = "https://rpc.mainnet.arc.io";
export const DEFAULT_ARC_EXPLORER_URL = "https://explorer.arc.io";
export const DEFAULT_ARC_USDC_ADDRESS: `0x${string}` =
  "0x3600000000000000000000000000000000000000";
export const ARC_ERC20_USDC_DECIMALS = 6;
export const ARC_NATIVE_GAS_DECIMALS = 18;

/**
 * Returns the active Arc Mainnet configuration, factoring in environment variables
 * with verified production defaults.
 */
export function getArcConfig(): ArcConfig {
  const chainId = process.env.NEXT_PUBLIC_ARC_CHAIN_ID
    ? parseInt(process.env.NEXT_PUBLIC_ARC_CHAIN_ID, 10)
    : ARC_MAINNET_CHAIN_ID;

  const rpcUrl =
    process.env.NEXT_PUBLIC_ARC_RPC_URL || DEFAULT_ARC_RPC_URL;

  const rpcFallbackUrl =
    process.env.ARC_RPC_FALLBACK_URL || undefined;

  const explorerUrl =
    process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || DEFAULT_ARC_EXPLORER_URL;

  const usdcContractAddress = (process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS ||
    DEFAULT_ARC_USDC_ADDRESS) as `0x${string}`;

  return {
    chainId,
    chainName: "Arc Mainnet",
    currencySymbol: "USDC",
    currencyDecimals: 18,
    usdcDecimals: ARC_ERC20_USDC_DECIMALS,
    rpcUrl,
    rpcFallbackUrl,
    explorerUrl,
    usdcContractAddress,
  };
}

export { arcMainnet };
