/**
 * Leaderboard.jsx
 *
 * Reads top scores directly from the on-chain QuizLeaderboard contract
 * via contractGetScore. No localStorage. No mock data.
 *
 * The leaderboard contract exposes get_top(n) which returns the top-N
 * sessions sorted by earned (desc). We call that via a Soroban simulation.
 */

import React, { useEffect, useState } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";

const {
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  rpc,
} = StellarSdk;

// ── Leaderboard contract config ─────────────────────────────
const LEADERBOARD_CONTRACT_ID =
  import.meta.env.VITE_LEADERBOARD_CONTRACT_ID || "";

const SOROBAN_RPC_URL    = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const rpcServer          = new rpc.Server(SOROBAN_RPC_URL);

const TOTAL_QUESTIONS = 10;
const MEDAL           = ["🥇", "🥈", "🥉"];

/**
 * Fetch top-N sessions from the QuizLeaderboard on-chain contract.
 * Calls: get_top(n: u32) -> Vec<SessionRecord>
 */
async function fetchOnChainLeaderboard(n = 10) {
  if (!LEADERBOARD_CONTRACT_ID) {
    throw new Error("VITE_LEADERBOARD_CONTRACT_ID is not set in .env");
  }

  const secret = import.meta.env.VITE_ADMIN_SECRET?.trim();
  if (!secret || !secret.startsWith("S")) {
    throw new Error("VITE_ADMIN_SECRET is not set in .env");
  }

  const keypair  = Keypair.fromSecret(secret);
  const account  = await rpcServer.getAccount(keypair.publicKey());
  const contract = new Contract(LEADERBOARD_CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee:               BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call("get_top", nativeToScVal(n, { type: "u32" }))
    )
    .setTimeout(30)
    .build();

  const simResult = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`get_top simulation failed: ${simResult.error}`);
  }

  const raw = scValToNative(simResult.result.retval);

  // raw is an array of { player, correct, total, earned, timestamp }
  return raw.map((entry, i) => ({
    rank:      i + 1,
    publicKey: entry.player.toString(),
    shortKey:  formatKey(entry.player.toString()),
    score:     Number(entry.correct),
    total:     Number(entry.total),
    earned:    Number(entry.earned) / 10_000_000,
    percent:   Math.round((Number(entry.correct) / TOTAL_QUESTIONS) * 100),
    timestamp: Number(entry.timestamp),
  }));
}

function formatKey(key) {
  if (!key || key.length < 8) return key;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// ── Component ───────────────────────────────────────────────

export default function Leaderboard({ onBack, currentPublicKey }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOnChainLeaderboard(10);
        if (!cancelled) setEntries(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="quiz-container">
      <div className="leaderboard-card">

        {/* Header */}
        <div className="lb-header">
          <button className="lb-back" onClick={onBack}>← Back</button>
          <h2 className="lb-title">🏆 Leaderboard</h2>
          <div className="lb-subtitle">Top 10 on-chain scores · QuizXLM</div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
            <span className="spinner-sm" style={{ marginRight: 8 }} />
            Loading on-chain scores...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            textAlign: "center", padding: "1.5rem",
            background: "rgba(255,107,107,0.08)",
            border: "0.5px solid var(--red)",
            borderRadius: 12, color: "var(--red)", fontSize: "0.85rem",
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Failed to load leaderboard</div>
            <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{error}</div>
            <button
              className="btn-secondary"
              style={{ marginTop: "1rem" }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && entries.length === 0 && (
          <div className="lb-empty">
            <div className="lb-empty-icon">📋</div>
            <div className="lb-empty-text">No on-chain scores yet!</div>
            <div className="lb-empty-sub">Complete a quiz to appear here.</div>
            <button
              className="btn-primary large"
              onClick={onBack}
              style={{ marginTop: "1.5rem" }}
            >
              Start Quiz →
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && entries.length > 0 && (
          <div className="lb-table">
            <div className="lb-table-header">
              <span className="lb-col-rank">Rank</span>
              <span className="lb-col-player">Player</span>
              <span className="lb-col-score">Score</span>
              <span className="lb-col-earned">Earned</span>
              <span className="lb-col-date">Tx Time</span>
            </div>

            {entries.map((entry, i) => (
              <div
                key={`${entry.publicKey}-${entry.timestamp}`}
                className={`lb-row ${entry.publicKey === currentPublicKey ? "lb-row-you" : ""}`}
              >
                <span className="lb-col-rank">
                  {i < 3 ? MEDAL[i] : `#${i + 1}`}
                </span>
                <span className="lb-col-player">
                  <span className="lb-key">{entry.shortKey}</span>
                  {entry.publicKey === currentPublicKey && (
                    <span className="lb-you-badge">You</span>
                  )}
                </span>
                <span className="lb-col-score">
                  <span className="lb-score-num">
                    {entry.score}/{TOTAL_QUESTIONS}
                  </span>
                  <span className="lb-score-pct">{entry.percent}%</span>
                </span>
                <span className="lb-col-earned gold">
                  {entry.earned.toFixed(1)} XLM
                </span>
                <span className="lb-col-date muted">
                  {entry.timestamp
                    ? new Date(entry.timestamp * 1000).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}