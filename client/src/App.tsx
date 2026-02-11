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
