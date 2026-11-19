# ♞ Xadrez 2

Xadrez 3D no navegador com frases cômicas e provocações.

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

## Estrutura

```
src/
  core/        regras e fluxo (sem 3D, sem rede)
    game.ts        ChessGame: valida lances (chess.js) e emite resultados
    events.ts      detecta captura, xeque, mate, roque, promoção, aberturas...
    openings.ts    pequena biblioteca de aberturas por sequência de lances
    transport.ts   de onde vêm os lances (LocalTransport = mesmo dispositivo)
  net/         jogo online: OnlineTransport, protocolo e canal (Supabase ou entre abas)
  phrases/     PhraseBook: escolhe a frase de maior prioridade para os eventos
  themes/      cada tema: cores, nomes, frases, peças 3D e cenário
    classico.ts    peças tradicionais (padrão)
    dinossauros/   peças de arquivo (public/models/dinossauros.glb)
    medieval/      humanos x orcs (public/models/medieval.glb)
    mario/         time do Bowser, arquivo de fã — só para uso entre amigos
  render/      Three.js: tabuleiro, peças, animações e efeitos
  ui/          HTML por cima do 3D: balão, carimbo, modais, botões
tools/         importador de modelos de impressão 3D (.3mf → .glb)
```

## Jogar online

Sem configuração, "Jogar online" funciona entre abas do mesmo navegador (modo de teste).
Para jogar pela internet:

1. Crie um projeto grátis em https://supabase.com.
2. Em **Project Settings → API**, copie a **Project URL** e a chave **anon** (ou *publishable*).
3. Copie `.env.example` para `.env.local` e cole os dois valores.
4. Em **Realtime → Settings**, deixe **"Allow public access"** ligado (canais públicos).
5. Reinicie o `npm run dev`. O aviso de "modo de teste" some da janela online.

Quem cria a sala joga de Brancas e recebe um código/link; quem entra fica com as Pretas;
um terceiro vira espectador. Recarregar a página retoma a partida; se alguém cair, ao voltar
recebe a partida inteira do outro.

**Publicar o site:** `npm run build` gera `dist/` (site estático: Cloudflare Pages, Netlify,
GitHub Pages...). As variáveis `VITE_SUPABASE_*` precisam estar configuradas no serviço
*na hora do build*. Atenção: quem tiver o link pode baixar os modelos — o tema do Bowser é
de fã, então mantenha o link só entre amigos.

## Temas a partir de arquivos de impressão 3D (.3mf)

1. Veja o que tem no arquivo (o 3MF é um zip; descompacte numa pasta antes):
   ```bash
   node tools/inspect-3mf.mjs <pasta-descompactada>
   ```
2. Em `tools/model-sets.mjs`, diga qual objeto é qual peça (e, se precisar, `scale`/`yaw`).
3. Converta (simplifica cada peça para ~5–12 mil triângulos e padroniza o tamanho):
   ```bash
   node --max-old-space-size=8192 tools/import-3mf.mjs <id> <arquivo.3mf>
   ```
4. Confira em `/tools/preview.html?set=<id>` com o `npm run dev` rodando.
5. Crie o tema em `src/themes/<id>/` com `models: { url: '/models/<id>.glb' }`
   e use `withGeneric([...])` para escrever só as frases especiais.

## Como mexer

- **Nova frase:** adicione uma linha em `lines` de uma regra do tema
  (`src/themes/classico.ts` ou `src/themes/<tema>/index.ts`).
  Frases que só aparecem no nível "Pesado" vão em `spicy`.
- **Novo tema:** copie a pasta `src/themes/dinossauros/`, troque cores, nomes, frases e
  modelos, e registre em `src/themes/index.ts`. Ele aparece sozinho em Ajustes.
- **Nova situação especial:** crie uma regra com `when` e `priority` (maior ganha).
  `when` recebe também todos os eventos do lance, então dá para fazer combos.
- **Novo tipo de evento:** declare em `src/core/types.ts` e detecte em `src/core/events.ts`.
- **Efeitos (som, textos flutuantes, confete):** `src/fx/reactions.ts`; sons em `src/fx/sfx.ts`.
- **Nova abertura:** adicione em `src/core/openings.ts`.
- **Depurar:** `game` e `view` ficam expostos no console do navegador.
