import type * as THREE from 'three';
import { other, PIECE_VALUE, type GameEvent, type Move } from '../core/types';
import type { GameView } from '../render/gameView';
import type { PieceView } from '../render/pieces';
import type { Hud } from '../ui/hud';
import { sfx } from './sfx';

const COLORS = {
  damage: '#ff4d4d',
  gift: '#9be15d',
  info: '#ffd34d',
  combo: '#4dd6ff',
  blunder: '#ff9f43',
};

/**
 * Traduz eventos do jogo em espetáculo: sons, números flutuantes,
 * reações das peças, confete. Não decide frases (isso é do PhraseBook).
 */
export class Reactions {
  private pending: GameEvent[] = [];

  constructor(
    private view: GameView,
    private hud: Hud,
  ) {
    view.hooks.onHop = () => sfx.hop();
    view.hooks.onLand = () => sfx.land();
    view.hooks.onImpact = (victim, at) => this.impact(victim, at);
  }

  /** Câmera lenta para os momentos dramáticos. */
  wantsSlowMo(move: Move, events: GameEvent[]): boolean {
    return move.captured === 'q' || events.some((e) => e.type === 'checkmate');
  }

  /** Chame antes de animar o lance, para o impacto saber o contexto. */
  prepare(events: GameEvent[]): void {
    this.pending = events;
  }

  private impact(victim: PieceView, at: THREE.Vector3): void {
    const events = this.pending;
    const value = PIECE_VALUE[victim.type];
    const pos = at.clone().setY(1.5);
    sfx.capture();
    this.view.crowdReact(victim.color, 'shock');
    this.view.crowdReact(other(victim.color), 'cheer');

    if (victim.type === 'q') {
      this.view.effects.floatText(pos, `-${value} CRÍTICO!`, COLORS.damage, 1.3);
      sfx.dramatic();
      this.hud.shakeScreen();
    } else if (events.some((e) => e.type === 'gift')) {
      this.view.effects.floatText(pos, `-${value} GRÁTIS!`, COLORS.gift);
      sfx.laugh();
    } else {
      this.view.effects.floatText(pos, `-${value}`, COLORS.damage, value >= 5 ? 1.1 : 0.85);
    }
  }

  /** Depois que o lance terminou de animar. */
  afterMove(move: Move, events: GameEvent[]): void {
    const over = (h = 1.6) => this.view.above(move.to, h);
    const find = <T extends GameEvent['type']>(t: T) =>
      events.find((e) => e.type === t) as Extract<GameEvent, { type: T }> | undefined;

    const mate = find('checkmate');
    if (mate) {
      sfx.fanfare();
      this.hud.flash('MATE!');
      void this.view.celebrate(mate.by);
      return;
    }
    if (find('stalemate') || find('draw')) {
      sfx.sad();
      this.hud.flash('EMPATE', '#ffd34d');
      return;
    }

    if (find('doubleCheck')) this.hud.flash('XEQUE DUPLO!');
    else if (find('check')) this.hud.flash('XEQUE!');
    if (find('check')) sfx.check();
    this.view.setTrembling(find('check') ? other(move.color) : null);

    const spree = find('captureSpree');
    if (spree) this.view.effects.floatText(over(2.3), `COMBO x${spree.count}!`, COLORS.combo, 1.2);

    if (find('fork')) {
      this.view.effects.floatText(over(2), 'GARFO!', COLORS.info, 1.1);
      sfx.pop();
    }
    if (find('hanging')) {
      this.view.effects.floatText(over(2), '??', COLORS.blunder, 1.3);
      sfx.sad();
    }
    if (find('promotion')) {
      this.view.effects.floatText(over(2), 'LEVEL UP!', COLORS.combo, 1.1);
      this.view.effects.burstConfetti(this.view.above(move.to, 0), 80);
      sfx.levelUp();
    }
    if (find('indecision')) this.view.effects.floatText(over(), '???', COLORS.info);
    if (find('kingWalk')) this.view.effects.floatText(over(), 'PASSEIO!', COLORS.info, 0.9);

    const swing = find('materialSwing');
    if (swing?.kind === 'massacre') {
      sfx.laugh();
      this.view.crowdReact(move.color, 'bigCheer');
    } else if (swing?.kind === 'virada') {
      this.hud.flash('VIRADA!', '#9be15d');
      this.view.crowdReact(move.color, 'bigCheer');
    }
  }

  /** Alguém está demorando: o outro lado fica impaciente. */
  idle(waitingFor: GameEvent['by']): void {
    this.view.crowdReact(other(waitingFor), 'cheer');
    sfx.pop();
  }
}
