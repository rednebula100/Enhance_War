require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { verifyToken, getPlayerData } = require('./firebase');
const { joinQueue, leaveQueue } = require('./matchmaker');
const GameRoom = require('./GameRoom');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// socketId → { uid, name, room: roomId|null, playerIdx: 0|1|null }
const sessions = new Map();
// roomId → GameRoom
const rooms = new Map();

io.on('connection', (socket) => {

  socket.on('auth', async ({ idToken }) => {
    try {
      const decoded = await verifyToken(idToken);
      const data = await getPlayerData(decoded.uid);
      sessions.set(socket.id, { uid: decoded.uid, name: decoded.name || '플레이어', room: null, playerIdx: null });
      socket.emit('auth_ok', { uid: decoded.uid, displayName: decoded.name, money: data.money });
    } catch {
      socket.emit('error', { code: 'AUTH_FAILED', message: '인증 실패' });
    }
  });

  socket.on('join_queue', () => {
    const session = sessions.get(socket.id);
    if (!session) return socket.emit('error', { code: 'NOT_AUTHED' });
    if (session.room) return; // 이미 매치 중

    socket.emit('queue_joined');

    joinQueue({ socket, uid: session.uid, name: session.name }, (p1, p2) => {
      const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const room = new GameRoom(p1, p2);
      rooms.set(roomId, room);

      [p1, p2].forEach((p, i) => {
        if (!p.socket) return; // 봇은 소켓 없음
        const sess = sessions.get(p.socket.id);
        if (sess) { sess.room = roomId; sess.playerIdx = i; }

        const payload = room.matchFoundPayload(i);
        p.socket.emit('match_found', {
          opponentName: i === 0 ? p2.name : p1.name,
          ...payload,
        });
      });

      room.start();
    });
  });

  socket.on('leave_queue', () => {
    const session = sessions.get(socket.id);
    if (session) leaveQueue(session.uid);
  });

  socket.on('enhance_attempt', () => {
    const session = sessions.get(socket.id);
    if (!session?.room) return;
    rooms.get(session.room)?.handleEnhance(session.playerIdx);
  });

  socket.on('sell_sword', () => {
    const session = sessions.get(socket.id);
    if (!session?.room) return;
    rooms.get(session.room)?.handleSell(session.playerIdx);
  });

  socket.on('buy_card', ({ cardId }) => {
    const session = sessions.get(socket.id);
    if (!session?.room) return;
    rooms.get(session.room)?.handleBuyCard(session.playerIdx, cardId);
  });

  socket.on('disconnect', () => {
    const session = sessions.get(socket.id);
    if (!session) return;
    leaveQueue(session.uid);
    if (session.room) {
      const room = rooms.get(session.room);
      if (room) {
        room.handleDisconnect(session.playerIdx);
        rooms.delete(session.room);
      }
    }
    sessions.delete(socket.id);
  });

});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));