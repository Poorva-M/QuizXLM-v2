/**
 * Leaderboard.jsx
 *
 * Reads leaderboard data from the on-chain QuizLeaderboard contract
 * via contractGetScore(). No localStorage is used.
 *
 * After each quiz, Quiz.jsx calls send_reward() which triggers the
 * inter-contract call to QuizLeaderboard::record_session() on-chain.
 * This component fetches those on-chain records.
 */

import React, { useEffect, useState, useCallback } from "react";
import { contractGetScore, CONTRACT_ID } from "./contracts/contractClient";

const TOTAL_QUESTIONS = 10;
const MEDAL = ["🥇", "🥈", "🥉"];

/**
 * Fetch a player's on-chain score from the Soroban contract.
 * Returns null if the player has no record yet.
 */
const fetchOnChainScore = async (publicKey) => {
  try {
    const score = await contractGetScore(publicKey);
    // If the player has never played, the contract returns { correct:0, total:0, earned:0 }
    if (score.total === 0) return null;
    return {
      publicKey,
      shortKey: `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`,
      correct:  score.correct,
      total:    score.total,
      earned:   score.earned,
      percent:  Math.round((score.correct / TOTAL_QUESTIONS) * 100),
    };
  } catch (err) {
    console.error("fetchOnChainScore error for", publicKey, err);
    return null;
  }
};

export default function Leaderboard({ onBack, currentPublicKey, knownPlayers = [] }) {
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  /**
   * Load on-chain scores for all known players.
   * `knownPlayers` should be an array of public keys passed in from App.jsx
   * (e.g. collected during the session or from a discovery mechanism).
   * The current player is always included.
   */
  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Always include the current player; deduplicate
      const allKeys = Array.from(
        new Set([
          ...(currentPublicKey ? [currentPublicKey] : []),
          ...knownPlayers,
        ])
      );

      if (allKeys.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const results = await Promise.all(allKeys.map(fetchOnChainScore));

      const valid = results
        .filter(Boolean)
        .sort((a, b) => b.correct - a.correct || b.earned - a.earned)
        .slice(0, 10);

      setEntries(valid);
    } catch (err) {
      console.error("loadLeaderboard error:", err);
      setError("Failed to load on-chain leaderboard: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPublicKey, knownPlayers]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <div className="quiz-container">
      <div className="leaderboard-card">

        {/* Header */}
        <div className="lb-header">
          <button className="lb-back" onClick={onBack}>← Back</button>
          <h2 className="lb-title">🏆 Leaderboard</h2>
          <div className="lb-subtitle">
            On-chain scores ·{" "}
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--gold)", textDecoration: "underline", fontSize: "0.75rem" }}
            >
              {CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-8)} ↗
            </a>
          </div>
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
            background: "rgba(255,107,107,0.1)",
            border: "0.5px solid var(--red)",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            color: "var(--red)",
            fontSize: "0.82rem",
            marginBottom: "1rem",
          }}>
            ⚠ {error}
            <button
              onClick={loadLeaderboard}
              style={{
                marginLeft: 12,
                background: "none",
                border: "none",
                color: "var(--gold)",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "0.82rem",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && entries.length === 0 && (
          <div className="lb-empty">
            <div className="lb-empty-icon">📋</div>
            <div className="lb-empty-text">No on-chain scores yet!</div>
            <div className="lb-empty-sub">
              Complete a quiz to record your score on-chain.
            </div>
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
          <>
            <div className="lb-table">
              <div className="lb-table-header">
                <span className="lb-col-rank">Rank</span>
                <span className="lb-col-player">Player</span>
                <span className="lb-col-score">Score</span>
                <span className="lb-col-earned">Earned</span>
              </div>

              {entries.map((entry, i) => (
                <div
                  className={`lb-row ${entry.publicKey === currentPublicKey ? "lb-row-you" : ""} ${i < 3 ? "lb-row-top" : ""}`}
                  key={entry.publicKey}
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
                    <span className="lb-score-num">{entry.correct}/{TOTAL_QUESTIONS}</span>
                    <span className="lb-score-pct">{entry.percent}%</span>
                  </span>
                  <span className="lb-col-earned gold">{entry.earned.toFixed(1)} XLM</span>
                </div>
              ))}
            </div>

            <button
              className="lb-clear"
              onClick={loadLeaderboard}
              style={{ marginTop: "1rem" }}
            >
              ↻ Refresh
            </button>
          </>
        )}
      </div>
    </div>
  );
}