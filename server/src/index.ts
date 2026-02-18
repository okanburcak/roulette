import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '../../shared/types.js';
import { GameRoom } from './gameRoom.js';

const app = express();

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  
});

const room = new GameRoom();

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

room.onReset = () => {
  io.emit('game:reset');
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

  socket.on('game:reset', () => {
    console.log(`Table reset by: ${socket.id}`);
    room.resetTable();
    // Disconnect all sockets so they rejoin fresh
    for (const [, s] of io.sockets.sockets) {
      s.disconnect(true);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    room.removePlayer(socket.id);
    io.emit('player:left', socket.id);
    io.emit('game:state', room.getState());
  });
});

const PORT = parseInt(process.env.PORT || '3007', 10);
const HOST = process.env.HOST || '0.0.0.0';
httpServer.listen(PORT, HOST, () => {
  console.log(`Roulette server running on ${HOST}:${PORT}`);
  room.start();
});
