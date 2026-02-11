import type { Player } from '@shared/types';
import { getNumberColor } from '../constants/roulette';
import './PlayersPanel.css';

interface PlayersPanelProps {
  players: Player[];
  myId: string;
  history: number[];
}

function formatBalance(amount: number): string {
  return amount.toLocaleString();
}

const COLOR_CLASS: Record<string, string> = {
  red: 'history-badge--red',
  black: 'history-badge--black',
  green: 'history-badge--green',
};

export default function PlayersPanel({ players, myId, history }: PlayersPanelProps) {
  const recentHistory = history.slice(0, 10);

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
            return (
              <span key={idx} className={`history-badge ${COLOR_CLASS[color]}`}>
                {num}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
