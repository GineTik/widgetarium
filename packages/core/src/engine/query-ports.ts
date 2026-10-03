import { propConfig } from "../model.js";
import { declaredOf, needsOf, requestedVerbs, typedIn, typedKeyOf, withFieldsPatched } from "../gateway/props.js";
import { refOf } from "../gateway/refs.js";
import type { HostGatewayContext, HostSpec } from "./host-context.js";
import { portsOf } from "./packs.js";
import type { KeptPort, PropPort, QueryPorts } from "./packs.js";

export function queryPortsOf(context: HostGatewayContext, isDeclaredSource: boolean): QueryPorts {
	const { host, refs, tile, name, spec, cellFor } = context;
	return {
		...portsOf(host, refs, refOf(tile.id, name)),
		prop: propPortOf(spec, isDeclaredSource),
		kept: keptPortOf(context),
		screen: { cell: cellFor },
		notes: host,
	};
}

function propPortOf(spec: HostSpec, isDeclaredSource: boolean): PropPort {
	return {
		kind: spec.kind === "value" || spec.kind === "collection" ? spec.kind : null,
		type: spec.type,
		writes: requestedVerbs(spec),
		declared: declaredOf(spec),
		where: spec.where ?? [],
		sort: spec.sort ?? [],
		needs: needsOf(spec),
		isDeclaredSource,
	};
}

function keptPortOf({ name, spec, tile, propsRef, patchProp }: HostGatewayContext): KeptPort {
	return {
		read: () => typedIn(spec, propConfig({ ...tile, props: propsRef.current }, name, spec)),
		update: (step) =>
			patchProp(name, (inFlight) => withFieldsPatched(inFlight, { [typedKeyOf(spec)]: step(typedIn(spec, inFlight)) })),
	};
}
