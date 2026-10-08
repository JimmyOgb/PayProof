import { createWalletClient, createPublicClient, http, encodeDeployData, getAddress, formatEther, isAddressEqual } from '../frontend/node_modules/viem/_esm/index.js';
import { privateKeyToAccount } from '../frontend/node_modules/viem/_esm/accounts/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
  const expectedChainId = 5042;
  const officialUSDC = getAddress('0x3600000000000000000000000000000000000000');
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY is not set in environment.');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  console.log('Deployer Address:', account.address);

  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const chainId = await publicClient.getChainId();

  if (chainId !== expectedChainId) {
    console.error(`ERROR: RPC chain ID (${chainId}) does not match expected Arc Chain ID (${expectedChainId}).`);
    process.exit(1);
  }
  console.log('Verified Arc Mainnet Chain ID:', chainId);

  // Check balance and wait if not yet funded
  let balance = await publicClient.getBalance({ address: account.address });
  console.log('Initial Deployer Native Balance:', balance.toString(), `(${formatEther(balance)} weiUSDC)`);

  const minRequiredWei = 9371400469038570n; // ~0.0094 USDC
  if (balance < minRequiredWei) {
    console.log(`\nAwaiting native Arc gas funding on ${account.address}... (requires >= 0.0094 USDC)`);
    console.log('Polling Arc Mainnet JSON-RPC every 3 seconds...');
    const startTime = Date.now();
    const timeoutMs = 20 * 60 * 1000; // 20 minutes timeout
    while (balance < minRequiredWei) {
      if (Date.now() - startTime > timeoutMs) {
        console.error('ERROR: Timed out waiting for native gas funding on Arc Mainnet.');
        process.exit(2);
      }
      await new Promise((r) => setTimeout(r, 3000));
      balance = await publicClient.getBalance({ address: account.address });
    }
    console.log(`\n🎉 Funding confirmed on-chain!`);
    console.log('New Deployer Balance:', balance.toString(), `(${formatEther(balance)} weiUSDC)`);
  }

  // Load contract artifact
  const artifactPath = path.resolve(__dirname, '../contracts/artifacts/PayProofPayments.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('ERROR: Artifacts not found. Run "npm run compile" first.');
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  // Encode deploy data
  const deployData = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [officialUSDC],
  });

  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  });

  console.log('\nBroadcasting PayProofPayments.sol deployment transaction to Arc Mainnet...');
  const txHash = await walletClient.sendTransaction({
    to: null,
    data: deployData,
    value: 0n,
  });

  console.log('Broadcast successful! Tx Hash:', txHash);
  console.log('Waiting for block confirmation on Arc Mainnet...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log('Transaction Confirmed!');
  console.log('Status:', receipt.status);
  console.log('Block Number:', receipt.blockNumber.toString());
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Contract Address:', receipt.contractAddress);

  if (receipt.status !== 'success' || !receipt.contractAddress) {
    console.error('ERROR: Deployment transaction failed or contract address missing.');
    process.exit(1);
  }

  const deployedAddress = getAddress(receipt.contractAddress);

  // Verify deployed bytecode on-chain
  const bytecodeOnChain = await publicClient.getBytecode({ address: deployedAddress });
  if (!bytecodeOnChain || bytecodeOnChain === '0x') {
    console.error('ERROR: No deployed bytecode found at', deployedAddress);
    process.exit(1);
  }
  console.log('Verified On-Chain Bytecode Size:', bytecodeOnChain.length / 2 - 1, 'bytes');

  // Verify USDC address getter on deployed contract
  const configuredUsdc = await publicClient.readContract({
    address: deployedAddress,
    abi: artifact.abi,
    functionName: 'usdc',
  });
  console.log('Configured USDC Address in Contract:', configuredUsdc);

  if (!isAddressEqual(configuredUsdc, officialUSDC)) {
    console.error(`ERROR: Configured USDC address (${configuredUsdc}) does not match official Arc USDC (${officialUSDC})!`);
    process.exit(1);
  }
  console.log('USDC address successfully matches official Arc USDC predeploy!');

  // Update frontend/.env.local
  const envLocalPath = path.resolve(__dirname, '../frontend/.env.local');
  let envContent = '';
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
  }

  const contractEnvRegex = /^NEXT_PUBLIC_ARC_PAYMENTS_CONTRACT_ADDRESS=.*$/m;
  const newEnvLine = `NEXT_PUBLIC_ARC_PAYMENTS_CONTRACT_ADDRESS="${deployedAddress}"`;

  if (contractEnvRegex.test(envContent)) {
    envContent = envContent.replace(contractEnvRegex, newEnvLine);
  } else {
    envContent = envContent.trim() + (envContent.trim() ? '\n' : '') + newEnvLine + '\n';
  }

  fs.writeFileSync(envLocalPath, envContent);
  console.log('Updated frontend/.env.local with NEXT_PUBLIC_ARC_PAYMENTS_CONTRACT_ADDRESS:', deployedAddress);

  // Output result JSON for programmatic consumption
  const result = {
    success: true,
    txHash,
    contractAddress: deployedAddress,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    configuredUsdc,
    bytecodeSizeBytes: bytecodeOnChain.length / 2 - 1,
  };
  console.log('\nDEPLOYMENT_RESULT_JSON:' + JSON.stringify(result));
}

main().catch((err) => {
  console.error('Execution Failed:', err);
  process.exit(1);
});
