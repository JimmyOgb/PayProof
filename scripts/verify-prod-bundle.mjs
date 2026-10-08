
async function verifyBundle() {
  const res = await fetch('https://payproof-puce.vercel.app/create');
  const html = await res.text();
  const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+)"/g;
  let match;
  const scripts = [];
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  console.log(`Found ${scripts.length} script chunks on /create.`);
  
  let contractFound = false;
  let chainIdFound = false;
  let usdcFound = false;
  
  for (const scriptUrl of scripts) {
    const sRes = await fetch(`https://payproof-puce.vercel.app${scriptUrl}`);
    const code = await sRes.text();
    if (code.toLowerCase().includes('0x87d4a1669336882e3355b83f953ad3b8b944c908')) {
      console.log(`✓ Found contract address in: ${scriptUrl}`);
      contractFound = true;
    }
    if (code.includes('5042')) {
      chainIdFound = true;
    }
    if (code.includes('0x3600000000000000000000000000000000000000')) {
      usdcFound = true;
    }
  }

  console.log({ contractFound, chainIdFound, usdcFound });
}

verifyBundle().catch(console.error);
