# PayProof Architecture & Technical Design

## Overview
PayProof is a real USDC payment settlement gateway on Arc mainnet, enabling merchants to accept non-custodial USDC payments with independent on-chain verification.

## Core Flow
1. **Merchant creates a payment request**: Order ID, amount in USDC, merchant settlement address, and metadata.
2. **PayProof generates a checkout**: Generates unique reference code and checkout page.
3. **Customer chooses PayProof**: Customer selects PayProof at checkout.
4. **Customer connects EVM wallet**: Injected (MetaMask, Rabby, Coinbase) connects to Arc mainnet (Chain ID 5042).
5. **Customer pays real USDC**: Initiates on-chain transaction with exact amount and recipient address.
6. **PayProof independently verifies**: Serverless API routes query Arc RPC to verify block confirmation, recipient address match, and exact amount.
7. **Merchant sees PAID**: Status transitions to `PAID`, webhook/callback triggered.
8. **Customer receives a receipt**: Cryptographically verifiable receipt with transaction hash linked to `explorer.arc.io`.

## Vercel Compatibility Principles
* **Stateless serverless API routes**: No persistent local server processes or Docker requirements.
* **Externalized state**: Database/KV storage (e.g. Supabase, Upstash, or PostgreSQL) for payment request state.
* **On-demand RPC querying**: On-chain verification performed via fast HTTP calls to official Arc RPC (`https://rpc.mainnet.arc.io`).
* **Zero local filesystem dependency**: Safe for Vercel Edge and Node.js serverless execution.
