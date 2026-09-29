import type { CollectionOps, FilterRow, GatewayBase, GatewayRef, SortRow, ValueOps } from "./contract";

export type DeclaredFilterRow = Omit<FilterRow, "spread"> & { spread?: GatewayRef | { wants: string } };

import type { RecordRef } from "./contract";
export type { RecordRef };

export type StandardVerb = "list" | "get" | "create" | "update" | "remove";

export type Control =
	"line" | "text" | "number" | "boolean" | "emoji" | "icon" | "json" | "pick" | "row" | "memory" | "choice";

export interface Choice {
	readonly value: string;
	readonly label: string;
}

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

export interface PropSource {
	readonly implementation: string;
	readonly fields?: Readonly<Record<string, unknown>>;
}

export type Describes<Row> = { [K in keyof Row]?: string | Omit<FieldDescription, "aka"> };

export interface PropSeen {
	readonly kind: "collection" | "value";
	readonly control: Control | null;
	readonly binding: string;
	readonly isSet: boolean;
	readonly value?: unknown;
	readonly rows?: readonly unknown[];
}

export type PropsSeen = Readonly<Record<string, PropSeen>>;

export type Visibility = (props: PropsSeen) => boolean;

export interface PropCommon<Held> {
	label?: string;
	hint?: string;
	aka?: readonly string[];
	design?: boolean;
	isVisible?: Visibility;
	options?: [Held] extends [string] ? readonly Choice[] : never;
	wants?: string;
	shape?: string;
	where?: readonly DeclaredFilterRow[];
	sort?: readonly SortRow[];
	describes?: [Held] extends [readonly (infer Row)[]] ? Describes<Row> : never;
	tracks?: [Held] extends [readonly unknown[]] ? boolean : never;
	control?: ControlFor<Held>;
	keep?: [Held] extends [readonly unknown[]] ? never : "screen";
	source?: PropSource;
}
export interface PropSpec {
	readonly kind: "collection" | "value";
	readonly control?: Control;
	readonly type?: "line" | "text" | "number" | "boolean";
	readonly label: string;
	readonly hint?: string;
	readonly aka?: readonly string[];
	readonly design?: boolean;
	readonly isVisible?: Visibility;
	readonly options?: readonly Choice[];
	readonly wants?: string;
	readonly shape?: string;
	readonly writes: readonly string[];
	readonly describes?: Readonly<Record<string, FieldDescription>>;
	readonly tracks?: boolean;
	readonly where?: readonly DeclaredFilterRow[];
	readonly sort?: readonly SortRow[];
	readonly source?: PropSource;
	readonly default?: Readonly<Record<string, unknown>>;
}

export type RowWithRef<Row> = [Row] extends [{ ref: RecordRef }] ? Row : Row & { ref: RecordRef };

type VerbsIn<Written> = [Written] extends [readonly (infer Named extends string)[]] ? Named : never;

export type CollectionGatewayOf<Row, Written = never> = GatewayBase & { readonly kind: "collection" } & Pick<
		CollectionOps<RowWithRef<Row>>,
		"list" | "get" | Extract<VerbsIn<Written>, keyof CollectionOps<RowWithRef<Row>>>
	>;

export type ValueGatewayOf<Held, Written = never> = GatewayBase & { readonly kind: "value" } & Pick<
		ValueOps<Held>,
		"get" | Extract<VerbsIn<Written>, keyof ValueOps<Held>>
	>;

export interface ManifestCard {
	title: string;
	description: string;
	keywords?: readonly string[];
	role?: string;
	size?: WidgetSize;
	preview?: Readonly<Record<string, unknown>>;
	inline?: boolean;
	view?: string;
	slots?: Readonly<Record<string, HeldSpec>>;
	mounts?: Readonly<Record<string, HeldSpec>>;
}

export type PreferredWidth = number | "full";
export type PreferredHeight = number | "auto";

export interface SizeAtRegion {
	belowPx: number;
	preferredWidth?: PreferredWidth;
	preferredHeight?: PreferredHeight;
}

export interface WidgetSize {
	preferredWidth: PreferredWidth;
	preferredHeight: PreferredHeight;
	keepsRatio?: boolean;
	at?: readonly SizeAtRegion[];
	collapseBelowPx?: number;
	stackBelowPx?: number;
}

export interface HeldSpec {
	label?: string;
	hint?: string;
	was?: string;
	isVisible?: Visibility;
	default?: unknown;
	surface?: string;
	of?: string;
	gives?: Readonly<Record<string, readonly string[]>>;
}

export const HELD_KEYS: readonly string[] = ["label", "hint", "was", "isVisible", "default", "surface", "of", "gives"];

export type Manifest = ManifestCard & {
	props: Readonly<Record<string, PropSpec>>;
	isManifest: true;
};

export const PROP_MARK = "$prop";

const READS_A_LIST: readonly StandardVerb[] = ["list", "get"];
const READS_A_VALUE: readonly StandardVerb[] = ["get"];

export function verbNames(written: readonly string[] | undefined, reads: readonly StandardVerb[]): string[] {
	return [...new Set([...reads, ...(written ?? [])])];
}

interface WrittenProp {
	label?: string;
	hint?: string;
	aka?: readonly string[];
	design?: boolean;
	isVisible?: Visibility;
	options?: readonly Choice[];
	wants?: string;
	shape?: string;
	where?: readonly DeclaredFilterRow[];
	sort?: readonly SortRow[];
	describes?: Readonly<Record<string, string | FieldDescription>>;
	tracks?: boolean;
	control?: DrawnAs;
	keep?: "screen";
	source?: PropSource;
	default?: unknown;
	writes?: readonly string[];
}

const DRAWN_BY_DEFAULT: Readonly<Record<string, Control>> = { string: "line", number: "number", boolean: "boolean" };

const CONTROL_OF_SOURCE: Readonly<Record<string, Control>> = { "@core/selected-row": "row", "@core/selection": "pick" };

const PRIMITIVE_OF_CONTROL: Readonly<Record<string, "line" | "text" | "number" | "boolean">> = {
	choice: "line",
	line: "line",
	text: "text",
	number: "number",
	boolean: "boolean",
	emoji: "line",
	icon: "line",
};

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
			["isVisible", input.isVisible],
			["options", input.options],
			["wants", input.wants],
			["shape", input.shape],
			["where", input.where],
			["source", input.source],
			["sort", input.sort],
			["describes", input.describes === undefined ? undefined : describedFields(input.describes)],
			["tracks", input.tracks],
			["default", defaultOf(input, kind)],
		]),
		label: input.label ?? labelFromKey(name),
		writes: verbNames(input.writes, kind === "collection" ? READS_A_LIST : READS_A_VALUE),
	} as PropSpec;
}

const MANIFEST_REFUSED = "{title}: {why}";

const NO_PREFERRED_SIZE =
	'size names no preferredWidth (a number of pixels or "full") and preferredHeight (a number of pixels or "auto"): the size a widget is created at and leans toward';
const SIZE_AT_BAD = "size.at[{at}] needs a belowPx above 0 and a preferredWidth or preferredHeight of the same kinds";

export function sizeProblems(size: WidgetSize | undefined): string[] {
	if (!size || !isPreferredWidth(size.preferredWidth) || !isPreferredHeight(size.preferredHeight))
		return [NO_PREFERRED_SIZE];
	return (size.at ?? []).flatMap((step, at) => {
		const isBelowOk = typeof step?.belowPx === "number" && step.belowPx > 0;
		const saysSomething = step?.preferredWidth !== undefined || step?.preferredHeight !== undefined;
		const isWidthOk = step?.preferredWidth === undefined || isPreferredWidth(step.preferredWidth);
		const isHeightOk = step?.preferredHeight === undefined || isPreferredHeight(step.preferredHeight);
		return isBelowOk && saysSomething && isWidthOk && isHeightOk ? [] : [SIZE_AT_BAD.replace("{at}", String(at))];
	});
}

const DEFAULTS_TO_A_PATH = 'prop "{name}" defaults to a vault path, and a default may only be a value kept in the tile';
const DECLARES_NO_DEFAULT = 'prop "{name}" declares no default';
const SOURCE_PICKS_NO_ROW =
	'prop "{name}" starts from {implementation}; a widget may only start a prop from @core/selection or @core/selected-row, and the person binds everything else';
const REF_IS_RESERVED = "prop \"{name}\" describes a field named ref, and ref is the engine's name for a row's address";
const DEFAULT_CARRIES_A_REF =
	'prop "{name}" defaults to data carrying ref, and a row\'s address is minted by the engine';

const HELD_NAMES_NOTHING =
	'the {holder} "{name}" declares {key}, which the engine never reads — a misspelling here is silent';

const NOT_A_WRITTEN_PROP = 'prop "{name}" was not written by manifestOfModule';

export interface ManifestInput extends ManifestCard {
	props: Readonly<Record<string, unknown>>;
	size: WidgetSize;
}

export function manifestOfWritten(input: ManifestInput): Manifest {
	const props: Record<string, PropSpec> = {};
	const problems: string[] = [];
	for (const [name, given] of Object.entries(input.props)) {
		if (!isWrittenProp(given)) {
			problems.push(NOT_A_WRITTEN_PROP.replace("{name}", name));
			continue;
		}
		const spec = specOf(name, given);
		props[name] = spec;
		const problem = propProblem(name, spec, given as WrittenProp);
		if (problem) problems.push(problem);
	}
	problems.push(...heldProblems("slot", input.slots), ...heldProblems("mount", input.mounts));
	problems.push(...sizeProblems(input.size));
	if (problems.length > 0)
		throw new Error(MANIFEST_REFUSED.replace("{title}", input.title).replace("{why}", problems.join("; ")));
	return { ...input, props, isManifest: true };
}

function controlOf(input: WrittenProp, kind: string): Control | undefined {
	if (input.options) return "choice";
	if (input.control) return input.control;
	if (kind === "collection") return undefined;
	if (input.source)
		return CONTROL_OF_SOURCE[input.source.implementation] ?? DRAWN_BY_DEFAULT[typeof input.default] ?? "json";
	if (input.keep === "screen") return "memory";
	return DRAWN_BY_DEFAULT[typeof input.default] ?? "json";
}

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

function isPreferredWidth(held: unknown) {
	return held === "full" || (typeof held === "number" && held > 0);
}

function isPreferredHeight(held: unknown) {
	return held === "auto" || (typeof held === "number" && held > 0);
}

const isPlain = (held: unknown) => typeof held === "object" && held !== null && !Array.isArray(held);

function carriesKey(held: unknown, key: string): boolean {
	if (Array.isArray(held)) return held.some((one) => carriesKey(one, key));
	if (!isPlain(held)) return false;
	const inside = held as Readonly<Record<string, unknown>>;
	return key in inside || Object.values(inside).some((one) => carriesKey(one, key));
}

function propProblem(name: string, spec: PropSpec, input: WrittenProp): string | null {
	if (carriesKey(input.default, "path") || carriesKey(input.source?.fields, "path"))
		return DEFAULTS_TO_A_PATH.replace("{name}", name);
	if (input.source && !(input.source.implementation in CONTROL_OF_SOURCE))
		return SOURCE_PICKS_NO_ROW.replace("{name}", name).replace("{implementation}", input.source.implementation);
	if (spec.describes && "ref" in spec.describes) return REF_IS_RESERVED.replace("{name}", name);
	if (carriesKey(input.default, "ref")) return DEFAULT_CARRIES_A_REF.replace("{name}", name);
	if (input.default !== undefined || input.source !== undefined) return null;
	return DECLARES_NO_DEFAULT.replace("{name}", name);
}

function heldProblems(holder: string, held: Readonly<Record<string, HeldSpec>> | undefined): string[] {
	return Object.entries(held ?? {}).flatMap(([name, spec]) =>
		Object.keys(spec ?? {})
			.filter((key) => !HELD_KEYS.includes(key))
			.map((key) => HELD_NAMES_NOTHING.replace("{holder}", holder).replace("{name}", name).replace("{key}", key)),
	);
}

const isWrittenProp = (given: unknown) =>
	isPlain(given) && (given as Readonly<Record<string, unknown>>)[PROP_MARK] === true;
