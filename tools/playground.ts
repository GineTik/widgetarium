import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";
import { createElement as h, Fragment, type ReactElement, type ReactNode } from "react";
import { isObject } from "../packages/core/src/engine/is-object.js";

type Held<T> = T | null | undefined;

interface ChildrenProps {
	readonly children?: ReactNode;
}

interface VaultRow {
	readonly ref: { readonly path: string };
	readonly name: string;
	readonly props: Readonly<Record<string, string>>;
}

interface BuiltWidget {
	readonly component: unknown;
	readonly props: Readonly<Record<string, unknown>>;
}

type RenderFunction = (props: Readonly<Record<string, unknown>>) => unknown;

function stubGlobalWhenMissing(name: string, value: unknown): void {
	const held: unknown = Reflect.get(globalThis, name);
	if (held === null || held === undefined) Reflect.set(globalThis, name, value);
}

stubGlobalWhenMissing("document", { body: {} });
stubGlobalWhenMissing("getComputedStyle", () => ({ getPropertyValue: () => "", fontSize: "16px" }));
stubGlobalWhenMissing(
	"ResizeObserver",
	class {
		observe(): void {}
		disconnect(): void {}
	},
);

const VAULT = "/Users/denissevcuk/Documents/Obsidian/Personal/Personal";
const WIDGETS = path.join(VAULT, ".widgetarium/widgets");
const OUT = process.argv[2] ?? "";

const VOID: ReadonlySet<unknown> = new Set([
	"br",
	"hr",
	"img",
	"input",
	"path",
	"circle",
	"stop",
	"use",
	"rect",
	"line",
	"ellipse",
	"polygon",
]);

function fieldOf(value: unknown, key: string): unknown {
	return isObject(value) ? value[key] : undefined;
}

function recordAt(value: unknown, key: string): Readonly<Record<string, unknown>> {
	const held = fieldOf(value, key);
	return isObject(held) ? held : {};
}

function listAt(value: unknown, key: string): readonly unknown[] {
	const held = fieldOf(value, key);
	return Array.isArray(held) ? held : [];
}

function isRenderFunction(value: unknown): value is RenderFunction {
	return typeof value === "function";
}

function styleString(value: unknown): string {
	if (typeof value === "string") return value;
	if (!isObject(value)) return "";
	return Object.entries(value)
		.map(([key, item]) => `${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}:${String(item)}`)
		.join(";");
}

function escapeText(value: unknown): string {
	return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlOf(value: unknown): string {
	const html = fieldOf(value, "__html");
	return typeof html === "string" ? html : "";
}

function renderNode(node: unknown): string {
	if (node === null || node === undefined || node === false || node === true) return "";
	if (Array.isArray(node)) return node.map(renderNode).join("");
	if (typeof node !== "object") return escapeText(node);

	const type = fieldOf(node, "type");
	const given = fieldOf(node, "props");
	const props = isObject(given) ? given : {};
	if (type === Fragment) return renderNode(props["children"]);
	if (isRenderFunction(type)) return renderNode(type(props));

	const attributes: string[] = [];
	let inner = "";
	for (const [key, value] of Object.entries(props)) {
		if (key === "children") continue;
		if (key === "dangerouslySetInnerHTML") {
			inner = htmlOf(value);
			continue;
		}
		if (typeof value === "function" || value === false || value === null || value === undefined) continue;
		const name = key === "className" ? "class" : key;
		attributes.push(` ${name}="${key === "style" ? styleString(value) : String(value).replace(/"/g, "&quot;")}"`);
	}
	const tag = String(type);
	if (type === "style") return `<style>${String(props["children"])}</style>`;
	const body = inner || renderNode(props["children"]);
	return VOID.has(type) && !body
		? `<${tag}${attributes.join("")} />`
		: `<${tag}${attributes.join("")}>${body}</${tag}>`;
}

function createRequire(scope: Readonly<Record<string, unknown>>): (name: string) => unknown {
	const modules: Readonly<Record<string, unknown>> = {
		widgetarium: scope["widgetarium"],
		react: {
			createElement: scope["h"],
			Fragment: scope["Fragment"],
			useState: scope["useState"],
			useEffect: scope["useEffect"],
			useMemo: scope["useMemo"],
			useRef: scope["useRef"],
		},
	};
	return (name) => {
		const found = modules[name];
		if (!found) throw new Error(`cannot import "${name}"`);
		return found;
	};
}

function readFrontmatter(file: string): Readonly<Record<string, string>> {
	const text = fs.readFileSync(file, "utf8");
	const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
	if (block === undefined) return {};
	const props: Record<string, string> = {};
	for (const line of block.split("\n")) {
		const index = line.indexOf(":");
		if (index < 0) continue;
		props[line.slice(0, index).trim()] = line.slice(index + 1).trim();
	}
	return props;
}

function folderRecords(folder: string): VaultRow[] {
	const dir = path.join(VAULT, folder);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((name) => name.endsWith(".md"))
		.map((name) => ({
			ref: { path: `${folder}/${name}` },
			name: name.replace(/\.md$/, ""),
			props: readFrontmatter(path.join(dir, name)),
		}));
}

function sortedBySeed(rows: readonly VaultRow[], seed: unknown): readonly VaultRow[] {
	if (!seed) return rows;
	const prop = String(fieldOf(seed, "prop"));
	const direction = fieldOf(seed, "dir") === "desc" ? -1 : 1;
	return [...rows].sort((a, b) => {
		const left = a.props[prop] ?? a.name;
		const right = b.props[prop] ?? b.name;
		return (left > right ? 1 : left < right ? -1 : 0) * direction;
	});
}

function settingDefaultsOf(manifest: unknown): Record<string, unknown> {
	const settings: Record<string, unknown> = {};
	for (const field of listAt(manifest, "settings")) {
		if (isObject(field) && field["default"] !== undefined) settings[String(field["key"])] = field["default"];
	}
	return settings;
}

function sourcesOf(manifest: unknown, bindings: Held<Readonly<Record<string, string>>>): Record<string, unknown> {
	const sources: Record<string, unknown> = {};
	for (const [key, spec] of Object.entries(recordAt(manifest, "sources"))) {
		const defaults = recordAt(spec, "default");
		const sorted = sortedBySeed(folderRecords(bindings?.[key] ?? ""), listAt(defaults, "sort")[0]);
		sources[key] = {
			name: key,
			binding: { path: bindings?.[key] ?? "" },
			data: { rows: sorted, total: sorted.length, isLoading: false },
			filters: {
				list: defaults["filters"] ?? [],
				update: () => ({ appliedFilters: [], rejectedFilters: [] }),
				canFilterBy: () => true,
			},
			sort: {
				list: defaults["sort"] ?? [],
				update: () => ({ appliedSort: [], rejectedSort: [] }),
				canSortBy: () => true,
			},
			window: { list: { offset: 0, limit: 0 }, update: () => {} },
			canCreate: true,
			canUpdate: true,
			canRemove: true,
			openRecord: () => {},
			update: async () => null,
			create: async () => null,
		};
	}
	return sources;
}

function actionsOf(manifest: unknown): Record<string, unknown> {
	const actions: Record<string, unknown> = {};
	for (const key of Object.keys(recordAt(manifest, "actions"))) {
		actions[key] = { can: true, blockedReason: null, run: async () => null };
	}
	return actions;
}

function runCommonJs(source: string, scope: Readonly<Record<string, unknown>>): unknown {
	const shell: { exports: Record<string, unknown> } = { exports: {} };
	const run: unknown = new Function("require", "module", "exports", ...Object.keys(scope), source);
	if (isRenderFunction(run))
		Reflect.apply(run, undefined, [createRequire(scope), shell, shell.exports, ...Object.values(scope)]);
	return shell.exports["default"] ?? shell.exports;
}

interface WidgetRootProps extends ChildrenProps {
	readonly className?: string;
	readonly roundedType?: string;
	readonly fillType?: string;
}

interface GridPiece {
	readonly id: string;
	readonly w: number;
	readonly h: number;
	readonly bind?: Readonly<Record<string, string>>;
}

interface GridSpan {
	readonly w: number;
	readonly h: number;
}

function buildWidget(folder: string, manifest: unknown, bindings: Held<Readonly<Record<string, string>>>): BuiltWidget {
	const source = transform(fs.readFileSync(path.join(folder, "widget.jsx"), "utf8"), {
		transforms: ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
	}).code;

	const props = {
		settings: settingDefaultsOf(manifest),
		size: { w: 7, h: 6, scale: 1 },
		fullscreen: { isFullscreen: false, canFullscreen: true, open() {}, close() {}, toggle() {} },
		host: { ui: { notify() {}, openNote() {} }, can: { fullscreen: true } },
		...sourcesOf(manifest, bindings),
		...actionsOf(manifest),
	};

	const api = {
		DialogOverlay: (): null => null,
		DialogContent: (p: ChildrenProps): ReactElement => h("div", { className: "wg-dialog" }, p.children),
		DialogClose: (): null => null,
		WidgetRoot: (rootProps: WidgetRootProps): ReactElement =>
			h(
				"div",
				{
					className: "wg-widget-root " + (rootProps.className || ""),
					"data-rounded": rootProps.roundedType || "base",
					"data-fill": rootProps.fillType || "fill",
				},
				rootProps.children,
			),
		createWidget: (component: object, meta: unknown): object => {
			if (meta) Object.assign(component, { meta });
			return component;
		},
		Dialog: (): null => null,
		ConfirmDialog: (): null => null,
		DialogHeader: (p: ChildrenProps): ReactElement => h("div", null, p.children),
		DialogTitle: (p: ChildrenProps): ReactElement => h("h2", null, p.children),
		DialogDescription: (p: ChildrenProps): ReactElement => h("p", null, p.children),
		DialogFooter: (p: ChildrenProps): ReactElement => h("div", null, p.children),
	};

	const scope = {
		widgetarium: api,
		h,
		Fragment,
		useState: (initial: unknown): readonly [unknown, () => void] => [initial, () => {}],
		useEffect: (): void => {},
		useMemo: (factory: () => unknown): unknown => factory(),
		useRef: (): { current: null } => ({ current: null }),
	};

	return { component: runCommonJs(source, scope), props };
}

const PIECES: readonly GridPiece[] = [
	{ id: "@crypto-wallet/hero", w: 9, h: 7 },
	{ id: "@crypto-wallet/quick-actions", w: 9, h: 4 },
	{ id: "@core/palette", w: 4, h: 4 },
	{ id: "@crypto-wallet/transactions", w: 10, h: 11, bind: { transactions: "Widgetarium Demo/Wallet/Transactions" } },
];

const ABSTRACT: readonly GridSpan[] = [
	{ w: 1, h: 1 },
	{ w: 2, h: 2 },
	{ w: 4, h: 4 },
	{ w: 6, h: 2 },
	{ w: 3, h: 5 },
];

function gridItem(w: number, h: number, label: string, body: string, extraClass = ""): string {
	return `<div class="item ${extraClass}" data-w="${w}" data-h="${h}" style="grid-column:span ${w};grid-row:span ${h}">
		<span class="tag">${label}</span>${body}</div>`;
}

const abstractItems = ABSTRACT.map((b) =>
	gridItem(b.w, b.h, `${b.w}×${b.h}`, `<div class="abstract"><span class="dot"></span></div>`),
).join("\n");

const widgetItems = PIECES.map((piece) => {
	const folder = path.join(WIDGETS, piece.id);
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
	const { component, props } = buildWidget(folder, manifest, piece.bind);
	return gridItem(
		piece.w,
		piece.h,
		`${piece.id} · ${piece.w}×${piece.h}`,
		renderNode({ type: component, props }),
		"widget",
	);
}).join("\n");

const css = fs.readFileSync("apps/obsidian/styles.css", "utf8");

fs.writeFileSync(
	OUT,
	`<!doctype html><html><head><meta charset="utf-8"><title>cell size playground</title><style>
:root{--wg-radius-s:4px;--wg-radius-m:8px;--wg-radius-l:12px;--wg-radius-xl:16px;--wg-radius-full:999px;
--wg-widget-radius-s:1rem;--wg-widget-radius-m:1.5rem;--wg-widget-radius-l:1.875rem;--wg-widget-radius-xl:2.5rem;
--wg-widget-radius-full:999px;--wg-widget-radius:1.875rem;--wg-board-pad:1rem;--wg-board-bg:transparent;
--wg-widget-shadow:0 0.1875rem 0.875rem rgba(0,0,0,.08);
--background-primary:#fff;--background-primary-alt:#F2F2F2;--background-secondary:#f2f3f5;
--background-modifier-hover:#F2F2F2;--background-modifier-active-hover:#EAEAEA;--background-modifier-border:#e0e0e0;
--text-normal:#000;--text-muted:#707070;--text-faint:rgba(0,0,0,.3);--text-on-accent:#000;
--interactive-accent:#E1FF01;--interactive-accent-hover:#d3f000;--color-green:#147E03;--color-blue:#084CCA;
--font-interface:Inter,system-ui,sans-serif;
--cell:56px;--gap:16px}

*{box-sizing:border-box}
body{margin:0;background:#E8E8E8;font-family:Inter,system-ui,sans-serif;color:#111}

.bar{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid #d8d8d8;
padding:12px 20px;display:flex;gap:24px;align-items:center;flex-wrap:wrap;font-size:13px}
.bar label{display:flex;gap:8px;align-items:center;white-space:nowrap}
input[type=range]{width:220px}
.readout{font-variant-numeric:tabular-nums;color:#666}
.readout b{color:#111;font-weight:600}

h3{font:600 11px/1 Inter,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#8a8a8a;
margin:0;padding:26px 20px 10px}

/* both layers share ONE grid definition, so a block always lands on whole cells */
.stage{position:relative;margin:0 20px 30px;overflow-x:auto;overflow-y:visible;padding-top:16px}
.gridbg,.grid{display:grid;grid-template-columns:repeat(var(--cols),var(--cell));
grid-auto-rows:var(--cell);gap:var(--gap)}
.gridbg{position:absolute;inset:0;z-index:0}
.gridbg i{background:#fff;opacity:.5;border-radius:4px}
.grid{position:relative;z-index:1}

.item{position:relative;min-width:0;min-height:0}
.tag{position:absolute;left:2px;top:-15px;font:500 10px Inter,sans-serif;color:#999;
white-space:nowrap;pointer-events:none}
.abstract{width:100%;height:100%;background:#fff;border-radius:var(--wg-widget-radius);
box-shadow:var(--wg-widget-shadow);display:flex;align-items:center;justify-content:center}
.abstract .dot{width:40%;height:40%;max-width:26px;max-height:26px;border-radius:22%;background:#111}

${css}
/* the plugin lays tiles out absolutely on its own board; here the CSS grid places them */
.wg-tile,.wg-widget-root{position:relative;transform:none;width:100%;height:100%}
.wg-tile *{box-sizing:border-box}
.wg-tile button,.wg-tile input{font:inherit}
.item.widget>.wg-widget-root,.item.widget>div{width:100%;height:100%}
</style></head><body>

<div class="bar">
  <label>cell <input id="cell" type="range" min="24" max="140" value="56"><span class="readout"><b id="cellV">56</b>px</span></label>
  <label>gap <input id="gap" type="range" min="0" max="40" value="16"><span class="readout"><b id="gapV">16</b>px</span></label>
  <label><input id="tie" type="checkbox"> type follows cell <span class="readout">(the old model)</span></label>
  <span class="readout">1×1 <b id="s1"></b> · 2×2 <b id="s2"></b> · 4×4 <b id="s4"></b> · columns <b id="cols"></b> · 1em <b id="em"></b></span>
</div>

<h3>abstract blocks — every cell is drawn under them</h3>
<div class="stage"><div class="gridbg" id="bg1"></div><div class="grid" id="g1">${abstractItems}</div></div>

<h3>real widgets on the same grid</h3>
<div class="stage"><div class="gridbg" id="bg2"></div><div class="grid" id="g2">${widgetItems}</div></div>

<script>
const cell = document.getElementById("cell");
const gap = document.getElementById("gap");
const tie = document.getElementById("tie");
const root = document.documentElement;

function span(n, c, g) { return n * c + (n - 1) * g; }

function fillBackground(background, grid, columns) {
	const rows = Math.max(1, Math.ceil(grid.getBoundingClientRect().height / (+cell.value + +gap.value)));
	const wanted = columns * rows;
	if (background.childElementCount === wanted) return;
	background.replaceChildren(...Array.from({ length: wanted }, () => document.createElement("i")));
}

function apply() {
	const c = +cell.value;
	const g = +gap.value;
	root.style.setProperty("--cell", c + "px");
	root.style.setProperty("--gap", g + "px");

	const available = innerWidth - 40;
	const columns = Math.max(1, Math.floor((available + g) / (c + g)));
	const widest = Math.max(...[...document.querySelectorAll(".item")].map((el) => +el.dataset.w));
	root.style.setProperty("--cols", Math.max(columns, widest));

	document.getElementById("cellV").textContent = c;
	document.getElementById("gapV").textContent = g;
	document.getElementById("s1").textContent = span(1, c, g) + "px";
	document.getElementById("s2").textContent = span(2, c, g) + "px";
	document.getElementById("s4").textContent = span(4, c, g) + "px";
	document.getElementById("cols").textContent = columns;

	const em = tie.checked ? (c / 40) * 16 : 16;
	document.getElementById("em").textContent = em.toFixed(1) + "px";
	for (const el of document.querySelectorAll(".item.widget")) el.style.fontSize = em + "px";

	const gridColumns = Math.max(columns, widest);
	fillBackground(document.getElementById("bg1"), document.getElementById("g1"), gridColumns);
	fillBackground(document.getElementById("bg2"), document.getElementById("g2"), gridColumns);
}

[cell, gap, tie].forEach((node) => node.addEventListener("input", apply));
addEventListener("resize", apply);
apply();
</script></body></html>`,
);
console.log("written", OUT);
