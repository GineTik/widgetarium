import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";
import { h, Fragment } from "preact";

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

const VOID = new Set(["br", "hr", "img", "input", "path", "circle", "stop", "use", "rect", "line", "ellipse", "polygon"]);

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
		if (key === "dangerouslySetInnerHTML") { inner = value.__html; continue; }
		if (typeof value === "function" || value === false || value == null) continue;
		const name = key === "className" ? "class" : key;
		attributes.push(` ${name}="${key === "style" ? styleString(value) : String(value).replace(/"/g, "&quot;")}"`);
	}
	if (type === "style") return `<style>${props.children}</style>`;
	const body = inner || renderNode(props?.children);
	return VOID.has(type) && !body ? `<${type}${attributes.join("")} />` : `<${type}${attributes.join("")}>${body}</${type}>`;
}

function createRequire(scope) {
	const modules = {
		widgetarium: scope.widgetarium,
		preact: { h: scope.h, Fragment: scope.Fragment },
		"preact/hooks": {
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
			filters: { list: spec.default?.filters ?? [], update: () => ({ appliedFilters: [], rejectedFilters: [] }), canFilterBy: () => true },
			sort: { list: spec.default?.sort ?? [], update: () => ({ appliedSort: [], rejectedSort: [] }), canSortBy: () => true },
			window: { list: { offset: 0, limit: 0 }, update: () => {} },
			canCreate: true, canUpdate: true, canRemove: true,
			openRecord: () => {}, update: async () => null, create: async () => null,
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

	const api = { createWidget: (component, meta) => { if (meta) component.meta = meta; return component; }, Dialog: () => null, useAction: (action) => ({ ...action, run: async () => {}, runIfCan: async () => ({ isBlocked: false }), isLoading: false, error: null }) };

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

const CELL = 40;
const GAP = 12;
const LAYOUT_GRID = [
	{ id: "@wallet/balance", x: 0, y: 0, w: 7, h: 6 },
	{ id: "@wallet/quick-send", x: 0, y: 6, w: 7, h: 4, bind: { contacts: "Widgetarium Demo/Wallet/Contacts" } },
	{ id: "@wallet/period", x: 0, y: 10, w: 7, h: 1 },
	{ id: "@wallet/notice", x: 7, y: 0, w: 5, h: 2 },
	{ id: "@wallet/transactions", x: 7, y: 2, w: 5, h: 8, bind: { transactions: "Widgetarium Demo/Wallet/Transactions" } },
];

const SOLO = [
	{ id: "@crypto-wallet/hero", width: 352, label: "natural, light" },
	{ id: "@crypto-wallet/hero", width: 196, height: 196, size: { w: 4, h: 4 }, label: "minimum 4 x 4" },
	{ id: "@crypto-wallet/hero", width: 352, theme: "dark", label: "dark" },
	{ id: "@crypto-wallet/quick-actions", width: 352, label: "natural, light" },
	{ id: "@crypto-wallet/quick-actions", width: 352, theme: "dark", label: "dark" },
	{
		id: "@crypto-wallet/transactions",
		width: 352,
		label: "natural, light",
		bind: { transactions: "Widgetarium Demo/Wallet/Transactions" },
	},
	{ id: "@core/palette", width: 352, label: "theme palette" },
];

// CONTEXT: the host sets font-size = 16 * tileWidth / design.width
function tileStyle(entry, manifest) {
	if (!entry.height) return `width:${entry.width}px;font-size:16px`;
	const scale = (16 * entry.width) / (manifest.design?.width ?? entry.width);
	return `width:${entry.width}px;height:${entry.height}px;font-size:${scale}px`;
}

const tiles = SOLO.map((entry) => {
	const folder = path.join(WIDGETS, entry.id);
	const manifest = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
	const { component, props } = buildWidget(folder, manifest, entry.bind);
	if (entry.size) props.size = { ...props.size, ...entry.size };
	const caption = entry.label ? `<div class="caption">${entry.id} — ${entry.label}</div>` : "";
	const tile = `<div class="solo" style="${tileStyle(entry, manifest)}">${renderNode(h(component, props))}</div>`;
	if (entry.theme !== "dark") return caption + tile;
	return `<div class="theme-dark deck">${caption}${tile}</div>`;
}).join("\n");

const css = fs.readFileSync("styles.css", "utf8");
fs.writeFileSync(
	OUT,
	`<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:0;background:#ECECEC;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;gap:24px;align-items:flex-start;padding:24px}
.caption{font:12px/1.4 Inter,system-ui,sans-serif;color:#666}
.deck{background:#141414;padding:24px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.deck .caption{color:#8a8a8a}
.theme-dark{--background-primary:#1e1e1e;--background-primary-alt:#1a1a1a;--background-secondary:#161616;--background-modifier-hover:rgba(255,255,255,0.075);--background-modifier-border:#3f3f3f;--text-normal:#dadada;--text-muted:#b3b3b3;--text-faint:rgba(255,255,255,0.35);--text-on-accent:#000000}
:root{--background-primary:#ffffff;--background-primary-alt:#F2F2F2;--background-secondary:#f2f3f5;--background-modifier-hover:#F2F2F2;--background-modifier-active-hover:#EAEAEA;--background-modifier-border:#e0e0e0;--text-normal:#000000;--text-muted:#707070;--text-faint:rgba(0,0,0,0.3);--text-on-accent:#000000;--interactive-accent:#E1FF01;--interactive-accent-hover:#d3f000;--color-green:#147E03;--color-blue:#084CCA;--font-interface:Inter,system-ui,sans-serif;--radius-l:14px}
.solo{--wg-card:var(--background-primary)}
.solo,.solo *{box-sizing:border-box}
.solo button,.solo input{font:inherit}
${css}
</style></head><body>${tiles}</body></html>`,
);
console.log("written", OUT);
