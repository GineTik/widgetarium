// BROWSING MUST NOT BE ABLE TO WRITE A VAULT. The catalogue draws a widget with no board, no
// folder and no notes behind it — so every read comes from the manifest and every write is
// refused. A preview that can create a note is a catalogue that edits the vault while you scroll.
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MouseEvent", "Event"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.window.ResizeObserver = globalThis.ResizeObserver;

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { previewProps, previewGateways, previewSize, previewReader, previewHost } = await import("./.mjs-cache/preview.mjs");
const { GRID } = await import("./.mjs-cache/paths.mjs");
const { readFileSync } = await import("node:fs");

let failed = 0;
const checks = [];
function check(label, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	checks.push(label);
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

const kanban = JSON.parse(readFileSync("widgets/@task/kanban-board/manifest.json", "utf8"));
const card = JSON.parse(readFileSync("widgets/@task/task-card/manifest.json", "utf8"));

console.log("— the data a preview draws comes from the manifest —\n");
const gateways = previewGateways(kanban);
const listed = await gateways.tasks.list();
check("the prop the widget declares is answered", listed.total, kanban.preview.props.tasks.rows.length);
check("and the rows carry the widget's own property names", listed.rows[0].value.props.title, "Design the onboarding flow");
check("each row is a record, with a ref of its own", listed.rows[0].ref, "preview/1.md");

console.log("\n— and every way back to the vault is shut —");
check("it cannot create", gateways.tasks.create.can().can, false);
check("it cannot update", gateways.tasks.update.can().can, false);
check("it cannot remove", gateways.tasks.remove.can().can, false);
check(
	"calling one anyway is refused, not a crash",
	await gateways.tasks.create({ props: {} }).then(() => "made", () => "refused"),
	"refused",
);
check(
	"and update the same",
	await gateways.tasks.update({ ref: "preview/1.md", data: {} }).then(() => "made", () => "refused"),
	"refused",
);

console.log("\n— a widget with no source of its own still previews —");
const cardProps = previewProps({ manifest: card }, {});
// the LAW, not the copy: a pinned sample string turns every preview redesign into a test failure
const sampled = card.preview.settings;
const cardDefaults = Object.fromEntries((card.settings ?? []).map((field) => [field.key, field.default]));
check("its settings come from the manifest's sample", cardProps.settings.title, sampled.title);
check("over the manifest's own defaults", cardProps.settings.priority, sampled.priority);
check("and the sample really overrides something", sampled.priority !== cardDefaults.priority, true);
check("and it is handed no gateway it never declared", Object.keys(cardProps).filter((name) => name === "tasks"), []);

console.log("\n— the sample world is local to the preview —");
const boardProps = previewProps({ manifest: kanban }, {});
check("a preview reaches no shared box", boardProps.context, undefined);
check("and it may not configure a board", boardProps.configureBoard({ properties: [] }), false);
check("the board list it reads is the sample's", boardProps.board.properties, ["Status", "Priority", "Assignees"]);

console.log("\n— the size is declared, so a tile knows what it is drawing —");
const size = previewSize(kanban, GRID.cellPx, GRID.gapPx);
const declared = kanban.preview.size;
check("it takes the preview's own size", [size.w, size.h], [declared.w, declared.h]);
check("in pixels the grid agrees with", size.width, declared.w * GRID.cellPx + (declared.w - 1) * GRID.gapPx);
const fallback = previewSize({ defaultSize: { w: 3, h: 1 } }, GRID.cellPx, GRID.gapPx);
check("and falls back to the size the widget takes on a board", [fallback.w, fallback.h], [3, 1]);

console.log("\n— a widget that reads a file reads the manifest's, and nothing else —");
const codeBlock = JSON.parse(readFileSync("widgets/@inline/code-block/manifest.json", "utf8"));
const reading = previewReader(codeBlock);
const fromManifest = await reading.read("main.py");
check("the file the manifest declares is answered", fromManifest.ok, true);
check("with the manifest's own text", fromManifest.text.startsWith("import sys"), true);
const stolen = await reading.read("Personal/Diary.md");
check("a file it never declared is refused", stolen.ok, false);
check("and the refusal says it is a preview, not a vault", /not in this preview/.test(stolen.failure), true);
check("a refused read still answers with a text", stolen.text, "");
check("a manifest declaring no files reads nothing at all", (await previewReader({}).read("main.py")).ok, false);
check("and the widget is handed one, so it never reaches around for a vault", typeof previewProps({ manifest: codeBlock }, {}).reader.read, "function");

console.log("\n— and an environment that can do nothing says so —");
const bare = previewHost(null);
check("it claims no capability", Object.keys(bare.can), []);
check("so a widget asking whether it may render markdown is told no", Boolean(bare.can.renderMarkdown), false);
check("its console refuses to run anything", (await bare.console.run("ls")).ok, false);
check("but a real host behind it is passed through, narrowed", previewHost({ platform: "obsidian", type: "obsidian-desktop", can: { renderMarkdown: true }, console: null, ui: { notify() {}, renderMarkdown() {} } }).can.renderMarkdown, true);
check("and never carries the vault across", "app" in previewHost({ platform: "obsidian", type: "x", can: {}, console: null, ui: { notify() {}, renderMarkdown() {} }, app: {} }), false);

console.log("\n— it really draws —");
const drawnRows = (await previewProps({ manifest: kanban }, {}).tasks.list()).total;
const Leaf = ({ settings }) => h("div", { className: "leaf" }, `${settings.title ?? "?"} · ${drawnRows} rows`);
const mount = dom.window.document.getElementById("host");
render(h(Leaf, previewProps({ manifest: kanban }, {})), mount);
check("the widget is handed the sample rows", mount.textContent.includes("4 rows"), true);

console.log(failed ? `\n${failed} of ${checks.length} failed` : `\n${checks.length} checks: a preview reads its manifest and writes nothing`);
process.exit(failed ? 1 : 0);
