# Deployment Architecture

## Frontend Deployment (Vercel)

The frontend is built as a standalone Next.js App Router application designed for zero-configuration deployment on Vercel:

- **Root Directory**: `frontend/`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Environment Variables**:
  - `NEXT_PUBLIC_ARC_CHAIN_ID=5042`
  - `NEXT_PUBLIC_ARC_RPC_URL=https://rpc.mainnet.arc.io`
  - `NEXT_PUBLIC_ARC_EXPLORER_URL=https://explorer.arc.io`
  - `NEXT_PUBLIC_ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000`

### Vercel Serverless Architecture Considerations

- **Stateless Operations**: No persistent filesystem storage or daemon processes required.
- **Client-Side RPC Interaction**: Direct client-to-RPC calls via Viem / Wagmi over HTTPS/WSS, minimizing serverless function invocation limits.
- **Edge / Serverless Verification**: Any API routes perform lightweight deterministic RPC calls directly to Arc mainnet.

## Contracts Deployment (Arc Mainnet)

- Smart Contract: [`contracts/PayProofPayments.sol`](file:///C:/Users/NO%20GO%20NO/payproof/contracts/PayProofPayments.sol)
- Target Chain ID: `5042` (Arc Mainnet)
- USDC Token Address: `0x3600000000000000000000000000000000000000`
- Compilation Command:
  ```bash
  npm run compile
  ```
- Deployment Script: [`scripts/deploy.mjs`](file:///C:/Users/NO%20GO%20NO/payproof/scripts/deploy.mjs)
  ```bash
  export DEPLOYER_PRIVATE_KEY="0x..." # Keep secure, never commit
  node scripts/deploy.mjs
  ```
- Live Deployed Contract Address on Arc Mainnet:
  `0x87d4a1669336882e3355b83f953ad3b8b944c908`
- Deployment Transaction Hash:
  [`0x47012ff7ac41ea8ab8f12fcaf1ac28958015c8f0010466a1f2049ebcead308f6`](https://explorer.arc.io/tx/0x47012ff7ac41ea8ab8f12fcaf1ac28958015c8f0010466a1f2049ebcead308f6)
- Configured in `frontend/.env.local` and Vercel production:
  ```bash
  NEXT_PUBLIC_ARC_PAYMENTS_CONTRACT_ADDRESS="0x87d4a1669336882e3355b83f953ad3b8b944c908"
  ```
