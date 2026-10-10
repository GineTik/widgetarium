import type { CatalogueDefinition, MergedEntry } from "@widgetarium/core/catalogue-entries.js";
import { NO_CATALOGUE_PORT } from "@widgetarium/core/engine/catalogue-port.js";
import type { CataloguePort } from "@widgetarium/core/engine/catalogue-port.js";
import type { CatalogueKind } from "@widgetarium/core/engine/catalogue-requests.js";
import type { InstallOutcome } from "@widgetarium/core/engine/install-jobs.js";
import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import { boardWidgets, inlineWidgets } from "@widgetarium/core/registry.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";

const NOT_AVAILABLE: InstallOutcome = { ok: false, failure: NOT_AVAILABLE_ON_HOST };

export function browserCataloguePort(project: WidgetLookup): CataloguePort {
	const entryByDefinition = new WeakMap<CatalogueDefinition, MergedEntry>();
	const entryOfDefinition = (definition: CatalogueDefinition): MergedEntry => {
		const held = entryByDefinition.get(definition);
		if (held) return held;
		const made = installedEntryOf(definition);
		entryByDefinition.set(definition, made);
		return made;
	};
	const entriesOf = (kind: CatalogueKind): readonly MergedEntry[] => {
		const listed = project.list();
		return (kind === "board" ? boardWidgets(listed) : inlineWidgets(listed)).map(entryOfDefinition);
	};
	return {
		...NO_CATALOGUE_PORT,
		can: true,
		entries: async (kind) => entriesOf(kind),
		entryOf: (widget) => entriesOf("board").find((entry) => entry.manifest["id"] === widget) ?? null,
		install: async () => NOT_AVAILABLE,
		uninstall: async () => NOT_AVAILABLE,
		applyTemplate: async () => NOT_AVAILABLE,
		openView: () => undefined,
		// TRADE-OFF: never calls back; WidgetLookup offers no change signal, a built project's widgets are fixed
		subscribe: () => () => undefined,
		previewRegistry: project,
	};
}

function installedEntryOf(definition: CatalogueDefinition): MergedEntry {
	return { definition, offer: null, manifest: definition.manifest ?? {}, installed: true, update: null };
}
