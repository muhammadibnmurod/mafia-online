import { useEffect, useState } from 'react';
import { PHASE_INFO, ROLE_INFO } from '../../../shared/roles';
import type { PublicPlayer } from '../../../shared/types';
import { useCountdown, useGame, useGameState } from '../game';
import { canTarget, currentMode } from '../logic';
import { ActionPanel } from './ActionPanel';
import { Chat } from './Chat';
import { Overlay } from './Overlay';
import { PlayerGrid } from './PlayerGrid';

export function Game() {
  const { api } = useGame();
  const { state, me } = useGameState();
  const [donMode, setDonMode] = useState<'kill' | 'donCheck'>('kill');

  // har kecha Don avval qurbon tanlashdan boshlaydi
  useEffect(() => setDonMode('kill'), [state.round]);

  const mode = currentMode(state, me, donMode);

  const onPick = (p: PublicPlayer) => {
    if (!canTarget(state, me, mode, p)) return;
    if (mode === 'vote') api.vote(p.id);
    else if (mode === 'donCheck') api.donCheck(p.id);
    else api.night(p.id);
  };

  return (
    <div className={`game phase-${state.phase}`}>
      <TopBar />
      <div className="game-main">
        <section className="board">
          <ActionPanel mode={mode} donMode={donMode} setDonMode={setDonMode} />
          <PlayerGrid mode={mode} onPick={onPick} />
        </section>
        <aside className="side card">
          <Chat />
        </aside>
      </div>
      <Overlay />
    </div>
  );
}

function TopBar() {
  const { api } = useGame();
  const { state, me } = useGameState();
  const left = useCountdown(state.phaseEndsAt);
  const [hidden, setHidden] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (!confirmLeave) return;
    const t = setTimeout(() => setConfirmLeave(false), 3000);
    return () => clearTimeout(t);
  }, [confirmLeave]);

  const phase = PHASE_INFO[state.phase];
  const roundLabel =
    state.phase === 'night' ? `${state.round}-kecha` : state.round > 0 ? `${state.round}-kun` : '';
  const total =
    state.phase === 'night'
      ? state.settings.nightSec
      : state.phase === 'day'
        ? state.settings.discussionSec
        : state.phase === 'voting'
          ? state.settings.votingSec
          : 8;
  const pct = left == null ? 0 : Math.min(100, (left / total) * 100);
  const role = me.role ? ROLE_INFO[me.role] : null;

  return (
    <header className="topbar">
      <div className="topbar-phase">
        <span className="phase-icon">{phase.icon}</span>
        <div>
          <div className="phase-name">{phase.name}</div>
          {roundLabel && <div className="muted small">{roundLabel}</div>}
        </div>
      </div>

      {left != null && (
        <div className={`timer${left <= 10 ? ' timer-low' : ''}`} aria-label={`${left} soniya qoldi`}>
          <span className="timer-num">{formatTime(left)}</span>
          <span className="timer-bar">
            <span style={{ width: `${pct}%` }} />
          </span>
        </div>
      )}

      <div className="topbar-right">
        {role && (
          <button
            className={`role-chip team-${role.team}${hidden ? ' is-hidden' : ''}`}
            onClick={() => setHidden((h) => !h)}
            title="Rolni yashirish/ko‘rsatish"
          >
            {hidden ? '🙈 Rol yashirin' : `${role.icon} ${role.name}`}
            {!me.alive && <span className="tag tag-dim">o‘lik</span>}
          </button>
        )}
        <button
          className={`btn btn-small ${confirmLeave ? 'btn-danger' : 'btn-ghost'}`}
          onClick={() => (confirmLeave ? api.leave() : setConfirmLeave(true))}
        >
          {confirmLeave ? 'Rostdan chiqasizmi?' : 'Chiqish'}
        </button>
      </div>
    </header>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
