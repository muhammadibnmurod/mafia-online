import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LIMITS } from '../../../shared/types';
import { useGame } from '../game';
import { Landing } from './Landing';

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
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  const run = async (action: 'create' | 'join', fn: () => Promise<void>) => {
    if (!name.trim()) return toast('Avval ismingizni kiriting', 'error');
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {
      /* ahamiyatsiz */
    }
    setBusy(action);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) return toast('Xona kodini kiriting', 'error');
    void run('join', () => api.join(code.trim(), name));
  };

  return (
    <div className="entry-page">
      <header className="entry-nav">
        <button className="entry-back" onClick={onBack} type="button">
          <span aria-hidden>←</span>
          Bosh sahifa
        </button>
        <span className="entry-brand" aria-label="Mafia">
          M
        </span>
        <p className={connected ? 'entry-connection is-on' : 'entry-connection'} role="status">
          <i aria-hidden />
          {connected ? 'Davra ochiq' : 'Serverga ulanmoqda'}
        </p>
      </header>

      <main className="entry-layout">
        <section className="entry-story">
          <p className="entry-overline">Onlayn davra o‘yini</p>
          <h1>Bu shaharda har kim gumondor.</h1>
          <p className="entry-copy">
            Bir xona, yashirin rollar va do‘stlaringizning juda ishonchli yolg‘onlari. Boshlovchi shart emas —
            tunni ham, ovozni ham o‘yin boshqaradi.
          </p>

          <dl className="entry-facts">
            <div>
              <dt>
                {LIMITS.minPlayers}–{LIMITS.maxPlayers}
              </dt>
              <dd>o‘yinchi</dd>
            </div>
            <div>
              <dt>Parolsiz</dt>
              <dd>bir zumda kirish</dd>
            </div>
            <div>
              <dt>Faqat kod</dt>
              <dd>do‘stlar davrasi</dd>
            </div>
          </dl>

          <blockquote className="entry-quote">
            <p>“Jim turgan odam ham nimanidir yashiryapti.”</p>
            <footer>Davra orasidagi gap</footer>
          </blockquote>
        </section>

        <section className="entry-desk" aria-labelledby="entry-title">
          <div className="entry-ticket-mark" aria-hidden>
            <span>M</span>
          </div>
          <div className="entry-panel">
            <div className="entry-panel-head">
              <div>
                <h2 id="entry-title">Kechani boshlang</h2>
                <p>Ismingizni yozing — qolganini davrada hal qilasiz.</p>
              </div>
              <span className="entry-night" aria-hidden>☾</span>
            </div>

            <form
              className="entry-create"
              onSubmit={(e) => {
                e.preventDefault();
                void run('create', () => api.create(name));
              }}
            >
              <label className="entry-field">
                <span>Ismingiz</span>
                <input
                  value={name}
                  maxLength={20}
                  placeholder="Masalan, Sodiq"
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                />
              </label>
              <button className="entry-primary" disabled={busy !== null || !connected} type="submit">
                {busy === 'create' ? 'Xona ochilmoqda…' : 'Yangi xona ochish'}
              </button>
            </form>

            <div className="entry-divider"><span>yoki tayyor xonaga kiring</span></div>

            <form className="entry-join" onSubmit={onJoin}>
              <label className="entry-field">
                <span>Xona kodi</span>
                <input
                  className="entry-code"
                  value={code}
                  maxLength={8}
                  placeholder="KODNI YOZING"
                  autoComplete="off"
                  inputMode="text"
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                />
              </label>
              <button className="entry-secondary" disabled={busy !== null || !connected} type="submit">
                {busy === 'join' ? 'Kirilmoqda…' : 'Xonaga kirish'}
              </button>
            </form>

            <p className="entry-privacy">Ro‘yxatdan o‘tish ham, parol ham kerak emas.</p>
          </div>
          {!connected && (
            <p className="entry-wait-note">
              Birinchi ulanish bir daqiqagacha cho‘zilishi mumkin. Sahifani yopmasangiz bo‘ldi.
            </p>
          )}
        </section>
      </main>

      <footer className="entry-footer">
        <span>Shahar uxlaydi.</span>
        <span aria-hidden>•</span>
        <span>Suhbat boshlanadi.</span>
      </footer>
    </div>
  );
}
