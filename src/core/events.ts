import { Chess } from 'chess.js';
import { matchOpening } from './openings';
import { other, PIECE_VALUE, type Color, type GameEvent, type Move, type PieceSymbol, type Square } from './types';

export interface DetectContext {
  /** Quanto tempo o jogador levou para fazer o lance. */
  thinkMs: number;
}

const BORING_EVERY = 20; // meio-lances sem captura para reclamar
const SLOW_MOVE_SEC = 45;

/** Soma do material de uma cor no tabuleiro. */
function material(chess: Chess, color: Color): number {
  let total = 0;
  for (const row of chess.board()) for (const c of row) if (c?.color === color) total += PIECE_VALUE[c.type];
  return total;
}

function findKing(chess: Chess, color: Color): Square | null {
  for (const row of chess.board()) for (const c of row) if (c?.type === 'k' && c.color === color) return c.square;
  return null;
}

/** Peça mal defendida: atacada e (sem defensores OU atacada por algo mais barato). */
function isHanging(chess: Chess, square: Square, owner: Color, value: number): boolean {
  const enemies = chess.attackers(square, other(owner));
  if (!enemies.length) return false;
  const cheapest = Math.min(...enemies.map((s) => PIECE_VALUE[chess.get(s)!.type] || 99));
  const defenders = chess.attackers(square, owner).length;
  return defenders === 0 || cheapest < value;
}

/**
 * Olha para o lance recém-feito e o estado resultante e descreve tudo
 * que pode render uma piada. A interface decide o que narrar.
 */
export function detectEvents(chess: Chess, move: Move, ctx: DetectContext): GameEvent[] {
  const events: GameEvent[] = [];
  const by = move.color;
  const opp = other(by);
  const history = chess.history({ verbose: true });
  const ownMoves = history.filter((m) => m.color === by); // inclui o lance atual
  const prevOpp = history.at(-2);
  const prevOwn = history.at(-3);
  const moveNumber = Math.ceil(history.length / 2);
  const push = (e: GameEvent) => events.push(e);

  // ---- Abertura
  const opening = matchOpening(history.map((m) => m.san));
  if (opening) push({ by, type: 'opening', id: opening.id, name: opening.name });

  // ---- Capturas
  if (move.captured) {
    push({ by, type: 'capture', attacker: move.piece, victim: move.captured, enPassant: move.isEnPassant() });

    if (history.filter((m) => m.captured).length === 1) push({ by, type: 'firstBlood' });

    if (prevOpp?.captured && prevOpp.to === move.to) {
      push({ by, type: 'recapture', even: PIECE_VALUE[prevOpp.captured] === PIECE_VALUE[move.captured] });
    }

    // Estava defendida antes do lance? Se não, foi presente.
    if (PIECE_VALUE[move.captured] >= 3 && !move.isEnPassant()) {
      const before = new Chess(move.before);
      if (before.attackers(move.to, opp).length === 0) push({ by, type: 'gift', victim: move.captured });
    }

    let streak = 0;
    for (let i = ownMoves.length - 1; i >= 0 && ownMoves[i].captured; i--) streak++;
    if (streak >= 3) push({ by, type: 'captureSpree', count: streak });
  } else {
    let quiet = 0;
    for (let i = history.length - 1; i >= 0 && !history[i].captured; i--) quiet++;
    if (quiet > 0 && quiet % BORING_EVERY === 0) push({ by, type: 'boring', plies: quiet });
  }

  // ---- Peça pendurada (só peças que valem alguma coisa)
  const movedType: PieceSymbol = move.promotion ?? move.piece;
  const movedValue = PIECE_VALUE[movedType];
  if (movedValue >= 3 && !chess.isCheckmate() && isHanging(chess, move.to, by, movedValue)) {
    push({ by, type: 'hanging', piece: movedType });
  }

  // ---- Garfo: a peça que moveu ataca 2+ alvos que valem a pena
  const targets: PieceSymbol[] = [];
  for (const row of chess.board()) {
    for (const c of row) {
      if (!c || c.color !== opp) continue;
      if (!chess.attackers(c.square, by).includes(move.to)) continue;
      const v = PIECE_VALUE[c.type];
      const worthIt =
        c.type === 'k' || v > movedValue || (v >= 3 && chess.attackers(c.square, opp).length === 0);
      if (worthIt) targets.push(c.type);
    }
  }
  if (targets.length >= 2 && !isHanging(chess, move.to, by, movedValue || 1)) {
    push({ by, type: 'fork', attacker: movedType, targets });
  }

  // ---- Roque, promoção, passeios
  if (move.isKingsideCastle()) push({ by, type: 'castle', side: 'king' });
  if (move.isQueensideCastle()) push({ by, type: 'castle', side: 'queen' });
  if (move.promotion) push({ by, type: 'promotion', to: move.promotion });

  const queensOnBoard = chess.board().flat().some((c) => c?.type === 'q');
  if (move.piece === 'k' && !move.isKingsideCastle() && !move.isQueensideCastle() && moveNumber <= 20 && queensOnBoard) {
    push({ by, type: 'kingWalk' });
  }
  if (move.piece === 'q' && moveNumber <= 4 && ownMoves.filter((m) => m.piece === 'q').length === 1) {
    push({ by, type: 'earlyQueen', moveNumber });
  }
  if (
    prevOwn &&
    !move.captured &&
    prevOwn.piece === move.piece &&
    prevOwn.from === move.to &&
    prevOwn.to === move.from
  ) {
    push({ by, type: 'indecision', piece: move.piece });
  }

  // ---- Material
  const diffAfter = material(chess, 'w') - material(chess, 'b');
  const gained = (move.captured ? PIECE_VALUE[move.captured] : 0) + (move.promotion ? PIECE_VALUE[move.promotion] - 1 : 0);
  const diffBefore = diffAfter - (by === 'w' ? gained : -gained);
  const myLeadAfter = by === 'w' ? diffAfter : -diffAfter;
  const myLeadBefore = by === 'w' ? diffBefore : -diffBefore;
  if (myLeadBefore < 0 && myLeadAfter >= 2) push({ by, type: 'materialSwing', kind: 'virada', lead: myLeadAfter });
  else if (myLeadAfter >= 10 && myLeadBefore < 10) push({ by, type: 'materialSwing', kind: 'massacre', lead: myLeadAfter });

  // ---- Tempo
  const seconds = Math.round(ctx.thinkMs / 1000);
  if (seconds >= SLOW_MOVE_SEC) push({ by, type: 'slowMove', seconds });

  // ---- Xeques e fim de jogo
  if (chess.isCheckmate()) {
    push({
      by,
      type: 'checkmate',
      moveNumber,
      matingPiece: move.piece,
      loserHadMoreMaterial: myLeadAfter < 0,
    });
  } else if (chess.isCheck()) {
    push({ by, type: 'check' });
    const king = findKing(chess, opp);
    const checkers = king ? chess.attackers(king, by) : [];
    if (checkers.length >= 2) push({ by, type: 'doubleCheck' });
    else if (!checkers.includes(move.to)) push({ by, type: 'discoveredCheck' });

    let streak = 0;
    for (let i = ownMoves.length - 1; i >= 0 && /[+#]/.test(ownMoves[i].san); i--) streak++;
    if (streak >= 3) push({ by, type: 'checkSpree', count: streak });
  } else if (chess.isStalemate()) {
    push({ by, type: 'stalemate' });
  } else if (chess.isDraw()) {
    const reason = chess.isThreefoldRepetition()
      ? 'repetition'
      : chess.isInsufficientMaterial()
        ? 'insufficient'
        : chess.isDrawByFiftyMoves()
          ? 'fifty'
          : 'other';
    push({ by, type: 'draw', reason });
  }
  return events;
}
