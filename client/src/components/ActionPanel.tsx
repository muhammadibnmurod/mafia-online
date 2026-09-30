import type { ReactNode } from 'react';
import { isMafia } from '../../../shared/roles';
import { useGame, useGameState } from '../game';
import type { Mode } from '../logic';

interface Props {
  mode: Mode;
  donMode: 'kill' | 'donCheck';
  setDonMode: (m: 'kill' | 'donCheck') => void;
}

export function ActionPanel({ mode, donMode, setDonMode }: Props) {
  const { api } = useGame();
  const { state, me } = useGameState();
  const nameOf = (id: string | null | undefined) => state.players.find((p) => p.id === id)?.name ?? '—';
  const alive = state.players.filter((p) => p.alive);

  let title: ReactNode = null;
  let body: ReactNode = null;
  let actions: ReactNode = null;

  if (!me.alive && state.phase !== 'ended') {
    title = '💀 Siz o‘ldingiz';
    body = 'Endi kuzatuvchisiz: barcha rollarni ko‘rasiz va “O‘liklar” chatida yozishingiz mumkin. Tiriklarga yordam bera olmaysiz!';
  } else {
    switch (state.phase) {
      case 'reveal':
        title = '🃏 Rollar tarqatildi';
        body = 'Rolingizni eslab qoling va hech kimga ko‘rsatmang. Tez orada birinchi kecha boshlanadi.';
        break;

      case 'night': {
        if (isMafia(me.role)) {
          const mates = alive.filter((p) => isMafia(p.role) && p.id !== me.id);
          title = me.role === 'don' ? '🎩 Don, sizning navbatingiz' : '🔫 Mafiya uyg‘ondi';
          body = (
            <>
              {mode === 'donCheck'
                ? 'Komissar deb gumon qilgan o‘yinchini tanlang — bu kecha bitta tekshiruv.'
                : 'Qurbonni tanlang.' + (me.role === 'don' ? ' Sizning tanlovingiz yakuniy.' : ' Don bo‘lsa, oxirgi so‘z uniki.')}
              {mates.length > 0 && <div className="muted small">Sheriklaringiz: {mates.map((m) => m.name).join(', ')}</div>}
              <div className="pick-line">
                Qurbon: <b>{state.myNight.target ? nameOf(state.myNight.target) : 'tanlanmagan'}</b>
                {me.role === 'don' && (
                  <>
                    {' · '}Tekshiruv: <b>{state.myNight.donCheck ? nameOf(state.myNight.donCheck) : 'yo‘q'}</b>
                  </>
                )}
              </div>
            </>
          );
          if (me.role === 'don') {
            actions = (
              <div className="seg">
                <button className={donMode === 'kill' ? 'active' : ''} onClick={() => setDonMode('kill')}>
                  🔫 Qurbon
                </button>
                <button className={donMode === 'donCheck' ? 'active' : ''} onClick={() => setDonMode('donCheck')}>
                  🔎 Komissarni izlash
                </button>
              </div>
            );
          }
        } else if (me.role === 'doctor') {
          title = '💉 Shifokor, kimni davolaysiz?';
          body = (
            <>
              Tanlagan odamingizni mafiya o‘ldira olmaydi.
              <div className="muted small">
                {state.doctor?.lastHeal && <>Kecha davolangan: {nameOf(state.doctor.lastHeal)} (bu kecha mumkin emas). </>}
                {state.doctor?.selfUsed ? 'O‘zingizni davolash imkoniyati ishlatilgan.' : 'O‘zingizni bir marta davolay olasiz.'}
              </div>
              <div className="pick-line">
                Tanlov: <b>{state.myNight.target ? nameOf(state.myNight.target) : 'tanlanmagan'}</b>
              </div>
            </>
          );
        } else if (me.role === 'detective') {
          const res = state.detectiveResults.find((r) => r.round === state.round);
          title = '🔍 Komissar, kimni tekshirasiz?';
          body = res ? (
            <div className={`result ${res.positive ? 'bad' : 'good'}`}>
              {nameOf(res.targetId)} — {res.positive ? 'MAFIYA! 🔫' : 'tinch aholi ✅'}
            </div>
          ) : (
            'Bitta o‘yinchini tanlang — uning mafiya ekanligini darhol bilib olasiz.'
          );
        } else {
          title = '😴 Shahar uxlayapti';
          body = 'Siz tinch uxlayapsiz… Tong otishini kuting. Kunduzi ko‘zingizni ochiq tuting!';
        }
        break;
      }

      case 'morning':
        title = '🌅 Tong otdi';
        body = state.announcement?.lines.join(' ');
        break;

      case 'day': {
        const readyCount = alive.filter((p) => p.ready).length;
        title = '☀️ Muhokama';
        body = 'Kimdan shubhalanasiz? Chatda fikr almashing. Hamma tayyor bo‘lsa, ovoz berish boshlanadi.';
        actions = (
          <div className="row">
            <button className={`btn ${me.ready ? 'btn-secondary' : 'btn-primary'}`} onClick={api.ready}>
              {me.ready ? '✓ Tayyorman' : 'Ovoz berishga tayyorman'} ({readyCount}/{alive.length})
            </button>
            {me.isHost && (
              <button className="btn btn-ghost" onClick={api.skip}>
                Muhokamani yakunlash
              </button>
            )}
          </div>
        );
        break;
      }

      case 'voting': {
        const my = state.votes[me.id];
        const votedCount = Object.keys(state.votes).length;
        title = '🗳️ Ovoz bering';
        body = (
          <>
            Shahardan haydalishi kerak bo‘lgan o‘yinchini tanlang. Ovozlar ochiq!
            <div className="pick-line">
              Ovozingiz:{' '}
              <b>{my === undefined ? 'berilmagan' : my === null ? 'betaraf' : nameOf(my)}</b>
              <span className="muted"> · {votedCount}/{alive.length} ovoz berdi</span>
            </div>
          </>
        );
        actions = (
          <button className={`btn ${my === null ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => api.vote(null)}>
            Betaraf qolish
          </button>
        );
        break;
      }

      case 'verdict':
        title = '⚖️ Shahar hukmi';
        body = state.announcement?.lines.join(' ');
        break;

      case 'ended':
        title = state.announcement?.title;
        body = state.announcement?.lines.join(' ');
        actions = me.isHost ? (
          <button className="btn btn-primary" onClick={api.toLobby}>
            Yangi o‘yin
          </button>
        ) : (
          <span className="muted">Xona egasi yangi o‘yin boshlashini kuting…</span>
        );
        break;

      default:
        break;
    }
  }

  const hostSkip =
    me.isHost && ['reveal', 'morning', 'verdict'].includes(state.phase) ? (
      <button className="btn btn-ghost btn-small" onClick={api.skip}>
        Davom etish →
      </button>
    ) : null;

  return (
    <div className="action-panel card">
      <div className="action-text">
        <h2>{title}</h2>
        {body && <div className="action-body">{body}</div>}
      </div>
      {(actions || hostSkip) && (
        <div className="action-buttons">
          {actions}
          {hostSkip}
        </div>
      )}
    </div>
  );
}
