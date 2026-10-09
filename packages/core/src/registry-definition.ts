import { manifestOf } from "./engine/catalogue-index.js";
import type { WidgetRecord } from "./engine/catalogue-index.js";
import { blocksIn, componentIn, statesIn } from "./registry-scope.js";
import type { WidgetDefinition } from "./registry.js";

export function refusedDefinitionOf(id: string, failure: unknown, folder: string): WidgetDefinition {
	return { manifest: { id, title: id }, error: failure, folder };
}

export function exportsOfModule(record: WidgetRecord, module: unknown, folder: string) {
	const component = componentIn(module, folder);
	return { manifest: manifestOf(record, component), component, blocks: blocksIn(module), states: statesIn(module) };
}
