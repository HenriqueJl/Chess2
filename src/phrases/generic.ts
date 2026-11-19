import { has, is } from './match';
import type { PhraseRule } from './phrases';

/*
 * Frases que servem para QUALQUER tema: não citam peça nenhuma pelo nome,
 * só pelos placeholders ({rei}, {dama}, {atacante}, {vitima}, {peca}...),
 * que o tema preenche com os nomes dele ("o Bowser", "o tricerátops"...).
 *
 * Um tema novo pode usar `withGeneric([...])`: escreve só as frases especiais
 * dele, e o resto vem daqui. Regras com o mesmo `id` no tema substituem as daqui.
 */
export const GENERIC_PHRASES: PhraseRule[] = [
  // ---------------------------------------------------------------- mate
  {
    id: 'mate-relampago',
    priority: 100,
    when: is('checkmate', (e) => e.moveNumber <= 6),
    lines: [
      'Mate em {lance} lances?! Isso não foi uma partida, foi um assalto.',
      'Já acabou? Nem deu tempo de pegar a pipoca.',
      'Mate em {lance}. {Oponente}, isso vai pro grupo da família.',
    ],
    spicy: ['Mate em {lance}. {Oponente}, desinstala o jogo. Desinstala a vida.', 'Mais rápido que miojo. E o miojo ainda dá trabalho.'],
  },
  {
    id: 'mate-com-mais-material',
    priority: 96,
    when: is('checkmate', (e) => e.loserHadMoreMaterial),
    lines: ['{Oponente} tinha mais peças e perdeu. Quantidade não é qualidade.', 'Mais material, menos cérebro. Xeque-mate.'],
    spicy: ['{Oponente} estava ganhando e conseguiu perder. Isso é talento. Talento pra perder.'],
  },
  {
    id: 'mate',
    priority: 90,
    when: is('checkmate'),
    lines: [
      'XEQUE-MATE! {Rei} foi derrotado(a) e vai pensar na vida.',
      'Mate! {Jogador} venceu. {Oponente} vai lavar a louça.',
      'Fim de jogo. {Rei} foi visto(a) chorando no banheiro.',
      'Xeque-mate! Pode guardar as peças. Ou chorar. Tanto faz.',
      'Acabou, {oponente}. Aceita que dói menos.',
      '{Atacante} deu o golpe final. Mate!',
    ],
    spicy: [
      'GG EZ. {Oponente}, volta pro jogo da velha.',
      '{Oponente}, vai treinar e volta daqui a uns 10 anos.',
      'Morreu, {oponente}. Morreu feio. Morreu humilhado(a).',
      'Xeque-mate. {Oponente} acabou de ser printado(a) pra sempre.',
    ],
  },
  // ---------------------------------------------------------------- empates
  {
    id: 'afogamento',
    priority: 85,
    when: is('stalemate'),
    lines: ['Afogamento! {Rei} não perdeu, mas também não tem pra onde ir.', 'Empate por afogamento. {Jogador} tinha a vitória na mão e jogou fora.'],
    spicy: ['{Jogador} afogou o adversário com a vitória ganha. Isso deveria dar cadeia.'],
  },
  {
    id: 'empate-repeticao',
    priority: 82,
    when: is('draw', (e) => e.reason === 'repetition'),
    lines: ['Empate por repetição. Vocês ficaram rodando igual carro procurando vaga.'],
  },
  {
    id: 'empate',
    priority: 80,
    when: is('draw'),
    lines: ['Empate. Ninguém ganhou, ninguém perdeu, todo mundo está desconfortável.', 'Empate! Apertem as mãos e finjam que foi divertido.'],
  },
  // ---------------------------------------------------------------- combos e lances especiais
  {
    id: 'pensou-e-pendurou',
    priority: 88,
    when: is('hanging', (_, all) => has(all, 'slowMove')),
    lines: ['{Segundos} segundos pensando... pra deixar {peca} pendurado(a). Parabéns.', 'Pensou {segundos} segundos e escolheu o PIOR lance. Isso exige talento.'],
    spicy: ['{Segundos} segundos de raciocínio pra fazer essa merda, {jogador}?'],
  },
  {
    id: 'xeque-duplo',
    priority: 78,
    when: is('doubleCheck'),
    lines: ['XEQUE DUPLO! {Rei} não sabe nem pra que lado correr.', 'Xeque duplo: dois xeques pelo preço de um.'],
  },
  {
    id: 'bongcloud',
    priority: 76,
    when: is('opening', (e) => e.id === 'bongcloud'),
    lines: ['BONGCLOUD! {Rei} saiu pra comprar pão.', 'Bongcloud. Isso é confiança ou desespero?'],
  },
  {
    id: 'mate-pastor-armado',
    priority: 76,
    when: is('opening', (e) => e.id === 'scholars-mate' || e.id === 'fools-mate'),
    lines: ['{abertura}! O golpe mais velho do livro. E funcionou.'],
  },
  {
    id: 'abertura',
    priority: 40,
    when: is('opening'),
    lines: [
      '{abertura}! Olha só, alguém leu um livro.',
      '{abertura}. Muito chique. Muito teórico. Muito suspeito.',
      '{abertura}! Jogando de memória ou foi sorte?',
    ],
  },
  {
    id: 'garfo-real',
    priority: 74,
    when: is('fork', (e) => e.targets.includes('k')),
    lines: ['GARFO REAL! {Atacante} ataca {alvos}. Escolhe qual vai perder.', 'Garfo com xeque! {Oponente} vai perder peça, é só escolher qual.'],
  },
  {
    id: 'garfo',
    priority: 72,
    when: is('fork'),
    lines: ['Garfo! Hora do almoço. No cardápio: {alvos}.', 'Garfou! Só faltou a faca.', '{Atacante} puxou o garfo. Bom apetite.', 'Garfo! {Oponente}, escolhe qual dos dois você ama menos.'],
    spicy: ['Garfo! {Oponente} caiu igual patinho. Quack.'],
  },
  {
    id: 'dama-pendurada',
    priority: 70,
    when: is('hanging', (e) => e.piece === 'q'),
    lines: ['{Dama} está pendurado(a)! Alguém avisa {jogador}?', '{Jogador} largou {dama} ali, sozinho(a), sem proteção.'],
    spicy: ['{Dama} pendurado(a). {Jogador}, você joga com os pés?'],
  },
  {
    id: 'presente-dama',
    priority: 68,
    when: is('gift', (e) => e.victim === 'q'),
    lines: ['{Vitima} DE GRAÇA! Natal chegou mais cedo pra {jogador}.', '{Oponente} deu {vitima} de presente. Nem era aniversário de ninguém.'],
    spicy: ['{Oponente} entregou {vitima} de bandeja. Inacreditável. Lamentável. Hilário.'],
  },
  {
    id: 'subpromocao',
    priority: 66,
    when: is('promotion', (e) => e.to !== 'q'),
    lines: ['Virou {peca}?! Tinha a opção mais forte de graça, mas ok.', 'Subpromoção pra {peca}. Isso é genialidade ou um clique errado.'],
  },
  {
    id: 'cai-a-dama',
    priority: 62,
    when: is('capture', (e) => e.victim === 'q'),
    lines: ['{Vitima} caiu! Silêncio no tabuleiro.', 'Adeus, {vitima}. Você era a melhor de nós.', 'Perdeu {vitima}. Respira. Bebe uma água.'],
    spicy: ['Perdeu {vitima}, {oponente}. Pode chorar, ninguém tá olhando. Mentira, todo mundo tá.'],
  },
  {
    id: 'promocao',
    priority: 60,
    when: is('promotion'),
    lines: ['Promoção! O pequeno atravessou o tabuleiro inteiro e virou {peca}.', 'Isso é que é plano de carreira: agora é {peca}.'],
    spicy: ['{Oponente}, você deixou ele atravessar o tabuleiro TODO. Pensa nisso.'],
  },
  {
    id: 'en-passant',
    priority: 58,
    when: is('capture', (e) => e.enPassant),
    lines: ['En passant! Atropelado por uma regra que ninguém entende.', 'En passant. Sim, isso é permitido. Não, não adianta reclamar.'],
  },
  {
    id: 'massacre',
    priority: 56,
    when: is('materialSwing', (e) => e.kind === 'massacre'),
    lines: ['{Jogador} está {vantagem} pontos na frente. Já dá pra desistir com dignidade.', 'Vantagem de {vantagem}. Isso aqui virou humilhação pública.'],
    spicy: ['{Oponente}, desiste. Sério. Pela sua saúde mental.'],
  },
  {
    id: 'virada',
    priority: 55,
    when: is('materialSwing', (e) => e.kind === 'virada'),
    lines: ['VIRADA! {Jogador} saiu do buraco!', 'Olha a virada! {Oponente} já começou a suar.'],
    spicy: ['{Oponente} conseguiu desperdiçar a vantagem. Isso é um dom.'],
  },
  {
    id: 'pendurada',
    priority: 54,
    when: is('hanging'),
    chance: 0.85,
    lines: ['{Peca} está dando sopa...', 'Isso foi um lance ou uma doação?', 'Hmm. {Jogador} tem certeza disso? Olha {peca} de novo.', 'Pode isso, Arnaldo?'],
    spicy: ['Esse lance foi tão ruim que o computador pediu demissão.', '{Jogador}, você tá jogando ou fazendo caridade?'],
  },
  {
    id: 'presente',
    priority: 53,
    when: is('gift'),
    lines: ['Obrigado pelo presente! {Vitima} veio de graça.', 'Peça grátis! Aceitamos Pix também.', '{Oponente} deixou {vitima} desprotegido(a) e {jogador} agradece.'],
    spicy: ['{Oponente} deixou {vitima} de graça. Tá jogando ou dormindo?'],
  },
  {
    id: 'sequencia-capturas',
    priority: 52,
    when: is('captureSpree'),
    lines: ['COMBO DE {n}! Alguém tira as crianças da sala.', 'MULTI-KILL! {Jogador} está imparável.'],
    spicy: ['{N} capturas seguidas. {Oponente}, você tá jogando ou só assistindo?'],
  },
  {
    id: 'xeque-descoberto',
    priority: 50,
    when: is('discoveredCheck'),
    lines: ['Xeque descoberto! Não viu? Ninguém viu.', 'Surpresa! Xeque por trás das cortinas.'],
  },
  {
    id: 'xeque-chato',
    priority: 48,
    when: is('checkSpree'),
    lines: ['{N}º xeque seguido. Isso é xadrez ou perseguição?', 'Mais um xeque. {Rei} já está pensando em mudar de país.'],
    spicy: ['{N} xeques seguidos. Para de dar xeque e dá mate, covarde.'],
  },
  {
    id: 'troca',
    priority: 46,
    when: is('recapture', (e) => e.even),
    chance: 0.75,
    lines: ['Troca justa. Ninguém ganhou, todo mundo perdeu.', 'Bateu, levou.', 'Olho por olho, peça por peça.'],
  },
  {
    id: 'vinganca',
    priority: 46,
    when: is('recapture', (e) => !e.even),
    lines: ['Vingança servida fria.', 'Aqui se faz, aqui se paga.'],
  },
  {
    id: 'primeiro-sangue',
    priority: 45,
    when: is('firstBlood'),
    chance: 0.8,
    lines: ['Primeiro sangue! {Jogador} abriu o placar.', 'E começou a pancadaria.'],
  },
  {
    id: 'rei-captura',
    priority: 42,
    when: is('capture', (e) => e.attacker === 'k'),
    lines: ['{Atacante} sujou as mãos pessoalmente. Respeito.', '{Atacante} cansou de esperar e resolveu sozinho.'],
  },
  {
    id: 'rei-passeando',
    priority: 41,
    when: is('kingWalk'),
    chance: 0.7,
    lines: ['{Rei} foi passear. Sem segurança. Sem noção.', '{Rei} saiu pra dar uma volta. Esqueceu que tem gente querendo pegar ele.'],
  },
  {
    id: 'dama-cedo',
    priority: 39,
    when: is('earlyQueen'),
    lines: ['{Dama} já no lance {n}? Calma, não é final de campeonato.', '{Dama} saiu cedo de casa. Isso nunca acaba bem.'],
  },
  {
    id: 'indecisao',
    priority: 38,
    when: is('indecision'),
    lines: ['Foi e voltou. Tipo ex.', '{Peca} foi dar uma volta e voltou pra casa. Esqueceu a chave?', 'Indecisão nível GPS: recalculando rota...'],
  },
  {
    id: 'roque-pequeno',
    priority: 35,
    when: is('castle', (e) => e.side === 'king'),
    lines: ['Roque! {Rei} foi se esconder. Muito corajoso.', 'Roque. {Rei} entrou no bunker.'],
  },
  {
    id: 'roque-grande',
    priority: 35,
    when: is('castle', (e) => e.side === 'queen'),
    lines: ['Roque grande! {Rei} mudou de casa, com caminhão e tudo.'],
  },
  {
    id: 'captura',
    priority: 30,
    when: is('capture'),
    lines: [
      '{Atacante} passou por cima de {vitima}. Literalmente.',
      'Tchau, {vitima}! Ninguém vai sentir sua falta.',
      '{Atacante} mandou {vitima} pro chuveiro mais cedo.',
      '{Vitima} saiu voando. Física? Nunca ouvi falar.',
      'E lá se vai {vitima}, sem passagem de volta.',
    ],
    spicy: ['{Oponente}, você vai deixar isso barato?', 'Toma, {oponente}! Chora no travesseiro.'],
  },
  {
    id: 'chato',
    priority: 25,
    when: is('boring'),
    lines: ['{N} lances sem ninguém capturar nada. Isso é xadrez ou reunião de condomínio?', 'Alguém ataca, pelo amor de Deus.'],
    spicy: ['{N} lances de nada. Vocês são covardes ou só ruins mesmo?'],
  },
  {
    id: 'xeque',
    priority: 22,
    when: is('check'),
    lines: ['Xeque! {Rei} está suando frio.', 'Xeque! Alguém segura {rei}.', 'Xeque! Mas será que tem fundo?'],
  },
  {
    id: 'demorou',
    priority: 15,
    when: is('slowMove'),
    lines: ['{Segundos} segundos pensando. Espero que tenha valido a pena.', 'Finalmente! {Jogador} jogou depois de {segundos} segundos.'],
  },
  {
    id: 'parado',
    priority: 10,
    when: is('idle'),
    lines: [
      '{Jogador}, é a sua vez. Faz alguma coisa, nem que seja errada.',
      'Tá esperando o quê? O tabuleiro esfriar?',
      'Alô? {Jogador}? Ainda tá vivo(a)?',
      '{Segundos} segundos... até a tartaruga já teria jogado.',
    ],
    spicy: ['Joga logo, porra.', '{Jogador}, se for pra pensar tanto, pelo menos acerta.'],
  },
];

/** Junta as frases especiais de um tema com as genéricas (mesmo `id` = o tema substitui). */
export function withGeneric(themeRules: PhraseRule[]): PhraseRule[] {
  const ids = new Set(themeRules.map((r) => r.id));
  return [...themeRules, ...GENERIC_PHRASES.filter((r) => !ids.has(r.id))];
}
