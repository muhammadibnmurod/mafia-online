import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ROLE_INFO } from '../../../shared/roles';
import { LIMITS, type Role } from '../../../shared/types';
import { useGame } from '../game';
import { Landing } from './Landing';
import { CardFan, Skyline } from './Scenery';

const NAME_KEY = 'mafia:name';
const ENTER_HASH = '#kirish';

function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

const inviteCode = () => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';
const wantsEntry = () => location.hash === ENTER_HASH || inviteCode() !== '';

/** Landing ↔ kirish ekrani. Brauzerning "orqaga" tugmasi ham ishlaydi. */
export function Home() {
  const [entering, setEntering] = useState(wantsEntry);
  const pushed = useRef(false);

  useEffect(() => {
    const onPop = () => setEntering(wantsEntry());
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  const enter = () => {
    history.pushState(null, '', location.pathname + location.search + ENTER_HASH);
    pushed.current = true;
    setEntering(true);
    scrollTo(0, 0);
  };

  const back = () => {
    if (pushed.current) {
      pushed.current = false;
      history.back();
      return;
    }
    history.replaceState(null, '', location.pathname);
    setEntering(false);
  };

  return entering ? <Entry onBack={back} /> : <Landing onEnter={enter} />;
}

function Entry({ onBack }: { onBack: () => void }) {
  const { api, toast, connected } = useGame();
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(inviteCode);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Role>('don');

  const run = async (fn: () => Promise<void>) => {
    if (!name.trim()) return toast('Avval ismingizni kiriting', 'error');
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {
      /* ahamiyatsiz */
    }
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) return toast('Xona kodini kiriting', 'error');
    void run(() => api.join(code.trim(), name));
  };

  const info = ROLE_INFO[active];

  return (
    <div className="h h-entry">
      <Skyline />

      <div className="h-top">
        <section className="h-intro">
          <button className="h-back" onClick={onBack}>
            ← Bosh sahifa
          </button>
          <h1 className="h-mark">Mafia</h1>
          <p className="h-lede">Shahar uxlaydi. Mafiya uyg‘onadi.</p>
          <p className="h-sub">
            Xona oching va kodni do‘stlaringizga yuboring. {LIMITS.minPlayers} kishidan {LIMITS.maxPlayers}{' '}
            kishigacha o‘ynash mumkin.
          </p>

          <div className="h-form">
            <label className="h-field">
              <span>Ismingiz</span>
              <input
                value={name}
                maxLength={20}
                placeholder="Masalan, Sodiq"
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>

            <button className="h-btn h-btn-main" disabled={busy || !connected} onClick={() => run(() => api.create(name))}>
              Yangi xona yaratish
            </button>

            <form className="h-join" onSubmit={onJoin}>
              <label className="h-field">
                <span>Xona kodi bormi?</span>
                <input
                  className="h-code"
                  value={code}
                  maxLength={8}
                  placeholder="KOD"
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                />
              </label>
              <button className="h-btn h-btn-line" disabled={busy || !connected} type="submit">
                Qo‘shilish
              </button>
            </form>

            <p className={connected ? 'h-status is-on' : 'h-status'} role="status">
              <i aria-hidden />
              {connected
                ? 'Server tayyor'
                : 'Server uyg‘onmoqda. Birinchi ulanish bir daqiqagacha cho‘zilishi mumkin.'}
            </p>
          </div>
        </section>

        <section className="h-hand" aria-label="Rollar">
          <CardFan active={active} onActive={setActive} />
          <div className="h-caption" aria-live="polite">
            <h2>
              {info.name} <small className={`team-${info.team}`}>{info.team === 'mafia' ? 'mafiya' : 'tinch aholi'}</small>
            </h2>
            <p>{info.description}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
