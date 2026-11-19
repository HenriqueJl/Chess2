/**
 * Uma pequena "biblioteca" de aberturas famosas, por sequência exata de lances (SAN).
 * Mais tarde dá para trocar por uma base completa (ex.: a do Lichess, que é livre).
 */
export interface Opening {
  id: string;
  name: string;
  moves: string[];
}

const RAW: Array<[id: string, name: string, moves: string]> = [
  ['english', 'Abertura Inglesa', 'c4'],
  ['reti', 'Abertura Réti', 'Nf3'],
  ['grob', 'Ataque Grob', 'g4'],
  ['sicilian', 'Defesa Siciliana', 'e4 c5'],
  ['french', 'Defesa Francesa', 'e4 e6'],
  ['caro-kann', 'Defesa Caro-Kann', 'e4 c6'],
  ['scandinavian', 'Defesa Escandinava', 'e4 d5'],
  ['pirc', 'Defesa Pirc', 'e4 d6'],
  ['dutch', 'Defesa Holandesa', 'd4 f5'],
  ['kings-gambit', 'Gambito do Rei', 'e4 e5 f4'],
  ['bongcloud', 'Bongcloud', 'e4 e5 Ke2'],
  ['parham', 'Ataque Parham (a dama apressada)', 'e4 e5 Qh5'],
  ['petrov', 'Defesa Petrov', 'e4 e5 Nf3 Nf6'],
  ['philidor', 'Defesa Philidor', 'e4 e5 Nf3 d6'],
  ['scotch', 'Abertura Escocesa', 'e4 e5 Nf3 Nc6 d4'],
  ['italian', 'Abertura Italiana', 'e4 e5 Nf3 Nc6 Bc4'],
  ['ruy-lopez', 'Abertura Espanhola (Ruy López)', 'e4 e5 Nf3 Nc6 Bb5'],
  ['evans', 'Gambito Evans', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4'],
  ['fried-liver', 'Ataque Fígado Frito', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7'],
  ['london', 'Sistema Londres', 'd4 d5 Bf4'],
  ['queens-gambit', 'Gambito da Dama', 'd4 d5 c4'],
  ['qga', 'Gambito da Dama Aceito', 'd4 d5 c4 dxc4'],
  ['qgd', 'Gambito da Dama Recusado', 'd4 d5 c4 e6'],
  ['slav', 'Defesa Eslava', 'd4 d5 c4 c6'],
  ['kings-indian', 'Defesa Índia do Rei', 'd4 Nf6 c4 g6 Nc3 Bg7'],
  ['nimzo', 'Defesa Nimzo-Índia', 'd4 Nf6 c4 e6 Nc3 Bb4'],
  ['scholars-mate', 'Mate Pastor', 'e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7'],
  ['fools-mate', 'Mate do Louco', 'f3 e5 g4 Qh4'],
];

export const OPENINGS: Opening[] = RAW.map(([id, name, moves]) => ({ id, name, moves: moves.split(' ') }));

const clean = (san: string) => san.replace(/[+#!?]/g, '');

/** Retorna a abertura cuja sequência é exatamente o histórico atual. */
export function matchOpening(history: string[]): Opening | null {
  const h = history.map(clean);
  return (
    OPENINGS.find((o) => o.moves.length === h.length && o.moves.every((m, i) => m === h[i])) ?? null
  );
}
