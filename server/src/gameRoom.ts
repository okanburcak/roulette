import crypto from 'crypto';
import type {
  GamePhase, Player, Bet, GameState, SpinResult,
  PlaceBetPayload
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

  onStateChange: ((state: GameState) => void) | null = null;
  onCountdown: ((seconds: number) => void) | null = null;
  onSpinResult: ((result: SpinResult) => void) | null = null;
  onNewRound: (() => void) | null = null;
  onReset: (() => void) | null = null;

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

  resetTable() {
    if (this.timer) clearInterval(this.timer);
    this.players.clear();
    this.phase = 'betting';
    this.countdown = BETTING_DURATION;
    this.result = null;
    this.history = [];
    this.colorIndex = 0;
    this.onReset?.();
    this.tick();
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
