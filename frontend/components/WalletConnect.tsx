"use client";

import React, { useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { arcMainnet } from "@/lib/arc/chain";
import { useIsMounted } from "@/lib/wallet";
import { Wallet, LogOut, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";

export function WalletConnect() {
  const isMounted = useIsMounted();
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Render a deterministic initial button on server and before client hydration
  if (!isMounted) {
    return (
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm transition-all shadow-sm opacity-90 cursor-default"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
      </div>
    );
  }

  const isWrongNetwork = isConnected && chainId !== arcMainnet.id;

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnecting || isConnectPending) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 font-medium text-sm cursor-not-allowed border border-zinc-700 shadow-sm"
      >
        <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
        Connecting...
      </button>
    );
  }

  if (isConnected && address) {
    if (isWrongNetwork) {
      return (
        <button
          onClick={() => switchChain({ chainId: arcMainnet.id })}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-sm font-medium transition-colors"
        >
          <AlertCircle className="w-4 h-4 text-amber-400" />
          Switch to Arc Mainnet
        </button>
      );
    }

    return (
      <div className="relative inline-block text-left">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700/80 hover:border-zinc-600 text-zinc-200 text-sm font-medium transition-all shadow-sm"
        >
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
            <CheckCircle2 className="w-3 h-3" />
            Arc
          </span>
          <span className="font-mono text-zinc-300">{truncateAddress(address)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl py-1 z-50">
            <div className="px-3 py-2 border-b border-zinc-800">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Connected Wallet</p>
              <p className="text-xs font-mono text-zinc-300 truncate mt-0.5">{address}</p>
            </div>
            <button
              onClick={() => {
                disconnect();
                setDropdownOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-zinc-800/60 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  const primaryConnector = connectors[0];

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          if (primaryConnector) {
            connect({ connector: primaryConnector });
          }
        }}
        disabled={!primaryConnector}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow-emerald-900/20"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    </div>
  );
}
