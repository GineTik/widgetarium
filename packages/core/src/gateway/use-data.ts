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

export function useData<I, O>(read: Action<I, O>, input?: I): DataState<O>;
export function useData<T>(value: T): DataState<T>;
export function useData<I, O>(read: Action<I, O> | O, input?: I): DataState<O> {
	const meta = metaOf(read);
	const inputKey = stableKey(input);
	const given = useMemo(() => givenEntryOf(read), [read]);

	const subscribe = useCallback(
		(listener: () => void) =>
			meta ? gatewayCache.subscribe(meta, input, read as (given: unknown) => Promise<unknown>, listener) : () => {},
		[meta?.gatewayId, meta?.verb, inputKey],
	);
	const entry = useSyncExternalStore(subscribe, () => (meta ? gatewayCache.read(meta, input) : given));

	return useMemo(() => toDataState<O>(entry, meta ? meta.verb === "list" : Array.isArray(read)), [entry, meta?.verb]);
}

function metaOf(read: unknown): ActionMeta | null {
	if (typeof read !== "function") return null;
	return (read as { meta?: ActionMeta }).meta ?? null;
}

function givenEntryOf(value: unknown): { status: string; data: unknown; failure: string | null } {
	const data = Array.isArray(value) ? { rows: value, total: value.length } : (value ?? null);
	return { status: "ready", data, failure: null };
}

function toDataState<O>(
	entry: { status: string; data: unknown; failure: string | null },
	listed: boolean,
): DataState<O> {
	const held = entry.data as {
		rows?: Row<unknown>[];
		total?: number;
		duplicates?: DuplicateIdReport[];
	} | null;
	return {
		data: (listed ? (held?.rows ?? []) : entry.data) as Listed<O>,
		total: held?.total ?? null,
		duplicates: held?.duplicates ?? [],
		isLoading: entry.status === "loading",
		failure: entry.failure,
	};
}
