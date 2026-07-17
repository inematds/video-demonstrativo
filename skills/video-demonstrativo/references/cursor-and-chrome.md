# Cursor, moldura de navegador e zoom — como funcionam

Tudo isto já está pronto no `composition-template.mjs`. Este doc explica a mecânica pra
quando você precisar ajustar.

## Mapeamento de coordenadas (o conceito central)
A captura roda num **viewport fixo** (ex.: 1280×800). Toda bounding box vem nesse espaço.
No vídeo (canvas 1920×1080), o screenshot é desenhado dentro da janela em:
- `WIN_L` = `(1920 - VW) / 2` (centraliza horizontalmente; pode ser fixado em `window.left`)
- `WIN_T` = `window.top` (padrão 96) · barra de título = `window.titleH` (padrão 52)
- topo do screenshot: `SHOT_T = WIN_T + TITLE_H`

Então um ponto `(sx, sy)` do screenshot vira, no canvas:
```
canvasX = WIN_L + sx
canvasY = SHOT_T + sy
```
O centro de um alvo (pra onde o cursor vai) = centro da bbox mapeada. **Sempre use a bbox
real** (`getBoundingClientRect`) — é o que faz o cursor cair exato no botão/campo.

## Cursor global
- É **um** elemento (`#cursor`, SVG de seta) animado na **timeline principal** — não por
  cena. Assim ele desliza continuamente enquanto os screenshots trocam.
- **Hotspot na ponta**: a ponta da seta fica em ~`(6,3)` dentro do SVG 42px. Por isso o
  tween usa `x = alvoX - 6`, `y = alvoY - 3`, pra a *ponta* (não o canto) cair no centro.
- Movimento: `duration:.7, ease:"power3.inOut"` a partir de `start + 0.35` (deixa a cena
  aparecer antes). Easing curvo evita o robótico.
- **Clique**: `scale:.82` yoyo (pulse) + um `#ripple` (círculo âmbar) que expande e some,
  posicionado no alvo no instante do clique (~`start + 1.15`).
- Na CTA, o cursor some (`opacity:0`).

## Moldura de navegador (#appwin)
- Janela persistente na `bg-layer` (com `data-layout-ignore`): borda, raio, sombra grande;
  barra de título com os 3 pontinhos (vermelho/amarelo/verde) e uma **pílula de URL** mono
  com cadeado + `window.urlLabel`. Dá o ar de "navegador" e mantém o look premium.
- Os screenshots (clips por cena) ficam **dentro** da área da janela, em `(WIN_L, SHOT_T)`
  com tamanho `VW×VH`.

## Destaque (highlight)
- `.hlbox`: retângulo só com `box-shadow` (anel âmbar + glow), posicionado na bbox mapeada
  (com ~6px de folga). Entra com `back.out` e pulsa o glow algumas vezes. Foca o olhar no
  controle ativo sem cobrir nada.

## Zoom no resultado
- No passo marcado `zoom:true`, o `<img>` recebe `scale: 1 → 1.12` ao longo da narração,
  com `transformOrigin` no **centro do alvo** (ex.: o painel de resultado). Dá um leve
  push-in cinematográfico no momento do "tcharam".

## Ritmo recomendado
- LEAD 0.5s (cena aparece antes da voz), TAIL 0.7s, FADE 0.4s entre cenas.
- Cursor chega ao alvo ~0.7s antes da explicação principal; clique perto de `start+1.15s`.
- Mantenha 5–8 passos: além disso o vídeo cansa e a captura/edição vira trabalho grande.
