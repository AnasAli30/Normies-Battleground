"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const DEMO_WALLETS = [
  { label: "Mint Owner", address: "0x9Eb6E2025B64f340691e424b7fe7022fFDE12438" },
  { label: "Minter", address: "0xC74994dD70FFb621CC514cE18a4F6F52124e296d" },
];

interface WalletScannerProps {
  walletAddress: string;
  walletTokens: number[];
  walletLoading: boolean;
  walletSearched: boolean;
  onAddressChange: (address: string) => void;
  onSearch: () => void;
  onSelectToken: (tokenId: number) => void;
}

export function WalletScanner({
  walletAddress,
  walletTokens,
  walletLoading,
  walletSearched,
  onAddressChange,
  onSearch,
  onSelectToken,
}: WalletScannerProps) {
  const handleDemoSelect = (address: string) => {
    onAddressChange(address);
    setTimeout(() => onSearch(), 50);
  };

  return (
    <div className="wallet-portfolio-search">
      <div className="cyber-input-group">
        <Input
          type="text"
          placeholder="Wallet address"
          mono
          value={walletAddress}
          onChange={(e) => onAddressChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
        <Button variant="tertiary" onClick={onSearch} disabled={walletLoading}>
          {walletLoading ? "..." : "Scan"}
        </Button>
      </div>

      <div className="wallet-samples wallet-samples-desktop">
        <span className="sample-label">Demo:</span>
        {DEMO_WALLETS.map((w) => (
          <button
            key={w.address}
            type="button"
            onClick={() => handleDemoSelect(w.address)}
            className="sample-btn"
          >
            {w.label}
          </button>
        ))}
      </div>

      <select
        className="wallet-demo-select"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) handleDemoSelect(e.target.value);
        }}
        aria-label="Try demo wallet"
      >
        <option value="">Try demo wallet...</option>
        {DEMO_WALLETS.map((w) => (
          <option key={w.address} value={w.address}>
            {w.label}
          </option>
        ))}
      </select>

      {walletSearched && (
        <div className="wallet-results">
          {walletTokens.length > 0 ? (
            <div className="wallet-tokens-row">
              {walletTokens.map((tokenId) => (
                <button
                  key={tokenId}
                  type="button"
                  className="wallet-token-badge"
                  onClick={() => onSelectToken(tokenId)}
                >
                  #{tokenId}
                </button>
              ))}
            </div>
          ) : (
            <div className="wallet-empty">No Normies owned or scan failed.</div>
          )}
        </div>
      )}
    </div>
  );
}
