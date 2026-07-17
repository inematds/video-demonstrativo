# 🎬 video-demonstrativo

Skill do Claude Code que gera **vídeos de demonstração (walkthrough) de uma aplicação web a partir do link do app**.

Você dá a URL. O Claude Code navega o app **de verdade** com um navegador automatizado, captura as **telas reais** passo a passo e monta um vídeo narrado em PT-BR com **moldura de navegador, cursor animado, destaque/zoom** e a CTA do INEMA.CLUB. Tudo na máquina — **sem chave de API**.

- 📄 **Guia de uso:** https://inematds.github.io/video-demonstrativo/guia/
- 🎓 **Curso completo** (3 trilhas, 10 módulos): https://inematds.github.io/skill-video-demonstrativo/

Diferente da skill `video-explicativo` (que explica um conceito com motion graphics): esta **mostra um app real sendo usado**.

## Princípio: capturar antes, animar depois

O render do HyperFrames é determinístico (sem rede durante a renderização), então o site nunca é carregado ao vivo dentro do vídeo: capturam-se os screenshots reais antes e anima-se por cima. O **viewport fixo da captura** vira o espaço de coordenadas onde o cursor mira — o alvo é a **bounding box real** (`getBoundingClientRect`), não o olho.

## Stack

`agent-browser` (Playwright) para captura · **HyperFrames** (HTML→MP4) para o render · **TTS Kokoro** local (voz `pf_dora`, PT-BR) para a narração · FFmpeg/ffprobe · Node 22+.

## Fluxo (8 etapas)

1. **Roteiro** — `STEPS.md`: 5–8 passos + CTA (≈35–50s), 1 frase de narração por passo.
2. **Revisão de texto** — cada frase em duas formas: *tela* (PT-BR acentuado, botões do app na grafia original) e *fala* (números expandidos, inglês foneticamente).
3. **Captura** — `capture.mjs` + `actions.json` → `assets/shots/*.png` + `steps.json`.
4. **Projeto** — `cd ~/projetos/output && npx hyperframes init <nome> --example blank --non-interactive`.
5. **Narração** — `narration-template.sh` → `assets/txt/sN.txt` + `assets/audio/sN.wav` (Kokoro).
6. **Composição** — `composition-template.mjs` como `build-demo.mjs` → `index.html` (16:9).
7. **Validar** — `npx hyperframes lint` · `npx hyperframes inspect --samples 14`.
8. **Render** — draft para conferir frames, depois `--quality high --fps 30`.

## Estrutura

```
skills/video-demonstrativo/
  SKILL.md                        # a skill: fluxo, regras de ouro, limites
  CHANGELOG.md                    # histórico (v1.yy.xxx)
  references/
    pipeline.md                   # pipeline detalhado, etapa a etapa
    house-style.md                # paleta e tipografia (dark premium âmbar)
    cursor-and-chrome.md          # como o cursor, a moldura e o zoom funcionam
    revisao-texto.md              # checklist de acentuação + léxico inglês→PT
    gotchas.md                    # armadilhas do HyperFrames
  scripts/
    capture.mjs                   # dirige o agent-browser; emite shots + steps.json
    composition-template.mjs      # lê steps.json, mede WAVs, gera o index.html
    narration-template.sh         # gera os textos e os WAVs no Kokoro
    fetch-fonts.mjs               # baixa as fontes (alternativa ao assets/fonts/)
    actions.example.json          # exemplo de entrada da captura
    steps.example.json            # exemplo da saída da captura
  assets/fonts/                   # Sora, Inter, JetBrains Mono (subset latin) + fonts.css
guia/                             # esta landing + guia de uso (GitHub Pages)
capa/                             # capa oficial do catálogo
```

A skill é **auto-contida**: já traz as fontes e não depende de nenhum outro projeto.

## Instalar

```bash
cp -r skills/video-demonstrativo ~/.claude/skills/
```

Pré-requisitos: Node 22+, FFmpeg, `npx hyperframes browser ensure`, `pip install kokoro-onnx soundfile`, `agent-browser` no PATH e o app-alvo no ar.

## Limites conhecidos

- Estado dinâmico (animações, vídeo, dados ao vivo) vira **print estático**.
- App com login precisa de **credenciais de teste** (ou capture só telas públicas).
- Formato natural é **16:9** — telas de app são landscape.
- Voz do Kokoro é boa, mas sem atuação; e o agente não escuta o áudio — o usuário valida.

---

Conteúdo do [INEMA.CLUB](https://inema.club).
