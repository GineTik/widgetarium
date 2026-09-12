import type { Action, CollectionOps, ValueOps } from "./contract";

// TRADE-OFF: an alias erases to string so the checker allows a Text where a Day is wanted; the build reads the written name
export type Day = string;
export type Text = string;
export type Color = string;

// TRADE-OFF: the build reads the name off the syntax and the checker never does, so the parameter stands unused
export type Aka<_Names extends string> = unknown;

export interface VaultRecord {
	path: string;
	name: string;
	props?: Record<string, unknown>;
	[field: string]: unknown;
}

declare const suppliedByEngine: unique symbol;

interface EngineSupplied<Name extends string> {
	readonly [suppliedByEngine]: Name;
}

export type ListAction = EngineSupplied<"list">;
export type GetAction = EngineSupplied<"get">;
export type CreateAction = EngineSupplied<"create">;
export type UpdateAction = EngineSupplied<"update">;
export type RemoveAction = EngineSupplied<"remove">;

export interface DefaultVerbs {
	list: ListAction;
	get: GetAction;
	create: CreateAction;
	update: UpdateAction;
	remove: RemoveAction;
}

export interface DefaultValueVerbs {
	get: GetAction;
}

export interface EveryValueVerb {
	get: GetAction;
	update: UpdateAction;
	remove: RemoveAction;
}

type SuppliedAction<Supplies, EngineName, DeclaredAs> = EngineName extends keyof Supplies
	? DeclaredAs extends EngineName
		? Supplies[EngineName]
		: never
	: never;

// TRADE-OFF: an interface never satisfies Record<string, …>, so a wrong slot is refused per property instead of by a constraint
type ResolvedAgainst<Supplies, Wanted> = {
	-readonly [DeclaredAs in keyof Wanted]-?: NonNullable<Wanted[DeclaredAs]> extends EngineSupplied<infer EngineName>
		? SuppliedAction<Supplies, EngineName, DeclaredAs>
		: NonNullable<Wanted[DeclaredAs]> extends Action<never, unknown>
			? NonNullable<Wanted[DeclaredAs]>
			: never;
};

export type ResolvedOps<T, Wanted> = ResolvedAgainst<CollectionOps<T>, Wanted>;

export type ResolvedValueOps<T, Wanted> = ResolvedAgainst<ValueOps<T>, Wanted>;
