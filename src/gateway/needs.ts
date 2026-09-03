import type { Action, CollectionOps } from "./contract";

// TRADE-OFF: an alias erases to string so the checker allows a Text where a Day is wanted; the build reads the written name
export type Day = string;
export type Text = string;
export type Color = string;

// TRADE-OFF: Names is read by the build off the syntax, never by the checker, so the alias is transparent on purpose
export type Aka<Names extends string> = unknown;

export interface VaultRecord {
	path: string;
	name: string;
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

type SuppliedAction<T, EngineName, DeclaredAs> = EngineName extends keyof CollectionOps<T>
	? DeclaredAs extends EngineName
		? CollectionOps<T>[EngineName]
		: never
	: never;

// TRADE-OFF: an interface never satisfies Record<string, …>, so a wrong slot is refused per property instead of by a constraint
export type ResolvedOps<T, Wanted> = {
	-readonly [DeclaredAs in keyof Wanted]-?: NonNullable<Wanted[DeclaredAs]> extends EngineSupplied<infer EngineName>
		? SuppliedAction<T, EngineName, DeclaredAs>
		: NonNullable<Wanted[DeclaredAs]> extends Action<never, unknown>
			? NonNullable<Wanted[DeclaredAs]>
			: never;
};
