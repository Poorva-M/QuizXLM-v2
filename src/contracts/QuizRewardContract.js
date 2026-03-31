/**
 * QuizXLM Smart Contract
 * 
 * Handles XLM reward distribution on Stellar Testnet.
 * Each correct answer earns 1 XLM.
 * A streak of 5+ correct answers in a row earns a 5 XLM bonus.
 * Each wallet can only claim rewards once per day.
 * 
 * Network: Stellar Testnet
 * Horizon: https://horizon-testnet.stellar.org
 */

import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  BASE_FEE,
  Memo,
} from "@stellar/stellar-sdk";

// ── CONTRACT CONSTANTS ──
export const CONTRACT_CONFIG = {
  HORIZON_URL:       "https://horizon-testnet.stellar.org",
  NETWORK_PASSPHRASE: Networks.TESTNET,
  REWARD_PER_CORRECT: 0.5,    // XLM per correct answer
  STREAK_BONUS_XLM:   5,    // Bonus XLM for streak
  STREAK_THRESHOLD:   5,     // Min streak for bonus
  MAX_QUESTIONS:      10,     // Total questions per quiz
  DAILY_LIMIT_KEY:   "quizxlm_last_played",
};

// ── ADMIN ACCOUNT (set via .env) ──
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET?.trim();
const ADMIN_PUBLIC = "GDZO33RMTGQF6ZJMZFOBLQ4ZFBA3ALRKB24PRMT577BRFEVSWK2KN5NZ";

const server = new Horizon.Server(CONTRACT_CONFIG.HORIZON_URL);

/**
 * CONTRACT FUNCTION 1: calculateReward
 * 
 * Calculates the reward breakdown for a quiz session.
 * Pure function — no blockchain interaction.
 * 
 * @param {number} correctAnswers - number of correct answers
 * @param {number} maxStreak      - highest consecutive correct streak
 * @returns {{ baseReward, streakBonus, totalReward }}
 */
export const calculateReward = (correctAnswers, maxStreak) => {
  const baseReward  = correctAnswers * CONTRACT_CONFIG.REWARD_PER_CORRECT;
  const streakBonus = maxStreak >= CONTRACT_CONFIG.STREAK_THRESHOLD
    ? CONTRACT_CONFIG.STREAK_BONUS_XLM
    : 0;
  const totalReward = baseReward + streakBonus;
  return { baseReward, streakBonus, totalReward };
};

/**
 * CONTRACT FUNCTION 2: hasPlayedToday
 * 
 * Checks if a wallet has already claimed rewards today.
 * Enforces the daily reward limit.
 * 
 * @param {string} publicKey - Stellar wallet address
 * @returns {boolean}
 */
export const hasPlayedToday = (publicKey) => {
  const key  = `${CONTRACT_CONFIG.DAILY_LIMIT_KEY}_${publicKey}`;
  const last = localStorage.getItem(key);
  if (!last) return false;
  return new Date(last).toDateString() === new Date().toDateString();
};

/**
 * CONTRACT FUNCTION 3: markPlayedToday
 * 
 * Records that a wallet has claimed rewards today.
 * 
 * @param {string} publicKey - Stellar wallet address
 */
export const markPlayedToday = (publicKey) => {
  const key = `${CONTRACT_CONFIG.DAILY_LIMIT_KEY}_${publicKey}`;
  localStorage.setItem(key, new Date().toISOString());
};

/**
 * CONTRACT FUNCTION 4: sendReward (Main Contract Call)
 * 
 * Sends XLM reward to the player's wallet on Stellar Testnet.
 * This is the core contract function that:
 *   1. Validates the player and score
 *   2. Calculates total reward (base + streak bonus)
 *   3. Checks daily limit
 *   4. Builds and signs a Stellar payment transaction
 *   5. Submits the transaction to the network
 *   6. Returns the transaction hash and explorer URL
 * 
 * @param {string} playerPublicKey - Stellar wallet address of the player
 * @param {number} correctAnswers  - number of correct answers (0–8)
 * @param {number} maxStreak       - highest consecutive correct streak
 * @returns {Promise<ContractResult>}
 */
export const sendReward = async (playerPublicKey, correctAnswers, maxStreak = 0) => {

   // ADD THIS CHECK
  if (!ADMIN_SECRET || !ADMIN_SECRET.startsWith("S")) {
    return { success: false, message: "Admin secret key not configured in .env" };
  }

  // rest of existing code...
  if (!playerPublicKey) {
    return { success: false, message: "No wallet connected." };
  }


  // ── Validation ──
  if (!playerPublicKey) {
    return { success: false, message: "No wallet connected." };
  }
  if (correctAnswers === 0) {
    return { success: false, message: "No correct answers — no reward sent." };
  }
  if (hasPlayedToday(playerPublicKey)) {
    return { success: false, message: "Daily limit reached. Come back tomorrow!" };
  }

  // ── Reward Calculation ──
  const { baseReward, streakBonus, totalReward } = calculateReward(
    correctAnswers,
    maxStreak
  );
  const rewardAmount = totalReward.toFixed(7);

  try {
    // ── Build Transaction ──
    const adminKeypair = Keypair.fromSecret(ADMIN_SECRET);
    const adminAccount = await server.loadAccount(ADMIN_PUBLIC);

    const memoText = streakBonus > 0
      ? `QuizXLM +${streakBonus}XLM streak!`
      : "QuizXLM reward";

    const transaction = new TransactionBuilder(adminAccount, {
      fee: BASE_FEE,
      networkPassphrase: CONTRACT_CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: playerPublicKey,
          asset: Asset.native(),
          amount: rewardAmount,
        })
      )
      .addMemo(Memo.text(memoText))
      .setTimeout(30)
      .build();

    // ── Sign & Submit ──
    transaction.sign(adminKeypair);
    const result = await server.submitTransaction(transaction);

    // ── Record daily limit ──
    markPlayedToday(playerPublicKey);

    return {
      success:     true,
      txHash:      result.hash,
      baseReward,
      streakBonus,
      totalReward,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
    };
  } catch (error) {
    const code =
      error?.response?.data?.extras?.result_codes?.operations?.[0] ||
      error?.response?.data?.extras?.result_codes?.transaction ||
      error?.message ||
      "Unknown error";
    return { success: false, message: code };
  }
};

/**
 * CONTRACT FUNCTION 5: getBalance
 * 
 * Fetches current XLM balance of any Stellar account.
 * 
 * @param {string} publicKey - Stellar wallet address
 * @returns {Promise<string>} - XLM balance as string
 */
export const getBalance = async (publicKey) => {
  try {
    const account = await server.loadAccount(publicKey);
    const xlm = account.balances.find((b) => b.asset_type === "native");
    return xlm ? parseFloat(xlm.balance).toFixed(2) : "0.00";
  } catch {
    return "0.00";
  }
};