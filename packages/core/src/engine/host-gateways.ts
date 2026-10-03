import { z } from "zod";
import { propConfig } from "../model.js";
import type { TileProp } from "../model.js";
import { stableKey } from "../gateway/cache.js";
import { gatewayOverImplementation } from "../gateway/adapted.js";
import { inResourceOrder } from "../gateway/implementation-metadata.js";
import type { GatewayMetadata } from "../gateway/implementation-metadata.js";
import { parseReadsBy } from "../gateway/parsed.js";
import { ICrudGateway } from "../gateway/declared.js";
import { problemsOf } from "../gateway/problems.js";
import {
	TYPED_ROWS,
	TYPED_VALUE,
	allowedVerbs,
	fieldsIn,
	implementationOf,
	isFolderStatImplementation,
	isVaultImplementation,
	restrictToAllowed,
} from "../gateway/props.js";
import { refOf } from "../gateway/refs.js";
import type { HostFields, HostGateway, HostGatewayContext, HostSpec } from "./host-context.js";
import { registeredQueries } from "./packs.js";
import type { QueryPorts } from "./packs.js";
import { queryPortsOf } from "./query-ports.js";
import { isFitFor } from "./source-fit.js";

const SIBLING_FIELDS = ["rows", "picked", "fieldFrom"] as const;

const SOURCE_IMPLEMENTATIONS: readonly unknown[] = ["@core/selection", "@core/selected-row"];

const WRITING: readonly string[] = ["create", "update", "remove"];

const ROW_UPKEEP_VERBS: readonly string[] = ["replace", "repairIds"];

// TODO: offer @core/selection in the source list once its fields have an editor
const NOT_OFFERED_YET = ["@core/selection"];

const NO_SUCH_GATEWAY = 'prop "{name}" names the gateway "{id}", which this host does not offer';

const RESTRICTED_BY_ALLOW: readonly string[] = [TYPED_VALUE, TYPED_ROWS];

export function hostGatewayFor(
	spec: HostSpec | null | undefined,
	config: TileProp | null | undefined,
): GatewayMetadata | null {
	return entryOf(implementationOf(spec, config));
}

export function bindFields(
	spec: HostSpec | null | undefined,
	config: TileProp | null | undefined,
	tileId: string,
): HostFields {
	if (!sourceOf(spec, config)) return fieldsIn(config?.fields);
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
	const fitting = registeredQueries().filter((entry) => {
		if (entry.kind !== kind || NOT_OFFERED_YET.includes(entry.id) || !isFitFor(entry, spec)) return false;
		if (isFolderStatImplementation(entry.id)) return spec?.type === "number";
		if (kind === "collection" && writes.length > 0) return entry.implementation.prototype instanceof ICrudGateway;
		return true;
	});
	return inResourceOrder(fitting);
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
	const parsed = parsedGatewayOf(context, chosen, config);
	if (!RESTRICTED_BY_ALLOW.includes(chosen.id) && !isVaultImplementation(chosen.id)) return parsed;
	return restrictToAllowed(parsed, allowedVerbs(spec, config)) ?? parsed;
}

function sourceOf(spec: HostSpec | null | undefined, config: TileProp | null | undefined): string | null {
	const implementation = spec?.source?.implementation;
	if (!SOURCE_IMPLEMENTATIONS.includes(implementation) || typeof implementation !== "string") return null;
	if (typeof config?.implementation === "string") return null;
	return implementation;
}

function entryOf(id: string): GatewayMetadata | null {
	return registeredQueries().find((entry) => entry.id === id) ?? null;
}

function parsedGatewayOf(context: HostGatewayContext, chosen: GatewayMetadata, config: TileProp): HostGateway {
	const { name, spec, tile } = context;
	const fields = bindFields(spec, config, tile.id);
	const problems = problemsOf(context.refs).contextFor(
		refOf(tile.id, name),
		context.schema ?? z.unknown(),
		`${chosen.id}?${stableKey(fields)}`,
	);
	const ports = queryPortsOf(context, sourceOf(spec, config) !== null);
	return parseReadsBy(gatewayOfImplementation(chosen, fields, ports), { ...context, ...problems }, kindOf(chosen));
}

function gatewayOfImplementation(chosen: GatewayMetadata, fields: HostFields, ports: QueryPorts): HostGateway {
	const instance: object = Reflect.construct(chosen.implementation, [fields, ports]);
	const id = `${ports.self}?${chosen.id}&${stableKey(fields)}${keptKeyOf(ports.kept.read())}`;
	return gatewayOverImplementation(ports.self, { kind: kindOf(chosen), writes: ROW_UPKEEP_VERBS }, instance, id);
}

function keptKeyOf(kept: unknown): string {
	return kept === undefined ? "" : `&kept=${stableKey(kept)}`;
}

function kindOf(chosen: GatewayMetadata): "value" | "collection" {
	return chosen.kind === "value" ? "value" : "collection";
}
