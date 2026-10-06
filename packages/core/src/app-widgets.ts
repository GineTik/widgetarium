import { widgetKeyOf } from "./engine/widget-ref.js";

export interface AppWidgets {
	readonly fromCatalogue: readonly string[];
	readonly made: readonly string[];
}

const DRAFT_SCOPE = "@draft";

export function appWidgetsOf(used: readonly string[], installedFromCatalogue: readonly string[]): AppWidgets {
	const catalogueScopes = new Set(installedFromCatalogue.map(scopeOf));
	const ids = [...new Set(used.map(widgetKeyOf))].filter((id) => id !== "" && scopeOf(id) !== DRAFT_SCOPE);
	return {
		fromCatalogue: ids.filter((id) => catalogueScopes.has(scopeOf(id))),
		made: ids.filter((id) => !catalogueScopes.has(scopeOf(id))),
	};
}

function scopeOf(id: string): string {
	return id.split("/")[0] ?? "";
}
