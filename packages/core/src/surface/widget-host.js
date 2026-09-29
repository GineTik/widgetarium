import { mountPatch } from "../model.js";
import { widgetCatalogue } from "../catalogue-dialog.js";
import { drawnWidget } from "../mounted.js";
import { viewHost } from "../engine/view-host.js";
import { NOWHERE } from "../engine/navigator-none.js";
import { refuseFold } from "./refuse-fold.js";
import { resolveMounts } from "./mounts.js";
import { resolveSlots, slotGateways } from "./slots.js";
import { useHostGateways } from "./use-host-gateways.js";

export const RESERVED_PROPS = new Set([
	"configureMounts",
	"catalogue",
	"foldIntoGroup",
	"size",
	"fullscreen",
	"host",
	"here",
	"navigator",
	"slots",
	"mounts",
	"key",
	"ref",
	"children",
]);

export function WidgetHost(props) {
	const { definition, registry } = props;
	const mounts = resolveMounts(definition.manifest, registry, mountContextOf(props));
	const gateways = useHostGateways(props, mounts);
	return drawnWidget(definition, widgetPropsOf(props, gateways, mounts));
}

function mountContextOf({
	tile,
	place,
	host,
	scale,
	refs,
	cellFor,
	registry,
	onCollapse,
	onExpand,
	patchMounted,
	foldIntoGroup,
	enterMount,
}) {
	return {
		tile,
		place,
		host,
		scale,
		refs,
		cellFor,
		registry,
		onCollapse,
		onExpand,
		patchMounted,
		foldIntoGroup,
		enterMount,
	};
}

function widgetPropsOf(context, gateways, mounts) {
	const { definition, tile, host, refs, cellFor, registry, onPatch, foldIntoGroup } = context;
	const manifest = definition.manifest;
	const foldOrRefuse = foldIntoGroup ?? refuseFold;
	return {
		...gateways,
		configureMounts: (name, rows) => onPatch(mountPatch(tile, name, rows)),
		catalogue: widgetCatalogue(registry, host),
		foldIntoGroup: foldOrRefuse,
		size: sizeOf(context),
		fullscreen: { isFullscreen: false, canFullscreen: false, open() {}, close() {}, toggle() {} },
		host: viewHost(host),
		here: host.here ?? null,
		navigator: host.navigator ?? NOWHERE,
		slots: resolveSlots({
			manifest,
			tile,
			registry,
			host,
			foldIntoGroup: foldOrRefuse,
			gatewaysOf: (childDefinition, name, widget) =>
				slotGateways({ childDefinition, tile, name, widget, host, refs, cellFor, onPatch }),
		}),
		mounts,
	};
}

function sizeOf({ definition, tile, place, scale, isMounted, onCollapse, onExpand }) {
	const foldUnlessMounted = (verb, run) => () => {
		if (!isMounted) return run?.(place.id);
		console.warn(
			`Widgetarium: ${definition.manifest.id} is mounted and cannot ${verb} — a mount has no place of its own`,
		);
	};
	return {
		w: place.w,
		h: place.h,
		scale,
		isCollapsed: Boolean(tile.folded),
		collapse: foldUnlessMounted("collapse", onCollapse),
		expand: foldUnlessMounted("expand", onExpand),
	};
}
