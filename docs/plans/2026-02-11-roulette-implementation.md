# Online Multiplayer Roulette - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-featured online multiplayer European roulette game with animated wheel, real-time betting, chat, and casino-quality visuals.

**Architecture:** Single Express+Socket.IO server manages one shared game table — all state lives server-side. React+Vite client renders the wheel, betting table, chat, and player list. TypeScript throughout. Server runs a continuous round loop (BETTING → SPINNING → RESULT → repeat). Clients communicate via Socket.IO events only.

**Tech Stack:** Node.js, Express, Socket.IO, React 18, Vite, TypeScript, HTML5 Canvas (wheel animation), CSS (casino styling), Web Audio API (sound effects)

---

### Task 1: Project Scaffolding — Server

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`

**Step 1: Initialize server project**

```bash
cd /opt/projects/roulette
mkdir -p server/src
```

Create `server/package.json`:
```json
{
  "name": "roulette-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

Create `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

Create `server/src/index.ts` (minimal server to verify setup):
```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Roulette server running on port ${PORT}`);
});
```

**Step 2: Install dependencies and verify**

```bash
cd /opt/projects/roulette/server && npm install
```

**Step 3: Test that server starts**

```bash
cd /opt/projects/roulette/server && npx tsx src/index.ts
```

Expected: "Roulette server running on port 3001"

**Step 4: Commit**

```bash
git add server/
git commit -m "feat: scaffold roulette server with Express + Socket.IO + TypeScript"
```

---

### Task 2: Project Scaffolding — Client

**Files:**
- Create: `client/` (via Vite scaffold)
- Modify: `client/src/App.tsx`
- Create: `client/src/socket.ts`

**Step 1: Scaffold React + TypeScript client with Vite**

```bash
cd /opt/projects/roulette
npm create vite@latest client -- --template react-ts
cd client && npm install socket.io-client
```

**Step 2: Create Socket.IO client helper**

Create `client/src/socket.ts`:
```typescript
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

export const socket = io(SERVER_URL, {
  autoConnect: true,
});
```

**Step 3: Update App.tsx to verify connection**

Replace `client/src/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { socket } from './socket';

function App() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return (
    <div>
      <h1>Roulette</h1>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
    </div>
  );
}

export default App;
```

**Step 4: Run both server and client, verify connection**

Terminal 1: `cd /opt/projects/roulette/server && npm run dev`
Terminal 2: `cd /opt/projects/roulette/client && npm run dev`

Expected: Browser shows "Status: Connected", server logs "Player connected: ..."

**Step 5: Commit**

```bash
git add client/
git commit -m "feat: scaffold roulette client with React + Vite + TypeScript + Socket.IO"
```

---

### Task 3: Shared Types

**Files:**
- Create: `shared/types.ts`

This file will be symlinked or copied into both client and server. It defines all shared interfaces.

**Step 1: Create shared types**

Create `shared/types.ts`:
```typescript
// === Game Phases ===
export type GamePhase = 'betting' | 'spinning' | 'result';

// === Bet Types ===
export type BetType =
  | 'straight'
  | 'split'
  | 'street'
  | 'corner'
  | 'sixline'
  | 'dozen'
  | 'column'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high';

export interface Bet {
  id: string;
  playerId: string;
  type: BetType;
  numbers: number[];   // The actual numbers covered by this bet
  amount: number;
}

export interface Player {
  id: string;
  name: string;
  chipColor: string;
  balance: number;
  bets: Bet[];
}

// === Server → Client Events ===
export interface GameState {
  phase: GamePhase;
  countdown: number;          // seconds remaining in current phase
  players: Player[];
  result: number | null;       // winning number (null during betting)
  history: number[];           // last 10 results
}

export interface SpinResult {
  winningNumber: number;
  payouts: Record<string, number>;  // playerId → amount won
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
}

// === Client → Server Events ===
export interface PlaceBetPayload {
  type: BetType;
  numbers: number[];
  amount: number;
}

export interface RemoveBetPayload {
  betId: string;
}

export interface ChatPayload {
  text: string;
}

// === Socket Event Maps ===
export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:countdown': (seconds: number) => void;
  'game:spin': (result: SpinResult) => void;
  'game:newRound': () => void;
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'player:identity': (player: Player) => void;
  'bet:placed': (bet: Bet) => void;
  'bet:removed': (betId: string, playerId: string) => void;
  'bet:error': (message: string) => void;
  'chat:message': (message: ChatMessage) => void;
}

export interface ClientToServerEvents {
  'bet:place': (payload: PlaceBetPayload) => void;
  'bet:remove': (payload: RemoveBetPayload) => void;
  'bet:clear': () => void;
  'chat:send': (payload: ChatPayload) => void;
  'player:rebuy': () => void;
}
```

**Step 2: Configure both projects to reference shared types**

Add to `server/tsconfig.json` paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src/**/*", "../shared/**/*"]
}
```

Add to `client/tsconfig.json` (or `tsconfig.app.json`):
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src/**/*", "../shared/**/*"]
}
```

Update `client/vite.config.ts` to resolve the alias:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
});
```

**Step 3: Commit**

```bash
git add shared/ server/tsconfig.json client/tsconfig.json client/tsconfig.app.json client/vite.config.ts
git commit -m "feat: add shared types for game state, bets, and socket events"
```

---

### Task 4: Roulette Game Engine (Server)

**Files:**
- Create: `server/src/roulette.ts`

This is the core game logic — number properties, bet validation, payout calculation. No Socket.IO here, pure logic.

**Step 1: Create roulette engine**

Create `server/src/roulette.ts`:
```typescript
import crypto from 'crypto';
import type { BetType } from '../../shared/types.js';

// European roulette wheel order
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export const PAYOUT_MULTIPLIERS: Record<BetType, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  sixline: 5,
  dozen: 2,
  column: 2,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
};

// Expected number coverage for each bet type
const EXPECTED_NUMBERS_COUNT: Record<BetType, number> = {
  straight: 1,
  split: 2,
  street: 3,
  corner: 4,
  sixline: 6,
  dozen: 12,
  column: 12,
  red: 18,
  black: 18,
  odd: 18,
  even: 18,
  low: 18,
  high: 18,
};

export function spin(): number {
  return crypto.randomInt(0, 37); // 0-36 inclusive
}

export function isRed(n: number): boolean {
  return RED_NUMBERS.includes(n);
}

export function isBlack(n: number): boolean {
  return BLACK_NUMBERS.includes(n);
}

export function validateBet(type: BetType, numbers: number[], amount: number): string | null {
  if (amount < 1) return 'Minimum bet is 1 chip';
  if (amount > 500) return 'Maximum bet is 500 chips per position';

  // Check all numbers are in valid range
  for (const n of numbers) {
    if (n < 0 || n > 36 || !Number.isInteger(n)) {
      return `Invalid number: ${n}`;
    }
  }

  const expected = EXPECTED_NUMBERS_COUNT[type];
  if (!expected) return `Invalid bet type: ${type}`;
  if (numbers.length !== expected) {
    return `${type} bet requires exactly ${expected} numbers, got ${numbers.length}`;
  }

  return null; // valid
}

export function doesBetWin(type: BetType, numbers: number[], winningNumber: number): boolean {
  return numbers.includes(winningNumber);
}

export function calculatePayout(type: BetType, amount: number): number {
  return amount * PAYOUT_MULTIPLIERS[type] + amount; // winnings + original bet
}
```

**Step 2: Commit**

```bash
git add server/src/roulette.ts
git commit -m "feat: add roulette game engine with spin, validation, and payout logic"
```

---

### Task 5: Game Room Manager (Server)

**Files:**
- Create: `server/src/gameRoom.ts`

Manages the shared game table: player tracking, round lifecycle, bet handling, payouts.

**Step 1: Create game room manager**

Create `server/src/gameRoom.ts`:
```typescript
import { v4 as uuidv4 } from 'uuid';  // NOTE: use crypto.randomUUID() instead to avoid dep
import crypto from 'crypto';
import type {
  GamePhase, Player, Bet, GameState, SpinResult,
  PlaceBetPayload, BetType
} from '../../shared/types.js';
import { spin, validateBet, doesBetWin, calculatePayout } from './roulette.js';

const BETTING_DURATION = 20;
const SPINNING_DURATION = 5;
const RESULT_DURATION = 5;
const STARTING_BALANCE = 1000;
const CHIP_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#e91e63'];

export class GameRoom {
  private players: Map<string, Player> = new Map();
  private phase: GamePhase = 'betting';
  private countdown: number = BETTING_DURATION;
  private result: number | null = null;
  private history: number[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private colorIndex = 0;

  // Callbacks — set by the socket layer
  onStateChange: ((state: GameState) => void) | null = null;
  onCountdown: ((seconds: number) => void) | null = null;
  onSpinResult: ((result: SpinResult) => void) | null = null;
  onNewRound: (() => void) | null = null;

  start() {
    this.phase = 'betting';
    this.countdown = BETTING_DURATION;
    this.tick();
  }

  private tick() {
    this.timer = setInterval(() => {
      this.countdown--;

      if (this.phase === 'betting') {
        if (this.countdown <= 0) {
          this.startSpinning();
        } else {
          this.onCountdown?.(this.countdown);
        }
      } else if (this.phase === 'spinning') {
        if (this.countdown <= 0) {
          this.showResult();
        }
      } else if (this.phase === 'result') {
        if (this.countdown <= 0) {
          this.startBetting();
        }
      }
    }, 1000);
  }

  private startSpinning() {
    this.phase = 'spinning';
    this.countdown = SPINNING_DURATION;
    this.result = spin();

    // Calculate payouts
    const payouts: Record<string, number> = {};
    for (const [playerId, player] of this.players) {
      let totalWin = 0;
      for (const bet of player.bets) {
        if (doesBetWin(bet.type, bet.numbers, this.result)) {
          totalWin += calculatePayout(bet.type, bet.amount);
        }
      }
      if (totalWin > 0) {
        player.balance += totalWin;
        payouts[playerId] = totalWin;
      }
    }

    // Add to history
    this.history.unshift(this.result);
    if (this.history.length > 10) this.history.pop();

    this.onSpinResult?.({ winningNumber: this.result, payouts });
    this.broadcastState();
  }

  private showResult() {
    this.phase = 'result';
    this.countdown = RESULT_DURATION;
    this.broadcastState();
  }

  private startBetting() {
    // Clear all bets
    for (const player of this.players.values()) {
      player.bets = [];
    }
    this.phase = 'betting';
    this.countdown = BETTING_DURATION;
    this.result = null;
    this.onNewRound?.();
    this.broadcastState();
  }

  addPlayer(socketId: string): Player {
    const color = CHIP_COLORS[this.colorIndex % CHIP_COLORS.length];
    this.colorIndex++;
    const player: Player = {
      id: socketId,
      name: `Player_${socketId.substring(0, 4)}`,
      chipColor: color,
      balance: STARTING_BALANCE,
      bets: [],
    };
    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId: string): void {
    const player = this.players.get(socketId);
    if (!player) return;

    // Refund bets if still in betting phase
    if (this.phase === 'betting') {
      for (const bet of player.bets) {
        player.balance += bet.amount;
      }
    }

    this.players.delete(socketId);
  }

  placeBet(socketId: string, payload: PlaceBetPayload): { bet?: Bet; error?: string } {
    if (this.phase !== 'betting') {
      return { error: 'Betting is closed' };
    }

    const player = this.players.get(socketId);
    if (!player) return { error: 'Player not found' };

    const validationError = validateBet(payload.type, payload.numbers, payload.amount);
    if (validationError) return { error: validationError };

    if (player.balance < payload.amount) {
      return { error: 'Insufficient chips' };
    }

    const bet: Bet = {
      id: crypto.randomUUID(),
      playerId: socketId,
      type: payload.type,
      numbers: payload.numbers,
      amount: payload.amount,
    };

    player.balance -= payload.amount;
    player.bets.push(bet);
    return { bet };
  }

  removeBet(socketId: string, betId: string): { success: boolean; error?: string } {
    if (this.phase !== 'betting') {
      return { success: false, error: 'Betting is closed' };
    }

    const player = this.players.get(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    const betIndex = player.bets.findIndex(b => b.id === betId);
    if (betIndex === -1) return { success: false, error: 'Bet not found' };

    const bet = player.bets[betIndex];
    player.balance += bet.amount;
    player.bets.splice(betIndex, 1);
    return { success: true };
  }

  clearBets(socketId: string): Bet[] {
    if (this.phase !== 'betting') return [];

    const player = this.players.get(socketId);
    if (!player) return [];

    const cleared = [...player.bets];
    for (const bet of cleared) {
      player.balance += bet.amount;
    }
    player.bets = [];
    return cleared;
  }

  rebuy(socketId: string): boolean {
    const player = this.players.get(socketId);
    if (!player) return false;
    if (player.balance > 0) return false;
    player.balance = STARTING_BALANCE;
    return true;
  }

  getState(): GameState {
    return {
      phase: this.phase,
      countdown: this.countdown,
      players: Array.from(this.players.values()),
      result: this.result,
      history: this.history,
    };
  }

  getPlayer(socketId: string): Player | undefined {
    return this.players.get(socketId);
  }

  private broadcastState() {
    this.onStateChange?.(this.getState());
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
```

**Step 2: Install uuid (or use crypto.randomUUID)**

We'll use `crypto.randomUUID()` which is built into Node 19+. No extra dependency needed — it's already in the code above.

**Step 3: Commit**

```bash
git add server/src/gameRoom.ts
git commit -m "feat: add game room manager with round lifecycle, bets, and payouts"
```

---

### Task 6: Socket.IO Wiring (Server)

**Files:**
- Modify: `server/src/index.ts`

Wire the GameRoom to Socket.IO events.

**Step 1: Update server index.ts**

Replace `server/src/index.ts`:
```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ServerToClientEvents, ClientToServerEvents } from '../../shared/types.js';
import { GameRoom } from './gameRoom.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' }
});

const room = new GameRoom();

// Wire callbacks
room.onStateChange = (state) => {
  io.emit('game:state', state);
};

room.onCountdown = (seconds) => {
  io.emit('game:countdown', seconds);
};

room.onSpinResult = (result) => {
  io.emit('game:spin', result);
};

room.onNewRound = () => {
  io.emit('game:newRound');
};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  const player = room.addPlayer(socket.id);
  socket.emit('player:identity', player);
  socket.broadcast.emit('player:joined', player);
  socket.emit('game:state', room.getState());

  socket.on('bet:place', (payload) => {
    const { bet, error } = room.placeBet(socket.id, payload);
    if (error) {
      socket.emit('bet:error', error);
    } else if (bet) {
      io.emit('bet:placed', bet);
      io.emit('game:state', room.getState());
    }
  });

  socket.on('bet:remove', (payload) => {
    const { success, error } = room.removeBet(socket.id, payload.betId);
    if (error) {
      socket.emit('bet:error', error);
    } else if (success) {
      io.emit('bet:removed', payload.betId, socket.id);
      io.emit('game:state', room.getState());
    }
  });

  socket.on('bet:clear', () => {
    const cleared = room.clearBets(socket.id);
    for (const bet of cleared) {
      io.emit('bet:removed', bet.id, socket.id);
    }
    io.emit('game:state', room.getState());
  });

  socket.on('player:rebuy', () => {
    if (room.rebuy(socket.id)) {
      io.emit('game:state', room.getState());
    }
  });

  socket.on('chat:send', (payload) => {
    const p = room.getPlayer(socket.id);
    if (!p) return;
    if (!payload.text || payload.text.trim().length === 0) return;
    io.emit('chat:message', {
      playerId: socket.id,
      playerName: p.name,
      playerColor: p.chipColor,
      text: payload.text.trim().substring(0, 200),
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    room.removePlayer(socket.id);
    io.emit('player:left', socket.id);
    io.emit('game:state', room.getState());
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Roulette server running on port ${PORT}`);
  room.start();
});
```

**Step 2: Test server starts and round timer ticks**

```bash
cd /opt/projects/roulette/server && npx tsx src/index.ts
```

Expected: Server starts, no errors.

**Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: wire Socket.IO events to game room for real-time multiplayer"
```

---

### Task 7: Client State Management

**Files:**
- Create: `client/src/hooks/useGame.ts`
- Create: `client/src/hooks/useChat.ts`

**Step 1: Create game state hook**

Create `client/src/hooks/useGame.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { GameState, Player, Bet, SpinResult, PlaceBetPayload } from '@shared/types';

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [lastSpin, setLastSpin] = useState<SpinResult | null>(null);
  const [betError, setBetError] = useState<string | null>(null);

  useEffect(() => {
    socket.on('player:identity', (player) => setMe(player));
    socket.on('game:state', (state) => {
      setGameState(state);
      // Update our own player data from state
      setMe(prev => {
        if (!prev) return prev;
        const updated = state.players.find(p => p.id === prev.id);
        return updated ?? prev;
      });
    });
    socket.on('game:countdown', (seconds) => {
      setGameState(prev => prev ? { ...prev, countdown: seconds } : prev);
    });
    socket.on('game:spin', (result) => {
      setLastSpin(result);
    });
    socket.on('game:newRound', () => {
      setLastSpin(null);
      setBetError(null);
    });
    socket.on('bet:error', (msg) => {
      setBetError(msg);
      setTimeout(() => setBetError(null), 3000);
    });

    return () => {
      socket.off('player:identity');
      socket.off('game:state');
      socket.off('game:countdown');
      socket.off('game:spin');
      socket.off('game:newRound');
      socket.off('bet:error');
    };
  }, []);

  const placeBet = useCallback((payload: PlaceBetPayload) => {
    socket.emit('bet:place', payload);
  }, []);

  const removeBet = useCallback((betId: string) => {
    socket.emit('bet:remove', { betId });
  }, []);

  const clearBets = useCallback(() => {
    socket.emit('bet:clear');
  }, []);

  const rebuy = useCallback(() => {
    socket.emit('player:rebuy');
  }, []);

  return {
    gameState,
    me,
    lastSpin,
    betError,
    placeBet,
    removeBet,
    clearBets,
    rebuy,
  };
}
```

**Step 2: Create chat hook**

Create `client/src/hooks/useChat.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { ChatMessage } from '@shared/types';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    socket.on('chat:message', (msg) => {
      setMessages(prev => [...prev.slice(-99), msg]);
    });

    return () => {
      socket.off('chat:message');
    };
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (text.trim()) {
      socket.emit('chat:send', { text });
    }
  }, []);

  return { messages, sendMessage };
}
```

**Step 3: Commit**

```bash
git add client/src/hooks/
git commit -m "feat: add useGame and useChat hooks for client state management"
```

---

### Task 8: Roulette Table Constants (Client)

**Files:**
- Create: `client/src/constants/roulette.ts`

Defines the table layout, number positions, colors, adjacency maps needed for the betting board UI.

**Step 1: Create roulette constants**

Create `client/src/constants/roulette.ts`:
```typescript
import type { BetType } from '@shared/types';

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26
];

export function getNumberColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return RED_NUMBERS.includes(n) ? 'red' : 'black';
}

// Table layout: 3 columns x 12 rows
// Row 0: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]  (top row)
// Row 1: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]
// Row 2: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]  (bottom row)
export const TABLE_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

export const DOZENS: Record<string, number[]> = {
  '1st12': Array.from({ length: 12 }, (_, i) => i + 1),
  '2nd12': Array.from({ length: 12 }, (_, i) => i + 13),
  '3rd12': Array.from({ length: 12 }, (_, i) => i + 25),
};

export const COLUMNS: Record<string, number[]> = {
  'col1': [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  'col2': [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  'col3': [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
};

export const CHIP_DENOMINATIONS = [
  { value: 1, color: '#ffffff', label: '1' },
  { value: 5, color: '#e74c3c', label: '5' },
  { value: 10, color: '#3498db', label: '10' },
  { value: 25, color: '#2ecc71', label: '25' },
  { value: 100, color: '#1a1a2e', label: '100' },
];

// Helper to get street (row of 3) for a number
export function getStreet(n: number): number[] {
  if (n === 0) return [0];
  const base = Math.ceil(n / 3) * 3 - 2;
  return [base, base + 1, base + 2];
}
```

**Step 2: Commit**

```bash
git add client/src/constants/
git commit -m "feat: add roulette table constants, colors, and layout helpers"
```

---

### Task 9: Betting Table Component

**Files:**
- Create: `client/src/components/BettingTable.tsx`
- Create: `client/src/components/BettingTable.css`

The interactive betting board where players click to place chips. This is the most complex UI component.

**Step 1: Create BettingTable component**

Create `client/src/components/BettingTable.tsx` — a full European roulette table layout rendered with HTML/CSS grid. Each cell and edge is clickable for the corresponding bet type. Placed chips are rendered as small colored circles on their positions. All players' bets are shown.

Key behaviors:
- Clicking a number cell → straight bet at selected denomination
- Clicking between two numbers → split bet
- Clicking a row header → street bet
- Clicking between two rows → sixline bet
- Clicking corner intersection → corner bet
- Bottom areas for dozens, columns, red/black, odd/even, high/low
- Right-click to undo last chip on that position
- Show all players' chips as small colored circles

This component receives: `selectedChip`, `onPlaceBet`, `bets` (all players), `me`, `phase`, `winningNumber`.

Full implementation will be a CSS grid layout with interactive overlay zones for split/corner/street/sixline detection.

**Step 2: Create BettingTable.css**

Dark green felt background. Gold borders. Number cells colored red/black/green. Hover highlights. Chip indicators. Winning number glow animation.

**Step 3: Commit**

```bash
git add client/src/components/BettingTable.tsx client/src/components/BettingTable.css
git commit -m "feat: add interactive betting table with all bet types and chip placement"
```

---

### Task 10: Roulette Wheel Component (Canvas)

**Files:**
- Create: `client/src/components/RouletteWheel.tsx`
- Create: `client/src/components/RouletteWheel.css`

HTML5 Canvas animated wheel with ball physics.

**Step 1: Create RouletteWheel component**

Create `client/src/components/RouletteWheel.tsx`:

Canvas-based component that:
- Draws the 37-pocket European wheel with correct pocket order and colors
- When `spinning=true` and `targetNumber` is set: animates wheel rotation (CSS or canvas) and a ball that orbits, decelerates, and lands in the target pocket
- Animation duration: ~4 seconds spin, ~1 second settle
- Idle state: wheel is static, shows last winning number highlighted
- The wheel is drawn with: outer rim, pocket dividers, numbers, inner decoration

Props: `spinning: boolean`, `targetNumber: number | null`, `onSpinComplete: () => void`

**Step 2: Create RouletteWheel.css**

Center the canvas, add subtle shadow/glow.

**Step 3: Commit**

```bash
git add client/src/components/RouletteWheel.tsx client/src/components/RouletteWheel.css
git commit -m "feat: add animated roulette wheel with ball physics on canvas"
```

---

### Task 11: Chip Selector Component

**Files:**
- Create: `client/src/components/ChipSelector.tsx`
- Create: `client/src/components/ChipSelector.css`

**Step 1: Create ChipSelector**

A horizontal tray of chip denominations (1, 5, 10, 25, 100). Player clicks to select which denomination to bet. Selected chip is highlighted. Shows current balance.

Props: `selectedValue`, `onSelect`, `balance`

**Step 2: Commit**

```bash
git add client/src/components/ChipSelector.tsx client/src/components/ChipSelector.css
git commit -m "feat: add chip denomination selector component"
```

---

### Task 12: Chat Component

**Files:**
- Create: `client/src/components/Chat.tsx`
- Create: `client/src/components/Chat.css`

**Step 1: Create Chat component**

Scrollable message list + input field. Messages show player name in their chip color. Auto-scrolls to bottom on new messages. Enter to send. Max 200 chars.

Props: `messages`, `onSend`

**Step 2: Commit**

```bash
git add client/src/components/Chat.tsx client/src/components/Chat.css
git commit -m "feat: add multiplayer chat component"
```

---

### Task 13: Players Panel & History

**Files:**
- Create: `client/src/components/PlayersPanel.tsx`
- Create: `client/src/components/PlayersPanel.css`

**Step 1: Create PlayersPanel**

Shows list of connected players with name, chip color indicator, and balance. Current player highlighted. Also shows the last 10 spin results as colored number badges (red/black/green).

Props: `players`, `myId`, `history`

**Step 2: Commit**

```bash
git add client/src/components/PlayersPanel.tsx client/src/components/PlayersPanel.css
git commit -m "feat: add players panel with balances and spin history"
```

---

### Task 14: Sound Effects

**Files:**
- Create: `client/src/hooks/useSound.ts`
- Create: `client/public/sounds/` (generated programmatically with Web Audio API)

**Step 1: Create useSound hook**

Rather than requiring audio files, generate all sounds programmatically using Web Audio API:
- `chipPlace`: short click (50ms, 800Hz)
- `ballBounce`: short tap (30ms, 400Hz, repeated)
- `ballDrop`: thud (100ms, 200Hz)
- `win`: ascending arpeggio
- `lose`: descending two-note
- `tick`: subtle click (20ms, 1000Hz)
- `chatNotify`: soft ding (100ms, 600Hz)

Returns: `playSound(name: SoundName)` function.

**Step 2: Commit**

```bash
git add client/src/hooks/useSound.ts
git commit -m "feat: add Web Audio API sound effects for casino atmosphere"
```

---

### Task 15: Main App Assembly

**Files:**
- Modify: `client/src/App.tsx`
- Create: `client/src/App.css`

**Step 1: Assemble all components into the main layout**

Update `client/src/App.tsx`:
- Three-column layout: Chat | Wheel+Table | Players+History
- Timer/phase display at top center
- ChipSelector below the betting table
- "Clear Bets" button
- "Rebuy" button (visible when balance is 0)
- Connection status indicator
- Wire all hooks: `useGame`, `useChat`, `useSound`
- Trigger sounds on events: chip placed, spin, win/lose, countdown ticks, chat message

**Step 2: Create App.css**

Full casino styling:
- Dark green (#0a5c36) felt background
- Gold (#d4af37) accents and borders
- Three-column grid layout
- Phase/timer display with countdown animation
- Responsive breakpoints for tablet/mobile (stacked layout)

**Step 3: Verify the full app**

Run server + client, open two browser tabs:
- Both should connect and see each other in player list
- Timer should count down, betting should work
- Bets should be visible to both players
- Wheel should spin and animate
- Chat should work between tabs
- Sound effects should play

**Step 4: Commit**

```bash
git add client/src/App.tsx client/src/App.css
git commit -m "feat: assemble full roulette app with casino styling"
```

---

### Task 16: Polish & Responsive

**Files:**
- Modify various CSS files

**Step 1: Add finishing visual touches**

- Winning number glow animation on the table
- Gold highlight on winning bet positions
- Smooth chip count animation (CSS transition on balance number)
- Chip stacking visual (multiple chips on same position offset slightly)
- Last 5 seconds countdown: numbers turn red and pulse
- Proper mobile layout: stacked vertically (wheel → table → chat)
- Clean up any default Vite styling

**Step 2: Test on mobile viewport**

Open Chrome DevTools → responsive mode → test at 375px and 768px widths.

**Step 3: Commit**

```bash
git commit -am "feat: add visual polish, animations, and responsive layout"
```

---

### Task 17: Git Init & Final Commit

**Step 1: Initialize git repo**

```bash
cd /opt/projects/roulette
git init
git add .
git commit -m "feat: complete online multiplayer roulette game"
```

Note: This task should actually be done first (before Task 1) so all incremental commits work. Move git init to the very beginning during execution.

---

## Execution Order Summary

1. Git init (from Task 17 — do first)
2. Task 1: Server scaffolding
3. Task 2: Client scaffolding
4. Task 3: Shared types
5. Task 4: Roulette engine
6. Task 5: Game room manager
7. Task 6: Socket.IO wiring
8. Task 7: Client hooks
9. Task 8: Client constants
10. Task 9: Betting table (complex)
11. Task 10: Wheel animation (complex)
12. Task 11: Chip selector
13. Task 12: Chat
14. Task 13: Players panel
15. Task 14: Sound effects
16. Task 15: Main app assembly
17. Task 16: Polish & responsive
