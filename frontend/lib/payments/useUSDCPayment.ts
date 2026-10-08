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
import {
  payContractPayment,
  checkContractPaymentExists,
  formatPaymentIdToBytes32,
  checkUSDCAllowance,
  createContractPayment,
} from "./transfer";
import { verifyPaymentOnChain } from "./verifier";
import { buildPaymentReceipt } from "./receipt";
import {
  ARC_MAINNET_CHAIN_ID,
  DEFAULT_ARC_EXPLORER_URL,
  getArcConfig,
} from "../arc/config";
import { REQUIRED_PAYMENT_CONFIRMATIONS } from "./constants";

export type SigningStep = "IDLE" | "APPROVING" | "PAYING";

export interface UseUSDCPaymentResult {
  status: PaymentStatus;
  txHash: `0x${string}` | null;
  verification: PaymentVerification | null;
  receipt: PaymentReceipt | null;
  error: string | null;
  isSigning: boolean;
  signingStep: SigningStep;
  isVerifying: boolean;
  needsApproval: boolean;
  contractConfigured: boolean;
  initiatePayment: () => Promise<void>;
  reset: () => void;
}

/**
 * React hook coordinating the complete Arc-native PayProof payment protocol:
 *
 * CREATED -> AWAITING_PAYMENT -> SUBMITTED -> VERIFYING -> PAID (or FAILED)
 *
 * FAILS CLOSED IN PRODUCTION:
 * - Requires verified PayProofPayments smart contract address on Arc Mainnet.
 * - Does NOT allow silent fallback to direct transfer in production.
 * - Enforces exact-amount USDC approval prior to contract pay().
 * - Independently verifies the PaymentCompleted on-chain event receipt before transitioning to PAID.
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
  const [signingStep, setSigningStep] = useState<SigningStep>("IDLE");
  const [isVerifying, setIsVerifying] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(true);

  const arcConfig = getArcConfig();
  const contractAddr = arcConfig.paymentsContractAddress;
  const contractConfigured =
    Boolean(contractAddr) &&
    contractAddr !== "0x0000000000000000000000000000000000000000";

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

  // Check allowance whenever wallet or amount changes
  useEffect(() => {
    let isCancelled = false;
    async function checkAllowance() {
      if (!publicClient || !address || !contractConfigured || request.amountRaw <= 0n) {
        if (!isCancelled) setNeedsApproval(true);
        return;
      }

      try {
        const allowance = await checkUSDCAllowance(
          publicClient,
          address,
          contractAddr,
          arcConfig.usdcContractAddress
        );
        if (!isCancelled) {
          setNeedsApproval(allowance < request.amountRaw);
        }
      } catch {
        if (!isCancelled) setNeedsApproval(true);
      }
    }

    checkAllowance();
    return () => {
      isCancelled = true;
    };
  }, [publicClient, address, contractAddr, contractConfigured, request.amountRaw, arcConfig.usdcContractAddress]);

  const reset = useCallback(() => {
    setStatus(isConnected && currentChainId === ARC_MAINNET_CHAIN_ID ? "AWAITING_PAYMENT" : "CREATED");
    setTxHash(null);
    setVerification(null);
    setReceipt(null);
    setError(null);
    setIsSigning(false);
    setSigningStep("IDLE");
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

    // FAIL CLOSED: Smart contract address must be configured
    if (!contractConfigured) {
      const configErrMsg =
        "PayProof protocol error: NEXT_PUBLIC_ARC_PAYMENTS_CONTRACT_ADDRESS is not configured for Arc Mainnet. Silent fallback to direct transfer is strictly prohibited.";
      setError(configErrMsg);
      setStatus("FAILED");
      return;
    }

    try {
      setError(null);
      setIsSigning(true);

      const pidBytes32 = formatPaymentIdToBytes32(request.id);

      // Verify if payment exists in contract; if not, initialize it automatically
      const existsOnChain = await checkContractPaymentExists(
        publicClient,
        contractAddr,
        pidBytes32
      );

      if (!existsOnChain) {
        // Automatically create payment record on-chain if not yet created
        setSigningStep("PAYING");
        const expirySeconds = request.expiresAt
          ? BigInt(Math.floor(request.expiresAt / 1000))
          : BigInt(Math.floor(Date.now() / 1000) + 1800);

        const createTx = await createContractPayment(walletClient, {
          paymentId: request.id,
          merchantAddress: request.merchantAddress,
          amountRaw: request.amountRaw,
          expirySeconds,
          requestHash: request.requestHash ?? ("0x" + "0".repeat(64) as `0x${string}`),
          contractAddress: contractAddr,
        });

        await publicClient.waitForTransactionReceipt({ hash: createTx });
      }

      // Check if approval is needed
      const currentAllowance = await checkUSDCAllowance(
        publicClient,
        address,
        contractAddr,
        arcConfig.usdcContractAddress
      );

      if (currentAllowance < request.amountRaw) {
        setSigningStep("APPROVING");
      } else {
        setSigningStep("PAYING");
      }

      // Execute pay contract payment (handles exact approval if needed)
      const hash = await payContractPayment(
        publicClient,
        walletClient,
        contractAddr,
        request.id,
        request.amountRaw,
        arcConfig.usdcContractAddress,
        (step) => setSigningStep(step)
      );

      setIsSigning(false);
      setSigningStep("IDLE");
      setTxHash(hash);

      // Transition to SUBMITTED
      setStatus((prev) => transitionPaymentStatus(prev, "SUBMITTED"));

      // Transition to VERIFYING
      setStatus((prev) => transitionPaymentStatus(prev, "VERIFYING"));
      setIsVerifying(true);

      // Independent on-chain verification polling loop
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
          expectedPaymentId: request.id,
          expectedRequestHash: request.requestHash,
          contractAddress: contractAddr,
          requiredConfirmations: REQUIRED_PAYMENT_CONFIRMATIONS,
        });

        if (result.status === "VERIFIED") {
          finalVerification = result;
          break;
        } else if (result.status === "FAILED") {
          finalVerification = result;
          break;
        }
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
      setSigningStep("IDLE");
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
    contractConfigured,
    contractAddr,
    arcConfig.usdcContractAddress,
  ]);

  return {
    status,
    txHash,
    verification,
    receipt,
    error,
    isSigning,
    signingStep,
    isVerifying,
    needsApproval,
    contractConfigured,
    initiatePayment,
    reset,
  };
}
