import {
	applyQuery,
	arrayGateway,
	collectionGateway,
	refuseVerb,
	rowOf,
	soloGateway,
	toRows,
	valueGateway,
	valueIn,
} from "./create";
import type { Action, CollectionGateway, Query, Row, RowsResult, ValueGateway } from "./contract";
import type { EveryValueVerb } from "./needs";
import type { FieldDescription } from "./manifest";
import type { DeclaredNeed } from "./resolve-needs";
import type { FieldType } from "./fields";
import { stableKey } from "./cache";
import { FIELD_TYPES } from "./fields";

export interface PropDefault {
	readonly value?: unknown;
	readonly rows?: unknown;
	readonly from?: unknown;
}

export interface DeclaredProp {
	readonly kind?: unknown;
	readonly describes?: Readonly<Record<string, FieldDescription>> | null;
	readonly default?: PropDefault | null;
	readonly writes?: readonly string[] | null;
	readonly source?: unknown;
}

export interface PropConfig {
	readonly from?: unknown;
	readonly ref?: unknown;
	readonly path?: unknown;
	readonly value?: unknown;
	readonly rows?: unknown;
	readonly allow?: unknown;
}

export interface SlotManifest {
	readonly id?: unknown;
	readonly props?: Readonly<Record<string, DeclaredProp>> | null;
}

export interface HeldSlot {
	readonly props?: Readonly<Record<string, PropConfig | null | undefined>> | null;
}

export interface DescribedField {
	readonly key: string;
	readonly label: string;
	readonly type: string;
	readonly required: boolean;
}

export type NeedOfField = Omit<FieldDescription, "type"> & DeclaredNeed;

export type TypedKey = "rows" | "value";

export type PropBinding = "stat" | "ref" | "box" | "hardcode" | "vault" | "memory";

export interface BoundProp {
	readonly kind: "value" | "collection";
	readonly binding: PropBinding;
}

export type VerbDecision =
	| { readonly verb: string; readonly can: true; readonly reason: null }
	| { readonly verb: string; readonly can: false; readonly reason: string };

export type StoredRow = Row<unknown>;

export type DeclaredGateway = CollectionGateway<unknown> | ValueGateway<unknown, EveryValueVerb>;

export interface HardcodeOptions {
	readonly id: string;
	readonly readValue: () => unknown;
	readonly mutateValue: (step: (stored: unknown) => unknown) => void;
	readonly requested?: readonly string[];
}

type Held<T> = T | null | undefined;

type RowsStep = (rows: readonly StoredRow[]) => readonly StoredRow[];

type RowsWrite = (step: RowsStep) => void;

type BindingRule = readonly [PropBinding, (declared: DeclaredProp, held: PropConfig) => boolean];

type RefusedVerb = Extract<VerbDecision, { readonly can: false }>;

interface RowPatch {
	readonly ref: string;
	readonly data?: unknown;
}

const BINDING_BY_CONFIG_SHAPE: readonly BindingRule[] = [
	["stat", (declared, held) => declared.kind === "value" && held.from === "stat"],
	["ref", (_declared, held) => held.from === "ref" || typeof held.ref === "string"],
	["box", (declared) => Boolean(declared.source)],
	["hardcode", (_declared, held) => held.from === "typed"],
	["vault", (_declared, held) => held.from === "vault"],
	["hardcode", (declared, held) => typedIn(declared, held) !== undefined],
	["vault", (_declared, held) => Boolean(held.path)],
	["memory", (declared) => declared.default?.from === "memory"],
];

const VERBS_A_VAULT_BINDING_OFFERS_UNASKED: readonly string[] = ["list", "get"];
const NOT_SWITCHED_ON = "{verb} is not switched on for this tile";

const ALLOW_IS_NOT_A_LIST =
	"[widgetarium] a tile's allow is not a list of verbs, so only what its binding offers unasked is switched on:";

export function slotDefaults(manifest: Held<SlotManifest>, held: Held<HeldSlot>): Record<string, DeclaredGateway> {
	if (!manifest) return {};
	const manifestId = String(manifest.id);
	return Object.fromEntries(
		Object.entries(manifest.props ?? {}).map(([name, spec]) => [
			name,
			createDeclaredGateway(`${manifestId}/${name}`, spec, held?.props?.[name]),
		]),
	);
}

export function describedFields(spec: Held<DeclaredProp>): DescribedField[] {
	return Object.entries(spec?.describes ?? {}).map(([key, held]) => ({
		key,
		label: held.label ?? labelFromKey(key),
		type: held.type ?? "text",
		required: held.required === true,
	}));
}

export function needsOf(spec: Held<DeclaredProp>): Record<string, NeedOfField> {
	const mapped = Object.entries(spec?.describes ?? {}).filter(([, held]) => Array.isArray(held.aka));
	return Object.fromEntries(mapped.map(([field, held]) => [field, { ...held, type: fieldTypeOf(held.type) }]));
}

export function declaredOf(spec: Held<DeclaredProp>): unknown {
	return spec?.kind === "collection" ? spec.default?.rows : spec?.default?.value;
}

export function typedKeyOf(spec: Held<DeclaredProp>): TypedKey {
	return spec?.kind === "collection" ? "rows" : "value";
}

export function typedIn(spec: Held<DeclaredProp>, config: Held<PropConfig>): unknown {
	return config?.[typedKeyOf(spec)];
}

export function withTyped(spec: Held<DeclaredProp>, config: Held<PropConfig>, held: unknown): PropConfig {
	return { ...config, [typedKeyOf(spec)]: held };
}

export function storedRows(stored: unknown): StoredRow[] {
	return toRows<unknown>(configRows(stored), "id");
}

export function hardcodeCollection({
	id,
	readValue,
	mutateValue,
	requested = [],
}: HardcodeOptions): CollectionGateway<unknown> {
	const rowsNow = (): StoredRow[] => storedRows(readValue());
	const write: RowsWrite = (step) => mutateValue((stored) => wrapRows(step(storedRows(stored))));
	return collectionGateway({
		id,
		requested: [...requested],
		settlesNow: true,
		handlers: { ...hardcodeReads(rowsNow), ...hardcodeWrites(write) },
	});
}

export function hardcodeValue({
	id,
	readValue,
	mutateValue,
	requested = [],
}: HardcodeOptions): ValueGateway<unknown, EveryValueVerb> {
	return valueGateway({
		id,
		requested: [...requested],
		settlesNow: true,
		handlers: {
			get: () => readValue() ?? null,
			update: (next: unknown) => {
				mutateValue(() => next);
				return next;
			},
		},
	});
}

export function bindingOf(spec: Held<DeclaredProp>, config: Held<PropConfig>): BoundProp {
	const declared = spec ?? {};
	return { kind: declared.kind === "value" ? "value" : "collection", binding: bindingNamed(declared, config ?? {}) };
}

export function allowedVerbs(spec: Held<DeclaredProp>, config: Held<PropConfig>, binding: unknown): VerbDecision[] {
	const uses = spec?.writes ?? [];
	const allowed = allowWritten(config, binding === "vault" ? VERBS_A_VAULT_BINDING_OFFERS_UNASKED : uses);
	return uses.map((verb) =>
		allowed.includes(verb)
			? { verb, can: true, reason: null }
			: { verb, can: false, reason: NOT_SWITCHED_ON.replace("{verb}", verb) },
	);
}

export function restrictToAllowed<Gateway extends object>(
	gateway: Held<Gateway>,
	decisions: readonly VerbDecision[],
): Held<Gateway> {
	const refused = decisions.filter((decision): decision is RefusedVerb => !decision.can);
	if (!gateway || refused.length === 0) return gateway;
	const refusals: Record<string, Action<never, unknown>> = Object.fromEntries(
		refused.map((decision) => [decision.verb, refuseVerb(Reflect.get(gateway, decision.verb), decision.reason)]),
	);
	return Object.assign({}, gateway, refusals);
}

export function requestedVerbs(spec: Held<DeclaredProp>): readonly string[] {
	return spec?.writes ?? [];
}

const mintRef = (): string => `r${Math.random().toString(36).slice(2, 10)}`;

const labelFromKey = (name: string): string => {
	const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

const isPlain = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const hasRef = (row: unknown): row is StoredRow =>
	typeof row === "object" && row !== null && "ref" in row && Boolean(row.ref);

function fieldTypeOf(type: unknown): FieldType {
	return FIELD_TYPES.find((known) => known === type) ?? "text";
}

function configRows(stored: unknown): readonly unknown[] {
	return Array.isArray(stored) ? stored : [];
}

// TRADE-OFF: an index ref becomes the stored id — minting one on a read is a write nobody asked for
function wrapRows(rows: readonly StoredRow[]): { id: string; value: unknown }[] {
	return rows.map((row) => ({ id: row.ref, value: valueIn(row) }));
}

function flattenProps(data: unknown): unknown {
	return isPlain(data) ? flattenPlain(data) : data;
}

function flattenPlain(data: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
	const { props, ...rest } = data;
	return isPlain(props) ? { ...rest, ...props } : rest;
}

function patchValue(value: unknown, data: unknown): unknown {
	if (!isPlain(value) || !isPlain(data)) return flattenProps(data);
	return { ...value, ...flattenPlain(data) };
}

function updateStoredRow(write: RowsWrite, { ref, data }: RowPatch): StoredRow | null {
	let next: StoredRow | null = null;
	write((rows) =>
		rows.map((row) => {
			if (row.ref !== ref) return row;
			const patched = rowOf<unknown>(patchValue(valueIn(row), data), ref);
			next = patched;
			return patched;
		}),
	);
	return next;
}

const withMintedRef = (row: unknown): StoredRow => (hasRef(row) ? row : rowOf<unknown>(row, mintRef()));

function hardcodeWrites(write: RowsWrite): {
	create: (draft: unknown) => StoredRow;
	update: (input: RowPatch) => StoredRow | null;
	remove: (ref: string) => void;
	replace: (rows: Held<readonly unknown[]>) => void;
} {
	return {
		create: (draft) => {
			const row = rowOf<unknown>(flattenProps(draft), mintRef());
			write((rows) => [...rows, row]);
			return row;
		},
		update: (input) => updateStoredRow(write, input),
		remove: (ref) => {
			write((rows) => rows.filter((row) => row.ref !== ref));
		},
		replace: (rows) => {
			write(() => (rows ?? []).map(withMintedRef));
		},
	};
}

function hardcodeReads(rowsNow: () => StoredRow[]): {
	list: (query: Query | void) => RowsResult<unknown>;
	get: (ref: string) => StoredRow | null;
} {
	return {
		list: (query) => applyQuery(rowsNow(), query),
		get: (ref) => rowsNow().find((row) => row.ref === ref) ?? null,
	};
}

function bindingNamed(declared: DeclaredProp, held: PropConfig): PropBinding {
	const matched = BINDING_BY_CONFIG_SHAPE.find(([, isMatch]) => isMatch(declared, held));
	if (matched) return matched[0];
	return declared.default?.value !== undefined || declared.default?.rows !== undefined ? "hardcode" : "vault";
}

function allowWritten(config: Held<PropConfig>, unasked: readonly string[]): readonly unknown[] {
	if (config?.allow === undefined) return unasked;
	if (Array.isArray(config.allow)) return config.allow;
	console.error(ALLOW_IS_NOT_A_LIST, config.allow);
	return unasked;
}

function createDeclaredGateway(key: string, spec: DeclaredProp, config: Held<PropConfig>): DeclaredGateway {
	if (spec.kind === "collection") {
		const rows = storedRows(config?.rows ?? spec.default?.rows);
		return arrayGateway(rows, {}, `slot:${key}?${stableKey(rows)}`);
	}
	const value = config?.value ?? spec.default?.value ?? null;
	return soloGateway<unknown>(value, {}, `slot:${key}?${stableKey(value)}`);
}
