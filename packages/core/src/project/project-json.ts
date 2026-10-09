export type JsonReading = { readonly value: unknown } | { readonly error: string };

export function parseJson(text: string): JsonReading {
	try {
		const value: unknown = JSON.parse(text);
		return { value };
	} catch (error) {
		return { error: error instanceof Error ? error.message : String(error) };
	}
}
