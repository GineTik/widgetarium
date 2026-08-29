// Compiles and renders every widget in widgets/ the way the plugin does — sucrase, the same
// require shim, preact to a string. A widget that only LOOKS right in a review is not
// checked; this fails if it cannot even be built.
import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";
import { buildMirror } from "./mirror.mjs";
import { h, Fragment } from "preact";
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
const kit = await import("./.mjs-cache/kit.mjs");

const api = {
	createWidget: (component, meta) => {
		if (meta) component.meta = meta;
		return component;
	},
	WidgetRoot: (props) => h("div", { class: `wg-widget-root ${props.className ?? ""}` }, props.children),
	Dialog: () => null,
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
	useMemo: (factory) => factory(),
	useRef: () => ({ current: null }),
	useCallback: (fn) => fn,
};

function load(folder) {
	const source = transform(fs.readFileSync(path.join(folder, "widget.jsx"), "utf8"), {
		transforms: ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
	}).code;

	const modules = { widgetarium: api, "widgetarium/kit": kit, preact: { h, Fragment }, "preact/hooks": hooks };
	const shell = { exports: {} };
	new Function("require", "module", "exports", "h", "Fragment", source)(
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
	return shell.exports.default ?? shell.exports;
}

let failed = 0;
const root = "widgets";
for (const scope of fs.readdirSync(root).filter((name) => name.startsWith("@"))) {
	for (const name of fs.readdirSync(path.join(root, scope))) {
		const folder = path.join(root, scope, name);
		if (!fs.existsSync(path.join(folder, "widget.jsx"))) continue;

		try {
			const manifest = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
			const settings = {};
			for (const field of manifest.settings ?? []) if (field.default !== undefined) settings[field.key] = field.default;

			const component = load(folder);
			const html = render(h(component, { settings, size: { w: 6, h: 10, scale: 1 }, host: { ui: {} } }));

			if (!html || html.length < 50) throw new Error("rendered almost nothing");
			const hexes = [...new Set((fs.readFileSync(path.join(folder, "widget.jsx"), "utf8").match(/#[0-9a-fA-F]{6}\b/g) ?? []))];
			console.log(`OK  ${scope}/${name} — ${html.length} chars, ${hexes.length} raw hex ${hexes.length ? `(${hexes.join(" ")})` : ""}`);
		} catch (failure) {
			failed += 1;
			console.log(`!!  ${scope}/${name} — ${failure.message}`);
		}
	}
}

console.log(failed ? `\n${failed} failed` : "\nall widgets build and render");
process.exit(failed ? 1 : 0);
