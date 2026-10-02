import type { ReactElement } from "react";
import { mountPatch } from "../model.js";
import type { Tile } from "../model.js";
import type { MountRowLike } from "../held-records.js";
import type { WidgetDefinition } from "../registry.js";
import type { GivenProps } from "../declared-widget.js";
import { widgetCatalogue } from "../catalogue-dialog.js";
import { drawWidget } from "../mounted.js";
import { viewHost } from "../engine/view-host.js";
import { NOWHERE } from "../engine/navigator-none.js";
import type { PatchStep } from "../engine/host-gateways.js";
import type { GatewayRefs, ViewCell } from "../gateway/refs.js";
import type { MountStep } from "../settings/use-settings-look.js";
import type { TilePatch } from "../settings/settings-state.js";
import type { Drawable } from "./is-drawable.js";
import { refuseFold } from "./refuse-fold.js";
import { resolveMounts } from "./mounts.js";
import type { ResolvedMounts } from "./mounts.js";
import { resolveSlots, slotGateways } from "./slots.js";
import type { PropGateways } from "./slots.js";
import { useHostGateways } from "./use-host-gateways.js";
import { useHostCommands } from "./host-commands.js";
import type { BoardRegistry, FoldIntoGroup, FoldTile, PatchMounted, SurfaceHost } from "./use-surface-shared.js";

export const RESERVED_PROPS: ReadonlySet<string> = new Set([
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

interface TilePlace {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

export type EnterMount = (steps: readonly MountStep[]) => void;

export interface WidgetHostProps {
	readonly definition: Drawable<WidgetDefinition>;
	readonly tile: Tile;
	readonly place: TilePlace;
	readonly host: SurfaceHost;
	readonly scale: number;
	readonly refs: GatewayRefs;
	readonly cellFor: (key: string) => ViewCell;
	readonly registry: BoardRegistry;
	readonly isMounted: boolean;
	readonly onCollapse: FoldTile;
	readonly onExpand: FoldTile;
	readonly patchMounted: PatchMounted;
	readonly patchProp: (name: string, step: PatchStep) => void;
	readonly onPatch: (patch: TilePatch) => void;
	readonly foldIntoGroup: FoldIntoGroup | null | undefined;
	readonly enterMount: EnterMount | null | undefined;
}

export type MountContext = Pick<
	WidgetHostProps,
	| "tile"
	| "place"
	| "host"
	| "scale"
	| "refs"
	| "cellFor"
	| "registry"
	| "onCollapse"
	| "onExpand"
	| "patchMounted"
	| "foldIntoGroup"
	| "enterMount"
>;

export interface WidgetSize {
	readonly w: number;
	readonly h: number;
	readonly scale: number;
	readonly isCollapsed: boolean;
	readonly collapse: () => void;
	readonly expand: () => void;
}

export function WidgetHost(props: WidgetHostProps): ReactElement {
	const { definition, registry } = props;
	const mounts = resolveMounts(definition.manifest, registry, mountContextOf(props));
	const gateways = useHostGateways(props, mounts);
	const commands = useHostCommands(definition.manifest, props.tile, props.refs);
	return drawWidget(definition, { ...widgetPropsOf(props, gateways, mounts), ...commands });
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
}: WidgetHostProps): MountContext {
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

function widgetPropsOf(context: WidgetHostProps, gateways: PropGateways, mounts: ResolvedMounts): GivenProps {
	const { definition, tile, host, refs, cellFor, registry, onPatch, foldIntoGroup } = context;
	const foldOrRefuse = foldIntoGroup ?? refuseFold;
	return {
		...gateways,
		configureMounts: (name: string, rows: readonly MountRowLike[]) => onPatch(mountPatch(tile, name, rows)),
		catalogue: widgetCatalogue(registry, host),
		foldIntoGroup: foldOrRefuse,
		size: sizeOf(context),
		fullscreen: { isFullscreen: false, canFullscreen: false, open() {}, close() {}, toggle() {} },
		host: viewHost(host),
		here: host.here ?? null,
		navigator: host.navigator ?? NOWHERE,
		slots: resolveSlots({
			manifest: definition.manifest,
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

function sizeOf({ definition, tile, place, scale, isMounted, onCollapse, onExpand }: WidgetHostProps): WidgetSize {
	const foldUnlessMounted = (verb: string, run: FoldTile | null | undefined) => (): void => {
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
