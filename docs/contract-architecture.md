# Smart Contract & Protocol Architecture: PayProofPayments.sol

## 1. Overview & Purpose

`PayProofPayments.sol` is the minimal on-chain settlement layer for PayProof on **Arc Mainnet** (Chain ID: `5042`).

### Why the Contract Exists
While PayProof supports direct peer-to-peer ERC-20 USDC transfers, high-value commercial transactions require an immutable on-chain record that permanently links:
1. The unique **Payment ID** (`bytes32 paymentId`).
2. The merchant's designated recipient address (`address merchant`).
3. The exact base-unit amount in 6-decimal USDC (`uint256 amount`).
4. The expiration timestamp (`uint256 expiry`).
5. The off-chain canonical request integrity checksum (`bytes32 requestHash`).
6. A canonical on-chain settlement event (`PaymentCompleted`) emitted during execution.

The contract eliminates dispute ambiguity by anchoring payment parameters on-chain without introducing custodial risk.

---

## 2. Technical Specifications

| Parameter | Value |
|---|---|
| **Contract File** | [`contracts/PayProofPayments.sol`](file:///C:/Users/NO%20GO%20NO/payproof/contracts/PayProofPayments.sol) |
| **Solidity Version** | `0.8.28` (Solidity 0.8+ checked arithmetic) |
| **Network** | **Arc Mainnet** |
| **Chain ID** | `5042` |
| **USDC Predeploy Address** | `0x3600000000000000000000000000000000000000` |
| **Token Standard** | Standard ERC-20 (`IERC20`) |
| **Decimals** | 6 (Arc USDC ERC-20 interface) |
| **Bytecode Size** | 1,721 bytes (Extremely lightweight) |

---

## 3. Minimal Attack Surface & Design Decisions

To provide high institutional security, `PayProofPayments.sol` adopts the principle of minimal viable capability:

* **Zero Funds Custody**: Funds transfer directly from `msg.sender` to `merchant` using `_safeTransferFrom`. The contract balance remains 0 at all times.
* **Checks-Effects-Interactions (CEI)**: Reentrancy protection is inherently enforced by marking `paymentRecord.paid = true` before calling `transferFrom`.
* **No Owner / Admin Privileges**: The contract has no owner, no governance keys, and no pause buttons.
* **No Hidden Fees**: 100% of the customer's specified USDC amount is routed to the merchant wallet.
* **No Arbitrary Calls**: The only external call is to the immutable `usdcToken` address set in the constructor.
* **No Native ETH / Gas Token Acceptance**: The contract has no `receive()` or `fallback()` function. Any attempts to send native tokens revert immediately.
* **No Upgradeable Proxies**: The contract is non-upgradeable and immutable.

---

## 4. Payment Lifecycle & Events

### Methods

#### `createPayment`
```solidity
function createPayment(
    bytes32 paymentId,
    address merchant,
    uint256 amount,
    uint256 expiry,
    bytes32 requestHash
) external
```
Validates:
* `amount > 0` (reverts `ZeroAmount`)
* `merchant != address(0)` (reverts `InvalidMerchantAddress`)
* `expiry > block.timestamp` (reverts `ExpiryNotInFuture`)
* `payments[paymentId].merchant == address(0)` (reverts `PaymentAlreadyExists`)

Emits:
```solidity
event PaymentCreated(
    bytes32 indexed paymentId,
    address indexed merchant,
    uint256 amount,
    uint256 expiry,
    bytes32 requestHash
);
```

#### `pay`
```solidity
function pay(bytes32 paymentId, uint256 amount) external
```
Validates:
* Payment exists (`merchant != address(0)`) (reverts `PaymentDoesNotExist`)
* Not already paid (`!paymentRecord.paid`) (reverts `PaymentAlreadyPaid`)
* Not expired (`block.timestamp <= paymentRecord.expiry`) (reverts `PaymentExpired`)
* Exact amount match (`amount == paymentRecord.amount`) (reverts `IncorrectPaymentAmount`)
* Safe ERC-20 transfer from payer to merchant succeeds

Emits:
```solidity
event PaymentCompleted(
    bytes32 indexed paymentId,
    address indexed payer,
    address indexed merchant,
    uint256 amount,
    bytes32 requestHash
);
```

---

## 5. Security Model & Off-Chain Hash Integrity

> [!IMPORTANT]
> **Request Hash Note**: The `requestHash` stored on-chain is a **deterministic SHA3 / Keccak-256 integrity checksum** of the serialized payment parameters. It ensures that the off-chain invoice metadata (product name, order reference, creation date) corresponds to the on-chain payment.
> It is **NOT** a merchant digital signature. If merchant authentication is required in adversarial setups, an asymmetric signature (e.g. EIP-712 typed data signature) should be implemented as a future upgrade.

---

## 6. Deployment Procedure for Arc Mainnet

Before deploying to Arc Mainnet:
1. Verify contract compilation:
   ```bash
   npm run compile
   ```
2. Set environment variables (never commit keys or write them to logs):
   ```bash
   export ARC_RPC_URL="https://rpc.mainnet.arc.io"
   export ARC_CHAIN_ID="5042"
   export DEPLOYER_PRIVATE_KEY="0x..." # Keep secure
   export ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"
   ```
3. Run deployment script:
   ```bash
   node scripts/deploy.mjs
   ```
4. Update frontend environment:
   ```bash
   NEXT_PUBLIC_ARC_PAYMENTS_CONTRACT_ADDRESS="<deployed_address>"
   ```
