"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useChainId, useWalletClient, usePublicClient } from "wagmi";
import {
  PaymentRequest,
  PaymentStatus,
  PaymentVerification,
  PaymentReceipt,
} from "./types";
import { transitionPaymentStatus } from "./stateMachine";
import { sendUSDCPayment } from "./transfer";
import { verifyPaymentOnChain } from "./verifier";
import { buildPaymentReceipt } from "./receipt";
import { ARC_MAINNET_CHAIN_ID, DEFAULT_ARC_EXPLORER_URL } from "../arc/config";
import { REQUIRED_PAYMENT_CONFIRMATIONS } from "./constants";

export interface UseUSDCPaymentResult {
  status: PaymentStatus;
  txHash: `0x${string}` | null;
  verification: PaymentVerification | null;
  receipt: PaymentReceipt | null;
  error: string | null;
  isSigning: boolean;
  isVerifying: boolean;
  initiatePayment: () => Promise<void>;
  reset: () => void;
}

/**
 * React hook coordinating the complete non-custodial USDC payment flow:
 *
 * CREATED -> AWAITING_PAYMENT -> SUBMITTED -> VERIFYING -> PAID (or FAILED)
 *
 * Crucially: It never marks a payment as PAID without independent on-chain
 * verification of the Arc transaction receipt and ERC-20 transfer event.
 */
export function useUSDCPayment(
  request: PaymentRequest
): UseUSDCPaymentResult {
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<PaymentStatus>("CREATED");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [verification, setVerification] = useState<PaymentVerification | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Synchronize state when wallet connects/disconnects
  useEffect(() => {
    if (status === "CREATED" || status === "AWAITING_PAYMENT") {
      if (isConnected && currentChainId === ARC_MAINNET_CHAIN_ID) {
        setStatus("AWAITING_PAYMENT");
      } else {
        setStatus("CREATED");
      }
    }
  }, [isConnected, currentChainId, status]);

  const reset = useCallback(() => {
    setStatus(isConnected && currentChainId === ARC_MAINNET_CHAIN_ID ? "AWAITING_PAYMENT" : "CREATED");
    setTxHash(null);
    setVerification(null);
    setReceipt(null);
    setError(null);
    setIsSigning(false);
    setIsVerifying(false);
  }, [isConnected, currentChainId]);

  const initiatePayment = useCallback(async () => {
    if (!walletClient || !address) {
      setError("Please connect your wallet first.");
      return;
    }

    if (currentChainId !== ARC_MAINNET_CHAIN_ID) {
      setError(`Please switch network to Arc Mainnet (Chain ID: ${ARC_MAINNET_CHAIN_ID}).`);
      return;
    }

    if (!publicClient) {
      setError("Arc RPC client is not initialized.");
      return;
    }

    try {
      setError(null);
      setIsSigning(true);

      // Step 1: Customer signs and broadcasts transaction
      const hash = await sendUSDCPayment(walletClient, {
        merchantAddress: request.merchantAddress,
        amountRaw: request.amountRaw,
      });

      setIsSigning(false);
      setTxHash(hash);

      // Step 2: Transition to SUBMITTED
      setStatus((prev) => transitionPaymentStatus(prev, "SUBMITTED"));

      // Step 3: Transition to VERIFYING
      setStatus((prev) => transitionPaymentStatus(prev, "VERIFYING"));
      setIsVerifying(true);

      // Step 4: Independent on-chain verification polling loop
      const maxAttempts = 30; // 30 attempts * 1.5s = ~45s max
      let pollCount = 0;
      let finalVerification: PaymentVerification | null = null;

      while (pollCount < maxAttempts) {
        pollCount++;
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const result = await verifyPaymentOnChain(publicClient, {
          txHash: hash,
          expectedMerchant: request.merchantAddress,
          expectedAmount: request.amountRaw,
          expectedSender: address,
          requiredConfirmations: REQUIRED_PAYMENT_CONFIRMATIONS,
        });

        if (result.status === "VERIFIED") {
          finalVerification = result;
          break;
        } else if (result.status === "FAILED") {
          finalVerification = result;
          break;
        }
        // If PENDING, keep polling for receipt & confirmations
      }

      setIsVerifying(false);

      if (!finalVerification) {
        setStatus((prev) => transitionPaymentStatus(prev, "FAILED"));
        setError("Verification timed out waiting for transaction finality on Arc.");
        return;
      }

      setVerification(finalVerification);

      if (finalVerification.status === "VERIFIED") {
        const finalReceipt = buildPaymentReceipt(
          request,
          finalVerification,
          DEFAULT_ARC_EXPLORER_URL
        );
        setReceipt(finalReceipt);
        setStatus((prev) => transitionPaymentStatus(prev, "PAID"));
      } else {
        setStatus((prev) => transitionPaymentStatus(prev, "FAILED"));
        setError(finalVerification.failureReason || "On-chain verification failed.");
      }
    } catch (err) {
      setIsSigning(false);
      setIsVerifying(false);
      const message = err instanceof Error ? err.message : String(err);
      setStatus("FAILED");
      setError(message);
    }
  }, [
    walletClient,
    address,
    currentChainId,
    publicClient,
    request,
  ]);

  return {
    status,
    txHash,
    verification,
    receipt,
    error,
    isSigning,
    isVerifying,
    initiatePayment,
    reset,
  };
}
