import { updateOffered } from "@widgetarium/core/catalogue-entries.js";
import type { CatalogueDefinition, MergedEntry } from "@widgetarium/core/catalogue-entries.js";
import { isInstalled, mergeCatalogue } from "@widgetarium/core/engine/catalogue-index.js";
import type { WidgetLock } from "@widgetarium/core/engine/widget-lock.js";
import { boardWidgets, inlineWidgets } from "@widgetarium/core/registry.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";
import type { CataloguePort, CatalogueViewName } from "@widgetarium/core/engine/catalogue-port.js";
import type { CatalogueKind } from "@widgetarium/core/engine/catalogue-requests.js";
import { CATALOGUE_REQUESTS } from "@widgetarium/core/engine/catalogue-requests.js";
import { INSTALL_JOBS } from "@widgetarium/core/engine/install-jobs.js";
import type { InstallOutcome } from "@widgetarium/core/engine/install-jobs.js";
import { TEMPLATES } from "@widgetarium/core/templates.js";
import type { Template } from "@widgetarium/core/templates.js";
import { placeWidget } from "@widgetarium/core/surface/drop-receivers.js";
import type { Fields } from "@widgetarium/core/engine/catalogue-index.js";
import { installPinnedToItsCommit, uninstall, useTemplateNamed } from "./plugin-catalogue.js";
import type WidgetariumPlugin from "./main.js";

const NOT_OFFERED = "{widget} is in no catalogue this vault reads";

interface CatalogueSnapshot {
	readonly board: readonly MergedEntry[];
	readonly inline: readonly MergedEntry[];
	readonly byId: ReadonlyMap<string, MergedEntry>;
}

export interface PluginCataloguePort extends CataloguePort {
	reread(): Promise<void>;
}

export function createCataloguePort(plugin: WidgetariumPlugin): PluginCataloguePort {
	return new PluginCatalogue(plugin);
}

class PluginCatalogue implements PluginCataloguePort {
	readonly can = true;
	readonly jobs = INSTALL_JOBS;
	readonly requests = CATALOGUE_REQUESTS;
	readonly place = placeWidget;
	readonly templates = (): readonly Template[] => TEMPLATES;
	private readonly listeners = new Set<() => void>();
	private held: CatalogueSnapshot | null = null;
	private pendingRefresh: Promise<CatalogueSnapshot> | null = null;

	constructor(private readonly plugin: WidgetariumPlugin) {}

	get previewRegistry(): CataloguePort["previewRegistry"] {
		return this.plugin.registry;
	}

	get previewHost(): CataloguePort["previewHost"] {
		return this.plugin.host;
	}

	readonly entries = async (kind: CatalogueKind): Promise<readonly MergedEntry[]> => (await this.snapshot())[kind];

	readonly entryOf = (widget: string): MergedEntry | null => {
		if (!this.held) void this.snapshot();
		return this.held?.byId.get(widget) ?? null;
	};

	readonly install = (widget: string): Promise<InstallOutcome> =>
		INSTALL_JOBS.start(widget, async (onStep) => {
			const entry = (await this.snapshot()).byId.get(widget);
			if (!entry) return { ok: false, failure: NOT_OFFERED.replace("{widget}", widget) };
			return installPinnedToItsCommit(this.plugin, entry.offer ?? entry.definition, onStep);
		});

	readonly uninstall = (widget: string): Promise<InstallOutcome> => uninstall(this.plugin, widget);

	readonly applyTemplate = (template: string): Promise<InstallOutcome> => useTemplateNamed(this.plugin, template);

	readonly openView = (view: CatalogueViewName): void =>
		void (view === "docs" ? this.plugin.showDocs() : this.plugin.showCatalogue());

	readonly subscribe = (changed: () => void): (() => void) => {
		this.listeners.add(changed);
		return () => this.listeners.delete(changed);
	};

	readonly reread = async (): Promise<void> => {
		await this.refresh();
	};

	private async refresh(): Promise<CatalogueSnapshot> {
		const sources = {
			registry: this.plugin.registry,
			available: await this.plugin.offers(),
			lock: await this.plugin.installer.lock(),
		};
		const board = mergedEntries({ ...sources, kind: "board" });
		const inline = mergedEntries({ ...sources, kind: "inline" });
		this.held = { board, inline, byId: keyedById([...inline, ...board]) };
		for (const listener of [...this.listeners]) listener();
		return this.held;
	}

	private snapshot(): Promise<CatalogueSnapshot> {
		if (this.held) return Promise.resolve(this.held);
		this.pendingRefresh ??= this.plugin.started
			.then(() => this.refresh())
			.finally(() => {
				this.pendingRefresh = null;
			});
		return this.pendingRefresh;
	}
}

interface MergeInput {
	readonly registry: WidgetLookup;
	readonly available: readonly CatalogueDefinition[];
	readonly kind: "board" | "inline";
	readonly lock: WidgetLock | null | undefined;
}

function mergedEntries({ registry, available, kind, lock }: MergeInput): MergedEntry[] {
	const installed: CatalogueDefinition[] =
		kind === "inline" ? inlineWidgets(registry.list()) : boardWidgets(registry.list());
	const offered = kind === "inline" ? available.filter((entry) => entry.manifest?.["inline"] === true) : available;
	const offerById = keyedById(offered);
	return mergeCatalogue(installed, offered).map((definition) => {
		const id = idOf(definition.manifest);
		return mergedEntryOf(definition, (id ? offerById.get(id) : null) ?? null, lock);
	});
}

function mergedEntryOf(
	definition: CatalogueDefinition,
	offer: CatalogueDefinition | null,
	lock: WidgetLock | null | undefined,
): MergedEntry {
	return {
		definition,
		offer,
		manifest: definition.manifest ?? {},
		installed: isInstalled(definition),
		update: isInstalled(definition) ? updateOffered(definition.manifest, offer, lock) : null,
	};
}

function idOf(manifest: Fields | null | undefined): string | null {
	const id = manifest?.["id"];
	return typeof id === "string" && id !== "" ? id : null;
}

function keyedById<T extends { readonly manifest?: Fields | null | undefined }>(entries: readonly T[]): Map<string, T> {
	return new Map(
		entries.flatMap((entry) => {
			const id = idOf(entry.manifest);
			return id ? [[id, entry] as const] : [];
		}),
	);
}
