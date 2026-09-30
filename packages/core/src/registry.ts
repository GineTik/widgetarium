import { apiRefusal } from "./version.js";
import type { VersionedManifest } from "./version.js";
import { WIDGETS_DIR } from "./paths.js";
import { EMPTY_LOCK, INSTALL_PENDING, modulesByWidget, buildMatchesSources, commitsOf } from "./engine/widget-lock.js";
import type { WidgetLock } from "./engine/widget-lock.js";
import { generationOf, widgetKeyOf, widgetRef } from "./engine/widget-ref.js";
import { WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS } from "./engine/widget-source.js";
import { compileWidget, compileWidgetFolder } from "./engine/widget-build.js";
import type { FolderFiles } from "./engine/widget-build.js";
import { manifestOf, readRecord } from "./engine/catalogue-index.js";
import type { EngineManifest, Fields, WidgetRecord } from "./engine/catalogue-index.js";
import { idOfFolder } from "./engine/github.js";
import { isObject } from "./engine/is-object.js";
import { ENGINE_SCOPE, componentIn, foreignScope, isReactLike, runCode, runModule } from "./registry-scope.js";
import type { PackageTaker, WidgetComponent, WidgetScope } from "./registry-scope.js";
import { parseLock, readEverything, readIfThere } from "./registry-reading.js";
import type { HeldWidget, OwnedSheet, RegistryAdapter } from "./registry-reading.js";
import type { ReactIdentity } from "./fit.js";
import type { DrawWidget } from "./mounted.js";
import type { GivenProps } from "./declared-widget.js";

export { ENGINE_SCOPE };

export interface WidgetDefinition {
	readonly manifest: EngineManifest;
	readonly component?: WidgetComponent;
	readonly error?: unknown;
	readonly folder?: string;
	readonly react?: ReactIdentity;
	readonly draw?: DrawWidget<GivenProps> | null;
}

export interface WidgetLookup {
	list(): WidgetDefinition[];
	get(id: string | null | undefined): WidgetDefinition | null;
}

interface RegistryApp {
	readonly vault: { readonly adapter: RegistryAdapter };
}

interface BuildWidgetInput {
	readonly manifest?: VersionedManifest | null;
	readonly code?: string;
	readonly path: string;
	readonly sources?: FolderFiles | null;
	readonly lib?: string | null;
	readonly libPath?: string;
	readonly scope?: string | null;
}

interface HeldPackage {
	readonly path: string;
	readonly source: string;
	readonly exports: Map<unknown, unknown>;
}

interface ManifestHolder {
	readonly manifest?: Fields | null | undefined;
}

const INSTALL_UNFINISHED = "{widget} did not finish installing, so it is not run — install it again from the catalogue";
const REACT_NOT_LOADED = "the React this widget declared did not load";

export function buildWidget({ manifest, code, path, sources, lib, libPath, scope }: BuildWidgetInput): WidgetComponent {
	const refusal = apiRefusal(manifest);
	if (refusal) throw new Error(refusal);

	const libs = new Map<string, unknown>();
	if (lib && scope) libs.set(`${scope}/lib`, runModule(lib, libPath ?? "", libs));
	const compiled = sources ? compileWidgetFolder(sources, path) : compileWidget(code ?? "", path);
	return componentIn(runCode(compiled, libs), path);
}

// TRADE-OFF: a function over the list, not a method on the registry — every stand-in registry
// TRADE-OFF: in the tests would otherwise have to grow a second method to say the same thing
export function boardWidgets<Entry extends ManifestHolder>(entries: readonly Entry[]): Entry[] {
	return entries.filter((entry) => !isInlineOnly(entry));
}

export function inlineWidgets<Entry extends ManifestHolder>(entries: readonly Entry[]): Entry[] {
	return entries.filter((entry) => entry.manifest?.["inline"] === true);
}

export function declaredName(registry: WidgetLookup | null | undefined, id: string): unknown {
	const manifest = registry?.get(id)?.manifest;
	return manifest?.["view"] ?? manifest?.["title"] ?? id;
}

export function declaredLabel(registry: WidgetLookup | null | undefined, id: string): string {
	return String(declaredName(registry, id));
}

export class WidgetRegistry implements WidgetLookup {
	readonly app: RegistryApp;
	readonly surfaceSource: string | null;
	readonly scopes = new Map<string, WidgetScope>();
	readonly widgets = new Map<string, WidgetDefinition>();
	readonly renamed = new Map<unknown, string>();
	readonly libs = new Map<string, unknown>();
	readonly packages = new Map<string, HeldPackage>();
	readonly packagesByWidget = new Map<unknown, Map<string, string>>();
	lock: WidgetLock = EMPTY_LOCK;
	styles: Map<string, HTMLStyleElement> | undefined;

	constructor(app: RegistryApp, surfaceSource: string | null = null) {
		this.app = app;
		this.surfaceSource = surfaceSource;
	}

	resolveId(id: string): string {
		if (this.widgets.has(id)) return id;
		const key = widgetKeyOf(id);
		const generation = generationOf(id);
		if (generation) return this.generationHolding(key, generation) ?? id;
		if (this.widgets.has(key)) return key;
		return this.renamed.get(id) ?? id;
	}

	generationHolding(key: string, generation: string): string | null {
		const holding = ([id, entry]: [string, unknown]): boolean =>
			widgetKeyOf(id) === key && commitsOf(entry).includes(generation) && this.widgets.has(id);
		return Object.entries(this.lock.widgets).find(holding)?.[0] ?? null;
	}

	generationsOf(key: string): string[] {
		const order = Object.keys(this.lock.widgets);
		return [...this.widgets.keys()]
			.filter((id) => widgetKeyOf(id) === key)
			.sort((one, other) => order.indexOf(one) - order.indexOf(other));
	}

	tileRefOf(id: string): string {
		const [first] = commitsOf(this.lock.widgets[id]);
		return typeof first === "string" && first && first !== WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS
			? widgetRef(widgetKeyOf(id), first)
			: id;
	}

	list(): WidgetDefinition[] {
		return [...this.widgets.values()];
	}

	get(id: string | null | undefined): WidgetDefinition | null {
		if (id === null || id === undefined) return null;
		return this.widgets.get(this.resolveId(id)) ?? null;
	}

	async load(): Promise<Map<string, WidgetDefinition>> {
		this.widgets.clear();
		this.renamed.clear();
		this.libs.clear();
		this.packages.clear();
		this.packagesByWidget.clear();
		this.scopes.clear();
		this.dropStyles();
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(WIDGETS_DIR))) return this.widgets;

		const found = await readEverything(adapter);
		this.lock = parseLock(found.lockText);
		await this.readPackages(adapter, this.lock);
		// TRADE-OFF: libs first, all of them — a widget may import a lib from any scope, and a
		// TRADE-OFF: second pass is cheaper than deciding an order between scopes that reference each other
		found.scopes.forEach((scope, at) => this.runLib(scope, found.libPaths[at] ?? null, found.libSources[at] ?? null));
		this.wearEverySheet(found.sheets, found.sheetSources);
		found.folders.forEach((folder, at) => this.mountWidget(folder, found.widgetSources[at] ?? null));
		return this.widgets;
	}

	async readPackages(adapter: RegistryAdapter, lock: WidgetLock): Promise<void> {
		const written = Object.entries(lock.modules).map(([key, entry]) => ({ key, path: pathOf(entry) }));
		const sources = await Promise.all(written.map((each) => readIfThere(adapter, each.path)));
		written.forEach((each, at) => {
			const source = sources[at];
			if (source === null || source === undefined) return;
			this.packages.set(each.key, { path: each.path, source, exports: new Map() });
		});
		for (const [id, named] of modulesByWidget(lock)) this.packagesByWidget.set(id, named);
	}

	packagesFor(id: string, scope: WidgetScope): PackageTaker {
		const wanted = this.packagesByWidget.get(id) ?? new Map<string, string>();
		return { names: [...wanted.keys()], take: (name) => this.runPackage(wanted.get(name), scope) };
	}

	// TRADE-OFF: a package is run once per React, not once — a bundle importing react must get the same one its widget did, and a shared copy handed the second React the first one's hooks
	heldPackage(key: string | null | undefined): HeldPackage | null {
		return (key ? this.packages.get(key) : null) ?? null;
	}

	runPackage(key: string | null | undefined, scope: WidgetScope): unknown {
		const held = this.heldPackage(key);
		if (!held) return null;
		if (!held.exports.has(scope.react))
			held.exports.set(scope.react, runModule(held.source, held.path, this.libs, null, scope));
		return held.exports.get(scope.react);
	}

	// TRADE-OFF: the scope's own React is written into the memo, because the widget resolves react through the same table as everything else and would otherwise run a second copy of the one it was built from
	rememberPackage(key: string | null | undefined, scope: WidgetScope, exports: unknown): void {
		this.heldPackage(key)?.exports.set(scope.react, exports);
	}

	buildScope(reactKey: string, reactDomKey: string | undefined): WidgetScope {
		const ownReact = this.runPackage(reactKey, ENGINE_SCOPE);
		if (!isReactLike(ownReact)) throw new Error(REACT_NOT_LOADED);
		const ownReactDom = this.runPackage(reactDomKey, { ...ENGINE_SCOPE, react: ownReact });
		const made = foreignScope(this.surfaceSource, ownReact, ownReactDom);
		this.rememberPackage(reactKey, made, ownReact);
		this.rememberPackage(reactDomKey, made, ownReactDom);
		return made;
	}

	scopeFor(id: string): WidgetScope {
		const wanted = this.packagesByWidget.get(id) ?? new Map<string, string>();
		const reactKey = wanted.get("react");
		if (!reactKey) return ENGINE_SCOPE;

		const standing = this.scopes.get(reactKey);
		if (standing) return standing;
		const made = this.buildScope(reactKey, wanted.get("react-dom"));
		this.scopes.set(reactKey, made);
		return made;
	}

	runLib(scope: string, path: string | null, source: string | null): void {
		if (source === null) return;

		const name = `${scope.slice(WIDGETS_DIR.length + 1)}/lib`;
		try {
			this.libs.set(name, runModule(source, path ?? "", this.libs));
		} catch (failure) {
			console.error(
				`[widgetarium] failed to load ${String(path)}, and every widget importing it goes with it`,
				failure,
			);
		}
	}

	wearEverySheet(sheets: readonly OwnedSheet[], sources: readonly (string | null)[]): void {
		const worn = new Set<string>();
		sheets.forEach((sheet, at) => {
			const source = sources[at] ?? null;
			if (source === null || worn.has(sheet.owner)) return;
			worn.add(sheet.owner);
			this.wearStyles(sheet.owner, source);
		});
	}

	wearStyles(owner: string, source: string | null): void {
		if (source === null) return;

		const styles = this.styles ?? new Map<string, HTMLStyleElement>();
		this.styles = styles;
		const element = document.createElement("style");
		element.dataset["widgetarium"] = owner;
		element.textContent = source;
		document.head.appendChild(element);
		styles.set(owner, element);
	}

	dropStyles(): void {
		for (const element of this.styles?.values() ?? []) element.remove();
		this.styles?.clear();
	}

	codeToRun(id: string, held: HeldWidget, folder: string): string {
		const files = held.files ?? {};
		if (held.build !== null && buildMatchesSources(this.lock.builds[id], folder, files)) return held.build;
		return compileWidgetFolder(files, folder);
	}

	refusalFor(record: WidgetRecord, held: HeldWidget): string | null {
		if (held.refusal) return held.refusal;
		if (stateOf(this.lock.widgets[record.id]) === INSTALL_PENDING)
			return INSTALL_UNFINISHED.replace("{widget}", record.id);
		return apiRefusal(record);
	}

	mountWidget(folder: string, held: HeldWidget | null): void {
		if (held === null) return;

		try {
			const record = readRecord(JSON.parse(held.record ?? "null"), idOfFolder(folder));
			if (!record.id) return;

			for (const id of namesItWas(record)) this.renamed.set(id, record.id);

			const refusal = this.refusalFor(record, held);
			if (refusal) {
				this.widgets.set(record.id, { manifest: record, error: new Error(refusal), folder });
				return;
			}

			this.widgets.set(record.id, this.drawnDefinition(record, held, folder));
		} catch (failure) {
			console.error(`[widgetarium] failed to load ${folder}`, failure);
			const id = folder.slice(WIDGETS_DIR.length + 1);
			this.widgets.set(id, { manifest: { id, title: id }, error: failure, folder });
		}
	}

	drawnDefinition(record: WidgetRecord, held: HeldWidget, folder: string): WidgetDefinition {
		const scope = this.scopeFor(record.id);
		const exported = componentIn(
			runCode(this.codeToRun(record.id, held, folder), this.libs, this.packagesFor(record.id, scope), scope),
			folder,
		);
		return {
			manifest: manifestOf(record, exported),
			component: exported,
			folder,
			react: { instance: scope.instance, version: scope.react.version },
			draw: scope.draw,
		};
	}
}

function isInlineOnly(entry: ManifestHolder): boolean {
	return entry.manifest?.["inline"] === true && !entry.manifest["defaultSize"];
}

function pathOf(entry: unknown): string {
	const path = isObject(entry) ? entry["path"] : undefined;
	return String(path);
}

function stateOf(entry: unknown): unknown {
	return isObject(entry) ? entry["state"] : undefined;
}

function namesItWas(record: WidgetRecord): readonly unknown[] {
	const was = record["was"] ?? [];
	return Array.isArray(was) ? was : [was];
}
