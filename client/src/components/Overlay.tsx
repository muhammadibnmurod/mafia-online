import { useEffect, useState } from 'react';
import { ROLE_INFO, TEAM_INFO, isMafia } from '../../../shared/roles';
import { useCountdown, useGame, useGameState } from '../game';
import { Avatar } from './Avatar';

/** Rol kartasi, tong/hukm e'loni va o'yin yakuni uchun to'liq ekranli oyna. */
export function Overlay() {
  const { api } = useGame();
  const { state, me } = useGameState();
  const left = useCountdown(state.phaseEndsAt);
  const key = `${state.phase}-${state.round}`;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => setFlipped(false), [key]);

  const a = state.announcement;
  if (!a || dismissed === key) return null;
  const close = () => setDismissed(key);

  if (a.kind === 'reveal') {
    const role = me.role ? ROLE_INFO[me.role] : null;
    const mates = state.players.filter((p) => p.id !== me.id && isMafia(p.role));
    return (
      <div className="overlay" onClick={() => flipped && close()}>
        <div className="reveal" onClick={(e) => e.stopPropagation()}>
          <p className="eyebrow">Sizning rolingiz</p>
          <button className={`flip-card${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(true)} aria-label="Kartani ochish">
            <span className="flip-inner">
              <span className="flip-front">
                <span className="flip-logo">🎩</span>
                <span>Ochish uchun bosing</span>
              </span>
              <span className={`flip-back team-${role?.team ?? 'town'}`}>
                <span className="flip-icon">{role?.icon}</span>
                <span className="flip-name">{role?.name}</span>
                <span className="flip-team">{role && TEAM_INFO[role.team].name} jamoasi</span>
              </span>
            </span>
          </button>
          {flipped && role && (
            <div className="reveal-info">
              <p>{role.description}</p>
              {isMafia(me.role) && mates.length > 0 && (
                <p className="mates">
                  Sheriklaringiz: <b>{mates.map((m) => `${m.name} (${ROLE_INFO[m.role!].name})`).join(', ')}</b>
                </p>
              )}
              <button className="btn btn-primary" onClick={close}>
                Tushunarli {left != null && `(${left})`}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (a.kind === 'ended') {
    const win = state.winner;
    const iWon = me.role ? ROLE_INFO[me.role].team === win : false;
    return (
      <div className="overlay">
        <div className={`endgame card team-${win}`}>
          <div className="endgame-icon">{win ? TEAM_INFO[win].icon : '🏁'}</div>
          <h1>{a.title}</h1>
          <p className="muted">{a.lines.join(' ')}</p>
          <p className={`you-result ${iWon ? 'won' : 'lost'}`}>{iWon ? 'Siz yutdingiz! 🎉' : 'Siz yutqazdingiz'}</p>
          <ul className="final-roles">
            {state.players.map((p) => {
              const r = p.role ? ROLE_INFO[p.role] : null;
              return (
                <li key={p.id} className={`${r ? `team-${r.team}` : ''}${p.alive ? '' : ' is-dead'}`}>
                  <Avatar name={p.name} index={p.avatar} size={30} dead={!p.alive} />
                  <span className="grow">
                    {p.name}
                    {p.id === me.id && <span className="muted"> (siz)</span>}
                  </span>
                  <span>
                    {r?.icon} {r?.name}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="row center">
            {me.isHost ? (
              <button className="btn btn-primary" onClick={api.toLobby}>
                Yangi o‘yin
              </button>
            ) : (
              <span className="muted small">Xona egasi yangi o‘yin boshlaydi</span>
            )}
            <button className="btn btn-ghost" onClick={close}>
              Chatni ko‘rish
            </button>
            <button className="btn btn-ghost" onClick={api.leave}>
              Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // tong yoki hukm
  return (
    <div className="overlay" onClick={close}>
      <div className={`announce card announce-${a.kind}`} onClick={(e) => e.stopPropagation()}>
        <div className="announce-icon">{a.kind === 'morning' ? '🌅' : '⚖️'}</div>
        <h1>{a.title}</h1>
        {a.lines.map((l, i) => (
          <p key={i} className="announce-line">
            {l}
          </p>
        ))}
        <button className="btn btn-secondary" onClick={close}>
          Yopish {left != null && `(${left})`}
        </button>
      </div>
    </div>
  );
}
