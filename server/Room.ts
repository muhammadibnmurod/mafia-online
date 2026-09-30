import {
  DEFAULT_SETTINGS,
  LIMITS,
  type Announcement,
  type ChatChannel,
  type ChatMessage,
  type CheckResult,
  type ClientState,
  type Phase,
  type Role,
  type Settings,
  type Team,
} from '../shared/types';
import { ROLE_INFO, buildRoleList, isMafia } from '../shared/roles';
import { BOT_NAMES, botPhrase } from './bots';
import { GameError, clamp, cleanText, fail, newId, pick, rand, shuffle } from './util';

export interface Player {
  id: string;
  token: string;
  name: string;
  avatar: number;
  isBot: boolean;
  connected: boolean;
  /** O'yin davomida chiqib ketgan — qaytib kira olmaydi. */
  left: boolean;
  socketId: string | null;
  alive: boolean;
  role: Role | null;
  ready: boolean;
  chatTimes: number[];
}

interface NightState {
  mafiaVotes: Map<string, string>;
  donCheck: string | null;
  heal: string | null;
  check: string | null;
}

const emptyNight = (): NightState => ({ mafiaVotes: new Map(), donCheck: null, heal: null, check: null });

const REVEAL_MS = 8000;
const MORNING_MS = 8000;
const VERDICT_MS = 8000;
const SETTLE_MS = 1500;
const LOBBY_GRACE_MS = 30_000;
const CHAT_KEEP = 300;

export type Sender = (socketId: string, state: ClientState) => void;

export class Room {
  readonly code: string;
  players: Player[] = [];
  hostId = '';
  settings: Settings = { ...DEFAULT_SETTINGS };
  phase: Phase = 'lobby';
  phaseEndsAt: number | null = null;
  round = 0;
  winner: Team | null = null;
  announcement: Announcement | null = null;
  chat: ChatMessage[] = [];
  lastActivity = Date.now();

  private send: Sender;
  private timer: NodeJS.Timeout | null = null;
  private pendingEnd: (() => void) | null = null;
  private settling = false;
  private phaseToken = 0;
  private botTimers: NodeJS.Timeout[] = [];
  private removalTimers = new Map<string, NodeJS.Timeout>();

  private night: NightState = emptyNight();
  private votes = new Map<string, string | null>();
  private doctorLastHeal: string | null = null;
  private doctorSelfUsed = false;
  private detectiveResults: CheckResult[] = [];
  private donResults: CheckResult[] = [];

  constructor(code: string, send: Sender) {
    this.code = code;
    this.send = send;
  }

  // ───────────────────────── yordamchilar ─────────────────────────

  get(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  byToken(token: string): Player | undefined {
    return this.players.find((p) => p.token === token && !p.left);
  }

  private alive(): Player[] {
    return this.players.filter((p) => p.alive);
  }

  /** Harakatini kutish kerak bo'lgan o'yinchimi (bot yoki onlayn odam). */
  private awaited(p: Player): boolean {
    return p.alive && (p.isBot || p.connected);
  }

  get inGame(): boolean {
    return this.phase !== 'lobby' && this.phase !== 'ended';
  }

  humansOnline(): number {
    return this.players.filter((p) => !p.isBot && p.connected).length;
  }

  touch(): void {
    this.lastActivity = Date.now();
  }

  private requireHost(pid: string): void {
    if (pid !== this.hostId) fail('Faqat xona egasi buni qila oladi');
  }

  private requireAlive(pid: string): Player {
    const p = this.get(pid);
    if (!p) fail('O‘yinchi topilmadi');
    if (!p.alive) fail('Siz o‘yindan chiqqansiz');
    return p;
  }

  private requireTarget(targetId: unknown): Player {
    const t = typeof targetId === 'string' ? this.get(targetId) : undefined;
    if (!t || !t.alive) fail('Bu o‘yinchini tanlab bo‘lmaydi');
    return t;
  }

  private roleSuffix(p: Player): string {
    return this.settings.revealRoleOnDeath && p.role ? ` U ${ROLE_INFO[p.role].name} edi.` : '';
  }

  private sys(text: string, channel: ChatMessage['channel'] = 'system'): void {
    this.pushChat({ id: newId(6), channel, authorId: null, authorName: 'Boshlovchi', text, ts: Date.now() });
  }

  private pushChat(m: ChatMessage): void {
    this.chat.push(m);
    if (this.chat.length > CHAT_KEEP) this.chat.splice(0, this.chat.length - CHAT_KEEP);
  }

  private ensureHost(): void {
    const host = this.get(this.hostId);
    if (host && !host.isBot && host.connected && !host.left) return;
    const next = this.players.find((p) => !p.isBot && p.connected && !p.left);
    if (next && next.id !== this.hostId) {
      this.hostId = next.id;
      this.sys(`${next.name} endi xona egasi.`);
    }
  }

  // ───────────────────────── o'yinchilar ─────────────────────────

  addPlayer(rawName: unknown, isBot = false): Player {
    if (this.phase !== 'lobby') fail('O‘yin allaqachon boshlangan');
    if (this.players.length >= LIMITS.maxPlayers) fail(`Xona to‘la (maks. ${LIMITS.maxPlayers})`);
    let name = cleanText(rawName, LIMITS.nameMax);
    if (!name) fail('Ismingizni kiriting');
    const taken = new Set(this.players.map((p) => p.name.toLowerCase()));
    if (taken.has(name.toLowerCase())) {
      let i = 2;
      while (taken.has(`${name} ${i}`.toLowerCase())) i++;
      name = `${name.slice(0, LIMITS.nameMax - 3)} ${i}`;
    }
    const usedAvatars = new Set(this.players.map((p) => p.avatar));
    let avatar = 0;
    while (usedAvatars.has(avatar)) avatar++;
    const p: Player = {
      id: newId(6),
      token: newId(16),
      name,
      avatar,
      isBot,
      connected: isBot,
      left: false,
      socketId: null,
      alive: true,
      role: null,
      ready: false,
      chatTimes: [],
    };
    this.players.push(p);
    if (!this.hostId && !isBot) this.hostId = p.id;
    this.sys(`${p.name} xonaga qo‘shildi.`);
    return p;
  }

  addBot(pid: string): void {
    this.requireHost(pid);
    const used = new Set(this.players.map((p) => p.name.replace(/^🤖 /, '')));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${this.players.length + 1}`;
    this.addPlayer(name, true);
  }

  attach(p: Player, socketId: string): void {
    p.socketId = socketId;
    p.connected = true;
    const t = this.removalTimers.get(p.id);
    if (t) {
      clearTimeout(t);
      this.removalTimers.delete(p.id);
    }
    this.ensureHost();
  }

  /** Socket uzilganda chaqiriladi. */
  disconnect(pid: string, socketId: string): void {
    const p = this.get(pid);
    if (!p || p.socketId !== socketId) return;
    p.socketId = null;
    p.connected = false;
    this.ensureHost();
    if (this.phase === 'lobby') {
      // qisqa muddat ichida qaytmasa, lobbidan o'chiramiz
      const t = setTimeout(() => {
        this.removalTimers.delete(p.id);
        if (!p.connected && this.phase === 'lobby') {
          this.removePlayer(p.id);
          this.broadcast();
        }
      }, LOBBY_GRACE_MS);
      this.removalTimers.set(p.id, t);
    } else {
      this.recheckProgress();
    }
  }

  private removePlayer(pid: string): void {
    const p = this.get(pid);
    if (!p) return;
    this.players = this.players.filter((x) => x.id !== pid);
    this.sys(`${p.name} xonadan chiqdi.`);
    this.ensureHost();
  }

  leave(pid: string): void {
    const p = this.get(pid);
    if (!p) return;
    if (!this.inGame) {
      this.removePlayer(pid);
      return;
    }
    p.left = true;
    p.connected = false;
    p.socketId = null;
    if (p.alive) {
      this.kill(p);
      this.sys(`${p.name} o‘yinni tark etdi.${this.roleSuffix(p)}`);
      const w = this.checkWinner();
      if (w) {
        this.ensureHost();
        this.endGame(w);
        return;
      }
    }
    this.ensureHost();
    this.recheckProgress();
  }

  kick(pid: string, targetId: unknown): Player {
    this.requireHost(pid);
    if (this.phase !== 'lobby') fail('Faqat lobbida chiqarish mumkin');
    const t = typeof targetId === 'string' ? this.get(targetId) : undefined;
    if (!t) fail('O‘yinchi topilmadi');
    if (t.id === pid) fail('O‘zingizni chiqara olmaysiz');
    this.removePlayer(t.id);
    return t;
  }

  updateSettings(pid: string, patch: unknown): void {
    this.requireHost(pid);
    if (this.phase !== 'lobby') fail('Sozlamalarni faqat lobbida o‘zgartirish mumkin');
    const p = (patch && typeof patch === 'object' ? patch : {}) as Partial<Record<keyof Settings, unknown>>;
    const s = this.settings;
    const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
    this.settings = {
      discussionSec: clamp(p.discussionSec, LIMITS.discussionSec, s.discussionSec),
      votingSec: clamp(p.votingSec, LIMITS.votingSec, s.votingSec),
      nightSec: clamp(p.nightSec, LIMITS.nightSec, s.nightSec),
      revealRoleOnDeath: bool(p.revealRoleOnDeath, s.revealRoleOnDeath),
      useDon: bool(p.useDon, s.useDon),
      useDoctor: bool(p.useDoctor, s.useDoctor),
      useDetective: bool(p.useDetective, s.useDetective),
    };
  }

  // ───────────────────────── faza boshqaruvi ─────────────────────────

  private clearTimers(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pendingEnd = null;
    this.botTimers.forEach(clearTimeout);
    this.botTimers = [];
  }

  private setPhase(phase: Phase, ms: number | null, onEnd?: () => void): void {
    this.clearTimers();
    this.phaseToken++;
    this.phase = phase;
    this.settling = false;
    this.phaseEndsAt = ms == null ? null : Date.now() + ms;
    if (ms != null && onEnd) this.arm(ms, onEnd);
  }

  private arm(ms: number, onEnd: () => void): void {
    if (this.timer) clearTimeout(this.timer);
    this.pendingEnd = onEnd;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.pendingEnd = null;
      this.safe(onEnd);
    }, ms);
  }

  /** Hamma harakat qilib bo'ldi — qisqa pauzadan keyin fazani yakunlaymiz. */
  private settle(onEnd: () => void): void {
    if (this.settling) return;
    this.settling = true;
    this.phaseEndsAt = Date.now() + SETTLE_MS;
    this.arm(SETTLE_MS, onEnd);
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch (e) {
      if (!(e instanceof GameError)) console.error(`[${this.code}]`, e);
    }
    this.broadcast();
  }

  private later(minMs: number, maxMs: number, fn: () => void): void {
    const token = this.phaseToken;
    const t = setTimeout(() => {
      if (token !== this.phaseToken) return;
      this.safe(fn);
    }, rand(minMs, maxMs));
    this.botTimers.push(t);
  }

  /** Uzilish/chiqib ketishdan keyin faza tugashi mumkinligini tekshiradi. */
  private recheckProgress(): void {
    if (this.phase === 'night' && this.nightDone()) this.settle(() => this.endNight());
    else if (this.phase === 'day' && this.allReady()) this.settle(() => this.startVoting());
    else if (this.phase === 'voting' && this.allVoted()) this.settle(() => this.endVoting());
  }

  start(pid: string): void {
    this.requireHost(pid);
    if (this.phase !== 'lobby') fail('O‘yin allaqachon boshlangan');
    // lobbida uzilib qolganlarni olib tashlaymiz
    for (const p of [...this.players]) if (!p.isBot && !p.connected) this.removePlayer(p.id);
    const n = this.players.length;
    if (n < LIMITS.minPlayers) fail(`Kamida ${LIMITS.minPlayers} ta o‘yinchi kerak (hozir ${n})`);

    const roles = shuffle(buildRoleList(n, this.settings));
    this.players.forEach((p, i) => {
      p.role = roles[i];
      p.alive = true;
      p.ready = false;
    });
    this.round = 0;
    this.winner = null;
    this.votes.clear();
    this.night = emptyNight();
    this.doctorLastHeal = null;
    this.doctorSelfUsed = false;
    this.detectiveResults = [];
    this.donResults = [];
    this.chat = this.chat.filter((m) => m.channel === 'general' || m.channel === 'system');

    const mafia = roles.filter(isMafia).length;
    this.sys(`O‘yin boshlandi! ${n} o‘yinchi, ulardan ${mafia} nafari mafiya.`);
    this.announcement = { kind: 'reveal', title: 'Sizning rolingiz', lines: [] };
    this.setPhase('reveal', REVEAL_MS, () => this.startNight());
  }

  skip(pid: string): void {
    this.requireHost(pid);
    if (this.phase === 'day') {
      this.sys('Xona egasi muhokamani yakunladi.');
      this.startVoting();
      return;
    }
    if (['reveal', 'morning', 'verdict'].includes(this.phase) && this.pendingEnd) {
      const fn = this.pendingEnd;
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.pendingEnd = null;
      fn();
      return;
    }
    fail('Bu fazani o‘tkazib yuborib bo‘lmaydi');
  }

  // ───────────────────────── tun ─────────────────────────

  private startNight(): void {
    this.round++;
    this.night = emptyNight();
    this.announcement = null;
    this.players.forEach((p) => (p.ready = false));
    this.setPhase('night', this.settings.nightSec * 1000, () => this.endNight());
    this.sys(`🌙 ${this.round}-kecha. Shahar uxlaydi... Mafiya uyg‘onadi.`);
    this.sys('Qurbonni tanlang. Bir-biringiz bilan shu yerda kelishib oling.', 'mafia');
    this.scheduleBotNight();
  }

  private nightDone(): boolean {
    for (const p of this.players) {
      if (!this.awaited(p) || !p.role) continue;
      if (isMafia(p.role) && !this.night.mafiaVotes.has(p.id)) return false;
      if (p.role === 'don' && !this.night.donCheck) return false;
      if (p.role === 'doctor' && !this.night.heal) return false;
      if (p.role === 'detective' && !this.night.check) return false;
    }
    return true;
  }

  nightAction(pid: string, targetId: unknown): void {
    if (this.phase !== 'night') fail('Hozir tun emas');
    const p = this.requireAlive(pid);
    const t = this.requireTarget(targetId);
    switch (p.role) {
      case 'mafia':
      case 'don': {
        if (isMafia(t.role)) fail('Sherigingizni tanlay olmaysiz');
        const prev = this.night.mafiaVotes.get(p.id);
        this.night.mafiaVotes.set(p.id, t.id);
        if (prev !== t.id) this.sys(`${p.name} nishonga oldi: ${t.name}`, 'mafia');
        break;
      }
      case 'doctor': {
        if (t.id === this.doctorLastHeal) fail('Bir odamni ketma-ket ikki kecha davolab bo‘lmaydi');
        if (t.id === p.id && this.doctorSelfUsed) fail('O‘zingizni faqat bir marta davolay olasiz');
        this.night.heal = t.id;
        break;
      }
      case 'detective': {
        if (this.night.check) fail('Bu kecha tekshiruv qilib bo‘ldingiz');
        if (t.id === p.id) fail('O‘zingizni tekshira olmaysiz');
        this.night.check = t.id;
        this.detectiveResults.push({ targetId: t.id, round: this.round, positive: isMafia(t.role) });
        break;
      }
      default:
        fail('Sizning rolingiz tunda harakat qilmaydi');
    }
    if (this.nightDone()) this.settle(() => this.endNight());
  }

  donCheck(pid: string, targetId: unknown): void {
    if (this.phase !== 'night') fail('Hozir tun emas');
    const p = this.requireAlive(pid);
    if (p.role !== 'don') fail('Faqat Don tekshira oladi');
    if (this.night.donCheck) fail('Bu kecha tekshiruv qilib bo‘ldingiz');
    const t = this.requireTarget(targetId);
    if (t.id === p.id) fail('O‘zingizni tekshira olmaysiz');
    this.night.donCheck = t.id;
    this.donResults.push({ targetId: t.id, round: this.round, positive: t.role === 'detective' });
    if (this.nightDone()) this.settle(() => this.endNight());
  }

  private resolveMafiaTarget(): Player | null {
    const valid = (id: string | undefined) => {
      const t = id ? this.get(id) : undefined;
      return t && t.alive && !isMafia(t.role) ? t : null;
    };
    const don = this.players.find((p) => p.alive && p.role === 'don');
    if (don && this.night.mafiaVotes.has(don.id)) {
      const t = valid(this.night.mafiaVotes.get(don.id));
      if (t) return t;
    }
    const tally = new Map<string, number>();
    for (const [voter, target] of this.night.mafiaVotes) {
      if (!this.get(voter)?.alive || !valid(target)) continue;
      tally.set(target, (tally.get(target) ?? 0) + 1);
    }
    if (!tally.size) return null;
    const max = Math.max(...tally.values());
    const leaders = [...tally].filter(([, c]) => c === max).map(([id]) => id);
    return valid(pick(leaders)) ?? null;
  }

  private endNight(): void {
    const target = this.resolveMafiaTarget();
    const doctor = this.players.find((p) => p.alive && p.role === 'doctor');
    const heal = doctor ? this.night.heal : null;
    this.doctorLastHeal = heal;
    if (doctor && heal === doctor.id) this.doctorSelfUsed = true;

    const lines: string[] = [];
    if (target && heal === target.id) {
      lines.push('Mafiya kimgadir hujum qildi, lekin Shifokor uni qutqarib qoldi! Bu tun hech kim o‘lmadi.');
    } else if (target) {
      this.kill(target);
      lines.push(`${target.name} tunda o‘ldirildi.${this.roleSuffix(target)}`);
    } else {
      lines.push('Tun tinch o‘tdi. Hech kim o‘lmadi.');
    }
    this.announcement = { kind: 'morning', title: `${this.round}-kun tongi`, lines };
    lines.forEach((l) => this.sys(`🌅 ${l}`));
    this.setPhase('morning', MORNING_MS, () => {
      const w = this.checkWinner();
      if (w) this.endGame(w);
      else this.startDay();
    });
  }

  // ───────────────────────── kun ─────────────────────────

  private startDay(): void {
    this.announcement = null;
    this.players.forEach((p) => (p.ready = false));
    this.setPhase('day', this.settings.discussionSec * 1000, () => this.startVoting());
    this.sys(`☀️ ${this.round}-kun. Muhokama boshlandi — mafiyani toping!`);
    this.scheduleBotDay();
  }

  private allReady(): boolean {
    return this.players.every((p) => !this.awaited(p) || p.ready || p.isBot);
  }

  toggleReady(pid: string): void {
    if (this.phase !== 'day') fail('Hozir muhokama vaqti emas');
    const p = this.requireAlive(pid);
    p.ready = !p.ready;
    if (this.allReady()) this.settle(() => this.startVoting());
  }

  private startVoting(): void {
    this.votes.clear();
    this.players.forEach((p) => (p.ready = false));
    this.setPhase('voting', this.settings.votingSec * 1000, () => this.endVoting());
    this.sys('🗳️ Ovoz berish boshlandi! Kimni shahardan haydaymiz?');
    this.scheduleBotVotes();
  }

  private allVoted(): boolean {
    return this.players.every((p) => !this.awaited(p) || this.votes.has(p.id));
  }

  vote(pid: string, targetId: unknown): void {
    if (this.phase !== 'voting') fail('Hozir ovoz berish vaqti emas');
    const p = this.requireAlive(pid);
    if (targetId === null) {
      this.votes.set(p.id, null);
    } else {
      const t = this.requireTarget(targetId);
      if (t.id === p.id) fail('O‘zingizga ovoz bera olmaysiz');
      this.votes.set(p.id, t.id);
    }
    if (this.allVoted()) this.settle(() => this.endVoting());
  }

  private endVoting(): void {
    const tally = new Map<string, number>();
    for (const [voter, target] of this.votes) {
      if (!target || !this.get(voter)?.alive || !this.get(target)?.alive) continue;
      tally.set(target, (tally.get(target) ?? 0) + 1);
    }
    const max = tally.size ? Math.max(...tally.values()) : 0;
    const leaders = [...tally].filter(([, c]) => c === max).map(([id]) => id);
    const lines: string[] = [];
    if (max > 0 && leaders.length === 1) {
      const out = this.get(leaders[0])!;
      this.kill(out);
      lines.push(`Ko‘pchilik ovozi (${max}) bilan ${out.name} shahardan haydaldi.${this.roleSuffix(out)}`);
    } else if (max === 0) {
      lines.push('Hech kim ovoz bermadi. Bugun hech kim haydalmadi.');
    } else {
      lines.push('Ovozlar teng bo‘lib qoldi. Bugun hech kim haydalmadi.');
    }
    this.announcement = { kind: 'verdict', title: 'Shahar hukmi', lines };
    lines.forEach((l) => this.sys(`⚖️ ${l}`));
    this.setPhase('verdict', VERDICT_MS, () => {
      const w = this.checkWinner();
      if (w) this.endGame(w);
      else this.startNight();
    });
  }

  // ───────────────────────── yakun ─────────────────────────

  private kill(p: Player): void {
    p.alive = false;
    p.ready = false;
    this.votes.delete(p.id);
    this.night.mafiaVotes.delete(p.id);
  }

  checkWinner(): Team | null {
    const alive = this.alive();
    const m = alive.filter((p) => isMafia(p.role)).length;
    const t = alive.length - m;
    if (m === 0) return 'town';
    if (m >= t) return 'mafia';
    return null;
  }

  private endGame(w: Team): void {
    this.setPhase('ended', null);
    this.winner = w;
    const title = w === 'town' ? 'Tinch aholi g‘alaba qozondi!' : 'Mafiya g‘alaba qozondi!';
    const line =
      w === 'town'
        ? 'Barcha mafiya a’zolari fosh qilindi. Shahar yana tinch.'
        : 'Mafiya shaharni o‘z qo‘liga oldi.';
    this.announcement = { kind: 'ended', title, lines: [line] };
    this.sys(`🏁 ${title} ${line}`);
  }

  toLobby(pid: string): void {
    this.requireHost(pid);
    if (this.phase === 'lobby') return;
    this.setPhase('lobby', null);
    for (const p of [...this.players]) if (p.left || (!p.isBot && !p.connected)) this.removePlayer(p.id);
    this.players.forEach((p) => {
      p.alive = true;
      p.role = null;
      p.ready = false;
    });
    this.round = 0;
    this.winner = null;
    this.announcement = null;
    this.votes.clear();
    this.night = emptyNight();
    this.chat = this.chat.filter((m) => m.channel === 'general' || m.channel === 'system');
    this.sys('Yangi o‘yin uchun lobbiga qaytildi.');
  }

  // ───────────────────────── chat ─────────────────────────

  canChat(p: Player, channel: ChatChannel): boolean {
    if (channel === 'general') {
      if (!this.inGame) return true;
      return p.alive && this.phase !== 'night' && this.phase !== 'reveal';
    }
    if (!this.inGame) return false;
    if (channel === 'mafia') return p.alive && isMafia(p.role);
    if (channel === 'dead') return !p.alive;
    return false;
  }

  chatSend(pid: string, channel: unknown, rawText: unknown): void {
    const p = this.get(pid);
    if (!p) fail('O‘yinchi topilmadi');
    if (channel !== 'general' && channel !== 'mafia' && channel !== 'dead') fail('Noto‘g‘ri kanal');
    if (!this.canChat(p, channel)) fail('Hozir bu kanalga yoza olmaysiz');
    const text = cleanText(rawText, LIMITS.chatMax);
    if (!text) return;
    const now = Date.now();
    p.chatTimes = p.chatTimes.filter((t) => now - t < 5000);
    if (p.chatTimes.length >= 6) fail('Juda tez yozyapsiz, biroz kuting');
    p.chatTimes.push(now);
    this.pushChat({ id: newId(6), channel, authorId: p.id, authorName: p.name, text, ts: now });
  }

  // ───────────────────────── botlar ─────────────────────────

  private scheduleBotNight(): void {
    const maxMs = Math.max(3000, this.settings.nightSec * 1000 * 0.6);
    for (const bot of this.players.filter((p) => p.isBot && p.alive)) {
      switch (bot.role) {
        case 'mafia':
        case 'don':
          this.later(2000, maxMs, () => {
            if (!bot.alive) return;
            const victims = this.alive().filter((p) => !isMafia(p.role));
            // sherigi tanlagan bo'lsa, unga qo'shilamiz
            const existing = [...this.night.mafiaVotes.values()].filter((id) => victims.some((v) => v.id === id));
            const target = pick(existing) ?? pick(victims)?.id;
            if (target) this.nightAction(bot.id, target);
            if (Math.random() < 0.3) {
              const name = this.get(target ?? '')?.name;
              if (name) this.pushChat({ id: newId(6), channel: 'mafia', authorId: bot.id, authorName: bot.name, text: botPhrase('mafia', name), ts: Date.now() });
            }
          });
          if (bot.role === 'don') {
            this.later(2000, maxMs, () => {
              if (!bot.alive) return;
              const checked = new Set(this.donResults.map((r) => r.targetId));
              const pool = this.alive().filter((p) => !isMafia(p.role) && !checked.has(p.id));
              const t = pick(pool) ?? pick(this.alive().filter((p) => p.id !== bot.id));
              if (t) this.donCheck(bot.id, t.id);
            });
          }
          break;
        case 'doctor':
          this.later(2000, maxMs, () => {
            if (!bot.alive) return;
            const pool = this.alive().filter(
              (p) => p.id !== this.doctorLastHeal && !(p.id === bot.id && this.doctorSelfUsed),
            );
            const self = pool.find((p) => p.id === bot.id);
            const t = self && Math.random() < 0.25 ? self : pick(pool);
            if (t) this.nightAction(bot.id, t.id);
          });
          break;
        case 'detective':
          this.later(2000, maxMs, () => {
            if (!bot.alive) return;
            const checked = new Set(this.detectiveResults.map((r) => r.targetId));
            const others = this.alive().filter((p) => p.id !== bot.id);
            const t = pick(others.filter((p) => !checked.has(p.id))) ?? pick(others);
            if (t) this.nightAction(bot.id, t.id);
          });
          break;
        default:
          break;
      }
    }
  }

  private scheduleBotDay(): void {
    const maxMs = this.settings.discussionSec * 1000 * 0.5;
    for (const bot of this.players.filter((p) => p.isBot && p.alive)) {
      if (Math.random() < 0.6) {
        this.later(2000, maxMs, () => {
          if (!bot.alive || this.phase !== 'day') return;
          const other = pick(this.alive().filter((p) => p.id !== bot.id && !(isMafia(bot.role) && isMafia(p.role))));
          if (other) this.chatSend(bot.id, 'general', botPhrase('day', other.name));
        });
      }
      this.later(1500, 5000, () => {
        if (bot.alive && this.phase === 'day') {
          bot.ready = true;
          if (this.allReady()) this.settle(() => this.startVoting());
        }
      });
    }
  }

  private scheduleBotVotes(): void {
    const maxMs = Math.max(3000, this.settings.votingSec * 1000 * 0.7);
    for (const bot of this.players.filter((p) => p.isBot && p.alive)) {
      this.later(2500, maxMs, () => {
        if (!bot.alive) return;
        const others = this.alive().filter((p) => p.id !== bot.id);
        const tally = new Map<string, number>();
        for (const t of this.votes.values()) if (t) tally.set(t, (tally.get(t) ?? 0) + 1);
        const leader = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0];
        let target: string | null = null;

        if (isMafia(bot.role)) {
          const town = others.filter((p) => !isMafia(p.role));
          target = leader && town.some((p) => p.id === leader) && Math.random() < 0.7 ? leader : pick(town)?.id ?? null;
        } else {
          const knownMafia =
            bot.role === 'detective'
              ? this.detectiveResults.filter((r) => r.positive && this.get(r.targetId)?.alive).map((r) => r.targetId)
              : [];
          if (knownMafia.length) target = knownMafia[0];
          else if (Math.random() < 0.1) target = null;
          else if (leader && leader !== bot.id && Math.random() < 0.5) target = leader;
          else target = pick(others)?.id ?? null;
        }
        this.vote(bot.id, target);
      });
    }
  }

  // ───────────────────────── holat yuborish ─────────────────────────

  viewFor(viewer: Player): ClientState {
    const inGame = this.inGame;
    const revealAll = this.phase === 'ended' || (inGame && !viewer.alive);
    const viewerMafia = inGame && isMafia(viewer.role);

    const players = this.players.map((p) => {
      const visible =
        p.id === viewer.id ||
        revealAll ||
        (viewerMafia && isMafia(p.role)) ||
        (!p.alive && this.settings.revealRoleOnDeath);
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.id === this.hostId,
        isBot: p.isBot,
        connected: p.connected,
        alive: p.alive,
        role: visible ? p.role : null,
        ready: p.ready,
      };
    });

    const showVotes = this.phase === 'voting' || this.phase === 'verdict';
    const seeMafia = viewerMafia || revealAll;

    let myTarget: string | null = null;
    if (this.phase === 'night') {
      if (isMafia(viewer.role)) myTarget = this.night.mafiaVotes.get(viewer.id) ?? null;
      else if (viewer.role === 'doctor') myTarget = this.night.heal;
      else if (viewer.role === 'detective') myTarget = this.night.check;
    }

    const chat = this.chat.filter((m) => {
      if (m.channel === 'general' || m.channel === 'system') return true;
      if (m.channel === 'mafia') return seeMafia;
      if (m.channel === 'dead') return revealAll;
      return false;
    });

    return {
      code: this.code,
      youId: viewer.id,
      hostId: this.hostId,
      phase: this.phase,
      round: this.round,
      phaseEndsAt: this.phaseEndsAt,
      serverNow: Date.now(),
      settings: this.settings,
      players,
      votes: showVotes ? Object.fromEntries(this.votes) : {},
      mafiaVotes: seeMafia && this.phase === 'night' ? Object.fromEntries(this.night.mafiaVotes) : {},
      myNight: {
        target: myTarget,
        donCheck: this.phase === 'night' && viewer.role === 'don' ? this.night.donCheck : null,
      },
      detectiveResults: viewer.role === 'detective' || revealAll ? this.detectiveResults : [],
      donResults: viewer.role === 'don' || revealAll ? this.donResults : [],
      doctor:
        viewer.role === 'doctor' && inGame ? { lastHeal: this.doctorLastHeal, selfUsed: this.doctorSelfUsed } : null,
      announcement: this.announcement,
      winner: this.winner,
      chat,
    };
  }

  broadcast(): void {
    for (const p of this.players) {
      if (!p.isBot && p.connected && p.socketId) this.send(p.socketId, this.viewFor(p));
    }
  }

  dispose(): void {
    this.clearTimers();
    this.removalTimers.forEach(clearTimeout);
    this.removalTimers.clear();
  }
}
