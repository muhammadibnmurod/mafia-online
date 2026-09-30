import { isMafia } from '../../shared/roles';
import type { ClientState, PublicPlayer } from '../../shared/types';

export type Mode = 'kill' | 'heal' | 'check' | 'donCheck' | 'vote' | null;

/** Hozir o'yinchi kartalarini bosib qanday harakat qilinadi. */
export function currentMode(state: ClientState, me: PublicPlayer, donMode: 'kill' | 'donCheck'): Mode {
  if (!me.alive) return null;
  if (state.phase === 'voting') return 'vote';
  if (state.phase !== 'night') return null;
  switch (me.role) {
    case 'don':
      return donMode;
    case 'mafia':
      return 'kill';
    case 'doctor':
      return 'heal';
    case 'detective':
      return 'check';
    default:
      return null;
  }
}

export function canTarget(state: ClientState, me: PublicPlayer, mode: Mode, p: PublicPlayer): boolean {
  if (!mode || !p.alive) return false;
  switch (mode) {
    case 'kill':
      return !isMafia(p.role);
    case 'heal':
      return p.id !== state.doctor?.lastHeal && !(p.id === me.id && state.doctor?.selfUsed);
    case 'check':
      return p.id !== me.id && !state.myNight.target;
    case 'donCheck':
      return p.id !== me.id && !state.myNight.donCheck;
    case 'vote':
      return p.id !== me.id;
  }
}

export function selectedTarget(state: ClientState, me: PublicPlayer, mode: Mode): string | null | undefined {
  if (mode === 'vote') return state.votes[me.id];
  if (mode === 'donCheck') return state.myNight.donCheck;
  if (mode) return state.myNight.target;
  return undefined;
}
