import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from './socket';
import { useGame } from './hooks/useGame';
import { useChat } from './hooks/useChat';
import { useSound } from './hooks/useSound';
import RouletteWheel from './components/RouletteWheel';
import BettingTable from './components/BettingTable';
import ChipSelector from './components/ChipSelector';
import Chat from './components/Chat';
import PlayersPanel from './components/PlayersPanel';
import Racetrack from './components/Racetrack';
import './App.css';

const PHASE_LABELS: Record<string, string> = {
  betting: 'Place Your Bets',
  spinning: 'No More Bets',
  result: 'Result',
};

function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [selectedChip, setSelectedChip] = useState(10);
  const [spinComplete, setSpinComplete] = useState(false);

  const { gameState, me, lastSpin, betError, spinHistory, placeBet, clearBets, rebuy, resetTable } = useGame();
  const { messages, sendMessage } = useChat();
  const { playSound } = useSound();

  /* ---------- connection tracking ---------- */
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  /* ---------- sound effects wiring ---------- */
  const prevCountdownRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef(0);

  // Countdown ticks (last 5 seconds)
  useEffect(() => {
    if (!gameState) return;
    const { countdown, phase } = gameState;
    if (phase === 'betting' && countdown <= 5 && countdown > 0) {
      if (prevCountdownRef.current !== countdown) {
        playSound('tick');
      }
    }
    prevCountdownRef.current = countdown;
  }, [gameState?.countdown, gameState?.phase, playSound]);

  // Phase change sounds
  useEffect(() => {
    if (!gameState) return;
    const { phase } = gameState;
    if (prevPhaseRef.current && prevPhaseRef.current !== phase) {
      if (phase === 'spinning') {
        playSound('ballDrop');
      }
    }
    prevPhaseRef.current = phase;
  }, [gameState?.phase, playSound]);

  // Win/lose sounds on spin result
  useEffect(() => {
    if (!lastSpin || !me) return;
    const myPayout = lastSpin.payouts[me.id] ?? 0;
    if (myPayout > 0) {
      playSound('win');
    } else {
      playSound('lose');
    }
  }, [lastSpin, me, playSound]);

  // Chat notification
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
      const latest = messages[messages.length - 1];
      if (me && latest.playerId !== me.id) {
        playSound('chatNotify');
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, me, playSound]);

  /* ---------- handlers ---------- */
  const handlePlaceBet = useCallback(
    (payload: Parameters<typeof placeBet>[0]) => {
      placeBet(payload);
      playSound('chipPlace');
    },
    [placeBet, playSound],
  );

  const handleSpinComplete = useCallback(() => {
    setSpinComplete(true);
  }, []);

  // Reset spinComplete when new round starts
  useEffect(() => {
    if (gameState?.phase === 'betting') {
      setSpinComplete(false);
    }
  }, [gameState?.phase]);

  /* ---------- derived values ---------- */
  const phase = gameState?.phase ?? 'betting';
  const countdown = gameState?.countdown ?? 0;
  const players = gameState?.players ?? [];
  const history = gameState?.history ?? [];
  const myId = me?.id ?? '';
  const balance = me?.balance ?? 0;
  const isSpinning = phase === 'spinning' && !spinComplete;
  const winningNumber = lastSpin?.winningNumber ?? null;
  const showResult = phase === 'result' || (phase === 'spinning' && spinComplete);

  const countdownUrgent = phase === 'betting' && countdown <= 5 && countdown > 0;

  return (
    <div className="app">
      {/* ---- Header ---- */}
      <header className="app-header">
        <div className="header-left">
          <span className={`connection-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span className="connection-label">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="header-center">
          <div className="phase-label">{PHASE_LABELS[phase] ?? phase}</div>
          {phase === 'betting' && countdown > 0 && (
            <div className={`countdown ${countdownUrgent ? 'countdown--urgent' : ''}`}>
              {countdown}
            </div>
          )}
          {showResult && winningNumber !== null && (
            <div className="result-number">
              <span className={`result-badge result-badge--${getResultColor(winningNumber)}`}>
                {winningNumber}
              </span>
            </div>
          )}
        </div>

        <div className="header-right">
          {me && (
            <span className="header-player">
              <span className="player-color-indicator" style={{ background: me.chipColor }} />
              {me.name}
            </span>
          )}
        </div>
      </header>

      {/* ---- Main layout ---- */}
      <main className="app-main">
        {/* Left: Chat */}
        <aside className="panel panel-left">
          <Chat messages={messages} onSend={sendMessage} />
        </aside>

        {/* Center: Wheel + Table + Controls */}
        <section className="panel panel-center">
          <div className="wheel-container">
            <RouletteWheel
              spinning={isSpinning}
              targetNumber={winningNumber}
              onSpinComplete={handleSpinComplete}
            />
          </div>

          <div className="table-container">
            <BettingTable
              selectedChip={selectedChip}
              onPlaceBet={handlePlaceBet}
              players={players}
              myId={myId}
              phase={phase}
              winningNumber={showResult ? winningNumber : null}
            />
          </div>

          <Racetrack
            selectedChip={selectedChip}
            onPlaceBet={handlePlaceBet}
            phase={phase}
            balance={balance}
          />

          {betError && <div className="bet-error">{betError}</div>}

          <div className="controls-bar">
            <ChipSelector
              selectedValue={selectedChip}
              onSelect={setSelectedChip}
              balance={balance}
            />

            <div className="action-buttons">
              <button
                className="btn btn--clear"
                onClick={clearBets}
                disabled={phase !== 'betting'}
              >
                Clear Bets
              </button>
              {balance === 0 && (
                <button className="btn btn--rebuy" onClick={rebuy}>
                  Rebuy
                </button>
              )}
              <button
                className="btn btn--reset"
                onClick={() => { if (window.confirm('Reset table? This kicks all players and clears history.')) resetTable(); }}
              >
                Reset Table
              </button>
            </div>
          </div>
        </section>

        {/* Right: Players + History */}
        <aside className="panel panel-right">
          <PlayersPanel players={players} myId={myId} history={history} spinHistory={spinHistory} />
        </aside>
      </main>
    </div>
  );
}

function getResultColor(n: number): string {
  if (n === 0) return 'green';
  const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  return reds.includes(n) ? 'red' : 'black';
}

export default App;
