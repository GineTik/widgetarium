import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "KeyboardEvent", "MouseEvent", "PointerEvent", "Event", "MutationObserver"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { TEMPLATES, templateWidgets, missingWidgets, templateBoard, templateSketch } = await import("./.mjs-cache/templates.mjs");
const { boardNoteText } = await import("./.mjs-cache/board-note.mjs");
const { findBlocks } = await import("./.mjs-cache/block-writer.mjs");
const { normalizeBoard, serializeBoard } = await import("./.mjs-cache/model.mjs");
const { blockRefusal } = await import("./.mjs-cache/version.mjs");
const { Catalogue } = await import("./.mjs-cache/catalogue.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

const template = TEMPLATES[0];

function everyTileIn(one) {
	const out = [];
	const walk = (held, at) => {
		for (const [key, tile] of held) {
			const id = at ? `${at}/${key}` : key;
			out.push({ id, widget: tile.widget, props: tile.props ?? {} });
			walk(Object.entries(tile.mounted ?? {}), id);
		}
	};
	walk(one.board.tiles.map((tile) => [tile.id, tile]), null);
	return out;
}

const tiles = everyTileIn(template);
const standing = new Map(tiles.map((tile) => [tile.widget, tile.id]));
const manifestOf = (id) => JSON.parse(fs.readFileSync(`widgets/${id}/manifest.json`, "utf8"));

check("the shelf offers at least one template", TEMPLATES.length > 0, true);
check("the template names every widget it stands on, mounted and slotted alike", templateWidgets(template).sort(), [
	"@core/editable-tabs",
	"@core/filter-panel",
	"@core/view-group",
	"@task/kanban-board",
	"@task/task-card",
	"@task/view-tabs",
]);
check("a vault holding none of them is asked for all of them", missingWidgets(template, () => false).length, templateWidgets(template).length);
check("a vault holding all of them is asked for nothing", missingWidgets(template, () => true), []);
check("and only what it lacks", missingWidgets(template, (id) => id !== "@task/task-card"), ["@task/task-card"]);
check("every widget it names is one this repository actually ships", templateWidgets(template).filter((id) => !fs.existsSync(`widgets/${id}/manifest.json`)), []);

function wantsIn(manifest) {
	const found = [];
	for (const [prop, spec] of Object.entries(manifest.props ?? {})) {
		if (typeof spec.wants === "string") found.push({ prop, wants: spec.wants });
		for (const row of spec.default?.where ?? []) {
			const wants = row?.spread?.wants ?? row?.value?.wants;
			if (typeof wants === "string") found.push({ prop, wants });
		}
	}
	return found;
}

function refsAuthored(tile, prop) {
	const config = tile.props?.[prop] ?? {};
	const rows = (config.where ?? []).map((row) => row?.spread?.ref ?? row?.value?.ref).filter(Boolean);
	return [...(typeof config.ref === "string" ? [config.ref] : []), ...rows];
}

const unanswered = [];
const dangling = [];
for (const tile of tiles) {
	for (const want of wantsIn(manifestOf(tile.widget))) {
		const at = want.wants.lastIndexOf("/");
		const holder = standing.get(want.wants.slice(0, at));
		if (!holder) continue;
		const expected = `${holder}/${want.wants.slice(at + 1)}`;
		if (!refsAuthored(tile, want.prop).includes(expected)) unanswered.push(`${tile.id}.${want.prop} -> ${expected}`);
	}
	for (const prop of Object.keys(tile.props)) {
		for (const ref of refsAuthored(tile, prop)) {
			if (!tiles.some((held) => ref.startsWith(`${held.id}/`))) dangling.push(`${tile.id}.${prop} -> ${ref}`);
		}
	}
}
check("every want the manifests declare is answered by a ref the template writes", unanswered, []);
check("and no ref it writes points at a tile the template does not hold", dangling, []);

const board = templateBoard(template);
const cells = templateSketch(template).flatMap((region) => region.rows.flat());
check("the board is born with all three regions", Object.keys(board.layout), ["left", "main", "right"]);
check("both sidebars are born empty", [board.layout.left.rows.length, board.layout.right.rows.length], [0, 0]);
check("every cell in the tree names a tile the board holds", cells.filter((cell) => !board.tiles.some((tile) => tile.id === cell.id)), []);
check("and every tile the board holds stands in the tree", board.tiles.filter((tile) => !cells.some((cell) => cell.id === tile.id)), []);
check("a cell of a one-view holder is named after the view it draws", cells.find((cell) => cell.id === "board").widget, "@task/kanban-board");
check("and every cell of the sketch names the widget standing in it", cells.filter((cell) => !cell.widget), []);

const note = boardNoteText(board);
const lines = note.split("\n");
const blocks = findBlocks(lines).map((block) => lines.slice(block.start + 1, block.end).join("\n"));
check("the note holds exactly one board", blocks.length, 1);
const written = parseYaml(blocks[0]);
check("the board is written in the format this plugin reads", blockRefusal(written), null);
check("it is a tree, never a grid", "layouts" in written, false);
check("and it opens as a page, because a template is a whole screen", written.mode, "expanded");
check("every tile survives the write", written.tiles.map((tile) => tile.id), ["boards", "filter", "views", "board"]);
check("the mounted kanban survives it too", written.tiles[3].mounted.Kanban.widget, "@task/kanban-board");
check("with the card slot it draws through", written.tiles[3].mounted.Kanban.slots.card.widget, "@task/task-card");
check("and the refs it was authored with", written.tiles[3].mounted.Kanban.props.selection.ref, "boards/selection");
check("reading it back changes nothing", serializeBoard(normalizeBoard(written)), written);

const definition = (id, title) => ({ manifest: { id, title, defaultSize: { w: 3, h: 2 } }, component: () => h("div", null, title) });
const registry = { list: () => [definition("@task/task-card", "Task card")], get: (id) => (id === "@task/task-card" ? definition(id, "Task card") : null) };

const panel = dom.window.document.getElementById("host");
const used = [];
const steps = [];
let answer = { ok: true };
const draw = (mode) =>
	render(
		h(Catalogue, {
			registry,
			host: null,
			mode,
			available: [],
			templates: TEMPLATES,
			onUseTemplate: async (one, onStep) => {
				used.push(one.id);
				onStep("@core/editable-tabs");
				await settle();
				steps.push(panel.querySelector(".wg-tpl-step")?.textContent ?? null);
				return answer;
			},
		}),
		panel,
	);

draw("browse");
await settle();
const all = (selector) => [...panel.querySelectorAll(selector)];
check("browsing offers both shelves", all(".wg-cat-shelf button").map((node) => node.textContent), ["Widgets", "Templates"]);
check("and opens on the widgets", all(".wg-tpl-tile").length, 0);

all(".wg-cat-shelf button")[1].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("the templates shelf draws a card per template", all(".wg-tpl-tile").length, TEMPLATES.length);
check("named after the template", all(".wg-tpl-name").map((node) => node.textContent), TEMPLATES.map((one) => one.title));
check("with nothing left to narrow a widget by", [all(".wg-cat-facet").length, all(".wg-cat-show").length], [0, 0]);
check("the card draws the page's own tree, not a widget", all(".wg-tpl-region").map((node) => node.className.split("is-")[1]), ["left", "main", "right"]);
check("labelled with the widgets that stand in it", all(".wg-tpl-cell").map((node) => node.textContent), ["@core/editable-tabs", "@core/filter-panel", "@task/view-tabs", "@task/kanban-board"]);

panel.querySelector(".wg-tpl-tile").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
await settle();
check("pressing a card asks for that template", used, [template.id]);
check("and says which widget it is fetching while it waits", steps, ["Installing @core/editable-tabs…"]);
check("a template that was built leaves no complaint on the card", panel.querySelector(".wg-tpl-tile .wg-cat-lack.is-failure"), null);

answer = { ok: false, failure: "the repository answered 404" };
panel.querySelector(".wg-tpl-tile").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
await settle();
check("one that could not be built says why, where it was pressed", panel.querySelector(".wg-tpl-tile .wg-cat-lack.is-failure")?.textContent, "the repository answered 404");

render(null, panel);
draw("template");
await settle();
check("the command's own dialog opens on the templates", all(".wg-tpl-tile").length, TEMPLATES.length);
check("and offers no shelf to switch away from them", all(".wg-cat-shelf").length, 0);

const searched = panel.querySelector("input");
searched.value = "kanban";
searched.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
await settle();
check("a search the template answers keeps it", all(".wg-tpl-tile").length, 1);
searched.value = "zzzz";
searched.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
await settle();
check("one it does not empties the shelf", all(".wg-tpl-tile").length, 0);
check("and says so", panel.querySelector(".wg-cat-none")?.textContent, "No template answers to that.");

render(null, panel);
console.log(failed === 0 ? "\ntemplate: clean" : `\ntemplate: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
