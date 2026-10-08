import { describe, it, expect } from "vitest";
import {
  arcMainnet,
  getArcConfig,
  ARC_MAINNET_CHAIN_ID,
  DEFAULT_ARC_RPC_URL,
  DEFAULT_ARC_EXPLORER_URL,
  DEFAULT_ARC_USDC_ADDRESS,
  ARC_ERC20_USDC_DECIMALS,
  ARC_NATIVE_GAS_DECIMALS,
} from "../lib/arc";

describe("Frontend Arc Configuration", () => {
  it("defines the correct Arc Mainnet chain ID (5042)", () => {
    expect(arcMainnet.id).toBe(5042);
    expect(ARC_MAINNET_CHAIN_ID).toBe(5042);
  });

  it("configures USDC as the native gas asset with 18 decimals", () => {
    expect(arcMainnet.nativeCurrency.name).toBe("USD Coin");
    expect(arcMainnet.nativeCurrency.symbol).toBe("USDC");
    expect(arcMainnet.nativeCurrency.decimals).toBe(18);
  });

  it("configures official RPC and Explorer URLs", () => {
    expect(arcMainnet.rpcUrls.default.http[0]).toBe(DEFAULT_ARC_RPC_URL);
    expect(arcMainnet.blockExplorers?.default.url).toBe(DEFAULT_ARC_EXPLORER_URL);
  });

  it("configures the official predeployed USDC ERC-20 interface address", () => {
    expect(DEFAULT_ARC_USDC_ADDRESS).toBe(
      "0x3600000000000000000000000000000000000000"
    );
  });

  it("getArcConfig returns complete typed configuration object with dual decimals", () => {
    const config = getArcConfig();
    expect(config.chainId).toBe(5042);
    expect(config.currencySymbol).toBe("USDC");
    expect(config.currencyDecimals).toBe(18); // Native protocol gas (weiUSDC)
    expect(config.usdcDecimals).toBe(6); // ERC-20 standard interface
    expect(ARC_ERC20_USDC_DECIMALS).toBe(6);
    expect(ARC_NATIVE_GAS_DECIMALS).toBe(18);
    expect(config.rpcUrl).toBe(DEFAULT_ARC_RPC_URL);
    expect(config.explorerUrl).toBe(DEFAULT_ARC_EXPLORER_URL);
    expect(config.usdcContractAddress).toBe(DEFAULT_ARC_USDC_ADDRESS);
    expect(config.paymentsContractAddress).toBeDefined();
  });
});
