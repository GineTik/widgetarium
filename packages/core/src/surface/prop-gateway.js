import { declarationIn } from "../gateway/declaration.js";
import { collectionGateway, valueGateway } from "../gateway/create.js";
import { resolveHostGateway } from "../engine/host-gateways.js";
import { refOf } from "../gateway/refs.js";

export function resolveGateway(context) {
	try {
		return resolveHostGateway(context);
	} catch (failure) {
		console.error(`[widgetarium] prop "${context.name}" could not be bound`, failure);
		return unboundGateway(context, String(failure?.message ?? failure));
	}
}

export function propSchemaOf(definition, name) {
	return declarationIn(definition?.component?.declared?.[name])?.schema;
}

function unboundGateway({ tile, name, spec }, reason) {
	const refuse = () => {
		throw new Error(reason);
	};
	const made = spec?.kind === "value" ? valueGateway : collectionGateway;
	return made({ id: `${refOf(tile.id, name)}?unbound`, handlers: { get: refuse, list: refuse } });
}
