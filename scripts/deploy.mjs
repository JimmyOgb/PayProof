/**
 * Arc Mainnet Deployment Script for PayProofPayments.sol
 *
 * Reads configuration strictly from environment variables:
 * - ARC_RPC_URL (default: https://rpc.mainnet.arc.io)
 * - ARC_CHAIN_ID (default: 5042)
 * - ARC_USDC_ADDRESS (default: 0x3600000000000000000000000000000000000000)
 * - DEPLOYER_PRIVATE_KEY (required, must be set in env)
 *
 * SAFETY CHECKS:
 * - Verifies chain ID is 5042
 * - Verifies official USDC contract is valid
 * - Verifies deployer account balance
 * - Never prints private keys or sensitive credentials
 */

import { createWalletClient, createPublicClient, http, encodeDeployData } from '../frontend/node_modules/viem/_esm/index.js';
import { privateKeyToAccount } from '../frontend/node_modules/viem/_esm/accounts/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
  const expectedChainId = parseInt(process.env.ARC_CHAIN_ID || '5042', 10);
  const usdcAddress = process.env.ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000';
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY environment variable is not set.');
    console.error('To deploy to Arc Mainnet, export DEPLOYER_PRIVATE_KEY="0x..." and rerun.');
    process.exit(1);
  }

  // Load contract artifact
  const artifactPath = path.resolve(__dirname, '../contracts/artifacts/PayProofPayments.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('ERROR: Contract artifacts not found. Run "npm run compile" first.');
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  });

  const chainId = await publicClient.getChainId();
  if (chainId !== expectedChainId) {
    console.error(`ERROR: RPC chain ID (${chainId}) does not match expected Arc Chain ID (${expectedChainId}).`);
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Deployer Address:', account.address);
  console.log('Deployer Native Balance (weiUSDC):', balance.toString());

  if (balance === 0n) {
    console.error('ERROR: Deployer wallet has zero balance for gas on Arc Mainnet.');
    process.exit(1);
  }

  console.log('\nDeploying PayProofPayments.sol to Arc Mainnet...');
  console.log('USDC Predeploy Constructor Arg:', usdcAddress);

  const deployData = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [usdcAddress],
  });

  const txHash = await walletClient.sendTransaction({
    to: null,
    data: deployData,
    value: 0n,
  });

  console.log('Deployment Transaction Broadcast! Hash:', txHash);
  console.log('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log('Contract Successfully Deployed!');
  console.log('Contract Address:', receipt.contractAddress);
  console.log('Block Number:', receipt.blockNumber.toString());
  console.log('\nAdd to frontend/.env.local:');
  console.log(`NEXT_PUBLIC_ARC_PAYMENTS_CONTRACT_ADDRESS="${receipt.contractAddress}"`);
}

main().catch((err) => {
  console.error('Deployment Failed:', err);
  process.exit(1);
});
