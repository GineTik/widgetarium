import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Action, Ref, Row } from "./contract";
import type { ActionMeta } from "./create";
import { gatewayCache, stableKey } from "./cache";

export interface DataState<O> {
	data: O | null;
	rows: O extends { rows: Row<infer V>[] } ? Row<V>[] : never[];
	total: number | null;
	isLoading: boolean;
	failure: string | null;
}

// CONTEXT: a record widget reads its fields beside the ref that names it back to the gateway
export function flatRows<T extends object>(rows: readonly Row<T>[]): (T & { ref: Ref })[] {
	return rows.map(({ ref, value }) => ({ ...value, ref }));
}

function metaOf(read: unknown): ActionMeta {
	const meta = (read as { meta?: ActionMeta })?.meta;
	if (!meta) throw new Error("useData wants a gateway verb such as tasks.list — this function is not one");
	return meta;
}

function toDataState<O>(entry: { status: string; data: unknown; failure: string | null }): DataState<O> {
	const held = entry.data as { rows?: Row<unknown>[]; total?: number } | null;
	return {
		data: entry.data as O | null,
		rows: (held?.rows ?? []) as DataState<O>["rows"],
		total: held?.total ?? null,
		isLoading: entry.status === "loading",
		failure: entry.failure,
	};
}

export function useData<I, O>(read: Action<I, O>, input?: I): DataState<O> {
	const meta = metaOf(read);
	const inputKey = stableKey(input);

	const subscribe = useCallback(
		(listener: () => void) => gatewayCache.subscribe(meta, input, read as (given: unknown) => Promise<unknown>, listener),
		[meta.gatewayId, meta.verb, inputKey],
	);
	const entry = useSyncExternalStore(subscribe, () => gatewayCache.read(meta, input));

	return useMemo(() => toDataState<O>(entry), [entry]);
}
