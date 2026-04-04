#![no_std]

//! QuizXLM contracts crate.
//!
//! Contains two contracts in one crate:
//!   - QuizRewardContract  (this file)  — reward calculation + XLM transfer
//!   - QuizLeaderboard     (leaderboard.rs) — on-chain session ranking
//!
//! QuizRewardContract calls QuizLeaderboard::record_session()
//! via inter-contract call inside send_reward().

pub mod leaderboard;

use soroban_sdk::{
    contract, contractimpl, contracttype,
    token, symbol_short,
    Address, Env, Symbol,
};

// ── Storage Keys ──────────────────────────────────────────────
const REWARD_KEY: Symbol = symbol_short!("REWARD");

// ── Reward Constants (in stroops: 1 XLM = 10_000_000 stroops) ─
const REWARD_PER_CORRECT: i128 = 5_000_000;   // 0.5 XLM
const STREAK_BONUS:       i128 = 50_000_000;  // 5 XLM
const STREAK_THRESHOLD:   u32  = 5;

// ── PlayerScore ───────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug)]
pub struct PlayerScore {
    pub correct: u32,
    pub total:   u32,
    pub earned:  i128,
}

// ── RewardResult ──────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug)]
pub struct RewardResult {
    pub base_reward:  i128,
    pub streak_bonus: i128,
    pub total_reward: i128,
}

// ── Inter-contract client for QuizLeaderboard ─────────────────
mod leaderboard_client {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "LeaderboardClient")]
    pub trait QuizLeaderboard {
        fn record_session(
            env:     Env,
            player:  Address,
            correct: u32,
            total:   u32,
            earned:  i128,
        );
    }
}

#[contract]
pub struct QuizRewardContract;

#[contractimpl]
impl QuizRewardContract {

    /// Initialize: stores admin, token, and leaderboard contract addresses.
    pub fn initialize(
        env:         Env,
        admin:       Address,
        token:       Address,
        leaderboard: Address,
    ) {
        admin.require_auth();
        env.storage().instance().set(&symbol_short!("ADMIN"),  &admin);
        env.storage().instance().set(&symbol_short!("TOKEN"),  &token);
        env.storage().instance().set(&symbol_short!("LB"),     &leaderboard);
        env.storage().instance().set(&REWARD_KEY, &REWARD_PER_CORRECT);
    }

    /// Submit a quiz answer — pays reward if correct.
    pub fn submit_answer(env: Env, player: Address, is_correct: bool) -> i128 {
        player.require_auth();

        let score_key = (symbol_short!("SCORE"), player.clone());
        let mut score: PlayerScore = env
            .storage()
            .persistent()
            .get(&score_key)
            .unwrap_or(PlayerScore { correct: 0, total: 0, earned: 0 });

        score.total += 1;

        if !is_correct {
            env.storage().persistent().set(&score_key, &score);
            return 0;
        }

        let reward: i128 = env
            .storage()
            .instance()
            .get(&REWARD_KEY)
            .unwrap_or(REWARD_PER_CORRECT);

        score.correct += 1;
        score.earned  += reward;
        env.storage().persistent().set(&score_key, &score);

        env.events().publish(
            (symbol_short!("REWARD"), player.clone()),
            reward,
        );

        reward
    }

    /// Pure function — calculate reward for a completed session.
    pub fn calculate_reward(
        _env:            Env,
        correct_answers: u32,
        max_streak:      u32,
    ) -> RewardResult {
        let base_reward  = (correct_answers as i128) * REWARD_PER_CORRECT;
        let streak_bonus = if max_streak >= STREAK_THRESHOLD { STREAK_BONUS } else { 0 };
        RewardResult {
            base_reward,
            streak_bonus,
            total_reward: base_reward + streak_bonus,
        }
    }

    /// Send reward to player and record session on-chain via inter-contract call.
    pub fn send_reward(
        env:             Env,
        admin:           Address,
        player:          Address,
        correct_answers: u32,
        total_questions: u32,
        max_streak:      u32,
    ) -> i128 {
        admin.require_auth();

        let result = Self::calculate_reward(env.clone(), correct_answers, max_streak);
        if result.total_reward == 0 {
            return 0;
        }

        // Step 1: Transfer XLM via token contract
        let token_address: Address = env
            .storage()
            .instance()
            .get(&symbol_short!("TOKEN"))
            .expect("Token not initialized");

        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(
            &env.current_contract_address(),
            &player,
            &result.total_reward,
        );

        env.events().publish(
            (symbol_short!("PAYOUT"), player.clone()),
            result.total_reward,
        );

        // Step 2: Inter-contract call → QuizLeaderboard::record_session
        let leaderboard_address: Address = env
            .storage()
            .instance()
            .get(&symbol_short!("LB"))
            .expect("Leaderboard not initialized");

        let lb_client = leaderboard_client::LeaderboardClient::new(&env, &leaderboard_address);
        lb_client.record_session(
            &player,
            &correct_answers,
            &total_questions,
            &result.total_reward,
        );

        result.total_reward
    }

    /// Get a player's cumulative on-chain score.
    pub fn get_score(env: Env, player: Address) -> PlayerScore {
        let score_key = (symbol_short!("SCORE"), player);
        env.storage()
            .persistent()
            .get(&score_key)
            .unwrap_or(PlayerScore { correct: 0, total: 0, earned: 0 })
    }

    /// Get the current reward per correct answer in stroops.
    pub fn get_reward(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&REWARD_KEY)
            .unwrap_or(REWARD_PER_CORRECT)
    }

    /// Get the contract's XLM balance in stroops.
    pub fn get_balance(env: Env) -> i128 {
        let token_address: Address = env
            .storage()
            .instance()
            .get(&symbol_short!("TOKEN"))
            .expect("Token not initialized");
        let token_client = token::Client::new(&env, &token_address);
        token_client.balance(&env.current_contract_address())
    }
}

// ─────────────────────────────────────────────────────────────
// TESTS — QuizRewardContract
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token, Address, Env,
    };
    use token::Client as TokenClient;
    use token::StellarAssetClient as StellarAssetTokenClient;

    fn create_token<'a>(
        env: &Env,
        admin: &Address,
    ) -> (TokenClient<'a>, StellarAssetTokenClient<'a>) {
        let sac = env.register_stellar_asset_contract_v2(admin.clone());
        (
            TokenClient::new(env, &sac.address()),
            StellarAssetTokenClient::new(env, &sac.address()),
        )
    }

    fn mock_leaderboard(env: &Env) -> Address {
        Address::generate(env)
    }

    #[test]
    fn test_correct_answer_pays_reward() {
        let env = Env::default();
        env.mock_all_auths();

        let admin  = Address::generate(&env);
        let player = Address::generate(&env);
        let (token, token_admin) = create_token(&env, &admin);
        let lb = mock_leaderboard(&env);

        let contract_id = env.register_contract(None, QuizRewardContract);
        let client = QuizRewardContractClient::new(&env, &contract_id);

        token_admin.mint(&contract_id, &10_000_000_000);
        client.initialize(&admin, &token.address, &lb);

        let reward = client.submit_answer(&player, &true);
        assert_eq!(reward, REWARD_PER_CORRECT);
    }

    #[test]
    fn test_wrong_answer_no_reward() {
        let env = Env::default();
        env.mock_all_auths();

        let admin  = Address::generate(&env);
        let player = Address::generate(&env);
        let (token, token_admin) = create_token(&env, &admin);
        let lb = mock_leaderboard(&env);

        let contract_id = env.register_contract(None, QuizRewardContract);
        let client = QuizRewardContractClient::new(&env, &contract_id);

        token_admin.mint(&contract_id, &10_000_000_000);
        client.initialize(&admin, &token.address, &lb);

        let reward = client.submit_answer(&player, &false);
        assert_eq!(reward, 0);
    }

    #[test]
    fn test_calculate_reward_with_streak() {
        let env = Env::default();
        let contract_id = env.register_contract(None, QuizRewardContract);
        let client = QuizRewardContractClient::new(&env, &contract_id);

        let result = client.calculate_reward(&8, &5);
        assert_eq!(result.base_reward,  8 * REWARD_PER_CORRECT);
        assert_eq!(result.streak_bonus, STREAK_BONUS);
        assert_eq!(result.total_reward, 8 * REWARD_PER_CORRECT + STREAK_BONUS);
    }

    #[test]
    fn test_calculate_reward_no_streak_bonus() {
        let env = Env::default();
        let contract_id = env.register_contract(None, QuizRewardContract);
        let client = QuizRewardContractClient::new(&env, &contract_id);

        let result = client.calculate_reward(&3, &2);
        assert_eq!(result.streak_bonus, 0);
        assert_eq!(result.total_reward, 3 * REWARD_PER_CORRECT);
    }

    #[test]
    fn test_score_accumulates() {
        let env = Env::default();
        env.mock_all_auths();

        let admin  = Address::generate(&env);
        let player = Address::generate(&env);
        let (token, token_admin) = create_token(&env, &admin);
        let lb = mock_leaderboard(&env);

        let contract_id = env.register_contract(None, QuizRewardContract);
        let client = QuizRewardContractClient::new(&env, &contract_id);

        token_admin.mint(&contract_id, &10_000_000_000);
        client.initialize(&admin, &token.address, &lb);

        client.submit_answer(&player, &true);
        client.submit_answer(&player, &false);
        client.submit_answer(&player, &true);

        let score = client.get_score(&player);
        assert_eq!(score.correct, 2);
        assert_eq!(score.total,   3);
        assert_eq!(score.earned,  2 * REWARD_PER_CORRECT);
    }

    #[test]
    fn test_zero_answers_no_reward() {
        let env = Env::default();
        let contract_id = env.register_contract(None, QuizRewardContract);
        let client = QuizRewardContractClient::new(&env, &contract_id);

        let result = client.calculate_reward(&0, &0);
        assert_eq!(result.total_reward, 0);
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}