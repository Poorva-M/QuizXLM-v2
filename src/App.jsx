// App.jsx
//
// - Removed saveScore / localStorage leaderboard calls.
// - Tracks publicKeys of players who complete a quiz this session
//   so the Leaderboard can query their on-chain scores.
// - All score persistence is handled by the Soroban contract.

import React, { useState } from "react";
import "./App.css";
import WalletConnect from "./WalletConnect";
import Quiz from "./Quiz";
import Leaderboard from "./Leaderboard";

export default function App() {
  const [publicKey,    setPublicKey]    = useState(null);
  const [page,         setPage]         = useState("home");
  // Collect public keys of players who finished a quiz this session
  // so the Leaderboard component can fetch their on-chain scores.
  const [knownPlayers, setKnownPlayers] = useState([]);

  const handleWalletConnect = (key) => {
    setPublicKey(key);
    if (!key) setPage("home");
  };

  const handleFinish = () => {
    // Record this player as someone whose on-chain score can be queried.
    // No localStorage writes — score is already on-chain via send_reward().
    if (publicKey) {
      setKnownPlayers((prev) =>
        prev.includes(publicKey) ? prev : [...prev, publicKey]
      );
    }
    setPage("home");
  };

  return (
    <div className="app">

      {/* NAV */}
      <nav className="nav">
        <div
          className="logo"
          onClick={() => setPage("home")}
          style={{ cursor: "pointer" }}
        >
          <div className="logo-icon">⭐</div>
          <span className="logo-text">
            Quiz<span className="gold">XLM</span>
          </span>
        </div>
        <WalletConnect onConnect={handleWalletConnect} />
      </nav>

      {/* LEADERBOARD PAGE */}
      {page === "leaderboard" && (
        <Leaderboard
          onBack={() => setPage("home")}
          currentPublicKey={publicKey}
          knownPlayers={knownPlayers}
        />
      )}

      {/* QUIZ PAGE */}
      {page === "quiz" && (
        <Quiz publicKey={publicKey} onFinish={handleFinish} />
      )}

      {/* HOME PAGE */}
      {page === "home" && (
        <main className="main">

          {/* HERO */}
          <div className="hero">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              Built on Stellar Network
            </div>
            <h1>
              Answer Smart.<br />
              <span className="gold">Earn</span>{" "}
              <span className="outline">XLM.</span>
            </h1>
            <p className="hero-sub">
              A decentralized quiz platform where every correct answer puts real
              Stellar Lumens in your wallet. Knowledge has never paid this well.
            </p>
            <div className="hero-actions">
              {publicKey ? (
                <button
                  className="btn-primary large"
                  onClick={() => setPage("quiz")}
                >
                  Start Quiz →
                </button>
              ) : (
                <button
                  className="btn-primary large"
                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                  disabled
                >
                  Connect Wallet to Start
                </button>
              )}
              <button
                className="btn-secondary large"
                onClick={() => setPage("leaderboard")}
              >
                View Leaderboard
              </button>
            </div>
            {publicKey && (
              <div className="wallet-ready">
                ✓ Wallet connected — you&apos;re ready to earn XLM!
              </div>
            )}
          </div>

          {/* STATS */}
          <div className="stats">
            {[
              { num: "0.5",     label: "XLM per correct answer" },
              { num: "10",      label: "Quiz questions" },
              { num: "100%",    label: "On-chain rewards" },
              { num: "Instant", label: "Payout speed" },
            ].map((s) => (
              <div className="stat" key={s.label}>
                <div className="stat-num">{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* HOW IT WORKS */}
          <div className="how-section">
            <div className="section-label">How it works</div>
            <div className="steps">
              {[
                { n: "1", title: "Connect Wallet",   desc: "Link your Freighter wallet on Stellar testnet." },
                { n: "2", title: "Answer Questions", desc: "Pick a category and answer multiple-choice questions." },
                { n: "3", title: "Collect XLM",      desc: "send_reward() on the Soroban contract transfers XLM to your wallet instantly." },
              ].map((s) => (
                <div
                  className={`step ${s.n === "1" && publicKey ? "step-done" : ""}`}
                  key={s.n}
                >
                  <div className="step-num">
                    {s.n === "1" && publicKey ? "✓" : s.n}
                  </div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </main>
      )}

      {/* FOOTER */}
      <footer className="footer">
        © 2026 QuizXLM · Built on Stellar
      </footer>

    </div>
  );
}