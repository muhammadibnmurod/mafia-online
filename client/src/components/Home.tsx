import { useState, type FormEvent } from 'react';
import { ROLE_INFO } from '../../../shared/roles';
import type { Role } from '../../../shared/types';
import { useGame } from '../game';

const NAME_KEY = 'mafia:name';
const ROLES: Role[] = ['don', 'mafia', 'doctor', 'detective', 'civilian'];

function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function Home() {
  const { api, toast, connected } = useGame();
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '');
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="home">
      <header className="hero">
        <div className="hero-hat" aria-hidden>
          🎩
        </div>
        <h1 className="logo">MAFIA</h1>
        <p className="tagline">Do‘stlaringiz bilan onlayn o‘ynang. Shahar uxlaydi — mafiya uyg‘onadi.</p>
      </header>

      <main className="home-card card">
        <label className="field">
          <span>Ismingiz</span>
          <input
            value={name}
            maxLength={20}
            placeholder="Masalan, Sodiq"
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        <button className="btn btn-primary btn-lg" disabled={busy || !connected} onClick={() => run(() => api.create(name))}>
          Yangi xona yaratish
        </button>

        <div className="divider">
          <span>yoki xonaga qo‘shiling</span>
        </div>

        <form className="join-row" onSubmit={onJoin}>
          <input
            className="code-input"
            value={code}
            maxLength={8}
            placeholder="KOD"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            aria-label="Xona kodi"
          />
          <button className="btn btn-secondary" disabled={busy || !connected} type="submit">
            Qo‘shilish
          </button>
        </form>
        {!connected && (
          <p className="hint">
            Serverga ulanmoqda… Server uxlab qolgan bo‘lsa, birinchi ulanish 1 daqiqagacha cho‘zilishi mumkin.
          </p>
        )}
      </main>

      <section className="home-roles">
        <h2>Rollar</h2>
        <div className="role-grid">
          {ROLES.map((r) => (
            <div key={r} className={`role-mini team-${ROLE_INFO[r].team}`}>
              <span className="role-mini-icon">{ROLE_INFO[r].icon}</span>
              <strong>{ROLE_INFO[r].name}</strong>
              <small>{ROLE_INFO[r].short}</small>
            </div>
          ))}
        </div>
        <details className="rules">
          <summary>O‘yin qoidalari</summary>
          <ol>
            <li>Har bir o‘yinchi yashirin rol oladi. Mafiya bir-birini taniydi, qolganlar — yo‘q.</li>
            <li>
              <b>Tun:</b> mafiya qurbon tanlaydi (Don oxirgi so‘zni aytadi), Shifokor bir kishini davolaydi, Komissar
              bir kishini tekshiradi.
            </li>
            <li>
              <b>Tong:</b> tunda kim o‘lgani e’lon qilinadi.
            </li>
            <li>
              <b>Kun:</b> hamma muhokama qiladi, so‘ng ochiq ovoz beradi. Eng ko‘p ovoz olgan o‘yinchi shahardan
              haydaladi. Teng bo‘lsa — hech kim.
            </li>
            <li>Barcha mafiya haydalsa — tinch aholi yutadi. Mafiya soni qolganlarga teng bo‘lsa — mafiya yutadi.</li>
            <li>O‘lganlar gapira olmaydi, lekin hamma rollarni ko‘radi va o‘zaro “O‘liklar” chatida yozishadi.</li>
          </ol>
        </details>
      </section>
    </div>
  );
}
