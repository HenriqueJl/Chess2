// Quais objetos de cada projeto .3mf viram quais peças.
// Os números são os ids que `node tools/inspect-3mf.mjs <pasta>` mostra.
//
// `pieces.both` = mesmo modelo para os dois times (o jogo pinta com a cor de cada time).
// `pieces.w` / `pieces.b` = modelos diferentes por time.
// `yaw` (graus) gira a peça para que a "frente" aponte para +Z.
// `scale` multiplica o tamanho só daquela peça.
// Para conferir o resultado: npm run dev e abra /tools/preview.html?set=<id>.

export const MODEL_SETS = {
  dinossauros: {
    pieces: {
      both: {
        p: { object: '352' },
        n: { object: '10' },
        b: { object: '12' },
        r: { object: '8' },
        q: { object: '354' },
        k: { object: '358' },
      },
    },
  },

  medieval: {
    pieces: {
      // humanos
      w: {
        p: { object: '33' }, // soldado com escudo
        n: { object: '10' },
        b: { object: '23' },
        r: { object: '52' },
        q: { object: '30' },
        k: { object: '5' },
      },
      // orcs
      b: {
        p: { object: '13' }, // orc com machado
        n: { object: '44' }, // o javali
        b: { object: '50' },
        r: { object: '59' },
        q: { object: '57' },
        k: { object: '7' },
      },
    },
  },

  mario: {
    // Só veio o time "do mal"; ele é usado pelos dois lados até chegar o outro arquivo.
    // `scale` corrige peças impressas em tamanhos diferentes (o Bowser veio pequeno).
    pieces: {
      both: {
        p: { object: '12', scale: 0.78 }, // Goomba
        n: { object: '6' }, // Koopa
        b: { object: '10', scale: 1.1 }, // Magikoopa
        r: { object: '8', scale: 0.95 }, // Boo no pedestal
        q: { object: '4', scale: 0.9 }, // a dama de vestido
        k: { object: '2', scale: 1.5 }, // Bowser
      },
    },
  },
};

/** Orçamento de triângulos por peça depois da simplificação. */
export const TRIANGLE_BUDGET = { p: 5000, n: 9000, b: 9000, r: 9000, q: 11000, k: 12000 };

/** Tamanho final no jogo (1 = uma casa). */
export const TARGET = { maxBaseWidth: 0.74, maxHeight: 1.35 };
