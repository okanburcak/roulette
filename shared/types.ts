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
  numbers: number[];
  amount: number;
}

export interface Player {
  id: string;
  name: string;
  chipColor: string;
  balance: number;
  bets: Bet[];
}

export interface GameState {
  phase: GamePhase;
  countdown: number;
  players: Player[];
  result: number | null;
  history: number[];
}

export interface SpinResult {
  winningNumber: number;
  payouts: Record<string, number>;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
}

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
