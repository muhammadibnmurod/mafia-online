// Server va client o'rtasidagi umumiy turlar.

export type Role = 'mafia' | 'don' | 'doctor' | 'detective' | 'civilian';
export type Team = 'mafia' | 'town';
export type Phase =
  | 'lobby'
  | 'reveal' // rollar ko'rsatiladi
  | 'night' // mafiya, shifokor, komissar harakat qiladi
  | 'morning' // tun natijasi e'lon qilinadi
  | 'day' // muhokama
  | 'voting' // ovoz berish
  | 'verdict' // ovoz natijasi
  | 'ended';

export type ChatChannel = 'general' | 'mafia' | 'dead';

export interface Settings {
  discussionSec: number;
  votingSec: number;
  nightSec: number;
  revealRoleOnDeath: boolean;
  useDon: boolean;
  useDoctor: boolean;
  useDetective: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  discussionSec: 120,
  votingSec: 45,
  nightSec: 45,
  revealRoleOnDeath: true,
  useDon: true,
  useDoctor: true,
  useDetective: true,
};

export const LIMITS = {
  minPlayers: 4,
  maxPlayers: 16,
  nameMax: 20,
  chatMax: 300,
  discussionSec: [30, 600] as const,
  votingSec: [15, 180] as const,
  nightSec: [20, 180] as const,
};

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: number;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  alive: boolean;
  /** Faqat ko'rish huquqi bo'lsa to'ldiriladi, aks holda null. */
  role: Role | null;
  ready: boolean;
}

export interface ChatMessage {
  id: string;
  channel: ChatChannel | 'system';
  /** null — tizim xabari */
  authorId: string | null;
  authorName: string;
  text: string;
  ts: number;
}

export interface CheckResult {
  targetId: string;
  round: number;
  /** Komissar uchun: mafiyami? Don uchun: komissarmi? */
  positive: boolean;
}

export interface Announcement {
  kind: 'reveal' | 'morning' | 'verdict' | 'ended';
  title: string;
  lines: string[];
}

export interface ClientState {
  code: string;
  youId: string;
  hostId: string;
  phase: Phase;
  round: number;
  phaseEndsAt: number | null;
  serverNow: number;
  settings: Settings;
  players: PublicPlayer[];
  /** Ochiq ovoz berish: kim kimga ovoz berdi (voting/verdict fazalarida). */
  votes: Record<string, string | null>;
  /** Faqat mafiya jamoasi ko'radi: sherigi kimni tanlagan. */
  mafiaVotes: Record<string, string>;
  /** Tungi tanlovingiz (mafiya — qurbon, shifokor — davolash, komissar — tekshirish). */
  myNight: { target: string | null; donCheck: string | null };
  detectiveResults: CheckResult[];
  donResults: CheckResult[];
  doctor: { lastHeal: string | null; selfUsed: boolean } | null;
  announcement: Announcement | null;
  winner: Team | null;
  chat: ChatMessage[];
}

export type AckResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
export type Ack<T = object> = (res: AckResult<T>) => void;

export interface JoinResult {
  code: string;
  token: string;
  playerId: string;
}
