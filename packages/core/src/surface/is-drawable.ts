export interface WidgetDefinition {
	readonly component?: unknown;
	readonly error?: unknown;
}

export function isDrawable(definition: WidgetDefinition | null | undefined): boolean {
	return Boolean(definition?.component) && !definition?.error;
}
