import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../socket';
import { PAYOUT_MULTIPLIERS } from '../constants/roulette';
import type { GameState, Player, SpinResult, SpinSummary, PlaceBetPayload } from '@shared/types';

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [lastSpin, setLastSpin] = useState<SpinResult | null>(null);
  const [betError, setBetError] = useState<string | null>(null);
  const [spinHistory, setSpinHistory] = useState<SpinSummary[]>([]);

  // Keep a ref to current player for use in the spin handler
  const meRef = useRef<Player | null>(null);
  meRef.current = me;

  useEffect(() => {
    socket.on('player:identity', (player) => setMe(player));
    socket.on('game:state', (state) => {
      setGameState(state);
      setMe(prev => {
        if (!prev) return prev;
        const updated = state.players.find((p: Player) => p.id === prev.id);
        return updated ?? prev;
      });
    });
    socket.on('game:countdown', (seconds) => {
      setGameState(prev => prev ? { ...prev, countdown: seconds } : prev);
    });
    socket.on('game:spin', (result) => {
      setLastSpin(result);

      // Build spin summary from current bets
      const player = meRef.current;
      if (player && player.bets.length > 0) {
        const bets = player.bets.map(b => {
          const won = b.numbers.includes(result.winningNumber);
          return { type: b.type, numbers: b.numbers, amount: b.amount, won };
        });
        const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
        const totalWin = bets
          .filter(b => b.won)
          .reduce((sum, b) => sum + b.amount * (PAYOUT_MULTIPLIERS[b.type] ?? 0) + b.amount, 0);
        const netResult = totalWin - totalBet;

        const summary: SpinSummary = {
          winningNumber: result.winningNumber,
          totalBet,
          totalWin,
          netResult,
          bets,
        };

        setSpinHistory(prev => [summary, ...prev].slice(0, 10));
      } else {
        // Player had no bets this round
        setSpinHistory(prev => [{
          winningNumber: result.winningNumber,
          totalBet: 0,
          totalWin: 0,
          netResult: 0,
          bets: [],
        }, ...prev].slice(0, 10));
      }
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

  const resetTable = useCallback(() => {
    socket.emit('game:reset');
  }, []);

  return {
    gameState,
    me,
    lastSpin,
    betError,
    spinHistory,
    placeBet,
    removeBet,
    clearBets,
    rebuy,
    resetTable,
  };
}
