export type Binding = { readonly implementation: string; readonly fields: Readonly<Record<string, unknown>> };

export function bound(implementation: string, fields: Readonly<Record<string, unknown>> = {}): Binding {
	return { implementation, fields };
}

export function keptValue(value: string): Binding {
	return bound("@core/typed-value", { value });
}
