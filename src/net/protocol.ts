import type { Color, MoveIntent } from '../core/types';

/**
 * Mensagens trocadas numa sala online. São pequenas e sem estado secreto:
 * os dois navegadores validam tudo com as regras do xadrez.
 */
export type NetMessage =
  /** "Cheguei" (ou reconectei). Quem recebe responde com `state`. */
  | { t: 'hello'; id: string; name: string; color: Color | null }
  /** Meu estado: quem sou, que cor jogo e a partida inteira que eu tenho. */
  | { t: 'state'; id: string; name: string; color: Color | null; history: MoveIntent[] }
  /** Um lance. `ply` = quantos meio-lances já existiam antes dele (para ordenar e deduplicar). */
  | { t: 'move'; id: string; ply: number; move: MoveIntent }
  /** Alguém começou uma partida nova. */
  | { t: 'reset'; id: string }
  /** Sinal de vida, a cada poucos segundos. */
  | { t: 'ping'; id: string; name: string; color: Color | null }
  /** Saí da sala. */
  | { t: 'bye'; id: string };

/** Sem letras/números que se confundem (0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newRoomCode(length = 5): string {
  let code = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export const newClientId = () => crypto.randomUUID();
