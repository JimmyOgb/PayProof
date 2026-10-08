import { createPublicClient, http, encodeDeployData, formatEther, formatUnits } from '../frontend/node_modules/viem/_esm/index.js';
import { privateKeyToAccount } from '../frontend/node_modules/viem/_esm/accounts/index.js';
import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runPreflight() {
  const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
  const expectedChainId = 5042;
  const officialUSDC = '0x3600000000000000000000000000000000000000';
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY is not set in environment.');
    process.exit(1);
  }

  // 1. Derive deployer account
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey);

  // 2. Setup RPC client
  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  });

  const rpcChainId = await publicClient.getChainId();

  // 3. Deployer Balance
  const balanceWei = await publicClient.getBalance({ address: account.address });

  // 4. Verify artifact matches Solidity source
  const sourcePath = path.resolve(__dirname, '../contracts/PayProofPayments.sol');
  const source = fs.readFileSync(sourcePath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'PayProofPayments.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
    },
  };
  const compiled = JSON.parse(solc.compile(JSON.stringify(input)));
  const freshBytecode = '0x' + compiled.contracts['PayProofPayments.sol']['PayProofPayments'].evm.bytecode.object;

  const artifactPath = path.resolve(__dirname, '../contracts/artifacts/PayProofPayments.json');
  const existingArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const artifactMatches = existingArtifact.bytecode.toLowerCase() === freshBytecode.toLowerCase();

  // 5. Gas Estimation
  const deployData = encodeDeployData({
    abi: existingArtifact.abi,
    bytecode: existingArtifact.bytecode,
    args: [officialUSDC],
  });

  let estimatedGas = 0n;
  let gasPrice = 0n;
  let estimatedCostWei = 0n;
  let canCoverGas = false;

  try {
    gasPrice = await publicClient.getGasPrice();
    estimatedGas = await publicClient.estimateGas({
      account: account.address,
      to: null,
      data: deployData,
    });
    // Add 20% buffer
    const bufferedGas = (estimatedGas * 120n) / 100n;
    estimatedCostWei = bufferedGas * gasPrice;
    canCoverGas = balanceWei >= estimatedCostWei;
  } catch (err) {
    console.warn('Gas estimation warning:', err.message);
  }

  const result = {
    deployerAddress: account.address,
    rpcUrl,
    rpcChainId,
    chainIdMatches: rpcChainId === expectedChainId,
    nativeBalanceWei: balanceWei.toString(),
    nativeBalanceFormatted: formatEther(balanceWei), // Arc native gas is 18 decimals
    officialUSDCAddress: officialUSDC,
    artifactMatchesSource: artifactMatches,
    bytecodeSize: existingArtifact.bytecode.length / 2 - 1,
    gasPriceGwei: formatUnits(gasPrice, 9),
    estimatedGasLimit: estimatedGas.toString(),
    estimatedCostWei: estimatedCostWei.toString(),
    estimatedCostFormatted: formatEther(estimatedCostWei),
    canCoverGas,
  };

  console.log(JSON.stringify(result, null, 2));
}

runPreflight().catch((err) => {
  console.error('Preflight error:', err);
  process.exit(1);
});
