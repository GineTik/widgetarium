export type DataAttributes = { readonly [name: `data-${string}`]: string | undefined };

export function dataAttributesOf(props: object): DataAttributes {
	return Object.fromEntries(
		Object.entries(props).filter(([name, value]) => name.startsWith("data-") && typeof value === "string"),
	);
}
