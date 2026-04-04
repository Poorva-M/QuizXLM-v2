//! QuizLeaderboard contract — stores and ranks quiz sessions on-chain.
//!
//! Called via inter-contract call from QuizRewardContract::send_reward().
//! Exposes:
//!   - initialize(admin)
//!   - record_session(player, correct, total, earned)  → state-changing
//!   - get_top(n)                                       → read-only
//!   - get_player_best(player)                          → read-only
//!   - session_count()                                  → read-only

use soroban_sdk::{
    contract, contractimpl, contracttype,
    symbol_short,
    vec, Vec,
    Address, Env, Symbol,
};

const SESSIONS_KEY: Symbol = symbol_short!("SESSIONS");
const ADMIN_KEY:    Symbol = symbol_short!("ADMIN");

#[contracttype]
#[derive(Clone, Debug)]
pub struct SessionRecord {
    pub player:    Address,
    pub correct:   u32,
    pub total:     u32,
    pub earned:    i128,
    pub timestamp: u64,
}

#[contract]
pub struct QuizLeaderboard;

#[contractimpl]
impl QuizLeaderboard {

    /// One-time initialization. Stores the admin address.
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&ADMIN_KEY, &admin);
    }

    /// Record a completed quiz session.
    /// Called by QuizRewardContract via inter-contract call.
    pub fn record_session(
        env:     Env,
        player:  Address,
        correct: u32,
        total:   u32,
        earned:  i128,
    ) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("Leaderboard not initialized");
        admin.require_auth();

        let record = SessionRecord {
            player,
            correct,
            total,
            earned,
            timestamp: env.ledger().timestamp(),
        };

        let mut sessions: Vec<SessionRecord> = env
            .storage()
            .instance()
            .get(&SESSIONS_KEY)
            .unwrap_or(vec![&env]);

        sessions.push_back(record);
        env.storage().instance().set(&SESSIONS_KEY, &sessions);
    }

    /// Return the top-N sessions sorted by earned (descending).
    pub fn get_top(env: Env, n: u32) -> Vec<SessionRecord> {
        let sessions: Vec<SessionRecord> = env
            .storage()
            .instance()
            .get(&SESSIONS_KEY)
            .unwrap_or(vec![&env]);

        let len = sessions.len();
        let take = if n < len { n } else { len };

        let mut sorted: Vec<SessionRecord> = vec![&env];
        for i in 0..len {
            sorted.push_back(sessions.get(i).unwrap());
        }

        // Bubble sort descending by earned
        let slen = sorted.len();
        for i in 0..slen {
            for j in 0..(slen - i - 1) {
                let a = sorted.get(j).unwrap();
                let b = sorted.get(j + 1).unwrap();
                if a.earned < b.earned {
                    sorted.set(j,     b.clone());
                    sorted.set(j + 1, a.clone());
                }
            }
        }

        let mut result: Vec<SessionRecord> = vec![&env];
        for i in 0..take {
            result.push_back(sorted.get(i).unwrap());
        }
        result
    }

    /// Return the best session for a specific player.
    pub fn get_player_best(env: Env, player: Address) -> Option<SessionRecord> {
        let sessions: Vec<SessionRecord> = env
            .storage()
            .instance()
            .get(&SESSIONS_KEY)
            .unwrap_or(vec![&env]);

        let mut best: Option<SessionRecord> = None;
        for i in 0..sessions.len() {
            let s = sessions.get(i).unwrap();
            if s.player == player {
                match &best {
                    None => best = Some(s),
                    Some(b) if s.earned > b.earned => best = Some(s),
                    _ => {}
                }
            }
        }
        best
    }

    /// Return total number of recorded sessions.
    pub fn session_count(env: Env) -> u32 {
        let sessions: Vec<SessionRecord> = env
            .storage()
            .instance()
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

    fn setup(env: &Env) -> (Address, QuizLeaderboardClient) {
        env.mock_all_auths();
        let admin = Address::generate(env);
        let contract_id = env.register_contract(None, QuizLeaderboard);
        let client = QuizLeaderboardClient::new(env, &contract_id);
        client.initialize(&admin);
        (admin, client)
    }

    #[test]
    fn test_record_and_get_top() {
        let env = Env::default();
        env.mock_all_auths();
        let (_admin, client) = setup(&env);

        let p1 = Address::generate(&env);
        let p2 = Address::generate(&env);
        let p3 = Address::generate(&env);

        client.record_session(&p1, &8,  &10, &40_000_000);
        client.record_session(&p2, &5,  &10, &25_000_000);
        client.record_session(&p3, &10, &10, &90_000_000);

        let top = client.get_top(&3);
        assert_eq!(top.len(), 3);
        assert_eq!(top.get(0).unwrap().earned, 90_000_000);
        assert_eq!(top.get(1).unwrap().earned, 40_000_000);
        assert_eq!(top.get(2).unwrap().earned, 25_000_000);
    }

    #[test]
    fn test_get_top_fewer_than_n() {
        let env = Env::default();
        env.mock_all_auths();
        let (_admin, client) = setup(&env);
        let p = Address::generate(&env);
        client.record_session(&p, &3, &10, &15_000_000);
        assert_eq!(client.get_top(&10).len(), 1);
    }

    #[test]
    fn test_session_count() {
        let env = Env::default();
        env.mock_all_auths();
        let (_admin, client) = setup(&env);
        let p = Address::generate(&env);

        assert_eq!(client.session_count(), 0);
        client.record_session(&p, &5, &10, &25_000_000);
        assert_eq!(client.session_count(), 1);
    }

    #[test]
    fn test_get_player_best() {
        let env = Env::default();
        env.mock_all_auths();
        let (_admin, client) = setup(&env);
        let p = Address::generate(&env);

        client.record_session(&p, &3, &10, &15_000_000);
        client.record_session(&p, &9, &10, &45_000_000);
        client.record_session(&p, &6, &10, &30_000_000);

        let best = client.get_player_best(&p).unwrap();
        assert_eq!(best.earned, 45_000_000);
    }

    #[test]
    fn test_get_player_best_none() {
        let env = Env::default();
        env.mock_all_auths();
        let (_admin, client) = setup(&env);
        let p = Address::generate(&env);
        assert!(client.get_player_best(&p).is_none());
    }

    #[test]
    fn test_empty_leaderboard() {
        let env = Env::default();
        env.mock_all_auths();
        let (_admin, client) = setup(&env);
        assert_eq!(client.get_top(&10).len(), 0);
    }
}