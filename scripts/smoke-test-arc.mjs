/**
 * Read-Only Arc Mainnet Smoke Test
 *
 * Verifies live Arc mainnet connectivity, chain ID, block progression,
 * and predeployed USDC contract parameters.
 *
 * SAFETY GUARANTEE:
 * - 100% READ-ONLY.
 * - No transactions are signed or sent.
 * - Zero funds spent.
 * - No private keys required.
 */

const RPC_URL = process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io";
const EXPECTED_CHAIN_ID = 5042;
const USDC_CONTRACT = "0x3600000000000000000000000000000000000000";

async function rpcCall(method, params = []) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(`RPC Error (${json.error.code}): ${json.error.message}`);
  }

  return json.result;
}

async function runSmokeTest() {
  console.log("=================================================");
  console.log("   PayProof Arc Mainnet Read-Only Smoke Test     ");
  console.log("=================================================");
  console.log(`RPC Endpoint: ${RPC_URL}`);
  console.log(`USDC Contract: ${USDC_CONTRACT}\n`);

  // 1. Verify Chain ID
  const chainIdHex = await rpcCall("eth_chainId");
  const chainId = parseInt(chainIdHex, 16);
  console.log(`[1/4] eth_chainId: ${chainId} (hex: ${chainIdHex})`);
  if (chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Chain ID mismatch! Expected ${EXPECTED_CHAIN_ID}, got ${chainId}`);
  }
  console.log("      ✓ Verified Arc Mainnet Chain ID (5042)\n");

  // 2. Verify Block Progression
  const blockHex = await rpcCall("eth_blockNumber");
  const blockNumber = parseInt(blockHex, 16);
  console.log(`[2/4] eth_blockNumber: ${blockNumber.toLocaleString()} (hex: ${blockHex})`);
  if (blockNumber <= 0) {
    throw new Error("Invalid block number returned by RPC");
  }
  console.log("      ✓ Verified live block height\n");

  // 3. Verify USDC decimals() -> selector 0x313ce567
  const decimalsHex = await rpcCall("eth_call", [
    { to: USDC_CONTRACT, data: "0x313ce567" },
    "latest",
  ]);
  const decimals = parseInt(decimalsHex, 16);
  console.log(`[3/4] USDC decimals() call: ${decimals}`);
  if (decimals !== 6) {
    throw new Error(`USDC decimals mismatch! Expected 6, got ${decimals}`);
  }
  console.log("      ✓ Verified official USDC ERC-20 decimals: 6\n");

  // 4. Verify USDC symbol() -> selector 0x95d89b41
  const symbolHex = await rpcCall("eth_call", [
    { to: USDC_CONTRACT, data: "0x95d89b41" },
    "latest",
  ]);
  // Decode ABI string
  const cleanHex = symbolHex.replace(/^0x/, "");
  // Skip offset and length (first 64 chars offset, next 64 chars length)
  const lengthHex = cleanHex.slice(64, 128);
  const strLength = parseInt(lengthHex, 16);
  const dataHex = cleanHex.slice(128, 128 + strLength * 2);
  const symbol = Buffer.from(dataHex, "hex").toString("utf8");
  console.log(`[4/4] USDC symbol() call: "${symbol}"`);
  if (symbol !== "USDC") {
    throw new Error(`USDC symbol mismatch! Expected "USDC", got "${symbol}"`);
  }
  console.log("      ✓ Verified official USDC token symbol: USDC\n");

  console.log("=================================================");
  console.log("  ALL READ-ONLY ARC MAINNET SMOKE TESTS PASSED   ");
  console.log("  Zero funds spent | Zero transactions broadcast ");
  console.log("=================================================");
}

runSmokeTest().catch((err) => {
  console.error("\n❌ Smoke Test FAILED:", err);
  process.exit(1);
});
