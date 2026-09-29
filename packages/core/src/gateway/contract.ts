import type { DefaultValueVerbs, DefaultVerbs, ResolvedOps, ResolvedValueOps } from "./needs";

declare const recordRef: unique symbol;

export type RecordRef = string & { readonly [recordRef]: true };

export type Row<T> = T & { ref: RecordRef };

export type CanResult = { can: true } | { can: false; reason: string };

export type Action<I, O> = ((input: I) => Promise<O>) & { can(): CanResult };

export type MaybePromise<O> = O | Promise<O>;

export interface GatewayRef {
	ref: string;
}

export interface FilterRow {
	prop?: string;
	op?: string;
	value?: unknown;
	spread?: GatewayRef;
	fixed?: boolean;
	by?: string;
}

export interface SortRow {
	prop: string;
	dir?: "asc" | "desc";
	fixed?: boolean;
	by?: string;
}

export interface Query {
	where?: FilterRow[];
	sort?: SortRow[];
	offset?: number;
	limit?: number;
}

export interface DuplicateIdReport {
	id: string;
	keeps: string;
	remints: string[];
}

export interface RowsResult<T> {
	rows: Row<T>[];
	total: number;
	duplicates?: DuplicateIdReport[];
}

export interface Patch<T> {
	ref: RecordRef;
	data: Partial<T>;
}

export interface CollectionOps<T> {
	list: Action<Query | void, RowsResult<T>>;
	get: Action<RecordRef, Row<T> | null>;
	create: Action<Partial<T>, Row<T> | null>;
	update: Action<Patch<T>, Row<T> | null>;
	remove: Action<RecordRef, void>;
}

export interface ValueOps<T> {
	get: Action<void, T | null>;
	update: Action<T, T | null>;
	remove: Action<void, void>;
}

export interface GatewayEvent {
	refs?: RecordRef[];
}

export type Unsubscribe = () => void;

export interface GatewayBase {
	readonly id: string;
	subscribe(listener: (event: GatewayEvent) => void): Unsubscribe;
}

export type CollectionGateway<T, Wanted = DefaultVerbs> = GatewayBase & {
	readonly kind: "collection";
} & ResolvedOps<T, Wanted>;

export type ValueGateway<T, Wanted = DefaultValueVerbs> = GatewayBase & {
	readonly kind: "value";
} & ResolvedValueOps<T, Wanted>;

export const COLLECTION_VERBS = ["list", "get", "create", "update", "remove"] as const;
export const VALUE_VERBS = ["get", "update", "remove"] as const;

export type PropKind = "collection" | "value";
