import { z } from "zod";

export const PropRefSchema = z.string().regex(/^[^/]+\/.+$/, "a prop of another tile, written tile/prop");

const NOT_A_PROP_REF =
	'{implementation} needs "{field}" to name a prop of another tile, written tile/prop; it holds {held}';

export function propRefIn(held: unknown, field: string, implementation: string): string {
	const parsed = PropRefSchema.safeParse(held);
	if (parsed.success) return parsed.data;
	const shown = held === undefined ? "nothing" : JSON.stringify(held);
	throw new TypeError(
		NOT_A_PROP_REF.replace("{implementation}", implementation).replace("{field}", field).replace("{held}", shown),
	);
}
