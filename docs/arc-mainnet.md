# Arc Mainnet Architecture & Verified Parameters

## Verified Network Parameters

| Parameter | Value | Source / Verification |
|---|---|---|
| **Network Name** | Arc Mainnet | Official Circle / Arc Docs |
| **Chain ID** | `5042` (`0x13b2`) | Verified via live JSON-RPC `eth_chainId` |
| **Native Gas Token** | USD Coin (`USDC`) | Protocol gas asset |
| **Native Protocol Decimals** | `18` (`weiUSDC`) | Used for gas accounting and EVM `msg.value` |
| **ERC-20 USDC Predeployed Address** | `0x3600000000000000000000000000000000000000` | Predeployed official native USDC contract |
| **ERC-20 USDC Decimals** | `6` | Verified via live JSON-RPC `eth_call` `decimals()` |
| **Official RPC Endpoint** | `https://rpc.mainnet.arc.io` | Official Circle RPC endpoint |
| **Block Explorer** | `https://explorer.arc.io` | Official Arc block explorer |
| **Consensus Engine** | Malachite BFT | Tendermint-derived BFT consensus |
| **Average Block Time** | ~0.5 seconds | Sub-second deterministic block production |

---

## Arc Currency & Settlement Mechanics

### 1. Dual Decimal Representation (The Arc Decimals Trap)
On the Arc blockchain, USDC serves as both the native protocol gas token and as an ERC-20 token sharing the unified underlying balance:
* **Native Interface (18 Decimals)**: Arc's native protocol layer accounts for gas and native transfers (`msg.value`) using 18 decimals (`weiUSDC`, 1 USDC = $10^{18}$ weiUSDC).
* **ERC-20 Interface (6 Decimals)**: The predeployed smart contract at `0x3600000000000000000000000000000000000000` exposes the standard ERC-20 interface (`transfer`, `approve`, `balanceOf`, `Transfer` events). Its `decimals()` returns **6** ($10^6$), consistent with standard USDC on Ethereum and other major EVM chains.

> **CRITICAL ARCHITECTURAL DECISION:**
> If an application transfers USDC via the ERC-20 contract using 18 decimals, the user would transfer $10^{12}$ (one trillion) times too much. PayProof uses the standard ERC-20 interface with **6-decimal base units** (`BigInt`) for all payment requests, customer wallet transfers, and event log verifications.

### 2. Payment Method: ERC-20 `transfer(address to, uint256 amount)`
PayProof executes customer payments via standard ERC-20 `transfer(to, amount)` to the predeployed USDC contract `0x3600000000000000000000000000000000000000`:
* Funds transfer directly from the customer's wallet to the merchant's wallet.
* PayProof never takes custody and never routes funds through intermediary contracts or escrow.
* The transaction emits a canonical `Transfer(address indexed from, address indexed to, uint256 value)` log on contract `0x3600000000000000000000000000000000000000`.

### 3. Transaction Receipts & Status Semantics
* Arc runs Reth for its EVM execution layer.
* Pending transactions return `null` when queried with `eth_getTransactionReceipt`.
* Once included in a block, the receipt returns:
  - `status: "0x1"` — Execution succeeded without revert.
  - `status: "0x0"` — Execution reverted/failed.
  - `blockNumber`: The block number containing the transaction.
  - `logs`: Array of event logs. A valid PayProof transaction MUST include the `Transfer` event from `0x3600000000000000000000000000000000000000`.

### 4. Consensus & Finality on Arc
* Arc uses the **Malachite BFT** consensus engine.
* Once a block is committed by a two-thirds supermajority of validators, it has **deterministic finality** (no probabilistic forks or reorganizations).
* For independent verification against RPC node propagation, PayProof requires:
  1. Transaction receipt exists with `status: "success"` (`0x1`).
  2. Block confirmation count (`currentBlockNumber - txBlockNumber + 1`) $\ge$ configured confirmation threshold (default: 2 confirmations, ~1 second).
