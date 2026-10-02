import { PHASE_INFO, ROLE_INFO } from '../../../shared/roles';
import { LIMITS, type Role } from '../../../shared/types';

const TEAMS: { key: 'mafia' | 'town'; title: string; note: string; roles: Role[] }[] = [
  {
    key: 'mafia',
    title: 'Mafiya jamoasi',
    note: 'Bir-birini taniydi. Tunda yashirincha kelishadi.',
    roles: ['don', 'mafia'],
  },
  {
    key: 'town',
    title: 'Tinch aholi',
    note: 'Kim kimligini bilmaydi. Faqat suhbat va ovozga tayanadi.',
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
  { title: 'Xona oching', text: 'Ismingizni yozing. Xona kodi darhol tayyor bo‘ladi.' },
  { title: 'Do‘stlarni chaqiring', text: 'Kod yoki havolani yuboring. Odam yetmasa, bot qo‘shing.' },
  { title: 'Rollarni oling', text: 'Hamma yig‘ilgach, rollar yashirincha tarqatiladi.' },
];

const DAY = [
  {
    phase: PHASE_INFO.night,
    text: 'Mafiya qurbon tanlaydi. Shifokor davolaydi, Komissar esa tekshiradi.',
  },
  { phase: PHASE_INFO.morning, text: 'Shahar uyg‘onadi va tun natijasi e’lon qilinadi.' },
  { phase: PHASE_INFO.day, text: 'Davra gapiradi: kim yolg‘onchi, kim juda jim?' },
  {
    phase: PHASE_INFO.voting,
    text: 'Ochiq ovoz beriladi. Eng ko‘p ovoz olgan o‘yinchi davradan chiqadi.',
  },
];

const SEATS = ['Siz', '?', '?', '?', '?', '?', '?', '?'];

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="site-page" id="top">
      <header className="site-nav">
        <a className="site-logo" href="#top" aria-label="Mafia bosh sahifasi">
          <span aria-hidden>M</span>
          <strong>Mafia</strong>
        </a>
        <nav className="site-links" aria-label="Asosiy navigatsiya">
          <a href="#haqida">O‘yin haqida</a>
          <a href="#rollar">Rollar</a>
          <a href="#qoidalar">Qoidalar</a>
        </nav>
        <button className="site-nav-action" onClick={onEnter} type="button">
          O‘yinga kirish
        </button>
      </header>

      <main>
        <section className="site-hero" aria-labelledby="hero-title">
          <div className="site-hero-copy">
            <p className="site-hero-note">Do‘stlar bilan onlayn Mafia</p>
            <h1 id="hero-title">Shahar uxlaganda davra gapira boshlaydi.</h1>
            <p className="site-hero-text">
              Yashirin rollar, shubhali sukut va juda ishonchli yolg‘onlar. Boshlovchi kerak emas — tun, tong va
              ovoz berishni o‘yin o‘zi olib boradi.
            </p>
            <div className="site-hero-actions">
              <button className="site-button site-button-primary" onClick={onEnter} type="button">
                Davraga qo‘shilish
              </button>
              <a className="site-button site-button-quiet" href="#qoidalar">
                Avval qoidalarni ko‘rish
              </a>
            </div>
            <p className="site-hero-detail">
              {LIMITS.minPlayers}–{LIMITS.maxPlayers} o‘yinchi <span aria-hidden>/</span> Ro‘yxatdan o‘tishsiz
            </p>
          </div>

          <div className="site-table-scene" aria-hidden>
            <div className="site-table-glow" />
            <div className="site-table">
              <div className="site-table-center">
                <span>Mafia</span>
                <small>Har kim gumondor</small>
              </div>
              <div className="site-seats">
                {SEATS.map((seat, index) => (
                  <i key={index} className={index === 0 ? 'is-you' : index === 5 ? 'is-mafia' : ''}>
                    {seat}
                  </i>
                ))}
              </div>
            </div>
            <p className="site-table-caption">Bir stol. Ikki tomon. Hech kimga to‘liq ishonib bo‘lmaydi.</p>
          </div>
        </section>

        <section className="site-section site-about" id="haqida">
          <div className="site-section-title">
            <h2>Oddiy qoida, qiyin tanlov.</h2>
            <p>
              Har bir o‘yinchi yashirin rol oladi. Mafiya tunda hujum qiladi, shahar esa kunduzi suhbat va ovoz
              orqali ularni topishga urinadi.
            </p>
          </div>
          <dl className="site-facts">
            <div>
              <dt>O‘yinchilar</dt>
              <dd>{LIMITS.minPlayers} dan {LIMITS.maxPlayers} kishigacha. Odam yetmasa, bot qo‘shish mumkin.</dd>
            </div>
            <div>
              <dt>Kirish</dt>
              <dd>Faqat ism va xona kodi. Hisob ochish ham, parol ham yo‘q.</dd>
            </div>
            <div>
              <dt>Suhbat</dt>
              <dd>Umumiy chat, mafiyaning yashirin chati va o‘liklar chati.</dd>
            </div>
            <div>
              <dt>Boshqaruv</dt>
              <dd>Xona egasi vaqtlar, rollar va botlar sonini o‘zi tanlaydi.</dd>
            </div>
          </dl>
        </section>

        <section className="site-section site-roles" id="rollar">
          <header className="site-section-heading">
            <h2>Besh rol, ikki maqsad.</h2>
            <p>Rolingiz sir qoladi. Gapirgan har bir so‘zingiz esa dalilga aylanishi mumkin.</p>
          </header>

          <div className="site-team-ledger">
            {TEAMS.map((team) => (
              <article key={team.key} className={`site-team team-${team.key}`}>
                <header>
                  <h3>{team.title}</h3>
                  <p>{team.note}</p>
                </header>
                <ul>
                  {team.roles.map((role) => (
                    <li key={role}>
                      <span className="site-role-letter" aria-hidden>{ROLE_INFO[role].name[0]}</span>
                      <div>
                        <strong>{ROLE_INFO[role].name}</strong>
                        <p>{ROLE_INFO[role].description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="site-balance">
            <p>
              Mafiya soni davradagi odamlar soniga qarab o‘zgaradi. Don 6 va undan ko‘p o‘yinchi yig‘ilganda
              paydo bo‘ladi.
            </p>
            <table>
              <caption className="sr-only">O‘yinchilar soniga ko‘ra mafiya soni</caption>
              <thead>
                <tr><th scope="col">O‘yinchi</th><th scope="col">Mafiya</th></tr>
              </thead>
              <tbody>
                {MAFIA_TABLE.map(([players, mafia]) => (
                  <tr key={players}><td>{players}</td><td>{mafia}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="site-section site-rules" id="qoidalar">
          <header className="site-section-heading">
            <h2>O‘yinni boshlash oson.</h2>
            <p>Uch qadamdan keyin davrada kim rost gapirayotganini aniqlash qoladi.</p>
          </header>

          <ol className="site-start-steps">
            {START.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="site-cycle">
            <div className="site-cycle-intro">
              <h3>Bir kecha-kunduz</h3>
              <p>O‘yin shu to‘rt holat orasida aylanadi. Kimdir chiqib ketadi, shubha esa qoladi.</p>
            </div>
            <ol>
              {DAY.map((step) => (
                <li key={step.phase.name}>
                  <span>{step.phase.name}</span>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="site-section site-verdict">
          <div className="site-verdict-title">
            <h2>Oxirida faqat bir tomon qoladi.</h2>
            <p>O‘lganlar gapira olmaydi, lekin o‘liklar chatida o‘yinni kuzatishda davom etadi.</p>
          </div>
          <div className="site-verdicts">
            <div className="team-town">
              <span>Tinch aholi</span>
              <strong>Shaharda tirik mafiya qolmasa, yutadi.</strong>
            </div>
            <div className="team-mafia">
              <span>Mafiya</span>
              <strong>Mafiya soni qolganlarga tenglashsa, yutadi.</strong>
            </div>
          </div>
        </section>

        <section className="site-final">
          <div>
            <p>Bugun kechasi</p>
            <h2>Kim uxlamaydi?</h2>
          </div>
          <button className="site-button site-button-primary" onClick={onEnter} type="button">
            Xona ochish yoki qo‘shilish
          </button>
        </section>
      </main>

      <footer className="site-footer">
        <a className="site-logo" href="#top" aria-label="Sahifa boshiga qaytish">
          <span aria-hidden>M</span>
          <strong>Mafia</strong>
        </a>
        <p>Do‘stlar davrasi uchun onlayn yashirin rollar o‘yini.</p>
      </footer>
    </div>
  );
}
