
# 🌟 QuizXLM-v2

QuizXLM is a decentralized quiz application built on the Stellar network.  
Users can connect their wallet, answer quiz questions, and earn XLM rewards based on performance.

This Level-4 version extends the Level-3 project with advanced blockchain and UI features like inter-contract calls, leaderboard tracking, CI/CD pipeline, and mobile responsiveness.

---

## ✨ Features

### 🧠 Core Features
- Timed quiz system
- Reward distribution in XLM
- Streak-based bonus rewards
- Wallet connection using Freighter

### ⚡ Advanced Level-4 Features
- Inter-contract calls
- Leaderboard system (on-chain)
- 50-50 lifeline
- Review answers screen
- Mobile responsive UI
- CI/CD pipeline

---

## 🔗 Live Demo
https://quiz-xlm-v2.vercel.app

---

## 🌐 Deployment
This app is deployed on **Vercel**

---

## 🧪 CI/CD Pipeline
Implemented using **GitHub Actions**

Pipeline includes:
- Smart contract build & test (Rust)
- Frontend testing (Vitest)
- Build & deployment

---

## 📸 Screenshots

### 📱 Mobile Responsive View
<p align="center">
  <img src="https://github.com/user-attachments/assets/32aa69db-a9e4-4c4b-bfaf-7bb35918f345" width="650"/>
</p>

---

## 📜 Smart Contracts

### 1️⃣ Quiz Reward Contract
- Answer submission  
- Reward calculation  
- XLM transfer  

### 2️⃣ Leaderboard Contract
- Stores player scores  
- Maintains top rankings  

---

## 📍 Contract Details
Transaction Hash: `be738723b6d6b5495af51081dedbc709686b5cee372892de769a230d340c5bfc`

---

## 💰 Token / Pool Info
- ❌ No custom token used  
- ✅ Rewards are distributed in native XLM  

---

## ⚙️ CI/CD Pipeline
![CI](https://github.com/Poorva-M/QuizXLM-v2/actions/workflows/ci.yml/badge.svg)

---

## 🧾 Git Commit History

| # | Commit Message |
|--|--|
| 1 | feat(contract): add QuizRewardContract |
| 2 | feat(contract): add Leaderboard contract |
| 3 | feat(contract): inter-contract call |
| 4 | feat(ui): Quiz component |
| 5 | feat(ui): 50-50 lifeline |
| 6 | feat(ui): Review screen |
| 7 | fix(ui): responsive layout |
| 8 | ci: GitHub Actions pipeline |
| 9 | feat(ui): Leaderboard |
| 10 | feat(wallet): Freighter integration |

---