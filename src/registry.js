import * as react from "react";
import * as reactDom from "react-dom";
import * as coreModule from "./api-core.js";
import { coreSurface } from "./api-core.js";
import { reactSurface, kit, emojis } from "./widget-api.js";
import { apiRefusal, WIDGET_API } from "./version.js";
import { WIDGETS_DIR, LOCK_PATH } from "./paths.js";
import {
	EMPTY_LOCK,
	INSTALL_PENDING,
	readLock,
	modulesByWidget,
	buildMatchesSource,
	commitsOf,
} from "./engine/widget-lock.js";
import { generationOf, widgetKeyOf, widgetRef } from "./engine/widget-ref.js";
import { WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS } from "./engine/widget-source.js";

import {
	BUILD_FILE,
	SHEET_FILES,
	SOURCE_FILES,
	builtCodePath,
	builtSheetPath,
	compileWidget,
} from "./engine/widget-build.js";
import { moduleFromCompiled } from "./engine/compiled-module.js";
import { LEGACY_RECORD_FILE, RECORD_FILE, manifestOf, readRecord } from "./engine/catalogue-index.js";
import { idOfFolder } from "./engine/github.js";

function injectedGlobals(scope) {
	return {
		h: scope.react.createElement,
		Fragment: scope.react.Fragment,
		kitModule: scope.kit,
		useState: scope.react.useState,
		useEffect: scope.react.useEffect,
		useMemo: scope.react.useMemo,
		useRef: scope.react.useRef,
	};
}

function parsedLock(text) {
	try {
		return readLock(JSON.parse(text));
	} catch {
		return EMPTY_LOCK;
	}
}

const INSTALL_UNFINISHED = "{widget} did not finish installing, so it is not run — install it again from the catalogue";
const EXPORT_MISSING =
	'this widget calls "{name}" from "widgetarium", which this Widgetarium (widget API {api}) does not provide — update the plugin';
const MODULE_INTEROP_KEYS = new Set(["__esModule", "default", "then"]);

function refusingMissingExports(api) {
	return new Proxy(api, {
		get(held, name) {
			if (typeof name !== "string" || name in held || MODULE_INTEROP_KEYS.has(name)) return held[name];
			return () => {
				throw new Error(EXPORT_MISSING.replace("{name}", name).replace("{api}", String(WIDGET_API)));
			};
		},
	});
}

// CONTEXT: the specifier is the contract with widget authors; what stands behind it is not
function createRequire(libs, packages, scope) {
	const modules = {
		widgetarium: refusingMissingExports(scope.api),
		"widgetarium/kit": scope.kit,
		"widgetarium/kit/emojis": scope.emojis,
		react: scope.react,
		"react-dom": scope.reactDom,
		...Object.fromEntries(libs),
	};
	return (name) => {
		const found = packages?.take(name) ?? modules[name];
		if (!found)
			throw new Error(
				`cannot import "${name}" — a widget may only import ${[...Object.keys(modules), ...(packages?.names ?? [])].join(", ")}`,
			);
		return found;
	};
}

export const ENGINE_SCOPE = {
	instance: "the plugin's own",
	react,
	reactDom,
	api: { ...coreSurface, ...reactSurface },
	kit,
	emojis,
	draw: null,
};

function surfaceExports(source, ownReact, ownReactDom) {
	const take = {
		react: ownReact,
		"react-dom": ownReactDom,
		"react-dom/client": ownReactDom,
		"widgetarium/core": coreModule,
	};
	return moduleFromCompiled(source, { require: (name) => take[name] });
}

function foreignScope(source, ownReact, ownReactDom) {
	const said = `React ${ownReact.version}`;
	if (!source) throw new Error(`this build carries no widget surface, so a widget cannot bring ${said}`);
	if (!ownReactDom) throw new Error(`a widget asking for ${said} must declare react-dom beside it`);
	if (typeof ownReactDom.createRoot !== "function")
		throw new Error(`the react-dom beside ${said} provides no createRoot`);

	const built = surfaceExports(source, ownReact, ownReactDom);
	return {
		instance: ownReact,
		react: ownReact,
		reactDom: ownReactDom,
		api: { ...coreSurface, ...built.reactSurface },
		kit: built.kit,
		emojis: built.emojis,
		draw: built.drawWidget,
	};
}

function componentIn(shell, at) {
	const exported = shell.default ?? shell;
	if (typeof exported !== "function") throw new Error(`${at}: the file must "export default createWidget(...)"`);
	return exported;
}

function runCode(code, libs, packages, scope = ENGINE_SCOPE) {
	return moduleFromCompiled(code, { require: createRequire(libs, packages, scope), globals: injectedGlobals(scope) });
}

// TRADE-OFF: one path for a widget and for a lib — two would drift on the first change to either
function runModule(source, filePath, libs, packages, scope) {
	return runCode(compileWidget(source, filePath), libs, packages, scope);
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
	constructor(app, surfaceSource = null) {
		this.app = app;
		this.surfaceSource = surfaceSource;
		this.scopes = new Map();
		this.widgets = new Map();
		// CONTEXT: a manifest's `was` is the id it shipped under — read there, write here
		this.renamed = new Map();
		// CONTEXT: one shared module per scope, so four widgets cannot hold four copies of one rule
		this.libs = new Map();
		this.packages = new Map();
		this.packagesByWidget = new Map();
		this.lock = EMPTY_LOCK;
	}

	// CONTEXT: the one place an id is made current, so a board saved after a read carries the new one
	resolveId(id) {
		if (this.widgets.has(id)) return id;
		const key = widgetKeyOf(id);
		const generation = generationOf(id);
		if (generation) return this.generationHolding(key, generation) ?? id;
		if (this.widgets.has(key)) return key;
		return this.renamed.get(id) ?? id;
	}

	generationHolding(key, generation) {
		const holding = ([id, entry]) =>
			widgetKeyOf(id) === key && commitsOf(entry).includes(generation) && this.widgets.has(id);
		return Object.entries(this.lock.widgets).find(holding)?.[0] ?? null;
	}

	generationsOf(key) {
		const order = Object.keys(this.lock.widgets);
		return [...this.widgets.keys()]
			.filter((id) => widgetKeyOf(id) === key)
			.sort((one, other) => order.indexOf(one) - order.indexOf(other));
	}

	tileRefOf(id) {
		const [first] = commitsOf(this.lock.widgets[id]);
		return first && first !== WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS ? widgetRef(widgetKeyOf(id), first) : id;
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
		this.scopes.clear();
		this.dropStyles();
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(WIDGETS_DIR))) return this.widgets;

		const found = await this.readEverything(adapter);
		this.lock = parsedLock(found.lockText);
		await this.readPackages(adapter, this.lock);
		// TRADE-OFF: libs first, all of them — a widget may import a lib from any scope, and a
		// second pass is cheaper than deciding an order between scopes that reference each other
		found.scopes.forEach((scope, at) => this.runLib(scope, found.libSources[at]));
		this.wearEverySheet(found.sheets, found.sheetSources);
		found.folders.forEach((folder, at) => this.mountWidget(folder, found.widgetSources[at]));
		return this.widgets;
	}

	// TRADE-OFF: every read is asked for at once and only the writing that follows is ordered, because a vault on iCloud or Dropbox answers each read in its own time and one after another was the whole start-up
	async readEverything(adapter) {
		const scopes = (await adapter.list(WIDGETS_DIR)).folders;
		const foldersPerScope = await Promise.all(scopes.map((scope) => adapter.list(scope).then((held) => held.folders)));
		const sheets = scopes.flatMap((scope, at) => [
			{ owner: scope, path: `${scope}/tokens.css` },
			...foldersPerScope[at].flatMap((folder) => [
				{ owner: folder, path: builtSheetPath(folder) },
				...SHEET_FILES.map((name) => ({ owner: folder, path: `${folder}/${name}` })),
			]),
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

	async readPackages(adapter, lock) {
		const written = Object.entries(lock.modules).map(([key, entry]) => ({ key, path: entry.path }));
		const sources = await Promise.all(written.map((each) => this.readIfThere(adapter, each.path)));
		written.forEach((each, at) => {
			if (sources[at] === null) return;
			this.packages.set(each.key, { path: each.path, source: sources[at] });
		});
		for (const [id, named] of modulesByWidget(lock)) this.packagesByWidget.set(id, named);
	}

	packagesFor(id, scope) {
		const wanted = this.packagesByWidget.get(id) ?? new Map();
		return { names: [...wanted.keys()], take: (name) => this.runPackage(wanted.get(name), scope) };
	}

	// TRADE-OFF: a package is run once per React, not once — a bundle importing react must get the same one its widget did, and a shared copy handed the second React the first one's hooks
	heldPackage(key) {
		const held = key ? this.packages.get(key) : null;
		if (!held) return null;
		held.exports ??= new Map();
		return held;
	}

	runPackage(key, scope) {
		const held = this.heldPackage(key);
		if (!held) return null;
		if (!held.exports.has(scope.react))
			held.exports.set(scope.react, runModule(held.source, held.path, this.libs, null, scope));
		return held.exports.get(scope.react);
	}

	// TRADE-OFF: the scope's own React is written into the memo, because the widget resolves react through the same table as everything else and would otherwise run a second copy of the one it was built from
	rememberPackage(key, scope, exports) {
		this.heldPackage(key)?.exports.set(scope.react, exports);
	}

	buildScope(reactKey, reactDomKey) {
		const ownReact = this.runPackage(reactKey, ENGINE_SCOPE);
		const ownReactDom = this.runPackage(reactDomKey, { ...ENGINE_SCOPE, react: ownReact });
		const made = foreignScope(this.surfaceSource, ownReact, ownReactDom);
		this.rememberPackage(reactKey, made, ownReact);
		this.rememberPackage(reactDomKey, made, ownReactDom);
		return made;
	}

	scopeFor(id) {
		const wanted = this.packagesByWidget.get(id) ?? new Map();
		const reactKey = wanted.get("react");
		if (!reactKey) return ENGINE_SCOPE;

		const standing = this.scopes.get(reactKey);
		if (standing) return standing;
		const made = this.buildScope(reactKey, wanted.get("react-dom"));
		this.scopes.set(reactKey, made);
		return made;
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

	// CONTEXT: the specifier is the scope's own name plus /lib — @default/lib, beside @default/heatmap
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

	wearEverySheet(sheets, sources) {
		const worn = new Set();
		sheets.forEach((sheet, at) => {
			if (sources[at] === null || worn.has(sheet.owner)) return;
			worn.add(sheet.owner);
			this.wearStyles(sheet.owner, sources[at]);
		});
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
		const [card, legacyCard, built, ...sources] = await Promise.all(
			[
				`${folder}/${RECORD_FILE}`,
				`${folder}/${LEGACY_RECORD_FILE}`,
				builtCodePath(folder),
				...SOURCE_FILES.map((name) => `${folder}/${name}`),
			].map((path) => this.readIfThere(adapter, path)),
		);
		const at = sources.findIndex((source) => source !== null);
		if (at < 0) return null;
		const name = SOURCE_FILES[at];
		const builtBeforeTheFolderExisted = name === BUILD_FILE ? null : sources[SOURCE_FILES.indexOf(BUILD_FILE)];
		return { record: card ?? legacyCard, name, code: sources[at], build: built ?? builtBeforeTheFolderExisted };
	}

	codeToRun(id, held, folder) {
		if (held.build !== null && buildMatchesSource(this.lock.builds[id], `${folder}/${held.name}`, held.code))
			return held.build;
		return compileWidget(held.code, `${folder}/${held.name}`);
	}

	mountWidget(folder, held) {
		if (held === null) return;

		try {
			const record = readRecord(JSON.parse(held.record), idOfFolder(folder));
			if (!record.id) return;

			for (const id of [].concat(record.was ?? [])) this.renamed.set(id, record.id);

			const refusal =
				this.lock.widgets[record.id]?.state === INSTALL_PENDING
					? INSTALL_UNFINISHED.replace("{widget}", record.id)
					: apiRefusal(record);
			if (refusal) {
				this.widgets.set(record.id, { manifest: record, error: new Error(refusal), folder });
				return;
			}

			const scope = this.scopeFor(record.id);
			const exported = componentIn(
				runCode(this.codeToRun(record.id, held, folder), this.libs, this.packagesFor(record.id, scope), scope),
				folder,
			);
			this.widgets.set(record.id, {
				manifest: manifestOf(record, exported),
				component: exported,
				folder,
				react: { instance: scope.instance, version: scope.react.version },
				draw: scope.draw,
			});
		} catch (failure) {
			console.error(`[widgetarium] failed to load ${folder}`, failure);
			const id = folder.slice(WIDGETS_DIR.length + 1);
			this.widgets.set(id, { manifest: { id, title: id }, error: failure, folder });
		}
	}
}
