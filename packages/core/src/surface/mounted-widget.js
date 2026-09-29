import { createElement as h } from "react";
import { heldKey, heldTile, rekey } from "../model.js";
import { WidgetHost } from "./widget-host.js";
import { resolvePatch } from "./resolve-patch.js";

export function MountedWidget({ name, was, widget, definition, tile, patchMounted, enterMount, ...rest }) {
	const child = heldTile(tile, "mounted", heldKey(tile.mounted, name, was), widget);
	const ownStep = stepInto({ name, was, widget });
	return h(WidgetHost, {
		...rest,
		definition,
		tile: child,
		isMounted: true,
		enterMount: enterMount ? (steps) => enterMount([ownStep, ...steps]) : null,
		// TODO: mounted prop writes read the render's copy — thread a functional patch through rekeyed
		patchProp: (given, patch) =>
			patchMounted(name, was, { props: { ...child.props, [given]: resolvePatch(child.props?.[given] ?? {}, patch) } }),
		patchMounted: (held, heldWas, patch) =>
			patchMounted(name, was, { mounted: rekey(child.mounted, held, heldWas, patch) }),
		onPatch: (patch) => patchMounted(name, was, patch),
	});
}

export function stepInto(row) {
	return { hold: "mounted", key: row.name, was: row.was, widget: row.widget };
}
