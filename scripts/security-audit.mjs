import fs from 'fs';
import path from 'path';

async function runSecurityAudit() {
  console.log('=== PAYPROOF PRODUCTION SECURITY AUDIT ===\n');

  // 1. Audit Production HTML for External Scripts / Injections
  console.log('--- 1. AUDITING PRODUCTION HTML & SCRIPTS ---');
  const routes = ['/', '/create'];
  for (const route of routes) {
    const url = `https://payproof-puce.vercel.app${route}`;
    const res = await fetch(url);
    const html = await res.text();
    console.log(`Route [${route}] Status: ${res.status}`);

    const scriptMatches = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)];
    console.log(`Found ${scriptMatches.length} external <script src> tags on ${route}:`);
    for (const match of scriptMatches) {
      const src = match[1];
      const isInternal = src.startsWith('/_next/');
      console.log(`  - [${isInternal ? 'INTERNAL' : 'EXTERNAL'}] ${src}`);
      if (!isInternal) {
        console.error(`  !!! ALERT: Suspicious external script found: ${src}`);
      }
    }

    // Check for inline scripts with eval or obfuscation
    const inlineScripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
    console.log(`Found ${inlineScripts.length} inline <script> tags on ${route}`);
    for (const [idx, match] of inlineScripts.entries()) {
      const content = match[1];
      if (/eval\(|document\.write\(|fromCharCode|unescape/i.test(content)) {
        console.error(`  !!! ALERT: Suspicious inline script patterns at index ${idx}`);
      }
    }

    // Check for iframes
    const iframes = [...html.matchAll(/<iframe\b[^>]*src=["']([^"']+)["'][^>]*>/gi)];
    if (iframes.length > 0) {
      console.error(`  !!! ALERT: Found ${iframes.length} iframes on ${route}`);
    } else {
      console.log(`  ✓ 0 iframes detected on ${route}`);
    }
  }

  // 2. Audit Token Approval & Transfer Parameters in Frontend Code
  console.log('\n--- 2. AUDITING APPROVAL & SIGNING PATHS IN SOURCE CODE ---');
  
  // Inspect transfer.ts
  const transferCode = fs.readFileSync('frontend/lib/payments/transfer.ts', 'utf8');
  console.log('Auditing frontend/lib/payments/transfer.ts:');
  
  const hasMaxUint = transferCode.includes('MaxUint256') || transferCode.includes('2n ** 256n - 1n') || transferCode.includes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  console.log(`  - Unlimited approval (MaxUint256): ${hasMaxUint ? 'DETECTED' : 'NONE (Safe: Exact amount only)'}`);

  const approvalMatches = [...transferCode.matchAll(/approve[A-Za-z0-9_]*\s*\(/g)];
  console.log(`  - Approval call patterns found: ${approvalMatches.length}`);

  // Inspect useUSDCPayment.ts
  const hookCode = fs.readFileSync('frontend/lib/payments/useUSDCPayment.ts', 'utf8');
  console.log('\nAuditing frontend/lib/payments/useUSDCPayment.ts:');
  const hookHasMaxUint = hookCode.includes('MaxUint256') || hookCode.includes('2n ** 256n - 1n');
  console.log(`  - Unlimited approval in hook: ${hookHasMaxUint ? 'DETECTED' : 'NONE (Safe: Exact amount only)'}`);

  // Check for any eth_sign, personal_sign, signTypedData in entire frontend/
  console.log('\n--- 3. SCANNING FOR UNEXPECTED SIGNATURE METHODS IN FRONTEND ---');
  const scanDir = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      const full = path.join(dir, f.name);
      if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.next') {
        scanDir(full);
      } else if (f.isFile() && (f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.js'))) {
        const c = fs.readFileSync(full, 'utf8');
        if (/eth_sign|personal_sign|signTypedData/i.test(c)) {
          console.log(`  - Signature method referenced in: ${full}`);
        }
      }
    }
  };
  scanDir('frontend/lib');
  scanDir('frontend/components');

  console.log('\n=== AUDIT COMPLETED ===');
}

runSecurityAudit().catch(console.error);
