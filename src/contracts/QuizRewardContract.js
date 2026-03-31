/**
 * QuizRewardContract.js — REMOVED
 *
 * This file previously contained:
 *   - Off-chain reward calculation (local JS math, not on-chain)
 *   - Off-chain XLM transfer via Horizon payment (not the contract)
 *   - localStorage-based daily limit tracking
 *
 * All of these have been removed. Responsibilities are now:
 *
 *   Reward calculation  → Rust contract calculate_reward()  (on-chain)
 *   XLM transfer        → Rust contract send_reward()       (on-chain via token contract)
 *   Leaderboard record  → Rust contract send_reward() calls QuizLeaderboard::record_session()
 *                         (on-chain inter-contract call)
 *
 * Entry point:  src/rewardService.js
 * Contract:     src/contracts/contractClient.js
 *
 * Do NOT re-add Horizon-based payments or localStorage here.
 */

throw new Error(
  "QuizRewardContract.js has been removed. Import from ./rewardService.js instead."
);