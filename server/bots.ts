import { pick } from './util';

export const BOT_NAMES = [
  'Anvar', 'Dilnoza', 'Jasur', 'Malika', 'Sardor', 'Nigora', 'Bekzod', 'Kamola',
  'Otabek', 'Zarina', 'Rustam', 'Madina', 'Sherzod', 'Gulnora', 'Aziz', 'Shahnoza',
];

const DAY_PHRASES = [
  'Menimcha, {name} juda shubhali.',
  'Men tinch aholiman, ishoninglar!',
  '{name}, kecha tunda nima qilding?',
  'Hozircha aniq bir narsa deya olmayman.',
  'Keling, {name}ga ovoz beraylik.',
  'Mafiya oramizda, ehtiyot bo‘linglar!',
  'Men {name}ga ishonaman.',
  '{name} juda jim o‘tiribdi, bu yaxshi emas.',
  'Shoshilmaylik, avval hammani eshitaylik.',
];

const MAFIA_PHRASES = [
  'Men {name}ni taklif qilaman.',
  '{name} xavfli, uni olib tashlaylik.',
  'Kunduzi ehtiyot bo‘linglar, bizni sezib qolishmasin.',
];

export function botPhrase(kind: 'day' | 'mafia', name: string): string {
  const tpl = pick(kind === 'day' ? DAY_PHRASES : MAFIA_PHRASES) ?? '...';
  return tpl.replace('{name}', name);
}
