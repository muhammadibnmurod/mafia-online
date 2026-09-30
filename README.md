# 🎩 Mafia Online

Do‘stlar bilan real vaqtda o‘ynaladigan onlayn Mafia o‘yini. Server — **Node.js + Express + Socket.io**, interfeys — **React + TypeScript + Vite**. Butun o‘yin mantiqi serverda: har bir o‘yinchiga faqat u ko‘rishi mumkin bo‘lgan ma’lumot yuboriladi (rollar yashirin, brauzer orqali aldab bo‘lmaydi).

## Ishga tushirish

Talab: Node.js 20 yoki undan yangi.

```bash
npm install
npm run dev
```

Brauzerda **http://localhost:5173** ni oching.

- `npm run dev` bir vaqtda serverni (3000-port) va interfeysni (5173-port) ishga tushiradi.
- Bitta kompyuterda sinash uchun bir nechta brauzer oynasi/tab oching — har bir tab alohida o‘yinchi hisoblanadi.
- Yolg‘iz sinash uchun lobbida **“+ Bot qo‘shish”** tugmasini bosing.

### Bir Wi‑Fi’dagi do‘stlar bilan o‘ynash

`npm run dev` ishga tushganda Vite terminalda `Network: http://192.168.x.x:5173` manzilini ko‘rsatadi. Shu manzilni telefon yoki boshqa kompyuterda oching (hammasi bitta Wi‑Fi’da bo‘lishi kerak).

### Production (bitta port)

```bash
npm run build     # tip tekshiruvi + interfeysni dist/client ga yig‘adi
npm start         # http://localhost:3000 — server interfeysni ham o‘zi beradi
```

## Internetga chiqarish: Vercel + Render

Vercel doimiy WebSocket ulanishlarini ushlab turmaydi, shuning uchun loyiha ikki qismga bo‘lib joylanadi:

```
Do'stlar brauzeri ──► Vercel (sayt: React)  ──WebSocket──►  Render (o'yin serveri: Socket.io)
```

### 1. GitHub'ga yuklash

```bash
cd ~/Desktop/Programming/Mafia
git remote add origin https://github.com/<login>/mafia-online.git
git push -u origin main
```

### 2. Render — o‘yin serveri

1. [render.com](https://render.com) → GitHub bilan kiring → **New → Blueprint** → `mafia-online` repozitoriyni tanlang.
2. `render.yaml` avtomatik o‘qiladi. `CLIENT_ORIGIN` so‘ralsa, hozircha bo‘sh qoldiring → **Apply**.
3. Tayyor bo‘lgach manzilni nusxalang, masalan `https://mafia-online-server.onrender.com`. Uni ochsangiz “Mafia server ishlayapti ✅” chiqishi kerak.

### 3. Vercel — sayt

1. [vercel.com](https://vercel.com) → **Add New → Project** → `mafia-online` repozitoriyni import qiling.
2. **Environment Variables** bo‘limiga qo‘shing:
   `VITE_SERVER_URL` = Render manzili (2-qadamdagi).
   `VITE_PUBLIC_URL` = saytning doimiy manzili (masalan `https://mafia-online.vercel.app`) — taklif havolalari shu bilan yasaladi.
3. **Deploy**. Sozlamalar `vercel.json` da tayyor.
4. Chiqqan havolani (masalan `https://mafia-online.vercel.app`) do‘stlaringizga yuboring.

> ⚠️ Vercel har bir deploy uchun alohida manzil ham beradi (`mafia-online-abc123-….vercel.app`). U manzillar **Deployment Protection** bilan yopiq — do‘stlaringizdan Vercel login so‘raladi. Doim **Settings → Domains** dagi asosiy (production) manzilni ishlating yoki **Settings → Deployment Protection → Vercel Authentication** ni o‘chiring.

### 4. (Ixtiyoriy) Xavfsizlik

Render → xizmat → **Environment** → `CLIENT_ORIGIN` = Vercel manzilingiz. Shunda serverga faqat sizning saytingiz ulana oladi.

### Eslatmalar

- Bepul Render 15 daqiqa ishlatilmasa uxlaydi. Birinchi kirishda sayt “Serverga ulanmoqda…” deb 30–60 soniya kutadi — bu normal. O‘yin davomida uxlamaydi.
- Server qayta ishga tushsa (yangi deploy), ochiq xonalar yo‘qoladi — o‘yin paytida deploy qilmang.
- `git push` qilganingizda Render ham, Vercel ham avtomatik yangilanadi.

### Muqobil: hammasi bitta serverda

Render/Railway/VPS’da `npm install && npm run build` va `npm start` — server saytni ham o‘zi beradi (`VITE_SERVER_URL` kerak emas).

## O‘yin qoidalari

**Rollar (klassik):**

| Rol | Jamoa | Qobiliyat |
|---|---|---|
| 🎩 Don | Mafiya | Tunda qurbonni yakuniy hal qiladi; har kecha bir kishini “Komissarmi?” deb tekshiradi |
| 🔫 Mafiya | Mafiya | Tunda sheriklari bilan qurbon tanlaydi, maxfiy mafiya chati bor |
| 💉 Shifokor | Tinch aholi | Har kecha bir kishini davolaydi (ketma-ket bir odamni emas, o‘zini — bir marta) |
| 🔍 Komissar | Tinch aholi | Har kecha bir kishini tekshirib, mafiyami yo‘qmi darhol biladi |
| 👤 Tinch aholi | Tinch aholi | Muhokama va ovoz orqali mafiyani topadi |

**Mafiya soni:** 4–5 o‘yinchi → 1, 6–8 → 2, 9–11 → 3, 12–16 → 4. Don 2+ mafiya bo‘lganda qo‘shiladi.

**Fazalar:** Rol kartasi → 🌙 Tun → 🌅 Tong (kim o‘lgani) → ☀️ Muhokama → 🗳️ Ochiq ovoz berish → ⚖️ Hukm → yana Tun…

- Hamma o‘z harakatini qilsa, faza taymerni kutmasdan tugaydi.
- Ovozlar teng bo‘lsa, hech kim haydalmaydi.
- **G‘alaba:** barcha mafiya haydalsa — tinch aholi; mafiya soni qolganlarga tenglashsa — mafiya.
- O‘lganlar umumiy chatda yoza olmaydi, lekin barcha rollarni ko‘radi va “O‘liklar” chatida gaplashadi.
- O‘yin davomida chiqib ketgan o‘yinchi o‘lgan hisoblanadi. Sahifani yangilasangiz yoki internet uzilsa — o‘yinga qaytasiz.

**Xona egasi (👑):** vaqtlarni va rollarni sozlaydi, bot qo‘shadi/o‘yinchini chiqaradi, muhokamani erta yakunlaydi, tong/hukm oynasini o‘tkazib yuboradi, o‘yin tugagach “Yangi o‘yin” boshlaydi. Egasi chiqib ketsa, egalik keyingi o‘yinchiga o‘tadi.

## Loyiha tuzilmasi

```
Mafia/
├── server/
│   ├── index.ts       # Express + Socket.io, xonalar, hodisalar
│   ├── Room.ts        # O'yin mantiqi: fazalar, rollar, tun/ovoz, g'alaba, botlar
│   ├── bots.ts        # Bot ismlari va gaplari
│   └── util.ts        # Yordamchi funksiyalar
├── shared/
│   ├── types.ts       # Server va client uchun umumiy turlar
│   └── roles.ts       # Rollar ma'lumoti, taqsimot qoidasi
├── client/
│   ├── index.html
│   └── src/
│       ├── game.tsx           # Socket ulanishi, holat, API (React context)
│       ├── logic.ts           # Kimni tanlash mumkinligi
│       ├── styles.css
│       └── components/        # Home, Lobby, Game, PlayerGrid, ActionPanel, Chat, Overlay…
├── scripts/simulate.ts        # Avtomatik test: 5 socket + 2 bot bilan to'liq o'yinlar
├── vercel.json                # Vercel (sayt) sozlamalari
├── render.yaml                # Render (server) sozlamalari
├── vite.config.ts
└── package.json
```

## Test

Server ishlab turganda (`npm start` yoki `npm run dev:server`):

```bash
npm run test:sim            # 2 ta to'liq o'yinni avtomatik o'ynaydi
GAMES=5 npm run test:sim    # 5 ta o'yin
```

Skript rollar maxfiyligini (tinch o‘yinchiga boshqalarning roli ko‘rinmasligi, mafiya chati sizmasligi), tunda gapirish taqiqini, o‘liklar yozolmasligini va xona egasi huquqlarini tekshiradi.

## Keyingi g‘oyalar

- Kengaytirilgan rollar: Manyak, Kezuvchi, Advokat, Qo‘riqchi
- Ovozli chat (WebRTC)
- Reyting va statistika uchun ma’lumotlar bazasi (PostgreSQL / Redis)
- Ko‘p serverli masshtab uchun Socket.io Redis adapteri
