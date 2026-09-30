/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** O'yin serveri manzili, masalan https://mafia-online-server.onrender.com */
  readonly VITE_SERVER_URL?: string;
  /** Saytning doimiy manzili (taklif havolalari uchun), masalan https://mafia-online.vercel.app */
  readonly VITE_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
