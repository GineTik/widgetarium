import { createElement as h, Fragment } from "react";
import * as react from "react";
import * as reactDom from "react-dom";
import { transform } from "sucrase";
import { widgetarium, kitModule } from "./api.js";
import { WIDGETS_DIR } from "./paths.js";

const BASE_SCOPE = {
	h,
	Fragment,
	kitModule,
	useState: react.useState,
	useEffect: react.useEffect,
	useMemo: react.useMemo,
	useRef: react.useRef,
};

function compile(source, filePath) {
	return transform(source, {
		transforms: ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath,
	}).code;
}

// CONTEXT: the specifier is the contract with widget authors; what stands behind it is not
function createRequire(libs) {
	const modules = {
		widgetarium,
		"widgetarium/kit": kitModule,
		react,
		"react-dom": reactDom,
		...Object.fromEntries(libs),
	};
	return (name) => {
		const found = modules[name];
		if (!found) throw new Error(`cannot import "${name}" — a widget may only import ${Object.keys(modules).join(", ")}`);
		return found;
	};
}

// TRADE-OFF: one path for a widget and for a lib — two would drift on the first change to either
function runModule(source, filePath, libs) {
	const code = compile(source, filePath);
	const shell = { exports: {} };
	new Function("require", "module", "exports", ...Object.keys(BASE_SCOPE), code)(
		createRequire(libs),
		shell,
		shell.exports,
		...Object.values(BASE_SCOPE),
	);
	return shell.exports;
}

// CONTEXT: a catalogue card draws the widget itself, so code nobody installed still has to run
export function buildWidget({ code, path, lib, libPath, scope }) {
	const libs = new Map();
	if (lib && scope) libs.set(`${scope}/lib`, runModule(lib, libPath, libs));
	const shell = runModule(code, path, libs);
	const exported = shell.default ?? shell;
	if (typeof exported !== "function") throw new Error(`${path}: the file must "export default createWidget(...)"`);
	return exported;
}

// CONTEXT: a widget declares that it may stand in text; claiming no tile size is what says
// it may ONLY stand there. One widget can be both, and most are neither declaration.
function isInlineOnly(entry) {
	return entry?.manifest?.inline === true && !entry?.manifest?.defaultSize;
}

// TRADE-OFF: a function over the list, not a method on the registry — every stand-in registry
// in the tests would otherwise have to grow a second method to say the same thing
export function boardWidgets(entries) {
	return entries.filter((entry) => !isInlineOnly(entry));
}

export function inlineWidgets(entries) {
	return entries.filter((entry) => entry?.manifest?.inline === true);
}

// CONTEXT: the name a widget arrives under — the board owns it from the first write onwards
export function declaredName(registry, id) {
	const manifest = registry?.get(id)?.manifest;
	return manifest?.view ?? manifest?.title ?? id;
}

export class WidgetRegistry {
	constructor(app) {
		this.app = app;
		this.widgets = new Map();
		// CONTEXT: a manifest's `was` is the id it shipped under — read there, write here
		this.renamed = new Map();
		// CONTEXT: one shared module per scope, so four widgets cannot hold four copies of one rule
		this.libs = new Map();
	}

	// CONTEXT: the one place an id is made current, so a board saved after a read carries the new one
	resolveId(id) {
		if (this.widgets.has(id)) return id;
		return this.renamed.get(id) ?? id;
	}

	list() {
		return [...this.widgets.values()];
	}

	get(id) {
		return this.widgets.get(this.resolveId(id)) ?? null;
	}

	async load() {
		this.widgets.clear();
		this.renamed.clear();
		this.libs.clear();
		this.dropStyles();
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(WIDGETS_DIR))) return this.widgets;

		const scopes = (await adapter.list(WIDGETS_DIR)).folders;
		// TRADE-OFF: libs first, all of them — a widget may import a lib from any scope, and a
		// second pass is cheaper than deciding an order between scopes that reference each other
		for (const scope of scopes) await this.loadLib(adapter, scope);

		for (const scope of scopes) {
			// A family of widgets shares one palette, so the sheet belongs to the SCOPE folder,
			// not to each widget. Without this the tokens file was never read at all and every
			// widget referencing var(--orbi-*) rendered unpainted.
			await this.loadStyles(adapter, `${scope}/tokens.css`, scope);
			for (const folder of (await adapter.list(scope)).folders) {
				await this.loadStyles(adapter, `${folder}/styles.css`, folder);
				await this.loadOne(adapter, folder);
			}
		}
		return this.widgets;
	}

	// CONTEXT: the specifier is the scope's own name plus /lib — @habit/lib, beside @habit/heatmap
	async loadLib(adapter, scope) {
		const path = `${scope}/lib.js`;
		if (!(await adapter.exists(path))) return;

		const name = `${scope.slice(WIDGETS_DIR.length + 1)}/lib`;
		try {
			this.libs.set(name, runModule(await adapter.read(path), path, this.libs));
		} catch (failure) {
			// CONTEXT: a lib that will not load takes its widgets with it, so it must be named here
			console.error(`[widgetarium] failed to load ${path}`, failure);
		}
	}

	async loadStyles(adapter, cssPath, owner) {
		if (!(await adapter.exists(cssPath))) return;

		this.styles ??= new Map();
		const element = document.createElement("style");
		element.dataset.widgetarium = owner;
		element.textContent = await adapter.read(cssPath);
		document.head.appendChild(element);
		this.styles.set(owner, element);
	}

	dropStyles() {
		for (const element of this.styles?.values() ?? []) element.remove();
		this.styles?.clear();
	}

	async loadOne(adapter, folder) {
		const manifestPath = `${folder}/manifest.json`;
		if (!(await adapter.exists(manifestPath))) return;

		const jsxPath = `${folder}/widget.jsx`;
		const jsPath = `${folder}/widget.js`;
		const isJsx = await adapter.exists(jsxPath);
		const codePath = isJsx ? jsxPath : jsPath;
		if (!isJsx && !(await adapter.exists(jsPath))) return;

		try {
			const manifest = JSON.parse(await adapter.read(manifestPath));
			const shell = runModule(await adapter.read(codePath), codePath, this.libs);

			const exported = shell.default ?? shell;
			if (typeof exported !== "function") {
				throw new Error(`${folder}: the file must "export default createWidget(...)"`);
			}

			this.widgets.set(manifest.id, { manifest: { ...exported.meta, ...manifest }, component: exported, folder });
			for (const id of [].concat(manifest.was ?? [])) this.renamed.set(id, manifest.id);
		} catch (failure) {
			console.error(`[widgetarium] failed to load ${folder}`, failure);
			const id = folder.slice(WIDGETS_DIR.length + 1);
			this.widgets.set(id, { manifest: { id, title: id }, error: failure, folder });
		}
	}
}
