import './style.css';
import { ChessGame } from './core/game';
import { LocalTransport, type MoveTransport } from './core/transport';
import { other, type Color, type GameEvent, type MoveIntent, type MoveResult, type PieceSymbol, type Square } from './core/types';
import { Reactions } from './fx/reactions';
import { sfx } from './fx/sfx';
import { onlineMode } from './net/channel';
import { OnlineTransport, type OnlineStatus } from './net/online';
import { newRoomCode, normalizeRoomCode } from './net/protocol';
import { PhraseBook, pieceName } from './phrases/phrases';
import { GameView } from './render/gameView';
import { themeById, THEMES } from './themes';
import { Hud } from './ui/hud';
import { OnlinePanel } from './ui/onlinePanel';
import { loadSettings, saveSettings, type Settings } from './ui/settings';
import { StartScreen } from './ui/startScreen';

const settings = loadSettings();
let theme = themeById(settings.theme);
settings.theme = theme.id; // se o tema salvo foi removido, passa a valer o padrão
const game = new ChessGame();
const phrases = new PhraseBook(theme.phrases, theme.names);
const view = new GameView(document.getElementById('app')!, theme);

let selected: Square | null = null;
let busy = false;

const hud = new Hud(settings, THEMES, {
  onNewGame: () => newGame(),
  onUndo: () => {
    if (!busy && transport.canUndo) game.undo();
  },
  onSettingsChange: applySettings,
});
const reactions = new Reactions(view, hud);

// Peças de arquivo (.glb) chegam depois: ao trocar o modelo, devolve seleção e tremedeira.
view.hooks.onModelsLoaded = (loaded, error) => {
  if (error) {
    console.error(error);
    hud.say(`Não consegui carregar as peças do tema ${loaded.name}. Usando as clássicas.`);
    return;
  }
  requestAnimationFrame(() => {
    view.setTrembling(game.chess.isCheck() ? game.turn() : null);
    view.setSelected(selected);
  });
};

// ------------------------------------------------------------------ transporte

// Todo lance passa pelo transporte: local (mesmo dispositivo) ou online (sala).
let transport: MoveTransport = new LocalTransport();
let stopListening = transport.on('move', receiveMove);
/** Lances que chegaram enquanto outro ainda estava animando. */
const pending: MoveIntent[] = [];

function receiveMove(intent: MoveIntent): void {
  if (busy) pending.push(intent);
  else game.apply(intent);
}

function useTransport(next: MoveTransport): void {
  stopListening();
  transport.dispose();
  pending.length = 0;
  transport = next;
  stopListening = transport.on('move', receiveMove);
  hud.setUndoEnabled(transport.canUndo);
}

const online = (): OnlineTransport | null => (transport instanceof OnlineTransport ? transport : null);

/** Nomes que aparecem nas frases e no placar. */
function players(): Record<Color, string> {
  const o = online();
  if (!o) return { w: settings.whiteName, b: settings.blackName };
  return { w: o.nameFor('w') ?? 'Brancas', b: o.nameFor('b') ?? 'Pretas' };
}

/** Cor do lado de quem está neste dispositivo (para a câmera). */
const mySide = (): Color => online()?.myColor ?? game.turn();

function applySettings(s: Settings): void {
  phrases.options = { spicy: s.spicy, players: players() };
  sfx.enabled = s.sound;
  saveSettings(s);
  if (s.theme !== theme.id && !busy) switchTheme();
  refreshBoardState();
}

/** Troca o tema mantendo a partida (se houver animação rodando, espera ela acabar). */
function switchTheme(): void {
  theme = themeById(settings.theme);
  phrases.setRepertoire(theme.phrases, theme.names);
  select(null);
  view.setTheme(theme, game.chess);
  view.setTrembling(game.chess.isCheck() ? game.turn() : null);
}
applySettings(settings);

function newGame(): void {
  const o = online();
  if (!o) return game.newGame();
  if (game.ply > 0 && !game.isGameOver() && !window.confirm('Começar uma partida nova para os dois?')) return;
  o.resetForAll();
}

// ------------------------------------------------------------- fluxo do jogo

game.on('move', (result) => void onMoveApplied(result));
game.on('reset', () => {
  pending.length = 0;
  select(null);
  hud.hideOverlay();
  view.syncFrom(game.chess);
  view.setTrembling(game.chess.isCheck() ? game.turn() : null);
  refreshBoardState();
  idle.reset();
  if (online() || settings.autoFlip) void view.faceSide(mySide());
});

async function onMoveApplied({ move, events }: MoveResult): Promise<void> {
  busy = true;
  select(null);
  reactions.prepare(events);
  await view.animateMove(move, { slowMo: reactions.wantsSlowMo(move, events) });
  refreshBoardState();
  reactions.afterMove(move, events);
  idle.reset();

  const phrase = phrases.pick(events);
  if (phrase) hud.say(phrase.text, phrase.spicy);

  const end = events.find((e) => e.type === 'checkmate' || e.type === 'stalemate' || e.type === 'draw');
  if (end) {
    setTimeout(() => hud.showGameOver(...gameOverText(end)), 3200);
  } else if (!online() && settings.autoFlip) {
    await view.faceSide(game.turn());
  }
  busy = false;
  if (settings.theme !== theme.id) switchTheme();
  const next = pending.shift();
  if (next) game.apply(next);
}

function gameOverText(e: GameEvent): [string, string] {
  if (e.type === 'checkmate') {
    const names = players();
    const o = online();
    if (o?.myColor) {
      return e.by === o.myColor
        ? ['Você venceu!', `Xeque-mate. ${names[other(e.by)]}, sem choro.`]
        : [`${names[e.by]} venceu!`, 'Xeque-mate. Pede revanche, vai.'];
    }
    return [`${names[e.by]} venceu!`, `Por xeque-mate. ${names[other(e.by)]}, sem choro.`];
  }
  if (e.type === 'stalemate') return ['Empate', 'Afogamento: o rei ficou sem ter pra onde ir.'];
  return ['Empate', 'Ninguém venceu. Ninguém perdeu. Ninguém está feliz.'];
}

function turnLabel(): string {
  const turn = game.turn();
  const o = online();
  const names = players();
  const side = turn === 'w' ? 'Brancas' : 'Pretas';
  if (o?.myColor) return turn === o.myColor ? `Lance ${game.chess.moveNumber()} · Sua vez` : `Vez de ${names[turn]}`;
  if (o) return `Vez de ${names[turn]} (${side})`;
  return `Lance ${game.chess.moveNumber()} · ${names[turn] === side ? `Vez das ${side}` : `Vez de ${names[turn]} (${side})`}`;
}

function refreshBoardState(): void {
  const chess = game.chess;
  hud.setTurn(chess.turn(), turnLabel());
  const hl: Array<[Square, 'selected' | 'lastMove' | 'check']> = [];
  const last = chess.history({ verbose: true }).at(-1);
  if (last) hl.push([last.from, 'lastMove'], [last.to, 'lastMove']);
  if (selected) hl.push([selected, 'selected']);
  if (chess.isCheck()) {
    const king = chess.board().flat().find((c) => c?.type === 'k' && c.color === chess.turn());
    if (king) hl.push([king.square, 'check']);
  }
  view.board.setHighlights(hl);
}

// ------------------------------------------------------- provocação por demora

const idle = (() => {
  let nextAt = 0;
  const reset = () => (nextAt = settings.idleTaunt);
  setInterval(() => {
    const modalOpen = [...document.querySelectorAll<HTMLElement>('.modal')].some((m) => !m.hidden);
    if (!settings.idleTaunt || busy || modalOpen || game.isGameOver()) return;
    const seconds = Math.floor(game.thinkingMs() / 1000);
    if (seconds < nextAt) return;
    nextAt = seconds + settings.idleTaunt;
    const event: GameEvent = { type: 'idle', by: game.turn(), seconds };
    const phrase = phrases.pick([event]);
    if (phrase) hud.say(phrase.text, phrase.spicy);
    reactions.idle(game.turn());
  }, 1000);
  return { reset };
})();
idle.reset();

// --------------------------------------------------------------------- input

function select(square: Square | null): void {
  selected = square;
  view.setSelected(square);
  const targets = square
    ? game.legalMovesFrom(square).map((m) => ({ square: m.to, capture: Boolean(m.captured) }))
    : [];
  view.board.setMoveMarkers(targets);
  refreshBoardState();
}

async function onSquareClicked(square: Square): Promise<void> {
  if (busy || game.isGameOver() || start.visible) return;
  const turn = game.turn();
  if (!transport.controls(turn)) {
    const o = online();
    if (o && o.myColor && game.chess.get(square)?.color === o.myColor) hud.say('Calma! Ainda não é a sua vez.');
    return;
  }

  if (selected) {
    const candidates = game.legalMovesFrom(selected).filter((m) => m.to === square);
    if (candidates.length) {
      let promotion = candidates[0].promotion;
      if (promotion) {
        busy = true;
        const short = (t: PieceSymbol) => pieceName(theme.names, turn, t, 'short');
        const names = { p: short('p'), n: short('n'), b: short('b'), r: short('r'), q: short('q'), k: short('k') };
        promotion =
          (await hud.choosePromotion(turn, names, theme.promotionTitle ?? `${names.p} chegou lá! Vai virar o quê?`)) ??
          undefined;
        busy = false;
        if (!promotion) return select(null);
      }
      transport.send({ from: selected, to: square, promotion });
      return;
    }
  }

  const piece = game.chess.get(square);
  if (piece && piece.color === turn && square !== selected) {
    select(square);
    sfx.select();
  } else select(null);
}

// Áudio só pode começar depois de um gesto do usuário.
window.addEventListener('pointerdown', () => sfx.unlock());

// Distingue clique de arrastar (girar a câmera).
const canvas = view.renderer.domElement;
let down: { x: number; y: number } | null = null;
canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 8) return;
  const sq = view.pick(e.clientX, e.clientY);
  if (sq) void onSquareClicked(sq);
  else select(null);
});

// ---------------------------------------------------------------------- online

const setRoomInUrl = (room: string | null) => {
  const url = new URL(location.href);
  if (room) url.searchParams.set('sala', room);
  else url.searchParams.delete('sala');
  history.replaceState(null, '', url);
};

async function enterRoom(room: string, name: string, color: Color | null): Promise<void> {
  settings.onlineName = name;
  saveSettings(settings);
  if (busy) throw new Error('Espere a animação terminar e tente de novo.');

  game.newGame(); // começa limpo; a partida da sala chega na conexão (ou é retomada desta aba)
  const t = new OnlineTransport(game, room, name, color);
  let lastColor: Color | null = t.myColor;
  t.on('status', (s: OnlineStatus) => {
    panel.update(s);
    phrases.options = { ...phrases.options, players: players() };
    refreshBoardState();
    if (s.myColor !== lastColor) {
      lastColor = s.myColor;
      if (s.myColor) void view.faceSide(s.myColor);
    }
  });
  t.on('notice', (msg) => hud.say(msg));
  useTransport(t);
  try {
    await t.connect();
  } catch (err) {
    leaveRoom();
    throw err;
  }
  setRoomInUrl(room);
  panel.update(t.status);
  start.close();
  view.controls.autoRotate = false;
  if (t.myColor) void view.faceSide(t.myColor);
  game.resetClock();
  idle.reset();
}

function leaveRoom(): void {
  const o = online();
  o?.leave();
  useTransport(new LocalTransport());
  setRoomInUrl(null);
  panel.update(null);
  phrases.options = { ...phrases.options, players: players() };
  refreshBoardState();
}

const panel = new OnlinePanel(onlineMode === 'local', {
  onCreate: (name) => enterRoom(newRoomCode(), name, 'w'),
  onJoin: (code, name) => enterRoom(code, name, null),
  onLeave: () => {
    leaveRoom();
    panel.close();
    hud.say('Você saiu da sala. Agora é no mesmo PC.');
  },
});
panel.setName(settings.onlineName);

// ---------------------------------------------------------------------- start

// Tela de início: o tabuleiro fica girando, desfocado, ao fundo.
let welcomed = false;
const start = new StartScreen({
  onStart: (fresh) => {
    view.controls.autoRotate = false;
    if (fresh && online()) leaveRoom();
    if (fresh && game.ply > 0) game.newGame();
    else void view.faceSide(mySide());
    game.resetClock();
    idle.reset();
    if (!welcomed) {
      welcomed = true;
      hud.say('Bem-vindos ao Xadrez 2! Coloquem seus nomes em Ajustes pra provocação ficar pessoal.');
    }
  },
  onSettings: () => hud.openSettings(),
  onOnline: () => panel.open(),
  onShow: () => {
    select(null);
    view.controls.autoRotate = true;
    return { inProgress: !!online() || (game.ply > 0 && !game.isGameOver()), online: !!online() };
  },
});
view.controls.autoRotate = true;
view.controls.autoRotateSpeed = 0.8;

view.syncFrom(game.chess);
refreshBoardState();

// Chegou por um link de convite (?sala=CODIGO)?
const invited = normalizeRoomCode(new URLSearchParams(location.search).get('sala') ?? '');
if (invited) {
  const resuming = (() => {
    try {
      return sessionStorage.getItem(`xadrez-2:sala:${invited}`) !== null;
    } catch {
      return false;
    }
  })();
  // Recarregou a página no meio da partida: volta direto. Senão, só pede o nome.
  if (resuming && settings.onlineName) {
    enterRoom(invited, settings.onlineName, null).catch((err) => {
      panel.open(invited);
      panel.showError(err instanceof Error ? err.message : String(err));
    });
  } else {
    panel.open(invited);
  }
}

// Facilita depurar pelo console do navegador.
Object.assign(window, { game, view, phrases, getTransport: () => transport });
