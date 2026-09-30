// Avtomatik test: 5 ta "odam" (socket) + 2 bot bilan to'liq o'yin(lar)ni o'ynaydi.
// Ishlatish: server ishlab turganda `npx tsx scripts/simulate.ts`
import { io, type Socket } from 'socket.io-client';
import type { ClientState } from '../shared/types';

const URL = process.env.URL ?? 'http://localhost:3000';
const GAMES = Number(process.env.GAMES ?? 2);
const isMafia = (r: string | null) => r === 'mafia' || r === 'don';
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function call(s: Socket, ev: string, ...args: unknown[]): Promise<any> {
  return new Promise((res) => s.timeout(5000).emit(ev, ...args, (err: unknown, r: any) => res(err ? { ok: false, error: 'timeout' } : r)));
}

interface Client { name: string; s: Socket; st: ClientState | null; done: Set<string>; }
const clients: Client[] = [];
const errors: string[] = [];
let gamesFinished = 0;

function act(c: Client) {
  const st = c.st; if (!st) return;
  const me = st.players.find((p) => p.id === st.youId)!;
  const key = `${st.phase}-${st.round}`;
  const isHost = me.isHost;
  const alive = st.players.filter((p) => p.alive);
  const once = (k: string, fn: () => void) => { if (!c.done.has(k)) { c.done.add(k); setTimeout(fn, 200 + Math.random() * 800); } };

  if (isHost && ['reveal', 'morning', 'verdict'].includes(st.phase)) once(key + 'skip', () => call(c.s, 'game:skip'));
  if (st.phase === 'ended' && isHost) {
    once(key + 'end' + gamesFinished, () => {
      gamesFinished++;
      console.log(`🏁 O'yin #${gamesFinished} tugadi: g'olib = ${st.winner}; roundlar = ${st.round}`);
      console.log('   ' + st.players.map((p) => `${p.name}:${p.role}${p.alive ? '' : '†'}`).join(' '));
      if (isHost && gamesFinished < GAMES) setTimeout(async () => { await call(c.s, 'game:toLobby'); await call(c.s, 'game:start'); }, 500);
      if (gamesFinished >= GAMES) setTimeout(finish, 800);
    });
  }
  if (!me.alive) {
    if (st.phase === 'day') once(key + 'dchat', async () => { const r = await call(c.s, 'chat:send', { channel: 'general', text: 'o‘lik gapiryapti' }); if (r.ok) errors.push('dead wrote in general'); });
    return;
  }
  if (st.phase === 'night') {
    once(key + 'night', async () => {
      const others = alive.filter((p) => p.id !== me.id);
      if (isMafia(me.role)) {
        const t = pick(others.filter((p) => !isMafia(p.role)));
        const r = await call(c.s, 'game:night', { targetId: t.id }); if (!r.ok) errors.push('mafia: ' + r.error);
        // sherigini tanlash taqiqlanganini tekshiramiz
        const mate = others.find((p) => isMafia(p.role));
        if (mate) { const r2 = await call(c.s, 'game:night', { targetId: mate.id }); if (r2.ok) errors.push('mafia could target mate'); }
        if (me.role === 'don') { const r3 = await call(c.s, 'game:donCheck', { targetId: pick(others).id }); if (!r3.ok) errors.push('don: ' + r3.error); }
        await call(c.s, 'chat:send', { channel: 'mafia', text: 'mafiya gaplashyapti' });
      } else if (me.role === 'doctor') {
        const pool = alive.filter((p) => p.id !== st.doctor?.lastHeal && !(p.id === me.id && st.doctor?.selfUsed));
        const r = await call(c.s, 'game:night', { targetId: pick(pool).id }); if (!r.ok) errors.push('doctor: ' + r.error);
      } else if (me.role === 'detective') {
        const r = await call(c.s, 'game:night', { targetId: pick(others).id }); if (!r.ok) errors.push('det: ' + r.error);
      } else {
        const r = await call(c.s, 'chat:send', { channel: 'general', text: 'tunda gapiryapman' }); if (r.ok) errors.push('civilian chatted at night');
        const r2 = await call(c.s, 'chat:send', { channel: 'mafia', text: 'hack' }); if (r2.ok) errors.push('civilian wrote to mafia');
      }
    });
  }
  if (st.phase === 'day') once(key + 'day', async () => { await call(c.s, 'chat:send', { channel: 'general', text: `Salom, men ${me.name}` }); await call(c.s, 'game:ready'); });
  if (st.phase === 'voting') once(key + 'vote', async () => {
    const t = Math.random() < 0.1 ? null : pick(alive.filter((p) => p.id !== me.id)).id;
    const r = await call(c.s, 'game:vote', { targetId: t }); if (!r.ok) errors.push('vote: ' + r.error);
  });
  // maxfiylik: tirik tinch o'yinchi boshqalarning rolini ko'rmasligi kerak
  if (st.phase !== 'ended' && me.alive && !isMafia(me.role)) {
    const leaked = st.players.filter((p) => p.id !== me.id && p.alive && p.role);
    if (leaked.length) errors.push(`role leak to ${me.name}: ${leaked.map((p) => p.name).join(',')}`);
    if (Object.keys(st.mafiaVotes).length) errors.push('mafiaVotes leak');
    if (st.chat.some((m) => m.channel === 'mafia')) errors.push('mafia chat leak');
  }
}

function finish() {
  console.log(errors.length ? `❌ Xatolar (${errors.length}):\n - ` + [...new Set(errors)].join('\n - ') : '✅ Hech qanday xato topilmadi');
  process.exit(errors.length ? 1 : 0);
}

async function main() {
  const names = ['Ali', 'Vali', 'Gani', 'Soli', 'Hasan'];
  for (const name of names) {
    const s = io(URL, { transports: ['websocket'] });
    const c: Client = { name, s, st: null, done: new Set() };
    s.on('state', (st: ClientState) => { c.st = st; act(c); });
    clients.push(c);
    await new Promise((r) => s.on('connect', () => r(null)));
  }
  const host = clients[0];
  const cr = await call(host.s, 'room:create', { name: host.name });
  console.log('Xona:', cr.code);
  for (const c of clients.slice(1)) { const r = await call(c.s, 'room:join', { code: cr.code, name: c.name }); if (!r.ok) errors.push('join ' + r.error); }
  const dup = io(URL, { transports: ['websocket'] }); await new Promise((r) => dup.on('connect', () => r(null)));
  const rd = await call(dup, 'room:join', { code: cr.code, name: 'Ali' }); console.log('Takroriy ism ->', rd.ok ? 'qabul qilindi (nom o‘zgartiriladi)' : rd.error);
  await call(dup, 'room:leave'); dup.close();
  await call(host.s, 'room:addBot'); await call(host.s, 'room:addBot');
  const bad = await call(clients[1].s, 'game:start'); if (bad.ok) errors.push('non-host started');
  await call(host.s, 'room:settings', { discussionSec: 30, votingSec: 15, nightSec: 20 });
  const r = await call(host.s, 'game:start'); if (!r.ok) errors.push('start ' + r.error);
  setTimeout(() => { errors.push('TIMEOUT'); finish(); }, 8 * 60_000);
}
main();
