import { useRef } from "react";
import { refsOfFields, whereOf } from "../engine/host-gateways.js";
import type { EngineManifest } from "../engine/catalogue-index.js";
import { isObject } from "../engine/is-object.js";
import { refOf, refsWithin } from "../gateway/refs.js";
import type { AnyGateway, GatewayRefs } from "../gateway/refs.js";
import type { Tile } from "../model.js";
import { mountsCollection } from "./mounts.js";
import type { ResolvedMounts } from "./mounts.js";
import { isHostSpec, propSchemaOf, resolveDeclaredGateway } from "./prop-gateway.js";
import type { PropGateways } from "./slots.js";
import { useDropsOnUnmount } from "./use-drops-on-unmount.js";
import { RESERVED_PROPS } from "./widget-host.js";
import type { WidgetHostProps } from "./widget-host.js";

type GatewayAsk = Pick<WidgetHostProps, "definition" | "tile" | "host" | "refs" | "cellFor" | "patchProp">;

interface HeldProps extends GatewayAsk {
	readonly propsRef: { readonly current: Tile["props"] };
}

export function useHostGateways(ask: GatewayAsk, mounts: ResolvedMounts): PropGateways {
	const { definition, tile, refs } = ask;
	const propsRef = useRef(tile.props);
	propsRef.current = tile.props ?? {};
	const gateways = gatewaysOf({ ...ask, propsRef }, mounts);
	publishGateways(gateways, definition.manifest, tile, refs);
	useDropsOnUnmount(
		refs,
		Object.entries(gateways).map(([name, gateway]) => [refOf(tile.id, name), gateway] as const),
	);
	return gateways;
}

function gatewaysOf(
	{ definition, tile, host, refs, cellFor, patchProp, propsRef }: HeldProps,
	mounts: ResolvedMounts,
): PropGateways {
	const gateways: Record<string, AnyGateway> = {};
	for (const [name, entries] of Object.entries(mounts)) gateways[name] = mountsCollection(tile, name, entries);
	for (const [name, spec] of unreservedProps(definition.manifest))
		gateways[name] = resolveDeclaredGateway({
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

function unreservedProps(manifest: EngineManifest): [string, unknown][] {
	return Object.entries(manifest.props ?? {}).filter(([name]) => {
		if (!RESERVED_PROPS.has(name)) return true;
		console.warn(`Widgetarium: ${manifest.id} declares a prop named "${name}", which the host owns — skipped`);
		return false;
	});
}

function publishGateways(gateways: PropGateways, manifest: EngineManifest, tile: Tile, refs: GatewayRefs): void {
	for (const [name, gateway] of Object.entries(gateways)) {
		const spec = manifest.props?.[name] ?? mountDeclaredIn(manifest, name) ?? {};
		const hostSpec = isHostSpec(spec) ? spec : null;
		const config = tile.props?.[name] ?? {};
		const leansOn = [...refsOfFields(hostSpec, config, tile.id), ...refsWithin(whereOf(hostSpec, config))];
		refs.put(refOf(tile.id, name), gateway, {
			describes: {
				tile: tile.id,
				prop: name,
				label: textOr(spec, "label", name),
				title: textOr(manifest, "title", manifest.id),
				kind: textOr(gateway, "kind", "collection"),
				shape: textOr(spec, "shape", "value"),
			},
			dependsOn: leansOn,
		});
	}
}

function mountDeclaredIn(manifest: EngineManifest, name: string): unknown {
	const mounts = manifest["mounts"];
	return isObject(mounts) ? mounts[name] : undefined;
}

function textOr(held: unknown, key: string, fallback: string): string {
	const said = isObject(held) ? held[key] : undefined;
	return typeof said === "string" ? said : fallback;
}
