import { ROLE_INFO, buildRoleList } from '../../../shared/roles';
import { LIMITS, type Role, type Settings } from '../../../shared/types';
import { useGame, useGameState } from '../game';
import { Avatar } from './Avatar';
import { Chat } from './Chat';

const TIME_OPTIONS: Record<'discussionSec' | 'votingSec' | 'nightSec', number[]> = {
  discussionSec: [30, 60, 90, 120, 180, 240, 300],
  votingSec: [15, 30, 45, 60, 90],
  nightSec: [20, 30, 45, 60, 90],
};

const fmt = (s: number) => (s < 60 ? `${s} soniya` : `${Math.floor(s / 60)}${s % 60 ? `:${String(s % 60).padStart(2, '0')}` : ''} daqiqa`);

export function Lobby() {
  const { api, toast } = useGame();
  const { state, me } = useGameState();
  const isHost = me.isHost;
  const n = state.players.length;
  const canStart = n >= LIMITS.minPlayers;

  const roles = buildRoleList(Math.max(n, LIMITS.minPlayers), state.settings);
  const counts = roles.reduce<Partial<Record<Role, number>>>((acc, r) => ({ ...acc, [r]: (acc[r] ?? 0) + 1 }), {});

  const inviteUrl = `${location.origin}/?room=${state.code}`;
  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg);
    } catch {
      toast(text);
    }
  };

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => api.settings({ [k]: v });

  return (
    <div className="lobby">
      <header className="lobby-head">
        <div className="brand-sm">🎩 MAFIA</div>
        <button className="btn btn-ghost" onClick={api.leave}>
          Chiqish
        </button>
      </header>

      <section className="room-code card">
        <div>
          <div className="eyebrow">Xona kodi</div>
          <button className="code-big" onClick={() => copy(state.code, 'Kod nusxalandi')} title="Nusxalash">
            {state.code}
          </button>
        </div>
        <div className="room-code-actions">
          <button className="btn btn-secondary" onClick={() => copy(inviteUrl, 'Taklif havolasi nusxalandi')}>
            🔗 Taklif havolasi
          </button>
          <p className="hint">Do‘stlaringizga kod yoki havolani yuboring.</p>
        </div>
      </section>

      <div className="lobby-grid">
        <section className="card">
          <div className="card-head">
            <h2>
              O‘yinchilar <span className="muted">
                {n}/{LIMITS.maxPlayers}
              </span>
            </h2>
            {isHost && (
              <button className="btn btn-small btn-secondary" onClick={api.addBot} disabled={n >= LIMITS.maxPlayers}>
                + Bot qo‘shish
              </button>
            )}
          </div>
          <ul className="player-list">
            {state.players.map((p) => (
              <li key={p.id} className={!p.connected ? 'is-offline' : ''}>
                <Avatar name={p.name} index={p.avatar} size={36} />
                <span className="player-name">
                  {p.name}
                  {p.id === me.id && <span className="tag">siz</span>}
                  {p.isHost && <span className="tag tag-gold">👑 egasi</span>}
                  {p.isBot && <span className="tag">bot</span>}
                  {!p.connected && <span className="tag tag-dim">oflayn</span>}
                </span>
                {isHost && p.id !== me.id && (
                  <button className="icon-btn" onClick={() => api.kick(p.id)} title="Chiqarish" aria-label={`${p.name}ni chiqarish`}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="composition">
            <div className="eyebrow">Rollar taqsimoti {n < LIMITS.minPlayers && `(${LIMITS.minPlayers} kishi uchun)`}</div>
            <div className="chips">
              {(Object.keys(counts) as Role[]).map((r) => (
                <span key={r} className={`chip team-${ROLE_INFO[r].team}`}>
                  {ROLE_INFO[r].icon} {ROLE_INFO[r].name} × {counts[r]}
                </span>
              ))}
            </div>
          </div>

          {isHost ? (
            <button className="btn btn-primary btn-lg btn-block" disabled={!canStart} onClick={api.start}>
              {canStart ? 'O‘yinni boshlash' : `Kamida ${LIMITS.minPlayers} o‘yinchi kerak`}
            </button>
          ) : (
            <p className="waiting">Xona egasi o‘yinni boshlashini kuting…</p>
          )}
        </section>

        <section className="card settings">
          <h2>Sozlamalar</h2>
          {(
            [
              ['discussionSec', 'Muhokama vaqti'],
              ['votingSec', 'Ovoz berish vaqti'],
              ['nightSec', 'Tun vaqti'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="setting-row">
              <span>{label}</span>
              <select value={state.settings[k]} disabled={!isHost} onChange={(e) => set(k, Number(e.target.value))}>
                {[...new Set([...TIME_OPTIONS[k], state.settings[k]])]
                  .sort((a, b) => a - b)
                  .map((v) => (
                    <option key={v} value={v}>
                      {fmt(v)}
                    </option>
                  ))}
              </select>
            </label>
          ))}
          {(
            [
              ['useDon', 'Don (6+ o‘yinchida)'],
              ['useDoctor', 'Shifokor'],
              ['useDetective', 'Komissar'],
              ['revealRoleOnDeath', 'O‘lganda rolni ochish'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="setting-row">
              <span>{label}</span>
              <input
                type="checkbox"
                className="switch"
                checked={state.settings[k]}
                disabled={!isHost}
                onChange={(e) => set(k, e.target.checked)}
              />
            </label>
          ))}
          {!isHost && <p className="hint">Sozlamalarni faqat xona egasi o‘zgartiradi.</p>}
        </section>

        <section className="card chat-card">
          <Chat />
        </section>
      </div>
    </div>
  );
}
