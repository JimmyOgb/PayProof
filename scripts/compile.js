const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.resolve(__dirname, '../contracts/PayProofPayments.sol');
const mockUsdcPath = path.resolve(__dirname, '../contracts/MockUSDC.sol');
const testSuitePath = path.resolve(__dirname, '../contracts/PayProofContractTestSuite.sol');
const source = fs.readFileSync(contractPath, 'utf8');
const mockUsdcSource = fs.readFileSync(mockUsdcPath, 'utf8');
const testSuiteSource = fs.readFileSync(testSuitePath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'PayProofPayments.sol': {
      content: source,
    },
    'MockUSDC.sol': {
      content: mockUsdcSource,
    },
    'PayProofContractTestSuite.sol': {
      content: testSuiteSource,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasErrors = false;
  output.errors.forEach((err) => {
    console.error(err.formattedMessage);
    if (err.severity === 'error') hasErrors = true;
  });
  if (hasErrors) {
    process.exit(1);
  }
}

const contract = output.contracts['PayProofPayments.sol']['PayProofPayments'];
const artifact = {
  contractName: 'PayProofPayments',
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object,
  deployedBytecode: '0x' + contract.evm.deployedBytecode.object,
};

const mockContract = output.contracts['MockUSDC.sol']['MockUSDC'];
const mockArtifact = {
  contractName: 'MockUSDC',
  abi: mockContract.abi,
  bytecode: '0x' + mockContract.evm.bytecode.object,
  deployedBytecode: '0x' + mockContract.evm.deployedBytecode.object,
};

const testSuiteContract = output.contracts['PayProofContractTestSuite.sol']['PayProofContractTestSuite'];
const testSuiteArtifact = {
  contractName: 'PayProofContractTestSuite',
  abi: testSuiteContract.abi,
  bytecode: '0x' + testSuiteContract.evm.bytecode.object,
  deployedBytecode: '0x' + testSuiteContract.evm.deployedBytecode.object,
};

const artifactsDir = path.resolve(__dirname, '../contracts/artifacts');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(artifactsDir, 'PayProofPayments.json'),
  JSON.stringify(artifact, null, 2)
);
fs.writeFileSync(
  path.join(artifactsDir, 'MockUSDC.json'),
  JSON.stringify(mockArtifact, null, 2)
);
fs.writeFileSync(
  path.join(artifactsDir, 'PayProofContractTestSuite.json'),
  JSON.stringify(testSuiteArtifact, null, 2)
);

// Also save ABI and bytecode to frontend/lib/contracts
const frontendContractsDir = path.resolve(__dirname, '../frontend/lib/contracts');
if (!fs.existsSync(frontendContractsDir)) {
  fs.mkdirSync(frontendContractsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(frontendContractsDir, 'PayProofPayments.json'),
  JSON.stringify(artifact, null, 2)
);
fs.writeFileSync(
  path.join(frontendContractsDir, 'MockUSDC.json'),
  JSON.stringify(mockArtifact, null, 2)
);

console.log('Contract compiled successfully!');
console.log('PayProofPayments Bytecode size:', artifact.bytecode.length / 2 - 1, 'bytes');
console.log('MockUSDC Bytecode size:', mockArtifact.bytecode.length / 2 - 1, 'bytes');
console.log('Artifacts written to contracts/artifacts and frontend/lib/contracts');
