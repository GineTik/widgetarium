import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";
import { createElement as h, Fragment } from "react";

// minimal browser stubs: the harness renders to a string, widgets may still probe the DOM
globalThis.document ??= { body: {} };
globalThis.getComputedStyle ??= () => ({ getPropertyValue: () => "", fontSize: "16px" });
globalThis.ResizeObserver ??= class {
	observe() {}
	disconnect() {}
};

const VAULT = "/Users/denissevcuk/Documents/Obsidian/Personal/Personal";
const WIDGETS = path.join(VAULT, ".widgetarium/widgets");
const OUT = process.argv[2];

const VOID = new Set([
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

function styleString(value) {
	if (typeof value === "string") return value;
	return Object.entries(value)
		.map(([key, item]) => `${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}:${item}`)
		.join(";");
}

function escapeText(value) {
	return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderNode(node) {
	if (node === null || node === undefined || node === false || node === true) return "";
	if (Array.isArray(node)) return node.map(renderNode).join("");
	if (typeof node !== "object") return escapeText(node);

	const { type, props } = node;
	if (type === Fragment) return renderNode(props.children);
	if (typeof type === "function") return renderNode(type(props ?? {}));

	const attributes = [];
	let inner = "";
	for (const [key, value] of Object.entries(props ?? {})) {
		if (key === "children") continue;
		if (key === "dangerouslySetInnerHTML") {
			inner = value.__html;
			continue;
		}
		if (typeof value === "function" || value === false || value == null) continue;
		const name = key === "className" ? "class" : key;
		attributes.push(` ${name}="${key === "style" ? styleString(value) : String(value).replace(/"/g, "&quot;")}"`);
	}
	if (type === "style") return `<style>${props.children}</style>`;
	const body = inner || renderNode(props?.children);
	return VOID.has(type) && !body
		? `<${type}${attributes.join("")} />`
		: `<${type}${attributes.join("")}>${body}</${type}>`;
}

function createRequire(scope) {
	const modules = {
		widgetarium: scope.widgetarium,
		react: {
			createElement: scope.h,
			Fragment: scope.Fragment,
			useState: scope.useState,
			useEffect: scope.useEffect,
			useMemo: scope.useMemo,
			useRef: scope.useRef,
		},
	};
	return (name) => {
		const found = modules[name];
		if (!found) throw new Error(`cannot import "${name}"`);
		return found;
	};
}

function readFrontmatter(file) {
	const text = fs.readFileSync(file, "utf8");
	const match = text.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	const props = {};
	for (const line of match[1].split("\n")) {
		const index = line.indexOf(":");
		if (index < 0) continue;
		props[line.slice(0, index).trim()] = line.slice(index + 1).trim();
	}
	return props;
}

function folderRecords(folder) {
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

function buildWidget(folder, manifest, bindings) {
	const source = transform(fs.readFileSync(path.join(folder, "widget.jsx"), "utf8"), {
		transforms: ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
	}).code;

	const settings = {};
	for (const field of manifest.settings ?? []) if (field.default !== undefined) settings[field.key] = field.default;

	const sources = {};
	for (const [key, spec] of Object.entries(manifest.sources ?? {})) {
		const rows = folderRecords(bindings?.[key] ?? "");
		const seed = spec.default?.sort?.[0];
		const sorted = seed
			? [...rows].sort((a, b) => {
					const left = a.props[seed.prop] ?? a.name;
					const right = b.props[seed.prop] ?? b.name;
					return (left > right ? 1 : left < right ? -1 : 0) * (seed.dir === "desc" ? -1 : 1);
				})
			: rows;
		sources[key] = {
			name: key,
			binding: { path: bindings?.[key] ?? "" },
			data: { rows: sorted, total: sorted.length, isLoading: false },
			filters: {
				list: spec.default?.filters ?? [],
				update: () => ({ appliedFilters: [], rejectedFilters: [] }),
				canFilterBy: () => true,
			},
			sort: {
				list: spec.default?.sort ?? [],
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

	const actions = {};
	for (const key of Object.keys(manifest.actions ?? {})) {
		actions[key] = { can: true, blockedReason: null, run: async () => null };
	}

	const props = {
		settings,
		size: { w: 7, h: 6, scale: 1 },
		fullscreen: { isFullscreen: false, canFullscreen: true, open() {}, close() {}, toggle() {} },
		host: { ui: { notify() {}, openNote() {} }, can: { fullscreen: true } },
		...sources,
		...actions,
	};

	const api = {
		DialogOverlay: () => null,
		DialogContent: (p) => h("div", { className: "wg-dialog" }, p.children),
		DialogClose: () => null,
		WidgetRoot: (props) =>
			h(
				"div",
				{
					className: "wg-widget-root " + (props.className || ""),
					"data-rounded": props.roundedType || "base",
					"data-fill": props.fillType || "fill",
				},
				props.children,
			),
		createWidget: (component, meta) => {
			if (meta) component.meta = meta;
			return component;
		},
		Dialog: () => null,
		ConfirmDialog: () => null,
		DialogHeader: (p) => h("div", null, p.children),
		DialogTitle: (p) => h("h2", null, p.children),
		DialogDescription: (p) => h("p", null, p.children),
		DialogFooter: (p) => h("div", null, p.children),
		useAction: (action) => ({
			...action,
			run: async () => {},
			runIfCan: async () => ({ isBlocked: false }),
			isLoading: false,
			error: null,
		}),
	};

	const scope = {
		widgetarium: api,
		h,
		Fragment,
		useState: (initial) => [initial, () => {}],
		useEffect: () => {},
		useMemo: (factory) => factory(),
		useRef: () => ({ current: null }),
	};

	const shell = { exports: {} };
	new Function("require", "module", "exports", ...Object.keys(scope), source)(
		createRequire(scope),
		shell,
		shell.exports,
		...Object.values(scope),
	);
	return { component: shell.exports.default ?? shell.exports, props };
}

const PIECES = [
	{ id: "@crypto-wallet/hero", w: 9, h: 7 },
	{ id: "@crypto-wallet/quick-actions", w: 9, h: 4 },
	{ id: "@core/palette", w: 4, h: 4 },
	{ id: "@crypto-wallet/transactions", w: 10, h: 11, bind: { transactions: "Widgetarium Demo/Wallet/Transactions" } },
];

const ABSTRACT = [
	{ w: 1, h: 1 },
	{ w: 2, h: 2 },
	{ w: 4, h: 4 },
	{ w: 6, h: 2 },
	{ w: 3, h: 5 },
];

function gridItem(w, h, label, body, extraClass = "") {
	return `<div class="item ${extraClass}" data-w="${w}" data-h="${h}" style="grid-column:span ${w};grid-row:span ${h}">
		<span class="tag">${label}</span>${body}</div>`;
}

const abstractItems = ABSTRACT.map((b) =>
	gridItem(b.w, b.h, `${b.w}×${b.h}`, `<div class="abstract"><span class="dot"></span></div>`),
).join("\n");

const widgetItems = PIECES.map((piece) => {
	const folder = path.join(WIDGETS, piece.id);
	const manifest = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
	const { component, props } = buildWidget(folder, manifest, piece.bind);
	return gridItem(piece.w, piece.h, `${piece.id} · ${piece.w}×${piece.h}`, renderNode(h(component, props)), "widget");
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
