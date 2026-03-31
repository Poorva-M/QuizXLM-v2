/**
 * rewardService.js
 *
 * Bridge between the Quiz frontend and the deployed Soroban smart contract.
 * All reward logic is now routed through contractClient.js which calls
 * the actual Rust contract functions on Stellar Testnet.
 *
 * Contract functions called (from contracts/src/lib.rs):
 *   - calculate_reward(correct_answers, max_streak)  → reward breakdown
 *   - send_reward(admin, player, correct_answers, max_streak) → XLM transfer
 *   - get_score(player) → on-chain score record
 *   - get_balance()     → contract XLM balance
 */

import {
  contractSendReward,
  contractCalculateReward,
  contractGetScore,
  contractGetBalance,
  CONTRACT_ID,
} from "./contracts/contractClient";

import {
  hasPlayedToday,
  markPlayedToday,
  CONTRACT_CONFIG,
} from "./contracts/QuizRewardContract";

/**
 * sendReward
 *
 * Main function called from Quiz.jsx after quiz completion.
 * Calls the Rust contract's send_reward() on-chain function.
 *
 * @param {string} playerPublicKey - Stellar wallet address
 * @param {number} correctAnswers  - number of correct answers
 * @param {number} maxStreak       - highest consecutive streak
 * @returns {Promise<ContractResult>}
 */
export const sendReward = async (
  playerPublicKey,
  correctAnswers,
  maxStreak = 0
) => {
  // Check daily limit (stored in localStorage)
  if (hasPlayedToday(playerPublicKey)) {
    return {
      success: false,
      message: "Daily limit reached. Come back tomorrow!",
    };
  }

  console.log("=== Calling Soroban Contract ===");
  console.log("Contract ID:", CONTRACT_ID);
  console.log("Function: send_reward");
  console.log("Player:", playerPublicKey);
  console.log("Correct answers:", correctAnswers);
  console.log("Max streak:", maxStreak);

  // Call the deployed Rust contract's send_reward() function
  const result = await contractSendReward(
    playerPublicKey,
    correctAnswers,
    maxStreak
  );

  if (result.success) {
    // Mark as played today so daily limit is enforced
    markPlayedToday(playerPublicKey);
    console.log("Contract call success! TX:", result.txHash);
  } else {
    console.error("Contract call failed:", result.message);
  }

  return result;
};

/**
 * calculateReward
 *
 * Calls the Rust contract's calculate_reward() function.
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
 * Calls the Rust contract's get_score() function.
 * Returns the player's on-chain score record.
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
 * Calls the Rust contract's get_balance() function.
 * Returns how much XLM the contract has left to pay rewards.
 *
 * @returns {Promise<number>} XLM balance
 */
export const getContractBalance = async () => {
  return await contractGetBalance();
};

// Re-export config and daily limit helpers for use in other components
export { hasPlayedToday, markPlayedToday, CONTRACT_CONFIG };
export { CONTRACT_ID };
export default CONTRACT_CONFIG;