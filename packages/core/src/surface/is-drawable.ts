export interface WidgetDefinition {
	readonly component?: unknown;
	readonly error?: unknown;
}

export type Drawable<Held extends WidgetDefinition> = Held & { readonly component: NonNullable<Held["component"]> };

export function isDrawable<Held extends WidgetDefinition>(
	definition: Held | null | undefined,
): definition is Drawable<Held> {
	return Boolean(definition?.component) && !definition?.error;
}
