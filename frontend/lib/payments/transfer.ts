import {
  type WalletClient,
  encodeFunctionData,
  getAddress,
} from "viem";
import { ERC20_ABI } from "./verifier";
import { DEFAULT_ARC_USDC_ADDRESS, ARC_MAINNET_CHAIN_ID } from "../arc/config";

export interface USDCTransferParams {
  merchantAddress: `0x${string}`;
  amountRaw: bigint;
  usdcContractAddress?: `0x${string}`;
}

/**
 * Prepares the raw calldata for an ERC-20 transfer call to the verified USDC contract.
 */
export function prepareUSDCTransferCalldata(
  merchantAddress: `0x${string}`,
  amountRaw: bigint
): `0x${string}` {
  const sanitizedMerchant = getAddress(merchantAddress);
  if (amountRaw <= 0n) {
    throw new Error("Payment amount must be greater than zero");
  }

  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [sanitizedMerchant, amountRaw],
  });
}

/**
 * Initiates an on-chain USDC payment directly from the customer's wallet to the merchant.
 *
 * Non-custodial:
 * - Customer signs the transaction in their own connected wallet.
 * - Funds transfer directly: customer wallet -> merchant wallet.
 * - PayProof never takes custody of funds or holds private keys.
 * - Returns the authentic transaction hash upon wallet broadcast.
 */
export async function sendUSDCPayment(
  walletClient: WalletClient,
  params: USDCTransferParams
): Promise<`0x${string}`> {
  const merchant = getAddress(params.merchantAddress);
  const tokenAddress = params.usdcContractAddress
    ? getAddress(params.usdcContractAddress)
    : DEFAULT_ARC_USDC_ADDRESS;

  if (params.amountRaw <= 0n) {
    throw new Error("Payment amount must be greater than zero");
  }

  // Ensure wallet is connected on Arc
  const chainId = await walletClient.getChainId();
  if (chainId !== ARC_MAINNET_CHAIN_ID) {
    throw new Error(
      `Wallet connected to chain ${chainId}, but Arc Mainnet (${ARC_MAINNET_CHAIN_ID}) is required.`
    );
  }

  // Submit ERC-20 transfer transaction signed by user
  const [account] = await walletClient.getAddresses();
  const hash = await walletClient.writeContract({
    account: walletClient.account ?? account,
    chain: walletClient.chain ?? undefined,
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [merchant, params.amountRaw],
    value: 0n,
  } as any);

  return hash;
}
