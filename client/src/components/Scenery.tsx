import { useMemo, type CSSProperties } from 'react';
import { ROLE_INFO } from '../../../shared/roles';
import type { Role } from '../../../shared/types';

export const ROLES: Role[] = ['don', 'mafia', 'doctor', 'detective', 'civilian'];

/** Oddiy deterministik tasodifiy sonlar — har safar bir xil shahar chiziladi. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** Tungi shahar: derazalar birin-ketin o'chadi, faqat mafiya uyg'oq qoladi. */
export function Skyline() {
  const { buildings, windows } = useMemo(() => {
    const rnd = seeded(7);
    const buildings: { x: number; w: number; h: number }[] = [];
    const windows: { x: number; y: number; delay: number | null }[] = [];
    for (let x = 0; x < 1440; ) {
      const w = 48 + Math.floor(rnd() * 70);
      const h = 70 + Math.floor(rnd() * 150);
      buildings.push({ x, w, h });
      for (let wy = 240 - h + 14; wy < 226; wy += 16) {
        for (let wx = x + 9; wx < x + w - 12; wx += 14) {
          if (rnd() < 0.3) windows.push({ x: wx, y: wy, delay: rnd() < 0.82 ? 0.6 + rnd() * 5 : null });
        }
      }
      x += w + 2 + Math.floor(rnd() * 6);
    }
    return { buildings, windows };
  }, []);

  return (
    <svg className="h-skyline" viewBox="0 0 1440 240" preserveAspectRatio="xMidYMax slice" aria-hidden>
      {buildings.map((b) => (
        <rect key={b.x} x={b.x} y={240 - b.h} width={b.w} height={b.h} />
      ))}
      {windows.map((w, i) => (
        <rect
          key={i}
          className={w.delay === null ? 'win win-awake' : 'win'}
          x={w.x}
          y={w.y}
          width={6}
          height={8}
          style={w.delay === null ? undefined : { animationDelay: `${w.delay.toFixed(2)}s` }}
        />
      ))}
    </svg>
  );
}

function CardFace({ role }: { role: Role }) {
  const info = ROLE_INFO[role];
  return (
    <>
      <span className="h-card-corner" aria-hidden>
        {info.name[0]}
      </span>
      <span className="h-card-icon" aria-hidden>
        {info.icon}
      </span>
      <span className="h-card-name">{info.name}</span>
    </>
  );
}

const fanStyle = (i: number) => {
  const o = i - (ROLES.length - 1) / 2;
  return { '--o': o, '--lift': Math.abs(o) } as CSSProperties;
};

/** Yelpig'ich shaklidagi rol kartalari. `onActive` berilmasa — faqat bezak. */
export function CardFan({ active, onActive }: { active?: Role; onActive?: (r: Role) => void }) {
  if (!onActive) {
    return (
      <div className="h-fan is-deco" aria-hidden>
        {ROLES.map((r, i) => (
          <div key={r} className={`h-card team-${ROLE_INFO[r].team}`} style={fanStyle(i)}>
            <CardFace role={r} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="h-fan">
      {ROLES.map((r, i) => (
        <button
          key={r}
          type="button"
          className={`h-card team-${ROLE_INFO[r].team}${r === active ? ' is-active' : ''}`}
          style={fanStyle(i)}
          aria-pressed={r === active}
          onMouseEnter={() => onActive(r)}
          onFocus={() => onActive(r)}
          onClick={() => onActive(r)}
        >
          <CardFace role={r} />
        </button>
      ))}
    </div>
  );
}
