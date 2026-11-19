import * as THREE from 'three';
import { withGeneric } from '../../phrases/generic';
import { is } from '../../phrases/match';
import type { Theme } from '../theme';

/*
 * Tema Dinossauros — modelos do projeto "Dino Schach" (impressão 3D),
 * convertidos com: node tools/import-3mf.mjs dinossauros <Dino+Schach.3mf>
 */

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

function decorate(group: THREE.Group, tableY: number): void {
  // vulcão lá no fundo, soltando lava
  const volcano = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 24, 1, true), std('#5b4636'));
  volcano.position.set(-3, tableY + 2.5, -11);
  group.add(volcano);
  const lava = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), std('#ff6a00', { emissive: '#ff4500', emissiveIntensity: 2 }));
  lava.rotation.x = -Math.PI / 2;
  lava.position.set(-3, tableY + 4.55, -11);
  group.add(lava);

  // pedras
  const rock = std('#7d7468');
  for (const [x, z, s] of [[6.4, -2.5, 0.7], [6.9, 1.2, 0.45], [-6.5, 3.4, 0.6], [-6.2, -4.2, 0.4]] as const) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rock);
    r.position.set(x, tableY + s * 0.6, z);
    r.rotation.set(x, z, s);
    group.add(r);
  }
  // samambaias
  const fern = std('#3f7d2b');
  for (const [x, z] of [[-6.8, -1], [6.6, 4.5], [-7.2, 5.5], [7.2, -5]] as const) {
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.4, 6), fern);
      const a = (i / 5) * Math.PI * 2;
      leaf.position.set(x + Math.cos(a) * 0.25, tableY + 0.6, z + Math.sin(a) * 0.25);
      leaf.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
      group.add(leaf);
    }
  }
  // ovo de dinossauro
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), std('#efe3c4', { roughness: 0.6 }));
  egg.scale.set(1, 1.3, 1);
  egg.position.set(6.6, tableY + 0.55, 5.6);
  group.add(egg);
}

export const dinossauros: Theme = {
  id: 'dinossauros',
  name: 'Dinossauros',
  colors: {
    background: '#1e3328',
    table: '#6b5236',
    frame: '#3e2e20',
    lightSquare: '#e9dcb4', // areia
    darkSquare: '#7a9a4a', // musgo
    whitePiece: '#efe6d2', // fóssil
    blackPiece: '#3a2e2b', // rocha vulcânica
    highlight: '#ffd34d',
    lastMove: '#ffb347',
    check: '#ff4d4d',
  },
  names: {
    withArticle: { p: 'o filhote', n: 'o raptor', b: 'o carnotauro', r: 'o T-Rex', q: 'o dilofossauro', k: 'o tricerátops' },
    short: { p: 'Filhote', n: 'Raptor', b: 'Carnotauro', r: 'T-Rex', q: 'Dilofossauro', k: 'Tricerátops' },
  },
  models: { url: '/models/dinossauros.glb', creaseAngle: 50 },
  facesCamera: ['p', 'n', 'b', 'r', 'q', 'k'],
  decorate,
  promotionTitle: 'O filhote cresceu! Vai evoluir pra quê?',
  phrases: withGeneric([
    {
      id: 'mate',
      priority: 90,
      when: is('checkmate'),
      lines: [
        'EXTINÇÃO! {Rei} de {oponente} virou fóssil.',
        'Mate! Um meteoro caiu bem em cima de {rei}.',
        'Xeque-mate. Daqui a 65 milhões de anos alguém vai achar {rei} num museu.',
        '{Jogador} venceu! O bando de {oponente} foi extinto.',
      ],
      spicy: ['{Oponente} foi extinto(a). Nem o meteoro foi tão cruel.', 'GG. {Oponente}, volta pro ovo.'],
    },
    {
      id: 'captura',
      priority: 30,
      when: is('capture'),
      lines: [
        '{Atacante} devorou {vitima}. Nem mastigou.',
        '{Vitima} virou fóssil.',
        '{Vitima} foi direto pro museu de história natural.',
        'Cadeia alimentar: {atacante} 1, {vitima} 0.',
        '{Vitima} entrou em extinção.',
        '{Atacante} jantou {vitima}. Sem talheres.',
      ],
      spicy: ['{Oponente}, seu bando está virando petisco.', 'Isso foi um lanche, {oponente}. Nem foi a refeição principal.'],
    },
    {
      id: 'cai-trex',
      priority: 37,
      when: is('capture', (e) => e.victim === 'r'),
      lines: ['O T-Rex caiu! E nem conseguiu se defender com esses bracinhos.', 'Derrubaram o T-Rex. Os bracinhos não alcançaram.'],
    },
    {
      id: 'trex-ataca',
      priority: 36,
      when: is('capture', (e) => e.attacker === 'r'),
      lines: ['O T-Rex atacou! Bracinho curto, mordida longa.', 'RAAAWR! O T-Rex engoliu {vitima} inteiro(a).'],
    },
    {
      id: 'cai-filhote',
      priority: 36,
      when: is('capture', (e) => e.victim === 'p'),
      chance: 0.5,
      lines: ['Um filhote a menos. A mamãe dino vai ficar furiosa.', 'O filhote mal tinha saído do ovo.'],
    },
    {
      id: 'raptor-ataca',
      priority: 36,
      when: is('capture', (e) => e.attacker === 'n'),
      chance: 0.7,
      lines: ['O raptor pulou do mato. Ninguém sobrevive a um raptor.', 'Inteligente, rápido e com fome: o raptor atacou {vitima}.'],
    },
    {
      id: 'cai-a-dama',
      priority: 62,
      when: is('capture', (e) => e.victim === 'q'),
      lines: ['O dilofossauro caiu! Nem deu tempo de abrir o babado.', 'Perdeu o dilofossauro. O bando está em choque.'],
      spicy: ['Sem o dilofossauro, {oponente}. Agora é só esperar o meteoro.'],
    },
    {
      id: 'xeque',
      priority: 22,
      when: is('check'),
      lines: ['Xeque! O chão está tremendo... tum... tum...', 'Xeque! {Rei} ouviu um rugido atrás das árvores.', 'Xeque! Olha o meteoro chegando!'],
    },
    {
      id: 'roque-pequeno',
      priority: 35,
      when: is('castle'),
      lines: ['Roque! {Rei} se escondeu atrás das samambaias.', 'Roque. {Rei} voltou pra caverna.'],
    },
    {
      id: 'promocao',
      priority: 60,
      when: is('promotion'),
      lines: ['O filhote cresceu e virou {peca}! A natureza é linda.', 'Evolução em tempo real: o filhote virou {peca}.'],
    },
    {
      id: 'garfo',
      priority: 72,
      when: is('fork'),
      lines: ['Garfo! Duas presas de uma vez. Banquete jurássico.', '{Atacante} está de olho em {alvos}. Alguém vai virar almoço.'],
    },
    {
      id: 'presente',
      priority: 53,
      when: is('gift'),
      lines: ['{Vitima} de graça! Comida fácil no bufê jurássico.', '{Oponente} deixou {vitima} sozinho(a) na savana. Erro de iniciante.'],
    },
    {
      id: 'primeiro-sangue',
      priority: 45,
      when: is('firstBlood'),
      lines: ['Primeira refeição do dia!', 'Começou a caçada.'],
    },
    {
      id: 'rei-passeando',
      priority: 41,
      when: is('kingWalk'),
      lines: ['{Rei} saiu do bando. No mundo dos dinos, isso é virar jantar.'],
    },
    {
      id: 'massacre',
      priority: 56,
      when: is('materialSwing', (e) => e.kind === 'massacre'),
      lines: ['{Jogador} está {vantagem} pontos na frente. O bando de {oponente} está em extinção.'],
    },
    {
      id: 'chato',
      priority: 25,
      when: is('boring'),
      lines: ['{N} lances sem ninguém comer ninguém. Viraram todos herbívoros?', 'Tá parado igual fóssil em museu.'],
    },
    {
      id: 'demorou',
      priority: 15,
      when: is('slowMove'),
      lines: ['{Segundos} segundos. As placas tectônicas se moveram mais rápido.', 'Finalmente! {Jogador} jogou antes da próxima era glacial.'],
    },
    {
      id: 'parado',
      priority: 10,
      when: is('idle'),
      lines: [
        '{Jogador}, o período Jurássico já acabou. Joga!',
        'Tá esperando o meteoro, {jogador}?',
        '{Jogador} está jogando na velocidade de um braquiossauro.',
      ],
      spicy: ['Joga logo, {jogador}, seu fóssil.', '{Jogador}, até a evolução foi mais rápida que você.'],
    },
  ]),
};
