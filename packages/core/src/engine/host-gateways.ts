import { z } from "zod";
import { propConfig } from "../model.js";
import type { TileProp } from "../model.js";
import { stableKey } from "../gateway/cache.js";
import { ENGINE_GATEWAY } from "../gateway/adapted.js";
import { ICrudGateway } from "../gateway/declared.js";
import { problemsOf } from "../gateway/problems.js";
import { allowedVerbs, bindingOf, restrictToAllowed } from "../gateway/props.js";
import { refOf } from "../gateway/refs.js";
import { isObject } from "./is-object.js";
import type { HostFields, HostGateway, HostGatewayContext, HostSpec } from "./engine-backed.js";
import { fieldsOf } from "./host-gateway-classes.js";
import { HOST_GATEWAYS } from "./host-gateway-list.js";
import type { HostGatewayEntry } from "./host-gateway-list.js";

export { HOST_GATEWAYS } from "./host-gateway-list.js";
export type { HostGatewayEntry } from "./host-gateway-list.js";
export {
	FileGateway,
	FolderGateway,
	FromTileRowsGateway,
	FromTileValueGateway,
	STAT_TITLES,
	ScreenStateGateway,
	SelectedRowGateway,
	SelectionGateway,
	StatisticsGateway,
	TypedRowsGateway,
	TypedValueGateway,
	createTypedGateway,
	fieldsOf,
	whereOf,
	filterRowsIn,
	sortRowsIn,
} from "./host-gateway-classes.js";
export type { TypedGatewayAsk } from "./host-gateway-classes.js";
export type {
	HostFields,
	HostGateway,
	HostGatewayContext,
	HostGatewayHost,
	HostSource,
	HostSpec,
	HostTile,
	ImplementationContext,
	PatchStep,
	ShapeReader,
} from "./engine-backed.js";

type AllowedBy = "declared" | "vault";

type BoundKind = "value" | "collection";

const SIBLING_FIELDS = ["rows", "picked", "fieldFrom"] as const;

const SOURCE_IMPLEMENTATIONS: readonly unknown[] = ["@core/selection", "@core/selected-row"];

const WRITING: readonly string[] = ["create", "update", "remove"];

// TODO: offer @core/selection in the source list once its fields have an editor
const NOT_OFFERED_YET = ["@core/selection"];

const NO_SUCH_GATEWAY = 'prop "{name}" names the gateway "{id}", which this host does not offer';

const BY_ID = new Map(HOST_GATEWAYS.map((entry) => [entry.id, entry] as const));

const FROM_OLD_BINDING: Readonly<Record<BoundKind, Readonly<Partial<Record<string, string>>>>> = {
	value: {
		hardcode: "@core/typed-value",
		memory: "@core/screen-state",
		vault: "@core/file",
		ref: "@core/from-tile-value",
	},
	collection: {
		hardcode: "@core/typed-rows",
		vault: "@core/folder",
		ref: "@core/from-tile-rows",
	},
};

const ALLOW_OF: ReadonlyMap<string, AllowedBy> = new Map<string, AllowedBy>([
	["@core/typed-value", "declared"],
	["@core/typed-rows", "declared"],
	["@core/file", "vault"],
	["@core/folder", "vault"],
]);

export function hostGatewayFor(
	spec: HostSpec | null | undefined,
	config: TileProp | null | undefined,
): HostGatewayEntry | null {
	if (typeof config?.implementation === "string") return BY_ID.get(config.implementation) ?? null;
	const sourced = sourceOf(spec, config);
	if (sourced) return BY_ID.get(sourced) ?? null;
	const { kind, binding } = bindingOf(spec, config);
	if (binding === "stat") return BY_ID.get(`@core/stat-${config?.algorithm ?? "count"}`) ?? null;
	return BY_ID.get(FROM_OLD_BINDING[kind][binding] ?? "") ?? null;
}

export function bindFields(
	spec: HostSpec | null | undefined,
	config: TileProp | null | undefined,
	tileId: string,
): HostFields {
	if (!sourceOf(spec, config)) return fieldsOf(config);
	const fields = fieldsIn(spec?.source?.fields);
	const named = SIBLING_FIELDS.flatMap((key) => {
		const sibling = fields[key];
		return typeof sibling === "string" && !sibling.includes("/") ? [[key, refOf(tileId, sibling)] as const] : [];
	});
	return { ...fields, ...Object.fromEntries(named) };
}

export function sourcesFor(spec: HostSpec | null | undefined): HostGatewayEntry[] {
	const kind = spec?.kind === "value" ? "value" : "collection";
	const writes = (spec?.writes ?? []).filter((verb) => WRITING.includes(verb));
	return HOST_GATEWAYS.filter((entry) => {
		if (entry.kind !== kind || NOT_OFFERED_YET.includes(entry.id)) return false;
		if (entry.id.startsWith("@core/stat-")) return spec?.type === "number";
		if (kind === "collection" && writes.length > 0) return entry.implementation.prototype instanceof ICrudGateway;
		return true;
	});
}

export function refsOfFields(
	spec: HostSpec | null | undefined,
	config: TileProp | null | undefined,
	tileId: string,
): string[] {
	const fields = bindFields(spec, config, tileId);
	return [fields.ref, fields.rows, fields.picked, fields.fieldFrom].filter(
		(held): held is string => typeof held === "string",
	);
}

export function resolveHostGateway(context: HostGatewayContext): HostGateway {
	const { name, spec, tile } = context;
	const config = propConfig(tile, name, spec);
	const chosen = hostGatewayFor(spec, config);
	if (!chosen) throw new Error(NO_SUCH_GATEWAY.replace("{name}", name).replace("{id}", String(config.implementation)));
	const fields = bindFields(spec, config, tile.id);
	const problems = problemsOf(context.refs).contextFor(
		refOf(tile.id, name),
		context.schema ?? z.unknown(),
		`${chosen.id}?${stableKey(fields)}`,
	);
	const tileConfig = sourceOf(spec, config) ? { tileConfig: config } : {};
	const engine = new chosen.implementation(fields, { ...context, ...tileConfig, ...problems })[ENGINE_GATEWAY];
	const allow = ALLOW_OF.get(chosen.id);
	if (!allow) return engine;
	return restrictToAllowed(engine, allowedVerbs(spec, config, allow === "vault" ? "vault" : "hardcode")) ?? engine;
}

export function fieldsIn(held: unknown): HostFields {
	return isObject(held) ? held : {};
}

function sourceOf(spec: HostSpec | null | undefined, config: TileProp | null | undefined): string | null {
	const implementation = spec?.source?.implementation;
	if (!SOURCE_IMPLEMENTATIONS.includes(implementation) || typeof implementation !== "string") return null;
	if (typeof config?.implementation === "string" || config?.ref) return null;
	return implementation;
}
