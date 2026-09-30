import { ROLE_INFO } from '../../../shared/roles';
import type { PublicPlayer } from '../../../shared/types';
import { useGameState } from '../game';
import { canTarget, selectedTarget, type Mode } from '../logic';
import { Avatar } from './Avatar';

const ACTION_VERB: Record<NonNullable<Mode>, string> = {
  kill: 'Nishonga olish',
  heal: 'Davolash',
  check: 'Tekshirish',
  donCheck: 'Komissarmi?',
  vote: 'Ovoz berish',
};

export function PlayerGrid({ mode, onPick }: { mode: Mode; onPick: (p: PublicPlayer) => void }) {
  const { state, me } = useGameState();
  const selected = selectedTarget(state, me, mode);
  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? '?';

  const showVotes = state.phase === 'voting' || state.phase === 'verdict';
  const votesFor = (id: string) =>
    Object.entries(state.votes)
      .filter(([, t]) => t === id)
      .map(([v]) => v);
  const mafiaFor = (id: string) =>
    Object.entries(state.mafiaVotes)
      .filter(([, t]) => t === id)
      .map(([v]) => v);
  const detective = new Map(state.detectiveResults.map((r) => [r.targetId, r.positive]));
  const don = new Map(state.donResults.map((r) => [r.targetId, r.positive]));

  return (
    <div className="player-grid">
      {state.players.map((p) => {
        const targetable = canTarget(state, me, mode, p);
        const isSelected = selected === p.id;
        const role = p.role ? ROLE_INFO[p.role] : null;
        const voters = showVotes ? votesFor(p.id) : [];
        const shooters = state.phase === 'night' ? mafiaFor(p.id) : [];
        const voted = showVotes && p.id in state.votes;

        const classes = [
          'pcard',
          !p.alive && 'is-dead',
          targetable && 'is-targetable',
          isSelected && 'is-selected',
          p.id === me.id && 'is-me',
          role && `team-${role.team}`,
          !p.connected && !p.isBot && 'is-offline',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={p.id}
            className={classes}
            onClick={() => onPick(p)}
            disabled={!targetable}
            aria-pressed={isSelected}
            aria-label={targetable && mode ? `${p.name} — ${ACTION_VERB[mode]}` : p.name}
          >
            <div className="pcard-top">
              {p.isHost && <span title="Xona egasi">👑</span>}
              {p.isBot && <span className="tag">bot</span>}
              {!p.connected && !p.isBot && <span className="tag tag-dim">oflayn</span>}
              {state.phase === 'day' && p.alive && p.ready && <span className="tag tag-green">tayyor</span>}
              {voted && <span className="tag tag-green">✓</span>}
            </div>
            <Avatar name={p.name} index={p.avatar} size={52} dead={!p.alive} />
            <div className="pcard-name">
              {p.name}
              {p.id === me.id && <span className="muted"> (siz)</span>}
            </div>
            <div className="pcard-role">{role ? `${role.icon} ${role.name}` : p.alive ? '❔' : '—'}</div>

            {detective.has(p.id) && (
              <span className={`verdict-tag ${detective.get(p.id) ? 'bad' : 'good'}`}>
                {detective.get(p.id) ? '🔍 MAFIYA' : '🔍 Tinch'}
              </span>
            )}
            {don.has(p.id) && (
              <span className={`verdict-tag ${don.get(p.id) ? 'bad' : 'neutral'}`}>
                {don.get(p.id) ? '🎩 KOMISSAR' : '🎩 Komissar emas'}
              </span>
            )}
            {shooters.length > 0 && (
              <span className="pcard-marks mafia-marks" title={shooters.map(nameOf).join(', ')}>
                🔫 {shooters.map(nameOf).join(', ')}
              </span>
            )}
            {voters.length > 0 && (
              <span className="pcard-marks vote-marks" title={voters.map(nameOf).join(', ')}>
                <b>{voters.length}</b> ovoz · {voters.map(nameOf).join(', ')}
              </span>
            )}
            {isSelected && mode && <span className="pcard-selected">✔ {ACTION_VERB[mode]}</span>}
          </button>
        );
      })}
    </div>
  );
}
