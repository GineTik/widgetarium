import { z } from "zod";
import { propConfig } from "../model.js";
import type { TileProp } from "../model.js";
import { stableKey } from "../gateway/cache.js";
import { ENGINE_GATEWAY, gatewayOverImplementation } from "../gateway/adapted.js";
import type { GatewayMetadata } from "../gateway/implementation-metadata.js";
import { parseReadsBy } from "../gateway/parsed.js";
import { ICrudGateway } from "../gateway/declared.js";
import { problemsOf } from "../gateway/problems.js";
import type { GatewayContext } from "../gateway/problems.js";
import { allowedVerbs, bindingOf, restrictToAllowed } from "../gateway/props.js";
import { refOf } from "../gateway/refs.js";
import { isObject } from "./is-object.js";
import type { HostFields, HostGateway, HostGatewayContext, HostSpec } from "./engine-backed.js";
import { EngineBackedRows, EngineBackedValue } from "./engine-backed.js";
import { portsOf, registeredQueries } from "./packs.js";
import { isFitFor } from "./source-fit.js";

export { filterRowsIn, sortRowsIn, whereOf } from "./folder-rows.js";
export { STAT_TITLES } from "../gateway/stats.js";
import { STAT_ALGORITHMS } from "../gateway/stats.js";
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

const STAT_PREFIX = "@stats/";

const FORMER_IDS: Readonly<Record<string, string>> = {
	"@core/file": "@obsidian/file",
	"@core/folder": "@obsidian/folder",
};

const VAULT_IMPLEMENTATIONS: readonly string[] = ["@obsidian/file", "@obsidian/folder"];

const FROM_OLD_BINDING: Readonly<Record<BoundKind, Readonly<Partial<Record<string, string>>>>> = {
	value: {
		hardcode: "@core/typed-value",
		memory: "@core/screen-state",
		vault: "@obsidian/file",
		ref: "@core/from-tile-value",
	},
	collection: {
		hardcode: "@core/typed-rows",
		vault: "@obsidian/folder",
		ref: "@core/from-tile-rows",
	},
};

const ALLOW_OF: ReadonlyMap<string, AllowedBy> = new Map<string, AllowedBy>([
	["@core/typed-value", "declared"],
	["@core/typed-rows", "declared"],
	["@obsidian/file", "vault"],
	["@obsidian/folder", "vault"],
]);

export function hostGatewayFor(
	spec: HostSpec | null | undefined,
	config: TileProp | null | undefined,
): GatewayMetadata | null {
	if (typeof config?.implementation === "string") return entryOf(config.implementation);
	const sourced = sourceOf(spec, config);
	if (sourced) return entryOf(sourced);
	const { kind, binding } = bindingOf(spec, config);
	if (binding === "stat") return entryOf(`${STAT_PREFIX}${config?.algorithm ?? "count"}`);
	return entryOf(FROM_OLD_BINDING[kind][binding] ?? "");
}

export function isPackImplementation(id: string | undefined): boolean {
	const entry = id ? entryOf(id) : null;
	return entry !== null && !isEngineBacked(entry);
}

export function isFolderStat(id: string): boolean {
	return id.startsWith(STAT_PREFIX) && STAT_ALGORITHMS.some((algorithm) => id === `${STAT_PREFIX}${algorithm}`);
}

export function isVaultImplementation(id: string | undefined): boolean {
	return VAULT_IMPLEMENTATIONS.includes(id ?? "");
}

export function fieldsOf(config: HostFields | null | undefined): HostFields {
	if (isObject(config?.fields)) return config.fields;
	return config ?? {};
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

export function sourcesFor(spec: HostSpec | null | undefined): GatewayMetadata[] {
	const kind = spec?.kind === "value" ? "value" : "collection";
	const writes = (spec?.writes ?? []).filter((verb) => WRITING.includes(verb));
	return registeredQueries().filter((entry) => {
		if (entry.kind !== kind || NOT_OFFERED_YET.includes(entry.id) || !isFitFor(entry, spec)) return false;
		if (isFolderStat(entry.id)) return spec?.type === "number";
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
	if (!isEngineBacked(chosen)) return packGatewayOf(chosen, fields, { ...context, ...problems });
	const tileConfig = sourceOf(spec, config) ? { tileConfig: config } : {};
	const engine = Reflect.get(
		Reflect.construct(chosen.implementation, [fields, { ...context, ...tileConfig, ...problems }]),
		ENGINE_GATEWAY,
	);
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

function entryOf(id: string): GatewayMetadata | null {
	const current =
		FORMER_IDS[id] ?? (id.startsWith("@core/stat-") ? `${STAT_PREFIX}${id.slice("@core/stat-".length)}` : id);
	return registeredQueries().find((entry) => entry.id === current) ?? null;
}

function isEngineBacked(entry: GatewayMetadata): boolean {
	const prototype: unknown = entry.implementation.prototype;
	return prototype instanceof EngineBackedValue || prototype instanceof EngineBackedRows;
}

function packGatewayOf(
	chosen: GatewayMetadata,
	fields: HostFields,
	context: HostGatewayContext & GatewayContext,
): HostGateway {
	const ports = portsOf(context.host, context.refs, refOf(context.tile.id, context.name));
	const instance: object = Reflect.construct(chosen.implementation, [fields, ports]);
	const kind = chosen.kind === "value" ? "value" : "collection";
	const id = `${refOf(context.tile.id, context.name)}?${chosen.id}&${stableKey(fields)}`;
	return parseReadsBy(gatewayOverImplementation(context.name, { kind, writes: [] }, instance, id), context, kind);
}
