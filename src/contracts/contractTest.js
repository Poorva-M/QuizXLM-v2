/**
 * QuizXLM Contract Tests
 * 
 * Tests for QuizRewardContract functions.
 * Run with: npm run test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { calculateReward, hasPlayedToday, markPlayedToday } from "./QuizRewardContract";
import { CONTRACT_ABI } from "./contractABI";

// ── Mock localStorage ──
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:    (key)        => store[key] || null,
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key)        => { delete store[key]; },
    clear:      ()           => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ── CONTRACT TESTS ──
describe("QuizRewardContract", () => {

  beforeEach(() => localStorage.clear());

  // TEST 1
  it("calculateReward: returns correct base reward", () => {
    const { baseReward, streakBonus, totalReward } = calculateReward(7, 0);
    expect(baseReward).toBe(70);
    expect(streakBonus).toBe(0);
    expect(totalReward).toBe(70);
  });

  // TEST 2
  it("calculateReward: applies streak bonus for 5+ streak", () => {
    const { baseReward, streakBonus, totalReward } = calculateReward(5, 5);
    expect(baseReward).toBe(50);
    expect(streakBonus).toBe(20);
    expect(totalReward).toBe(70);
  });

  // TEST 3
  it("calculateReward: no streak bonus below threshold", () => {
    const { streakBonus } = calculateReward(4, 4);
    expect(streakBonus).toBe(0);
  });

  // TEST 4
  it("calculateReward: zero correct answers gives zero reward", () => {
    const { totalReward } = calculateReward(0, 0);
    expect(totalReward).toBe(0);
  });

  // TEST 5
  it("calculateReward: perfect score gives max reward", () => {
    const { totalReward } = calculateReward(8, 8);
    // 8 × 10 + 20 streak bonus = 100 XLM
    expect(totalReward).toBe(100);
  });

  // TEST 6
  it("hasPlayedToday: returns false when never played", () => {
    expect(hasPlayedToday("GTEST123")).toBe(false);
  });

  // TEST 7
  it("hasPlayedToday: returns true after markPlayedToday", () => {
    const pubKey = "GTEST456";
    markPlayedToday(pubKey);
    expect(hasPlayedToday(pubKey)).toBe(true);
  });

  // TEST 8
  it("hasPlayedToday: different wallets tracked independently", () => {
    const wallet1 = "GWALLET001";
    const wallet2 = "GWALLET002";
    markPlayedToday(wallet1);
    expect(hasPlayedToday(wallet1)).toBe(true);
    expect(hasPlayedToday(wallet2)).toBe(false);
  });

  // TEST 9
  it("CONTRACT_ABI: has all required functions defined", () => {
    const fnNames = CONTRACT_ABI.functions.map((f) => f.name);
    expect(fnNames).toContain("sendReward");
    expect(fnNames).toContain("calculateReward");
    expect(fnNames).toContain("hasPlayedToday");
    expect(fnNames).toContain("getBalance");
  });

  // TEST 10
  it("CONTRACT_ABI: reward constants are correct", () => {
    const rewardConst = CONTRACT_ABI.constants.find((c) => c.name === "REWARD_PER_CORRECT");
    const bonusConst  = CONTRACT_ABI.constants.find((c) => c.name === "STREAK_BONUS_XLM");
    expect(rewardConst.value).toBe(10);
    expect(bonusConst.value).toBe(20);
  });

});