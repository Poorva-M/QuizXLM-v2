/**
 * contractClient.js
 *
 * All reward logic is executed on-chain via the deployed Soroban contract.
 * NO fallback local calculations. NO Horizon off-chain payments.
 * If the contract call fails, the error propagates — no silent fallbacks.
 *
 * Contract functions used (from contracts/src/lib.rs):
 *   - send_reward(admin, player, correct_answers, total_questions, max_streak) → i128
 *   - calculate_reward(correct_answers, max_streak) → RewardResult
 *   - get_score(player) → PlayerScore
 *   - get_balance() → i128
 */

import * as StellarSdk from "@stellar/stellar-sdk";

const {
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  rpc,
} = StellarSdk;

// ── Configuration ──
export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  "CCIJOQK5P3NWF7NZKYVCTTMOQDSQDPWHEAQWPSBRTDAISDSUN736LSSG";

const SOROBAN_RPC_URL    = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const TOTAL_QUESTIONS    = 10;

const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
const contract  = new Contract(CONTRACT_ID);

// ── Poll for transaction confirmation ──
const waitForTransaction = async (hash, maxAttempts = 20) => {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await rpcServer.getTransaction(hash);
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) return result;
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error("Transaction confirmation timed out");
};

// ── Build, simulate, prepare and submit a contract transaction ──
const invokeContract = async (method, params, adminKeypair) => {
  const account = await rpcServer.getAccount(adminKeypair.publicKey());

  const unpreparedTx = new TransactionBuilder(account, {
    fee:               BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simResult = await rpcServer.simulateTransaction(unpreparedTx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error in ${method}: ${simResult.error}`);
  }

  const preparedTx = await rpcServer.prepareTransaction(unpreparedTx);
  preparedTx.sign(adminKeypair);

  const sendResult = await rpcServer.sendTransaction(preparedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(
      `Submit error in ${method}: ${JSON.stringify(sendResult.errorResult)}`
    );
  }

  return waitForTransaction(sendResult.hash);
};

// ── Read-only simulation (no transaction submitted) ──
const simulateReadOnly = async (method, params) => {
  const adminSecret = import.meta.env.VITE_ADMIN_SECRET?.trim();
  if (!adminSecret) throw new Error("VITE_ADMIN_SECRET not set in .env");

  const keypair = Keypair.fromSecret(adminSecret);
  const account = await rpcServer.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee:               BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simResult = await rpcServer.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error in ${method}: ${simResult.error}`);
  }

  const retval = simResult.result?.retval;
  if (!retval) throw new Error(`No return value from ${method}`);
  return scValToNative(retval);
};

/**
 * CONTRACT CALL: send_reward
 *
 * Calls Rust: pub fn send_reward(env, admin, player, correct_answers, total_questions, max_streak) -> i128
 *
 * The contract handles:
 *   1. Reward calculation (base + streak bonus)
 *   2. XLM transfer from contract to player via token contract
 *   3. Inter-contract call to QuizLeaderboard::record_session()
 *
 * No off-chain Horizon payment is used.
 */
export const contractSendReward = async (
  playerPublicKey,
  correctAnswers,
  maxStreak = 0
) => {
  const adminSecret = import.meta.env.VITE_ADMIN_SECRET?.trim();

  if (!adminSecret || !adminSecret.startsWith("S")) {
    return { success: false, message: "Admin secret key not configured in .env" };
  }
  if (!playerPublicKey) {
    return { success: false, message: "No wallet connected." };
  }
  if (correctAnswers === 0) {
    return { success: false, message: "No correct answers — no reward sent." };
  }

  try {
    console.log("=== Invoking send_reward() on Soroban contract ===");
    console.log("Contract ID    :", CONTRACT_ID);
    console.log("Player         :", playerPublicKey);
    console.log("Correct answers:", correctAnswers);
    console.log("Max streak     :", maxStreak);

    const adminKeypair    = Keypair.fromSecret(adminSecret);
    const adminAddress    = new Address(adminKeypair.publicKey());
    const playerAddress   = new Address(playerPublicKey);

    const txResult = await invokeContract(
      "send_reward",
      [
        adminAddress.toScVal(),
        playerAddress.toScVal(),
        nativeToScVal(correctAnswers, { type: "u32" }),
        nativeToScVal(TOTAL_QUESTIONS, { type: "u32" }),
        nativeToScVal(maxStreak,       { type: "u32" }),
      ],
      adminKeypair
    );

    // Decode the returned total_reward (i128 in stroops)
    const totalRewardStroops = scValToNative(txResult.returnValue);
    const totalReward        = Number(totalRewardStroops) / 10_000_000;

    console.log("send_reward success! Total reward:", totalReward, "XLM");
    console.log("TX hash:", txResult.txHash ?? txResult.hash);

    const txHash = txResult.txHash ?? txResult.hash ?? "";

    return {
      success:     true,
      txHash,
      totalReward,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
    };
  } catch (error) {
    console.error("contractSendReward error:", error);
    return { success: false, message: error.message || "Contract call failed" };
  }
};

/**
 * CONTRACT CALL: calculate_reward (read-only simulation)
 *
 * Calls Rust: pub fn calculate_reward(env, correct_answers: u32, max_streak: u32) -> RewardResult
 * No fallback — throws if the contract call fails.
 */
export const contractCalculateReward = async (correctAnswers, maxStreak) => {
  console.log("Calling contract calculate_reward...");

  const result = await simulateReadOnly("calculate_reward", [
    nativeToScVal(correctAnswers, { type: "u32" }),
    nativeToScVal(maxStreak,      { type: "u32" }),
  ]);

  console.log("calculate_reward result:", result);

  return {
    baseReward:  Number(result.base_reward)  / 10_000_000,
    streakBonus: Number(result.streak_bonus) / 10_000_000,
    totalReward: Number(result.total_reward) / 10_000_000,
  };
};

/**
 * CONTRACT CALL: get_score (read-only simulation)
 *
 * Calls Rust: pub fn get_score(env, player: Address) -> PlayerScore
 */
export const contractGetScore = async (playerPublicKey) => {
  console.log("Calling contract get_score for:", playerPublicKey);

  const result = await simulateReadOnly("get_score", [
    new Address(playerPublicKey).toScVal(),
  ]);

  return {
    correct: Number(result.correct),
    total:   Number(result.total),
    earned:  Number(result.earned) / 10_000_000,
  };
};

/**
 * CONTRACT CALL: get_balance (read-only simulation)
 *
 * Calls Rust: pub fn get_balance(env) -> i128
 */
export const contractGetBalance = async () => {
  console.log("Calling contract get_balance...");
  const result = await simulateReadOnly("get_balance", []);
  return Number(result) / 10_000_000;
};

/**
 * CONTRACT CALL: initialize (run once after deployment)
 *
 * Calls Rust: pub fn initialize(env, admin, token, leaderboard)
 * Run from browser console or a deploy script — not called during normal gameplay.
 */
export const initializeContract = async (leaderboardContractId) => {
  const adminSecret = import.meta.env.VITE_ADMIN_SECRET?.trim();
  if (!adminSecret) {
    return { success: false, message: "Admin secret not found in .env" };
  }
  if (!leaderboardContractId) {
    return { success: false, message: "Leaderboard contract ID required" };
  }

  const NATIVE_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

  try {
    const adminKeypair       = Keypair.fromSecret(adminSecret);
    const adminAddress       = new Address(adminKeypair.publicKey());
    const tokenAddress       = new Address(NATIVE_TOKEN);
    const leaderboardAddress = new Address(leaderboardContractId);

    await invokeContract(
      "initialize",
      [
        adminAddress.toScVal(),
        tokenAddress.toScVal(),
        leaderboardAddress.toScVal(),
      ],
      adminKeypair
    );

    console.log("Contract initialized successfully.");
    return { success: true };
  } catch (error) {
    console.error("initializeContract error:", error);
    return { success: false, message: error.message };
  }
};