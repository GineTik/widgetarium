import { exportsOfModule, refusedDefinitionOf } from "../registry-definition.js";
import type { WidgetDefinition, WidgetLookup } from "../registry.js";
import { readRecord } from "./catalogue-index.js";

export type ImportedWidgets = Readonly<Record<string, unknown>>;

export class ModuleRegistry implements WidgetLookup {
	private readonly widgets: ReadonlyMap<string, WidgetDefinition>;

	constructor(modules: ImportedWidgets) {
		this.widgets = new Map(Object.entries(modules).map(([id, module]) => [id, definitionOfModule(id, module)]));
	}

	ids(): string[] {
		return [...this.widgets.keys()];
	}

	list(): WidgetDefinition[] {
		return [...this.widgets.values()];
	}

	get(id: string | null | undefined): WidgetDefinition | null {
		if (id === null || id === undefined) return null;
		return this.widgets.get(id) ?? null;
	}

	tileRefOf(id: string): string {
		return id;
	}
}

function definitionOfModule(id: string, module: unknown): WidgetDefinition {
	try {
		return { ...exportsOfModule(readRecord({}, id), module, id), folder: id };
	} catch (failure) {
		console.error(`[widgetarium] imported widget ${id} → refused`, failure);
		return refusedDefinitionOf(id, failure, id);
	}
}
