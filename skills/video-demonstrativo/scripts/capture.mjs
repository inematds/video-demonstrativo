// ============================================================================
// CAPTURE — dirige o agent-browser a partir de um actions.json, executa o
// passo a passo no app real, tira 1 screenshot por estado e pega a bounding box
// real de cada elemento-alvo (getBoundingClientRect). Emite steps.json + shots.
//
// Uso:  node capture.mjs actions.json
// Saída: assets/shots/NN-id.png  +  steps.json (pronto pro composition-template).
//
// PRÉ: o app no ar; `agent-browser` no PATH. O viewport DEVE ser fixo (o mesmo
// espaço das bounding boxes e dos screenshots) — definido em actions.json.
//
// actions.json (exemplo em actions.example.json):
// {
//   "url":"http://localhost:8000/",
//   "viewport":[1280,800],
//   "window":{ "top":96, "titleH":52, "urlLabel":"localhost:8000" },
//   "eyebrow":"DEMONSTRAÇÃO · INEMAIMG",
//   "ctaNarration":"Isso é conteúdo do INEMA ponto CLUB. Acesse: inema ponto club.",
//   "steps":[
//     { "id":"home", "intro":true, "shotBefore":true,
//       "caption":"app · do zero", "narration":"Esse é o app..." },
//     { "id":"prompt", "do":{"type":"fill","selector":"textarea","value":"um cavalo..."},
//       "target":"textarea", "caption":"1 · Escreva o prompt", "narration":"Primeiro..." },
//     { "id":"size", "do":{"type":"clickText","tag":"button","text":"512²"},
//       "target":{"tag":"button","text":"512²"}, "click":true,
//       "caption":"2 · Tamanho 512", "narration":"Escolha o tamanho..." },
//     { "id":"gerar", "do":{"type":"clickText","tag":"button","text":"Gerar"},
//       "target":{"tag":"button","text":"Gerar"}, "click":true,
//       "caption":"3 · Gerar", "narration":"Agora é só gerar." }
//   ]
// }
//
// "do" (ação a executar antes do screenshot):
//   {type:"fill", selector, value}           — preenche input/textarea (CSS selector)
//   {type:"click", selector}                 — clica (CSS selector)
//   {type:"clickText", tag, text}            — clica elemento <tag> cujo texto === text
//   {type:"setValue", selector, value}       — define value e dispara input/change
//   {type:"wait", ms}                        — espera (ex.: geração de imagem)
//   (sem "do": só tira o screenshot do estado atual)
// "target" (o que o cursor vai mirar): CSS selector (string) ou {tag,text}.
// ============================================================================
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const cfgPath = process.argv[2] || "actions.json";
const CFG = JSON.parse(execSync(`cat ${JSON.stringify(cfgPath)}`).toString());
const [VW, VH] = CFG.viewport || [1280, 800];
mkdirSync(new URL("./assets/shots/", import.meta.url), { recursive: true });

const ab = (args) => execSync(`agent-browser ${args}`, { stdio: ["ignore", "pipe", "pipe"] }).toString();
const evalJSON = (js) => {
  const out = ab(`eval ${JSON.stringify(js)} --json`);
  try { const j = JSON.parse(out); return j.data?.result ?? j.data ?? j; } catch { return null; }
};

// helpers de localização em JS no browser (string p/ eval)
const finder = (t) => typeof t === "string"
  ? `document.querySelector(${JSON.stringify(t)})`
  : `[...document.querySelectorAll(${JSON.stringify(t.tag||"*")})].find(e=>e.textContent.trim()===${JSON.stringify(t.text)})`;

console.log(`> viewport ${VW}x${VH}; abrindo ${CFG.url}`);
ab(`set viewport ${VW} ${VH}`);
ab(`open ${JSON.stringify(CFG.url)}`);
ab(`snapshot -i`); // estabelece refs/estado

const stepsOut = [];
CFG.steps.forEach((st, idx) => {
  const n = String(idx).padStart(2, "0");
  const shot = `${n}-${st.id || "step"}.png`;
  // executa a ação
  if (st.do) {
    const d = st.do;
    if (d.type === "fill") ab(`fill ${JSON.stringify(d.selector)} ${JSON.stringify(d.value)}`);
    else if (d.type === "click") ab(`click ${JSON.stringify(d.selector)}`);
    else if (d.type === "clickText") evalJSON(`(()=>{const el=${finder({tag:d.tag,text:d.text})};el&&el.click();return !!el})()`);
    else if (d.type === "setValue") evalJSON(`(()=>{const el=${finder(d.selector)};if(!el)return false;el.value=${JSON.stringify(d.value)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
    else if (d.type === "wait") ab(`wait ${parseInt(d.ms||1000,10)}`);
  }
  // screenshot do estado
  ab(`screenshot ${JSON.stringify("assets/shots/" + shot)}`);
  // bounding box do alvo (espaço do screenshot)
  let target = null;
  if (st.target) {
    const box = evalJSON(`(()=>{const el=${finder(st.target)};if(!el)return null;const r=el.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})()`);
    target = box || null;
    if (!box) console.warn(`  ! alvo não encontrado no passo ${st.id}`);
  }
  stepsOut.push({ shot, intro: !!st.intro, target, click: !!st.click, zoom: !!st.zoom, caption: st.caption || "", narration: st.narration || "" });
  console.log(`  [${n}] ${st.id}: shot=${shot} target=${target ? `${target.x},${target.y} ${target.w}x${target.h}` : "—"}`);
});

ab(`close`);

const steps = {
  viewport: [VW, VH],
  window: CFG.window || { top: 96, titleH: 52, urlLabel: "localhost" },
  eyebrow: CFG.eyebrow || "DEMONSTRAÇÃO",
  ctaNarration: CFG.ctaNarration || "Isso é conteúdo do INEMA ponto CLUB. Acesse: inema ponto club.",
  ctaCaption: CFG.ctaCaption || "Mais conteúdo em inema.club",
  steps: stepsOut,
};
writeFileSync(new URL("./steps.json", import.meta.url), JSON.stringify(steps, null, 2));
console.log(`\nsteps.json gerado · ${stepsOut.length} passos. Próximo: gerar narração e rodar build-demo.mjs.`);
