const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

/** Tela de início: título, subtítulo e botões sobre o tabuleiro desfocado. */
export class StartScreen {
  private el = $<HTMLElement>('#start');
  private continueBtn = $<HTMLButtonElement>('#start-continue');
  private playBtn = $<HTMLButtonElement>('#start-play');

  constructor(handlers: {
    /** `fresh` = começar partida nova (no mesmo dispositivo); senão, continua a atual. */
    onStart: (fresh: boolean) => void;
    onSettings: () => void;
    onOnline: () => void;
    /** Chamado ao voltar pelo botão Menu; diz se há partida em andamento e se é online. */
    onShow: () => { inProgress: boolean; online: boolean };
  }) {
    this.playBtn.addEventListener('click', () => this.hide(() => handlers.onStart(true)));
    this.continueBtn.addEventListener('click', () => this.hide(() => handlers.onStart(false)));
    $('#start-settings').addEventListener('click', handlers.onSettings);
    $('#start-online').addEventListener('click', handlers.onOnline);
    $('#btn-menu').addEventListener('click', () => {
      const s = handlers.onShow();
      this.show(s.inProgress, s.online);
    });
    document.body.classList.add('at-start');
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  /** `inProgress` mostra "Continuar partida"; `online` deixa claro que "jogar aqui" sai da sala. */
  show(inProgress: boolean, online = false): void {
    this.continueBtn.hidden = !inProgress;
    this.continueBtn.textContent = online ? 'Voltar para a sala' : 'Continuar partida';
    this.playBtn.textContent = online ? 'Sair e jogar no mesmo PC' : inProgress ? 'Nova partida' : 'Jogar';
    this.playBtn.classList.toggle('primary', !inProgress);
    this.el.classList.remove('leaving');
    this.el.hidden = false;
    document.body.classList.add('at-start');
    (inProgress ? this.continueBtn : this.playBtn).focus();
  }

  /** Some com a tela (ex.: entrou numa sala online). */
  close(): void {
    this.hide(() => {});
  }

  private hide(then: () => void): void {
    this.el.classList.add('leaving');
    document.body.classList.remove('at-start');
    then();
    window.setTimeout(() => {
      if (this.el.classList.contains('leaving')) this.el.hidden = true;
    }, 350);
  }
}
