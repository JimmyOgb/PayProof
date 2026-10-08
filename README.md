# PayProof

> Real, non-custodial USDC payments on Arc mainnet with independent on-chain verification.

PayProof enables merchants to accept real USDC payments on the **Arc Mainnet** (Chain ID: `5042`) without custody, intermediary smart contracts, or volatile crypto fees.

---

## How PayProof Works

1. **Merchant creates a payment request**
   * Specifies merchant wallet address and invoice amount in USDC (e.g. 25.00 USDC = `25000000n` base units).
   * Generates a strongly typed `PaymentRequest`.

2. **Customer connects an EVM wallet**
   * Connects via Wagmi/Viem to Arc Mainnet.
   * Prompts network switch if connected to an unexpected chain.

3. **Customer transfers real USDC directly to the merchant**
   * Customer signs a standard ERC-20 `transfer(merchant, amount)` transaction via the official Arc USDC contract (`0x3600000000000000000000000000000000000000`).
   * Funds move **directly from customer wallet → merchant wallet**.
   * PayProof never holds custody, touches private keys, or routes funds through escrow.

4. **PayProof independently verifies the transaction on-chain**
   * PayProof queries Arc JSON-RPC (`eth_getTransaction`, `eth_getTransactionReceipt`, `eth_blockNumber`).
   * Verifies transaction execution (`status: 0x1`), contract origin, `Transfer` event recipient, exact amount in base units, and block confirmation depth ($\ge 2$ confirmations).
   * **Fail-closed**: Direct transition from `SUBMITTED` to `PAID` is strictly prohibited without independent blockchain proof.

5. **Merchant & Customer receive verified proof**
   * Upon verified confirmation, payment transitions to `PAID`.
   * An immutable `PaymentReceipt` is generated with block height, confirmations, and explorer links.

---

## Verified Arc Mainnet Parameters

| Parameter | Value | Details |
|---|---|---|
| **Chain ID** | `5042` | Official Arc Mainnet chain ID |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` | Verified live JSON-RPC |
| **Block Explorer** | `https://explorer.arc.io` | Official block explorer |
| **USDC Predeployed Address** | `0x3600000000000000000000000000000000000000` | Predeployed official native USDC ERC-20 interface |
| **USDC ERC-20 Decimals** | `6` | Standard USDC decimal precision for commerce |
| **Native Gas Token** | `USDC` (`weiUSDC`, 18 decimals) | Used for protocol gas accounting and `msg.value` |
| **Consensus Engine** | Malachite BFT | Deterministic sub-second finality (~0.5s block time) |

---

## Verification & Commands

```bash
# Run unit test suite (deterministic verifier, units, state machine, receipts)
npm run test

# Run read-only Arc Mainnet live smoke test (zero funds spent)
npm run test:smoke

# Run TypeScript typecheck
npm run typecheck

# Run ESLint
npm run lint

# Build production bundle
npm run build
```

---

## Documentation

* [Arc Mainnet Specification & Parameters](docs/arc-mainnet.md)
* [Payment Settlement Lifecycle & State Machine](docs/payment-flow.md)
* [System Architecture](docs/architecture.md)
* [Deployment Guide](docs/deployment.md)
