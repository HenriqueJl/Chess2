import type { Color, PieceSymbol } from '../core/types';
import type { Settings } from './settings';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

/** Tudo que é HTML por cima do 3D: balões de fala, botões, modais. */
export class Hud {
  private bubble = $<HTMLDivElement>('#bubble');
  private stamp = $<HTMLDivElement>('#stamp');
  private turn = $<HTMLDivElement>('#turn');
  private overlay = $<HTMLDivElement>('#overlay');
  private promo = $<HTMLDivElement>('#promotion');
  private settingsModal = $<HTMLDivElement>('#settings');
  private bubbleTimer = 0;
  private stampTimer = 0;

  constructor(
    private settings: Settings,
    themes: Array<{ id: string; name: string }>,
    handlers: {
      onNewGame: () => void;
      onUndo: () => void;
      onSettingsChange: (s: Settings) => void;
    },
  ) {
    const themeBox = $<HTMLFieldSetElement>('#set-theme');
    for (const t of themes) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'theme';
      input.value = t.id;
      const span = document.createElement('span');
      span.textContent = t.name;
      label.append(input, ' ', span);
      themeBox.appendChild(label);
    }

    $('#btn-new').addEventListener('click', handlers.onNewGame);
    $('#btn-again').addEventListener('click', () => {
      this.hideOverlay();
      handlers.onNewGame();
    });
    $('#btn-undo').addEventListener('click', handlers.onUndo);
    $('#btn-settings').addEventListener('click', () => this.openSettings());
    $('#set-close').addEventListener('click', () => (this.settingsModal.hidden = true));
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.settingsModal.hidden = true;
    });

    if (!('speechSynthesis' in window)) $('#set-voice').closest('label')!.hidden = true;

    // Qualquer mudança no formulário vale na hora.
    this.settingsModal.addEventListener('input', () => {
      const s = this.settings;
      s.theme = $<HTMLInputElement>('#set-theme input:checked')?.value ?? s.theme;
      s.whiteName = $<HTMLInputElement>('#set-white').value.trim() || 'Brancas';
      s.blackName = $<HTMLInputElement>('#set-black').value.trim() || 'Pretas';
      s.spicy = $<HTMLInputElement>('#set-spicy-on').checked;
      s.sound = $<HTMLInputElement>('#set-sound').checked;
      s.voice = $<HTMLInputElement>('#set-voice').checked;
      s.autoFlip = $<HTMLInputElement>('#set-flip').checked;
      s.idleTaunt = $<HTMLInputElement>('#set-idle').checked ? 30 : 0;
      if (!s.voice && 'speechSynthesis' in window) speechSynthesis.cancel();
      handlers.onSettingsChange(s);
    });
  }

  openSettings(): void {
    const s = this.settings;
    const themeInput = document.querySelector<HTMLInputElement>(`#set-theme input[value="${s.theme}"]`);
    if (themeInput) themeInput.checked = true;
    $<HTMLInputElement>('#set-white').value = s.whiteName === 'Brancas' ? '' : s.whiteName;
    $<HTMLInputElement>('#set-black').value = s.blackName === 'Pretas' ? '' : s.blackName;
    $<HTMLInputElement>(s.spicy ? '#set-spicy-on' : '#set-spicy-off').checked = true;
    $<HTMLInputElement>('#set-sound').checked = s.sound;
    $<HTMLInputElement>('#set-voice').checked = s.voice;
    $<HTMLInputElement>('#set-flip').checked = s.autoFlip;
    $<HTMLInputElement>('#set-idle').checked = s.idleTaunt > 0;
    this.settingsModal.hidden = false;
  }

  setUndoEnabled(enabled: boolean): void {
    $<HTMLButtonElement>('#btn-undo').disabled = !enabled;
  }

  setTurn(color: Color, text: string): void {
    this.turn.textContent = text;
    this.turn.dataset.color = color;
  }

  say(text: string, spicy = false): void {
    this.bubble.textContent = text;
    this.bubble.classList.toggle('spicy', spicy);
    this.bubble.classList.remove('show');
    void this.bubble.offsetWidth; // reinicia a animação CSS
    this.bubble.classList.add('show');
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = window.setTimeout(() => this.bubble.classList.remove('show'), 3200 + text.length * 35);

    if (this.settings.voice && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      u.rate = 1.05;
      speechSynthesis.speak(u);
    }
  }

  /** Carimbo grande, tipo "XEQUE!". */
  flash(text: string, color = 'var(--danger)'): void {
    this.stamp.textContent = text;
    this.stamp.style.color = color;
    this.stamp.classList.remove('show');
    void this.stamp.offsetWidth;
    this.stamp.classList.add('show');
    clearTimeout(this.stampTimer);
    this.stampTimer = window.setTimeout(() => this.stamp.classList.remove('show'), 1200);
  }

  /** Treme a tela inteira (para tragédias). */
  shakeScreen(): void {
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
  }

  showGameOver(title: string, subtitle: string): void {
    $('#overlay-title').textContent = title;
    $('#overlay-sub').textContent = subtitle;
    this.overlay.hidden = false;
  }

  hideOverlay(): void {
    this.overlay.hidden = true;
  }

  choosePromotion(color: Color, names: Record<PieceSymbol, string>, title: string): Promise<PieceSymbol | null> {
    const glyphs: Record<string, [string, string]> = {
      q: ['♕', '♛'],
      r: ['♖', '♜'],
      b: ['♗', '♝'],
      n: ['♘', '♞'],
    };
    $('#promotion-title').textContent = title;
    const list = this.promo.querySelector('.choices')!;
    list.innerHTML = '';
    this.promo.hidden = false;
    return new Promise((resolve) => {
      const done = (p: PieceSymbol | null) => {
        this.promo.hidden = true;
        resolve(p);
      };
      for (const p of ['q', 'r', 'b', 'n'] as PieceSymbol[]) {
        const btn = document.createElement('button');
        btn.textContent = glyphs[p][color === 'w' ? 0 : 1];
        const label = document.createElement('small');
        label.textContent = names[p];
        btn.appendChild(label);
        btn.addEventListener('click', () => done(p));
        list.appendChild(btn);
      }
      this.promo.querySelector<HTMLButtonElement>('.cancel')!.onclick = () => done(null);
    });
  }
}
