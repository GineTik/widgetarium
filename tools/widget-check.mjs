// Compiles and renders every widget in registry/ the way the plugin does — sucrase, the same
// require shim, preact to a string. A widget that only LOOKS right in a review is not
// checked; this fails if it cannot even be built.
import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";
import { buildMirror } from "./mirror.mjs";
import { createElement as h, Fragment } from "react";
// preact-render-to-string is NOT a dependency of this repo, and adding one just to check
// widgets is not worth it. Walking the vnode tree is a dozen lines and has no install step.
function render(vnode) {
	if (vnode === null || vnode === undefined || typeof vnode === "boolean") return "";
	if (Array.isArray(vnode)) return vnode.map(render).join("");
	if (typeof vnode !== "object") return String(vnode);

	const { type, props } = vnode;
	if (type === Fragment) return render(props.children);
	if (typeof type === "function") return render(type(props ?? {}));

	const inner = props?.dangerouslySetInnerHTML?.__html ?? render(props?.children);
	return `<${type}>${inner}</${type}>`;
}

globalThis.document ??= { body: {} };
globalThis.getComputedStyle ??= () => ({ getPropertyValue: () => "", fontSize: "16px" });
globalThis.ResizeObserver ??= class {
	observe() {}
	disconnect() {}
};

// CONTEXT: the REAL kit, not a shim — a stub here would pass widgets the plugin cannot render
buildMirror();
const kit = await import("./.mjs-cache/index.mjs");
const { previewGateways } = await import("./.mjs-cache/preview.mjs");
const { manifestOf } = await import("./.mjs-cache/engine/catalogue-index.mjs");

const api = {
	createWidget: (component, meta) => {
		if (meta) component.meta = meta;
		return component;
	},
	WidgetRoot: (props) => h("div", { className: `wg-widget-root ${props.className ?? ""}` }, props.children),
	Dialog: () => null,
	ConfirmDialog: () => null,
	DialogOverlay: () => null,
	DialogContent: (props) => h("div", null, props.children),
	DialogClose: () => null,
	DialogHeader: (props) => h("div", null, props.children),
	DialogTitle: (props) => h("h2", null, props.children),
	DialogDescription: (props) => h("p", null, props.children),
	DialogFooter: (props) => h("div", null, props.children),
	useAction: (action) => ({ ...action, run: async () => {}, isLoading: false, error: null }),
};

const hooks = {
	useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
	useEffect: () => {},
	useLayoutEffect: () => {},
	useMemo: (factory) => factory(),
	useRef: () => ({ current: null }),
	useCallback: (fn) => fn,
};

// CONTEXT: the same four specifiers the plugin serves, plus whatever lib each scope carries
const libs = new Map();

function run(file, source) {
	const code = transform(source, {
		transforms: file.endsWith(".tsx") || file.endsWith(".ts") ? ["typescript", "jsx", "imports"] : ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath: file,
	}).code;

	const modules = {
		widgetarium: api,
		"widgetarium/kit": kit,
		react: { createElement: h, Fragment, ...hooks },
		...Object.fromEntries(libs),
	};
	const shell = { exports: {} };
	new Function("require", "module", "exports", "h", "Fragment", code)(
		(name) => {
			const found = modules[name];
			if (!found) throw new Error(`cannot import "${name}"`);
			return found;
		},
		shell,
		shell.exports,
		h,
		Fragment,
	);
	return shell.exports;
}

// CONTEXT: the same ladder the registry walks — a tool blind to a rename passes on nothing
const WIDGET_FILES = ["widget.tsx", "widget.ts", "widget.jsx", "widget.js"];

function widgetFile(folder) {
	return WIDGET_FILES.map((name) => path.join(folder, name)).find((at) => fs.existsSync(at)) ?? null;
}

function load(folder) {
	const file = widgetFile(folder);
	const shell = run(file, fs.readFileSync(file, "utf8"));
	return shell.default ?? shell;
}

let failed = 0;
const root = "registry";
const scopes = fs.readdirSync(root).filter((name) => name.startsWith("@"));

for (const scope of scopes) {
	const file = path.join(root, scope, "lib.js");
	if (fs.existsSync(file)) libs.set(`${scope}/lib`, run(file, fs.readFileSync(file, "utf8")));
}

for (const scope of scopes) {
	for (const name of fs.readdirSync(path.join(root, scope))) {
		const folder = path.join(root, scope, name);
		if (!widgetFile(folder)) continue;

		try {
			const record = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
			const component = load(folder);
			const manifest = manifestOf(record, component);
			const html = render(
				h(component, { ...previewGateways(manifest), size: { w: 6, h: 10, scale: 1 }, host: { ui: {} } }),
			);

			if (!html || html.length < 50) throw new Error("rendered almost nothing");
			const hexes = [...new Set(fs.readFileSync(widgetFile(folder), "utf8").match(/#[0-9a-fA-F]{6}\b/g) ?? [])];
			console.log(
				`OK  ${scope}/${name} — ${html.length} chars, ${hexes.length} raw hex ${hexes.length ? `(${hexes.join(" ")})` : ""}`,
			);
		} catch (failure) {
			failed += 1;
			console.log(`!!  ${scope}/${name} — ${failure.message}`);
		}
	}
}

console.log(failed ? `\n${failed} failed` : "\nall widgets build and render");
process.exit(failed ? 1 : 0);
