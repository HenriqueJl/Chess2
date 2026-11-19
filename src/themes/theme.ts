import type * as THREE from 'three';
import type { PieceSymbol } from '../core/types';
import type { PieceNames, PhraseRule } from '../phrases/phrases';
import type { ModelSource } from '../render/modelPieces';
import type { PieceBuilder } from '../render/pieces';

/**
 * Um tema define a cara e a "voz" do jogo: cores, peças 3D, decoração e frases.
 * Para criar um tema novo, use `dinossauros/` como modelo e registre em `themes/index.ts`.
 * Peças podem vir de arquivo (`models`) ou ser montadas por código (`pieces`).
 */
export interface Theme {
  id: string;
  name: string;
  colors: {
    background: string;
    table: string;
    frame: string;
    lightSquare: string;
    darkSquare: string;
    /** Cor principal de cada time (no clássico, a peça inteira; nos outros, roupa/corpo). */
    whitePiece: string;
    blackPiece: string;
    highlight: string;
    lastMove: string;
    check: string;
  };
  names: PieceNames;
  phrases: PhraseRule[];
  /** Modelos 3D das peças feitos por código. Sem isso (e sem `models`), usa as clássicas. */
  pieces?: PieceBuilder;
  /** Modelos 3D vindos de arquivo (.glb gerado por tools/import-3mf.mjs). */
  models?: ModelSource;
  /** Peças que viram o rosto para a câmera (bonequinhos). As demais encaram o adversário. */
  facesCamera?: PieceSymbol[];
  /** Objetos de cenário em volta do tabuleiro (a mesa fica em `tableY`). */
  decorate?: (group: THREE.Group, tableY: number) => void;
  /** Texto do modal de promoção. */
  promotionTitle?: string;
}
