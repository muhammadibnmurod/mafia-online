import type { Phase, Role, Settings, Team } from './types';

export interface RoleInfo {
  name: string;
  icon: string;
  team: Team;
  short: string;
  description: string;
}

export const ROLE_INFO: Record<Role, RoleInfo> = {
  don: {
    name: 'Don',
    icon: '🎩',
    team: 'mafia',
    short: 'Mafiya boshlig‘i',
    description:
      'Mafiya boshlig‘isiz. Tunda qurbonni oxirgi bo‘lib siz hal qilasiz va har kecha bitta o‘yinchini “Komissarmi?” deb tekshira olasiz.',
  },
  mafia: {
    name: 'Mafiya',
    icon: '🔫',
    team: 'mafia',
    short: 'Tunda o‘ldiradi',
    description:
      'Siz mafiyasiz. Tunda sheriklaringiz bilan birga qurbon tanlaysiz. Kunduzi o‘zingizni tinch aholi qilib ko‘rsating.',
  },
  doctor: {
    name: 'Shifokor',
    icon: '💉',
    team: 'town',
    short: 'Tunda davolaydi',
    description:
      'Har kecha bitta odamni davolaysiz — mafiya uni tanlasa, u tirik qoladi. Bir odamni ketma-ket ikki kecha davolab bo‘lmaydi, o‘zingizni esa faqat bir marta.',
  },
  detective: {
    name: 'Komissar',
    icon: '🔍',
    team: 'town',
    short: 'Tunda tekshiradi',
    description:
      'Har kecha bitta o‘yinchini tekshirasiz va uning mafiya yoki yo‘qligini bilib olasiz. Bilganingizni ehtiyotkorlik bilan ishlating.',
  },
  civilian: {
    name: 'Tinch aholi',
    icon: '👤',
    team: 'town',
    short: 'Mafiyani topadi',
    description:
      'Sizda tungi qobiliyat yo‘q, lekin ovozingiz kuchli. Kunduzi muhokama qiling, yolg‘onchini toping va mafiyani shahardan haydang.',
  },
};

export const TEAM_INFO: Record<Team, { name: string; icon: string }> = {
  mafia: { name: 'Mafiya', icon: '🔫' },
  town: { name: 'Tinch aholi', icon: '🏙️' },
};

export const PHASE_INFO: Record<Phase, { name: string; icon: string }> = {
  lobby: { name: 'Lobbi', icon: '🚪' },
  reveal: { name: 'Rollar tarqatildi', icon: '🃏' },
  night: { name: 'Tun', icon: '🌙' },
  morning: { name: 'Tong', icon: '🌅' },
  day: { name: 'Muhokama', icon: '☀️' },
  voting: { name: 'Ovoz berish', icon: '🗳️' },
  verdict: { name: 'Hukm', icon: '⚖️' },
  ended: { name: 'O‘yin tugadi', icon: '🏁' },
};

export const isMafia = (role: Role | null | undefined): boolean => role === 'mafia' || role === 'don';

export function mafiaCount(n: number): number {
  if (n <= 5) return 1;
  if (n <= 8) return 2;
  if (n <= 11) return 3;
  return 4;
}

/** O'yinchilar soniga qarab rollar ro'yxati (aralashtirilmagan). */
export function buildRoleList(n: number, s: Settings): Role[] {
  const roles: Role[] = [];
  const m = mafiaCount(n);
  if (s.useDon && m >= 2) {
    roles.push('don');
    for (let i = 1; i < m; i++) roles.push('mafia');
  } else {
    for (let i = 0; i < m; i++) roles.push('mafia');
  }
  if (s.useDoctor) roles.push('doctor');
  if (s.useDetective) roles.push('detective');
  while (roles.length < n) roles.push('civilian');
  return roles.slice(0, n);
}

export const AVATAR_COLORS = [
  '#e0525a', '#e98b3a', '#e8c547', '#7cc653', '#3fb68b', '#36a9c9', '#4f7fe0', '#7a64e0',
  '#b25ad6', '#d6589e', '#a3785a', '#6d8a99', '#c4a66e', '#5aa37a', '#8f6fb8', '#d0705a',
];
