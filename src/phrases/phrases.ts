import { other, type Color, type GameEvent, type PieceSymbol } from '../core/types';

/**
 * Uma regra de frase: quando `when` casa com um evento, uma das frases pode ser dita.
 * Regras com prioridade maior ganham. `when` também recebe TODOS os eventos do lance,
 * o que permite combos ("demorou 1 minuto E deixou a dama pendurada").
 *
 * `lines` são sempre usadas. `spicy` só entram no nível "Pesado".
 *
 * Placeholders:
 *   {jogador} {oponente}   nomes de quem fez o lance e de quem sofreu
 *   {atacante} {vitima}    peças da captura ("o cavalo", "a dama")
 *   {peca}                 peça envolvida (promovida, pendurada, indecisa...)
 *   {alvos}                peças atacadas no garfo ("a dama e a torre")
 *   {rei}                  rei ameaçado/derrotado (xeque, mate) ou o próprio rei (roque, passeio)
 *   {dama}                 dama de quem jogou
 *   {abertura} {n} {segundos} {vantagem} {lance}
 * Comece com maiúscula ({Jogador}, {Vitima}) para capitalizar.
 * Os nomes das peças vêm do tema (e podem ser diferentes por time).
 */
export interface PhraseRule {
  id: string;
  priority: number;
  when: (e: GameEvent, all: GameEvent[]) => boolean;
  lines: string[];
  spicy?: string[];
  /** Probabilidade de falar (0–1). Bom para eventos frequentes. Padrão: 1. */
  chance?: number;
}

export interface PieceNames {
  /** Nome com artigo, em minúsculas: "o peão", "a dama". */
  withArticle: Record<PieceSymbol, string>;
  /** Nome curto para botões: "Dama", "RH". */
  short: Record<PieceSymbol, string>;
  /** Nomes diferentes por time (ex.: humanos x orcs). O que faltar usa os de cima. */
  byTeam?: Partial<Record<Color, { withArticle?: Partial<Record<PieceSymbol, string>>; short?: Partial<Record<PieceSymbol, string>> }>>;
}

/** Nome de uma peça de um time ("o rei orc"). */
export function pieceName(names: PieceNames, color: Color, type: PieceSymbol, kind: 'withArticle' | 'short' = 'withArticle'): string {
  return names.byTeam?.[color]?.[kind]?.[type] ?? names[kind][type];
}

export interface Phrase {
  text: string;
  priority: number;
  event: GameEvent;
  /** Veio do repertório "pesado". */
  spicy: boolean;
}

export interface PhraseOptions {
  spicy: boolean;
  players: Record<Color, string>;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const joinPt = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;

export class PhraseBook {
  private recent: string[] = [];
  options: PhraseOptions = { spicy: false, players: { w: 'Brancas', b: 'Pretas' } };

  constructor(
    private rules: PhraseRule[],
    private names: PieceNames,
  ) {}

  /** Troca o repertório (ao mudar de tema). */
  setRepertoire(rules: PhraseRule[], names: PieceNames): void {
    this.rules = rules;
    this.names = names;
    this.recent = [];
  }

  /** Escolhe a melhor frase para o conjunto de eventos de um lance. */
  pick(events: GameEvent[]): Phrase | null {
    const candidates: Array<{ rule: PhraseRule; event: GameEvent }> = [];
    for (const event of events) {
      for (const rule of this.rules) {
        if (this.pool(rule).length && rule.when(event, events)) candidates.push({ rule, event });
      }
    }
    candidates.sort((a, b) => b.rule.priority - a.rule.priority || Math.random() - 0.5);
    for (const c of candidates) {
      if (c.rule.chance !== undefined && Math.random() > c.rule.chance) continue;
      const line = this.randomLine(c.rule);
      return {
        text: this.fill(line, c.event, events),
        priority: c.rule.priority,
        event: c.event,
        spicy: Boolean(c.rule.spicy?.includes(line)),
      };
    }
    return null;
  }

  private pool(rule: PhraseRule): string[] {
    return this.options.spicy && rule.spicy ? [...rule.lines, ...rule.spicy] : rule.lines;
  }

  /** Sorteia evitando repetir as últimas frases ditas. */
  private randomLine(rule: PhraseRule): string {
    const all = this.pool(rule);
    const fresh = all.filter((l) => !this.recent.includes(l));
    const pool = fresh.length ? fresh : all;
    const line = pool[Math.floor(Math.random() * pool.length)];
    this.recent = [line, ...this.recent].slice(0, 30);
    return line;
  }

  private fill(line: string, primary: GameEvent, all: GameEvent[]): string {
    const by = primary.by;
    const opp = other(by);
    // Peça de quem jogou / peça do adversário (os nomes podem mudar por time).
    const mine = (t: PieceSymbol) => pieceName(this.names, by, t);
    const theirs = (t: PieceSymbol) => pieceName(this.names, opp, t);
    const vars: Record<string, string> = {
      jogador: this.options.players[by],
      oponente: this.options.players[opp],
      rei: theirs('k'),
      dama: mine('q'),
    };
    // Eventos secundários primeiro; o principal sobrescreve.
    for (const e of [...all.filter((x) => x !== primary), primary]) {
      switch (e.type) {
        case 'capture':
          vars.atacante = mine(e.attacker);
          vars.vitima = theirs(e.victim);
          break;
        case 'gift':
          vars.vitima = theirs(e.victim);
          break;
        case 'promotion':
          vars.peca = mine(e.to);
          break;
        case 'hanging':
        case 'indecision':
          vars.peca = mine(e.piece);
          break;
        case 'fork':
          vars.atacante = mine(e.attacker);
          vars.alvos = joinPt(e.targets.map(theirs));
          break;
        case 'castle':
        case 'kingWalk':
          vars.rei = mine('k');
          break;
        case 'opening':
          vars.abertura = e.name;
          break;
        case 'checkmate':
          vars.lance = String(e.moveNumber);
          vars.atacante = mine(e.matingPiece);
          break;
        case 'checkSpree':
        case 'captureSpree':
          vars.n = String(e.count);
          break;
        case 'boring':
          vars.n = String(e.plies);
          break;
        case 'earlyQueen':
          vars.n = String(e.moveNumber);
          break;
        case 'slowMove':
        case 'idle':
          vars.segundos = String(e.seconds);
          break;
        case 'materialSwing':
          vars.vantagem = String(e.lead);
          break;
      }
    }
    return line.replace(/\{(\w+)\}/g, (whole, key: string) => {
      const value = vars[key.toLowerCase()];
      if (value === undefined) return whole;
      return key[0] === key[0].toUpperCase() ? cap(value) : value;
    });
  }
}
