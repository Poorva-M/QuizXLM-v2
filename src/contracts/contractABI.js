// contractABI.js
// Defines the ABI (Application Binary Interface) for the QuizXLM smart contract.
// This mirrors what a deployed Soroban contract's interface would look like.

export const CONTRACT_ABI = {
  name: "QuizRewardContract",
  version: "1.0.0",
  network: "testnet",

  constants: [
    { name: "REWARD_PER_CORRECT", type: "i128", value: 0.5 },
    { name: "STREAK_BONUS_XLM",   type: "i128", value: 5   },
    { name: "STREAK_THRESHOLD",   type: "u32",  value: 5   },
    { name: "MAX_QUESTIONS",      type: "u32",  value: 10  },
  ],

  functions: [
    {
      name: "sendReward",
      description: "Send XLM reward to player after quiz completion",
      inputs: [
        { name: "player_public_key", type: "Address" },
        { name: "correct_answers",   type: "u32"     },
        { name: "max_streak",        type: "u32"     },
      ],
      outputs: [{ name: "tx_hash", type: "String" }],
    },
    {
      name: "calculateReward",
      description: "Calculate reward breakdown without sending",
      inputs: [
        { name: "correct_answers", type: "u32" },
        { name: "max_streak",      type: "u32" },
      ],
      outputs: [
        { name: "base_reward",   type: "i128" },
        { name: "streak_bonus",  type: "i128" },
        { name: "total_reward",  type: "i128" },
      ],
    },
    {
      name: "hasPlayedToday",
      description: "Check if a wallet has already claimed rewards today",
      inputs: [{ name: "public_key", type: "Address" }],
      outputs: [{ name: "played", type: "bool" }],
    },
    {
      name: "getBalance",
      description: "Get current XLM balance of a Stellar account",
      inputs: [{ name: "public_key", type: "Address" }],
      outputs: [{ name: "balance", type: "String" }],
    },
  ],
};

export default CONTRACT_ABI;