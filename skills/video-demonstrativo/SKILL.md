---
name: video-demonstrativo
version: 1.1.0
description: Cria vídeos de DEMONSTRAÇÃO (walkthrough/tutorial) de uma aplicação web em PT-BR, a partir do link do app — navega o app de verdade com um navegador automatizado, captura as telas reais passo a passo, e monta um vídeo narrado com moldura de navegador, cursor animado que clica exatamente nos controles, destaque/zoom e CTA do INEMA.CLUB (16:9 via HyperFrames). Use SEMPRE que o usuário pedir "vídeo de demonstração", "vídeo demonstrativo", "demo do app/sistema", "walkthrough", "tutorial em vídeo de uma ferramenta", "mostrar passo a passo usando o app", "gravar a tela do sistema", "vídeo mostrando como usar X", ou der um link/localhost de uma aplicação e quiser um vídeo mostrando o uso. Diferente da skill video-explicativo (que explica um conceito com motion graphics): esta MOSTRA um app real sendo usado. Cobre captura, narração TTS local, animação de cursor/zoom, render e a CTA final.
---

# Vídeo Demonstrativo (HyperFrames + captura de tela)

Gera um **walkthrough narrado** de uma aplicação web: a partir do **link do app**, navega
de verdade pelos passos, captura as telas reais e monta um vídeo com **moldura de
navegador + cursor animado + destaque/zoom + narração**. Identidade dark premium âmbar
(ver [references/house-style.md](references/house-style.md)) e termina na **CTA do INEMA.CLUB**.

Stack: `agent-browser` (Playwright) pra captura · HyperFrames (HTML→MP4) · TTS local
Kokoro. Tudo na máquina, **sem chave de API**.

## Princípio que rege tudo: capturar antes, animar depois
O render do HyperFrames é **determinístico** (sem rede/`fetch` na renderização). Então
**nunca** se carrega o site ao vivo dentro do vídeo: a gente **captura screenshots reais
antes** e anima por cima. O viewport fixo da captura vira o **espaço de coordenadas** das
caixas (bounding boxes) que o cursor vai mirar.

## Pré-requisitos (já nesta máquina)
- Node 22+ e FFmpeg; Chrome do HyperFrames (`npx hyperframes browser ensure`).
- TTS Kokoro: `pip install kokoro-onnx soundfile` (voz `pf_dora`, PT-BR).
- `agent-browser` disponível no PATH (skill de navegação). O app-alvo precisa estar no ar
  (ex.: `localhost:8000`).

## Fluxo (sempre nesta ordem)

1. **Roteiro de passos** — escreva `STEPS.md`: a lista de ações a demonstrar (ex.:
   "escrever prompt → escolher 512² → ajustar altura → Gerar → salvar"), com 1 frase de
   narração por passo. 5–8 passos + CTA ≈ 35–50s de vídeo. Veja
   [references/pipeline.md](references/pipeline.md).
2. **Revisão de texto** — **antes** de capturar/narrar, revise o texto de cada passo. Cada
   frase tem **duas formas**: (a) **tela** (`caption` no `steps.json` + labels) → PT-BR
   acentuado, com botões/menus do app na **grafia original** em inglês (`Generate`, `Upload`);
   (b) **fala** (`txt/sN.txt`) → números/siglas expandidos **e** termos em inglês reescritos
   foneticamente (ex.: `upload` → "âploud", `deploy` → "deplói"). Varra a acentuação palavra a
   palavra; na dúvida sobre uma pronúncia, gere um WAV de teste e peça o usuário ouvir.
   Checklist + léxico em [references/revisao-texto.md](references/revisao-texto.md).
3. **Captura** — com `agent-browser`: abra a URL num **viewport fixo**, faça `snapshot -i`,
   execute cada ação, tire 1 **screenshot por estado** e pegue a **bounding box real** de
   cada elemento-alvo (`getBoundingClientRect`). É o que faz o cursor cair *exato* no
   controle. Use [scripts/capture.mjs](scripts/capture.mjs) (lê `actions.json`) ou dirija o
   `agent-browser` na mão (passo a passo) — o resultado é `assets/shots/*.png` + `steps.json`.
   Detalhes em [references/pipeline.md](references/pipeline.md).
4. **Projeto** — crie **tudo dentro de `~/projetos/output/<nome>/`** (pasta única do usuário):
   `cd ~/projetos/output && npx hyperframes init <nome> --example blank --non-interactive`. Todo
   o conteúdo (projeto, assets, captures, áudios, `index.html` e os MP4 finais) vive nessa pasta. Copie as
   fontes embutidas nesta skill (`assets/fonts/` → `assets/fonts/` do projeto), OU rode
   `node scripts/fetch-fonts.mjs` na raiz do projeto pra baixá-las. A house style (paleta,
   tipografia) está em [references/house-style.md](references/house-style.md). Esta skill é
   auto-contida — não depende de nenhum outro projeto.
5. **Narração** — escreva `assets/txt/sN.txt` (1 por passo + CTA, já na **forma-fala** revisada no passo 2) e gere os WAVs com Kokoro
   voz `pf_dora`, `--speed 0.98`. Expanda números/siglas pra fala ("512" → "quinhentos e
   doze"; URLs → "inema ponto club"). Template: [scripts/narration-template.sh](scripts/narration-template.sh).
6. **Composição** — copie [scripts/composition-template.mjs](scripts/composition-template.mjs)
   como `build-demo.mjs`. Ele **lê `steps.json`** (telas + bounding boxes + captions) e
   **mede as durações dos WAVs com ffprobe** automaticamente — timing único, áudio e
   animação sempre batidos. A moldura de navegador, o cursor global animado, o destaque, o
   zoom no resultado e a **CTA do INEMA.CLUB** já vêm prontos. Rode `node build-demo.mjs`.
   Como o cursor e o zoom funcionam: [references/cursor-and-chrome.md](references/cursor-and-chrome.md).
7. **Validar** — `npx hyperframes lint` (0 erros) e `npx hyperframes inspect --samples 14`
   (0 problemas). Armadilhas em [references/gotchas.md](references/gotchas.md).
8. **Render** — `--quality draft` pra conferir (extraia 1 frame por passo e mostre ao
   usuário), depois `--quality high --fps 30 --output <nome>-16x9.mp4`. O MP4 sai na raiz do
   próprio projeto (que já está em `~/projetos/output/<nome>/`) — todo o conteúdo numa pasta só.

## Regras de ouro (não-negociáveis)
- **Tudo em `~/projetos/output/<nome>/`** — o projeto inteiro (captures, áudios, `index.html` e
  o MP4 final) mora nessa pasta única. Init com `cd ~/projetos/output && npx hyperframes init <nome>`. Nunca espalhar em `renders/` local.
- **Sem silêncio no fim** — os loops de ambiente usam `ambientRepeat(ciclo)` (no template) para não
  ultrapassar `TOTAL`; assim `tl.duration()` = duração real e o render não sobra cauda muda. Não voltar para `Math.ceil(...)+1`.
- **Capturar antes, animar depois** — render determinístico; nada de site ao vivo no render.
- **Viewport fixo na captura = espaço das coordenadas.** Mantenha o mesmo viewport na hora
  de pegar as bounding boxes e de tirar os screenshots. Largura ≤ ~1280 pra caber no 16:9.
- **Cursor mira a bounding box REAL** (`getBoundingClientRect`), não no olho. É isso que faz
  parecer profissional.
- **Cursor é global** (animado na timeline principal, não por cena), com o *hotspot* na
  ponta — a ponta cai no centro do elemento; clique = pulse + ripple.
- **Screenshots reais dentro de uma moldura de navegador** (barra + URL) pra manter o look
  premium e disfarçar que é print.
- **Animar o `.scene-inner`**, nunca o wrapper `.clip`; cenas e captions em tracks
  alternados (1/3 e 2/4); decorativos e moldura com `data-layout-ignore`; fontes locais
  (sem CDN — use as de `assets/fonts/`). Detalhes em [references/gotchas.md](references/gotchas.md).
- **Timing é fonte única**: o gerador mede os WAVs com ffprobe → não há `AUDIO[]` manual.
- **Revisar texto antes de narrar/capturar**: acentuação PT-BR varrida palavra a palavra; termos
  em inglês (incl. botões do app) na **grafia original na tela** mas **foneticamente na forma-fala**
  (`txt/sN.txt`, ex.: `upload`→"âploud"). Acento/pronúncia errados contaminam tela **e** locução.
  Ver [references/revisao-texto.md](references/revisao-texto.md).
- Sempre **conferir frames com o usuário** antes do render final (não dá pra ouvir o áudio
  — peça pra ele validar a locução).

## Limites conhecidos (seja honesto com o usuário)
- Estado dinâmico do app (animações, vídeo, dados ao vivo) vira **print estático**. Pra
  movimento real, é o modo **v3** (gravar vídeo da tela com `agent-browser record`) — outro
  caminho, com sincronia de narração mais difícil.
- App com login precisa de **credenciais de teste** (ou capture só telas públicas).
- Formato natural é **16:9** (telas de app são landscape). 9:16 exigiria recortar/reenquadrar.
- Mesma limitação de voz do Kokoro (boa, sem atuação) e você não escuta — o usuário valida.

## CTA INEMA.CLUB (cena final padrão)
Última cena: "CONTINUA EM" + **INEMA.CLUB** (INEMA creme, .CLUB âmbar com glow) + `🌐 inema.club`.
Narração: "Isso é conteúdo do INEMA ponto CLUB. Acesse: inema ponto club." Já vem pronta no
`composition-template.mjs`.
