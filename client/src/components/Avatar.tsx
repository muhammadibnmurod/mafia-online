import { AVATAR_COLORS } from '../../../shared/roles';

export function Avatar({ name, index, size = 40, dead = false }: { name: string; index: number; size?: number; dead?: boolean }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={`avatar${dead ? ' avatar-dead' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.4, background: color }}
      aria-hidden
    >
      {dead ? '💀' : initials}
    </span>
  );
}
