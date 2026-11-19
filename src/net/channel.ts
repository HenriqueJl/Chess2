import type { NetMessage } from './protocol';

/** Um "rádio" da sala: manda mensagens para todo mundo nela e escuta as dos outros. */
export interface RoomChannel {
  readonly kind: 'supabase' | 'local';
  send(msg: NetMessage): void;
  onMessage(fn: (msg: NetMessage) => void): void;
  /** Chamado quando a conexão cai ou volta. */
  onConnection(fn: (connected: boolean) => void): void;
  close(): void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Com as chaves do Supabase configuradas, joga pela internet; sem elas, só entre abas. */
export const onlineMode: RoomChannel['kind'] = SUPABASE_URL && SUPABASE_KEY ? 'supabase' : 'local';

export async function openChannel(room: string): Promise<RoomChannel> {
  return onlineMode === 'supabase' ? openSupabase(room) : openLocal(room);
}

// ------------------------------------------------------------------ Supabase

async function openSupabase(room: string): Promise<RoomChannel> {
  // Carregado só quando alguém entra numa sala (não pesa no jogo local).
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { persistSession: false } });
  const channel = client.channel(`xadrez2-sala-${room}`, { config: { broadcast: { self: false } } });

  const listeners: Array<(m: NetMessage) => void> = [];
  const connListeners: Array<(c: boolean) => void> = [];
  const queue: NetMessage[] = [];
  let subscribed = false;

  channel.on('broadcast', { event: 'msg' }, ({ payload }) => listeners.forEach((fn) => fn(payload as NetMessage)));

  const flush = () => {
    while (queue.length) void channel.send({ type: 'broadcast', event: 'msg', payload: queue.shift() });
  };

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    channel.subscribe((status, err) => {
      const ok = status === 'SUBSCRIBED';
      subscribed = ok;
      connListeners.forEach((fn) => fn(ok));
      if (ok) flush();
      if (!settled) {
        settled = true;
        if (ok) resolve();
        else reject(err ?? new Error(`Não consegui entrar na sala (${status}).`));
      }
    });
  });

  return {
    kind: 'supabase',
    send(msg) {
      // Se a conexão caiu, guarda e manda quando voltar.
      if (!subscribed) queue.push(msg);
      else void channel.send({ type: 'broadcast', event: 'msg', payload: msg });
    },
    onMessage: (fn) => void listeners.push(fn),
    onConnection: (fn) => void connListeners.push(fn),
    close() {
      void client.removeChannel(channel);
    },
  };
}

// ------------------------------------------------------- local (entre abas)

function openLocal(room: string): Promise<RoomChannel> {
  const bc = new BroadcastChannel(`xadrez2-sala-${room}`);
  const listeners: Array<(m: NetMessage) => void> = [];
  bc.onmessage = (e) => listeners.forEach((fn) => fn(e.data as NetMessage));
  return Promise.resolve({
    kind: 'local',
    send: (msg) => bc.postMessage(msg),
    onMessage: (fn) => void listeners.push(fn),
    onConnection: (fn) => fn(true),
    close: () => bc.close(),
  });
}
