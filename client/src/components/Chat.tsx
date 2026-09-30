import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { isMafia } from '../../../shared/roles';
import { LIMITS, type ChatChannel, type ChatMessage } from '../../../shared/types';
import { useGame, useGameState } from '../game';

const TAB_LABEL: Record<ChatChannel, string> = { general: 'Umumiy', mafia: '🔫 Mafiya', dead: '💀 O‘liklar' };

export function Chat() {
  const { api } = useGame();
  const { state, me } = useGameState();
  const inGame = state.phase !== 'lobby' && state.phase !== 'ended';
  const ended = state.phase === 'ended';

  const tabs = useMemo(() => {
    const t: ChatChannel[] = ['general'];
    if ((inGame && isMafia(me.role)) || ended || (inGame && !me.alive)) t.push('mafia');
    if ((inGame && !me.alive) || ended) t.push('dead');
    return t;
  }, [inGame, ended, me.role, me.alive]);

  const [tab, setTab] = useState<ChatChannel>('general');
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const seen = useRef<Record<ChatChannel, number>>({ general: 0, mafia: 0, dead: 0 });

  // Kerakli kanalga avtomatik o'tish: tunda mafiya — mafiya chatiga, o'lganda — o'liklar chatiga
  useEffect(() => {
    if (state.phase === 'night' && me.alive && isMafia(me.role)) setTab('mafia');
    else if (inGame && !me.alive) setTab('dead');
    else if (state.phase === 'day' || state.phase === 'lobby') setTab('general');
  }, [state.phase, me.alive, me.role, inGame]);

  const active = tabs.includes(tab) ? tab : 'general';

  const byTab = useMemo(() => {
    const m: Record<ChatChannel, ChatMessage[]> = { general: [], mafia: [], dead: [] };
    for (const msg of state.chat) {
      if (msg.channel === 'general' || msg.channel === 'system') m.general.push(msg);
      else m[msg.channel].push(msg);
    }
    return m;
  }, [state.chat]);

  const messages = byTab[active];
  seen.current[active] = messages.length;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, active]);

  const reason = cannotSend(active, state.phase, me.alive, inGame);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || reason) return;
    setText('');
    const ok = await api.chat(active, t);
    if (!ok) setText(t);
  };

  const colorOf = (id: string | null) => state.players.find((p) => p.id === id)?.avatar ?? 0;

  return (
    <div className={`chat chat-${active}`}>
      {tabs.length > 1 && (
        <div className="chat-tabs" role="tablist">
          {tabs.map((t) => {
            const unread = t !== active ? byTab[t].length - seen.current[t] : 0;
            return (
              <button key={t} role="tab" aria-selected={t === active} className={t === active ? 'active' : ''} onClick={() => setTab(t)}>
                {TAB_LABEL[t]}
                {unread > 0 && <span className="badge">{unread}</span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <div className="chat-empty">Hali xabar yo‘q</div>}
        {messages.map((m) =>
          m.authorId === null ? (
            <div key={m.id} className="msg msg-system">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className={`msg${m.authorId === me.id ? ' msg-mine' : ''}`}>
              <span className="msg-author" style={{ color: `var(--av-${colorOf(m.authorId) % 16})` }}>
                {m.authorName}
              </span>
              <span className="msg-text">{m.text}</span>
            </div>
          ),
        )}
      </div>
      <form className="chat-input" onSubmit={onSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={LIMITS.chatMax}
          placeholder={reason ?? 'Xabar yozing…'}
          disabled={!!reason}
          aria-label="Xabar"
        />
        <button className="btn btn-primary" type="submit" disabled={!!reason || !text.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}

function cannotSend(ch: ChatChannel, phase: string, alive: boolean, inGame: boolean): string | null {
  if (ch === 'general') {
    if (!inGame) return null;
    if (!alive) return 'O‘liklar umumiy chatda gapira olmaydi';
    if (phase === 'night') return 'Tunda shahar uxlaydi…';
    if (phase === 'reveal') return 'O‘yin boshlanmoqda…';
    return null;
  }
  if (!inGame) return 'Faqat o‘qish mumkin';
  if (ch === 'mafia') return alive ? null : 'Faqat o‘qish mumkin';
  if (ch === 'dead') return alive ? 'Faqat o‘qish mumkin' : null;
  return null;
}
