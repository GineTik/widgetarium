import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";
import { createElement as h, Fragment, type ReactElement, type ReactNode } from "react";
import { isObject } from "../packages/core/src/engine/is-object.js";

type Held<T> = T | null | undefined;

interface ChildrenProps {
	readonly children?: ReactNode;
}

interface TileSize {
	readonly w: number;
	readonly h: number;
	readonly scale?: number;
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

interface PlacedTile {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
	readonly bind?: Readonly<Record<string, string>>;
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

function buildWidget(
	folder: string,
	manifest: unknown,
	bindings: Held<Readonly<Record<string, string>>>,
	size: TileSize = { w: 7, h: 6 },
): BuiltWidget {
	const source = transform(fs.readFileSync(path.join(folder, "widget.jsx"), "utf8"), {
		transforms: ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
	}).code;

	const props = {
		settings: settingDefaultsOf(manifest),
		size: { w: size.w, h: size.h, scale: size.scale ?? 1 },
		fullscreen: { isFullscreen: false, canFullscreen: true, open() {}, close() {}, toggle() {} },
		host: { ui: { notify() {}, openNote() {} }, can: { fullscreen: true } },
		...sourcesOf(manifest, bindings),
		...actionsOf(manifest),
	};

	const api = {
		createWidget: (component: object, meta: unknown): object => {
			if (meta) Object.assign(component, { meta });
			return component;
		},
		Dialog: (): null => null,
		ConfirmDialog: (): null => null,
		DialogOverlay: (): null => null,
		DialogContent: (p: ChildrenProps): ReactElement => h("div", { className: "wg-dialog" }, p.children),
		DialogClose: (): null => null,
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

const LAYOUT: readonly PlacedTile[] = [
	{ id: "@core/palette", x: 0, y: 0, w: 4, h: 4 },
	{ id: "@wallet/balance", x: 4, y: 0, w: 7, h: 6 },
	{ id: "@wallet/notice", x: 0, y: 4, w: 4, h: 2 },
	{
		id: "@wallet/transactions",
		x: 0,
		y: 6,
		w: 5,
		h: 8,
		bind: { transactions: "Widgetarium Demo/Wallet/Transactions" },
	},
	{ id: "@wallet/quick-send", x: 5, y: 6, w: 6, h: 4, bind: { contacts: "Widgetarium Demo/Wallet/Contacts" } },
];

const CELL = 45.3;
const GAP = 12;
const PAD = 12;
const COLUMNS = 12;
const ONE_BOARD_SCALE_AS_THE_HOST_DOES = CELL / 40;

const tiles = LAYOUT.map((entry) => {
	const folder = path.join(WIDGETS, entry.id);
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
	const width = entry.w * CELL + (entry.w - 1) * GAP;
	const height = entry.h * CELL + (entry.h - 1) * GAP;
	const scale = ONE_BOARD_SCALE_AS_THE_HOST_DOES;
	const { component, props } = buildWidget(folder, manifest, entry.bind, { w: entry.w, h: entry.h, scale });

	const left = entry.x * (CELL + GAP);
	const top = entry.y * (CELL + GAP);
	return `<div class="wg-tile" style="transform:translate3d(${left}px,${top}px,0);width:${width}px;height:${height}px;font-size:${(scale * 16).toFixed(3)}px"><div class="wg-tile-body">${renderNode({ type: component, props })}</div></div>`;
}).join("\n");

const css = fs.readFileSync("apps/obsidian/styles.css", "utf8");
fs.writeFileSync(
	OUT,
	`<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:var(--background-primary);font-family:Inter,system-ui,sans-serif}
:root{--background-primary:#ffffff;--background-secondary:#f2f3f5;--background-secondary-alt:#e3e5e8;--background-modifier-hover:rgba(0,0,0,0.055);--background-modifier-active-hover:rgba(0,0,0,0.09);--background-modifier-border:#e0e0e0;--text-normal:#222222;--text-muted:#6e6e6e;--text-faint:#999999;--text-on-accent:#ffffff;--interactive-accent:#e1ff01;--interactive-accent-hover:#d3f000;--color-green:#147e03;--color-blue:#084cca;--font-interface:Inter,system-ui,sans-serif;--radius-l:14px}
${css}
</style></head><body><div class="wg-root"><div class="wg-grid" style="width:${COLUMNS * CELL + (COLUMNS - 1) * GAP}px;height:${14 * (CELL + GAP) - GAP}px;padding:${PAD}px;background-size:${CELL + GAP}px ${CELL + GAP}px;background-position:${PAD + CELL / 2}px ${PAD + CELL / 2}px">${tiles}</div></div></body></html>`,
);
console.log("written", OUT);
