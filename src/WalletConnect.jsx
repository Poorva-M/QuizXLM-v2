import React, { useState, useEffect } from "react";
import {
  requestAccess,
  getAddress,
  isConnected,
} from "@stellar/freighter-api";

export default function WalletConnect({ onConnect }) {
  const [walletState, setWalletState] = useState({
    connected: false,
    publicKey: null,
    balance: null,
    loading: false,
    error: null,
  });

  const shortKey = (key) =>
    key ? `${key.slice(0, 4)}...${key.slice(-4)}` : "";

  const fetchBalance = async (publicKey) => {
    try {
      const res = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${publicKey}`
      );
      const data = await res.json();
      const xlm = data.balances?.find((b) => b.asset_type === "native");
      return xlm ? parseFloat(xlm.balance).toFixed(2) : "0.00";
    } catch {
      return "0.00";
    }
  };

  // ✅ Auto reconnect on reload
  useEffect(() => {
    const autoConnect = async () => {
      try {
        const connected = await isConnected();

        if (connected) {
          const { address } = await getAddress();
          const balance = await fetchBalance(address);

          setWalletState({
            connected: true,
            publicKey: address,
            balance,
            loading: false,
            error: null,
          });

          onConnect && onConnect(address);
        }
      } catch {
        // silently ignore
      }
    };

    autoConnect();
  }, []);

  // ✅ Connect wallet
  const handleConnect = async () => {
    setWalletState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { address, error } = await requestAccess();

      if (error || !address) {
        setWalletState((prev) => ({
          ...prev,
          loading: false,
          error: "Connection rejected. Approve access in Freighter.",
        }));
        return;
      }

      const balance = await fetchBalance(address);

      setWalletState({
        connected: true,
        publicKey: address,
        balance,
        loading: false,
        error: null,
      });

      onConnect && onConnect(address);
    } catch (err) {
      setWalletState((prev) => ({
        ...prev,
        loading: false,
        error:
          "Freighter not found or locked. Please install/unlock the wallet.",
      }));
    }
  };

  // ✅ Disconnect (UI only)
  const handleDisconnect = () => {
    setWalletState({
      connected: false,
      publicKey: null,
      balance: null,
      loading: false,
      error: null,
    });

    onConnect && onConnect(null);
  };

  // 🔌 UI (Not Connected)
  if (!walletState.connected) {
    return (
      <div className="wallet-wrapper">
        <button
          className="btn-primary"
          onClick={handleConnect}
          disabled={walletState.loading}
        >
          {walletState.loading ? (
            <span className="btn-loading">
              <span className="spinner"></span> Connecting...
            </span>
          ) : (
            "Connect Wallet"
          )}
        </button>

        {walletState.error && (
          <div className="wallet-error">{walletState.error}</div>
        )}
      </div>
    );
  }

  // 🔗 UI (Connected)
  return (
    <div className="wallet-connected">
      <div className="wallet-info">
        <span className="wallet-dot"></span>
        <span className="wallet-key">
          {shortKey(walletState.publicKey)}
        </span>
        <span className="wallet-divider">|</span>
        <span className="wallet-balance">
          {walletState.balance} XLM
        </span>
      </div>

      <button className="btn-disconnect" onClick={handleDisconnect}>
        Disconnect
      </button>
    </div>
  );
}