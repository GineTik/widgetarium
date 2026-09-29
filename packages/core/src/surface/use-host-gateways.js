import { useRef } from "react";
import { refsOfFields, whereOf } from "../engine/host-gateways.js";
import { refOf, refsWithin } from "../gateway/refs.js";
import { mountsCollection } from "./mounts.js";
import { propSchemaOf, resolveGateway } from "./prop-gateway.js";
import { useDroppedOnUnmount } from "./use-dropped-on-unmount.js";
import { RESERVED_PROPS } from "./widget-host.js";

export function useHostGateways({ definition, tile, host, refs, cellFor, patchProp }, mounts) {
	const propsRef = useRef(tile.props);
	propsRef.current = tile.props ?? {};
	const gateways = gatewaysOf({ definition, tile, host, refs, cellFor, patchProp, propsRef }, mounts);
	publishGateways(gateways, definition.manifest, tile, refs);
	useDroppedOnUnmount(
		refs,
		Object.entries(gateways).map(([name, gateway]) => [refOf(tile.id, name), gateway]),
	);
	return gateways;
}

function gatewaysOf({ definition, tile, host, refs, cellFor, patchProp, propsRef }, mounts) {
	const gateways = {};
	const declaredProps = unreservedProps(definition.manifest);
	for (const [name, entries] of Object.entries(mounts)) gateways[name] = mountsCollection(tile, name, entries);
	for (const [name, spec] of declaredProps)
		gateways[name] = resolveGateway({
			name,
			spec,
			schema: propSchemaOf(definition, name),
			tile,
			host,
			refs,
			cellFor,
			propsRef,
			patchProp,
		});
	return gateways;
}

function unreservedProps(manifest) {
	return Object.entries(manifest.props ?? {}).filter(([name]) => {
		if (!RESERVED_PROPS.has(name)) return true;
		console.warn(`Widgetarium: ${manifest.id} declares a prop named "${name}", which the host owns — skipped`);
		return false;
	});
}

function publishGateways(gateways, manifest, tile, refs) {
	for (const [name, gateway] of Object.entries(gateways)) {
		const spec = manifest.props?.[name] ?? manifest.mounts?.[name] ?? {};
		const config = tile.props?.[name] ?? {};
		const leansOn = [...refsOfFields(spec, config, tile.id), ...refsWithin(whereOf(spec, config))];
		refs.put(refOf(tile.id, name), gateway, {
			describes: {
				tile: tile.id,
				prop: name,
				label: spec.label ?? name,
				title: manifest.title ?? manifest.id,
				kind: gateway?.kind ?? "collection",
				shape: spec.shape ?? "value",
			},
			dependsOn: leansOn,
		});
	}
}
