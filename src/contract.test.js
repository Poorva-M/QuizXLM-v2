// contract.test.js
// Tests that mirror the Soroban contract test cases
// Run with: npm test

import { describe, it, expect, beforeEach } from "vitest";
import {
  submitAnswer,
  getScore,
  getReward,
  getContractBalance,
  resetContract,
} from "./contract";

// Reset contract state before each test
beforeEach(() => {
  resetContract();
});

const PLAYER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

// ── Test 1: Correct answer returns reward ──
describe("submit_answer", () => {
  it("returns reward amount for correct answer", () => {
    const reward = submitAnswer(PLAYER, true);
    expect(reward).toBe(10);
  });

  // ── Test 2: Wrong answer returns zero ──
  it("returns 0 for wrong answer", () => {
    const reward = submitAnswer(PLAYER, false);
    expect(reward).toBe(0);
  });

  // ── Test 3: Score updates correctly ──
  it("updates score correctly after correct answer", () => {
    submitAnswer(PLAYER, true);
    const score = getScore(PLAYER);
    expect(score.correct).toBe(1);
    expect(score.total).toBe(1);
    expect(score.earned).toBe(10);
  });

  // ── Test 4: Wrong answer does not update correct count ──
  it("does not increment correct count for wrong answer", () => {
    submitAnswer(PLAYER, false);
    const score = getScore(PLAYER);
    expect(score.correct).toBe(0);
    expect(score.total).toBe(1);
    expect(score.earned).toBe(0);
  });

  // ── Test 5: Score accumulates across multiple answers ──
  it("accumulates score across multiple answers", () => {
    submitAnswer(PLAYER, true);
    submitAnswer(PLAYER, false);
    submitAnswer(PLAYER, true);
    submitAnswer(PLAYER, true);

    const score = getScore(PLAYER);
    expect(score.correct).toBe(3);
    expect(score.total).toBe(4);
    expect(score.earned).toBe(30);
  });
});

// ── Test 6: Contract balance decreases on reward ──
describe("get_balance", () => {
  it("decreases contract balance when reward is paid", () => {
    const before = getContractBalance();
    submitAnswer(PLAYER, true);
    const after = getContractBalance();
    expect(after).toBe(before - 10);
  });
});

// ── Test 7: Default reward is 10 XLM ──
describe("get_reward", () => {
  it("returns default reward of 10 XLM", () => {
    const reward = getReward();
    expect(reward).toBe(10);
  });
});

// ── Test 8: New player starts with zero score ──
describe("get_score", () => {
  it("returns zero score for new player", () => {
    const score = getScore(PLAYER);
    expect(score.correct).toBe(0);
    expect(score.total).toBe(0);
    expect(score.earned).toBe(0);
  });
});