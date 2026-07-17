// ============================================================================
// TEMPLATE DE COMPOSIÇÃO — vídeo demonstrativo (walkthrough de app).
// Lê steps.json (telas + bounding boxes + captions + narração) e MEDE as
// durações dos WAVs com ffprobe -> timing único, áudio e animação batidos.
// Monta: moldura de navegador + screenshot por passo + cursor global animado
// (mira a bbox real) + destaque + zoom no resultado + CTA INEMA.CLUB.
//
// COMO USAR:
//   1. Gere assets/shots/*.png e steps.json com capture.mjs (ou na mão).
//   2. Gere assets/audio/sN.wav (1 por passo + CTA) com narration-template.sh.
//   3. node build-demo.mjs   -> escreve index.html (16:9). Renderize logo após.
//
// steps.json (resumo):
// {
//   "viewport":[1280,800],
//   "window":{ "top":96, "titleH":52, "urlLabel":"localhost:8000" },
//   "ctaNarration":"Isso é conteúdo do INEMA ponto CLUB. Acesse: inema ponto club.",
//   "steps":[
//     {"shot":"00-home.png","intro":true,"target":null,"click":false,"caption":"..."},
//     {"shot":"02-size.png","target":{"x":179,"y":501,"w":44,"h":26},"click":true,"caption":"..."},
//     {"shot":"04-result.png","target":{"x":668,"y":128,"w":484,"h":324},"zoom":true,"caption":"..."}
//   ]
// }
// target = bounding box NO ESPAÇO DO SCREENSHOT (mesma origem do viewport da captura).
// ============================================================================
import { writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const DATA = JSON.parse(readFileSync(new URL("./steps.json", import.meta.url), "utf8"));
const FONT_CSS = readFileSync(new URL("./assets/fonts/fonts.css", import.meta.url), "utf8")
  .replace(/\.\/fonts\//g, "assets/fonts/");

const W = 1920, H = 1080, OUT = "index.html";
const [VW, VH] = DATA.viewport || [1280, 800];
const WIN_T = (DATA.window && DATA.window.top) ?? 96;
const TITLE_H = (DATA.window && DATA.window.titleH) ?? 52;
const URL_LABEL = (DATA.window && DATA.window.urlLabel) || "localhost";
const WIN_L = (DATA.window && DATA.window.left) ?? Math.round((W - VW) / 2);
const SHOT_T = WIN_T + TITLE_H;
const STEPS = DATA.steps;

// ---- mede durações reais dos WAVs (s1..sN passos, s(N+1) = CTA) ----
const NA = STEPS.length + 1; // +1 da CTA
const AUDIO = [];
for (let i = 1; i <= NA; i++) {
  const f = new URL(`./assets/audio/s${i}.wav`, import.meta.url).pathname;
  const d = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${f}"`).toString().trim());
  AUDIO.push(d);
}

const LEAD = 0.5, TAIL = 0.7, FADE = 0.4;
let t = 0;
const S = AUDIO.map((a, i) => {
  const dur = LEAD + a + TAIL;
  const o = { i: i + 1, start: round(t), dur: round(dur), audioStart: round(t + LEAD), audioDur: round(a), end: round(t + dur) };
  t += dur; return o;
});
const TOTAL = round(t);
function round(n){ return Math.round(n*1000)/1000; }

// ---- geometria: bbox no espaço do screenshot -> caixa no canvas ----
const mapBox = (b) => ({ x: WIN_L + b.x, y: SHOT_T + b.y, w: b.w, h: b.h });
const center = (b) => ({ x: Math.round(b.x + b.w/2), y: Math.round(b.y + b.h/2) });
const HOT = { x: 6, y: 3 }; // ponta do cursor

// monta uma lista de "cenas": os passos + a CTA no fim
const SCENES = STEPS.map((st) => ({ ...st, kind: "step" }));
SCENES.push({ kind: "cta", caption: DATA.ctaCaption || "Mais conteúdo em inema.club" });

function hlHTML(st, id){
  if(!st.target) return "";
  const b = mapBox(st.target);
  return `<div class="hlbox" id="${id}" style="left:${b.x-6}px;top:${b.y-6}px;width:${b.w+12}px;height:${b.h+12}px"></div>`;
}
function sceneInner(sc, i){
  if(sc.kind === "cta"){
    return `
      <div class="cta-cover"></div>
      <div class="cta-eyebrow" id="s${i}-eye">CONTINUA EM</div>
      <div class="cta-brand" id="s${i}-brand"><span class="b1">INEMA</span><span class="bdotsep">.</span><span class="b2">CLUB</span></div>
      <div class="cta-rule" id="s${i}-rule"></div>
      <div class="cta-url mono" id="s${i}-url"><span class="cta-globe">🌐</span>inema.club</div>`;
  }
  const intro = sc.intro ? `<div class="intro-eyebrow" id="s${i}-eye"><span class="dot"></span>${(DATA.eyebrow||"DEMONSTRAÇÃO").toUpperCase()}</div>` : "";
  const zoom = sc.zoom ? ` id="shot-zoom-${i}"` : "";
  return `
      <img class="shot"${zoom} src="assets/shots/${sc.shot}" width="${VW}" height="${VH}" />
      ${hlHTML(sc, `s${i}-hl`)}
      ${intro}`;
}

const scenesHTML = SCENES.map((sc, idx) => {
  const s = S[idx];
  return `
    <section id="s${s.i}" class="scene clip" data-start="${s.start}" data-duration="${s.dur}" data-track-index="${s.i%2===1?1:3}">
      <div class="scene-inner" id="scene-inner-${s.i}">${sceneInner(sc, s.i)}</div>
    </section>`;
}).join("");

const captionsHTML = SCENES.map((sc, idx) => {
  const s = S[idx];
  return `
    <div class="caption clip" id="cap-${s.i}" data-start="${s.start}" data-duration="${s.dur}" data-track-index="${s.i%2===1?2:4}">${sc.caption||""}</div>`;
}).join("");

const audioHTML = S.map((s) => `
    <audio id="a${s.i}" data-start="${s.audioStart}" data-duration="${s.audioDur}" data-track-index="20" src="assets/audio/s${s.i}.wav"></audio>`).join("");

function sceneAnim(sc, s){
  const i = s.i, t = s.start, at=(d)=>round(t+d), L=[]; const P=(x)=>L.push(x);
  P(`tl.fromTo("#scene-inner-${i}",{opacity:0},{opacity:1,duration:${FADE},ease:"power2.out"},${t});`);
  P(`tl.to("#scene-inner-${i}",{opacity:0,duration:${FADE},ease:"power2.in"},${round(s.end-FADE)});`);
  P(`tl.set("#scene-inner-${i}",{opacity:0},${round(s.end)});`);
  if(sc.kind === "cta"){
    P(`tl.from("#s${i}-eye",{y:-18,opacity:0,duration:.5,ease:"power2.out"},${at(0.15)});`);
    P(`tl.from("#s${i}-brand",{scale:.7,opacity:0,duration:.7,ease:"back.out(1.7)"},${at(0.35)});`);
    P(`tl.fromTo("#s${i}-rule",{scaleX:0},{scaleX:1,duration:.6,ease:"expo.out"},${at(0.9)});`);
    P(`tl.from("#s${i}-url",{y:18,opacity:0,duration:.5,ease:"power2.out"},${at(1.1)});`);
    P(`tl.fromTo("#s${i}-brand",{filter:"drop-shadow(0 0 0 rgba(255,195,0,0))"},{filter:"drop-shadow(0 0 26px rgba(255,195,0,.55))",duration:1.0,repeat:2,yoyo:true,ease:"sine.inOut"},${at(1.2)});`);
    return L.join("\n      ");
  }
  P(`tl.from("#scene-inner-${i} .shot",{y:18,scale:1.01,duration:.5,ease:"power2.out"},${at(0)});`);
  if(sc.intro) P(`tl.from("#s${i}-eye",{y:-16,opacity:0,duration:.5,ease:"power2.out"},${at(0.2)});`);
  if(sc.target){
    P(`tl.fromTo("#s${i}-hl",{opacity:0,scale:.92},{opacity:1,scale:1,duration:.45,ease:"back.out(1.6)"},${at(0.9)});`);
    P(`tl.to("#s${i}-hl",{boxShadow:"0 0 0 3px rgba(255,195,0,.9),0 0 26px 6px rgba(255,195,0,.45)",duration:.6,repeat:3,yoyo:true,ease:"sine.inOut"},${at(1.1)});`);
  }
  if(sc.zoom && sc.target){
    const c = center(mapBox(sc.target));
    P(`tl.fromTo("#shot-zoom-${i}",{scale:1},{scale:1.12,duration:${round(s.audioDur+0.4)},ease:"power1.inOut",transformOrigin:"${c.x}px ${c.y}px"},${at(0.4)});`);
  }
  return L.join("\n      ");
}

function cursorAnim(){
  const L=[]; const P=(x)=>L.push(x);
  SCENES.forEach((sc, idx) => {
    const s = S[idx];
    if(sc.kind === "cta"){ P(`tl.to("#cursor",{opacity:0,duration:.3,ease:"power2.in"},${round(s.start)});`); return; }
    const tgt = sc.target ? center(mapBox(sc.target)) : { x: WIN_L + Math.round(VW/2), y: SHOT_T + Math.round(VH/3) };
    P(`tl.to("#cursor",{x:${tgt.x-HOT.x},y:${tgt.y-HOT.y},duration:.7,ease:"power3.inOut"},${round(s.start+0.35)});`);
    if(sc.click){
      P(`tl.to("#cursor",{scale:.82,duration:.12,yoyo:true,repeat:1,ease:"power2.inOut"},${round(s.start+1.15)});`);
      P(`tl.set("#ripple",{x:${tgt.x-40},y:${tgt.y-40},opacity:1,scale:.3},${round(s.start+1.15)});`);
      P(`tl.to("#ripple",{scale:1.4,opacity:0,duration:.6,ease:"power2.out"},${round(s.start+1.18)});`);
    }
  });
  return L.join("\n      ");
}

const animJS = SCENES.map((sc, idx) => sceneAnim(sc, S[idx])).join("\n      ");
const cursorJS = cursorAnim();
const cur0 = { x: (WIN_L + VW + 120) - HOT.x, y: (SHOT_T + VH - 20) - HOT.y };

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      ${FONT_CSS}
      :root{ --bg:#0D1321; --bg2:#1D2D44; --bg3:#3E5C76; --fg:#F0EBD8; --muted:#748CAB;
        --accent:#FFC300; --accent2:#FCA311; --code:#2EC4B6; }
      *{margin:0;padding:0;box-sizing:border-box}
      html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bg);color:var(--fg);
        font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
      .mono{font-family:"JetBrains Mono",ui-monospace,monospace}
      #root{position:relative;width:${W}px;height:${H}px;overflow:hidden}
      .bg-layer{position:absolute;inset:0;z-index:0;pointer-events:none}
      #glow{position:absolute;top:-260px;left:-180px;width:1100px;height:1100px;border-radius:50%;
        background:radial-gradient(circle,rgba(255,195,0,.16),rgba(255,195,0,0) 62%);filter:blur(8px)}
      #glow2{position:absolute;bottom:-360px;right:-240px;width:1200px;height:1200px;border-radius:50%;
        background:radial-gradient(circle,rgba(46,196,182,.10),rgba(46,196,182,0) 62%)}
      #grid{position:absolute;inset:-2px;opacity:.5;
        background-image:linear-gradient(rgba(116,140,171,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(116,140,171,.06) 1px,transparent 1px);
        background-size:64px 64px}
      #appwin{position:absolute;left:${WIN_L}px;top:${WIN_T}px;width:${VW}px;height:${TITLE_H+VH}px;
        background:#0b1322;border:2px solid var(--bg3);border-radius:18px;overflow:hidden;
        box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.02)}
      #titlebar{height:${TITLE_H}px;display:flex;align-items:center;gap:10px;padding:0 22px;
        background:#0c1a2c;border-bottom:2px solid var(--bg3)}
      .tl-dot{width:14px;height:14px;border-radius:50%}
      .tl-dot.r{background:#ff5f57}.tl-dot.y{background:#febc2e}.tl-dot.g{background:#28c840}
      .urlpill{margin-left:18px;flex:1;max-width:560px;height:30px;display:flex;align-items:center;gap:10px;
        background:#0a1626;border:1px solid var(--bg3);border-radius:999px;padding:0 16px;color:var(--muted);
        font-family:"JetBrains Mono",monospace;font-size:18px}
      .urlpill .lock{color:var(--code);font-size:15px}
      .scene{position:absolute;inset:0;z-index:10}
      .scene-inner{position:absolute;inset:0}
      .shot{position:absolute;left:${WIN_L}px;top:${SHOT_T}px;width:${VW}px;height:${VH}px;border-radius:0 0 16px 16px;display:block}
      .hlbox{position:absolute;border-radius:10px;z-index:14;pointer-events:none;
        box-shadow:0 0 0 3px rgba(255,195,0,.9),0 0 22px 5px rgba(255,195,0,.35)}
      .intro-eyebrow{position:absolute;left:${WIN_L}px;top:${WIN_T-44}px;display:inline-flex;align-items:center;gap:12px;
        font-family:"JetBrains Mono",monospace;font-size:22px;letter-spacing:.26em;color:var(--accent);font-weight:600}
      .intro-eyebrow .dot{width:12px;height:12px;border-radius:50%;background:var(--accent);box-shadow:0 0 14px var(--accent)}
      #cursor{position:absolute;left:0;top:0;z-index:36;width:42px;height:42px;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))}
      #ripple{position:absolute;left:0;top:0;z-index:35;width:80px;height:80px;border-radius:50%;opacity:0;
        border:4px solid var(--accent);box-shadow:0 0 22px rgba(255,195,0,.6);pointer-events:none}
      .cta-cover{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,#15233a,var(--bg) 70%);z-index:12}
      .cta-eyebrow,.cta-brand,.cta-rule,.cta-url{position:absolute;left:0;right:0;text-align:center;z-index:13}
      .cta-eyebrow{top:392px;font-family:"JetBrains Mono",monospace;font-size:26px;letter-spacing:.36em;color:var(--muted);text-transform:uppercase}
      .cta-brand{top:436px;font-family:Sora,sans-serif;font-weight:800;font-size:150px;line-height:.95;letter-spacing:-.02em}
      .cta-brand .b1{color:var(--fg)}.cta-brand .b2,.cta-brand .bdotsep{color:var(--accent)}
      .cta-rule{top:632px;height:6px;width:300px;margin:0 auto;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:6px;transform-origin:center}
      .cta-url{top:672px;display:flex;align-items:center;justify-content:center;gap:14px;font-size:44px;color:var(--muted)}
      .caption{position:absolute;left:50%;transform:translateX(-50%);bottom:40px;z-index:30;max-width:1500px;text-align:center;
        font-size:34px;font-weight:600;color:var(--fg);background:rgba(10,18,30,.78);border:1px solid var(--bg3);border-radius:14px;
        padding:16px 38px;backdrop-filter:blur(6px);text-shadow:0 2px 10px rgba(0,0,0,.6)}
      #progress{position:absolute;left:0;bottom:0;height:6px;width:100%;transform:scaleX(0);transform-origin:left center;
        background:linear-gradient(90deg,var(--accent),var(--accent2));z-index:40;box-shadow:0 0 18px rgba(255,195,0,.5)}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
      <div class="bg-layer" data-layout-ignore>
        <div id="glow"></div><div id="glow2"></div><div id="grid"></div>
        <div id="appwin">
          <div id="titlebar">
            <span class="tl-dot r"></span><span class="tl-dot y"></span><span class="tl-dot g"></span>
            <span class="urlpill"><span class="lock">🔒</span>${URL_LABEL}</span>
          </div>
        </div>
      </div>
${scenesHTML}
${captionsHTML}
      <div id="cursor" data-layout-ignore>
        <svg width="42" height="42" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15 L12.5 22.5 L15.2 21.3 L11.6 14 L18 14 Z" fill="#ffffff" stroke="#0D1321" stroke-width="1.1" stroke-linejoin="round"/></svg>
      </div>
      <div id="ripple" data-layout-ignore></div>
      <div id="progress"></div>
${audioHTML}
      <script>
        window.__timelines = window.__timelines || {};
        const tl = gsap.timeline({ paused: true });
        const TOTAL = ${TOTAL};
        gsap.set("#cursor",{x:${cur0.x},y:${cur0.y}});
        // repete um loop SEM ultrapassar TOTAL (senão tl.duration() estoura e sobra
        // silêncio no fim do render — o HyperFrames usa tl.duration() como fim).
        const ambientRepeat = (cycle) => Math.max(0, Math.floor(TOTAL / cycle) - 1);
        tl.to("#glow",{scale:1.18,opacity:.5,duration:4.5,yoyo:true,repeat:ambientRepeat(4.5),ease:"sine.inOut"},0);
        tl.to("#grid",{backgroundPositionX:"+=128",backgroundPositionY:"+=128",duration:18,repeat:ambientRepeat(18),ease:"none"},0);
        tl.fromTo("#progress",{scaleX:0},{scaleX:1,duration:TOTAL,ease:"none"},0);
      ${animJS}
      ${cursorJS}
        tl.set({}, {}, TOTAL);
        window.__timelines["main"] = tl;
      </script>
    </div>
  </body>
</html>
`;

writeFileSync(new URL("./"+OUT, import.meta.url), html);
console.log(`${OUT} gerado · ${W}x${H} · TOTAL=${TOTAL}s · ${SCENES.length} cenas (${STEPS.length} passos + CTA)`);
S.forEach(s=>console.log(`  s${s.i}: start=${s.start} dur=${s.dur} audio@${s.audioStart} (${s.audioDur}s)`));
