const fs = require('fs');
const path = require('path');

function patchFile(filePath, checkString, patchContent) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(checkString)) {
      content += '\n' + patchContent + '\n';
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[patch-viem] Patched ${filePath}`);
    }
  }
}

// ESM errors/rpc.js
patchFile(
  path.join(__dirname, 'node_modules/viem/_esm/errors/rpc.js'),
  'UnsupportedNonOptionalCapabilityError',
  `export class AtomicityNotSupportedError extends RpcError {
  constructor(cause, options = {}) {
    super(cause, { name: 'AtomicityNotSupportedError', shortMessage: 'Atomicity not supported.', ...options });
  }
}
export class UnsupportedNonOptionalCapabilityError extends RpcError {
  constructor(cause, options = {}) {
    super(cause, { name: 'UnsupportedNonOptionalCapabilityError', shortMessage: 'Unsupported capability.', ...options });
  }
}`
);

// ESM errors/transaction.js
patchFile(
  path.join(__dirname, 'node_modules/viem/_esm/errors/transaction.js'),
  'TransactionReceiptRevertedError',
  `export class TransactionReceiptRevertedError extends BaseError {
  constructor(cause, options = {}) {
    super('Transaction reverted.', { name: 'TransactionReceiptRevertedError', cause, ...options });
  }
}`
);

// CJS errors/rpc.js
patchFile(
  path.join(__dirname, 'node_modules/viem/_cjs/errors/rpc.js'),
  'UnsupportedNonOptionalCapabilityError',
  `class AtomicityNotSupportedError extends RpcError {
  constructor(cause, options = {}) {
    super(cause, { name: 'AtomicityNotSupportedError', shortMessage: 'Atomicity not supported.', ...options });
  }
}
exports.AtomicityNotSupportedError = AtomicityNotSupportedError;
class UnsupportedNonOptionalCapabilityError extends RpcError {
  constructor(cause, options = {}) {
    super(cause, { name: 'UnsupportedNonOptionalCapabilityError', shortMessage: 'Unsupported capability.', ...options });
  }
}
exports.UnsupportedNonOptionalCapabilityError = UnsupportedNonOptionalCapabilityError;`
);

// CJS errors/transaction.js
patchFile(
  path.join(__dirname, 'node_modules/viem/_cjs/errors/transaction.js'),
  'TransactionReceiptRevertedError',
  `class TransactionReceiptRevertedError extends base_js_1.BaseError {
  constructor(cause, options = {}) {
    super('Transaction reverted.', { name: 'TransactionReceiptRevertedError', cause, ...options });
  }
}
exports.TransactionReceiptRevertedError = TransactionReceiptRevertedError;`
);
