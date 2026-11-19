import { withGeneric } from '../../phrases/generic';
import { is } from '../../phrases/match';
import type { Theme } from '../theme';

/*
 * Tema feito com o arquivo de fã "Black Team" (o lado do Bowser).
 * Só para jogar entre amigos: são personagens de uma franquia, não publique esse tema.
 * Por enquanto os dois times usam os mesmos modelos (veio só um lado no arquivo).
 * Convertido com: node tools/import-3mf.mjs mario <Black+Team.3mf>
 */
export const mario: Theme = {
  id: 'mario',
  name: 'Time do Bowser',
  colors: {
    background: '#3b6fd8',
    table: '#3f8f3f',
    frame: '#8b4513',
    lightSquare: '#f8e0b0',
    darkSquare: '#c8743c',
    whitePiece: '#fff4dc',
    blackPiece: '#3b2a2a',
    highlight: '#ffd34d',
    lastMove: '#7ee081',
    check: '#ff4d4d',
  },
  names: {
    withArticle: { p: 'o Goomba', n: 'o Koopa', b: 'o Magikoopa', r: 'o Boo', q: 'a princesa', k: 'o Bowser' },
    short: { p: 'Goomba', n: 'Koopa', b: 'Magikoopa', r: 'Boo', q: 'Princesa', k: 'Bowser' },
  },
  models: { url: '/models/mario.glb', creaseAngle: 45 },
  facesCamera: ['p', 'n', 'b', 'r', 'q', 'k'],
  promotionTitle: 'O Goomba pegou um cogumelo! Vai virar o quê?',
  phrases: withGeneric([
    {
      id: 'mate',
      priority: 90,
      when: is('checkmate'),
      lines: [
        'Mate! O Bowser de {oponente} caiu na lava. De novo.',
        'Xeque-mate! Desculpe, mas o seu rei está em outro castelo.',
        'GAME OVER pra {oponente}!',
        '{Jogador} salvou o dia! {Oponente} perdeu todas as vidas.',
      ],
      spicy: ['GAME OVER, {oponente}. E nem tem continue.', '{Oponente}, até um Goomba jogaria melhor. E Goomba não tem braço.'],
    },
    {
      id: 'captura',
      priority: 30,
      when: is('capture'),
      lines: [
        '{Atacante} pulou na cabeça de {vitima}.',
        '{Vitima} perdeu uma vida.',
        'Game over pra {vitima}.',
        '{Vitima} foi achatado(a). Boing!',
        '{Atacante} chutou {vitima} pra fora da fase.',
      ],
      spicy: ['{Oponente}, você tá jogando no modo fácil e mesmo assim perdendo.'],
    },
    {
      id: 'cai-goomba',
      priority: 36,
      when: is('capture', (e) => e.victim === 'p'),
      chance: 0.6,
      lines: ['Pisaram no Goomba. Clássico.', 'Mais um Goomba achatado. Ele nunca teve chance.'],
    },
    {
      id: 'goomba-captura',
      priority: 44,
      when: is('capture', (e) => e.attacker === 'p' && e.victim !== 'p'),
      lines: ['Um GOOMBA capturou {vitima}! Primeira vitória da história dos Goombas.', 'O Goomba conseguiu! Alguém filma isso.'],
    },
    {
      id: 'koopa-ataca',
      priority: 36,
      when: is('capture', (e) => e.attacker === 'n'),
      chance: 0.7,
      lines: ['O Koopa veio deslizando no casco e derrubou {vitima}.', 'Cascada certeira! {Vitima} foi pro espaço.'],
    },
    {
      id: 'cai-koopa',
      priority: 36,
      when: is('capture', (e) => e.victim === 'n'),
      chance: 0.7,
      lines: ['O Koopa ficou só no casco.', 'Tiraram o Koopa do casco. Que humilhação.'],
    },
    {
      id: 'boo-ataca',
      priority: 36,
      when: is('capture', (e) => e.attacker === 'r'),
      chance: 0.7,
      lines: ['O Boo atacou pelas costas. Típico de fantasma.', 'Buuu! {Vitima} morreu de susto.'],
    },
    {
      id: 'magikoopa-ataca',
      priority: 36,
      when: is('capture', (e) => e.attacker === 'b'),
      chance: 0.7,
      lines: ['O Magikoopa fez um feitiço e {vitima} virou fumaça.', 'Zap! O Magikoopa transformou {vitima} em moeda.'],
    },
    {
      id: 'cai-a-dama',
      priority: 62,
      when: is('capture', (e) => e.victim === 'q'),
      lines: ['A princesa foi capturada. Pra variar.', 'Levaram a princesa! Alguém chama um encanador.'],
      spicy: ['Perdeu a princesa, {oponente}. Ela já devia estar acostumada.'],
    },
    {
      id: 'xeque',
      priority: 22,
      when: is('check'),
      lines: ['Xeque! O Bowser está encurralado no próprio castelo.', 'Xeque! {Rei} está pisando na beira da lava.', 'Xeque! Corre que a fase tá acabando!'],
    },
    {
      id: 'promocao',
      priority: 60,
      when: is('promotion'),
      lines: ['Pegou o cogumelo! O Goomba cresceu e virou {peca}.', 'Power-up! Agora é {peca}.'],
    },
    {
      id: 'primeiro-sangue',
      priority: 45,
      when: is('firstBlood'),
      lines: ['Primeira vida perdida!', 'Começou a fase!'],
    },
    {
      id: 'parado',
      priority: 10,
      when: is('idle'),
      lines: ['{Jogador}, até um Goomba já teria jogado.', 'O tempo da fase está acabando, {jogador}!', '{Jogador} foi procurar moedas escondidas?'],
      spicy: ['Joga logo, {jogador}, antes que o Bowser morra de velhice.'],
    },
  ]),
};
