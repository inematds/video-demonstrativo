# Revisão de texto (antes da narração e dos captions)

Etapa obrigatória **antes** de gerar os WAVs (`assets/txt/sN.txt`) e **antes** de fixar os
`caption`/`narration` no `steps.json`. Acento errado contamina os **dois** lados: vira typo
visível na tela **e** muda a tônica/pronúncia no Kokoro (ele fonemiza pela grafia escrita).

## Princípio: cada frase tem DUAS formas

| Forma | Onde vai | Como escrever |
|---|---|---|
| **Tela** | `caption` no `steps.json` + qualquer label de tela | PT-BR com acentuação **correta**; termos em inglês na **grafia original** (`deploy`, `prompt`, `upload`). |
| **Fala** | `assets/txt/sN.txt` (vai pro TTS, via `narration` do `steps.json`) | Mesma frase, mas (a) números/siglas/URLs **expandidos** e (b) termos em inglês **reescritos foneticamente** em PT-BR. |

Como muito nome de botão/menu de app vem **em inglês** ("Generate", "Settings", "Upload"), a
fala precisa pronunciá-los certo, mas a tela mantém o rótulo original (é o que o usuário vê no app).

## Checklist de revisão

1. **Acentuação** — varrer **cada** palavra (á à â ã · é ê · í · ó ô õ · ú · ç · crase).
2. **Ortografia / digitação / concordância**.
3. **Números/siglas/URLs (forma-fala)** — "512" → "quinhentos e doze"; "URL" → soletre; `inema.club` → "inema ponto club".
4. **Termos em inglês** — manter a grafia original **na tela**; na **forma-fala**, trocar pela grafia fonética (tabela abaixo). Na dúvida, **gerar um WAV de teste** e o usuário ouvir.

### Acentos que mais escapam (PT-BR)
vídeo · você · é · só · está · três · código · página · conteúdo · até · também · então ·
número · análise · fácil · rápido · automático · específico · usuário · próprio · já · não · após · ícone · áudio.

## Termos em inglês → grafia fonética (forma-fala)

Léxico-semente (IA / dev / produto). **Só na forma-fala** (`txt/sN.txt`); na tela fica o original.
Aproximações — quando não bater de primeira, ajustar pelo teste de WAV.

| Inglês (tela) | Forma-fala (txt) | | Inglês (tela) | Forma-fala (txt) |
|---|---|---|---|---|
| upload | âploud | | download | dáunloud |
| deploy | deplói | | prompt | prompt *(testar; senão "prónpti")* |
| design | dizáin | | settings | sétings |
| dashboard | déshbord | | template | témpleit |
| login | lôguin | | default | difólt |
| update | âpdeit | | preview | privíu |
| link | linki *(já lê ok)* | | site | sáiti *(já lê ok)* |
| feature | fítcher | | toggle | tógou |
| slider | sláider | | output | áutput |

**Botões/menus do app**: leia o rótulo como o app o nomeia. "Generate" → "djenereit"; "Save" →
"sêiv"; "Export" → "ecspórt". Na tela (caption) fica o texto original em inglês.

### Como testar uma pronúncia (quando em dúvida)
```bash
printf '%s\n' "a forma-fala da palavra aqui" > /tmp/probe.txt
npx -y hyperframes tts /tmp/probe.txt --voice pf_dora --speed 0.98 --output /tmp/probe.wav
```
Pedir o usuário ouvir e escolher a grafia que soa certo (eu não ouço áudio). Fixar a vencedora no `txt/sN.txt`.

## Saída da etapa
- `txt/sN.txt` revisados (acentos OK + números/inglês na forma-fala) → prontos pro Kokoro.
- `caption` no `steps.json` revisado (acentos OK + inglês na grafia original) → pronto pra tela.
