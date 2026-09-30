import express from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server, type Socket } from 'socket.io';
import type { AckResult, ClientState, JoinResult } from '../shared/types';
import { Room, type Player } from './Room';
import { GameError, cleanText, roomCode } from './util';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const ROOM_IDLE_MS = 15 * 60 * 1000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../dist/client');

const app = express();
const http = createServer(app);
// CLIENT_ORIGIN=https://mafia.vercel.app (vergul bilan bir nechta). Berilmasa — hamma domenga ruxsat.
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? '*')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const io = new Server(http, {
  cors: { origin: allowedOrigins.includes('*') ? '*' : allowedOrigins },
  pingInterval: 10_000,
  pingTimeout: 8_000,
});

const rooms = new Map<string, Room>();

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, players: io.engine.clientsCount });
});

if (existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h', index: false }));
  app.use((_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  app.get('/', (_req, res) => {
    res
      .type('text')
      .send('Mafia server ishlayapti ✅ O‘yinni ochish uchun sayt manziliga kiring (dev rejimida http://localhost:5173).');
  });
}

const sendState = (socketId: string, state: ClientState) => io.to(socketId).emit('state', state);

function createRoom(): Room {
  let code = roomCode();
  while (rooms.has(code)) code = roomCode();
  const room = new Room(code, sendState);
  rooms.set(code, room);
  return room;
}

function deleteRoom(room: Room): void {
  room.dispose();
  rooms.delete(room.code);
}

type AnyAck = ((res: AckResult<object>) => void) | undefined;

function reply(ack: unknown, res: AckResult<object>): void {
  if (typeof ack === 'function') (ack as (r: AckResult<object>) => void)(res);
}

function errorMessage(e: unknown): string {
  if (e instanceof GameError) return e.message;
  console.error(e);
  return 'Serverda xatolik yuz berdi';
}

io.on('connection', (socket: Socket) => {
  const session = (): { room: Room; player: Player } | null => {
    const room = rooms.get(socket.data.code ?? '');
    const player = room?.get(socket.data.pid ?? '');
    return room && player ? { room, player } : null;
  };

  /** Xonadagi amalni bajaradi, xatoni ack orqali qaytaradi va hammaga yangi holatni yuboradi. */
  const act = (ack: unknown, fn: (room: Room, player: Player) => void) => {
    const s = session();
    if (!s) return reply(ack, { ok: false, error: 'Siz hech qaysi xonada emassiz' });
    try {
      fn(s.room, s.player);
      reply(ack, { ok: true });
    } catch (e) {
      reply(ack, { ok: false, error: errorMessage(e) });
    }
    s.room.touch();
    s.room.broadcast();
  };

  const bind = (room: Room, player: Player): JoinResult => {
    // shu o'yinchi boshqa oynada ochiq bo'lsa — o'sha oynani uzamiz
    if (player.socketId && player.socketId !== socket.id) {
      const old = io.sockets.sockets.get(player.socketId);
      if (old) {
        old.data = {};
        old.emit('kicked', { reason: 'Siz boshqa oynadan kirdingiz' });
      }
    }
    socket.data.code = room.code;
    socket.data.pid = player.id;
    room.attach(player, socket.id);
    room.touch();
    return { code: room.code, token: player.token, playerId: player.id };
  };

  const detach = () => {
    const s = session();
    if (!s) return;
    s.room.leave(s.player.id);
    socket.data = {};
    if (s.room.humansOnline() === 0) deleteRoom(s.room);
    else s.room.broadcast();
  };

  socket.on('room:create', (payload: { name?: unknown }, ack: AnyAck) => {
    try {
      const name = cleanText(payload?.name, 20);
      if (!name) throw new GameError('Ismingizni kiriting');
      detach();
      const room = createRoom();
      const player = room.addPlayer(name);
      const res = bind(room, player);
      reply(ack, { ok: true, ...res });
      room.broadcast();
    } catch (e) {
      reply(ack, { ok: false, error: errorMessage(e) });
    }
  });

  socket.on('room:join', (payload: { code?: unknown; name?: unknown }, ack: AnyAck) => {
    try {
      const code = cleanText(payload?.code, 8).toUpperCase();
      const room = rooms.get(code);
      if (!room) throw new GameError('Bunday xona topilmadi');
      if (room.phase !== 'lobby') throw new GameError('Bu xonada o‘yin allaqachon boshlangan');
      detach();
      const player = room.addPlayer(payload?.name);
      const res = bind(room, player);
      reply(ack, { ok: true, ...res });
      room.broadcast();
    } catch (e) {
      reply(ack, { ok: false, error: errorMessage(e) });
    }
  });

  socket.on('room:resume', (payload: { code?: unknown; token?: unknown }, ack: AnyAck) => {
    const room = rooms.get(cleanText(payload?.code, 8).toUpperCase());
    const player = room && typeof payload?.token === 'string' ? room.byToken(payload.token) : undefined;
    if (!room || !player) return reply(ack, { ok: false, error: 'Sessiya tugagan' });
    const res = bind(room, player);
    reply(ack, { ok: true, ...res });
    room.broadcast();
  });

  socket.on('room:leave', (ack: AnyAck) => {
    detach();
    reply(ack, { ok: true });
  });

  socket.on('room:settings', (patch: unknown, ack: AnyAck) => act(ack, (r, p) => r.updateSettings(p.id, patch)));
  socket.on('room:addBot', (ack: AnyAck) => act(ack, (r, p) => r.addBot(p.id)));
  socket.on('room:kick', (payload: { playerId?: unknown }, ack: AnyAck) =>
    act(ack, (r, p) => {
      const kicked = r.kick(p.id, payload?.playerId);
      if (kicked.socketId) {
        const s = io.sockets.sockets.get(kicked.socketId);
        if (s) {
          s.data = {};
          s.emit('kicked', { reason: 'Xona egasi sizni chiqarib yubordi' });
        }
      }
    }),
  );
  socket.on('game:start', (ack: AnyAck) => act(ack, (r, p) => r.start(p.id)));
  socket.on('game:night', (payload: { targetId?: unknown }, ack: AnyAck) =>
    act(ack, (r, p) => r.nightAction(p.id, payload?.targetId)),
  );
  socket.on('game:donCheck', (payload: { targetId?: unknown }, ack: AnyAck) =>
    act(ack, (r, p) => r.donCheck(p.id, payload?.targetId)),
  );
  socket.on('game:vote', (payload: { targetId?: unknown }, ack: AnyAck) =>
    act(ack, (r, p) => r.vote(p.id, payload?.targetId ?? null)),
  );
  socket.on('game:ready', (ack: AnyAck) => act(ack, (r, p) => r.toggleReady(p.id)));
  socket.on('game:skip', (ack: AnyAck) => act(ack, (r, p) => r.skip(p.id)));
  socket.on('game:toLobby', (ack: AnyAck) => act(ack, (r, p) => r.toLobby(p.id)));
  socket.on('chat:send', (payload: { channel?: unknown; text?: unknown }, ack: AnyAck) =>
    act(ack, (r, p) => r.chatSend(p.id, payload?.channel, payload?.text)),
  );

  socket.on('disconnect', () => {
    const s = session();
    if (!s) return;
    s.room.disconnect(s.player.id, socket.id);
    s.room.broadcast();
  });
});

// Bo'sh qolgan xonalarni tozalash
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.humansOnline() === 0 && now - room.lastActivity > ROOM_IDLE_MS) deleteRoom(room);
  }
}, 60_000).unref();

http.listen(PORT, HOST, () => {
  console.log(`\n🎩 Mafia server ishga tushdi: http://localhost:${PORT}`);
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) console.log(`   Tarmoqda: http://${net.address}:${PORT}`);
    }
  }
  if (!existsSync(clientDist)) console.log('   (Dev rejim: interfeys http://localhost:5173 da)');
  console.log('');
});
