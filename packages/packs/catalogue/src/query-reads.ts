import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { Query, Row, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { PropRefSchema } from "@widgetarium/core/engine/prop-ref.js";
import { pageOf } from "@widgetarium/core/gateway/match.js";

export type OnChanged = () => void;

export const EVERY_ROW: Query = { offset: 0, limit: Number.POSITIVE_INFINITY };

export function refsIn(held: readonly unknown[]): string[] {
	return held.flatMap((one) => {
		const parsed = PropRefSchema.safeParse(one);
		return parsed.success ? [parsed.data] : [];
	});
}

export async function valueAt(ports: ImplementationPorts, held: unknown): Promise<unknown> {
	const [ref] = refsIn([held]);
	if (!ref) return null;
	try {
		return await ports.refs.read(ref);
	} catch (failure) {
		console.warn(`Widgetarium: the catalogue could not read ${ref}`, failure);
		return null;
	}
}

export function textOf(held: unknown): string | null {
	if (typeof held === "string") return held === "" ? null : held;
	if (typeof held === "object" && held !== null && "value" in held) return textOf(Reflect.get(held, "value"));
	return null;
}

export function watchCatalogue(ports: ImplementationPorts, refs: string[], changed: OnChanged): () => void {
	const stops = [
		ports.catalogue.subscribe(changed),
		ports.catalogue.jobs.subscribe(changed),
		ports.catalogue.requests.subscribe(changed),
		...(refs.length > 0 ? [ports.refs.watch(refs, changed)] : []),
	];
	return () => stops.forEach((stop) => stop());
}

export function pageRows<T>(rows: RowsResult<T>["rows"], query: Query | undefined): RowsResult<T> {
	return { rows: pageOf([...rows], query), total: rows.length };
}

export function rowAt<T>(listed: RowsResult<T>, ref: string): Row<T> | null {
	return listed.rows.find((row) => row.ref === ref) ?? null;
}
