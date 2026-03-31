// contract.js
// Simulates the Soroban QuizReward smart contract logic in JavaScript.
// This mirrors what the on-chain contract would do:
//   - submit_answer(player, is_correct) → reward amount
//   - get_score(player) → { correct, total, earned }
//   - get_reward() → reward per correct answer
//   - get_balance() → contract XLM balance

//contract.js
const REWARD_PER_CORRECT_XLM = 0.5; // XLM per correct answer
const STORAGE_KEY = "quizxlm_contract";

// ── Internal: load contract state from localStorage ──
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? JSON.parse(raw)
      : {
          reward: REWARD_PER_CORRECT_XLM,
          balance: 10000, // contract starts with 10,000 XLM
          scores: {},     // { [publicKey]: { correct, total, earned } }
          history: [],    // transaction log
        };
  } catch {
    return {
      reward: REWARD_PER_CORRECT_XLM,
      balance: 10000,
      scores: {},
      history: [],
    };
  }
}

// ── Internal: save contract state ──
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── submit_answer ──
// Mirrors: pub fn submit_answer(env, player, is_correct) -> i128
export function submitAnswer(player, isCorrect) {
  const state = loadState();

  if (!state.scores[player]) {
    state.scores[player] = { correct: 0, total: 0, earned: 0 };
  }

  const score = state.scores[player];
  score.total += 1;

  let reward = 0;

  if (isCorrect) {
    reward = state.reward;

    // Check contract has enough balance
    if (state.balance < reward) {
      throw new Error("Contract has insufficient balance to pay reward.");
    }

    score.correct += 1;
    score.earned += reward;
    state.balance -= reward;

    // Log the transaction
    state.history.push({
      type: "REWARD",
      player: player.slice(0, 8) + "...",
      amount: reward,
      timestamp: new Date().toISOString(),
    });
  }

  state.scores[player] = score;
  saveState(state);

  return reward;
}

// ── get_score ──
// Mirrors: pub fn get_score(env, player) -> PlayerScore
export function getScore(player) {
  const state = loadState();
  return (
    state.scores[player] || { correct: 0, total: 0, earned: 0 }
  );
}

// ── get_reward ──
// Mirrors: pub fn get_reward(env) -> i128
export function getReward() {
  const state = loadState();
  return state.reward;
}

// ── get_balance ──
// Mirrors: pub fn get_balance(env) -> i128
export function getContractBalance() {
  const state = loadState();
  return state.balance;
}

// ── get_history ──
// Returns transaction log (not on-chain, just for UI)
export function getHistory() {
  const state = loadState();
  return state.history || [];
}

// ── reset (for testing) ──
export function resetContract() {
  localStorage.removeItem(STORAGE_KEY);
}