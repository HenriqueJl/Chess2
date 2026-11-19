import type { OnlineStatus } from '../net/online';
import { normalizeRoomCode } from '../net/protocol';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

/** Janela "Jogar online" (criar/entrar/sair) e a bolinha de status no topo. */
export class OnlinePanel {
  private modal = $<HTMLDivElement>('#online');
  private nameInput = $<HTMLInputElement>('#online-name');
  private codeInput = $<HTMLInputElement>('#online-code');
  private error = $<HTMLParagraphElement>('#online-error');
  private pill = $<HTMLButtonElement>('#net-status');
  private room: string | null = null;

  constructor(
    testMode: boolean,
    handlers: {
      onCreate: (name: string) => Promise<void>;
      onJoin: (code: string, name: string) => Promise<void>;
      onLeave: () => void;
    },
  ) {
    $('#online-mode').hidden = !testMode;
    const busy = (on: boolean) => {
      $<HTMLButtonElement>('#online-create').disabled = on;
      $<HTMLButtonElement>('#online-join').disabled = on;
    };
    const run = async (fn: () => Promise<void>) => {
      this.showError(null);
      busy(true);
      try {
        await fn();
      } catch (err) {
        this.showError(err instanceof Error ? err.message : String(err));
      } finally {
        busy(false);
      }
    };

    $('#online-create').addEventListener('click', () => void run(() => handlers.onCreate(this.name())));
    const join = () => {
      const code = normalizeRoomCode(this.codeInput.value);
      if (code.length < 4) return this.showError('Digite o código da sala (são 5 letras/números).');
      void run(() => handlers.onJoin(code, this.name()));
    };
    $('#online-join').addEventListener('click', join);
    this.codeInput.addEventListener('keydown', (e) => e.key === 'Enter' && join());
    this.codeInput.addEventListener('input', () => (this.codeInput.value = normalizeRoomCode(this.codeInput.value)));
    $('#online-leave').addEventListener('click', handlers.onLeave);
    $('#online-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => e.target === this.modal && this.close());
    this.pill.addEventListener('click', () => this.open());
    $('#online-copy').addEventListener('click', () => void this.copyLink());
  }

  open(prefillCode?: string): void {
    if (prefillCode) this.codeInput.value = prefillCode;
    this.modal.hidden = false;
    (this.nameInput.value ? (this.room ? $('#online-copy') : this.codeInput.value ? $('#online-join') : $('#online-create')) : this.nameInput).focus();
  }

  close(): void {
    this.modal.hidden = true;
  }

  setName(name: string): void {
    this.nameInput.value = name;
  }

  name(): string {
    return this.nameInput.value.trim() || 'Anônimo';
  }

  showError(message: string | null): void {
    this.error.textContent = message ?? '';
    this.error.hidden = !message;
  }

  /** Mostra a sala atual (ou a escolha criar/entrar quando `status` é null). */
  update(status: OnlineStatus | null): void {
    this.room = status?.room ?? null;
    $('#online-lobby').hidden = !!status;
    $('#online-room').hidden = !status;
    this.nameInput.disabled = !!status;
    this.pill.hidden = !status;
    if (!status) return;

    $('#online-room-code').textContent = status.room;
    let text: string;
    let state: 'online' | 'offline' | 'waiting';
    if (!status.connected) {
      text = 'Sem conexão… tentando de novo';
      state = 'offline';
    } else if (status.spectator) {
      text = 'Sala cheia: você está assistindo';
      state = 'online';
    } else if (!status.peerName) {
      text = 'Esperando o adversário entrar…';
      state = 'waiting';
    } else if (status.peerOnline) {
      text = `${status.peerName} está conectado(a)`;
      state = 'online';
    } else {
      text = `${status.peerName} caiu da sala`;
      state = 'offline';
    }
    const side = status.myColor === 'w' ? ' · você joga de Brancas' : status.myColor === 'b' ? ' · você joga de Pretas' : '';
    $('#online-room-status').textContent = text + side;
    this.pill.textContent = `${status.room} · ${status.peerName && status.peerOnline ? status.peerName : text}`;
    this.pill.dataset.state = state;
  }

  inviteLink(): string {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('sala', this.room ?? '');
    return url.toString();
  }

  private async copyLink(): Promise<void> {
    const link = this.inviteLink();
    const btn = $<HTMLButtonElement>('#online-copy');
    try {
      await navigator.clipboard.writeText(link);
      btn.textContent = 'Link copiado!';
    } catch {
      window.prompt('Copie o link do convite:', link);
    }
    window.setTimeout(() => (btn.textContent = 'Copiar link do convite'), 1800);
  }
}
