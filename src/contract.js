/**
 * contract.js — REMOVED
 *
 * This file previously contained a localStorage-based JavaScript simulation
 * of the Soroban smart contract. It has been deleted.
 *
 * All contract interactions now go through:
 *   src/contracts/contractClient.js
 *
 * Which calls the deployed Rust contract on Stellar Testnet:
 *   - send_reward()        → transfers XLM on-chain
 *   - calculate_reward()   → read-only reward calculation
 *   - get_score()          → read player score from chain
 *   - get_balance()        → read contract XLM balance
 *
 * Do NOT re-add mock logic or localStorage here.
 */

throw new Error(
  "contract.js has been removed. Import from ./contracts/contractClient.js instead."
);