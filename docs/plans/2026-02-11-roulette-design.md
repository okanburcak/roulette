# Online Multiplayer Roulette - Design Document

## Overview
A single-page online multiplayer European roulette game. One shared table where all connected players play together. Full casino experience with animated wheel, sound effects, and chat.

## Tech Stack
- **Client:** React + Vite + TypeScript, Socket.IO client
- **Server:** Node.js + Express + TypeScript, Socket.IO

## Architecture
- Server is the single source of truth for game state, bets, balances, and spin results
- Clients send bet actions and receive state broadcasts
- One shared table — all players see each other's bets
- RNG via `crypto.randomInt()` for fairness

## Game Flow
1. **BETTING phase (20s)** — Countdown broadcasts every second. Players place/remove bets.
2. **SPINNING phase (~5s)** — Betting locks. Server generates result (0-36). Clients animate wheel.
3. **RESULT phase (5s)** — Payouts calculated server-side. Results displayed.
4. **Repeat** — New round starts automatically.

## Player Lifecycle
- On connect: random display name, assigned chip color, 1000 starting chips
- Minimum bet: 1 chip. Maximum bet: 500 per position.
- 0 chips: "Rebuy" button resets to 1000
- Disconnect during betting: bets refunded. During spin: bets forfeited.

## Bet Types & Payouts
| Bet Type    | Payout |
|-------------|--------|
| Straight Up | 35:1   |
| Split       | 17:1   |
| Street      | 11:1   |
| Corner      | 8:1    |
| Six Line    | 5:1    |
| Dozen       | 2:1    |
| Column      | 2:1    |
| Red/Black   | 1:1    |
| Odd/Even    | 1:1    |
| High/Low    | 1:1    |

## UI Layout
- **Left:** Chat box
- **Center:** Roulette wheel (top) + betting table (bottom)
- **Right:** Player list with balances, last 10 results

## Visual & Audio
- CSS/Canvas animated wheel with European pocket order
- Ball orbit + deceleration + drop animation
- Sound effects: ball bouncing, chip clicks, win/lose, countdown ticks, chat notification
- Dark green felt background, classic casino aesthetic
- Chip denominations: 1 (white), 5 (red), 10 (blue), 25 (green), 100 (black)
- Winning bets highlighted gold, winning number glows
- Responsive: desktop-first, mobile-friendly stacked layout
