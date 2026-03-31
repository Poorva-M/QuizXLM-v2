//leaderboard.jsx
import React, { useEffect, useState } from "react";

const TOTAL_QUESTIONS = 8;

// Save a new score entry to localStorage
export const saveScore = (publicKey, score, earned) => {
  if (!publicKey || score === 0) return;

  const entries = getLeaderboard();
  const shortKey = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
  const newEntry = {
    publicKey,
    shortKey,
    score,
    earned,
    percent: Math.round((score / TOTAL_QUESTIONS) * 100),
    date: new Date().toLocaleDateString(),
    timestamp: Date.now(),
  };

  // Add new entry and sort by score desc, then by earned desc
  const updated = [...entries, newEntry]
    .sort((a, b) => b.score - a.score || b.earned - a.earned)
    .slice(0, 10); // keep top 10

  localStorage.setItem("quizxlm_leaderboard", JSON.stringify(updated));
};

// Get leaderboard from localStorage
export const getLeaderboard = () => {
  try {
    return JSON.parse(localStorage.getItem("quizxlm_leaderboard")) || [];
  } catch {
    return [];
  }
};

const MEDAL = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ onBack, currentPublicKey }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(getLeaderboard());
  }, []);

  return (
    <div className="quiz-container">
      <div className="leaderboard-card">

        {/* Header */}
        <div className="lb-header">
          <button className="lb-back" onClick={onBack}>← Back</button>
          <h2 className="lb-title">🏆 Leaderboard</h2>
          <div className="lb-subtitle">Top 10 scores on QuizXLM</div>
        </div>

        {/* Empty state */}
        {entries.length === 0 ? (
          <div className="lb-empty">
            <div className="lb-empty-icon">📋</div>
            <div className="lb-empty-text">No scores yet!</div>
            <div className="lb-empty-sub">Complete a quiz to appear here.</div>
            <button className="btn-primary large" onClick={onBack} style={{ marginTop: "1.5rem" }}>
              Start Quiz →
            </button>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="lb-table">
              <div className="lb-table-header">
                <span className="lb-col-rank">Rank</span>
                <span className="lb-col-player">Player</span>
                <span className="lb-col-score">Score</span>
                <span className="lb-col-earned">Earned</span>
                <span className="lb-col-date">Date</span>
              </div>

              {entries.map((entry, i) => (
                <div
                  className={`lb-row ${entry.publicKey === currentPublicKey ? "lb-row-you" : ""} ${i < 3 ? "lb-row-top" : ""}`}
                  key={entry.timestamp}
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
                    <span className="lb-score-num">{entry.score}/{TOTAL_QUESTIONS}</span>
                    <span className="lb-score-pct">{entry.percent}%</span>
                  </span>
                  <span className="lb-col-earned gold">{entry.earned} XLM</span>
                  <span className="lb-col-date muted">{entry.date}</span>
                </div>
              ))}
            </div>

            {/* Clear button */}
            <button
              className="lb-clear"
              onClick={() => {
                localStorage.removeItem("quizxlm_leaderboard");
                setEntries([]);
              }}
            >
              Clear leaderboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}