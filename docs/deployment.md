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

- Located in `contracts/`.
- Kept completely separate from the frontend lifecycle.
- For V1, direct Arc USDC settlement is natively supported without requiring custom smart contracts.
- Any future contracts will be deployed via Hardhat/Foundry in `scripts/`.
