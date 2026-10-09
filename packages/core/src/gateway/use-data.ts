import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Action, DuplicateIdReport, Row } from "./contract";
import { metaOf } from "./create";
import type { ActionMeta } from "./create";
import { gatewayCache, stableKey } from "./cache";
import type { Runner } from "./cache";
import { isPage, nextPageOf, pagedRunnerOf, withoutCursor } from "./paged-read";
import type { PageReading } from "./paged-read";
import type { Page } from "./page";
import { isObject } from "../engine/is-object";

export type Listed<O> = O extends { rows: infer Rows } ? Rows : O | null;

export interface DataState<O> {
	data: Listed<O>;
	total: number | null;
	duplicates: DuplicateIdReport[];
	isLoading: boolean;
	failure: string | null;
}

export interface PageState<Item> {
	readonly data: readonly Item[];
	readonly total: number | null;
	readonly hasMore: boolean;
	readonly more: () => void;
	readonly isLoading: boolean;
	readonly failure: string | null;
}

interface Entry {
	readonly status: string;
	readonly data: unknown;
	readonly failure: string | null;
}

const NO_ROWS: readonly Row<unknown>[] = [];

export function useData<I, Item>(read: Action<I, Page<Item>>, input: Omit<I, "cursor">): PageState<Item>;
export function useData<I, O>(read: Action<I, O>, input?: I): DataState<O>;
export function useData<T>(value: T): DataState<T>;
export function useData(read: unknown, input?: unknown): DataState<unknown> | PageState<unknown> {
	const meta = metaOf(read);
	const isPaged = meta?.isPaged === true;
	const asked = isPaged ? withoutCursor(input) : input;
	const inputKey = stableKey(asked);
	const given = useMemo(() => givenEntryOf(read), [read]);
	const subscribe = useCallback(
		(listener: () => void) =>
			meta ? gatewayCache.subscribe(meta, asked, runnerOf(readingOf(read), meta, asked), listener) : () => {},
		[meta?.gatewayId, meta?.verb, inputKey],
	);
	const entry = useSyncExternalStore(subscribe, () => (meta ? gatewayCache.read(meta, asked) : given));
	const more = useCallback(() => {
		if (meta && isPaged) void gatewayCache.extend(meta, asked, nextPageOf(readingOf(read), asked));
	}, [read, meta?.gatewayId, inputKey]);

	return useMemo(() => {
		if (isPaged) return toPageState(entry, more);
		return toDataState(entry, meta ? meta.verb === "list" : Array.isArray(read));
	}, [entry, meta?.verb, more]);
}

function readingOf(read: unknown): PageReading {
	return isReading(read) ? read : () => Promise.resolve(null);
}

function isReading(held: unknown): held is PageReading {
	return typeof held === "function";
}

function runnerOf(read: PageReading, meta: ActionMeta, asked: unknown): Runner {
	if (!meta.isPaged) return (input, signal) => read(input, signal);
	return pagedRunnerOf(read, () => gatewayCache.read(meta, asked).data);
}

function givenEntryOf(value: unknown): Entry {
	const data = Array.isArray(value) ? { rows: value, total: value.length } : (value ?? null);
	return { status: "ready", data, failure: null };
}

function toPageState(entry: Entry, more: () => void): PageState<unknown> {
	const page = isPage(entry.data) ? entry.data : null;
	return {
		data: page?.items ?? [],
		total: page?.total ?? null,
		hasMore: page !== null && page.next !== null,
		more,
		isLoading: entry.status === "loading",
		failure: entry.failure,
	};
}

function toDataState(entry: Entry, listed: boolean): DataState<unknown> {
	const held = isObject(entry.data) ? entry.data : {};
	const total = held["total"];
	return {
		data: listed ? rowsIn(held["rows"]) : entry.data,
		total: typeof total === "number" ? total : null,
		duplicates: duplicatesIn(held["duplicates"]),
		isLoading: entry.status === "loading",
		failure: entry.failure,
	};
}

function rowsIn(held: unknown): readonly Row<unknown>[] {
	return Array.isArray(held) ? held : NO_ROWS;
}

function duplicatesIn(held: unknown): DuplicateIdReport[] {
	return Array.isArray(held) ? held : [];
}
