import { randomBytes, randomInt } from 'node:crypto';

export class GameError extends Error {}

export function fail(message: string): never {
  throw new GameError(message);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[randomInt(arr.length)] : undefined;
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function newId(bytes = 8): string {
  return randomBytes(bytes).toString('hex');
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function roomCode(len = 5): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // boshqaruv belgilarini olib tashlaymiz, bo'shliqlarni siqamiz
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function clamp(n: unknown, [lo, hi]: readonly [number, number], fallback: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(hi, Math.max(lo, v));
}
