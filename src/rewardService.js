// /**
//  * rewardService.js
//  *
//  * Thin bridge between Quiz.jsx and the deployed Soroban contract.
//  * Every function routes directly to contractClient.js.
//  * No localStorage. No local calculations. No mock logic.
//  *
//  * Daily-limit enforcement is handled on-chain: the contract's
//  * PlayerScore.total is checked via get_score() before attempting
//  * send_reward(). If the player has already played today the
//  * contract will reject the call — we surface that error cleanly.
//  */

// import {
//   contractSendReward,
//   contractCalculateReward,
//   contractGetScore,
//   contractGetBalance,
//   CONTRACT_ID,
// } from "./contracts/contractClient";

// export { CONTRACT_ID };

// /**
//  * sendReward
//  *
//  * Called from Quiz.jsx after quiz completion.
//  * Invokes send_reward() on the Soroban contract which:
//  *   - calculates the reward on-chain
//  *   - transfers XLM from contract balance to player
//  *   - records the session in QuizLeaderboard via inter-contract call
//  *
//  * @param {string} playerPublicKey
//  * @param {number} correctAnswers
//  * @param {number} totalQuestions
//  * @param {number} maxStreak
//  * @returns {Promise<{ success, txHash?, totalReward?, explorerUrl?, message? }>}
//  */
// export const sendReward = async (
//   playerPublicKey,
//   correctAnswers,
//   totalQuestions,
//   maxStreak = 0
// ) => {
//   return await contractSendReward(
//     playerPublicKey,
//     correctAnswers,
//     totalQuestions,
//     maxStreak
//   );
// };

// /**
//  * calculateReward
//  *
//  * Simulates calculate_reward() on the contract — pure read, no state change.
//  *
//  * @param {number} correctAnswers
//  * @param {number} maxStreak
//  * @returns {Promise<{ baseReward, streakBonus, totalReward }>}
//  */
// export const calculateReward = async (correctAnswers, maxStreak) => {
//   return await contractCalculateReward(correctAnswers, maxStreak);
// };

// /**
//  * getPlayerScore
//  *
//  * Reads the player's on-chain score from the contract.
//  *
//  * @param {string} playerPublicKey
//  * @returns {Promise<{ correct, total, earned }>}
//  */
// export const getPlayerScore = async (playerPublicKey) => {
//   return await contractGetScore(playerPublicKey);
// };

// /**
//  * getContractBalance
//  *
//  * Reads the contract's XLM balance on-chain.
//  *
//  * @returns {Promise<number>} XLM balance
//  */
// export const getContractBalance = async () => {
//   return await contractGetBalance();
// };

/**
 * rewardService.js
 *
 * Thin bridge between Quiz.jsx and the deployed Soroban contract.
 * Every function routes directly to contractClient.js.
 *
 * No localStorage. No local calculations. No mock logic. No fallbacks.
 *
 * All functions throw on failure so Quiz.jsx can catch and display
 * the exact error rather than silently showing a wrong state.
 */

import {
  contractSendReward,
  contractCalculateReward,
  contractGetScore,
  contractGetBalance,
  CONTRACT_ID,
} from "./contracts/contractClient";

export { CONTRACT_ID };

/**
 * sendReward
 *
 * Called from Quiz.jsx after quiz completion.
 * Calls send_reward() on the Soroban contract which:
 *   - calculates reward on-chain
 *   - transfers XLM from contract balance to player
 *   - records the session in QuizLeaderboard via inter-contract call
 *
 * Throws on failure — caller (Quiz.jsx) must catch and handle.
 *
 * @param {string} playerPublicKey
 * @param {number} correctAnswers
 * @param {number} totalQuestions
 * @param {number} maxStreak
 * @returns {Promise<{ success, txHash, totalReward, baseReward, streakBonus, explorerUrl }>}
 */
export const sendReward = async (
  playerPublicKey,
  correctAnswers,
  totalQuestions,
  maxStreak = 0
) => {
  // Throws on any contract or network failure — no silent catch here
  return await contractSendReward(
    playerPublicKey,
    correctAnswers,
    totalQuestions,
    maxStreak
  );
};

/**
 * calculateReward
 *
 * Simulates calculate_reward() on the contract — pure read, no state change.
 * Used only for UI display (e.g. "max reward" on the start screen).
 *
 * @param {number} correctAnswers
 * @param {number} maxStreak
 * @returns {Promise<{ baseReward, streakBonus, totalReward }>}
 */
export const calculateReward = async (correctAnswers, maxStreak) => {
  return await contractCalculateReward(correctAnswers, maxStreak);
};

/**
 * getPlayerScore
 *
 * Reads the player's on-chain cumulative score.
 *
 * @param {string} playerPublicKey
 * @returns {Promise<{ correct, total, earned }>}
 */
export const getPlayerScore = async (playerPublicKey) => {
  return await contractGetScore(playerPublicKey);
};

/**
 * getContractBalance
 *
 * Reads the contract's XLM balance on-chain.
 *
 * @returns {Promise<number>} XLM balance
 */
export const getContractBalance = async () => {
  return await contractGetBalance();
};