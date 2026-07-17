#!/usr/bin/env bash
# Gera os WAVs da narração a partir do steps.json (1 por passo + CTA).
# Lê steps[].narration e ctaNarration; voz Kokoro pf_dora (PT-BR).
# Uso: rode na raiz do projeto de vídeo (onde está steps.json e assets/).
set -e
cd "$(dirname "$0")/.."   # ajuste se necessário: precisa enxergar ./steps.json e ./assets
mkdir -p assets/audio assets/txt

# extrai as falas do steps.json (passos + CTA) -> assets/txt/sN.txt
node -e '
const fs=require("fs");
const d=JSON.parse(fs.readFileSync("steps.json","utf8"));
const lines=d.steps.map(s=>s.narration||"");
lines.push(d.ctaNarration||"Isso é conteúdo do INEMA ponto CLUB. Acesse: inema ponto club.");
lines.forEach((t,i)=>fs.writeFileSync(`assets/txt/s${i+1}.txt`, (t||"").trim()+"\n"));
console.log("escrevi", lines.length, "txt (passos + CTA)");
'

N=$(ls assets/txt/s*.txt | wc -l)
for i in $(seq 1 "$N"); do
  echo "=== gerando s$i ==="
  npx -y hyperframes tts "assets/txt/s$i.txt" --voice pf_dora --speed 0.98 --output "assets/audio/s$i.wav" 2>&1 \
    | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | grep -aiE "saved|error|fail|wrote|->" | tail -2 || true
done

echo "=== durações ==="
for i in $(seq 1 "$N"); do
  d=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "assets/audio/s$i.wav" 2>/dev/null)
  echo "s$i: ${d}s"
done
echo "Pronto. Agora rode: node build-demo.mjs  (ele mede esses WAVs sozinho)"
