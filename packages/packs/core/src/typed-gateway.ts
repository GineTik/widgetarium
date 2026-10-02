import { propConfig } from "@widgetarium/core/model.js";
import { stableKey } from "@widgetarium/core/gateway/cache.js";
import type { AdaptedGateway } from "@widgetarium/core/gateway/adapted.js";
import {
	declaredOf,
	hardcodeCollection,
	hardcodeValue,
	requestedVerbs,
	typedIn,
	typedKeyOf,
} from "@widgetarium/core/gateway/props.js";
import { narrowByRefs } from "@widgetarium/core/gateway/refs.js";
import { fieldsOf, whereOf } from "@widgetarium/core/engine/host-gateways.js";
import type { HostFields, HostGatewayContext } from "@widgetarium/core/engine/engine-backed.js";

export interface TypedGatewayAsk extends HostGatewayContext {
	readonly config: HostFields | null | undefined;
}

export function createTypedGateway({
	name,
	spec,
	tile,
	config,
	refs,
	propsRef,
	patchProp,
}: TypedGatewayAsk): AdaptedGateway {
	const declared = declaredOf(spec);
	const asRendered = typedIn(spec, config) ?? declared;
	const held = {
		id: `${tile.id}/${name}?${stableKey(asRendered)}`,
		readValue: () => typedIn(spec, fieldsOf(propConfig({ ...tile, props: propsRef.current }, name, spec))) ?? declared,
		mutateValue: (step: (stored: unknown) => unknown) =>
			patchProp(name, (inFlight) => {
				const fields = fieldsOf(inFlight);
				const next = { [typedKeyOf(spec)]: step(typedIn(spec, fields) ?? asRendered) };
				return typeof inFlight?.implementation === "string" ? { fields: { ...fields, ...next } } : next;
			}),
		requested: requestedVerbs(spec),
	};
	if (spec.kind === "value") return hardcodeValue(held);
	return narrowByRefs(hardcodeCollection(held), whereOf(spec, config), refs);
}
