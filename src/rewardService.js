/**
 * rewardService.js
 *
 * Thin bridge between Quiz.jsx and the Soroban smart contract.
 * All reward logic — calculation, transfer, leaderboard recording — is
 * executed on-chain inside send_reward() on the deployed Rust contract.
 *
 * No localStorage. No local calculations. No off-chain Horizon payments.
 * If the contract call fails the error is returned to the UI as-is.
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
 * Invokes send_reward() on the Soroban contract which:
 *   1. Calculates reward (base + streak bonus) on-chain
 *   2. Transfers XLM from the contract to the player via the token contract
 *   3. Calls QuizLeaderboard::record_session() via inter-contract call
 *
 * @param {string} playerPublicKey - Stellar wallet address
 * @param {number} correctAnswers  - number of correct answers
 * @param {number} maxStreak       - highest consecutive streak
 * @returns {Promise<{ success, txHash?, totalReward?, explorerUrl?, message? }>}
 */
export const sendReward = async (playerPublicKey, correctAnswers, maxStreak = 0) => {
  console.log("=== rewardService.sendReward → contractSendReward ===");
  console.log("Player        :", playerPublicKey);
  console.log("Correct       :", correctAnswers);
  console.log("Max streak    :", maxStreak);

  return await contractSendReward(playerPublicKey, correctAnswers, maxStreak);
};

/**
 * calculateReward
 *
 * Read-only simulation of the contract's calculate_reward().
 * Returns reward breakdown without sending any XLM.
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
 * Reads the player's cumulative score from on-chain contract storage.
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
 * Reads the contract's current XLM balance from on-chain storage.
 *
 * @returns {Promise<number>} XLM balance
 */
export const getContractBalance = async () => {
  return await contractGetBalance();
};