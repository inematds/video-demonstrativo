# Armadilhas e correções — vídeo demonstrativo

Aplique ANTES de renderizar. Cobre as armadilhas gerais do HyperFrames + as específicas
de captura/cursor desta skill.

## Captura
- **Viewport inconsistente = cursor erra o alvo.** Pegue as bounding boxes e os
  screenshots no MESMO viewport. Se recapturar, recapture tudo.
- **Largura do viewport ≤ ~1280** pra a janela caber no canvas 16:9 (1920 de largura, com
  a moldura centralizada). Telas muito largas saem espremidas ou estouram — reduza o
  viewport na captura.
- **Refs do `agent-browser` mudam** após navegação/DOM novo (ex.: depois de Gerar, surge
  um link "baixar PNG" e os refs deslocam). Prefira **CSS selectors** ou `{tag,text}` em vez
  de `@eN` quando o estado muda. Re-`snapshot` após mudanças grandes.
- **Campos controlados por framework** (React/Vue) às vezes ignoram `fill`. Use
  `setValue` (define `.value` e dispara `input`+`change`) — foi o caso do campo de altura.
- **Geração demorada**: use `wait` com folga (o flux2-klein levou ~2,5 min no POC). Faça o
  poll por um `<img>` real no painel antes de tirar o screenshot do resultado.
- **`eval --json` vem aninhado**: o data URL fica em `data.result` (não em `result`).
  Decodifique base64 → arquivo se for salvar o resultado.

## Layout / inspect
- **Moldura e cursor com `data-layout-ignore`** (`#appwin`, `#cursor`, `#ripple`, glows) —
  senão o inspect mede caixas que saem do canvas e acusa overflow.
- **Screenshot dentro dos limites**: com viewport 1280×800 e janela centralizada, o print
  vai de x320..1600 e y148..948 — dentro de 1920×1080. Se mudar viewport/posição, confira
  que não passa das bordas.
- Rode `npx hyperframes inspect --samples 14` até dar **0 problemas**.

## Mecânica do HyperFrames
- Anime o `.scene-inner`, nunca o wrapper `.clip` (o framework força `opacity:1` no clip).
- Cenas em tracks 1/3, captions em 2/4 (o template já faz `i%2`).
- Após o fade-out de cada cena, `tl.set("#scene-inner-N",{opacity:0}, fimDaCena)` (incluído).
- Só UM `index.html` na raiz (sem backups com `data-composition-id`).
- Fontes locais `@font-face` (sem Google Fonts CDN).
- Render determinístico: sem `Date.now()`/`Math.random()`/`fetch` na composição. (O
  `build-demo.mjs` PODE chamar ffprobe — isso roda no build, não no render.)

## FFmpeg
- Use `ffmpeg -nostdin` sempre (no git-bash, sem isso pode sair exit 0 sem gerar arquivo).
- Extrair frame: `ffmpeg -nostdin -y -ss <t> -i in.mp4 -vframes 1 -update 1 out.png`.
