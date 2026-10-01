import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { JSDOM } from "jsdom";
import { byId, foundAs } from "./dom-find.ts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { Template } from "../packages/core/src/templates.js";
import type { WidgetLookup } from "../packages/core/src/registry.js";
import type { CatalogueMode } from "../packages/core/src/catalogue-install-press.js";
import type { TemplateAnswer } from "../packages/core/src/use-template-build.js";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
const JSDOM_POINTER_EVENT: unknown = Reflect.get(dom.window, "PointerEvent");

class SilentResizeObserver {
	observe(): void {}
	disconnect(): void {}
}
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	KeyboardEvent: dom.window.KeyboardEvent,
	MouseEvent: dom.window.MouseEvent,
	PointerEvent: JSDOM_POINTER_EVENT,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
	ResizeObserver: SilentResizeObserver,
});
Object.assign(dom.window, { ResizeObserver: SilentResizeObserver });
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { TEMPLATES, templateWidgets, templateBoard, templateSketch } = await import("../packages/core/src/templates.js");
const { boardNoteText } = await import("../apps/obsidian/src/board-note.js");
const { findBlocks } = await import("../packages/core/src/block-writer.js");
const { normalizeBoard, serializeBoard, VIEW_GROUP } = await import("../packages/core/src/model.js");
const { swapBoxes } = await import("../packages/core/src/tree.js");
const { blockRefusal } = await import("../packages/core/src/version.js");
const { Catalogue } = await import("../packages/core/src/catalogue.js");

let failed = 0;
const pathIn = (value: unknown, ...keys: readonly string[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);
const listIn = (value: unknown, ...keys: readonly string[]): unknown[] => {
	const held = pathIn(value, ...keys);
	return Array.isArray(held) ? held : [];
};
const lengthOf = (value: unknown): unknown => (Array.isArray(value) ? value.length : undefined);

function check(name: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}
const settle = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 30));

const firstTemplate = TEMPLATES[0];
if (!firstTemplate) throw new Error("core ships no template");
const template: Template = firstTemplate;

interface WalkedTile {
	readonly id: string;
	readonly widget: unknown;
	readonly props: Readonly<Record<string, unknown>>;
}

function everyTileIn(one: Template): WalkedTile[] {
	const out: WalkedTile[] = [];
	const walk = (held: readonly (readonly [string, unknown])[], at: string | null): void => {
		for (const [key, tile] of held) {
			const id = at ? `${at}/${key}` : key;
			const props = pathIn(tile, "props");
			const mounted = pathIn(tile, "mounted");
			out.push({ id, widget: pathIn(tile, "widget"), props: isObject(props) ? props : {} });
			walk(Object.entries(isObject(mounted) ? mounted : {}), id);
		}
	};
	walk(
		one.board.tiles.map((tile) => [tile.id, tile] as const),
		null,
	);
	return out;
}

const tiles = everyTileIn(template);
const boxes = swapBoxes(templateBoard(template).layout).map(({ box }) => box);
const standing = new Map<unknown, unknown>([
	...boxes.map((box) => [VIEW_GROUP, box.id] as const),
	...tiles.map((tile) => [tile.widget, tile.id] as const),
]);
const standsAt = (ref: string): boolean =>
	[...tiles.map((tile) => tile.id), ...boxes.map((box) => box.id)].some((id) => ref.startsWith(`${id}/`));
const manifestOf = (id: unknown): unknown =>
	JSON.parse(fs.readFileSync(`registry/${String(id)}/manifest.generated.json`, "utf8"));

check("the shelf offers at least one template", TEMPLATES.length > 0, true);
check("the template names every widget it stands on, mounted and slotted alike", templateWidgets(template).sort(), [
	"@default/editable-tabs",
	"@default/filter-panel",
	"@default/kanban-board",
	"@default/task-card",
	"@default/view-tabs",
]);
check(
	"every widget it names is one this repository actually ships",
	templateWidgets(template).filter((id) => !fs.existsSync(`registry/${id}/manifest.generated.json`)),
	[],
);

interface Want {
	readonly prop: string;
	readonly wants: string;
}

function wantsIn(manifest: unknown): Want[] {
	const found: Want[] = [];
	const props = pathIn(manifest, "props");
	for (const [prop, spec] of Object.entries(isObject(props) ? props : {})) {
		const wanted = pathIn(spec, "wants");
		if (typeof wanted === "string") found.push({ prop, wants: wanted });
		for (const row of listIn(spec, "default", "where")) {
			const wants = pathIn(row, "spread", "wants") ?? pathIn(row, "value", "wants");
			if (typeof wants === "string") found.push({ prop, wants });
		}
	}
	return found;
}

function refsAuthored(tile: WalkedTile, prop: string): unknown[] {
	const config = tile.props[prop] ?? {};
	const rows = listIn(config, "where")
		.map((row) => pathIn(row, "spread", "ref") ?? pathIn(row, "value", "ref"))
		.filter(Boolean);
	const ref = pathIn(config, "ref");
	return [...(typeof ref === "string" ? [ref] : []), ...rows];
}

const unanswered: string[] = [];
const dangling: string[] = [];
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
			if (!standsAt(String(ref))) dangling.push(`${tile.id}.${prop} -> ${ref}`);
		}
	}
}
check("every want the manifests declare is answered by a ref the template writes", unanswered, []);
check("and no ref it writes points at a tile the template does not hold", dangling, []);

const board = templateBoard(template);
const cells = templateSketch(template).flatMap((region) => region.rows.flat());
check("the board is born with all three regions", board.layout.of.length, 3);
check(
	"both sidebars are born empty",
	[lengthOf(pathIn(board.layout, "of", "0", "of")), lengthOf(pathIn(board.layout, "of", "2", "of"))],
	[0, 0],
);
check(
	"every cell in the tree names a tile the board holds",
	cells.filter((cell) => !board.tiles.some((tile) => tile.id === cell.id)),
	[],
);
check(
	"and every tile the board holds stands in the tree",
	board.tiles.filter((tile) => !cells.some((cell) => cell.id === tile.id)),
	[],
);
check(
	"the view a swap box holds is a tile of the board's own",
	cells.find((cell) => cell.id === "kanban")?.widget,
	"@default/kanban-board",
);
check(
	"and every cell of the sketch names the widget standing in it",
	cells.filter((cell) => !cell.widget),
	[],
);

const note = boardNoteText(board);
const lines = note.split("\n");
const blocks = findBlocks(lines).map((block) => lines.slice(block.start + 1, block.end).join("\n"));
check("the note holds exactly one board", blocks.length, 1);
const parsedBlock: unknown = parseYaml(blocks[0] ?? "");
const written = isObject(parsedBlock) ? parsedBlock : {};
check("the board is written in the format this plugin reads", blockRefusal(written), null);
check("it is a tree, never a grid", "layouts" in written, false);
check("and it opens as a page, because a template is a whole screen", written["mode"], "expanded");
check(
	"every tile survives the write",
	listIn(written, "tiles").map((tile) => pathIn(tile, "id")),
	["boards", "filter", "views", "kanban"],
);
check("the kanban is a tile of its own, standing in the swap box", pathIn(written, "layout", "of", "1", "of", "1"), {
	dir: "swap",
	id: "board",
	strip: false,
	of: [{ id: "kanban", height: 640, name: "Kanban" }],
});
check(
	"with the card slot it draws through",
	pathIn(written, "tiles", "3", "slots", "card", "widget"),
	"@default/task-card",
);
check(
	"and the refs it was authored with",
	pathIn(written, "tiles", "3", "props", "selection", "ref"),
	"boards/selection",
);
check("reading it back changes nothing", serializeBoard(normalizeBoard(written)), written);

const definition = (id: string, title: string) => ({
	manifest: { id, title, defaultSize: { w: 3, h: 2 } },
	component: () => h("div", null, title),
});
const registry: WidgetLookup = {
	list: () => [definition("@default/task-card", "Task card")],
	get: (id) => (id === "@default/task-card" ? definition(id, "Task card") : null),
};

const panel = byId(dom.window.document, "host");
const used: string[] = [];
const steps: (string | null)[] = [];
let answer: TemplateAnswer = { ok: true };
const draw = (mode: CatalogueMode): void =>
	render(
		h(Catalogue, {
			registry,
			host: null,
			mode,
			available: [],
			templates: TEMPLATES,
			onUseTemplate: async (one: Template, onStep: (step: string | null) => void) => {
				used.push(one.id);
				onStep("@default/editable-tabs");
				await settle();
				steps.push(panel.querySelector(".wg-tpl-step")?.textContent ?? null);
				return answer;
			},
		}),
		panel,
	);

draw("browse");
await settle();
const all = (selector: string): Element[] => [...panel.querySelectorAll(selector)];
const press = (node: Element | null | undefined): void => {
	node?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
};
check(
	"browsing offers both shelves",
	all(".wg-cat-shelf button").map((node) => node.textContent),
	["Widgets", "Templates"],
);
check("and opens on the widgets", all(".wg-tpl-tile").length, 0);

press(all(".wg-cat-shelf button")[1]);
await settle();
check("the templates shelf draws a card per template", all(".wg-tpl-tile").length, TEMPLATES.length);
check(
	"named after the template",
	all(".wg-tpl-name").map((node) => node.textContent),
	TEMPLATES.map((one) => one.title),
);
check("with nothing left to narrow a widget by", [all(".wg-cat-facet").length, all(".wg-cat-show").length], [0, 0]);
check(
	"the card draws the page's own tree, not a widget",
	all(".wg-tpl-region").map((node) => node.className.split("is-")[1]),
	["left", "main", "right"],
);
check(
	"labelled with the widgets that stand in it",
	all(".wg-tpl-cell").map((node) => node.textContent),
	["@default/editable-tabs", "@default/filter-panel", "@default/view-tabs", "@default/kanban-board"],
);

press(panel.querySelector(".wg-tpl-tile"));
await settle();
await settle();
check("pressing a card asks for that template", used, [template.id]);
check("and says which widget it is fetching while it waits", steps, ["Installing @default/editable-tabs…"]);
check(
	"a template that was built leaves no complaint on the card",
	panel.querySelector(".wg-tpl-tile .wg-cat-lack.is-failure"),
	null,
);

answer = { ok: false, failure: "the repository answered 404" };
press(panel.querySelector(".wg-tpl-tile"));
await settle();
await settle();
check(
	"one that could not be built says why, where it was pressed",
	panel.querySelector(".wg-tpl-tile .wg-cat-lack.is-failure")?.textContent,
	"the repository answered 404",
);

render(null, panel);
draw("template");
await settle();
check("the command's own dialog opens on the templates", all(".wg-tpl-tile").length, TEMPLATES.length);
check("and offers no shelf to switch away from them", all(".wg-cat-shelf").length, 0);

const searched = foundAs(panel, "input", dom.window.HTMLInputElement);
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
