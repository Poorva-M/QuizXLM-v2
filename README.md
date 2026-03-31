QuizXLM is a decentralized quiz application built on the Stellar network.
Users can connect their wallet, answer quiz questions, and earn XLM rewards based on performance.

This Level-4 version extends the Level-3 project with advanced blockchain and UI features like inter-contract calls, leaderboard tracking, CI/CD pipeline, and mobile responsiveness.

✨ Features
🧠 Core Features
Timed quiz system
Reward distribution in XLM
Streak-based bonus rewards
Wallet connection using Freighter
⚡ Advanced Level-4 Features
🔗 Inter-contract calls
Reward contract calls leaderboard contract after payout
🏆 Leaderboard system
Stores top scores on-chain
🎯 50-50 Lifeline
Removes 2 incorrect options (limited usage)
📊 Review Answers Screen
Detailed performance breakdown
📱 Mobile Responsive UI
🔄 CI/CD Pipeline (GitHub Actions)


🏗️ Tech Stack:
Frontend: React (Vite)
Blockchain: Soroban (Stellar Smart Contracts)
Wallet: Freighter
CI/CD: GitHub Actions


🔗 Live Demo:
Example: https://quiz-xlm-v2.vercel.app


📸 Screenshots:
📱 Mobile Responsive View
<img width="1919" height="1017" alt="Screenshot 2026-03-31 192822" src="https://github.com/user-attachments/assets/32aa69db-a9e4-4c4b-bfaf-7bb35918f345" />




📜 Smart Contracts:
1️⃣ Quiz Reward Contract
Handles:
Answer submission
Reward calculation
XLM transfer

2️⃣ Leaderboard Contract
Stores:
Player scores
Top rankings


📍 Contract Details:
Transaction Hash (example): be738723b6d6b5495af51081dedbc709686b5cee372892de769a230d340c5bfc


💰 Token / Pool Info:
❌ No custom token used
✅ Rewards are distributed in native XLM


🧾 Git Commit History (Required 8+):

1	feat(contract): add QuizRewardContract with reward logic
2	feat(contract): add Leaderboard contract
3	feat(contract): inter-contract call for leaderboard update
4	feat(ui): add Quiz component with timer & rewards
5	feat(ui): add 50-50 lifeline
6	feat(ui): add Review Answers screen
7	fix(ui): mobile responsive layout
8	ci: add GitHub Actions pipeline
9	feat(ui): add Leaderboard UI
10	feat(wallet): integrate Freighter wallet
