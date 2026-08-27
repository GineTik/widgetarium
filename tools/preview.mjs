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

function buildWidget(folder, manifest, bindings, size = { w: 7, h: 6 }) {
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
		size: { w: size.w, h: size.h, scale: size.scale ?? 1 },
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

const LAYOUT = [
	{ id: "@core/palette", x: 0, y: 0, w: 4, h: 4 },
	{ id: "@wallet/balance", x: 4, y: 0, w: 7, h: 6 },
	{ id: "@wallet/notice", x: 0, y: 4, w: 4, h: 2 },
	{ id: "@wallet/transactions", x: 0, y: 6, w: 5, h: 8, bind: { transactions: "Widgetarium Demo/Wallet/Transactions" } },
	{ id: "@wallet/quick-send", x: 5, y: 6, w: 6, h: 4, bind: { contacts: "Widgetarium Demo/Wallet/Contacts" } },
];

const CELL = 45.3;
const GAP = 12;
const PAD = 12;
const COLUMNS = 12;

const tiles = LAYOUT.map((entry) => {
	const folder = path.join(WIDGETS, entry.id);
	const manifest = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
	const width = entry.w * CELL + (entry.w - 1) * GAP;
	const height = entry.h * CELL + (entry.h - 1) * GAP;
	const scale = CELL / 40;  // one board scale, as the host now does
	const { component, props } = buildWidget(folder, manifest, entry.bind, { w: entry.w, h: entry.h, scale });
	
	const left = entry.x * (CELL + GAP);
	const top = entry.y * (CELL + GAP);
	return `<div class="wg-tile" style="transform:translate3d(${left}px,${top}px,0);width:${width}px;height:${height}px;font-size:${(scale * 16).toFixed(3)}px"><div class="wg-tile-body">${renderNode(h(component, props))}</div></div>`;
}).join("\n");

const css = fs.readFileSync("styles.css", "utf8");
fs.writeFileSync(
	OUT,
	`<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:var(--background-primary);font-family:Inter,system-ui,sans-serif}
:root{--background-primary:#ffffff;--background-secondary:#f2f3f5;--background-secondary-alt:#e3e5e8;--background-modifier-hover:rgba(0,0,0,0.055);--background-modifier-active-hover:rgba(0,0,0,0.09);--background-modifier-border:#e0e0e0;--text-normal:#222222;--text-muted:#6e6e6e;--text-faint:#999999;--text-on-accent:#ffffff;--interactive-accent:#e1ff01;--interactive-accent-hover:#d3f000;--color-green:#147e03;--color-blue:#084cca;--font-interface:Inter,system-ui,sans-serif;--radius-l:14px}
${css}
</style></head><body><div class="wg-root"><div class="wg-grid" style="width:${COLUMNS * CELL + (COLUMNS - 1) * GAP}px;height:${14 * (CELL + GAP) - GAP}px;padding:${PAD}px;background-size:${CELL + GAP}px ${CELL + GAP}px;background-position:${PAD + CELL / 2}px ${PAD + CELL / 2}px">${tiles}</div></div></body></html>`,
);
console.log("written", OUT);
