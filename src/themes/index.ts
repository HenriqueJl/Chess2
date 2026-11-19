import { classico } from './classico';
import { dinossauros } from './dinossauros';
import { mario } from './mario';
import { medieval } from './medieval';
import type { Theme } from './theme';

export const THEMES: Theme[] = [classico, dinossauros, medieval, mario];
export const DEFAULT_THEME = classico;

/** Tema salvo que não existe mais (ex.: removido) cai no padrão. */
export const themeById = (id: string): Theme => THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
