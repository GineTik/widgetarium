import { createElement as h } from "react";
import { heldTile, rekeyed } from "../model.js";
import { reactClash } from "../fit.js";
import { viewHost } from "../engine/view-host.js";
import { NOWHERE } from "../engine/navigator-none.js";
import { slotSurfaceOf } from "../surface-roles.js";
import { surfacedSlot } from "../widget-root.js";
import { isPainted } from "../tree.js";
import { isDrawable } from "./is-drawable.js";
import { refuseFold } from "./refuse-fold.js";
import { resolvePatch } from "./resolve-patch.js";
import { propSchemaOf, resolveGateway } from "./prop-gateway.js";

export function resolveSlots({ manifest, tile, registry, host, foldIntoGroup, gatewaysOf }) {
	const slots = {};
	const parentReact = registry.get(manifest.id)?.react;
	for (const [name, spec] of Object.entries(manifest.slots ?? {})) {
		const widget = tile.slots?.[name]?.widget ?? spec.default;
		const child = registry.get(widget);
		if (!isDrawable(child)) {
			slots[name] = null;
			continue;
		}
		const clash = reactClash(parentReact, child.react);
		if (clash) {
			console.error(`Widgetarium: ${clash}`);
			slots[name] = () => refusedSlot(clash);
			continue;
		}
		const unfed = gatewaysOf(child, name, widget);
		const draw = (given) =>
			h(child.component, {
				...unfed,
				...given,
				size: given?.size ?? { w: 1, h: 1, scale: 1 },
				host: viewHost(host),
				here: host.here ?? null,
				navigator: host.navigator ?? NOWHERE,
				foldIntoGroup: foldIntoGroup ?? refuseFold,
			});
		const surface = slotSurfaceOf(spec, tile.slots?.[name]);
		slots[name] = surfacedSlot(draw, { surface, isCard: isPainted({ surface }) });
	}
	return slots;
}

export function slotGateways({ childDefinition, tile, name, widget, host, refs, cellFor, onPatch }) {
	const childManifest = childDefinition?.manifest;
	const held = heldTile(tile, "slots", name, widget);
	const propsRef = { current: held.props };
	const patchProp = (prop, patch) =>
		onPatch({
			slots: rekeyed(tile.slots, name, undefined, {
				props: { ...held.props, [prop]: resolvePatch(held.props?.[prop] ?? {}, patch) },
			}),
		});
	const plain = Object.entries(childManifest?.props ?? {}).filter(([, spec]) => !spec.source);
	return Object.fromEntries(
		plain.map(([prop, spec]) => [
			prop,
			resolveGateway({
				name: prop,
				spec,
				schema: propSchemaOf(childDefinition, prop),
				tile: held,
				host,
				refs,
				cellFor,
				propsRef,
				patchProp,
			}),
		]),
	);
}

function refusedSlot(said) {
	return h("div", { className: "wg-missing" }, [
		h("b", { key: "what" }, "This slot cannot be filled by that widget"),
		h("span", { key: "why" }, said),
	]);
}
