# Pipeline detalhado — vídeo demonstrativo

## Estrutura do projeto de vídeo
```
<nome>/
  STEPS.md             # roteiro de passos (ação + narração por passo)
  actions.json         # entrada do capture.mjs (URL, viewport, passos, seletores)
  steps.json           # GERADO pelo capture.mjs (telas + bounding boxes + captions + narração)
  capture.mjs          # copiar de scripts/ desta skill
  fetch-fonts.mjs      # copiar de scripts/ desta skill (opcional — baixa as fontes)
  build-demo.mjs       # copiar de scripts/composition-template.mjs desta skill
  index.html           # GERADO — não editar à mão
  assets/
    shots/NN-id.png    # screenshots reais (1 por estado) — do capture.mjs
    txt/sN.txt         # falas (gerado pelo narration-template a partir do steps.json)
    audio/sN.wav       # narração Kokoro (1 por passo + CTA)
    fonts/*.woff2 + fonts.css   # copiar de assets/fonts/ desta skill, ou rodar fetch-fonts.mjs
```
> Tudo vive em `~/projetos/output/<nome>/` (o projeto é criado lá com `cd ~/projetos/output && npx hyperframes init <nome>`); o MP4 final sai na raiz desse projeto, sem `renders/` local.
> Fontes: a skill já traz `assets/fonts/` pronto (Sora/Inter/JetBrains Mono, subset latin).
> Copie pro projeto, ou rode `node fetch-fonts.mjs`. House style em
> [house-style.md](house-style.md). Nada aqui depende de outro projeto.

## 1. Roteiro (STEPS.md)
- 5–8 passos + CTA ≈ 35–50s. Arco: abrir o app → ação 1 → ação 2 → … → resultado → CTA.
- 1 frase curta de narração por passo. Expanda números/siglas pra fala ("512" →
  "quinhentos e doze"; "URL" → soletre; "inema.club" → "inema ponto club").
- O 1º passo costuma ser a tela inicial (`intro:true`) — apresenta o app.
- O último passo de conteúdo costuma ser o resultado (`zoom:true`) — dá um zoom suave.

## 1.5 Revisão de texto (antes de narração e captions)
Antes de gerar WAVs e de fixar `caption`/`narration` no `steps.json`. Detalhe + checklist + léxico
de inglês em [revisao-texto.md](revisao-texto.md). Resumo:
- **Duas formas por frase**: **tela** (`caption` + labels) = PT-BR acentuado + inglês na grafia original (botões/menus do app); **fala** (`txt/sN.txt`) = números/siglas expandidos **e** inglês reescrito foneticamente.
- **Acentuação**: varrer palavra a palavra (vídeo, você, é, só, código, página, conteúdo…).
- **Inglês (forma-fala)**: `upload`→"âploud", `deploy`→"deplói", `Generate`→"djenereit"… (o Kokoro fonemiza pela grafia escrita). Na dúvida, gerar WAV de teste e o usuário ouvir.

## 2. Captura (o passo que faz a diferença)
Duas formas:

**A) Automatizada — `capture.mjs` + `actions.json` (recomendado).**
Descreva URL, viewport e os passos com seletores/textos dos alvos. O script abre o app,
executa cada ação, tira o screenshot do estado e pega a **bounding box real** do alvo.
```bash
node capture.mjs actions.json     # -> assets/shots/*.png + steps.json
```
Tipos de ação (`do`): `fill` (CSS selector), `click`, `clickText` ({tag,text}),
`setValue` (dispara input/change — bom pra campos controlados por JS), `wait` (ms — pra
geração demorada). `target` = o que o cursor mira (CSS selector ou {tag,text}).

**B) Manual — dirigindo o `agent-browser` na mão.** Útil quando o app é imprevisível
(login, estados dinâmicos). O padrão é sempre o mesmo:
```bash
agent-browser set viewport 1280 800
agent-browser open http://localhost:8000/
agent-browser snapshot -i                 # descobre refs @e1, @e2...
agent-browser fill @e6 "texto"            # executa a ação
agent-browser screenshot assets/shots/01-prompt.png
# bounding box do alvo (espaço do screenshot):
agent-browser eval "(()=>{const r=document.querySelector('textarea').getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})()" --json
```
Depois monte o `steps.json` à mão com os shots, as boxes (campo `target`), `click`,
`zoom`, `caption` e `narration`. Veja o schema no cabeçalho do `composition-template.mjs`.

> **Viewport fixo é sagrado.** As bounding boxes e os screenshots têm que sair do MESMO
> viewport — senão o cursor erra o alvo. Largura ≤ ~1280 pra a janela caber no 16:9.

> **Salvar o resultado** (se o app gera arquivo): pegue o `src` da imagem (`data:` URL)
> via `eval` e grave em disco, ou clique no botão de download. (No POC do inemaimg, a
> imagem saiu como base64 e foi decodificada pra PNG.)

## 3. Narração (Kokoro, local)
`narration-template.sh` lê o `steps.json`, escreve `assets/txt/sN.txt` (passos + CTA) e
gera os WAVs (voz `pf_dora`, `--speed 0.98`). Primeira execução baixa ~340MB.

## 4. Composição
`composition-template.mjs` (copie como `build-demo.mjs`) **lê o `steps.json` e mede os
WAVs com ffprobe** — não há `AUDIO[]` manual. Ele monta moldura + screenshots + cursor +
destaque + zoom + CTA. `node build-demo.mjs` → `index.html` (16:9).

## 5. Validar e renderizar
- `npx hyperframes lint` (0 erros) · `npx hyperframes inspect --samples 14` (0 problemas).
- `--quality draft` pra conferir (extraia 1 frame por passo e mostre ao usuário); depois
  `--quality high --fps 30 --output <nome>-16x9.mp4` (na raiz do projeto, em `~/projetos/output/<nome>/`).
- Extrair frame: `ffmpeg -nostdin -y -ss <t> -i video.mp4 -vframes 1 -update 1 frame.png`.
