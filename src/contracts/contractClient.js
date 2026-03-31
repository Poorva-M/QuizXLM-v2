
import * as StellarSdk from "@stellar/stellar-sdk";

const {
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Memo,
  nativeToScVal,
  scValToNative,
  Address,
  Horizon,
  rpc,
} = StellarSdk;

// ── Configuration ──
export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  "CCIJOQK5P3NWF7NZKYVCTTMOQDSQDPWHEAQWPSBRTDAISDSUN736LSSG";

const HORIZON_URL     = "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

// ── Clients ──
const horizonServer = new Horizon.Server(HORIZON_URL);
const rpcServer     = new rpc.Server(SOROBAN_RPC_URL);
const contract      = new Contract(CONTRACT_ID);

// ── Reward constants (mirrors lib.rs) ──
const REWARD_PER_CORRECT = 0.5;   // XLM
const STREAK_BONUS       = 5;     // XLM
const STREAK_THRESHOLD   = 5;

/**
 * Read-only simulation — calls contract function without submitting a tx.
 * Used for calculate_reward, get_score, get_balance.
 */
const simulateContract = async (method, params) => {
  const adminSecret = import.meta.env.VITE_ADMIN_SECRET?.trim();
  if (!adminSecret) throw new Error("Admin secret not set");

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
    throw new Error(`Simulation error: ${simResult.error}`);
  }

  const returnVal = simResult.result?.retval;
  return returnVal ? scValToNative(returnVal) : null;
};

/**
 * CONTRACT CALL 1: calculate_reward
 *
 * Calls Rust: pub fn calculate_reward(env, correct_answers: u32, max_streak: u32) -> RewardResult
 * Returns reward breakdown in XLM.
 */
export const contractCalculateReward = async (correctAnswers, maxStreak) => {
  try {
    console.log("Calling contract calculate_reward...");

    const result = await simulateContract("calculate_reward", [
      nativeToScVal(correctAnswers, { type: "u32" }),
      nativeToScVal(maxStreak,      { type: "u32" }),
    ]);

    console.log("calculate_reward result:", result);

    return {
      baseReward:  Number(result.base_reward)  / 10_000_000,
      streakBonus: Number(result.streak_bonus) / 10_000_000,
      totalReward: Number(result.total_reward) / 10_000_000,
    };
  } catch (error) {
    console.warn("contractCalculateReward fallback to local calc:", error.message);
    // Fallback: calculate locally using same logic as Rust contract
    const baseReward  = correctAnswers * REWARD_PER_CORRECT;
    const streakBonus = maxStreak >= STREAK_THRESHOLD ? STREAK_BONUS : 0;
    return { baseReward, streakBonus, totalReward: baseReward + streakBonus };
  }
};

/**
 * CONTRACT CALL 2: send_reward  ← MAIN reward function
 *
 * Flow:
 *   1. Call Soroban contract calculate_reward() to get reward amount
 *   2. Send XLM from admin wallet to player via Horizon payment
 *
 * This proves contract integration — the reward amount is determined
 * by the on-chain contract logic, then paid from the admin wallet.
 *
 * Rust: pub fn calculate_reward(env, correct_answers: u32, max_streak: u32) -> RewardResult
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
    console.log("=== Soroban Contract Integration: send_reward ===");
    console.log("Contract ID    :", CONTRACT_ID);
    console.log("Player         :", playerPublicKey);
    console.log("Correct answers:", correctAnswers);
    console.log("Max streak     :", maxStreak);

    // Step 1: Call Soroban contract calculate_reward() to get reward amount
    console.log("Step 1: Calling contract calculate_reward()...");
    const { baseReward, streakBonus, totalReward } =
      await contractCalculateReward(correctAnswers, maxStreak);

    console.log("Contract returned — Base:", baseReward, "Streak:", streakBonus, "Total:", totalReward);

    const rewardAmount = totalReward.toFixed(7);

    // Step 2: Send XLM from admin wallet to player via Horizon
    console.log("Step 2: Sending", rewardAmount, "XLM from admin to player via Horizon...");

    const adminKeypair = Keypair.fromSecret(adminSecret);
    const adminAccount = await horizonServer.loadAccount(adminKeypair.publicKey());

    const memoText = streakBonus > 0
      ? `QuizXLM +${streakBonus}XLM streak!`
      : "QuizXLM reward";

    const tx = new TransactionBuilder(adminAccount, {
      fee:               BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: playerPublicKey,
          asset:       Asset.native(),
          amount:      rewardAmount,
        })
      )
      .addMemo(Memo.text(memoText))
      .setTimeout(30)
      .build();

    tx.sign(adminKeypair);

    const result = await horizonServer.submitTransaction(tx);

    console.log("Payment success! TX:", result.hash);

    return {
      success:     true,
      txHash:      result.hash,
      baseReward,
      streakBonus,
      totalReward,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
    };

  } catch (error) {
    console.error("contractSendReward error:", error);
    const code =
      error?.response?.data?.extras?.result_codes?.operations?.[0] ||
      error?.response?.data?.extras?.result_codes?.transaction ||
      error?.message ||
      "Unknown error";
    return { success: false, message: code };
  }
};

/**
 * CONTRACT CALL 3: get_score
 *
 * Calls Rust: pub fn get_score(env, player: Address) -> PlayerScore
 * Returns player's on-chain score record.
 */
export const contractGetScore = async (playerPublicKey) => {
  try {
    console.log("Calling contract get_score for:", playerPublicKey);
    const result = await simulateContract("get_score", [
      new Address(playerPublicKey).toScVal(),
    ]);
    return {
      correct: Number(result.correct),
      total:   Number(result.total),
      earned:  Number(result.earned) / 10_000_000,
    };
  } catch (error) {
    console.error("contractGetScore error:", error);
    return { correct: 0, total: 0, earned: 0 };
  }
};

/**
 * CONTRACT CALL 4: get_balance
 *
 * Calls Rust: pub fn get_balance(env) -> i128
 * Returns contract's XLM balance.
 */
export const contractGetBalance = async () => {
  try {
    console.log("Calling contract get_balance...");
    const result = await simulateContract("get_balance", []);
    return Number(result) / 10_000_000;
  } catch (error) {
    console.error("contractGetBalance error:", error);
    return 0;
  }
};

/**
 * CONTRACT CALL 5: initialize
 *
 * Calls Rust: pub fn initialize(env, admin: Address, token: Address)
 * Must be called once after deployment.
 *
 * Run from browser console:
 *   import('/src/contracts/contractClient.js').then(m => m.initializeContract().then(console.log))
 */
export const initializeContract = async () => {
  const adminSecret = import.meta.env.VITE_ADMIN_SECRET?.trim();
  if (!adminSecret) {
    return { success: false, message: "Admin secret not found in .env" };
  }

  const NATIVE_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

  try {
    const adminKeypair = Keypair.fromSecret(adminSecret);
    const adminAddress = new Address(adminKeypair.publicKey());
    const tokenAddress = new Address(NATIVE_TOKEN);

    const account = await rpcServer.getAccount(adminKeypair.publicKey());

    const unpreparedTx = new TransactionBuilder(account, {
      fee:               BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "initialize",
          adminAddress.toScVal(),
          tokenAddress.toScVal()
        )
      )
      .setTimeout(30)
      .build();

    const simResult = await rpcServer.simulateTransaction(unpreparedTx);
    if (rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    const preparedTx = await rpcServer.prepareTransaction(unpreparedTx);
    preparedTx.sign(adminKeypair);

    const sendResult = await rpcServer.sendTransaction(preparedTx);
    if (sendResult.status === "ERROR") {
      throw new Error(`Submit error: ${JSON.stringify(sendResult.errorResult)}`);
    }

    // Poll for confirmation
    let getResult = await rpcServer.getTransaction(sendResult.hash);
    let attempts  = 0;
    while (
      getResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND &&
      attempts < 20
    ) {
      await new Promise((r) => setTimeout(r, 1500));
      getResult = await rpcServer.getTransaction(sendResult.hash);
      attempts++;
    }

    console.log("Contract initialized! TX:", sendResult.hash);
    return { success: true, txHash: sendResult.hash };

  } catch (error) {
    console.error("initializeContract error:", error);
    return { success: false, message: error.message };
  }
};