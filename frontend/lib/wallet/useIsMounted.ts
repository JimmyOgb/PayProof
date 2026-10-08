'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to safely detect when a component has mounted on the client.
 *
 * During SSR and the initial client hydration pass, this returns `false`.
 * Once the component is mounted in the browser DOM, it transitions to `true`.
 *
 * Use this to ensure wallet state, browser APIs, or locale-dependent formatting
 * are rendered deterministically without causing Next.js hydration mismatches.
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
