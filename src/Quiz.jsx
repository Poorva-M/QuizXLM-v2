// // Quiz.jsx
// import React, { useState, useEffect, useRef } from "react";
// import { sendReward } from "./rewardService";
// import { CONTRACT_ID } from "./contracts/contractClient";

// const QUESTIONS = [
//   {
//     id: 1,
//     category: "Blockchain",
//     question: "What is the native currency of the Stellar network?",
//     options: ["ETH", "XLM", "BTC", "SOL"],
//     answer: "XLM",
//   },
//   {
//     id: 2,
//     category: "Blockchain",
//     question: "What does 'dApp' stand for?",
//     options: ["Distributed Application", "Decentralized Application", "Digital Application", "Dynamic Application"],
//     answer: "Decentralized Application",
//   },
//   {
//     id: 3,
//     category: "Stellar",
//     question: "What is the consensus mechanism used by Stellar?",
//     options: ["Proof of Work", "Proof of Stake", "Stellar Consensus Protocol", "Delegated PoS"],
//     answer: "Stellar Consensus Protocol",
//   },
//   {
//     id: 4,
//     category: "Stellar",
//     question: "What is Soroban on the Stellar network?",
//     options: ["A wallet app", "A smart contract platform", "A DEX exchange", "A stablecoin"],
//     answer: "A smart contract platform",
//   },
//   {
//     id: 5,
//     category: "Crypto",
//     question: "What does 'HODL' mean in crypto slang?",
//     options: ["Hold On for Dear Life", "High Order Digital Ledger", "Holding On Despite Loss", "None of the above"],
//     answer: "Hold On for Dear Life",
//   },
//   {
//     id: 6,
//     category: "Crypto",
//     question: "What is a smart contract?",
//     options: ["A legal document on paper", "Self-executing code on a blockchain", "An agreement between two banks", "A type of cryptocurrency"],
//     answer: "Self-executing code on a blockchain",
//   },
//   {
//     id: 7,
//     category: "Blockchain",
//     question: "What is the Stellar testnet used for?",
//     options: ["Real transactions with real XLM", "Testing applications without real money", "Mining new XLM tokens", "Storing NFTs"],
//     answer: "Testing applications without real money",
//   },
//   {
//     id: 8,
//     category: "Crypto",
//     question: "What does 'gas fee' refer to in blockchain?",
//     options: ["Cost of electricity for mining", "Fee paid to process a transaction", "Tax on crypto profits", "Subscription fee for wallets"],
//     answer: "Fee paid to process a transaction",
//   },
//   {
//     id: 9,
//     category: "Stellar",
//     question: "What is the name of Stellar's smart contract engine?",
//     options: ["EVM", "Soroban", "CosmWasm", "Anchor"],
//     answer: "Soroban",
//   },
//   {
//     id: 10,
//     category: "Stellar",
//     question: "What is the consensus mechanism used by Stellar?",
//     options: ["Proof of Work", "Proof of Stake", "Stellar Consensus Protocol", "Delegated PoS"],
//     answer: "Stellar Consensus Protocol",
//   },
// ];

// const REWARD_PER_CORRECT = 0.5;
// const TIME_PER_QUESTION  = 10;
// const MAX_LIFELINES      = 2; // 50-50 lifelines per quiz

// export default function Quiz({ publicKey, onFinish }) {
//   const [phase, setPhase]               = useState("start");
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [selected, setSelected]         = useState(null);
//   const [answered, setAnswered]         = useState(false);
//   const [score, setScore]               = useState(0);
//   const [earned, setEarned]             = useState(0);
//   const [streak, setStreak]             = useState(0);
//   const [maxStreak, setMaxStreak]       = useState(0);
//   const [timeLeft, setTimeLeft]         = useState(TIME_PER_QUESTION);
//   const [results, setResults]           = useState([]); // { correct, timedOut, question, options, answer, selected }
//   const [txStatus, setTxStatus]         = useState(null);
//   const [txData, setTxData]             = useState(null);

//   // ── Lifeline state ──
//   const [lifelinesLeft, setLifelinesLeft]   = useState(MAX_LIFELINES);
//   const [eliminatedOpts, setEliminatedOpts] = useState([]); // options hidden by 50-50

//   // ── Review state ──
//   const [reviewIndex, setReviewIndex] = useState(0); // which question we're reviewing

//   const timerRef   = useRef(null);
//   const scoreRef   = useRef(0);
//   const streakRef  = useRef(0);
//   const maxStkRef  = useRef(0);

//   const currentQ = QUESTIONS[currentIndex];

//   useEffect(() => { scoreRef.current  = score;     }, [score]);
//   useEffect(() => { streakRef.current = streak;    }, [streak]);
//   useEffect(() => { maxStkRef.current = maxStreak; }, [maxStreak]);

//   useEffect(() => {
//     if (phase !== "playing" || answered) return;
//     timerRef.current = setInterval(() => {
//       setTimeLeft((prev) => {
//         if (prev <= 1) {
//           clearInterval(timerRef.current);
//           handleTimeout();
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//     return () => clearInterval(timerRef.current);
//   }, [phase, currentIndex, answered]);

//   useEffect(() => {
//     if (phase === "result") {
//       processReward(scoreRef.current, maxStkRef.current);
//     }
//   }, [phase]);

//   // ── Call the Soroban smart contract to send reward ──
//   const processReward = async (finalScore, finalMaxStreak) => {
//     if (finalScore === 0) { setTxStatus("none"); return; }
//     setTxStatus("loading");
//     // Pass totalQuestions so the contract can record it in the leaderboard session
//     const result = await sendReward(publicKey, finalScore, QUESTIONS.length, finalMaxStreak);
//     setTxData(result);
//     setTxStatus(result.success ? "success" : "failed");
//   };

//   const handleTimeout = () => {
//     setAnswered(true);
//     setSelected(null);
//     setStreak(0);
//     streakRef.current = 0;
//     setResults((prev) => [
//       ...prev,
//       {
//         correct: false,
//         timedOut: true,
//         question: currentQ.question,
//         options: currentQ.options,
//         answer: currentQ.answer,
//         selected: null,
//         category: currentQ.category,
//       },
//     ]);
//     setTimeout(() => nextQuestion(), 1500);
//   };

//   const handleSelect = (option) => {
//     if (answered) return;
//     clearInterval(timerRef.current);
//     setSelected(option);
//     setAnswered(true);

//     const isCorrect = option === currentQ.answer;

//     if (isCorrect) {
//       const newScore  = scoreRef.current + 1;
//       const newStreak = streakRef.current + 1;
//       const newMax    = Math.max(maxStkRef.current, newStreak);

//       setScore(newScore);
//       setEarned((prev) => prev + REWARD_PER_CORRECT);
//       setStreak(newStreak);
//       setMaxStreak(newMax);

//       scoreRef.current  = newScore;
//       streakRef.current = newStreak;
//       maxStkRef.current = newMax;
//     } else {
//       setStreak(0);
//       streakRef.current = 0;
//     }

//     // Store full question details for review screen
//     setResults((prev) => [
//       ...prev,
//       {
//         correct: isCorrect,
//         timedOut: false,
//         question: currentQ.question,
//         options: currentQ.options,
//         answer: currentQ.answer,
//         selected: option,
//         category: currentQ.category,
//       },
//     ]);
//     setTimeout(() => nextQuestion(), 1500);
//   };

//   // ── 50-50 Lifeline ──
//   const handleLifeline = () => {
//     if (lifelinesLeft <= 0 || answered || eliminatedOpts.length > 0) return;

//     // Pick 2 wrong options randomly to eliminate
//     const wrongOpts = currentQ.options.filter((o) => o !== currentQ.answer);
//     const shuffled  = wrongOpts.sort(() => Math.random() - 0.5);
//     const toElim    = shuffled.slice(0, 2);

//     setEliminatedOpts(toElim);
//     setLifelinesLeft((prev) => prev - 1);
//   };

//   const nextQuestion = () => {
//     setEliminatedOpts([]); // clear lifeline eliminations for next question
//     if (currentIndex + 1 >= QUESTIONS.length) {
//       setPhase("result");
//     } else {
//       setCurrentIndex((prev) => prev + 1);
//       setSelected(null);
//       setAnswered(false);
//       setTimeLeft(TIME_PER_QUESTION);
//     }
//   };

//   const handleStart = () => {
//     setPhase("playing");
//     setCurrentIndex(0);
//     setSelected(null);
//     setAnswered(false);
//     setScore(0);
//     setEarned(0);
//     setStreak(0);
//     setMaxStreak(0);
//     scoreRef.current  = 0;
//     streakRef.current = 0;
//     maxStkRef.current = 0;
//     setResults([]);
//     setTimeLeft(TIME_PER_QUESTION);
//     setTxStatus(null);
//     setTxData(null);
//     setLifelinesLeft(MAX_LIFELINES);
//     setEliminatedOpts([]);
//     setReviewIndex(0);
//   };

//   const getOptionClass = (option) => {
//     if (eliminatedOpts.includes(option)) return "option dimmed";
//     if (!answered) return "option";
//     if (option === currentQ.answer) return "option correct";
//     if (option === selected && option !== currentQ.answer) return "option wrong";
//     return "option dimmed";
//   };

//   const timerPercent = (timeLeft / TIME_PER_QUESTION) * 100;
//   const timerColor   = timeLeft > 8 ? "#E4A853" : timeLeft > 4 ? "#ff9f43" : "#ff6b6b";

//   // ─────────────────────────────────────────────
//   // ── START ──
//   // ─────────────────────────────────────────────
//   if (phase === "start") {
//     return (
//       <div className="quiz-container">
//         <div className="quiz-start-card">
//           <div className="quiz-start-icon">🧠</div>
//           <h2 className="quiz-start-title">Ready to earn XLM?</h2>
//           <p className="quiz-start-sub">
//             {QUESTIONS.length} questions · {TIME_PER_QUESTION}s each · {REWARD_PER_CORRECT} XLM per correct answer
//           </p>
//           <div className="quiz-start-reward">
//             <span className="reward-label">Max reward</span>
//             <span className="reward-amount">{QUESTIONS.length * REWARD_PER_CORRECT} XLM</span>
//           </div>

//           {/* Lifeline hint */}
//           <div style={{
//             fontSize: "0.78rem",
//             color: "var(--muted)",
//             background: "var(--surface3)",
//             borderRadius: "8px",
//             padding: "0.5rem 0.75rem",
//             marginBottom: "0.75rem",
//             textAlign: "center",
//           }}>
//             💡 You have <span style={{ color: "var(--gold)", fontWeight: 700 }}>{MAX_LIFELINES} × 50-50 lifelines</span> — eliminates 2 wrong options!
//           </div>

//           {/* Contract ID */}
//           <div style={{
//             fontSize: "0.7rem",
//             color: "var(--muted)",
//             background: "var(--surface3)",
//             borderRadius: "8px",
//             padding: "0.5rem 0.75rem",
//             marginBottom: "1rem",
//             textAlign: "left",
//             wordBreak: "break-all",
//           }}>
//             <span style={{ color: "var(--gold)", fontWeight: 700 }}>Contract: </span>
//             <a
//               href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
//               target="_blank"
//               rel="noreferrer"
//               style={{ color: "var(--muted)", textDecoration: "underline" }}
//             >
//               {CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-8)}
//             </a>
//           </div>

//           <button className="btn-primary large" onClick={handleStart}>
//             Start Quiz →
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────
//   // ── REVIEW SCREEN ──
//   // ─────────────────────────────────────────────
//   if (phase === "review") {
//     const r = results[reviewIndex];
//     const isLast = reviewIndex === results.length - 1;

//     return (
//       <div className="quiz-container">
//         <div className="quiz-card" style={{ maxWidth: 600 }}>

//           {/* Header */}
//           <div className="quiz-header" style={{ marginBottom: "1rem" }}>
//             <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
//               <span className="quiz-progress-text">
//                 Review · {reviewIndex + 1} / {results.length}
//               </span>
//               <span style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
//                 {r.category}
//               </span>
//             </div>
//             {/* Mini progress dots */}
//             <div style={{ display: "flex", gap: 5 }}>
//               {results.map((res, i) => (
//                 <button
//                   key={i}
//                   onClick={() => setReviewIndex(i)}
//                   style={{
//                     width: 10, height: 10,
//                     borderRadius: "50%",
//                     border: "none",
//                     cursor: "pointer",
//                     background: i === reviewIndex
//                       ? "var(--gold)"
//                       : res.correct
//                         ? "var(--green)"
//                         : "var(--red)",
//                     opacity: i === reviewIndex ? 1 : 0.55,
//                     transition: "all 0.2s",
//                     padding: 0,
//                   }}
//                   title={`Q${i + 1}`}
//                 />
//               ))}
//             </div>
//           </div>

//           {/* Result badge */}
//           <div style={{
//             display: "inline-flex",
//             alignItems: "center",
//             gap: 6,
//             background: r.correct ? "rgba(76,175,125,0.12)" : "rgba(255,107,107,0.12)",
//             border: `0.5px solid ${r.correct ? "var(--green)" : "var(--red)"}`,
//             borderRadius: 100,
//             padding: "3px 12px",
//             fontSize: "0.75rem",
//             fontWeight: 700,
//             color: r.correct ? "var(--green)" : "var(--red)",
//             marginBottom: "0.9rem",
//           }}>
//             {r.correct ? "✓ Correct" : r.timedOut ? "⏱ Timed Out" : "✗ Incorrect"}
//             {r.correct && <span style={{ color: "var(--gold)" }}>· +0.5 XLM</span>}
//           </div>

//           {/* Question */}
//           <div className="quiz-question" style={{ marginBottom: "1rem" }}>
//             Q{reviewIndex + 1}. {r.question}
//           </div>

//           {/* Options */}
//           <div className="quiz-options" style={{ marginBottom: "1.25rem" }}>
//             {r.options.map((opt) => {
//               const isCorrect  = opt === r.answer;
//               const isSelected = opt === r.selected;
//               let cls = "option dimmed";
//               if (isCorrect)  cls = "option correct";
//               else if (isSelected && !isCorrect) cls = "option wrong";

//               return (
//                 <button
//                   key={opt}
//                   className={cls}
//                   disabled
//                   style={{ cursor: "default", opacity: isCorrect || isSelected ? 1 : 0.35 }}
//                 >
//                   <span className="option-text">{opt}</span>
//                   {isCorrect  && <span className="option-tick">✓</span>}
//                   {isSelected && !isCorrect && <span className="option-cross">✗</span>}
//                 </button>
//               );
//             })}
//           </div>

//           {/* What user picked */}
//           {!r.timedOut && !r.correct && (
//             <div style={{
//               fontSize: "0.8rem",
//               color: "var(--muted)",
//               background: "var(--surface3)",
//               borderRadius: 8,
//               padding: "0.5rem 0.75rem",
//               marginBottom: "1rem",
//             }}>
//               You answered: <span style={{ color: "var(--red)", fontWeight: 600 }}>{r.selected}</span>
//               &nbsp;·&nbsp;
//               Correct: <span style={{ color: "var(--green)", fontWeight: 600 }}>{r.answer}</span>
//             </div>
//           )}

//           {/* Navigation */}
//           <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "center" }}>
//             <button
//               className="btn-secondary"
//               onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
//               disabled={reviewIndex === 0}
//               style={{ opacity: reviewIndex === 0 ? 0.4 : 1 }}
//             >
//               ← Prev
//             </button>

//             <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
//               {results.filter(x => x.correct).length}/{results.length} correct
//             </span>

//             {isLast ? (
//               <button
//                 className="btn-primary"
//                 onClick={() => setPhase("result")}
//               >
//                 Back to Results
//               </button>
//             ) : (
//               <button
//                 className="btn-secondary"
//                 onClick={() => setReviewIndex((i) => Math.min(results.length - 1, i + 1))}
//               >
//                 Next →
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────
//   // ── RESULT ──
//   // ─────────────────────────────────────────────
//   if (phase === "result") {
//     const percent = Math.round((score / QUESTIONS.length) * 100);
//     return (
//       <div className="quiz-container">
//         <div className="quiz-result-card">
//           <div className="result-emoji">
//             {percent >= 80 ? "🏆" : percent >= 50 ? "👍" : "📚"}
//           </div>
//           <h2 className="result-title">Quiz Complete!</h2>

//           <div className="result-stats">
//             <div className="result-stat">
//               <div className="result-stat-num">{score}/{QUESTIONS.length}</div>
//               <div className="result-stat-label">Correct</div>
//             </div>
//             <div className="result-stat">
//               <div className="result-stat-num gold">{earned} XLM</div>
//               <div className="result-stat-label">Earned</div>
//             </div>
//             <div className="result-stat">
//               <div className="result-stat-num">{percent}%</div>
//               <div className="result-stat-label">Score</div>
//             </div>
//           </div>

//           {/* Streak bonus */}
//           {maxStreak >= 5 && (
//             <div style={{
//               fontSize: "0.82rem",
//               color: "var(--gold)",
//               background: "rgba(228,168,83,0.1)",
//               border: "0.5px solid var(--border)",
//               borderRadius: "8px",
//               padding: "0.5rem 1rem",
//               marginBottom: "0.75rem",
//               textAlign: "center",
//             }}>
//               🔥 {maxStreak} answer streak! +5 XLM bonus applied
//             </div>
//           )}

//           {/* TX status */}
//           {txStatus === "loading" && (
//             <div className="tx-status tx-loading">
//               <span className="spinner-sm"></span>
//               Calling send_reward() on Soroban contract...
//             </div>
//           )}
//           {txStatus === "success" && (
//             <div className="tx-status tx-success">
//               ✓ {txData.totalReward} XLM sent via contract!{" "}
//               <a href={txData.explorerUrl} target="_blank" rel="noreferrer" className="tx-link">
//                 View tx ↗
//               </a>
//             </div>
//           )}
//           {txStatus === "failed" && (
//             <div className="tx-status tx-failed">
//               ⚠ Contract call failed: {txData?.message}
//             </div>
//           )}
//           {txStatus === "none" && (
//             <div className="tx-status tx-failed">
//               No correct answers — no XLM reward this time.
//             </div>
//           )}

//           {/* Contract info */}
//           {txStatus !== "loading" && (
//             <div style={{ fontSize: "0.7rem", color: "var(--muted)", textAlign: "center", marginBottom: "0.75rem" }}>
//               Contract:{" "}
//               <a
//                 href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
//                 target="_blank" rel="noreferrer"
//                 style={{ color: "var(--gold)" }}
//               >
//                 {CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-8)}
//               </a>
//             </div>
//           )}

//           {/* Quick breakdown */}
//           <div className="result-breakdown">
//             {results.map((r, i) => (
//               <div className="result-row" key={i}>
//                 <span className={`result-icon ${r.correct ? "correct" : "wrong"}`}>
//                   {r.correct ? "✓" : "✗"}
//                 </span>
//                 <span className="result-q">Q{i + 1}</span>
//                 <span className="result-status">
//                   {r.correct ? "+0.5 XLM" : r.timedOut ? "Timed out" : "Wrong"}
//                 </span>
//               </div>
//             ))}
//           </div>

//           <div className="result-actions" style={{ flexWrap: "wrap", gap: "0.65rem" }}>
//             {/* ── Review Answers button ── */}
//             <button
//               className="btn-secondary large"
//               onClick={() => { setReviewIndex(0); setPhase("review"); }}
//               style={{ flex: "1 1 auto" }}
//             >
//               🔍 Review Answers
//             </button>
//             <button
//               className="btn-primary large"
//               onClick={handleStart}
//               style={{ flex: "1 1 auto" }}
//             >
//               Play Again
//             </button>
//             <button
//               className="btn-secondary large"
//               onClick={() => onFinish && onFinish(score, earned)}
//               style={{ flex: "1 1 100%" }}
//             >
//               Back to Home
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────
//   // ── PLAYING ──
//   // ─────────────────────────────────────────────
//   const lifelineUsedThisQ = eliminatedOpts.length > 0;
//   const canUseLifeline    = lifelinesLeft > 0 && !answered && !lifelineUsedThisQ;

//   return (
//     <div className="quiz-container">
//       <div className="quiz-card">
//         <div className="quiz-header">
//           <div className="quiz-progress-text">
//             Question {currentIndex + 1} of {QUESTIONS.length}
//           </div>
//           <div className="quiz-category">{currentQ.category}</div>
//           <div className="quiz-timer" style={{ color: timerColor }}>
//             {timeLeft}s
//           </div>
//         </div>

//         <div className="timer-bar-bg">
//           <div
//             className="timer-bar-fill"
//             style={{
//               width:      `${timerPercent}%`,
//               background: timerColor,
//               transition: "width 1s linear, background 0.3s",
//             }}
//           />
//         </div>

//         {/* Score row + Lifeline button */}
//         <div className="quiz-score-row" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
//           <span className="quiz-score-label">Score</span>
//           <span className="quiz-score-val">{score} correct</span>
//           <span className="quiz-earned-label">Earned</span>
//           <span className="quiz-earned-val gold">{earned} XLM</span>
//           {streak >= 2 && (
//             <span style={{ color: "var(--gold)", fontSize: "0.78rem" }}>
//               🔥 {streak} streak
//             </span>
//           )}

//           {/* ── 50-50 Lifeline button ── */}
//           <button
//             onClick={handleLifeline}
//             disabled={!canUseLifeline}
//             title={
//               lifelinesLeft === 0
//                 ? "No lifelines left"
//                 : lifelineUsedThisQ
//                 ? "Already used on this question"
//                 : answered
//                 ? "Cannot use after answering"
//                 : "Use 50-50: removes 2 wrong options"
//             }
//             style={{
//               marginLeft: "auto",
//               display: "flex",
//               alignItems: "center",
//               gap: 5,
//               background: canUseLifeline
//                 ? "rgba(228,168,83,0.12)"
//                 : "var(--surface3)",
//               border: `0.5px solid ${canUseLifeline ? "var(--gold)" : "rgba(240,237,230,0.1)"}`,
//               borderRadius: 8,
//               padding: "4px 10px",
//               cursor: canUseLifeline ? "pointer" : "not-allowed",
//               color: canUseLifeline ? "var(--gold)" : "var(--muted)",
//               fontSize: "0.78rem",
//               fontWeight: 600,
//               transition: "all 0.2s",
//               opacity: lifelinesLeft === 0 ? 0.45 : 1,
//             }}
//           >
//             <span style={{ fontSize: "0.9rem" }}>
//               {lifelineUsedThisQ ? "✓" : "💡"}
//             </span>
//             50-50
//             {/* Lifeline pip indicators */}
//             <span style={{ display: "flex", gap: 3, marginLeft: 2 }}>
//               {Array.from({ length: MAX_LIFELINES }).map((_, i) => (
//                 <span
//                   key={i}
//                   style={{
//                     width: 6, height: 6,
//                     borderRadius: "50%",
//                     background: i < lifelinesLeft ? "var(--gold)" : "var(--surface3)",
//                     border: "0.5px solid var(--border)",
//                     display: "inline-block",
//                   }}
//                 />
//               ))}
//             </span>
//           </button>
//         </div>

//         <div className="quiz-question">{currentQ.question}</div>

//         <div className="quiz-options">
//           {currentQ.options.map((option) => {
//             const isEliminated = eliminatedOpts.includes(option);
//             return (
//               <button
//                 key={option}
//                 className={getOptionClass(option)}
//                 onClick={() => !isEliminated && handleSelect(option)}
//                 disabled={answered || isEliminated}
//                 style={isEliminated ? {
//                   opacity: 0.2,
//                   pointerEvents: "none",
//                   textDecoration: "line-through",
//                   color: "var(--muted)",
//                 } : {}}
//               >
//                 <span className="option-text">{option}</span>
//                 {answered && option === currentQ.answer && (
//                   <span className="option-tick">✓</span>
//                 )}
//                 {answered &&
//                   option === selected &&
//                   option !== currentQ.answer && (
//                     <span className="option-cross">✗</span>
//                   )}
//               </button>
//             );
//           })}
//         </div>

//         {answered && (
//           <div
//             className={`quiz-feedback ${
//               selected === currentQ.answer
//                 ? "feedback-correct"
//                 : "feedback-wrong"
//             }`}
//           >
//             {selected === currentQ.answer
//               ? "✓ Correct! +0.5 XLM added"
//               : selected === null
//               ? "⏱ Time's up!"
//               : `✗ Wrong! Answer: ${currentQ.answer}`}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// Quiz.jsx
import React, { useState, useEffect, useRef } from "react";
import { sendReward } from "./rewardService";
import { CONTRACT_ID } from "./contracts/contractClient";

const QUESTIONS = [
  {
    id: 1,
    category: "Blockchain",
    question: "What is the native currency of the Stellar network?",
    options: ["ETH", "XLM", "BTC", "SOL"],
    answer: "XLM",
  },
  {
    id: 2,
    category: "Blockchain",
    question: "What does 'dApp' stand for?",
    options: ["Distributed Application", "Decentralized Application", "Digital Application", "Dynamic Application"],
    answer: "Decentralized Application",
  },
  {
    id: 3,
    category: "Stellar",
    question: "What is the consensus mechanism used by Stellar?",
    options: ["Proof of Work", "Proof of Stake", "Stellar Consensus Protocol", "Delegated PoS"],
    answer: "Stellar Consensus Protocol",
  },
  {
    id: 4,
    category: "Stellar",
    question: "What is Soroban on the Stellar network?",
    options: ["A wallet app", "A smart contract platform", "A DEX exchange", "A stablecoin"],
    answer: "A smart contract platform",
  },
  {
    id: 5,
    category: "Crypto",
    question: "What does 'HODL' mean in crypto slang?",
    options: ["Hold On for Dear Life", "High Order Digital Ledger", "Holding On Despite Loss", "None of the above"],
    answer: "Hold On for Dear Life",
  },
  {
    id: 6,
    category: "Crypto",
    question: "What is a smart contract?",
    options: ["A legal document on paper", "Self-executing code on a blockchain", "An agreement between two banks", "A type of cryptocurrency"],
    answer: "Self-executing code on a blockchain",
  },
  {
    id: 7,
    category: "Blockchain",
    question: "What is the Stellar testnet used for?",
    options: ["Real transactions with real XLM", "Testing applications without real money", "Mining new XLM tokens", "Storing NFTs"],
    answer: "Testing applications without real money",
  },
  {
    id: 8,
    category: "Crypto",
    question: "What does 'gas fee' refer to in blockchain?",
    options: ["Cost of electricity for mining", "Fee paid to process a transaction", "Tax on crypto profits", "Subscription fee for wallets"],
    answer: "Fee paid to process a transaction",
  },
  {
    id: 9,
    category: "Stellar",
    question: "What is the name of Stellar's smart contract engine?",
    options: ["EVM", "Soroban", "CosmWasm", "Anchor"],
    answer: "Soroban",
  },
  {
    id: 10,
    category: "Stellar",
    question: "Which function in Soroban transfers tokens between accounts?",
    options: ["send()", "transfer()", "pay()", "move()"],
    answer: "transfer()",
  },
];

// Display constants — used only for UI hints before the quiz starts.
// Actual reward amounts shown after the quiz come exclusively from the
// on-chain contract response (txData), never from local calculation.
const DISPLAY_REWARD_PER_CORRECT = 0.5; // XLM — mirrors the contract constant
const TIME_PER_QUESTION          = 10;
const MAX_LIFELINES              = 2;

export default function Quiz({ publicKey, onFinish }) {
  const [phase, setPhase]               = useState("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected]         = useState(null);
  const [answered, setAnswered]         = useState(false);
  const [score, setScore]               = useState(0);
  const [streak, setStreak]             = useState(0);
  const [maxStreak, setMaxStreak]       = useState(0);
  const [timeLeft, setTimeLeft]         = useState(TIME_PER_QUESTION);
  const [results, setResults]           = useState([]);

  // txStatus: null | "loading" | "success" | "failed" | "none"
  const [txStatus, setTxStatus]         = useState(null);
  // txData: the exact response from the Soroban contract
  const [txData, setTxData]             = useState(null);
  // txError: error message string if contract call failed
  const [txError, setTxError]           = useState(null);

  const [lifelinesLeft, setLifelinesLeft]   = useState(MAX_LIFELINES);
  const [eliminatedOpts, setEliminatedOpts] = useState([]);
  const [reviewIndex, setReviewIndex]       = useState(0);

  const timerRef   = useRef(null);
  const scoreRef   = useRef(0);
  const streakRef  = useRef(0);
  const maxStkRef  = useRef(0);

  const currentQ = QUESTIONS[currentIndex];

  useEffect(() => { scoreRef.current  = score;     }, [score]);
  useEffect(() => { streakRef.current = streak;    }, [streak]);
  useEffect(() => { maxStkRef.current = maxStreak; }, [maxStreak]);

  useEffect(() => {
    if (phase !== "playing" || answered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, currentIndex, answered]);

  useEffect(() => {
    if (phase === "result") {
      processReward(scoreRef.current, maxStkRef.current);
    }
  }, [phase]);

  // ── Call the Soroban smart contract to send reward ──────────
  // All reward values shown in the result screen come from txData (on-chain).
  // No local calculation of earned amounts is used for display.
  const processReward = async (finalScore, finalMaxStreak) => {
    if (finalScore === 0) {
      setTxStatus("none");
      return;
    }

    setTxStatus("loading");
    setTxError(null);

    try {
      // sendReward throws on any failure — no {success:false} swallowing
      const result = await sendReward(
        publicKey,
        finalScore,
        QUESTIONS.length,
        finalMaxStreak
      );
      setTxData(result);
      setTxStatus("success");
    } catch (err) {
      console.error("Contract send_reward failed:", err);
      setTxError(err.message);
      setTxStatus("failed");
    }
  };

  const handleTimeout = () => {
    setAnswered(true);
    setSelected(null);
    setStreak(0);
    streakRef.current = 0;
    setResults((prev) => [
      ...prev,
      {
        correct: false,
        timedOut: true,
        question: currentQ.question,
        options: currentQ.options,
        answer: currentQ.answer,
        selected: null,
        category: currentQ.category,
      },
    ]);
    setTimeout(() => nextQuestion(), 1500);
  };

  const handleSelect = (option) => {
    if (answered) return;
    clearInterval(timerRef.current);
    setSelected(option);
    setAnswered(true);

    const isCorrect = option === currentQ.answer;

    if (isCorrect) {
      const newScore  = scoreRef.current + 1;
      const newStreak = streakRef.current + 1;
      const newMax    = Math.max(maxStkRef.current, newStreak);

      setScore(newScore);
      setStreak(newStreak);
      setMaxStreak(newMax);

      scoreRef.current  = newScore;
      streakRef.current = newStreak;
      maxStkRef.current = newMax;
    } else {
      setStreak(0);
      streakRef.current = 0;
    }

    setResults((prev) => [
      ...prev,
      {
        correct: isCorrect,
        timedOut: false,
        question: currentQ.question,
        options: currentQ.options,
        answer: currentQ.answer,
        selected: option,
        category: currentQ.category,
      },
    ]);
    setTimeout(() => nextQuestion(), 1500);
  };

  const handleLifeline = () => {
    if (lifelinesLeft <= 0 || answered || eliminatedOpts.length > 0) return;
    const wrongOpts = currentQ.options.filter((o) => o !== currentQ.answer);
    const toElim    = wrongOpts.sort(() => Math.random() - 0.5).slice(0, 2);
    setEliminatedOpts(toElim);
    setLifelinesLeft((prev) => prev - 1);
  };

  const nextQuestion = () => {
    setEliminatedOpts([]);
    if (currentIndex + 1 >= QUESTIONS.length) {
      setPhase("result");
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelected(null);
      setAnswered(false);
      setTimeLeft(TIME_PER_QUESTION);
    }
  };

  const handleStart = () => {
    setPhase("playing");
    setCurrentIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    scoreRef.current  = 0;
    streakRef.current = 0;
    maxStkRef.current = 0;
    setResults([]);
    setTimeLeft(TIME_PER_QUESTION);
    setTxStatus(null);
    setTxData(null);
    setTxError(null);
    setLifelinesLeft(MAX_LIFELINES);
    setEliminatedOpts([]);
    setReviewIndex(0);
  };

  const getOptionClass = (option) => {
    if (eliminatedOpts.includes(option)) return "option dimmed";
    if (!answered) return "option";
    if (option === currentQ.answer) return "option correct";
    if (option === selected && option !== currentQ.answer) return "option wrong";
    return "option dimmed";
  };

  const timerPercent = (timeLeft / TIME_PER_QUESTION) * 100;
  const timerColor   = timeLeft > 8 ? "#E4A853" : timeLeft > 4 ? "#ff9f43" : "#ff6b6b";

  // ── START ────────────────────────────────────────────────────
  if (phase === "start") {
    return (
      <div className="quiz-container">
        <div className="quiz-start-card">
          <div className="quiz-start-icon">🧠</div>
          <h2 className="quiz-start-title">Ready to earn XLM?</h2>
          <p className="quiz-start-sub">
            {QUESTIONS.length} questions · {TIME_PER_QUESTION}s each ·{" "}
            {DISPLAY_REWARD_PER_CORRECT} XLM per correct answer
          </p>
          <div className="quiz-start-reward">
            <span className="reward-label">Max reward (on-chain)</span>
            <span className="reward-amount">
              {QUESTIONS.length * DISPLAY_REWARD_PER_CORRECT} XLM
            </span>
          </div>

          <div style={{
            fontSize: "0.78rem", color: "var(--muted)",
            background: "var(--surface3)", borderRadius: "8px",
            padding: "0.5rem 0.75rem", marginBottom: "0.75rem", textAlign: "center",
          }}>
            💡 You have{" "}
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>
              {MAX_LIFELINES} × 50-50 lifelines
            </span>{" "}
            — eliminates 2 wrong options!
          </div>

          <div style={{
            fontSize: "0.7rem", color: "var(--muted)",
            background: "var(--surface3)", borderRadius: "8px",
            padding: "0.5rem 0.75rem", marginBottom: "1rem",
            textAlign: "left", wordBreak: "break-all",
          }}>
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>Contract: </span>
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
              target="_blank" rel="noreferrer"
              style={{ color: "var(--muted)", textDecoration: "underline" }}
            >
              {CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-8)}
            </a>
          </div>

          <button className="btn-primary large" onClick={handleStart}>
            Start Quiz →
          </button>
        </div>
      </div>
    );
  }

  // ── REVIEW ───────────────────────────────────────────────────
  if (phase === "review") {
    const r      = results[reviewIndex];
    const isLast = reviewIndex === results.length - 1;

    return (
      <div className="quiz-container">
        <div className="quiz-card" style={{ maxWidth: 600 }}>
          <div className="quiz-header" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="quiz-progress-text">
                Review · {reviewIndex + 1} / {results.length}
              </span>
              <span style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                {r.category}
              </span>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {results.map((res, i) => (
                <button
                  key={i}
                  onClick={() => setReviewIndex(i)}
                  style={{
                    width: 10, height: 10, borderRadius: "50%", border: "none",
                    cursor: "pointer",
                    background: i === reviewIndex ? "var(--gold)" : res.correct ? "var(--green)" : "var(--red)",
                    opacity: i === reviewIndex ? 1 : 0.55,
                    transition: "all 0.2s", padding: 0,
                  }}
                  title={`Q${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: r.correct ? "rgba(76,175,125,0.12)" : "rgba(255,107,107,0.12)",
            border: `0.5px solid ${r.correct ? "var(--green)" : "var(--red)"}`,
            borderRadius: 100, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 700,
            color: r.correct ? "var(--green)" : "var(--red)", marginBottom: "0.9rem",
          }}>
            {r.correct ? "✓ Correct" : r.timedOut ? "⏱ Timed Out" : "✗ Incorrect"}
            {r.correct && <span style={{ color: "var(--gold)" }}>· +{DISPLAY_REWARD_PER_CORRECT} XLM</span>}
          </div>

          <div className="quiz-question" style={{ marginBottom: "1rem" }}>
            Q{reviewIndex + 1}. {r.question}
          </div>

          <div className="quiz-options" style={{ marginBottom: "1.25rem" }}>
            {r.options.map((opt) => {
              const isCorrect  = opt === r.answer;
              const isSelected = opt === r.selected;
              let cls = "option dimmed";
              if (isCorrect)                    cls = "option correct";
              else if (isSelected && !isCorrect) cls = "option wrong";
              return (
                <button key={opt} className={cls} disabled
                  style={{ cursor: "default", opacity: isCorrect || isSelected ? 1 : 0.35 }}
                >
                  <span className="option-text">{opt}</span>
                  {isCorrect  && <span className="option-tick">✓</span>}
                  {isSelected && !isCorrect && <span className="option-cross">✗</span>}
                </button>
              );
            })}
          </div>

          {!r.timedOut && !r.correct && (
            <div style={{
              fontSize: "0.8rem", color: "var(--muted)", background: "var(--surface3)",
              borderRadius: 8, padding: "0.5rem 0.75rem", marginBottom: "1rem",
            }}>
              You answered:{" "}
              <span style={{ color: "var(--red)", fontWeight: 600 }}>{r.selected}</span>
              &nbsp;·&nbsp;Correct:{" "}
              <span style={{ color: "var(--green)", fontWeight: 600 }}>{r.answer}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "center" }}>
            <button className="btn-secondary"
              onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
              disabled={reviewIndex === 0}
              style={{ opacity: reviewIndex === 0 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              {results.filter((x) => x.correct).length}/{results.length} correct
            </span>
            {isLast ? (
              <button className="btn-primary" onClick={() => setPhase("result")}>
                Back to Results
              </button>
            ) : (
              <button className="btn-secondary"
                onClick={() => setReviewIndex((i) => Math.min(results.length - 1, i + 1))}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────
  if (phase === "result") {
    const percent = Math.round((score / QUESTIONS.length) * 100);

    // All monetary amounts shown here come from txData (on-chain contract response).
    // Never from local state or local calculation.
    const onChainTotal  = txData?.totalReward  ?? 0;
    const onChainStreak = txData?.streakBonus  ?? 0;

    return (
      <div className="quiz-container">
        <div className="quiz-result-card">
          <div className="result-emoji">
            {percent >= 80 ? "🏆" : percent >= 50 ? "👍" : "📚"}
          </div>
          <h2 className="result-title">Quiz Complete!</h2>

          <div className="result-stats">
            <div className="result-stat">
              <div className="result-stat-num">{score}/{QUESTIONS.length}</div>
              <div className="result-stat-label">Correct</div>
            </div>
            <div className="result-stat">
              {/* Show on-chain value while loading, then replace with confirmed amount */}
              <div className="result-stat-num gold">
                {txStatus === "success"
                  ? `${onChainTotal.toFixed(1)} XLM`
                  : txStatus === "loading"
                  ? "…"
                  : `${(score * DISPLAY_REWARD_PER_CORRECT).toFixed(1)} XLM`}
              </div>
              <div className="result-stat-label">
                {txStatus === "success" ? "Earned (on-chain)" : "Earned"}
              </div>
            </div>
            <div className="result-stat">
              <div className="result-stat-num">{percent}%</div>
              <div className="result-stat-label">Score</div>
            </div>
          </div>

          {/* Streak bonus — shown only when contract confirms it */}
          {txStatus === "success" && onChainStreak > 0 && (
            <div style={{
              fontSize: "0.82rem", color: "var(--gold)",
              background: "rgba(228,168,83,0.1)",
              border: "0.5px solid var(--border)", borderRadius: "8px",
              padding: "0.5rem 1rem", marginBottom: "0.75rem", textAlign: "center",
            }}>
              🔥 Streak bonus confirmed on-chain: +{onChainStreak.toFixed(1)} XLM
            </div>
          )}

          {/* TX status */}
          {txStatus === "loading" && (
            <div className="tx-status tx-loading">
              <span className="spinner-sm"></span>
              Calling send_reward() on Soroban contract...
            </div>
          )}
          {txStatus === "success" && (
            <div className="tx-status tx-success">
              ✓ {onChainTotal.toFixed(1)} XLM confirmed on-chain!{" "}
              <a href={txData.explorerUrl} target="_blank" rel="noreferrer" className="tx-link">
                View tx ↗
              </a>
            </div>
          )}
          {txStatus === "failed" && (
            <div className="tx-status tx-failed">
              ⚠ Contract call failed: {txError}
            </div>
          )}
          {txStatus === "none" && (
            <div className="tx-status tx-failed">
              No correct answers — no XLM reward this time.
            </div>
          )}

          {/* Contract link */}
          {txStatus !== "loading" && (
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", textAlign: "center", marginBottom: "0.75rem" }}>
              Contract:{" "}
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
                target="_blank" rel="noreferrer"
                style={{ color: "var(--gold)" }}
              >
                {CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-8)}
              </a>
            </div>
          )}

          {/* Per-question breakdown */}
          <div className="result-breakdown">
            {results.map((r, i) => (
              <div className="result-row" key={i}>
                <span className={`result-icon ${r.correct ? "correct" : "wrong"}`}>
                  {r.correct ? "✓" : "✗"}
                </span>
                <span className="result-q">Q{i + 1}</span>
                <span className="result-status">
                  {r.correct
                    ? `+${DISPLAY_REWARD_PER_CORRECT} XLM`
                    : r.timedOut
                    ? "Timed out"
                    : "Wrong"}
                </span>
              </div>
            ))}
          </div>

          <div className="result-actions" style={{ flexWrap: "wrap", gap: "0.65rem" }}>
            <button
              className="btn-secondary large"
              onClick={() => { setReviewIndex(0); setPhase("review"); }}
              style={{ flex: "1 1 auto" }}
            >
              🔍 Review Answers
            </button>
            <button
              className="btn-primary large"
              onClick={handleStart}
              style={{ flex: "1 1 auto" }}
            >
              Play Again
            </button>
            <button
              className="btn-secondary large"
              onClick={() => onFinish && onFinish()}
              style={{ flex: "1 1 100%" }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ──────────────────────────────────────────────────
  const lifelineUsedThisQ = eliminatedOpts.length > 0;
  const canUseLifeline    = lifelinesLeft > 0 && !answered && !lifelineUsedThisQ;

  return (
    <div className="quiz-container">
      <div className="quiz-card">
        <div className="quiz-header">
          <div className="quiz-progress-text">
            Question {currentIndex + 1} of {QUESTIONS.length}
          </div>
          <div className="quiz-category">{currentQ.category}</div>
          <div className="quiz-timer" style={{ color: timerColor }}>{timeLeft}s</div>
        </div>

        <div className="timer-bar-bg">
          <div
            className="timer-bar-fill"
            style={{
              width: `${timerPercent}%`, background: timerColor,
              transition: "width 1s linear, background 0.3s",
            }}
          />
        </div>

        {/* Score row + Lifeline */}
        <div className="quiz-score-row" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
          <span className="quiz-score-label">Score</span>
          <span className="quiz-score-val">{score} correct</span>
          {streak >= 2 && (
            <span style={{ color: "var(--gold)", fontSize: "0.78rem" }}>
              🔥 {streak} streak
            </span>
          )}
          <button
            onClick={handleLifeline}
            disabled={!canUseLifeline}
            title={
              lifelinesLeft === 0 ? "No lifelines left"
              : lifelineUsedThisQ  ? "Already used on this question"
              : answered           ? "Cannot use after answering"
              : "Use 50-50: removes 2 wrong options"
            }
            style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
              background: canUseLifeline ? "rgba(228,168,83,0.12)" : "var(--surface3)",
              border: `0.5px solid ${canUseLifeline ? "var(--gold)" : "rgba(240,237,230,0.1)"}`,
              borderRadius: 8, padding: "4px 10px",
              cursor: canUseLifeline ? "pointer" : "not-allowed",
              color: canUseLifeline ? "var(--gold)" : "var(--muted)",
              fontSize: "0.78rem", fontWeight: 600, transition: "all 0.2s",
              opacity: lifelinesLeft === 0 ? 0.45 : 1,
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>{lifelineUsedThisQ ? "✓" : "💡"}</span>
            50-50
            <span style={{ display: "flex", gap: 3, marginLeft: 2 }}>
              {Array.from({ length: MAX_LIFELINES }).map((_, i) => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: i < lifelinesLeft ? "var(--gold)" : "var(--surface3)",
                  border: "0.5px solid var(--border)", display: "inline-block",
                }} />
              ))}
            </span>
          </button>
        </div>

        <div className="quiz-question">{currentQ.question}</div>

        <div className="quiz-options">
          {currentQ.options.map((option) => {
            const isEliminated = eliminatedOpts.includes(option);
            return (
              <button
                key={option}
                className={getOptionClass(option)}
                onClick={() => !isEliminated && handleSelect(option)}
                disabled={answered || isEliminated}
                style={isEliminated ? {
                  opacity: 0.2, pointerEvents: "none",
                  textDecoration: "line-through", color: "var(--muted)",
                } : {}}
              >
                <span className="option-text">{option}</span>
                {answered && option === currentQ.answer && (
                  <span className="option-tick">✓</span>
                )}
                {answered && option === selected && option !== currentQ.answer && (
                  <span className="option-cross">✗</span>
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={`quiz-feedback ${selected === currentQ.answer ? "feedback-correct" : "feedback-wrong"}`}>
            {selected === currentQ.answer
              ? `✓ Correct! +${DISPLAY_REWARD_PER_CORRECT} XLM`
              : selected === null
              ? "⏱ Time's up!"
              : `✗ Wrong! Answer: ${currentQ.answer}`}
          </div>
        )}
      </div>
    </div>
  );
}