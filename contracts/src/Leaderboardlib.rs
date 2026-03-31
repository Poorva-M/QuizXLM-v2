#![no_std]

//! QuizLeaderboard Contract
//!
//! A second on-chain contract that QuizRewardContract calls after every
//! payout to record the player's session on-chain. This satisfies the
//! "inter-contract call" requirement: QuizRewardContract → QuizLeaderboard.
//!
//! Functions:
//!   record_session(player, correct, total, earned) — called by QuizRewardContract
//!   get_top(n)                                     — returns top-N entries by earned
//!   get_player_best(player)                        — returns a player's best session

use soroban_sdk::{
    contract, contractimpl, contracttype,
    symbol_short,
    vec, Vec,
    Address, Env, Symbol,
};

// ── Storage keys ──
const SESSIONS_KEY: Symbol = symbol_short!("SESSIONS");
const CALLER_KEY:   Symbol = symbol_short!("CALLER");   // authorised caller = QuizRewardContract

// ── On-chain session record ──
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct SessionRecord {
    pub player:    Address,
    pub correct:   u32,
    pub total:     u32,
    pub earned:    i128,   // stroops
    pub timestamp: u64,    // ledger timestamp
}

#[contract]
pub struct QuizLeaderboard;

#[contractimpl]
impl QuizLeaderboard {

    /// Initialize: set the only address allowed to call record_session.
    /// Must be called once with the QuizRewardContract's address.
    pub fn initialize(env: Env, caller: Address) {
        // Only allow initialization once
        if env.storage().instance().has(&CALLER_KEY) {
            panic!("already initialized");
        }
        env.storage().instance().set(&CALLER_KEY, &caller);
    }

    /// Called by QuizRewardContract after a successful payout.
    /// Appends a SessionRecord and keeps the list sorted by earned (desc).
    pub fn record_session(
        env:     Env,
        player:  Address,
        correct: u32,
        total:   u32,
        earned:  i128,
    ) {
        // Only the registered QuizRewardContract may call this
        let caller: Address = env
            .storage()
            .instance()
            .get(&CALLER_KEY)
            .expect("not initialized");
        caller.require_auth();

        let new_entry = SessionRecord {
            player:    player.clone(),
            correct,
            total,
            earned,
            timestamp: env.ledger().timestamp(),
        };

        let mut sessions: Vec<SessionRecord> = env
            .storage()
            .persistent()
            .get(&SESSIONS_KEY)
            .unwrap_or(vec![&env]);

        sessions.push_back(new_entry);

        // Keep only top-100 to bound storage costs
        // Simple insertion: sort descending by earned
        let len = sessions.len();
        if len > 1 {
            // Bubble the new entry up by earned
            let mut i = len - 1;
            while i > 0 {
                let a = sessions.get(i - 1).unwrap();
                let b = sessions.get(i).unwrap();
                if b.earned > a.earned {
                    sessions.set(i - 1, b);
                    sessions.set(i, a);
                    i -= 1;
                } else {
                    break;
                }
            }
        }

        // Trim to top-100
        while sessions.len() > 100 {
            sessions.pop_back();
        }

        env.storage().persistent().set(&SESSIONS_KEY, &sessions);

        env.events().publish(
            (symbol_short!("SESSION"), player),
            earned,
        );
    }

    /// Returns the top-N sessions by earned (already sorted).
    pub fn get_top(env: Env, n: u32) -> Vec<SessionRecord> {
        let sessions: Vec<SessionRecord> = env
            .storage()
            .persistent()
            .get(&SESSIONS_KEY)
            .unwrap_or(vec![&env]);

        let take = n.min(sessions.len()) as usize;
        let mut result = vec![&env];
        for i in 0..take {
            result.push_back(sessions.get(i as u32).unwrap());
        }
        result
    }

    /// Returns the best (highest earned) session for a specific player.
    pub fn get_player_best(env: Env, player: Address) -> Option<SessionRecord> {
        let sessions: Vec<SessionRecord> = env
            .storage()
            .persistent()
            .get(&SESSIONS_KEY)
            .unwrap_or(vec![&env]);

        let mut best: Option<SessionRecord> = None;
        for i in 0..sessions.len() {
            let s = sessions.get(i).unwrap();
            if s.player == player {
                match &best {
                    None => best = Some(s),
                    Some(b) => {
                        if s.earned > b.earned {
                            best = Some(s);
                        }
                    }
                }
            }
        }
        best
    }

    /// Returns total number of recorded sessions.
    pub fn session_count(env: Env) -> u32 {
        let sessions: Vec<SessionRecord> = env
            .storage()
            .persistent()
            .get(&SESSIONS_KEY)
            .unwrap_or(vec![&env]);
        sessions.len()
    }
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    fn setup(env: &Env) -> (QuizLeaderboardClient, Address) {
        let caller = Address::generate(env);
        let id     = env.register_contract(None, QuizLeaderboard);
        let client = QuizLeaderboardClient::new(env, &id);
        client.initialize(&caller);
        (client, caller)
    }

    #[test]
    fn test_record_and_get_top() {
        let env = Env::default();
        env.mock_all_auths();

        let (client, _caller) = setup(&env);
        let p1 = Address::generate(&env);
        let p2 = Address::generate(&env);

        client.record_session(&p1, &7, &10, &35_000_000);
        client.record_session(&p2, &10, &10, &55_000_000);

        let top = client.get_top(&2);
        assert_eq!(top.len(), 2);
        // sorted desc by earned — p2 first
        assert_eq!(top.get(0).unwrap().earned, 55_000_000);
        assert_eq!(top.get(1).unwrap().earned, 35_000_000);
    }

    #[test]
    fn test_get_player_best() {
        let env = Env::default();
        env.mock_all_auths();

        let (client, _caller) = setup(&env);
        let p1 = Address::generate(&env);

        client.record_session(&p1, &5, &10, &25_000_000);
        client.record_session(&p1, &8, &10, &40_000_000);

        let best = client.get_player_best(&p1).unwrap();
        assert_eq!(best.earned, 40_000_000);
        assert_eq!(best.correct, 8);
    }

    #[test]
    fn test_session_count() {
        let env = Env::default();
        env.mock_all_auths();

        let (client, _caller) = setup(&env);
        let p = Address::generate(&env);

        assert_eq!(client.session_count(), 0);
        client.record_session(&p, &3, &10, &15_000_000);
        assert_eq!(client.session_count(), 1);
    }
}