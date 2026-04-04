/**
 * contractClient.js
 *
 * ALL reward logic goes through the deployed Soroban contract on Stellar Testnet.
 * No local fallbacks. No Horizon payment bypass.
 *
 * Contract functions exposed:
 *   contractSendReward(player, correct, streak)   → submits send_reward() on-chain
 *   contractCalculateReward(correct, streak)      → simulates calculate_reward()
 *   contractGetScore(player)                      → simulates get_score()
 *   contractGetBalance()                          → simulates get_balance()
 *   initializeContract()                          → submits initialize() once
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

// ── Configuration ──────────────────────────────────────────────
export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  "CCIJOQK5P3NWF7NZKYVCTTMOQDSQDPWHEAQWPSBRTDAISDSUN736LSSG";

const SOROBAN_RPC_URL    = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
const contract  = new Contract(CONTRACT_ID);

// ── Internal helpers ───────────────────────────────────────────

/** Load admin keypair — throws clearly if env var is missing. */
function getAdminKeypair() {
  const secret = import.meta.env.VITE_ADMIN_SECRET?.trim();
  if (!secret || !secret.startsWith("S")) {
    throw new Error("VITE_ADMIN_SECRET is not set or invalid in .env");
  }
  return Keypair.fromSecret(secret);
}

/**
 * Simulate a read-only contract call and return the native JS value.
 * Throws on simulation error — no fallback, caller decides what to do.
 */
async function simulate(method, params = []) {
  const keypair = getAdminKeypair();
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
    throw new Error(`Contract simulation failed [${method}]: ${simResult.error}`);
  }

  const retval = simResult.result?.retval;
  return retval ? scValToNative(retval) : null;
}

/**
 * Build, simulate, prepare, sign, submit and poll a state-changing contract call.
 * Returns the transaction hash on success.
 * Throws on any error — no silent swallowing.
 */
async function invoke(method, params = []) {
  const keypair = getAdminKeypair();
  const account = await rpcServer.getAccount(keypair.publicKey());

  const unprepared = new TransactionBuilder(account, {
    fee:               BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simResult = await rpcServer.simulateTransaction(unprepared);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Contract simulation failed [${method}]: ${simResult.error}`);
  }

  const prepared = await rpcServer.prepareTransaction(unprepared);
  prepared.sign(keypair);

  const sendResult = await rpcServer.sendTransaction(prepared);
  if (sendResult.status === "ERROR") {
    throw new Error(
      `Contract submit failed [${method}]: ${JSON.stringify(sendResult.errorResult)}`
    );
  }

  // Poll until confirmed
  let result  = await rpcServer.getTransaction(sendResult.hash);
  let attempts = 0;
  while (
    result.status === rpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 20
  ) {
    await new Promise((r) => setTimeout(r, 1500));
    result   = await rpcServer.getTransaction(sendResult.hash);
    attempts++;
  }

  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(
      `Contract tx not confirmed [${method}] after ${attempts} attempts. ` +
      `Status: ${result.status}`
    );
  }

  return sendResult.hash;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * CONTRACT CALL: send_reward
 *
 * Invokes the Soroban send_reward() function which:
 *   1. Calls calculate_reward() internally
 *   2. Transfers XLM from the contract's balance to the player
 *   3. Calls QuizLeaderboard::record_session() (inter-contract call)
 *
 * This is a state-changing transaction — it is signed and submitted on-chain.
 * The contract itself moves the funds, not a Horizon payment.
 *
 * Rust: pub fn send_reward(env, admin, player, correct_answers, total_questions, max_streak) -> i128
 */
export const contractSendReward = async (
  playerPublicKey,
  correctAnswers,
  totalQuestions,
  maxStreak = 0
) => {
  if (!playerPublicKey) {
    return { success: false, message: "No wallet connected." };
  }
  if (correctAnswers === 0) {
    return { success: false, message: "No correct answers — no reward sent." };
  }

  try {
    const keypair      = getAdminKeypair();
    const adminAddress = new Address(keypair.publicKey());
    const playerAddress = new Address(playerPublicKey);

    const txHash = await invoke("send_reward", [
      adminAddress.toScVal(),
      playerAddress.toScVal(),
      nativeToScVal(correctAnswers, { type: "u32" }),
      nativeToScVal(totalQuestions, { type: "u32" }),
      nativeToScVal(maxStreak,      { type: "u32" }),
    ]);

    // Read back the reward amount from the contract for display
    const { baseReward, streakBonus, totalReward } =
      await contractCalculateReward(correctAnswers, maxStreak);

    return {
      success:     true,
      txHash,
      baseReward,
      streakBonus,
      totalReward,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
    };
  } catch (error) {
    console.error("contractSendReward error:", error);
    return { success: false, message: error.message };
  }
};

/**
 * CONTRACT CALL: calculate_reward (read-only simulation)
 *
 * Rust: pub fn calculate_reward(env, correct_answers: u32, max_streak: u32) -> RewardResult
 * No fallback — if the contract is unreachable, this throws so the caller
 * knows the on-chain call failed rather than silently using local logic.
 */
export const contractCalculateReward = async (correctAnswers, maxStreak) => {
  const result = await simulate("calculate_reward", [
    nativeToScVal(correctAnswers, { type: "u32" }),
    nativeToScVal(maxStreak,      { type: "u32" }),
  ]);

  return {
    baseReward:  Number(result.base_reward)  / 10_000_000,
    streakBonus: Number(result.streak_bonus) / 10_000_000,
    totalReward: Number(result.total_reward) / 10_000_000,
  };
};

/**
 * CONTRACT CALL: get_score (read-only simulation)
 *
 * Rust: pub fn get_score(env, player: Address) -> PlayerScore
 * Returns the player's on-chain score record.
 */
export const contractGetScore = async (playerPublicKey) => {
  const result = await simulate("get_score", [
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
 * Rust: pub fn get_balance(env) -> i128
 */
export const contractGetBalance = async () => {
  const result = await simulate("get_balance", []);
  return Number(result) / 10_000_000;
};

/**
 * CONTRACT CALL: initialize (one-time setup)
 *
 * Call once after deployment from the browser console:
 *   import('/src/contracts/contractClient.js').then(m => m.initializeContract().then(console.log))
 *
 * Rust: pub fn initialize(env, admin, token, leaderboard)
 */
export const initializeContract = async (tokenAddress, leaderboardAddress) => {
  try {
    const keypair      = getAdminKeypair();
    const adminAddress = new Address(keypair.publicKey());

    const txHash = await invoke("initialize", [
      adminAddress.toScVal(),
      new Address(tokenAddress).toScVal(),
      new Address(leaderboardAddress).toScVal(),
    ]);

    console.log("Contract initialized! TX:", txHash);
    return { success: true, txHash };
  } catch (error) {
    console.error("initializeContract error:", error);
    return { success: false, message: error.message };
  }
};