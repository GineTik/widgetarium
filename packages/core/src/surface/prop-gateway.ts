import type { z } from "zod";
import { declarationIn } from "../gateway/declaration.js";
import { collectionGateway, valueGateway } from "../gateway/create.js";
import { resolveHostGateway } from "../engine/host-gateways.js";
import type { HostGateway, HostGatewayContext, HostSpec, HostTile } from "../engine/host-context.js";
import { failureMessage } from "../engine/failure-message.js";
import { isObject } from "../engine/is-object.js";
import { refOf } from "../gateway/refs.js";
import type { AnyGateway } from "../gateway/refs.js";

interface DeclaringDefinition {
	readonly component?: { readonly declared?: unknown } | null | undefined;
}

type DeclaredGatewayAsk = Omit<HostGatewayContext, "spec"> & { readonly spec: unknown };

const MALFORMED_PROP = "the widget declares this prop in a shape the engine cannot read";

interface UnboundAsk {
	readonly tile: HostTile;
	readonly name: string;
	readonly spec: HostSpec | null | undefined;
}

export function resolveDeclaredGateway(context: DeclaredGatewayAsk): HostGateway | AnyGateway {
	const { spec } = context;
	if (!isHostSpec(spec)) return createUnboundGateway({ ...context, spec: null }, MALFORMED_PROP);
	return resolveGateway({ ...context, spec });
}

export function propSchemaOf(definition: DeclaringDefinition | null | undefined, name: string): z.ZodType | undefined {
	const declared = definition?.component?.declared;
	return declarationIn(isObject(declared) ? declared[name] : undefined)?.schema;
}

export function isHostSpec(held: unknown): held is HostSpec {
	if (!isObject(held)) return false;
	const { type, where, sort, writes, describes, source } = held;
	return (
		(type === undefined || typeof type === "string") &&
		[where, sort].every((list) => list === undefined || Array.isArray(list)) &&
		(writes === undefined || writes === null || Array.isArray(writes)) &&
		(source === undefined || isObject(source)) &&
		[describes, held["default"]].every((said) => said === undefined || said === null || isObject(said))
	);
}

function createUnboundGateway({ tile, name, spec }: UnboundAsk, reason: string): AnyGateway {
	const refuse = (): never => {
		throw new Error(reason);
	};
	const made = spec?.kind === "value" ? valueGateway : collectionGateway;
	return made<unknown>({ id: `${refOf(tile.id, name)}?unbound`, handlers: { get: refuse, list: refuse } });
}

function resolveGateway(context: HostGatewayContext): HostGateway | AnyGateway {
	try {
		return resolveHostGateway(context);
	} catch (failure) {
		console.error(`[widgetarium] prop "${context.name}" could not be bound`, failure);
		return createUnboundGateway(context, failureMessage(failure));
	}
}
