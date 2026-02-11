import { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { GameState, Player, SpinResult, PlaceBetPayload } from '@shared/types';

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [lastSpin, setLastSpin] = useState<SpinResult | null>(null);
  const [betError, setBetError] = useState<string | null>(null);

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
