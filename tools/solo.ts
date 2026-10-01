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

interface SoloTile {
	readonly id: string;
	readonly width: number;
	readonly height?: number;
	readonly size?: Partial<TileSize>;
	readonly theme?: "dark";
	readonly label?: string;
	readonly bind?: Readonly<Record<string, string>>;
}

function buildWidget(
	folder: string,
	manifest: unknown,
	bindings: Held<Readonly<Record<string, string>>>,
	sizeOverride: Held<Partial<TileSize>>,
): BuiltWidget {
	const source = transform(fs.readFileSync(path.join(folder, "widget.jsx"), "utf8"), {
		transforms: ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
	}).code;

	const props = {
		settings: settingDefaultsOf(manifest),
		size: { w: 7, h: 6, scale: 1, ...sizeOverride },
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

const SOLO: readonly SoloTile[] = [
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

function tileStyleScaledToDesignWidth(entry: SoloTile, manifest: unknown): string {
	if (!entry.height) return `width:${entry.width}px;font-size:16px`;
	const scale = (16 * entry.width) / Number(fieldOf(fieldOf(manifest, "design"), "width") ?? entry.width);
	return `width:${entry.width}px;height:${entry.height}px;font-size:${scale}px`;
}

const tiles = SOLO.map((entry) => {
	const folder = path.join(WIDGETS, entry.id);
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
	const { component, props } = buildWidget(folder, manifest, entry.bind, entry.size);
	const caption = entry.label ? `<div class="caption">${entry.id} — ${entry.label}</div>` : "";
	const tile = `<div class="solo" style="${tileStyleScaledToDesignWidth(entry, manifest)}">${renderNode({ type: component, props })}</div>`;
	if (entry.theme !== "dark") return caption + tile;
	return `<div class="theme-dark deck">${caption}${tile}</div>`;
}).join("\n");

const css = fs.readFileSync("apps/obsidian/styles.css", "utf8");
fs.writeFileSync(
	OUT,
	`<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:0;background:#ECECEC;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;gap:24px;align-items:flex-start;padding:24px}
.caption{font:12px/1.4 Inter,system-ui,sans-serif;color:#666}
.deck{background:#141414;padding:24px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.deck .caption{color:#8a8a8a}
.theme-dark{--background-primary:#1e1e1e;--background-primary-alt:#1a1a1a;--background-secondary:#161616;--background-modifier-hover:rgba(255,255,255,0.075);--background-modifier-border:#3f3f3f;--text-normal:#dadada;--text-muted:#b3b3b3;--text-faint:rgba(255,255,255,0.35);--text-on-accent:#000000}
:root{--wg-radius-s:4px;--wg-radius-m:8px;--wg-radius-l:12px;--wg-radius-xl:16px;--wg-radius-full:999px;--wg-widget-radius-s:1rem;--wg-widget-radius-m:1.5rem;--wg-widget-radius-l:1.875rem;--wg-widget-radius-xl:2.5rem;--wg-widget-radius-full:999px;--wg-widget-radius:1.875rem;--wg-board-pad:1rem;--wg-board-bg:transparent;--wg-board-radius:calc(1.875rem + 0.75rem);--wg-widget-shadow:0 0.1875rem 0.875rem rgba(0,0,0,.08);--background-primary:#ffffff;--background-primary-alt:#F2F2F2;--background-secondary:#f2f3f5;--background-modifier-hover:#F2F2F2;--background-modifier-active-hover:#EAEAEA;--background-modifier-border:#e0e0e0;--text-normal:#000000;--text-muted:#707070;--text-faint:rgba(0,0,0,0.3);--text-on-accent:#000000;--interactive-accent:#E1FF01;--interactive-accent-hover:#d3f000;--color-green:#147E03;--color-blue:#084CCA;--font-interface:Inter,system-ui,sans-serif;--radius-l:14px}
.solo{--wg-card:var(--background-primary)}
.solo,.solo *{box-sizing:border-box}
.solo button,.solo input{font:inherit}
${css}
</style></head><body>${tiles}</body></html>`,
);
console.log("written", OUT);
