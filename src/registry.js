import { createElement as h, Fragment } from "react";
import * as react from "react";
import * as reactDom from "react-dom";
import { transform } from "sucrase";
import { widgetarium, kitModule, emojiModule } from "./api.js";
import { apiRefusal } from "./version.js";
import { WIDGETS_DIR, LOCK_PATH } from "./paths.js";
import { EMPTY_LOCK, readLock, modulesByWidget } from "./engine/widget-lock.js";

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
	// CONTEXT: sucrase strips types, it checks nothing — the contract is enforced at the call
	const typed = /\.tsx?$/.test(String(filePath ?? ""));
	return transform(source, {
		transforms: typed ? ["typescript", "jsx", "imports"] : ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath,
	}).code;
}

function parsedLock(text) {
	try {
		return readLock(JSON.parse(text));
	} catch {
		return EMPTY_LOCK;
	}
}

// CONTEXT: the specifier is the contract with widget authors; what stands behind it is not
function createRequire(libs, packages) {
	const modules = {
		widgetarium,
		"widgetarium/kit": kitModule,
		"widgetarium/kit/emojis": emojiModule,
		react,
		"react-dom": reactDom,
		...Object.fromEntries(libs),
	};
	return (name) => {
		const found = modules[name] ?? packages?.take(name);
		if (!found) throw new Error(`cannot import "${name}" — a widget may only import ${[...Object.keys(modules), ...(packages?.names ?? [])].join(", ")}`);
		return found;
	};
}

function componentIn(shell, at) {
	const exported = shell.default ?? shell;
	if (typeof exported !== "function") throw new Error(`${at}: the file must "export default createWidget(...)"`);
	return exported;
}

// TRADE-OFF: one path for a widget and for a lib — two would drift on the first change to either
function runModule(source, filePath, libs, packages) {
	const code = compile(source, filePath);
	const shell = { exports: {} };
	new Function("require", "module", "exports", ...Object.keys(BASE_SCOPE), code)(
		createRequire(libs, packages),
		shell,
		shell.exports,
		...Object.values(BASE_SCOPE),
	);
	return shell.exports;
}

// CONTEXT: a catalogue card draws the widget itself, so code nobody installed still has to run
export function buildWidget({ manifest, code, path, lib, libPath, scope }) {
	const refusal = apiRefusal(manifest);
	if (refusal) throw new Error(refusal);

	const libs = new Map();
	if (lib && scope) libs.set(`${scope}/lib`, runModule(lib, libPath, libs));
	return componentIn(runModule(code, path, libs), path);
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
		this.packages = new Map();
		this.packagesByWidget = new Map();
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
		this.packages.clear();
		this.packagesByWidget.clear();
		this.dropStyles();
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(WIDGETS_DIR))) return this.widgets;

		const found = await this.readEverything(adapter);
		await this.readPackages(adapter, found.lockText);
		// TRADE-OFF: libs first, all of them — a widget may import a lib from any scope, and a
		// second pass is cheaper than deciding an order between scopes that reference each other
		found.scopes.forEach((scope, at) => this.runLib(scope, found.libSources[at]));
		found.sheets.forEach((sheet, at) => this.wearStyles(sheet.owner, found.sheetSources[at]));
		found.folders.forEach((folder, at) => this.mountWidget(folder, found.widgetSources[at]));
		return this.widgets;
	}

	// TRADE-OFF: every read is asked for at once and only the writing that follows is ordered, because a vault on iCloud or Dropbox answers each read in its own time and one after another was the whole start-up
	async readEverything(adapter) {
		const scopes = (await adapter.list(WIDGETS_DIR)).folders;
		const foldersPerScope = await Promise.all(scopes.map((scope) => adapter.list(scope).then((held) => held.folders)));
		const sheets = scopes.flatMap((scope, at) => [
			{ owner: scope, path: `${scope}/tokens.css` },
			...foldersPerScope[at].map((folder) => ({ owner: folder, path: `${folder}/styles.css` })),
		]);
		const folders = foldersPerScope.flat();
		const [libSources, sheetSources, widgetSources, lockText] = await Promise.all([
			Promise.all(scopes.map((scope) => this.readIfThere(adapter, `${scope}/lib.js`))),
			Promise.all(sheets.map((sheet) => this.readIfThere(adapter, sheet.path))),
			Promise.all(folders.map((folder) => this.readWidget(adapter, folder))),
			this.readIfThere(adapter, LOCK_PATH),
		]);
		return { scopes, sheets, folders, libSources, sheetSources, widgetSources, lockText };
	}

	async readPackages(adapter, lockText) {
		const lock = parsedLock(lockText);
		const written = Object.entries(lock.modules).map(([key, entry]) => ({ key, path: entry.path }));
		const sources = await Promise.all(written.map((each) => this.readIfThere(adapter, each.path)));
		written.forEach((each, at) => {
			if (sources[at] === null) return;
			this.packages.set(each.key, { path: each.path, source: sources[at] });
		});
		for (const [id, named] of modulesByWidget(lock)) this.packagesByWidget.set(id, named);
	}

	packagesFor(id) {
		const wanted = this.packagesByWidget.get(id) ?? new Map();
		return { names: [...wanted.keys()], take: (name) => this.runPackage(wanted.get(name)) };
	}

	runPackage(key) {
		const held = key ? this.packages.get(key) : null;
		if (!held) return null;
		held.exports ??= runModule(held.source, held.path, this.libs);
		return held.exports;
	}

	// TRADE-OFF: a read that fails comes back as a value rather than throwing, because one file mid-fetch on iCloud used to reject the whole Promise.all and the vault came up with no widgets at all
	async readIfThere(adapter, path) {
		try {
			if (!(await adapter.exists(path))) return null;
			return await adapter.read(path);
		} catch (failure) {
			console.error(`[widgetarium] cannot read ${path}`, failure);
			return null;
		}
	}

	// CONTEXT: the specifier is the scope's own name plus /lib — @habit/lib, beside @habit/heatmap
	runLib(scope, source) {
		if (source === null) return;

		const path = `${scope}/lib.js`;
		const name = `${scope.slice(WIDGETS_DIR.length + 1)}/lib`;
		try {
			this.libs.set(name, runModule(source, path, this.libs));
		} catch (failure) {
			console.error(`[widgetarium] failed to load ${path}, and every widget importing it goes with it`, failure);
		}
	}

	wearStyles(owner, source) {
		if (source === null) return;

		this.styles ??= new Map();
		const element = document.createElement("style");
		element.dataset.widgetarium = owner;
		element.textContent = source;
		document.head.appendChild(element);
		this.styles.set(owner, element);
	}

	dropStyles() {
		for (const element of this.styles?.values() ?? []) element.remove();
		this.styles?.clear();
	}

	async readWidget(adapter, folder) {
		const manifest = await this.readIfThere(adapter, `${folder}/manifest.json`);
		if (manifest === null) return null;

		const named = ["widget.tsx", "widget.ts", "widget.jsx", "widget.js"].map((name) => `${folder}/${name}`);
		const sources = await Promise.all(named.map((path) => this.readIfThere(adapter, path)));
		const at = sources.findIndex((source) => source !== null);
		return at < 0 ? null : { manifest, code: sources[at], codePath: named[at] };
	}

	mountWidget(folder, held) {
		if (held === null) return;

		const { code, codePath } = held;
		try {
			const manifest = JSON.parse(held.manifest);
			for (const id of [].concat(manifest.was ?? [])) this.renamed.set(id, manifest.id);

			const refusal = apiRefusal(manifest);
			if (refusal) {
				this.widgets.set(manifest.id, { manifest, error: new Error(refusal), folder });
				return;
			}

			const exported = componentIn(runModule(code, codePath, this.libs, this.packagesFor(manifest.id)), folder);
			this.widgets.set(manifest.id, { manifest: { ...exported.meta, ...manifest }, component: exported, folder });
		} catch (failure) {
			console.error(`[widgetarium] failed to load ${folder}`, failure);
			const id = folder.slice(WIDGETS_DIR.length + 1);
			this.widgets.set(id, { manifest: { id, title: id }, error: failure, folder });
		}
	}
}
