import { has, is } from '../phrases/match';
import type { PhraseRule } from '../phrases/phrases';
import type { Theme } from './theme';

const phrases: PhraseRule[] = [
  // ======================================================== XEQUE-MATE
  {
    id: 'mate-relampago',
    priority: 100,
    when: is('checkmate', (e) => e.moveNumber <= 6),
    lines: [
      'Mate em {lance} lances?! Isso não foi uma partida, foi um assalto.',
      'Já acabou? Nem deu tempo de pegar a pipoca.',
      'Mate relâmpago! O rei nem tinha terminado de tomar café.',
      'Mate em {lance}. {Oponente}, isso vai pro grupo da família.',
    ],
    spicy: [
      '{Oponente} levou mate em {lance} lances. Desinstala o jogo. Desinstala a vida.',
      'Mate em {lance}. {Oponente}, nem o tutorial do jogo é tão fácil assim.',
      'Mais rápido que isso só miojo. E o miojo pelo menos dá trabalho.',
    ],
  },
  {
    id: 'mate-de-peao',
    priority: 98,
    when: is('checkmate', (e) => e.matingPiece === 'p'),
    lines: ['Mate de PEÃO. Isso vai ficar no seu histórico, {oponente}.', 'O peão deu mate. O rei vai pedir pra trocar de tabuleiro.'],
    spicy: ['Tomou mate de peão. É tipo apanhar do estagiário na frente da empresa toda.'],
  },
  {
    id: 'mate-com-mais-material',
    priority: 96,
    when: is('checkmate', (e) => e.loserHadMoreMaterial),
    lines: [
      '{Oponente} tinha mais peças e perdeu. Quantidade não é qualidade.',
      'Mais material, menos cérebro. Xeque-mate.',
    ],
    spicy: ['{Oponente} estava ganhando e conseguiu perder. Isso é talento. Talento pra perder.'],
  },
  {
    id: 'mate',
    priority: 90,
    when: is('checkmate'),
    lines: [
      'XEQUE-MATE! O rei pediu demissão por e-mail.',
      'Fim de jogo. O rei foi visto chorando no banheiro.',
      'Xeque-mate! Pode guardar as peças. Ou chorar. Tanto faz.',
      'Mate! Gelado, com limão, igualzinho a esse rei.',
      'Tomou um mate. Sem açúcar.',
      '{Jogador} venceu! {Oponente} vai lavar a louça.',
      'Mate! O rei agora vai passar o resto da vida em terapia.',
      'Acabou, {oponente}. Aceita que dói menos.',
    ],
    spicy: [
      'GG EZ. {Oponente}, volta pro jogo da velha.',
      'Foi tão fácil que {jogador} jogou de olho fechado. Talvez nem isso.',
      '{Oponente}, vai treinar e volta daqui a uns 10 anos.',
      'Mate! {Oponente} jogou igual um pombo: derrubou as peças e saiu achando que ganhou.',
      'Morreu, {oponente}. Morreu feio. Morreu humilhado.',
      'Xeque-mate. {Oponente} acabou de ser printado pra sempre.',
    ],
  },

  // ======================================================== EMPATES
  {
    id: 'afogamento',
    priority: 85,
    when: is('stalemate'),
    lines: [
      'Afogamento! O rei não perdeu, mas também não sabe pra onde ir. Como todos nós.',
      'Empate por afogamento. {Jogador} tinha a vitória na mão e jogou fora.',
    ],
    spicy: ['{Jogador} afogou o rei com a vitória ganha. Isso é crime. Deveria dar cadeia.'],
  },
  {
    id: 'empate-repeticao',
    priority: 82,
    when: is('draw', (e) => e.reason === 'repetition'),
    lines: ['Empate por repetição. Vocês ficaram rodando igual carro procurando vaga.', 'Três vezes a mesma posição. Isso é xadrez ou loop infinito?'],
  },
  {
    id: 'empate-material',
    priority: 81,
    when: is('draw', (e) => e.reason === 'insufficient'),
    lines: ['Empate: não sobrou peça nem pra dar mate. Uma guerra sem soldados.', 'Material insuficiente. Igual ao meu salário.'],
  },
  {
    id: 'empate',
    priority: 80,
    when: is('draw'),
    lines: [
      'Empate. Ninguém ganhou, ninguém perdeu, todo mundo está desconfortável.',
      'Empate! Apertem as mãos e finjam que foi divertido.',
    ],
  },

  // ======================================================== COMBOS
  {
    id: 'pensou-e-pendurou',
    priority: 88,
    when: is('hanging', (_, all) => has(all, 'slowMove')),
    lines: [
      '{Segundos} segundos pensando... pra deixar {peca} pendurado(a). Parabéns.',
      'Pensou {segundos} segundos e escolheu o PIOR lance. Isso exige talento.',
    ],
    spicy: ['{Segundos} segundos de raciocínio pra fazer essa merda, {jogador}?'],
  },
  {
    id: 'xeque-duplo',
    priority: 78,
    when: is('doubleCheck'),
    lines: [
      'XEQUE DUPLO! O rei tá cercado igual celebridade no aeroporto.',
      'Xeque duplo: dois xeques pelo preço de um. Promoção imperdível.',
    ],
  },

  // ======================================================== ABERTURAS
  {
    id: 'bongcloud',
    priority: 76,
    when: is('opening', (e) => e.id === 'bongcloud'),
    lines: ['BONGCLOUD! O rei saiu pra comprar pão.', 'Bongcloud. Isso é confiança ou desespero?'],
    spicy: ['Bongcloud?! {Jogador} está desrespeitando {oponente} de forma oficial.'],
  },
  {
    id: 'mate-pastor-armado',
    priority: 76,
    when: is('opening', (e) => e.id === 'scholars-mate' || e.id === 'fools-mate'),
    lines: ['{abertura}! O golpe mais velho do livro. E funcionou.'],
  },
  {
    id: 'dama-apressada',
    priority: 70,
    when: is('opening', (e) => e.id === 'parham'),
    lines: ['A dama saiu no lance 2. Alguém está com pressa de perder ela.'],
  },
  {
    id: 'figado-frito',
    priority: 70,
    when: is('opening', (e) => e.id === 'fried-liver'),
    lines: ['Ataque Fígado Frito! Acompanha arroz, feijão e um rei desesperado.'],
  },
  {
    id: 'abertura',
    priority: 40,
    when: is('opening'),
    lines: [
      '{abertura}! Olha só, alguém leu um livro.',
      '{abertura}. Muito chique. Muito teórico. Muito suspeito.',
      'Ah, a famosa {abertura}. Seu avô ficaria orgulhoso.',
      '{abertura}! Jogando de memória ou foi sorte?',
      '{abertura}. {Jogador} assistiu UM vídeo no YouTube e já se acha.',
    ],
    spicy: ['{abertura}. Decorou a abertura, mas aposto que não sabe o que fazer no lance 10.'],
  },

  // ======================================================== GARFOS
  {
    id: 'garfo-real',
    priority: 74,
    when: is('fork', (e) => e.targets.includes('k')),
    lines: [
      'GARFO REAL! {Atacante} ataca {alvos}. Escolhe qual vai perder.',
      'Garfo com xeque! O rei vai ter que assistir {oponente} perder peça.',
      'Garfo! Talheres de prata pra servir o rei.',
    ],
    spicy: ['Garfo real. {Oponente}, isso é o que acontece quando você joga sem pensar.'],
  },
  {
    id: 'garfo',
    priority: 72,
    when: is('fork'),
    lines: [
      'Garfo! Hora do almoço. No cardápio: {alvos}.',
      'Garfou! Só faltou a faca.',
      '{Atacante} puxou o garfo. Bom apetite.',
      'Garfo duplo. {Oponente}, escolhe qual dos filhos você ama menos.',
      'Garfo! {Alvos} estão no mesmo prato.',
    ],
    spicy: ['Garfo! {Oponente} caiu igual patinho. Quack.'],
  },

  // ======================================================== PEÇA PENDURADA / PRESENTES
  {
    id: 'dama-pendurada',
    priority: 70,
    when: is('hanging', (e) => e.piece === 'q'),
    lines: [
      'A DAMA tá pendurada! Alguém avisa {jogador}?',
      '{Jogador} largou a dama ali, sozinha, sem proteção. Que tipo de pessoa faz isso?',
    ],
    spicy: ['Dama pendurada. {Jogador}, você joga com os pés?', 'Isso foi um lance ou uma doação de órgãos?'],
  },
  {
    id: 'presente-dama',
    priority: 68,
    when: is('gift', (e) => e.victim === 'q'),
    lines: [
      'DAMA DE GRAÇA! Natal chegou mais cedo pra {jogador}.',
      '{Oponente} deu a dama de presente. Nem era aniversário de ninguém.',
    ],
    spicy: ['{Oponente} entregou a dama de bandeja. Inacreditável. Lamentável. Hilário.'],
  },
  {
    id: 'pendurada',
    priority: 54,
    when: is('hanging'),
    chance: 0.85,
    lines: [
      '{Peca} tá dando sopa...',
      '{Peca} está ali, desprotegido(a), implorando pra ser capturado(a).',
      'Isso foi um lance ou uma doação?',
      'Hmm. {Jogador} tem certeza disso? Olha {peca} de novo.',
      'Alguém aí sentiu cheiro de peça grátis?',
      'Pode isso, Arnaldo?',
    ],
    spicy: [
      'Esse lance foi tão ruim que o computador pediu demissão.',
      '{Jogador}, você tá jogando ou fazendo caridade?',
      'Que lance horroroso. Dá até vergonha de narrar.',
    ],
  },
  {
    id: 'presente',
    priority: 53,
    when: is('gift'),
    lines: [
      'Obrigado pelo presente! {Vitima} veio de graça.',
      'Peça grátis! Aceitamos Pix também.',
      '{Oponente} deixou {vitima} desprotegido(a) e {jogador} agradece.',
      'Cavalo dado não se olha os dentes. Nem bispo, nem torre.',
      'Promoção relâmpago: {vitima} por zero reais.',
    ],
    spicy: ['{Oponente} deixou {vitima} de graça. Tá jogando ou dormindo?', 'Esmola demais, até o santo desconfia. Mas pegou mesmo assim.'],
  },

  // ======================================================== PROMOÇÃO
  {
    id: 'subpromocao',
    priority: 66,
    when: is('promotion', (e) => e.to !== 'q'),
    lines: [
      'Virou {peca}?! Tinha a dama de graça, mas ok, cada um com seu gosto.',
      'Subpromoção pra {peca}. Isso é genialidade ou um clique errado.',
    ],
  },
  {
    id: 'promocao',
    priority: 60,
    when: is('promotion'),
    lines: [
      'O peão estudou, se esforçou e virou dama. Mérito!',
      'De peão a dama. Isso é que é plano de carreira.',
      'Promoção! O peão agora tem sala própria e vaga no estacionamento.',
      'Black Friday no tabuleiro: leve um peão, ganhe uma dama.',
      'O peão atravessou o tabuleiro inteiro. Imigrante de sucesso.',
    ],
    spicy: ['Dama nova. {Oponente}, você deixou um PEÃO andar o tabuleiro todo. Pensa nisso.'],
  },

  // ======================================================== CAPTURAS ESPECIAIS
  {
    id: 'peao-pega-dama',
    priority: 64,
    when: is('capture', (e) => e.attacker === 'p' && e.victim === 'q'),
    lines: ['Um PEÃO derrubou a DAMA. Ela vai levar isso pra terapia.', 'A dama foi capturada por um peão. Que vergonha.'],
    spicy: ['Perdeu a dama pra um PEÃO. {Oponente}, sinceramente, tenta damas.'],
  },
  {
    id: 'cai-a-dama',
    priority: 62,
    when: is('capture', (e) => e.victim === 'q'),
    lines: [
      'A dama caiu! Silêncio no tabuleiro.',
      'Adeus, dama. Você era a melhor de nós.',
      'Perdeu a dama. Respira. Bebe uma água.',
      'Quem perde a dama dorme no sofá.',
      'Perdeu a dama. Agora vai jogar dominó.',
    ],
    spicy: [
      'Perdeu a dama, {oponente}. Pode chorar, ninguém tá olhando. Mentira, todo mundo tá.',
      'Sem dama. {Oponente}, já pode abrir o próximo jogo.',
    ],
  },
  {
    id: 'en-passant',
    priority: 58,
    when: is('capture', (e) => e.enPassant),
    lines: [
      'En passant! O peão foi atropelado por uma regra que ninguém entende.',
      'En passant. Sim, isso é permitido. Não, não adianta reclamar.',
      'En passant: francês pra "te roubei e você nem viu".',
    ],
  },
  {
    id: 'massacre',
    priority: 56,
    when: is('materialSwing', (e) => e.kind === 'massacre'),
    lines: [
      '{Jogador} está {vantagem} pontos na frente. Já dá pra desistir com dignidade.',
      'Vantagem de {vantagem}. Isso aqui virou humilhação pública.',
      'Placar: {jogador} {vantagem} x 0 autoestima de {oponente}.',
    ],
    spicy: ['{Oponente}, desiste. Sério. Pela sua saúde mental.', '{Vantagem} pontos de diferença. {Oponente} tá jogando com o tabuleiro de cabeça pra baixo?'],
  },
  {
    id: 'virada',
    priority: 55,
    when: is('materialSwing', (e) => e.kind === 'virada'),
    lines: ['VIRADA! {Jogador} saiu do buraco!', 'Olha a virada! Quem diria.', 'Virou o jogo! {Oponente} já começou a suar.'],
    spicy: ['{Oponente} conseguiu desperdiçar a vantagem. Isso é um dom.'],
  },
  {
    id: 'sequencia-capturas',
    priority: 52,
    when: is('captureSpree'),
    lines: [
      'COMBO DE {n}! Alguém tira as crianças da sala.',
      '{N} capturas seguidas. Isso não é partida, é liquidação.',
      'MULTI-KILL! {Jogador} está imparável.',
    ],
    spicy: ['{N} capturas seguidas. {Oponente}, você tá jogando ou só assistindo?'],
  },
  {
    id: 'xeque-descoberto',
    priority: 50,
    when: is('discoveredCheck'),
    lines: ['Xeque descoberto! Não viu? Ninguém viu.', 'Surpresa! Xeque por trás das cortinas.', 'Xeque descoberto. Foi uma emboscada.'],
  },
  {
    id: 'xeque-chato',
    priority: 48,
    when: is('checkSpree'),
    lines: [
      '{N}º xeque seguido. Isso é xadrez ou perseguição?',
      'Xeque de novo. {Jogador} descobriu um botão e não para de apertar.',
      'Mais um xeque. O rei já está pensando em mudar de país.',
    ],
    spicy: ['{N} xeques seguidos. Para de dar xeque e dá mate, covarde.'],
  },
  {
    id: 'troca',
    priority: 46,
    when: is('recapture', (e) => e.even),
    chance: 0.75,
    lines: ['Troca justa. Ninguém ganhou, todo mundo perdeu.', 'Bateu, levou.', 'Olho por olho, peça por peça.', 'Toma lá, dá cá.'],
  },
  {
    id: 'vinganca',
    priority: 46,
    when: is('recapture', (e) => !e.even),
    lines: ['Vingança servida fria.', 'Aqui se faz, aqui se paga.', 'Retaliação! {Jogador} não deixou barato.'],
  },
  {
    id: 'primeiro-sangue',
    priority: 45,
    when: is('firstBlood'),
    chance: 0.8,
    lines: ['Primeiro sangue! {Jogador} abriu o placar.', 'E começou a pancadaria.', 'Primeira baixa da guerra. Não será a última.'],
  },
  {
    id: 'peao-pega-graudo',
    priority: 44,
    when: is('capture', (e) => e.attacker === 'p' && (e.victim === 'r' || e.victim === 'n' || e.victim === 'b')),
    lines: ['Um peão levou {vitima}. Vergonha alheia.', 'Davi contra Golias. E o Davi era um peão.', 'Peão capturando {vitima}: a luta de classes chegou ao tabuleiro.'],
  },
  {
    id: 'rei-captura',
    priority: 42,
    when: is('capture', (e) => e.attacker === 'k'),
    lines: ['O próprio rei sujou as mãos. Respeito.', 'O rei cansou de esperar e resolveu sozinho.', 'O rei desceu do trono pra brigar. Majestade de rua.'],
  },

  // ======================================================== MANIAS
  {
    id: 'rei-passeando',
    priority: 41,
    when: is('kingWalk'),
    chance: 0.7,
    lines: [
      'O rei foi passear. Sem segurança. Sem noção.',
      'Rei andando no meio do tabuleiro é tipo turista na madrugada.',
      'O rei saiu pra dar uma volta. Esqueceu que tem gente querendo matar ele.',
    ],
    spicy: ['{Jogador} está passeando com o rei. Isso não é coragem, é burrice.'],
  },
  {
    id: 'dama-cedo',
    priority: 39,
    when: is('earlyQueen'),
    lines: ['Dama no lance {n}? Calma, não é final de campeonato.', 'A dama saiu cedo de casa. Isso nunca acaba bem.', 'Dama pra fora no início. Coisa de quem aprendeu xadrez ontem.'],
  },
  {
    id: 'indecisao',
    priority: 38,
    when: is('indecision'),
    lines: [
      'Foi e voltou. Tipo ex.',
      '{Peca} foi dar uma volta e voltou pra casa. Esqueceu a chave?',
      'Indecisão nível GPS: recalculando rota...',
      'Desfez o próprio lance. {Jogador}, qual é o plano? Existe um plano?',
    ],
    spicy: ['{Jogador} perdeu um lance inteiro de bobeira. O adversário agradece.'],
  },

  // ======================================================== TROCADILHOS POR PEÇA
  {
    id: 'cai-bispo',
    priority: 36,
    when: is('capture', (e) => e.victim === 'b'),
    chance: 0.7,
    lines: ['O bispo foi excomungado.', 'Bispo capturado. Agora só rezando.', 'O bispo foi pro céu. Literalmente. Olha ele voando.'],
  },
  {
    id: 'cai-torre',
    priority: 36,
    when: is('capture', (e) => e.victim === 'r'),
    chance: 0.7,
    lines: ['Desabou a torre! Chamem a Defesa Civil.', 'Torre derrubada. Obra sem alvará dá nisso.', 'A torre caiu. O condomínio vai subir.'],
  },
  {
    id: 'cai-cavalo',
    priority: 36,
    when: is('capture', (e) => e.victim === 'n'),
    chance: 0.7,
    lines: ['O cavalo foi pro brejo.', 'Cavalo abatido. Vai virar cola.', 'Pocotó, pocotó... pocotchau.'],
  },
  {
    id: 'cai-peao',
    priority: 36,
    when: is('capture', (e) => e.victim === 'p'),
    chance: 0.45,
    lines: [
      'Mais um peão no seguro-desemprego.',
      'Peão capturado. Demitido sem aviso prévio.',
      'Peão de obra, peão de xadrez: sempre o primeiro a se ferrar.',
      'O peão morreu. Ninguém mandou flores.',
    ],
  },
  {
    id: 'cavalo-captura',
    priority: 35,
    when: is('capture', (e) => e.attacker === 'n'),
    chance: 0.6,
    lines: ['O cavalo pulou de não sei onde e {vitima} sumiu.', 'Ninguém nunca vê o cavalo chegando.', 'Que cavalada!'],
  },
  {
    id: 'bispo-captura',
    priority: 35,
    when: is('capture', (e) => e.attacker === 'b'),
    chance: 0.6,
    lines: ['O bispo deu a extrema-unção pra {vitima}.', 'O bispo veio na diagonal, igual fofoca.', 'Que Deus te tenha, {vitima}. O bispo garante.'],
  },
  {
    id: 'torre-captura',
    priority: 35,
    when: is('capture', (e) => e.attacker === 'r'),
    chance: 0.6,
    lines: ['A torre passou de trator.', 'A torre veio reto, sem freio e sem dó.'],
  },
  {
    id: 'dama-pega-peao',
    priority: 35,
    when: is('capture', (e) => e.attacker === 'q' && e.victim === 'p'),
    lines: ['A dama gastou o turno inteiro pra pegar um peão. Prioridades.', 'A dama pegou um peão. Ninguém aplaudiu.'],
  },

  // ======================================================== ROQUE
  {
    id: 'roque-pequeno',
    priority: 35,
    when: is('castle', (e) => e.side === 'king'),
    lines: [
      'Roque! O rei foi se esconder atrás da torre. Muito corajoso.',
      'Roque. O rei entrou no bunker.',
      'Rock and roll! Ops, roque.',
      'O rei fez roque. Covardia estratégica.',
    ],
  },
  {
    id: 'roque-grande',
    priority: 35,
    when: is('castle', (e) => e.side === 'queen'),
    lines: ['Roque grande! Mudança completa, com caminhão e tudo.', 'Roque grande. O rei foi morar na outra ponta.'],
  },

  // ======================================================== CAPTURA GENÉRICA
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
      '{Vitima} foi pro banco de reservas. Pra sempre.',
      '{Jogador} comeu {vitima}. Sem tempero.',
      'Menos um. {Oponente} está ficando sozinho(a).',
    ],
    spicy: ['{Oponente}, você vai deixar isso barato?', 'Isso doeu até em mim, {oponente}.', 'Toma, {oponente}! Chora no travesseiro.'],
  },

  // ======================================================== MARASMO E TEMPO
  {
    id: 'chato',
    priority: 25,
    when: is('boring'),
    lines: [
      '{N} lances sem ninguém capturar nada. Isso é xadrez ou reunião de condomínio?',
      'Alguém ataca, pelo amor de Deus.',
      'Parece primeiro encontro: ninguém toma iniciativa.',
      'Tá tão parado que as peças estão cochilando.',
    ],
    spicy: ['{N} lances de nada. Vocês dois são covardes ou só ruins mesmo?'],
  },
  {
    id: 'xeque',
    priority: 22,
    when: is('check'),
    lines: [
      'Xeque! O rei está suando frio.',
      'Xeque! Alguém segura o rei.',
      'Xeque! Corre, majestade!',
      'Xeque! Mas será que tem fundo?',
      'Tá pagando com xeque? Aceitamos, mas cobra juros.',
      'Xeque-especial: juros altíssimos pro rei de {oponente}.',
    ],
  },
  {
    id: 'demorou',
    priority: 15,
    when: is('slowMove'),
    lines: [
      '{Segundos} segundos pensando. Espero que tenha valido a pena.',
      'Pensou tanto que saiu fumaça da orelha.',
      'Finalmente! {Jogador} jogou depois de {segundos} segundos.',
    ],
    spicy: ['{Segundos} segundos. A gente envelheceu esperando, {jogador}.'],
  },
  {
    id: 'parado',
    priority: 10,
    when: is('idle'),
    lines: [
      '{Jogador}, é a sua vez. Faz alguma coisa, nem que seja errada.',
      'Tá esperando o quê? O tabuleiro esfriar?',
      'Alô? {Jogador}? Ainda tá vivo(a)?',
      'As peças estão com sono, {jogador}.',
      '{Segundos} segundos... até a tartaruga já teria jogado.',
      'Pensando muito ou só travou mesmo?',
    ],
    spicy: [
      'Joga logo, porra.',
      '{Jogador}, se for pra pensar tanto, pelo menos acerta.',
      'Demora mais que fila de banco em dia de pagamento.',
      '{Oponente} já foi fazer café, voltou e você ainda não jogou.',
    ],
  },
];

export const classico: Theme = {
  id: 'classico',
  name: 'Clássico',
  colors: {
    background: '#2a2340',
    table: '#3b2f4f',
    frame: '#5b3a29',
    lightSquare: '#f0dcb4',
    darkSquare: '#a86f4c',
    whitePiece: '#f6efe2',
    blackPiece: '#2f2b3a',
    highlight: '#ffd34d',
    lastMove: '#9be15d',
    check: '#ff4d4d',
  },
  names: {
    withArticle: { p: 'o peão', n: 'o cavalo', b: 'o bispo', r: 'a torre', q: 'a dama', k: 'o rei' },
    short: { p: 'Peão', n: 'Cavalo', b: 'Bispo', r: 'Torre', q: 'Dama', k: 'Rei' },
  },
  phrases,
};
