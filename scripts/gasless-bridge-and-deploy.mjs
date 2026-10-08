import { createWalletClient, createPublicClient, http, encodeDeployData, getAddress, formatEther, formatUnits, isAddressEqual, parseAbi } from '../frontend/node_modules/viem/_esm/index.js';
import { privateKeyToAccount } from '../frontend/node_modules/viem/_esm/accounts/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY is not set.');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  console.log('Deployer Address:', account.address);

  // 1. Verify Ethereum USDC balance
  const ethClient = createPublicClient({ transport: http('https://ethereum-rpc.publicnode.com') });
  const ethUsdcAddress = getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  const abi = parseAbi(['function balanceOf(address) view returns (uint256)']);
  
  const ethUsdcBal = await ethClient.readContract({
    address: ethUsdcAddress,
    abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  console.log('Current Ethereum USDC Balance:', formatUnits(ethUsdcBal, 6), 'USDC');

  if (ethUsdcBal < 400000n) {
    console.error('ERROR: Insufficient USDC balance on Ethereum (requires at least 0.40 USDC).');
    process.exit(1);
  }

  // 2. Obtain fresh gasless EIP-3009 quote from Relay
  console.log('\nRequesting gasless EIP-3009 permit bridge quote from Relay...');
  const quoteUrl = 'https://api.relay.link/quote/v2';
  const quoteBody = {
    user: account.address,
    originChainId: 1,
    destinationChainId: 5042,
    originCurrency: ethUsdcAddress,
    destinationCurrency: '0x3600000000000000000000000000000000000000',
    recipient: account.address,
    amount: '400000', // 0.40 USDC
    tradeType: 'EXACT_INPUT',
    usePermit: true,
  };

  const quoteRes = await fetch(quoteUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quoteBody),
  });
  const quoteData = await quoteRes.json();

  if (!quoteData.steps || !quoteData.steps[0] || !quoteData.steps[0].items[0]) {
    console.error('ERROR: Failed to obtain valid permit quote from Relay:', quoteData);
    process.exit(1);
  }

  const stepItem = quoteData.steps[0].items[0];
  const signData = stepItem.data.sign;
  const postData = stepItem.data.post;
  const expectedArcUsdc = quoteData.details.currencyOut.amountFormatted;

  console.log('Quote received!');
  console.log('Input:', formatUnits(400000n, 6), 'USDC on Ethereum Mainnet');
  console.log('Expected Arc Native Gas Output:', expectedArcUsdc, 'USDC on Arc Mainnet');
  console.log('Signer (EIP-712):', signData.value.from);
  console.log('Spender:', signData.value.to);
  console.log('Value:', signData.value.value);
  console.log('Nonce:', signData.value.nonce);

  // 3. Sign EIP-712 ReceiveWithAuthorization off-chain (zero ETH gas required)
  console.log('\nSigning EIP-712 ReceiveWithAuthorization message with DEPLOYER_PRIVATE_KEY...');
  const types = {
    ReceiveWithAuthorization: signData.types.ReceiveWithAuthorization,
  };

  const domain = {
    name: signData.domain.name,
    version: signData.domain.version,
    chainId: signData.domain.chainId,
    verifyingContract: signData.domain.verifyingContract,
  };

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: 'ReceiveWithAuthorization',
    message: {
      from: getAddress(signData.value.from),
      to: getAddress(signData.value.to),
      value: BigInt(signData.value.value),
      validAfter: BigInt(signData.value.validAfter),
      validBefore: BigInt(signData.value.validBefore),
      nonce: signData.value.nonce,
    },
  });

  console.log('Signature generated successfully! Length:', signature.length);

  // 4. Submit signed permit to Relay
  console.log('\nSubmitting signed permit to Relay relayer endpoint...');
  const permitEndpoint = 'https://api.relay.link' + postData.endpoint + '?signature=' + signature;
  const permitPayload = postData.body;

  const permitRes = await fetch(permitEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(permitPayload),
  });
  const permitResult = await permitRes.json();
  console.log('Relay response:', permitResult);

  // 5. Poll for Relay fulfillment & Arc balance
  const checkUrl = 'https://api.relay.link' + (stepItem.data.check?.endpoint || `/intents/status/v3?requestId=${postData.body.requestId}`);
  console.log('\nMonitoring Relay cross-chain execution at:', checkUrl);

  const arcClient = createPublicClient({ transport: http('https://rpc.mainnet.arc.io') });
  let arcBalance = 0n;
  const startTime = Date.now();
  const maxWaitMs = 120000; // 2 minutes

  while (Date.now() - startTime < maxWaitMs) {
    try {
      arcBalance = await arcClient.getBalance({ address: account.address });
      if (arcBalance >= 9371400469038570n) {
        console.log(`\n🎉 Native Arc gas confirmed! Balance: ${formatEther(arcBalance)} native USDC (${arcBalance.toString()} weiUSDC)`);
        break;
      }
    } catch (e) {}

    try {
      const statusRes = await fetch(checkUrl);
      const statusData = await statusRes.json();
      console.log(`Relay status: ${statusData.status || 'processing'} (Arc balance: ${formatEther(arcBalance)})`);
      if (statusData.status === 'success' && arcBalance > 0n) {
        break;
      }
    } catch (e) {}

    await new Promise((r) => setTimeout(r, 3000));
  }

  arcBalance = await arcClient.getBalance({ address: account.address });
  if (arcBalance < 9371400469038570n) {
    console.error('ERROR: Timed out waiting for Arc gas credit. Current balance:', arcBalance.toString());
    process.exit(1);
  }

  // 6. DEPLOY CONTRACT ON ARC MAINNET
  console.log('\n======================================================');
  console.log('      PROCEEDING TO DEPLOY PayProofPayments.sol       ');
  console.log('======================================================');

  const expectedChainId = 5042;
  const officialUSDC = getAddress('0x3600000000000000000000000000000000000000');
  const chainId = await arcClient.getChainId();

  if (chainId !== expectedChainId) {
    console.error(`ERROR: RPC chain ID (${chainId}) does not match expected Arc Chain ID (${expectedChainId}).`);
    process.exit(1);
  }

  const artifactPath = path.resolve(__dirname, '../contracts/artifacts/PayProofPayments.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const deployData = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [officialUSDC],
  });

  const walletClient = createWalletClient({
    account,
    transport: http('https://rpc.mainnet.arc.io'),
  });

  console.log('Broadcasting deployment transaction to Arc Mainnet...');
  const txHash = await walletClient.sendTransaction({
    to: null,
    data: deployData,
    value: 0n,
  });

  console.log('Deployment broadcasted! Tx Hash:', txHash);
  console.log('Waiting for block confirmation on Arc Mainnet...');

  const receipt = await arcClient.waitForTransactionReceipt({ hash: txHash });
  console.log('Transaction Confirmed on Arc Mainnet!');
  console.log('Status:', receipt.status);
  console.log('Block Number:', receipt.blockNumber.toString());
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Contract Address:', receipt.contractAddress);

  if (receipt.status !== 'success' || !receipt.contractAddress) {
    console.error('ERROR: Deployment transaction failed or contract address missing.');
    process.exit(1);
  }

  const deployedAddress = getAddress(receipt.contractAddress);

  // 7. Verify bytecode on-chain
  const bytecodeOnChain = await arcClient.getBytecode({ address: deployedAddress });
  if (!bytecodeOnChain || bytecodeOnChain === '0x') {
    console.error('ERROR: No deployed bytecode found at', deployedAddress);
    process.exit(1);
  }
  console.log('Verified On-Chain Bytecode Size:', bytecodeOnChain.length / 2 - 1, 'bytes');

  // 8. Verify USDC getter on-chain
  const configuredUsdc = await arcClient.readContract({
    address: deployedAddress,
    abi: artifact.abi,
    functionName: 'usdc',
  });
  console.log('Configured USDC Address in Contract:', configuredUsdc);

  if (!isAddressEqual(configuredUsdc, officialUSDC)) {
    console.error(`ERROR: Configured USDC address does not match official Arc USDC!`);
    process.exit(1);
  }
  console.log('USDC address successfully verified as official Arc USDC predeploy!');

  // 9. Update frontend/.env.local
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

  const finalBalance = await arcClient.getBalance({ address: account.address });

  const finalResult = {
    success: true,
    fundingMethod: 'Relay EIP-3009 Gasless Permit Bridge',
    inputUsdcEthereum: '0.400000',
    nativeArcUsdcReceived: formatEther(arcBalance),
    finalDeployerBalance: formatEther(finalBalance),
    contractAddress: deployedAddress,
    deploymentTxHash: txHash,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    configuredUsdc,
    bytecodeSizeBytes: bytecodeOnChain.length / 2 - 1,
  };

  console.log('\nFINAL_DEPLOYMENT_RESULT:' + JSON.stringify(finalResult, null, 2));
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
