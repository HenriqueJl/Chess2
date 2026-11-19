export interface Settings {
  theme: string;
  whiteName: string;
  blackName: string;
  spicy: boolean;
  sound: boolean;
  voice: boolean;
  autoFlip: boolean;
  /** Segundos parado até começar a provocar (0 = nunca). */
  idleTaunt: number;
  /** Nome usado nas salas online. */
  onlineName: string;
}

const KEY = 'xadrez-2:settings';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'classico',
  whiteName: 'Brancas',
  blackName: 'Pretas',
  spicy: false,
  sound: true,
  voice: false,
  autoFlip: true,
  idleTaunt: 30,
  onlineName: '',
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // modo privado / storage bloqueado: segue sem salvar
  }
}
