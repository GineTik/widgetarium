import { createElement as h } from "react";
import type { ReactElement } from "react";
import { heldTile, rekey } from "../model.js";
import type { Tile } from "../model.js";
import { reactClash } from "../fit.js";
import type { ReactIdentity } from "../fit.js";
import { viewHost } from "../engine/view-host.js";
import { NOWHERE } from "../engine/navigator-none.js";
import { widgetCatalogue } from "../engine/widget-catalogue.js";
import { widgetPreview } from "./widget-preview.js";
import { CARRIER } from "./carrier.js";
import type { EngineManifest } from "../engine/catalogue-index.js";
import type { PatchStep } from "../engine/host-context.js";
import type { GivenProps } from "../declared-widget.js";
import type { WidgetDefinition } from "../registry.js";
import type { AnyGateway, GatewayRefs, ViewCell } from "../gateway/refs.js";
import type { TilePatch } from "../settings/settings-state.js";
import { slotSpecsOf } from "../manifest-holds.js";
import type { SlotSpec } from "../manifest-holds.js";
import { slotSurfaceOf } from "../surface-roles.js";
import { withSlotSurface } from "../widget-root.js";
import type { SlotDraw } from "../widget-root.js";
import { isPainted } from "../tree.js";
import { isDrawable } from "./is-drawable.js";
import type { Drawable } from "./is-drawable.js";
import { refuseFold } from "./refuse-fold.js";
import { resolvePatch } from "./resolve-patch.js";
import { propSchemaOf, resolveDeclaredGateway } from "./prop-gateway.js";
import type { BoardRegistry, FoldIntoGroup, SurfaceHost } from "./use-surface-shared.js";

const UNSIZED = { w: 1, h: 1, scale: 1 };

type SlotGiven = GivenProps | undefined;

type ResolvedSlots = Readonly<Record<string, SlotDraw<SlotGiven> | null>>;

export type PropGateways = Readonly<Record<string, AnyGateway>>;

type GatewaysOf = (child: Drawable<WidgetDefinition>, name: string, widget: string) => PropGateways;

interface SlotsAsk {
	readonly manifest: EngineManifest;
	readonly tile: Tile;
	readonly registry: BoardRegistry;
	readonly host: SurfaceHost;
	readonly foldIntoGroup: FoldIntoGroup | null | undefined;
	readonly gatewaysOf: GatewaysOf;
}

interface SlotGatewaysAsk {
	readonly childDefinition: WidgetDefinition;
	readonly tile: Tile;
	readonly name: string;
	readonly widget: string;
	readonly host: SurfaceHost;
	readonly refs: GatewayRefs;
	readonly cellFor: (key: string) => ViewCell;
	readonly onPatch: (patch: TilePatch) => void;
}

interface SlotAt {
	readonly name: string;
	readonly spec: SlotSpec;
	readonly parentReact: ReactIdentity | undefined;
}

export function resolveSlots(ask: SlotsAsk): ResolvedSlots {
	const parentReact = ask.registry.get(ask.manifest.id)?.react;
	return Object.fromEntries(
		Object.entries(slotSpecsOf(ask.manifest)).map(([name, spec]) => [name, slotDraw(ask, { name, spec, parentReact })]),
	);
}

export function slotGateways({
	childDefinition,
	tile,
	name,
	widget,
	host,
	refs,
	cellFor,
	onPatch,
}: SlotGatewaysAsk): PropGateways {
	const held = heldTile(tile, "slots", name, widget);
	const propsRef = { current: held.props };
	const patchProp = (prop: string, patch: PatchStep): void =>
		onPatch({
			slots: rekey(tile.slots, name, undefined, {
				props: { ...held.props, [prop]: resolvePatch(held.props?.[prop] ?? {}, patch) },
			}),
		});
	const plain = Object.entries(childDefinition.manifest.props ?? {}).filter(([, spec]) => !spec["source"]);
	return Object.fromEntries(
		plain.map(([prop, spec]) => [
			prop,
			resolveDeclaredGateway({
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

function slotDraw(ask: SlotsAsk, { name, spec, parentReact }: SlotAt): SlotDraw<SlotGiven> | null {
	const { tile, registry, host, foldIntoGroup, gatewaysOf } = ask;
	const widget = tile.slots?.[name]?.widget ?? spec.default;
	const child = registry.get(widget);
	if (!widget || !isDrawable(child)) return null;
	const clash = reactClash(parentReact, child.react);
	if (clash) {
		console.error(`Widgetarium: ${clash}`);
		return () => refusedSlot(clash);
	}
	const unfed = gatewaysOf(child, name, widget);
	const draw = (given: SlotGiven): ReactElement =>
		h(child.component, {
			...unfed,
			...given,
			size: given?.["size"] ?? UNSIZED,
			host: viewHost(host),
			here: host.here ?? null,
			navigator: host.navigator ?? NOWHERE,
			catalogue: widgetCatalogue(host),
			widgetPreview: widgetPreview(host.catalogue),
			widgetCarrier: CARRIER,
			foldIntoGroup: foldIntoGroup ?? refuseFold,
		});
	const surface = slotSurfaceOf(spec, tile.slots?.[name]);
	return withSlotSurface(draw, { surface, isCard: isPainted({ surface }) });
}

function refusedSlot(said: string): ReactElement {
	return h("div", { className: "wg-missing" }, [
		h("b", { key: "what" }, "This slot cannot be filled by that widget"),
		h("span", { key: "why" }, said),
	]);
}
