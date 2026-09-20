import type { Action, CollectionOps, FilterRow, GatewayBase, GatewayRef, SortRow, ValueOps } from "./contract";
import { COLLECTION_VERBS } from "./contract";

export type DeclaredFilterRow = Omit<FilterRow, "spread"> & { spread?: GatewayRef | { wants: string } };

declare const recordRef: unique symbol;

export type RecordRef = string & { readonly [recordRef]: true };

export type StandardVerb = "list" | "get" | "create" | "update" | "remove";

declare const verbTypes: unique symbol;

export interface CustomVerb<Input, Output> {
	readonly custom: true;
	readonly [verbTypes]?: (input: Input) => Output;
}

export type WritesRow = readonly StandardVerb[] | Readonly<Record<string, true | CustomVerb<never, unknown>>>;

export type Control = "line" | "text" | "number" | "boolean" | "emoji" | "icon" | "json" | "pick" | "row" | "memory";

export type DrawnAs = "line" | "text" | "number" | "boolean" | "emoji" | "icon" | "json";

type ControlFor<Held> = [Held] extends [readonly unknown[]]
	? never
	: [Held] extends [string]
		? "line" | "text" | "emoji" | "icon"
		: [Held] extends [number]
			? "number"
			: [Held] extends [boolean]
				? "boolean"
				: "json";

export interface FieldDescription {
	label?: string;
	hint?: string;
	aka?: readonly string[];
	type?: string;
	many?: boolean;
	required?: boolean;
}

export type Describes<Row> = { [K in keyof Row]?: string | FieldDescription };

interface PropCommon<Held> {
	label?: string;
	hint?: string;
	aka?: readonly string[];
	design?: boolean;
	wants?: string;
	shape?: string;
	where?: readonly DeclaredFilterRow[];
	sort?: readonly SortRow[];
	describes?: [Held] extends [readonly (infer Row)[]] ? Describes<Row> : never;
	tracks?: [Held] extends [readonly unknown[]] ? boolean : never;
	control?: ControlFor<Held>;
	keep?: [Held] extends [readonly unknown[]] ? never : "screen";
}

interface Picking {
	of: string;
	picks?: string;
	field?: string;
	fieldFrom?: string;
	fallback?: "first";
}

type NamedKeys<T> = keyof { [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K] };

type ReservedRefRefused<Held> = [Held] extends [readonly (infer Row)[]]
	? "ref" extends NamedKeys<Row>
		? [Row["ref"]] extends [RecordRef]
			? unknown
			: { "the field ref is reserved: type it as RecordRef or leave it out of the row type": never }
		: unknown
	: unknown;

type DefaultFor<Held> = [Held] extends [readonly (infer Row)[]] ? readonly Partial<Row>[] : Held;

export type PropInput<Held> = (
	(PropCommon<Held> & { default: DefaultFor<Held> }) | (PropCommon<Held> & Picking & { default?: DefaultFor<Held> })
) & {
	writes?: WritesRow;
} & ReservedRefRefused<Held>;

declare const isProp: unique symbol;

export type Prop<Held, Written = never> = { readonly [isProp]: [Held, Written] };

export type HeldBy<P> = P extends Prop<infer Held, unknown> ? Held : never;

export type WrittenBy<P> = P extends Prop<unknown, infer Written> ? Written : never;

export interface PropSpec {
	readonly kind: "collection" | "value";
	readonly control?: Control;
	readonly type?: "line" | "text" | "number" | "boolean";
	readonly label: string;
	readonly hint?: string;
	readonly aka?: readonly string[];
	readonly design?: boolean;
	readonly wants?: string;
	readonly shape?: string;
	readonly writes: readonly string[];
	readonly describes?: Readonly<Record<string, FieldDescription>>;
	readonly tracks?: boolean;
	readonly where?: readonly DeclaredFilterRow[];
	readonly sort?: readonly SortRow[];
	readonly of?: string;
	readonly picks?: string;
	readonly field?: string;
	readonly fieldFrom?: string;
	readonly fallback?: "first";
	readonly default?: Readonly<Record<string, unknown>>;
}

type RowWithRef<Row> = [Row] extends [{ ref: RecordRef }] ? Row : Row & { ref: RecordRef };

type OwnActions<Written> = [Written] extends [never]
	? unknown
	: [Written] extends [readonly unknown[]]
		? unknown
		: [Written] extends [Readonly<Record<string, unknown>>]
			? {
					[
						K in keyof Written as Written[K] extends { readonly custom: true } ? K : never
					]: Written[K] extends CustomVerb<infer Input, infer Output> ? Action<Input, Output> : never;
				}
			: unknown;

type VerbsIn<Written> = [Written] extends [readonly (infer Named extends string)[]]
	? Named
	: [Written] extends [Readonly<Record<string, unknown>>]
		? Extract<keyof Written, string>
		: never;

export type CollectionGatewayOf<Row, Written = never> = GatewayBase & { readonly kind: "collection" } & Pick<
		CollectionOps<RowWithRef<Row>>,
		"list" | "get" | Extract<VerbsIn<Written>, keyof CollectionOps<RowWithRef<Row>>>
	> &
	OwnActions<Written>;

export type ValueGatewayOf<Held, Written = never> = GatewayBase & { readonly kind: "value" } & Pick<
		ValueOps<Held>,
		"get" | Extract<VerbsIn<Written>, keyof ValueOps<Held>>
	> &
	OwnActions<Written>;

export type GatewayOf<Held, Written = never> = [Held] extends [readonly (infer Row)[]]
	? CollectionGatewayOf<Row, Written>
	: ValueGatewayOf<Held, Written>;

export interface ManifestCard {
	title: string;
	description: string;
	keywords?: readonly string[];
	role?: string;
	size?: { collapseBelowPx?: number; stackBelowPx?: number; tallestPx?: number; shortestPx?: number };
	preview?: Readonly<Record<string, unknown>>;
	inline?: boolean;
	view?: string;
	slots?: Readonly<Record<string, unknown>>;
	mounts?: Readonly<Record<string, unknown>>;
}

declare const propsHeld: unique symbol;

export type Manifest<
	P = Record<string, Prop<unknown, unknown>>,
	Inline extends boolean | undefined = boolean | undefined,
> = ManifestCard & {
	props: Readonly<Record<string, PropSpec>>;
	inline?: Inline;
	migrate?: readonly Migration<never>[];
	isManifest: true;
	readonly [propsHeld]?: P;
};

type PropsHeldBy<M> = M extends { readonly [propsHeld]?: infer P } ? NonNullable<P> : never;

export type PropsOf<M> = {
	[K in keyof PropsHeldBy<M>]: GatewayOf<HeldBy<PropsHeldBy<M>[K]>, WrittenBy<PropsHeldBy<M>[K]>>;
};

type BindingOf<Held> = [Held] extends [readonly (infer Row)[]]
	? | { from: "vault"; path: string; allow?: readonly string[] }
		| { from: "typed"; rows: readonly Row[]; allow?: readonly string[] }
		| { from: "ref"; ref: string }
	: | { from: "vault"; path: string; field?: string; allow?: readonly string[] }
		| { from: "typed"; value: Held; allow?: readonly string[] }
		| { from: "ref"; ref: string };

export type TileConfigOf<Held> = { [K in keyof Held]: BindingOf<Held[K]> };

export interface Migration<From> {
	readonly from: { [K in keyof From]: Prop<From[K], unknown> };
	run(old: TileConfigOf<From>): Readonly<Record<string, unknown>>;
}

export function verb<Input, Output = void>(): CustomVerb<Input, Output> {
	return { custom: true };
}

export function migration<From>(spec: Migration<From>): Migration<From> {
	const named = Object.entries(spec.from as Readonly<Record<string, unknown>>);
	return {
		...spec,
		from: Object.fromEntries(
			named.map(([name, prop]) => [name, specOf(name, prop)]),
		) as unknown as Migration<From>["from"],
	};
}

export const PROP_MARK = "$prop";

export function defineProp<Held>() {
	return <const P extends PropInput<Held>>(
		input: P,
	): Prop<Held, P extends { writes: infer Written } ? Written : never> =>
		({ ...(input as object), [PROP_MARK]: true }) as unknown as Prop<
			Held,
			P extends { writes: infer Written } ? Written : never
		>;
}

const OWN_VERB_UNTYPED =
	'the verb "{verb}" is not one the engine supplies, so it has to be declared as verb<Input, Output>()';
const STANDARD_VERBS: readonly string[] = COLLECTION_VERBS;

const READS_A_LIST: readonly StandardVerb[] = ["list", "get"];
const READS_A_VALUE: readonly StandardVerb[] = ["get"];

export function verbNames(written: WritesRow | undefined, reads: readonly StandardVerb[]): string[] {
	if (!written) return [...reads];
	if (Array.isArray(written)) return [...new Set([...reads, ...written])];
	const named = written as Readonly<Record<string, true | CustomVerb<never, unknown>>>;
	const untyped = Object.entries(named).find(([verb, declared]) => declared === true && !STANDARD_VERBS.includes(verb));
	if (untyped) throw new Error(OWN_VERB_UNTYPED.replace("{verb}", untyped[0]));
	return [...new Set([...reads, ...Object.keys(named)])];
}

interface WrittenProp {
	label?: string;
	hint?: string;
	aka?: readonly string[];
	design?: boolean;
	wants?: string;
	shape?: string;
	where?: readonly DeclaredFilterRow[];
	sort?: readonly SortRow[];
	describes?: Readonly<Record<string, string | FieldDescription>>;
	tracks?: boolean;
	control?: DrawnAs;
	keep?: "screen";
	of?: string;
	picks?: string;
	field?: string;
	fieldFrom?: string;
	fallback?: "first";
	default?: unknown;
	writes?: WritesRow;
}

const DRAWN_BY_DEFAULT: Readonly<Record<string, Control>> = { string: "line", number: "number", boolean: "boolean" };

function controlOf(input: WrittenProp, kind: string): Control | undefined {
	if (input.control) return input.control;
	if (kind === "collection") return undefined;
	if (input.picks) return "row";
	if (input.of) return "pick";
	if (input.keep === "screen") return "memory";
	return DRAWN_BY_DEFAULT[typeof input.default] ?? "json";
}

const PRIMITIVE_OF_CONTROL: Readonly<Record<string, "line" | "text" | "number" | "boolean">> = {
	line: "line",
	text: "text",
	number: "number",
	boolean: "boolean",
	emoji: "line",
	icon: "line",
};

function describedFields(describes: Readonly<Record<string, string | FieldDescription>>) {
	return Object.fromEntries(
		Object.entries(describes).map(([field, held]) => [field, typeof held === "string" ? { label: held } : held]),
	) as Readonly<Record<string, FieldDescription>>;
}

const labelFromKey = (name: string) => {
	const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

function defaultOf(input: WrittenProp, kind: string): Readonly<Record<string, unknown>> | undefined {
	if (input.default === undefined) return undefined;
	if (kind === "collection") return { rows: input.default as readonly unknown[] };
	if (input.keep === "screen") return { from: "memory", value: input.default };
	return { value: input.default };
}

const present = (entries: [string, unknown][]) => Object.fromEntries(entries.filter(([, held]) => held !== undefined));

export function specOf(name: string, given: unknown): PropSpec {
	const input = given as WrittenProp;
	const kind = Array.isArray(input.default) ? "collection" : "value";
	const control = controlOf(input, kind);
	return {
		kind,
		...present([
			["control", control],
			["type", control === undefined ? undefined : PRIMITIVE_OF_CONTROL[control]],
			["hint", input.hint],
			["aka", input.aka],
			["design", input.design],
			["wants", input.wants],
			["shape", input.shape],
			["where", input.where],
			["sort", input.sort],
			["of", input.of],
			["picks", input.picks],
			["field", input.field],
			["fieldFrom", input.fieldFrom],
			["fallback", input.fallback],
			["describes", input.describes === undefined ? undefined : describedFields(input.describes)],
			["tracks", input.tracks],
			["default", defaultOf(input, kind)],
		]),
		label: input.label ?? labelFromKey(name),
		writes: verbNames(input.writes, kind === "collection" ? READS_A_LIST : READS_A_VALUE),
	} as PropSpec;
}

const MANIFEST_REFUSED = "{title}: {why}";

const NOT_A_PROP = 'prop "{name}" is not made by defineProp';
const DEFAULTS_TO_A_PATH = 'prop "{name}" defaults to a vault path, and a default may only be a value kept in the tile';
const DECLARES_NO_DEFAULT = 'prop "{name}" declares no default';
const REF_IS_RESERVED = "prop \"{name}\" describes a field named ref, and ref is the engine's name for a row's address";
const DEFAULT_CARRIES_A_REF =
	'prop "{name}" defaults to data carrying ref, and a row\'s address is minted by the engine';
const MIGRATES_FROM_NOTHING = "migration {at} names no props it migrates from";

const isPlain = (held: unknown) => typeof held === "object" && held !== null && !Array.isArray(held);

function carriesKey(held: unknown, key: string): boolean {
	if (Array.isArray(held)) return held.some((one) => carriesKey(one, key));
	if (!isPlain(held)) return false;
	const inside = held as Readonly<Record<string, unknown>>;
	return key in inside || Object.values(inside).some((one) => carriesKey(one, key));
}

function propProblem(name: string, spec: PropSpec, input: WrittenProp): string | null {
	if (carriesKey(input.default, "path")) return DEFAULTS_TO_A_PATH.replace("{name}", name);
	if (spec.describes && "ref" in spec.describes) return REF_IS_RESERVED.replace("{name}", name);
	if (carriesKey(input.default, "ref")) return DEFAULT_CARRIES_A_REF.replace("{name}", name);
	if (input.default !== undefined || input.of !== undefined) return null;
	return DECLARES_NO_DEFAULT.replace("{name}", name);
}

const migrationProblem = (step: Migration<never>, at: number) =>
	Object.keys(step.from ?? {}).length === 0 ? MIGRATES_FROM_NOTHING.replace("{at}", String(at + 1)) : null;

const madeByDefineProp = (given: unknown) =>
	isPlain(given) && (given as Readonly<Record<string, unknown>>)[PROP_MARK] === true;

export interface ManifestInput<P extends Record<string, Prop<unknown, unknown>>> extends ManifestCard {
	props: P;
	migrate?: readonly Migration<never>[];
}

export function defineManifest<
	const P extends Record<string, Prop<unknown, unknown>>,
	const M extends ManifestInput<P>,
>(input: M & ManifestInput<P>): Manifest<P, M extends { inline: true } ? true : undefined> {
	const props: Record<string, PropSpec> = {};
	const problems: string[] = [];
	for (const [name, given] of Object.entries(input.props as Readonly<Record<string, unknown>>)) {
		if (!madeByDefineProp(given)) {
			problems.push(NOT_A_PROP.replace("{name}", name));
			continue;
		}
		const spec = specOf(name, given);
		props[name] = spec;
		const problem = propProblem(name, spec, given as WrittenProp);
		if (problem) problems.push(problem);
	}
	for (const [at, step] of (input.migrate ?? []).entries()) {
		const problem = migrationProblem(step, at);
		if (problem) problems.push(problem);
	}
	if (problems.length > 0)
		throw new Error(MANIFEST_REFUSED.replace("{title}", input.title).replace("{why}", problems.join("; ")));
	return { ...input, props, isManifest: true } as unknown as Manifest<P, M extends { inline: true } ? true : undefined>;
}
