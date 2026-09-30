import type { z } from "zod";
import type { Action, GatewayBase, Query, Row, RowsResult } from "./contract";
import type { ManifestCard, PropCommon, RecordRef, RowWithRef, WidgetSize } from "./manifest";
import type { ManyVerbsOf } from "./many";
import type { Described } from "./written";
import type {
	Answer,
	CollectionWrite,
	IListGateway,
	ImplementationWrite,
	IValueGateway,
	ListContract,
	PassedDeclared,
	Read,
	ValueContract,
	ValueWrite,
} from "./declared";

export declare const rowHeld: unique symbol;
export declare const valueHeld: unique symbol;
export declare const valueWrites: unique symbol;
export declare const listWrites: unique symbol;
export declare const createIn: unique symbol;
export declare const patchIn: unique symbol;
export declare const valueIn: unique symbol;
export declare const gatewayKind: unique symbol;
export declare const passedAs: unique symbol;

interface ImplementationOps<Held> {
	replace: Action<readonly Partial<Held>[], void>;
	repairIds: Action<void, number>;
}

export type ShapesOf = {
	readonly read?: z.ZodType;
	readonly create?: z.ZodType;
	readonly update?: z.ZodType;
	readonly other?: z.ZodType;
} & ({ readonly read: z.ZodType } | { readonly other: z.ZodType });

export type SchemaOrShapes = z.ZodType | ShapesOf;

type ReadSchemaOf<X> = X extends z.ZodType
	? X
	: X extends { readonly read: infer R extends z.ZodType }
		? R
		: X extends { readonly other: infer O extends z.ZodType }
			? O
			: never;

export type ReadOf<X> = z.output<ReadSchemaOf<X>>;

export type CreateInOf<X> = X extends { readonly create: infer C extends z.ZodType }
	? z.input<C>
	: X extends { readonly other: infer O extends z.ZodType }
		? z.input<O>
		: Partial<ReadOf<X>>;

export type PatchInOf<X> = Partial<
	X extends { readonly update: infer U extends z.ZodType }
		? z.input<U>
		: X extends { readonly other: infer O extends z.ZodType }
			? z.input<O>
			: ReadOf<X>
>;

export type ValueInOf<X> = X extends { readonly update: infer U extends z.ZodType }
	? z.input<U>
	: X extends { readonly other: infer O extends z.ZodType }
		? z.input<O>
		: ReadOf<X>;

export type ListDeclared<
	Held,
	Verbs extends string,
	CreateIn = Partial<Held>,
	PatchIn = Partial<Held>,
	Pickable extends string = Read | CollectionWrite | ImplementationWrite,
> = typeof ListContract<Held> & {
	readonly [rowHeld]?: Held;
	readonly [listWrites]?: Verbs;
	readonly [createIn]?: CreateIn;
	readonly [patchIn]?: PatchIn;
	pick<const K extends Pickable>(...verbs: K[]): ListDeclared<Held, K, CreateIn, PatchIn, Pickable>;
};

export type ValueDeclared<Held, Verbs extends string, ValueIn = Held> = typeof ValueContract<Held> & {
	readonly [valueHeld]?: Held;
	readonly [valueWrites]?: Verbs;
	readonly [valueIn]?: ValueIn;
	pick<const K extends "get" | ValueWrite>(...verbs: K[]): ValueDeclared<Held, K, ValueIn>;
};

interface ListVerbs<R, CreateIn, PatchIn> {
	list: Action<Query | void, RowsResult<R>>;
	get: Action<RecordRef, Row<R> | null>;
	create: Action<CreateIn, Row<R> | null>;
	update: Action<{ ref: RecordRef; data: PatchIn }, Row<R> | null>;
	remove: Action<RecordRef, void>;
}

type DrawnList<Held, Verbs extends string, CreateIn, PatchIn> = GatewayBase & { readonly kind: "collection" } & Pick<
		ListVerbs<RowWithRef<Held>, CreateIn, PatchIn>,
		Extract<Verbs, keyof ListVerbs<Held, CreateIn, PatchIn>>
	> &
	Pick<ImplementationOps<Held>, Extract<Verbs, ImplementationWrite>> &
	ManyVerbsOf<RowWithRef<Held>, Verbs, CreateIn, PatchIn>;

interface ValueWrites<Held, ValueIn> {
	update(value: ValueIn): Answer<Held | null>;
	remove(): Answer<void>;
}

interface ListWrites<Held, CreateIn, PatchIn> {
	create(data: CreateIn): Answer<Row<Held> | null>;
	update(patch: { ref: RecordRef; data: PatchIn }): Answer<Row<Held> | null>;
	remove(ref: RecordRef): Answer<void>;
	replace(rows: readonly Partial<Held>[]): Answer<void>;
	repairIds(): Answer<number>;
}

type ListWriteName = keyof ListWrites<unknown, unknown, unknown>;
type ValueWriteName = keyof ValueWrites<unknown, unknown>;

export type Implementation<C> = C extends {
	readonly [valueHeld]?: infer Held;
	readonly [valueWrites]?: infer Verbs;
	readonly [valueIn]?: infer ValueIn;
}
	? ValueContract<Held> & Pick<ValueWrites<Held, ValueIn>, Extract<Verbs, ValueWriteName>>
	: C extends {
				readonly [rowHeld]?: infer Held;
				readonly [listWrites]?: infer Verbs;
				readonly [createIn]?: infer CreateIn;
				readonly [patchIn]?: infer PatchIn;
		  }
		? ListContract<Held> & Pick<ListWrites<Held, CreateIn, PatchIn>, Extract<Verbs, ListWriteName>>
		: never;

type AnyImplementation<C> = C extends { readonly [valueWrites]?: infer Verbs }
	? IValueGateway & Pick<ValueWrites<unknown, never>, Extract<Verbs, ValueWriteName>>
	: C extends { readonly [listWrites]?: infer Verbs }
		? IListGateway & Pick<ListWrites<unknown, never, never>, Extract<Verbs, ListWriteName>>
		: never;

export type WidgetProp = ValueDeclared<unknown, string> | ListDeclared<unknown, string> | PassedDeclared<unknown>;

export type DeclaredProps = Readonly<Record<string, WidgetProp>>;

type DrawnOf<C> = C extends { readonly [passedAs]?: infer Drawn }
	? Drawn
	: C extends {
				readonly [valueHeld]?: infer Held;
				readonly [valueWrites]?: infer Verbs;
				readonly [valueIn]?: infer ValueIn;
		  }
		? [Exclude<Verbs, "get">] extends [never]
			? Held
			: DrawnValue<Held, Verbs, ValueIn>
		: C extends {
					readonly [rowHeld]?: infer Held;
					readonly [listWrites]?: infer Verbs extends string;
					readonly [createIn]?: infer CreateIn;
					readonly [patchIn]?: infer PatchIn;
			  }
			? DrawnList<Held, Verbs, CreateIn, PatchIn>
			: never;

type GivenOf<C> = C extends { readonly [passedAs]?: infer Drawn }
	? Drawn
	: C extends { readonly [valueHeld]?: infer Held }
		? Held | AnyImplementation<C>
		: C extends { readonly [rowHeld]?: infer Held }
			? readonly Held[] | AnyImplementation<C>
			: never;

type DrawnValue<Held, Verbs, ValueIn> = (["get"] extends [Verbs] ? { readonly value: Held } : unknown) &
	(["update"] extends [Verbs] ? { readonly update: Action<ValueIn, Held | null> } : unknown) &
	(["remove"] extends [Verbs] ? { readonly remove: Action<void, void> } : unknown);

export type DrawnProps<P> = { readonly [K in keyof P]: DrawnOf<P[K]> };

export type GivenProps<P> = { readonly [K in keyof P]?: GivenOf<P[K]> };

type HeldOf<C> = C extends { readonly [valueHeld]?: infer Held }
	? Held
	: C extends { readonly [rowHeld]?: infer Held }
		? readonly Held[]
		: never;

type DescribedKey =
	| "label"
	| "hint"
	| "aka"
	| "design"
	| "isVisible"
	| "control"
	| "options"
	| "wants"
	| "shape"
	| "tracks"
	| "describes"
	| "keep"
	| "source";

export type PropMetadata<Held> = Pick<PropCommon<Held>, DescribedKey>;

export type WidgetMetadata<P = DeclaredProps> = Pick<ManifestCard, "title" | "description" | "keywords" | "preview"> & {
	props?: { readonly [K in keyof P]?: PropMetadata<HeldOf<P[K]>> };
};

export type WidgetLayout = Pick<ManifestCard, "role" | "inline" | "view"> & { size: WidgetSize };

export interface DeclaredModule {
	readonly default?: { readonly declared?: DeclaredProps };
	readonly metadata?: Partial<Pick<ManifestCard, "title" | "description" | "keywords" | "preview">> & {
		readonly props?: Described;
	};
	readonly layout?: WidgetLayout;
	readonly migrations?: readonly MigrationStep<DeclaredProps>[];
}

export interface TileProp {
	readonly from?: string;
	readonly value?: unknown;
	readonly rows?: readonly unknown[];
	readonly [key: string]: unknown;
}

export interface MigrationStep<From extends DeclaredProps> {
	readonly from: From;
	run(old: { readonly [K in keyof From]?: TileProp }): Readonly<Record<string, TileProp>>;
}

export interface DeclaredWidget<P extends DeclaredProps> {
	readonly declared: P;
}
