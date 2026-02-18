import { useState, useRef, useEffect } from 'react';
import type { Player, SpinSummary } from '@shared/types';
import { getNumberColor } from '../constants/roulette';
import './PlayersPanel.css';

interface PlayersPanelProps {
  players: Player[];
  myId: string;
  history: number[];
  spinHistory: SpinSummary[];
}

function formatBalance(amount: number): string {
  return amount.toLocaleString();
}

const COLOR_CLASS: Record<string, string> = {
  red: 'history-badge--red',
  black: 'history-badge--black',
  green: 'history-badge--green',
};

function betTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    straight: 'Straight', split: 'Split', street: 'Street', corner: 'Corner',
    sixline: 'Six Line', dozen: 'Dozen', column: 'Column', red: 'Red',
    black: 'Black', odd: 'Odd', even: 'Even', low: '1-18', high: '19-36',
  };
  return labels[type] ?? type;
}

export default function PlayersPanel({ players, myId, history, spinHistory }: PlayersPanelProps) {
  const recentHistory = history.slice(0, 10);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on click outside
  useEffect(() => {
    if (selectedIdx === null) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedIdx(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selectedIdx]);

  const selectedSummary = selectedIdx !== null ? spinHistory[selectedIdx] : null;

  return (
    <div className="players-panel">
      {/* Players section */}
      <div className="players-panel-header">
        Players
        <span className="players-count-badge">{players.length}</span>
      </div>

      <div className="players-list">
        {players.map((player) => {
          const isMe = player.id === myId;
          return (
            <div
              key={player.id}
              className={`player-item${isMe ? ' player-item--me' : ''}`}
            >
              <span
                className="player-color-dot"
                style={{ background: player.chipColor }}
              />
              <span className="player-name">
                {player.name}
                {isMe && <span className="player-you-label"> (You)</span>}
              </span>
              <span className="player-balance">{formatBalance(player.balance)}</span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="players-panel-divider" />

      {/* History section */}
      <div className="players-panel-header">History</div>

      {recentHistory.length === 0 ? (
        <div className="history-empty">No spins yet</div>
      ) : (
        <div className="history-badges">
          {recentHistory.map((num, idx) => {
            const color = getNumberColor(num);
            const isSelected = selectedIdx === idx;
            return (
              <span
                key={idx}
                className={`history-badge ${COLOR_CLASS[color]}${isSelected ? ' history-badge--selected' : ''}`}
                onClick={() => setSelectedIdx(isSelected ? null : idx)}
                title="Click for spin summary"
              >
                {num}
              </span>
            );
          })}
        </div>
      )}

      {/* Spin summary popover */}
      {selectedSummary && (
        <div className="spin-summary-popover" ref={popoverRef}>
          <div className="spin-summary-header">
            <span className={`spin-summary-number ${COLOR_CLASS[getNumberColor(selectedSummary.winningNumber)]}`}>
              {selectedSummary.winningNumber}
            </span>
            <span className="spin-summary-title">Spin Summary</span>
          </div>

          {selectedSummary.bets.length === 0 ? (
            <div className="spin-summary-no-bets">No bets placed</div>
          ) : (
            <>
              <div className="spin-summary-bets">
                {selectedSummary.bets.map((bet, i) => (
                  <div key={i} className={`spin-summary-bet ${bet.won ? 'won' : 'lost'}`}>
                    <span className="spin-summary-bet-type">{betTypeLabel(bet.type)}</span>
                    <span className="spin-summary-bet-nums">
                      [{bet.numbers.join(',')}]
                    </span>
                    <span className="spin-summary-bet-amount">{bet.amount}</span>
                    <span className="spin-summary-bet-result">
                      {bet.won ? 'W' : 'L'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="spin-summary-footer">
                <div className="spin-summary-row">
                  <span>Total Bet</span>
                  <span>{selectedSummary.totalBet}</span>
                </div>
                <div className="spin-summary-row">
                  <span>Total Win</span>
                  <span>{selectedSummary.totalWin}</span>
                </div>
                <div className={`spin-summary-row spin-summary-net ${selectedSummary.netResult >= 0 ? 'positive' : 'negative'}`}>
                  <span>Net</span>
                  <span>{selectedSummary.netResult >= 0 ? '+' : ''}{selectedSummary.netResult}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
