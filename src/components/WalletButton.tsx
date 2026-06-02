'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, ChevronDown } from 'lucide-react';

export default function WalletButton({ compact = false }: { compact?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <div {...(!mounted && { 'aria-hidden': true, style: { opacity:0, pointerEvents:'none', userSelect:'none' } })}>
            {!connected ? (
              <button onClick={openConnectModal} className="btn-primary text-sm px-5 py-2.5">
                <Wallet size={15} />
                {compact ? 'Connect' : 'Connect Wallet'}
              </button>
            ) : chain.unsupported ? (
              <button onClick={openChainModal}
                className="px-4 py-2 rounded-xl bg-sp-danger text-white text-sm font-semibold">
                Wrong Network
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={openChainModal}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/8 bg-white/4 text-sp-muted hover:text-sp-text text-xs transition-all">
                  {chain.hasIcon && chain.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={chain.name} src={chain.iconUrl} className="w-3.5 h-3.5 rounded-full" />
                  )}
                  {chain.name}
                </button>
                <button onClick={openAccountModal}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-sp-green-border bg-sp-green-dim text-xs font-semibold text-sp-green transition-all hover:bg-sp-green/15">
                  {account.displayBalance && <span className="text-sp-green-light hidden sm:inline">{account.displayBalance}</span>}
                  <span>{account.displayName}</span>
                  <ChevronDown size={11} className="opacity-60" />
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
