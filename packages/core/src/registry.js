import { apiRefusal } from "./version.js";
import { WIDGETS_DIR, LOCK_PATH } from "./paths.js";
import {
	EMPTY_LOCK,
	INSTALL_PENDING,
	readLock,
	modulesByWidget,
	buildMatchesSources,
	commitsOf,
} from "./engine/widget-lock.js";
import { generationOf, widgetKeyOf, widgetRef } from "./engine/widget-ref.js";
import { WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS } from "./engine/widget-source.js";
import {
	SHEET_FILES,
	SOURCE_FILES,
	builtCodePath,
	buildFolder,
	builtSheetPath,
	compileWidget,
	compileWidgetFolder,
	isWidgetModule,
	javascriptSourceRefusal,
} from "./engine/widget-build.js";
import { RECORD_FILE, manifestOf, readRecord } from "./engine/catalogue-index.js";
import { idOfFolder } from "./engine/github.js";
import { ENGINE_SCOPE, componentIn, foreignScope, runCode, runModule } from "./registry-scope.js";

export { ENGINE_SCOPE };

const INSTALL_UNFINISHED = "{widget} did not finish installing, so it is not run — install it again from the catalogue";

export function buildWidget({ manifest, code, path, sources, lib, libPath, scope }) {
	const refusal = apiRefusal(manifest);
	if (refusal) throw new Error(refusal);

	const libs = new Map();
	if (lib && scope) libs.set(`${scope}/lib`, runModule(lib, libPath, libs));
	const compiled = sources ? compileWidgetFolder(sources, path) : compileWidget(code, path);
	return componentIn(runCode(compiled, libs), path);
}

// TRADE-OFF: a function over the list, not a method on the registry — every stand-in registry
// TRADE-OFF: in the tests would otherwise have to grow a second method to say the same thing
export function boardWidgets(entries) {
	return entries.filter((entry) => !isInlineOnly(entry));
}

export function inlineWidgets(entries) {
	return entries.filter((entry) => entry?.manifest?.inline === true);
}

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
		this.renamed = new Map();
		this.libs = new Map();
		this.packages = new Map();
		this.packagesByWidget = new Map();
		this.lock = EMPTY_LOCK;
	}

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
		// TRADE-OFF: second pass is cheaper than deciding an order between scopes that reference each other
		found.scopes.forEach((scope, at) => this.runLib(scope, found.libSources[at]));
		this.wearEverySheet(found.sheets, found.sheetSources);
		found.folders.forEach((folder, at) => this.mountWidget(folder, found.widgetSources[at]));
		return this.widgets;
	}

	// TRADE-OFF: every read is asked for at once and only the writing that follows is ordered, because a vault on iCloud or Dropbox answers each read in its own time and one after another was the whole start-up
	// TRADE-OFF: one listing per folder instead of one exists per file it might hold — on a vault iCloud serves, each question to the disk is what start-up spends
	async readEverything(adapter) {
		const scopes = (await adapter.list(WIDGETS_DIR)).folders;
		const scopeListings = await Promise.all(scopes.map((scope) => adapter.list(scope)));
		const foldersPerScope = scopeListings.map((held) => held.folders);
		const folders = foldersPerScope.flat();
		const folderFiles = await Promise.all(folders.map((folder) => filesIn(adapter, folder)));
		const present = new Set([...scopeListings.flatMap((held) => held.files), ...folderFiles.flat()]);
		const sheets = scopes
			.flatMap((scope, at) => [
				{ owner: scope, path: `${scope}/tokens.css` },
				...foldersPerScope[at].flatMap((folder) => [
					{ owner: folder, path: builtSheetPath(folder) },
					...SHEET_FILES.map((name) => ({ owner: folder, path: `${folder}/${name}` })),
				]),
			])
			.filter((sheet) => present.has(sheet.path));
		const readPresent = (path) => (present.has(path) ? this.readIfThere(adapter, path, { known: true }) : null);
		const [libSources, sheetSources, widgetSources, lockText] = await Promise.all([
			Promise.all(scopes.map((scope) => readPresent(`${scope}/lib.js`))),
			Promise.all(sheets.map((sheet) => readPresent(sheet.path))),
			Promise.all(
				folders.map((folder, at) =>
					this.readWidget(
						folder,
						folderFiles[at].map((path) => path.slice(folder.length + 1)),
						readPresent,
					),
				),
			),
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
	async readIfThere(adapter, path, { known = false } = {}) {
		try {
			if (!known && !(await adapter.exists(path))) return null;
			return await adapter.read(path);
		} catch (failure) {
			console.error(`[widgetarium] cannot read ${path}`, failure);
			return null;
		}
	}

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

	async readWidget(folder, names, read) {
		const modules = names.filter(isWidgetModule);
		const [card, built, ...sources] = await Promise.all(
			[`${folder}/${RECORD_FILE}`, builtCodePath(folder), ...modules.map((name) => `${folder}/${name}`)].map(read),
		);
		const refusal = javascriptSourceRefusal(names, folder);
		if (refusal) return { record: card, files: null, build: null, refusal };
		if (!SOURCE_FILES.some((name) => names.includes(name))) return null;
		return {
			record: card,
			files: Object.fromEntries(modules.map((name, at) => [name, sources[at]])),
			build: built,
			refusal: null,
		};
	}

	codeToRun(id, held, folder) {
		if (held.build !== null && buildMatchesSources(this.lock.builds[id], folder, held.files)) return held.build;
		return compileWidgetFolder(held.files, folder);
	}

	refusalFor(record, held) {
		if (held.refusal) return held.refusal;
		if (this.lock.widgets[record.id]?.state === INSTALL_PENDING)
			return INSTALL_UNFINISHED.replace("{widget}", record.id);
		return apiRefusal(record);
	}

	mountWidget(folder, held) {
		if (held === null) return;

		try {
			const record = readRecord(JSON.parse(held.record), idOfFolder(folder));
			if (!record.id) return;

			for (const id of [].concat(record.was ?? [])) this.renamed.set(id, record.id);

			const refusal = this.refusalFor(record, held);
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

function isInlineOnly(entry) {
	return entry?.manifest?.inline === true && !entry?.manifest?.defaultSize;
}

async function filesIn(adapter, folder, isRoot = true) {
	const held = await adapter.list(folder);
	const found = [...held.files];
	for (const inner of held.folders) {
		if (isRoot && inner === buildFolder(folder)) found.push(...(await adapter.list(inner)).files);
		else found.push(...(await filesIn(adapter, inner, false)));
	}
	return found;
}

function parsedLock(text) {
	try {
		return readLock(JSON.parse(text));
	} catch {
		return EMPTY_LOCK;
	}
}
