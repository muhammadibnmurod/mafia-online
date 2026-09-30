import { Game } from './components/Game';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { Toasts } from './components/Toasts';
import { useGame } from './game';

export function App() {
  const { state, connected, resuming } = useGame();

  let screen;
  if (resuming) screen = <div className="splash">Yuklanmoqda…</div>;
  else if (!state) screen = <Home />;
  else if (state.phase === 'lobby') screen = <Lobby />;
  else screen = <Game />;

  return (
    <>
      {!connected && !resuming && <div className="offline-banner">Serverga ulanish uzildi. Qayta ulanmoqda…</div>}
      {screen}
      <Toasts />
    </>
  );
}
