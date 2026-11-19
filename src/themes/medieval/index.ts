import * as THREE from 'three';
import { withGeneric } from '../../phrases/generic';
import { is } from '../../phrases/match';
import type { Theme } from '../theme';

/*
 * Tema Medieval: humanos (brancas) contra orcs (pretas).
 * Modelos do projeto "ajedrez para impresoras más pequeñas" (impressão 3D),
 * convertidos com: node tools/import-3mf.mjs medieval <arquivo.3mf>
 */

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });

function decorate(group: THREE.Group, tableY: number): void {
  // velas
  for (const [x, z] of [[-6.4, -3.6], [6.5, 3.8]] as const) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.3, 16), std('#f3e9d2'));
    candle.position.set(x, tableY + 0.65, z);
    group.add(candle);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 10), std('#ffcf5a', { emissive: '#ff9a1f', emissiveIntensity: 2.5 }));
    flame.position.set(x, tableY + 1.48, z);
    group.add(flame);
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 20), std('#8a6a3a', { metalness: 0.6, roughness: 0.4 }));
    holder.position.set(x, tableY + 0.06, z);
    group.add(holder);
  }
  // espada largada na mesa
  const sword = new THREE.Group();
  sword.position.set(6.4, tableY + 0.06, -2.2);
  sword.rotation.y = 0.4;
  group.add(sword);
  const steel = std('#c9ced6', { metalness: 0.9, roughness: 0.25 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 2.6), steel);
  blade.position.z = -0.6;
  sword.add(blade);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.12), std('#b08d3a', { metalness: 0.7, roughness: 0.3 }));
  guard.position.z = 0.75;
  sword.add(guard);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10), std('#4a2e1c'));
  grip.rotation.x = Math.PI / 2;
  grip.position.z = 1.05;
  sword.add(grip);
  // escudo
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.1, 28), std('#7a2a2a'));
  shield.position.set(-6.5, tableY + 0.05, 2.4);
  group.add(shield);
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), steel);
  boss.position.set(-6.5, tableY + 0.1, 2.4);
  group.add(boss);
}

export const medieval: Theme = {
  id: 'medieval',
  name: 'Humanos x Orcs',
  colors: {
    background: '#1b1714',
    table: '#4a3b2c',
    frame: '#6b4a32',
    lightSquare: '#efe4c8',
    darkSquare: '#8a6f52',
    whitePiece: '#eadfc4', // marfim
    blackPiece: '#4d7a34', // verde orc
    highlight: '#ffd34d',
    lastMove: '#d9a441',
    check: '#ff4d4d',
  },
  names: {
    withArticle: { p: 'o soldado', n: 'o cavaleiro', b: 'o mago', r: 'a torre', q: 'a rainha', k: 'o rei' },
    short: { p: 'Soldado', n: 'Cavaleiro', b: 'Mago', r: 'Torre', q: 'Rainha', k: 'Rei' },
    byTeam: {
      b: {
        withArticle: { p: 'o orc', n: 'o javali de guerra', b: 'o xamã orc', r: 'a torre orc', q: 'a rainha orc', k: 'o rei orc' },
        short: { p: 'Orc', n: 'Javali', b: 'Xamã', r: 'Torre orc', q: 'Rainha orc', k: 'Rei orc' },
      },
    },
  },
  models: { url: '/models/medieval.glb', creaseAngle: 45 },
  facesCamera: ['p', 'n', 'b', 'r', 'q', 'k'],
  decorate,
  promotionTitle: 'Chegou ao fim do campo de batalha! Vai ser promovido a quê?',
  phrases: withGeneric([
    {
      id: 'mate',
      priority: 90,
      when: is('checkmate'),
      lines: [
        'O reino caiu! {Rei} foi capturado e vai pra masmorra.',
        'Mate! Os bardos vão cantar essa vitória por séculos.',
        'Xeque-mate! Toquem os sinos, a guerra acabou.',
        '{Jogador} conquistou o castelo! {Oponente} vai limpar os estábulos.',
      ],
      spicy: ['{Oponente}, seu exército vai virar lenda. Das piores.', 'Mate! {Oponente} lutou com a coragem de uma galinha.'],
    },
    {
      id: 'orcs-capturam',
      priority: 31,
      when: is('capture', (e) => e.by === 'b'),
      lines: ['WAAAGH! {Atacante} esmagou {vitima}.', '{Atacante} arrastou {vitima} pra panela do acampamento.', 'Os orcs comemoram: {vitima} caiu!'],
      spicy: ['Os orcs estão rindo de vocês, humanos. E orcs nem sabem rir direito.'],
    },
    {
      id: 'humanos-capturam',
      priority: 31,
      when: is('capture', (e) => e.by === 'w'),
      lines: ['Pelo rei! {Atacante} derrubou {vitima}.', '{Vitima} tombou diante da espada de {atacante}.', 'Por honra e glória! {Vitima} foi derrotado(a).'],
      spicy: ['Os humanos estão fatiando esses orcs igual pão de padaria.'],
    },
    {
      id: 'javali-ataca',
      priority: 36,
      when: is('capture', (e) => e.by === 'b' && e.attacker === 'n'),
      lines: ['O javali de guerra atropelou {vitima}. Porco não: JAVALI.', 'Óinc! O javali passou por cima de {vitima}.'],
    },
    {
      id: 'cavaleiro-ataca',
      priority: 36,
      when: is('capture', (e) => e.by === 'w' && e.attacker === 'n'),
      lines: ['O cavaleiro carregou de lança em riste!', 'Galopando, o cavaleiro derrubou {vitima}.'],
    },
    {
      id: 'mago-ataca',
      priority: 36,
      when: is('capture', (e) => e.by === 'w' && e.attacker === 'b'),
      lines: ['O mago lançou uma bola de fogo em {vitima}.', 'Abracadabra! {Vitima} virou um sapo.'],
    },
    {
      id: 'xama-ataca',
      priority: 36,
      when: is('capture', (e) => e.by === 'b' && e.attacker === 'b'),
      lines: ['O xamã orc fez uma mandinga e {vitima} sumiu.', 'O xamã jogou os ossinhos e decidiu: {vitima} já era.'],
    },
    {
      id: 'torre-ataca',
      priority: 35,
      when: is('capture', (e) => e.attacker === 'r'),
      chance: 0.7,
      lines: ['A catapulta da torre acertou {vitima} em cheio.', 'Pedrada da torre! {Vitima} nem viu de onde veio.'],
    },
    {
      id: 'cai-a-dama',
      priority: 62,
      when: is('capture', (e) => e.victim === 'q'),
      lines: ['{Vitima} caiu! O reino está de luto.', 'Capturaram {vitima}! Isso vai virar uma guerra de cem anos.'],
      spicy: ['Perdeu {vitima}, {oponente}. Agora o reino é só tristeza e cerveja quente.'],
    },
    {
      id: 'xeque',
      priority: 22,
      when: is('check'),
      lines: ['Xeque! Os inimigos estão nos portões do castelo!', 'Xeque! {Rei}, pegue sua espada!', 'Xeque! Toquem as trombetas!'],
    },
    {
      id: 'roque-pequeno',
      priority: 35,
      when: is('castle'),
      lines: ['Roque! {Rei} se trancou na torre e levantou a ponte levadiça.', 'Roque. {Rei} foi se esconder atrás das muralhas.'],
    },
    {
      id: 'promocao',
      priority: 60,
      when: is('promotion'),
      lines: ['Atravessou o campo de batalha inteiro e foi promovido a {peca}!', 'Promoção em campo! Agora é {peca}.'],
    },
    {
      id: 'garfo',
      priority: 72,
      when: is('fork'),
      lines: ['Garfo! Um golpe só, e {alvos} estão em perigo.', '{Atacante} cercou {alvos}. Tática digna de general.'],
    },
    {
      id: 'primeiro-sangue',
      priority: 45,
      when: is('firstBlood'),
      lines: ['Primeiro sangue derramado! Que comece a guerra.'],
    },
    {
      id: 'chato',
      priority: 25,
      when: is('boring'),
      lines: ['{N} lances de cerco e ninguém atacou. Isso é guerra ou piquenique?'],
    },
    {
      id: 'parado',
      priority: 10,
      when: is('idle'),
      lines: [
        'O exército está esperando suas ordens, {jogador}.',
        '{Jogador}, os soldados já estão jogando baralho no acampamento.',
        '{Segundos} segundos... o cerco já virou acampamento de férias.',
      ],
      spicy: ['{Jogador}, até os orcs já decidiram. E orcs nem sabem contar.', 'Joga logo, {jogador}, que a cerveja do castelo tá esquentando.'],
    },
  ]),
};
