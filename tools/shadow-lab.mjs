import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const kit = readFileSync("styles.css", "utf8");
const padFromCss = /--wg-board-pad:\s*([^;]+);/.exec(kit)?.[1]?.trim() ?? "0.5rem";
const shippedShadow = /--wg-widget-shadow:\s*([^;]+);/.exec(kit)?.[1]?.trim() ?? "";
const shippedEdge = /--wg-widget-edge:\s*([^;]+);/.exec(kit)?.[1]?.trim() ?? "";
const shippedRadius = /--wg-widget-radius-s:\s*([^;]+);/.exec(kit)?.[1]?.trim() ?? "1rem";

const PRESETS = {
	shipped: { layers: [[1, 2, 4], [2, 4, 3], [4, 8, 2.5]], edge: 5 },
	apple: { layers: [[1, 1, 4], [2, 6, 4]], edge: 8 },
	primer: { layers: [[1, 0, 4]], edge: 14 },
	soft: { layers: [[1, 2, 4], [4, 8, 3], [12, 24, 3]], edge: 4 },
	flat: { layers: [], edge: 12 },
};

const CONTROLS = `
<header>
  <h1>Shadow lab</h1>
  <p>Every card below is a real widget root, painted by this repo's own styles.css.</p>
</header>

<section class="rig">
  <div class="knobs">
    <div class="preset-row">
      ${Object.keys(PRESETS).map((name) => `<button type="button" data-preset="${name}">${name}</button>`).join("")}
    </div>

    <div class="layers" id="layers"></div>
    <button type="button" id="add-layer">add a layer</button>

    <label class="knob">edge <output id="edge-out"></output>
      <input type="range" id="edge" min="0" max="20" step="0.5">
    </label>
    <label class="knob">radius <output id="radius-out"></output>
      <input type="range" id="radius" min="0" max="40" step="1">
    </label>
    <label class="knob">gap <output id="gap-out"></output>
      <input type="range" id="gap" min="0" max="48" step="1">
    </label>
    <label class="knob">board padding <output id="pad-out"></output>
      <input type="range" id="pad" min="0" max="48" step="1">
    </label>
    <label class="knob">field
      <input type="color" id="field" value="#ffffff">
    </label>
    <label class="knob dark-row">
      <input type="checkbox" id="dark"> dark theme
    </label>
  </div>

  <div class="shown">
    <div class="stage" id="stage">
      <div class="board" id="board"></div>
    </div>
    <div class="verdict">
      <div class="verdict-reach" id="reach"></div>
      <pre id="css"></pre>
      <button type="button" id="copy">copy the declarations</button>
    </div>
  </div>
</section>
`;

const PAGE_STYLE = `
body { margin: 0; font-family: -apple-system, "Segoe UI", sans-serif; color: #222; background: #fafafa; }
header { padding: 20px 24px 0; }
h1 { font-size: 18px; margin: 0 0 4px; }
header p { margin: 0; font-size: 13px; color: #666; }
.rig { display: grid; grid-template-columns: 320px 1fr; gap: 24px; padding: 20px 24px; align-items: start; }
.knobs { display: flex; flex-direction: column; gap: 10px; max-height: 82vh; overflow: auto; padding-right: 6px; }
.shown { display: flex; flex-direction: column; gap: 16px; }
.preset-row { display: flex; gap: 6px; flex-wrap: wrap; }
.preset-row button, .knobs > button, .verdict button { font: inherit; font-size: 12px; padding: 5px 10px; border: 1px solid #ddd; background: #fff; border-radius: 8px; cursor: pointer; }
.preset-row button:hover, .knobs > button:hover, .verdict button:hover { background: #f3f3f3; }
.knob { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: center; font-size: 12px; color: #444; }
.knob output { color: #111; font-variant-numeric: tabular-nums; }
.knob input { grid-column: 1 / -1; width: 100%; }
.knob input[type="color"], .knob input[type="checkbox"] { width: auto; justify-self: start; }
.dark-row { grid-template-columns: auto 1fr; }
.dark-row input[type="checkbox"] { grid-column: 1; }
.layer { border: 1px solid #eee; border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; background: #fff; }
.layer .head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #777; }
.layer .head button { border: none; background: none; cursor: pointer; color: #b00; font-size: 12px; }
.stage { min-height: 440px; border-radius: 12px; padding: 24px; }
.board { display: flex; flex-wrap: wrap; }
.board .cell { box-sizing: border-box; }
.card-body { padding: 14px 16px; font-size: 13px; font-weight: 600; }
.card-body span { display: block; font-weight: 400; color: var(--text-muted); margin-top: 6px; font-size: 12px; }
.verdict { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.verdict-reach { font-size: 13px; }
.verdict-reach.over { color: #b00; font-weight: 600; }
pre { background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 12px 14px; font-size: 12px; overflow-x: auto; margin: 0; align-self: stretch; }
`;

const LAB = `
const PRESETS = ${JSON.stringify(PRESETS)};
const SHIPPED_PAD = ${JSON.stringify(padFromCss)};
const SHIPPED_RADIUS = ${JSON.stringify(shippedRadius)};

const remToPx = (value) => (value.endsWith("rem") ? parseFloat(value) * 16 : parseFloat(value));
const el = (id) => document.getElementById(id);

let layers = PRESETS.shipped.layers.map((one) => one.slice());
let edge = PRESETS.shipped.edge;

function layerNode(layer, at) {
  const box = document.createElement("div");
  box.className = "layer";
  box.innerHTML =
    '<div class="head"><span>layer ' + (at + 1) + '</span><button type="button" data-drop="' + at + '">remove</button></div>' +
    '<label class="knob">y <output>' + layer[0] + 'px</output><input type="range" data-at="' + at + '" data-part="0" min="0" max="40" step="1" value="' + layer[0] + '"></label>' +
    '<label class="knob">blur <output>' + layer[1] + 'px</output><input type="range" data-at="' + at + '" data-part="1" min="0" max="80" step="1" value="' + layer[1] + '"></label>' +
    '<label class="knob">alpha <output>' + layer[2] + '%</output><input type="range" data-at="' + at + '" data-part="2" min="0" max="20" step="0.5" value="' + layer[2] + '"></label>';
  return box;
}

function shadowValue() {
  return layers.map((one) => "0 " + one[0] + "px " + one[1] + "px rgba(0, 0, 0, " + (one[2] / 100).toFixed(3) + ")").join(", ");
}

function edgeValue() {
  return "inset 0 0 0 1px color-mix(in srgb, var(--text-normal) " + edge + "%, transparent)";
}

function worstReach() {
  return layers.reduce((most, one) => Math.max(most, one[1] / 2 + one[0]), 0);
}

function draw() {
  const radius = Number(el("radius").value);
  const gap = Number(el("gap").value);
  const pad = Number(el("pad").value);
  const dark = el("dark").checked;

  el("radius-out").textContent = radius + "px";
  el("gap-out").textContent = gap + "px";
  el("pad-out").textContent = pad + "px";
  el("edge-out").textContent = edge + "%";

  const stage = el("stage");
  stage.style.background = dark ? "#1e1e1e" : el("field").value;
  stage.style.setProperty("--background-primary", dark ? "#1e1e1e" : "#ffffff");
  stage.style.setProperty("--text-normal", dark ? "#dadada" : "#222222");
  stage.style.setProperty("--text-muted", dark ? "#999999" : "#707070");
  stage.style.setProperty("--wg-widget-radius", radius + "px");
  stage.style.setProperty("--wg-widget-shadow", shadowValue() || "none");
  stage.style.setProperty("--wg-widget-edge", edge > 0 ? edgeValue() : "0 0 0 0 transparent");

  const board = el("board");
  board.style.gap = gap + "px";
  board.innerHTML = "";
  const cards = [["Calendar", "a tall one"], ["Board", "the wide one"], ["Habit", "a short one"], ["Filter", "a button-sized one"]];
  for (const [name, note] of cards) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.style.width = name === "Board" ? "calc(58% - " + gap + "px)" : "calc(38% - " + gap + "px)";
    cell.style.height = name === "Filter" ? "56px" : "150px";
    const root = document.createElement("div");
    root.className = "wg-widget-root";
    root.setAttribute("data-rounded", "base");
    root.setAttribute("data-fill", "fill");
    root.innerHTML = '<div class="card-body">' + name + '<span>' + note + '</span></div>';
    cell.appendChild(root);
    board.appendChild(cell);
  }

  const reach = worstReach();
  const line = el("reach");
  line.textContent = "worst reach " + reach + "px against " + pad + "px of board padding — the shadow gate would " + (reach > pad ? "BLOCK this" : "pass this");
  line.classList.toggle("over", reach > pad);

  el("css").textContent =
    "--wg-widget-shadow: " + (shadowValue() || "none") + ";\\n" +
    "--wg-widget-edge: " + edgeValue() + ";\\n" +
    "--wg-widget-radius-s: " + radius / 16 + "rem;\\n" +
    "--wg-board-pad: " + pad / 16 + "rem;";
}

function paintLayers() {
  const host = el("layers");
  host.innerHTML = "";
  layers.forEach((layer, at) => host.appendChild(layerNode(layer, at)));
  draw();
}

document.addEventListener("input", (event) => {
  const node = event.target;
  if (node.dataset && node.dataset.at !== undefined) {
    layers[Number(node.dataset.at)][Number(node.dataset.part)] = Number(node.value);
    node.previousElementSibling.textContent = node.value + (node.dataset.part === "2" ? "%" : "px");
    draw();
    return;
  }
  if (node.id === "edge") edge = Number(node.value);
  draw();
});

document.addEventListener("click", (event) => {
  const node = event.target;
  if (node.dataset && node.dataset.drop !== undefined) {
    layers.splice(Number(node.dataset.drop), 1);
    paintLayers();
    return;
  }
  if (node.dataset && node.dataset.preset) {
    const preset = PRESETS[node.dataset.preset];
    layers = preset.layers.map((one) => one.slice());
    edge = preset.edge;
    el("edge").value = edge;
    paintLayers();
    return;
  }
  if (node.id === "add-layer") {
    layers.push([4, 8, 3]);
    paintLayers();
    return;
  }
  if (node.id === "copy") {
    navigator.clipboard.writeText(el("css").textContent);
    node.textContent = "copied";
    setTimeout(() => { node.textContent = "copy the declarations"; }, 1200);
  }
});

el("radius").value = remToPx(SHIPPED_RADIUS);
el("pad").value = remToPx(SHIPPED_PAD);
el("gap").value = 8;
el("edge").value = edge;
paintLayers();
`;

const page = `<!doctype html><html><head><meta charset="utf-8"><title>Shadow lab</title>
<style>${kit}</style>
<style>${PAGE_STYLE}</style>
</head><body class="wg-root theme-light">
${CONTROLS}
<script>${LAB}<\/script>
</body></html>`;

const work = mkdtempSync(path.join(tmpdir(), "wg-shadow-lab-"));
const file = path.join(work, "shadow-lab.html");
writeFileSync(file, page);
console.log(`shipped shadow: ${shippedShadow}`);
console.log(`shipped edge:   ${shippedEdge}`);
console.log(`\nshadow lab -> ${file}`);
execFileSync("open", [file]);
