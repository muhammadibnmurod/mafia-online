import { PHASE_INFO, ROLE_INFO } from '../../../shared/roles';
import { LIMITS, type Role } from '../../../shared/types';
import { CardFan, Skyline } from './Scenery';

const TEAMS: { key: 'mafia' | 'town'; title: string; note: string; roles: Role[] }[] = [
  {
    key: 'mafia',
    title: 'Mafiya jamoasi',
    note: 'Bir-birini taniydi va tunda o‘z chatida kelishib oladi.',
    roles: ['don', 'mafia'],
  },
  {
    key: 'town',
    title: 'Tinch aholi',
    note: 'Kim kimligini bilmaydi. Yagona quroli — muhokama va ovoz.',
    roles: ['doctor', 'detective', 'civilian'],
  },
];

const MAFIA_TABLE = [
  ['4–5', '1'],
  ['6–8', '2'],
  ['9–11', '3'],
  ['12–16', '4'],
];

const START = [
  { title: 'Xona oching', text: 'Ismingizni yozing va “Yangi xona yaratish”ni bosing. Siz xona egasi bo‘lasiz.' },
  { title: 'Do‘stlarni chaqiring', text: 'Xona kodini yoki havolani yuboring. Odam yetmasa, bot qo‘shishingiz mumkin.' },
  { title: 'O‘yinni boshlang', text: 'Hamma yig‘ilgach, xona egasi o‘yinni boshlaydi va rollar yashirincha tarqatiladi.' },
];

const DAY = [
  {
    phase: PHASE_INFO.night,
    text: 'Mafiya qurbon tanlaydi, Don oxirgi so‘zni aytadi. Shifokor bir kishini davolaydi, Komissar bir kishini tekshiradi.',
  },
  { phase: PHASE_INFO.morning, text: 'Shahar uyg‘onadi va tunda kim o‘lgani e’lon qilinadi.' },
  { phase: PHASE_INFO.day, text: 'Hamma chatda muhokama qiladi: kim yolg‘on gapiryapti, kim juda jim?' },
  {
    phase: PHASE_INFO.voting,
    text: 'Ochiq ovoz beriladi. Eng ko‘p ovoz olgan o‘yinchi haydaladi, ovozlar teng bo‘lsa — hech kim. Keyin yana tun tushadi.',
  },
];

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="h l">
      <nav className="l-nav">
        <span className="l-brand">Mafia</span>
        <div className="l-links">
          <a href="#haqida">O‘yin haqida</a>
          <a href="#rollar">Rollar</a>
          <a href="#qoidalar">Qoidalar</a>
        </div>
        <button className="h-btn h-btn-main l-nav-btn" onClick={onEnter}>
          O‘yinga kirish
        </button>
      </nav>

      <header className="l-hero">
        <Skyline />
        <div className="l-hero-in">
          <div>
            <h1 className="h-mark">Mafia</h1>
            <p className="h-lede">Shahar uxlaydi. Mafiya uyg‘onadi.</p>
            <p className="l-hero-sub">
              Do‘stlar bilan brauzerda o‘ynaladigan yashirin rollar o‘yini. Boshlovchi kerak emas: tun, tong va ovoz
              berishni o‘yin o‘zi olib boradi.
            </p>
            <div className="l-cta">
              <button className="h-btn h-btn-main l-btn-big" onClick={onEnter}>
                O‘yinga kirish
              </button>
              <a className="h-btn h-btn-line l-btn-big" href="#qoidalar">
                Qanday o‘ynaladi
              </a>
            </div>
          </div>
          <div className="h-hand">
            <CardFan />
          </div>
        </div>
      </header>

      <section className="l-sec l-about" id="haqida">
        <div>
          <h2>O‘yin haqida</h2>
          <p>
            Mafia — bahs va aldov o‘yini. Har bir o‘yinchi yashirin karta oladi: kimdir mafiya, kimdir tinch aholi.
            Tunda mafiya o‘z qurbonini tanlaydi, kunduzi esa shahar ularni muhokama va ovoz orqali topishga urinadi.
          </p>
          <p>Kim rost gapiryapti, kim o‘zini tinch aholi qilib ko‘rsatyapti — hammasi sizning sezgingizga bog‘liq.</p>
        </div>
        <dl className="l-facts">
          <div>
            <dt>O‘yinchilar</dt>
            <dd>
              {LIMITS.minPlayers} dan {LIMITS.maxPlayers} kishigacha. Odam yetmasa, xona egasi bot qo‘shadi.
            </dd>
          </div>
          <div>
            <dt>Kirish</dt>
            <dd>Faqat ism yozasiz. Ro‘yxatdan o‘tish va parol yo‘q.</dd>
          </div>
          <div>
            <dt>Chatlar</dt>
            <dd>Umumiy chat, mafiyaning yashirin chati va o‘liklar chati.</dd>
          </div>
          <div>
            <dt>Sozlamalar</dt>
            <dd>Xona egasi muhokama, ovoz berish va tun vaqtini hamda qaysi rollar bo‘lishini tanlaydi.</dd>
          </div>
        </dl>
      </section>

      <section className="l-sec" id="rollar">
        <h2>Rollar</h2>
        <div className="l-teams">
          {TEAMS.map((t) => (
            <div key={t.key} className={`l-team team-${t.key}`}>
              <h3>{t.title}</h3>
              <p className="l-team-note">{t.note}</p>
              <ul>
                {t.roles.map((r) => (
                  <li key={r}>
                    <span className={`l-mini team-${t.key}`} aria-hidden>
                      <b>{ROLE_INFO[r].name[0]}</b>
                      {ROLE_INFO[r].icon}
                    </span>
                    <div>
                      <strong>{ROLE_INFO[r].name}</strong>
                      <p>{ROLE_INFO[r].description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="l-count">
          <p>Mafiya soni o‘yinchilar soniga qarab belgilanadi. Don 6 va undan ko‘p o‘yinchida paydo bo‘ladi.</p>
          <table>
            <thead>
              <tr>
                <th scope="col">O‘yinchilar</th>
                <th scope="col">Mafiya</th>
              </tr>
            </thead>
            <tbody>
              {MAFIA_TABLE.map(([n, m]) => (
                <tr key={n}>
                  <td>{n}</td>
                  <td>{m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="l-sec" id="qoidalar">
        <h2>Qanday o‘ynaladi</h2>
        <h3 className="l-sub">Boshlash</h3>
        <ol className="l-steps l-steps-3">
          {START.map((s) => (
            <li key={s.title}>
              <strong>{s.title}</strong>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        <h3 className="l-sub">Bir kun qanday o‘tadi</h3>
        <ol className="l-steps">
          {DAY.map((s) => (
            <li key={s.phase.name}>
              <span className="l-step-icon" aria-hidden>
                {s.phase.icon}
              </span>
              <strong>{s.phase.name}</strong>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="l-sec">
        <h2>Kim yutadi</h2>
        <div className="l-win">
          <div className="team-town">
            <h3>Tinch aholi yutadi</h3>
            <p>Shaharda bitta ham tirik mafiya qolmasa.</p>
          </div>
          <div className="team-mafia">
            <h3>Mafiya yutadi</h3>
            <p>Tirik mafiya soni qolgan o‘yinchilarnikiga teng yoki undan ko‘p bo‘lsa.</p>
          </div>
        </div>
        <p className="l-note">
          O‘lganlar gapira olmaydi, lekin hamma rollarni ko‘radi va “O‘liklar” chatida o‘zaro yozishadi.
        </p>
      </section>

      <section className="l-final">
        <h2>Bugun kechasi kim uxlamaydi?</h2>
        <button className="h-btn h-btn-main l-btn-big" onClick={onEnter}>
          O‘yinga kirish
        </button>
      </section>
    </div>
  );
}
