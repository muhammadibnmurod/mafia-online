import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import type { AckResult, ChatChannel, ClientState, JoinResult, PublicPlayer, Settings } from '../../shared/types';

// Prod'da (Vercel) server boshqa domenda turadi: VITE_SERVER_URL=https://....onrender.com
// Dev rejimida bo'sh qoladi — Vite proxy orqali shu domenga ulanadi.
const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined)?.trim().replace(/\/+$/, '');
const socketOptions = { transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 };
const socket = SERVER_URL ? io(SERVER_URL, socketOptions) : io(socketOptions);

// Sessiya tab'ga bog'langan: bitta kompyuterda bir nechta oynada test qilish mumkin,
// sahifani yangilasangiz esa o'yinga qaytasiz.
const SESSION_KEY = 'mafia:session';
type Session = { code: string; token: string };

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function saveSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage yo'q — muammo emas */
  }
}

function call<T = object>(event: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(8000).emit(event, ...args, (err: unknown, res: AckResult<T>) => {
      if (err) return reject(new Error('Server javob bermadi'));
      if (!res?.ok) return reject(new Error(res && 'error' in res ? res.error : 'Xatolik'));
      resolve(res as T);
    });
  });
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

interface GameCtx {
  state: ClientState | null;
  me: PublicPlayer | null;
  connected: boolean;
  resuming: boolean;
  clockOffset: number;
  toasts: Toast[];
  toast: (text: string, kind?: Toast['kind']) => void;
  api: {
    create: (name: string) => Promise<void>;
    join: (code: string, name: string) => Promise<void>;
    leave: () => void;
    settings: (patch: Partial<Settings>) => void;
    addBot: () => void;
    kick: (playerId: string) => void;
    start: () => void;
    night: (targetId: string) => void;
    donCheck: (targetId: string) => void;
    vote: (targetId: string | null) => void;
    ready: () => void;
    skip: () => void;
    toLobby: () => void;
    chat: (channel: ChatChannel, text: string) => Promise<boolean>;
  };
}

const Ctx = createContext<GameCtx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClientState | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [resuming, setResuming] = useState(() => !!loadSession());
  const [clockOffset, setClockOffset] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  useEffect(() => {
    const onConnect = async () => {
      setConnected(true);
      const s = loadSession();
      if (!s) return setResuming(false);
      try {
        await call<JoinResult>('room:resume', s);
      } catch {
        saveSession(null);
        setState(null);
      } finally {
        setResuming(false);
      }
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s: ClientState) => {
      setClockOffset(s.serverNow - Date.now());
      setState(s);
    };
    const onToast = (t: { text: string; kind?: Toast['kind'] }) => toast(t.text, t.kind);
    const onKicked = (p: { reason?: string }) => {
      saveSession(null);
      setState(null);
      toast(p?.reason ?? 'Siz xonadan chiqarildingiz', 'error');
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state', onState);
    socket.on('toast', onToast);
    socket.on('kicked', onKicked);
    if (socket.connected) void onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state', onState);
      socket.off('toast', onToast);
      socket.off('kicked', onKicked);
    };
  }, [toast]);

  const api = useMemo<GameCtx['api']>(() => {
    const fire = (event: string, ...args: unknown[]) => {
      call(event, ...args).catch((e: Error) => toast(e.message, 'error'));
    };
    return {
      create: async (name) => {
        const r = await call<JoinResult>('room:create', { name });
        saveSession({ code: r.code, token: r.token });
      },
      join: async (code, name) => {
        const r = await call<JoinResult>('room:join', { code, name });
        saveSession({ code: r.code, token: r.token });
      },
      leave: () => {
        socket.emit('room:leave');
        saveSession(null);
        setState(null);
        if (location.search) history.replaceState(null, '', location.pathname);
      },
      settings: (patch) => fire('room:settings', patch),
      addBot: () => fire('room:addBot'),
      kick: (playerId) => fire('room:kick', { playerId }),
      start: () => fire('game:start'),
      night: (targetId) => fire('game:night', { targetId }),
      donCheck: (targetId) => fire('game:donCheck', { targetId }),
      vote: (targetId) => fire('game:vote', { targetId }),
      ready: () => fire('game:ready'),
      skip: () => fire('game:skip'),
      toLobby: () => fire('game:toLobby'),
      chat: async (channel, text) => {
        try {
          await call('chat:send', { channel, text });
          return true;
        } catch (e) {
          toast((e as Error).message, 'error');
          return false;
        }
      },
    };
  }, [toast]);

  const me = state?.players.find((p) => p.id === state.youId) ?? null;

  return (
    <Ctx.Provider value={{ state, me, connected, resuming, clockOffset, toasts, toast, api }}>{children}</Ctx.Provider>
  );
}

export function useGame(): GameCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('GameProvider topilmadi');
  return c;
}

/** Faza tugashiga qolgan soniyalar (server soatiga moslangan). */
export function useCountdown(endsAt: number | null): number | null {
  const { clockOffset } = useGame();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt == null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  if (endsAt == null) return null;
  return Math.max(0, Math.ceil((endsAt - (now + clockOffset)) / 1000));
}

export function useGameState(): { state: ClientState; me: PublicPlayer } {
  const { state, me } = useGame();
  if (!state || !me) throw new Error('O‘yin holati yo‘q');
  return { state, me };
}
