import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Action, DuplicateIdReport, Row } from "./contract";
import type { ActionMeta } from "./create";
import { gatewayCache, stableKey } from "./cache";

export type Listed<O> = O extends { rows: infer Rows } ? Rows : O | null;

export interface DataState<O> {
	data: Listed<O>;
	total: number | null;
	duplicates: DuplicateIdReport[];
	isLoading: boolean;
	failure: string | null;
}

function metaOf(read: unknown): ActionMeta {
	const meta = (read as { meta?: ActionMeta })?.meta;
	if (!meta) throw new Error("useData wants a gateway verb such as tasks.list — this function is not one");
	return meta;
}

function toDataState<O>(
	entry: { status: string; data: unknown; failure: string | null },
	listed: boolean,
): DataState<O> {
	const held = entry.data as { rows?: Row<unknown>[]; total?: number; duplicates?: DuplicateIdReport[] } | null;
	return {
		data: (listed ? (held?.rows ?? []) : entry.data) as Listed<O>,
		total: held?.total ?? null,
		duplicates: held?.duplicates ?? [],
		isLoading: entry.status === "loading",
		failure: entry.failure,
	};
}

export function useData<I, O>(read: Action<I, O>, input?: I): DataState<O> {
	const meta = metaOf(read);
	const inputKey = stableKey(input);

	const subscribe = useCallback(
		(listener: () => void) =>
			gatewayCache.subscribe(meta, input, read as (given: unknown) => Promise<unknown>, listener),
		[meta.gatewayId, meta.verb, inputKey],
	);
	const entry = useSyncExternalStore(subscribe, () => gatewayCache.read(meta, input));

	return useMemo(() => toDataState<O>(entry, meta.verb === "list"), [entry, meta.verb]);
}
