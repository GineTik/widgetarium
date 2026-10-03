import { arrayGateway, refuseVerb, soloGateway } from "./create";
import type { Action, CollectionGateway, ValueGateway } from "./contract";
import { storedRows } from "./kept-in-tile";
import type { EveryValueVerb } from "./needs";
import type { FieldDescription } from "./manifest";
import type { DeclaredNeed } from "./resolve-needs";
import type { FieldType } from "./fields";
import { stableKey } from "./cache";
import { FIELD_TYPES } from "./fields";
import { STAT_ALGORITHMS } from "../engine/stat-fields";

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
	readonly implementation?: unknown;
	readonly fields?: unknown;
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

export type PropBinding = "stat" | "ref" | "box" | "hardcode" | "vault" | "memory" | "implementation";

export interface BoundProp {
	readonly kind: "value" | "collection";
	readonly binding: PropBinding;
}

export type VerbDecision =
	| { readonly verb: string; readonly can: true; readonly reason: null }
	| { readonly verb: string; readonly can: false; readonly reason: string };

export type DeclaredGateway = CollectionGateway<unknown> | ValueGateway<unknown, EveryValueVerb>;

type Held<T> = T | null | undefined;

type RefusedVerb = Extract<VerbDecision, { readonly can: false }>;

export const TYPED_VALUE = "@core/typed-value";

export const TYPED_ROWS = "@core/typed-rows";

export const SCREEN_STATE = "@core/screen-state";

export const SELECTED_ROW = "@core/selected-row";

const NOTE_IN_VAULT = "@obsidian/file";

const FOLDER_IN_VAULT = "@obsidian/folder";

const FROM_TILE_VALUE = "@core/from-tile-value";

const FROM_TILE_ROWS = "@core/from-tile-rows";

const FOLDER_STAT_PREFIX = "@stats/";

const BINDING_OF_IMPLEMENTATION: ReadonlyMap<string, PropBinding> = new Map<string, PropBinding>([
	[TYPED_VALUE, "hardcode"],
	[TYPED_ROWS, "hardcode"],
	[SCREEN_STATE, "memory"],
	[NOTE_IN_VAULT, "vault"],
	[FOLDER_IN_VAULT, "vault"],
	[FROM_TILE_VALUE, "ref"],
	[FROM_TILE_ROWS, "ref"],
]);

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
	return fieldsIn(config?.fields)[typedKeyOf(spec)];
}

export function withTyped(spec: Held<DeclaredProp>, config: Held<PropConfig>, held: unknown): PropConfig {
	return withFields(config, typedImplementationOf(spec), { [typedKeyOf(spec)]: held });
}

export function withFields(
	config: Held<PropConfig>,
	implementation: string,
	patch: Readonly<Record<string, unknown>>,
): PropConfig {
	return { ...allowOf(config), implementation, fields: withFieldsPatched(config, patch).fields };
}

export function withFieldsPatched(config: Held<PropConfig>, patch: Readonly<Record<string, unknown>>): PropConfig {
	return { ...config, fields: { ...fieldsIn(config?.fields), ...patch } };
}

export function fieldsIn(held: unknown): Readonly<Record<string, unknown>> {
	return isPlain(held) ? held : {};
}

export function implementationOf(spec: Held<DeclaredProp>, config: Held<PropConfig>): string {
	return typeof config?.implementation === "string" ? config.implementation : declaredImplementationOf(spec);
}

export function vaultImplementationOf(spec: Held<DeclaredProp>): string {
	return spec?.kind === "value" ? NOTE_IN_VAULT : FOLDER_IN_VAULT;
}

export function fromTileImplementationOf(spec: Held<DeclaredProp>): string {
	return spec?.kind === "value" ? FROM_TILE_VALUE : FROM_TILE_ROWS;
}

export function isVaultImplementation(id: unknown): boolean {
	return id === NOTE_IN_VAULT || id === FOLDER_IN_VAULT;
}

export function isFolderStatImplementation(id: unknown): boolean {
	if (typeof id !== "string" || !id.startsWith(FOLDER_STAT_PREFIX)) return false;
	return STAT_ALGORITHMS.some((algorithm) => id === `${FOLDER_STAT_PREFIX}${algorithm}`);
}

export function bindingOf(spec: Held<DeclaredProp>, config: Held<PropConfig>): BoundProp {
	return { kind: spec?.kind === "value" ? "value" : "collection", binding: bindingNamed(spec, config) };
}

export function allowedVerbs(spec: Held<DeclaredProp>, config: Held<PropConfig>): VerbDecision[] {
	const uses = requestedVerbs(spec);
	const unasked = isVaultImplementation(implementationOf(spec, config)) ? VERBS_A_VAULT_BINDING_OFFERS_UNASKED : uses;
	const allowed = allowWritten(config, unasked);
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

const labelFromKey = (name: string): string => {
	const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

const isPlain = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function fieldTypeOf(type: unknown): FieldType {
	return FIELD_TYPES.find((known) => known === type) ?? "text";
}

function bindingNamed(spec: Held<DeclaredProp>, config: Held<PropConfig>): PropBinding {
	if (typeof config?.implementation !== "string" && sourceImplementationOf(spec)) return "box";
	const implementation = implementationOf(spec, config);
	if (isFolderStatImplementation(implementation)) return "stat";
	return BINDING_OF_IMPLEMENTATION.get(implementation) ?? "implementation";
}

function declaredImplementationOf(spec: Held<DeclaredProp>): string {
	const source = sourceImplementationOf(spec);
	if (source) return source;
	if (spec?.default?.from === "memory") return SCREEN_STATE;
	return declaredOf(spec) === undefined ? vaultImplementationOf(spec) : typedImplementationOf(spec);
}

function sourceImplementationOf(spec: Held<DeclaredProp>): string | null {
	const source = spec?.source;
	if (!isPlain(source)) return null;
	return typeof source["implementation"] === "string" ? source["implementation"] : null;
}

function allowOf(config: Held<PropConfig>): Pick<PropConfig, "allow"> {
	return config?.allow === undefined ? {} : { allow: config.allow };
}

function allowWritten(config: Held<PropConfig>, unasked: readonly string[]): readonly unknown[] {
	if (config?.allow === undefined) return unasked;
	if (Array.isArray(config.allow)) return config.allow;
	console.error(ALLOW_IS_NOT_A_LIST, config.allow);
	return unasked;
}

function createDeclaredGateway(key: string, spec: DeclaredProp, config: Held<PropConfig>): DeclaredGateway {
	if (spec.kind === "collection") {
		const rows = storedRows(typedIn(spec, config) ?? spec.default?.rows);
		return arrayGateway(rows, {}, `slot:${key}?${stableKey(rows)}`);
	}
	const value = typedIn(spec, config) ?? spec.default?.value ?? null;
	return soloGateway<unknown>(value, {}, `slot:${key}?${stableKey(value)}`);
}

function typedImplementationOf(spec: Held<DeclaredProp>): string {
	return spec?.kind === "collection" ? TYPED_ROWS : TYPED_VALUE;
}
