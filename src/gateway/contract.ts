import type { DefaultVerbs, ResolvedOps } from "./needs";

export type Ref = string;

export interface Row<T> {
	ref: Ref;
	value: T;
}

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
	// CONTEXT: found on the read and carried — the re-mint waits for a write
	duplicates?: DuplicateIdReport[];
}

export interface Patch<T> {
	ref: Ref;
	data: Partial<T>;
}

export interface CollectionOps<T> {
	list: Action<Query | void, RowsResult<T>>;
	get: Action<Ref, Row<T> | null>;
	create: Action<Partial<T>, Row<T> | null>;
	update: Action<Patch<T>, Row<T> | null>;
	remove: Action<Ref, void>;
}


export interface ValueOps<T> {
	get: Action<void, T | null>;
	update: Action<T, T | null>;
	remove: Action<void, void>;
}

export interface GatewayEvent {
	refs?: Ref[];
}

export type Unsubscribe = () => void;

export interface GatewayBase {
	readonly id: string;
	subscribe(listener: (event: GatewayEvent) => void): Unsubscribe;
}

export type OpMap = Record<string, Action<never, unknown>>;

export type CollectionGateway<T, Wanted = DefaultVerbs> = GatewayBase & {
	readonly kind: "collection";
} & ResolvedOps<T, Wanted>;

export type ValueGateway<T, Ops extends OpMap = Record<never, never>> = GatewayBase & {
	readonly kind: "value";
} & ValueOps<T> &
	Ops;

export const COLLECTION_VERBS = ["list", "get", "create", "update", "remove"] as const;
export const VALUE_VERBS = ["get", "update", "remove"] as const;
