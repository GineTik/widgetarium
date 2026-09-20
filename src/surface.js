import { createElement as h, Component } from "react";
import { memo } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { classOf, measureGrid, scaleOf } from "./paths.js";
import { createWidthWatcher } from "./width-gate.js";
import {
	heldKey,
	heldTile,
	mountList,
	mountPatch,
	mountRows,
	propConfig,
	rekeyed,
	uniqueName,
	VIEW_GROUP,
} from "./model.js";
import { crashBoundary } from "./crash-boundary.js";
import { reactClash } from "./fit.js";
import { widgetCatalogue } from "./catalogue-dialog.js";
import { mountInto } from "./portal.js";
import { DrawnInShell, drawnWidget } from "./mounted.js";
import { leaseFor } from "./engine/render.js";
import { createTileShells } from "./engine/tile-shells.js";
import { viewHost } from "./engine/view-host.js";
import { NOWHERE } from "./engine/navigator-none.js";
import { trace } from "./trace.js";
import { stableKey } from "./gateway/cache.js";
import { arrayGateway, valueGateway } from "./gateway/create.js";
import { folderGateway, fileGateway, noteFieldOf } from "./gateway/obsidian.js";
import {
	createGatewayRefs,
	createViewCells,
	narrowedByRefs,
	pickedGateway,
	refCollection,
	refOf,
	refValue,
	refsWithin,
	selectionGateway,
} from "./gateway/refs.js";
import {
	allowedVerbs,
	bindingOf,
	declaredOf,
	hardcodeCollection,
	hardcodeValue,
	needsOf,
	requestedVerbs,
	typedIn,
	typedKeyOf,
	withinAllowed,
} from "./gateway/props.js";
import { mappedCollection } from "./gateway/mapped.js";
import { statGateway } from "./gateway/stats.js";
import { useSettingsWindow } from "./settings-window.js";
import { CatalogueDialog } from "./catalogue-dialog.js";
import { ConfirmDialog } from "./dialog.js";
import { declaredName } from "./registry.js";
import { isUnresolved, wiredTiles } from "./engine/wiring.js";
import { RegionDrawer } from "./drawer.js";
import { Button, Icon, IconButton } from "./kit.js";
import { compatibility, movedTileProps } from "./engine/compatibility.js";
import { generationOf, widgetKeyOf } from "./engine/widget-ref.js";
import { EditableTabs } from "./editable-tabs.js";
import { applyTabStep, archivedOf, movesRows, movesSelection, tabsOf } from "./tab-rows.js";
import {
	aimedAt,
	columnsOf,
	COLUMN,
	floorOf,
	growsOf,
	holdsOf,
	isFolded,
	keptAt,
	laidRegion,
	leavesOf,
	movedInto,
	nodeAt,
	pathOfLeaf,
	pruned,
	replacedAt,
	sameTarget,
	shownIn,
	sidebarWidth,
	swapBoxes,
	sideOf,
	SWAP,
	toggledFold,
	togglesUnder,
	isAlwaysToggled,
	toggledFoldAt,
	HIDE,
	DRAWER,
	MENU,
	SHEET,
	openKeyOf,
	overlayWidthOf,
	regionCollapseOf,
	widenedBox,
	widthsOf,
	withHeight,
	withHolds,
	withoutLeaf,
	withRatios,
	withWidth,
	GAP_PX,
	gapVarsOf,
	innerWidthOf,
	insertedAt,
	insetOf,
	isBox,
	isPainted,
	levelAt,
	NO_SURFACE,
	REGION_GAP_PX,
	resized,
	ROW,
	MIN_HEIGHT_PX,
	MIN_SIDEBAR_PX,
	pathKey,
	byPath,
} from "./tree.js";
import { movesFrom, playMoves, positionsWithin } from "./flip.js";
import { useMeasuredSurfaces } from "./surface-measure.js";
import { slotSurfaceOf } from "./surface-roles.js";
import { saidRefusal, surfaceChoicesAt, wornSurfaceAt } from "./surface-laws.js";
import { surfacedSlot } from "./widget-root.js";
import { platesAtCell, PLATES_ABOVE } from "./kit-surface.js";
import { useContentInsets } from "./content-insets.js";

const SHOW_NAMED = "Show {name}";
const HIDE_NAMED = "Hide {name}";
const HIDE_UNNAMED = {
	left: "Hide the left panel",
	right: "Hide the right panel",
	[SHEET]: "Hide the bottom panel",
	[MENU]: "Hide the menu",
};
const SHOW_UNNAMED = {
	left: "Show the left panel",
	right: "Show the right panel",
	[SHEET]: "Show the bottom panel",
	[MENU]: "Show the menu",
};
const ICON_OF_LOOK = { left: "panel-left", right: "panel-right", [SHEET]: "panel-bottom", [MENU]: "menu" };
const NO_BOX_FOR_THE_VIEWS = "Widgetarium: this board holds no box the views could stand in, so nothing was folded.";
const NO_VIEWS_TO_FOLD =
	"Widgetarium: this board holds no widget that names itself a view, so there was nothing to fold.";
const SEAT = "wg-seat";
const INSTALL_THAT_VERSION = "Install the version this board was made with";
const NEWER_GENERATION = "A newer {widget} is installed; this tile still uses the version it was made with.";
const MOVE_TO_NEWER = "Move this tile to it";

// CONTEXT: the fixed prop names WidgetHost owns — a manifest prop may not shadow one
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

const PANE_SELECTOR = ".view-content";
// under this a board is not laid out yet, and its width is not a fact about the screen
const MIN_BOARD_WIDTH_PX = 120;
// CONTEXT: the window must be taller than the widget it frames, or it opens panned
// TRADE-OFF: the panels fade before the box returns, so closing does not read as a snap
const SETTINGS_FADE_MS = 140;

const Boundary = crashBoundary(h, Component);

function refuseFold() {
	console.warn("Widgetarium: this widget was rendered without a board and cannot fold its views into a group");
	return false;
}

function isDrawable(definition) {
	return Boolean(definition?.component) && !definition.error;
}

// A slot is where the board says WHICH widget draws part of another one. The parent feeds
// it — a card gets its row from the board — so a slotted widget has no source of its own; it
// is a view handed data. That is what makes "replace this card" a setting, not a fork.
function refusedSlot(said) {
	return h("div", { className: "wg-missing" }, [
		h("b", { key: "what" }, "This slot cannot be filled by that widget"),
		h("span", { key: "why" }, said),
	]);
}

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
		const unfed = gatewaysOf(child.manifest, name, widget);
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

// CONTEXT: module scope, so returning to a view finds the same component type
function MountedWidget({ name, was, widget, definition, tile, patchMounted, ...rest }) {
	const child = heldTile(tile, "mounted", heldKey(tile.mounted, name, was), widget);
	return h(WidgetHost, {
		...rest,
		definition,
		tile: child,
		isMounted: true,
		// TODO: mounted prop writes read the render's copy — thread a functional patch through rekeyed
		patchProp: (given, patch) =>
			patchMounted(name, was, { props: { ...child.props, [given]: resolvePatch(child.props?.[given] ?? {}, patch) } }),
		patchMounted: (held, heldWas, patch) =>
			patchMounted(name, was, { mounted: rekeyed(child.mounted, held, heldWas, patch) }),
		onPatch: (patch) => patchMounted(name, was, patch),
	});
}

function resolvePatch(current, patch) {
	return { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
}

// CONTEXT: an id the registry could not resolve is still an entry — dropping it hid the gap
function mountEntry(row, registry, mount) {
	const held = row.widget ? registry.get(row.widget) : null;
	const drawable = isDrawable(held);
	return {
		name: row.name,
		id: row.widget,
		// CONTEXT: archived is hidden, never gone — the record and its settings stay put
		hidden: row.hidden === true,
		title: held?.manifest?.title || row.widget || row.name,
		// CONTEXT: the child's own declaration — what a holder matches on is the holder's business
		manifest: held?.manifest ? { ...held.manifest } : null,
		problem: drawable ? null : row.widget ? (held ? "failed" : "not-found") : "empty",
		failure: held?.error ? String(held.error.message ?? held.error) : null,
		drawInto: drawable
			? (element) =>
					drawMounted(
						element,
						row.widget,
						h(MountedWidget, { ...mount, name: row.name, was: row.was, widget: row.widget, definition: held }),
					)
			: null,
	};
}

function behindBoundary(widget, child) {
	return h(Boundary, { key: widget }, child);
}

function drawMounted(element, widget, child) {
	const { draw, release } = leaseFor(element);
	draw(behindBoundary(widget, child));
	return release;
}

function drawnTile(shells, tile, child) {
	return h(DrawnInShell, { shell: shells.shellFor(tile.id), tree: behindBoundary(tile.widget, child) });
}

export function resolveMounts(manifest, registry, mount) {
	const mounts = {};
	for (const [name, spec] of Object.entries(manifest.mounts ?? {})) {
		const rows = mountRows(mountList(mount.tile, name, spec), (id) => declaredName(registry, id));
		mounts[name] = rows.map((row) => mountEntry(row, registry, mount));
	}
	return mounts;
}

function mountsCollection(tile, name, entries) {
	const rows = entries.map((entry) => ({
		ref: entry.name,
		value: { name: entry.name, value: entry.name, widget: entry.id, hidden: entry.hidden },
	}));
	return arrayGateway(() => rows, {}, `${refOf(tile.id, name)}?${stableKey(rows)}`);
}

export function whereOf(spec, config) {
	return [...(spec?.where ?? []), ...(config?.where ?? [])];
}

function mappingFor(spec, config, shapes, path) {
	const needs = needsOf(spec);
	if (Object.keys(needs).length === 0) return null;
	return { needs, chosen: { ...shapes?.readShape(path), ...(config.map ?? {}) } };
}

function typedGateway({ name, spec, tile, config, refs, propsRef, patchProp, requested }) {
	const declared = declaredOf(spec);
	const asRendered = typedIn(spec, config) ?? declared;
	const held = {
		id: `${tile.id}/${name}?${stableKey(asRendered)}`,
		readValue: () => typedIn(spec, propConfig({ ...tile, props: propsRef.current }, name, spec)) ?? declared,
		mutateValue: (step) =>
			patchProp(name, (inFlight) => ({ [typedKeyOf(spec)]: step(typedIn(spec, inFlight) ?? asRendered) })),
		requested,
		spec,
	};
	if (spec.kind === "value") return hardcodeValue(held);
	return narrowedByRefs(hardcodeCollection(held), whereOf(spec, config), refs);
}

function folderRows({ spec, host, config, refs, path, requested }) {
	const baked = { sort: [...(spec.sort ?? []), ...(config.sort ?? [])] };
	const base = folderGateway({ host, path, baked, requested });
	const mapping = mappingFor(spec, config, host?.shapes, path);
	return narrowedByRefs(mapping ? mappedCollection(base, mapping) : base, whereOf(spec, config), refs);
}

function vaultGateway({ spec, host, config, refs, kind, requested }) {
	const path = config.path || spec.default?.path || "";
	if (kind === "value")
		return fileGateway({ host, path, part: { field: noteFieldOf(spec, config), type: spec.type }, requested });
	return folderRows({ spec, host, config, refs, path, requested });
}

function slotGateways({ childManifest, tile, name, widget, host, refs, cellFor, onPatch }) {
	const held = heldTile(tile, "slots", name, widget);
	const propsRef = { current: held.props };
	const patchProp = (prop, patch) =>
		onPatch({
			slots: rekeyed(tile.slots, name, undefined, {
				props: { ...held.props, [prop]: resolvePatch(held.props?.[prop] ?? {}, patch) },
			}),
		});
	const plain = Object.entries(childManifest?.props ?? {}).filter(([, spec]) => !spec.of && !spec.picks);
	return Object.fromEntries(
		plain.map(([prop, spec]) => [
			prop,
			resolveGateway({ name: prop, spec, tile: held, host, refs, cellFor, propsRef, patchProp }),
		]),
	);
}

function resolveGateway({ name, spec, tile, host, refs, cellFor, propsRef, patchProp }) {
	const config = propConfig(tile, name, spec);
	const { kind, binding } = bindingOf(spec, config);
	const requested = requestedVerbs(spec);
	if (binding === "ref") return kind === "value" ? refValue(refs, config.ref) : refCollection(refs, config.ref);
	if (binding === "memory") return cellFor(refOf(tile.id, name));
	if (binding === "stat")
		return statGateway(
			folderRows({ spec: {}, host, config, refs, path: config.path ?? "", requested: ["list"] }),
			config,
		);
	const allowed = allowedVerbs(spec, config, binding);
	if (binding === "hardcode")
		return withinAllowed(typedGateway({ name, spec, tile, config, refs, propsRef, patchProp, requested }), allowed);
	return withinAllowed(vaultGateway({ spec, host, config, refs, kind, requested }), allowed);
}

const readingOver = (over, refs) => ({
	collection: refCollection(refs, over),
	watches: (listener) => refs.watch([over], listener),
});

const fieldNaming = (spec, gatewayFor) =>
	spec.fieldFrom ? () => gatewayFor(spec.fieldFrom)?.get() : (spec.field ?? null);

// TRADE-OFF: the list is read back through the registry rather than closed over, because a stable id keeps the cache attached across a write and only a live read then sees the row that write just made
function resolveSelection({ name, spec, tile, refs, cellFor, config, gatewayFor }) {
	if (config.ref) return refValue(refs, config.ref);
	if (!gatewayFor(spec.of)) return null;
	const key = refOf(tile.id, name);
	const over = refOf(tile.id, spec.of);
	const named = fieldNaming(spec, gatewayFor);
	return selectionGateway({
		id: key,
		memory: cellFor(key),
		collection: refCollection(refs, over),
		fieldName: named,
		isFallbackToFirst: spec.fallback === "first",
		watches: (listener) => refs.watch([over], listener),
	});
}

function resolvePickedRow({ name, spec, tile, refs, config, gatewayFor, manifest, propsRef, patchProp }) {
	if (config.ref) return refValue(refs, config.ref);
	const chosen = gatewayFor(spec.picks);
	if (!chosen || !gatewayFor(spec.of)) return null;
	const picking = manifest.props?.[spec.picks] ?? {};
	const inTile = typedGateway({ name, spec, tile, config, refs, propsRef, patchProp, requested: requestedVerbs(spec) });
	return pickedGateway({
		id: `${refOf(tile.id, name)}?${inTile.id}`,
		chosen,
		fieldName: fieldNaming(picking, gatewayFor),
		isFallbackToFirst: (spec.fallback ?? picking.fallback) === "first",
		inTile,
		...readingOver(refOf(tile.id, spec.of), refs),
	});
}

export function WidgetHost({
	definition,
	tile,
	place,
	host,
	scale,
	patchProp,
	refs,
	cellFor,
	registry,
	onCollapse,
	onExpand,
	onPatch,
	patchMounted,
	isMounted,
	foldIntoGroup,
}) {
	const manifest = definition.manifest;

	// CONTEXT: gateways read the tile through this ref, so a refetch sees the write that caused it
	const propsRef = useRef(tile.props);
	propsRef.current = tile.props ?? {};

	const mounts = resolveMounts(manifest, registry, {
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
	});

	const gateways = {};
	const gatewayFor = (name) => gateways[name] ?? null;
	const declaredProps = Object.entries(manifest.props ?? {}).filter(([name]) => {
		if (!RESERVED_PROPS.has(name)) return true;
		console.warn(`Widgetarium: ${manifest.id} declares a prop named "${name}", which the host owns — skipped`);
		return false;
	});
	for (const [name, entries] of Object.entries(mounts)) gateways[name] = mountsCollection(tile, name, entries);
	for (const [name, spec] of declaredProps) {
		if (spec.of) continue;
		gateways[name] = resolveGateway({ name, spec, tile, host, refs, cellFor, propsRef, patchProp });
	}
	for (const [name, spec] of declaredProps) {
		if (!spec.of || spec.picks) continue;
		gateways[name] = resolveSelection({
			name,
			spec,
			tile,
			refs,
			cellFor,
			config: tile.props?.[name] ?? {},
			gatewayFor,
		});
	}
	for (const [name, spec] of declaredProps) {
		if (!spec.picks) continue;
		gateways[name] = resolvePickedRow({
			name,
			spec,
			tile,
			refs,
			config: propConfig(tile, name, spec),
			gatewayFor,
			manifest,
			propsRef,
			patchProp,
		});
	}

	for (const [name, gateway] of Object.entries(gateways)) {
		const spec = manifest.props?.[name] ?? manifest.mounts?.[name] ?? {};
		const config = tile.props?.[name] ?? {};
		const leansOn = spec.of
			? [
					refOf(tile.id, spec.of),
					...(spec.fieldFrom ? [refOf(tile.id, spec.fieldFrom)] : []),
					...(spec.picks ? [refOf(tile.id, spec.picks)] : []),
				]
			: [...(typeof config.ref === "string" ? [config.ref] : []), ...refsWithin(whereOf(spec, config))];
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
	const registered = useRef([]);
	registered.current = Object.entries(gateways).map(([name, gateway]) => [refOf(tile.id, name), gateway]);
	useEffect(
		() => () => {
			for (const [ref, gateway] of registered.current) refs.drop(ref, gateway);
		},
		[refs],
	);

	// CONTEXT: a mount has no place, so folding one would fold the tile holding it
	const fold = (verb, run) => () => {
		if (!isMounted) return run?.(place.id);
		console.warn(`Widgetarium: ${manifest.id} is mounted and cannot ${verb} — a mount has no place of its own`);
	};

	const foldOrRefuse = foldIntoGroup ?? refuseFold;
	const props = {
		...gateways,
		// CONTEXT: the list a mount holds and the records it keys are one write
		configureMounts: (name, rows) => onPatch(mountPatch(tile, name, rows)),
		// CONTEXT: the board's registry, never the widget's — an id comes back
		catalogue: widgetCatalogue(registry, host),
		foldIntoGroup: foldOrRefuse,
		// A widget may ask to be narrower; it may not resize itself. The board owns places, so
		// it is the board that writes the width and the board that remembers the one it came
		// from — which is why reopening a panel returns to the width THIS screen had it at.
		size: {
			w: place.w,
			h: place.h,
			scale,
			isCollapsed: Boolean(tile.folded),
			collapse: fold("collapse", onCollapse),
			expand: fold("expand", onExpand),
		},
		fullscreen: { isFullscreen: false, canFullscreen: false, open() {}, close() {}, toggle() {} },
		// the environment, not the store: platform, capabilities, and a way to speak to the user
		host: viewHost(host),
		// WHERE THIS WIDGET IS, as one record with no list and no filters — the note under a
		// board, the paragraph under an inline widget. `here.of` says which.
		here: host.here ?? null,
		// CONTEXT: navigation is its own entity, never a gateway verb — data does not move people
		navigator: host.navigator ?? NOWHERE,
		slots: resolveSlots({
			manifest,
			tile,
			registry,
			host,
			foldIntoGroup: foldOrRefuse,
			gatewaysOf: (childManifest, name, widget) =>
				slotGateways({ childManifest, tile, name, widget, host, refs, cellFor, onPatch }),
		}),
		mounts,
	};

	return drawnWidget(definition, props);
}

const ICON_GEAR = [
	"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
	"M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
];
// a bin, not a cross: removing a widget is a deletion, and the cross reads as "close"
const ICON_TRASH = [
	"M3 6h18",
	"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
	"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
	"M10 11v6",
	"M14 11v6",
];

function icon(paths) {
	return h(
		"svg",
		{ className: "wg-icon", viewBox: "0 0 24 24", "aria-hidden": "true" },
		paths.map((d, index) => h("path", { key: index, d, strokeLinecap: "round", strokeLinejoin: "round" })),
	);
}

function widgetPatchers(tile, onPatch) {
	return {
		patchProp: (name, patch) =>
			onPatch((now) => ({ props: { ...(now.props ?? {}), [name]: resolvePatch(now.props?.[name] ?? {}, patch) } })),
		patchMounted: (name, was, patch) => onPatch({ mounted: rekeyed(tile.mounted, name, was, patch) }),
	};
}

function tileActions(tileId, onOpenSettings, onRemove) {
	return h(
		"span",
		{ className: "wg-tile-actions", key: "actions", onPointerDown: (event) => event.stopPropagation() },
		[
			h(
				"button",
				{
					key: "settings",
					title: "Settings",
					"aria-label": "Settings",
					onClick: (event) => onOpenSettings?.(tileId, sizeOfCell(event.currentTarget)),
				},
				icon(ICON_GEAR),
			),
			h(
				"button",
				{ key: "remove", title: "Remove", "aria-label": "Remove", onClick: () => onRemove?.(tileId) },
				icon(ICON_TRASH),
			),
		],
	);
}

function sizeOfCell(node) {
	const at = node.closest(".wg-tree-cell")?.getBoundingClientRect();
	return at ? { width: Math.round(at.width), height: Math.round(at.height) } : null;
}

function missingTile(tile, host) {
	return h("div", { className: "wg-missing" }, [
		h("b", { key: "said" }, "This widget is not installed"),
		h("p", { key: "named", className: "wg-missing-id" }, tile.widget),
		generationOf(tile.widget) && host?.installWidgetAt
			? h(
					Button,
					{
						key: "install",
						size: "s",
						className: "wg-missing-install",
						onClick: () => host.installWidgetAt(tile.widget),
					},
					INSTALL_THAT_VERSION,
				)
			: null,
	]);
}

function newerGenerationFor(registry, tile) {
	const held = registry.resolveId?.(tile.widget);
	const newest = registry.generationsOf?.(widgetKeyOf(tile.widget)).at(-1);
	if (!held || !newest || newest === held) return null;
	const verdict = compatibility(registry.get(held)?.manifest, registry.get(newest)?.manifest);
	return verdict.canMoveTiles ? { newest, verdict } : null;
}

function movedToNewer(registry, tile, newer) {
	return (now) =>
		now.widget === tile.widget
			? { widget: registry.tileRefOf(newer.newest), props: movedTileProps(now.props, newer.verdict) }
			: {};
}

function newerGenerationNote(registry, tile, patchTile) {
	const newer = newerGenerationFor(registry, tile);
	if (!newer) return null;
	return h("div", { className: "wg-newer", key: "newer" }, [
		h("span", { key: "said" }, NEWER_GENERATION.replace("{widget}", widgetKeyOf(tile.widget))),
		h(
			Button,
			{ key: "move", size: "s", onClick: () => patchTile(tile.id, movedToNewer(registry, tile, newer)) },
			MOVE_TO_NEWER,
		),
	]);
}

function treeCellBody({ tile, definition, shared, cell, patchTile, editing }) {
	if (!definition) return missingTile(tile, shared.host);
	const onPatch = (patch) => patchTile(tile.id, patch);
	const place = { id: tile.id, x: 0, y: 0, w: cell.width, h: 1 };
	const drawn = drawnTile(
		shared.shells,
		tile,
		h(
			PLATES_ABOVE.Provider,
			{ value: platesAtCell(cell) },
			h(WidgetHost, { ...shared, ...widgetPatchers(tile, onPatch), definition, tile, place, onPatch }),
		),
	);
	const note = editing ? newerGenerationNote(shared.registry, tile, patchTile) : null;
	return note ? [note, drawn] : drawn;
}
function pathFrom(key) {
	return key === "" ? [] : key.split("/").map(Number);
}

function styleOfNode(node) {
	const along = node.basisPx
		? { flex: `0 0 ${node.basisPx}px` }
		: node.basis === "auto"
			? { flexGrow: 0, flexShrink: 0, flexBasis: "auto" }
			: { flexGrow: node.grow ?? 1, flexShrink: 1, flexBasis: 0 };
	return {
		...along,
		minWidth: 0,
		...(node.height ? { height: `${node.height}px` } : {}),
		...(node.cap ? { maxHeight: `${node.cap}px` } : {}),
		...(node.measure ? { maxInlineSize: `${node.measure}px`, marginInline: "auto", inlineSize: "100%" } : {}),
		...(node.kind === "box" ? { "--wg-tree-gap": `${node.gap}px` } : {}),
		...(node.kind === "leaf" ? gapVarsOf(node.level) : {}),
		...dividerReach(node),
		...plateVars(node),
	};
}

function plateVars(plate) {
	if (!plate?.corner) return {};
	return {
		"--wg-plate-corner": `${plate.corner}px`,
		"--wg-kit-plate": `${plate.kitPlate}px`,
		"--wg-kit-item": `${plate.kitItem}px`,
	};
}

function dividerReach(node) {
	if (!node.dividerAxis) return {};
	return {
		"--wg-divider-before": `${node.dividerBefore ?? 0}px`,
		"--wg-divider-after": `${node.dividerAfter ?? 0}px`,
		"--wg-divider-half": `${node.dividerHalf}px`,
	};
}

function surfaceAttrs(node) {
	if (!node.surface || node.surface === NO_SURFACE) return {};
	const across = node.dividerAxis ? { "data-across": node.dividerAxis, "data-side": node.side } : {};
	return { "data-surface": node.surface, ...across };
}

function TreeCell(props) {
	const { cell, tile, definition, shared, patchTile, standInPx, editing, settingsStandInPx, onOpenSettings, onRemove } =
		props;
	const style = styleOfNode(cell);
	const at = {
		"data-cell": cell.id,
		...(cell.path ? { "data-path": pathKey(cell.path) } : {}),
		...(cell.across ? { "data-stands-across": cell.across } : {}),
	};
	if (standInPx)
		return h("div", {
			className: "wg-tree-cell is-stand-in",
			style: { ...style, minHeight: `${standInPx}px` },
			...at,
		});
	const shownInCell = settingsStandInPx
		? h("div", { style: { minHeight: `${settingsStandInPx}px` } })
		: treeCellBody({ tile, definition, shared, cell, patchTile, editing });
	return h("div", { className: "wg-tile wg-tree-cell", style, ...at, ...surfaceAttrs(cell) }, [
		h("div", { className: "wg-tile-body", key: "body" }, shownInCell),
		editing && !settingsStandInPx ? tileActions(tile.id, onOpenSettings, onRemove) : null,
	]);
}

const CELL_SHAPE = [
	"grow",
	"basis",
	"basisPx",
	"width",
	"height",
	"cap",
	"id",
	"surface",
	"side",
	"dividerAxis",
	"dividerBefore",
	"dividerAfter",
	"dividerHalf",
	"gapAfter",
	"corner",
	"level",
	"plates",
	"underSurface",
];
const CELL_PROPS = ["standInPx", "editing", "settingsStandInPx", "tile", "definition", "shared"];

const Cell = memo(
	TreeCell,
	(before, after) =>
		String(before.cell.path) === String(after.cell.path) &&
		CELL_SHAPE.every((key) => before.cell[key] === after.cell[key]) &&
		CELL_PROPS.every((key) => before[key] === after[key]),
);

function withFloors(children, ask) {
	return children.map((child) => ({ ...child, ratio: child.ratio ?? 1, minPx: floorOf(child, ask) }));
}

function dragUntilDropped(dragRef, event, { read, paint, commit }) {
	event.preventDefault();
	event.stopPropagation();
	let latest = null;
	let shown = null;
	const draw = () => shown !== null && paint(shown);
	const move = (moved) => {
		latest = read(moved, false);
		shown = read(moved, true);
		draw();
	};
	const stop = () => {
		window.removeEventListener("pointermove", move);
		window.removeEventListener("pointerup", stop);
		document.body.classList.remove("wg-tree-dragging");
		dragRef.current = null;
		if (latest === null) return;
		shown = latest;
		draw();
		commit(latest);
	};
	dragRef.current = { stop, repaint: draw };
	document.body.classList.add("wg-tree-dragging");
	window.addEventListener("pointermove", move);
	window.addEventListener("pointerup", stop);
}

function paintGrows(cells, ratios) {
	const grows = growsOf(ratios.map((ratio) => ({ ratio })));
	cells.forEach((cell, index) => {
		cell.style.flexGrow = grows[index];
	});
}

function ratioRecipe({ drawn, ask, event, boxPath, at }) {
	const rowNode = event.currentTarget.parentElement;
	const box = rowNode.getBoundingClientRect();
	const cells = [...rowNode.children].filter((one) => !one.classList.contains("wg-tree-handle"));
	const row = nodeAt(drawn, boxPath);
	const children = withFloors(row.of, ask);
	const inner = innerWidthOf(row, box.width - 2 * insetOf(row), { level: levelAt(drawn, boxPath), ask });
	const held = widthsOf(children, inner)
		.slice(0, at + 1)
		.reduce((sum, one) => sum + one, 0);
	const start = box.left + insetOf(row);
	const grabbed = event.clientX - start - held;
	const boundaryOf = (moved) => moved.clientX - start - grabbed;
	return {
		read: (moved, give) =>
			resized(children, at, { boundaryPx: boundaryOf(moved), inner, isFree: moved.shiftKey, give }).map(
				(child) => child.ratio,
			),
		paint: (ratios) => paintGrows(cells, ratios),
	};
}

function drawnHeightsWithin(grabbed) {
	return byPath(grabbed, (node) => ({
		heightPx: node.getBoundingClientRect().height,
		dir: node.dataset.dir,
		across: node.dataset.standsAcross,
	}));
}

function paintLeafHeights(grabbed, resizedTree, path) {
	for (const leaf of leavesOf(nodeAt(resizedTree, path), path)) {
		const selector = `.wg-tree-cell[data-path="${pathKey(leaf.path)}"]`;
		const cell = grabbed.matches(selector) ? grabbed : grabbed.querySelector(selector);
		if (cell) cell.style.height = `${nodeAt(resizedTree, leaf.path).height}px`;
	}
}

function heightRecipe({ drawn, ask, event, path, commitLayout }) {
	const grabbed = event.currentTarget.parentElement.firstElementChild;
	const drawnAs = drawnHeightsWithin(grabbed);
	const startPx = grabbed.getBoundingClientRect().height;
	return {
		read: (moved, give) => ({ wantedPx: startPx + moved.clientY - event.clientY, give }),
		paint: ({ wantedPx, give }) =>
			paintLeafHeights(grabbed, withHeight(drawn, path, wantedPx, { drawnAs, ask, give }), path),
		commit: ({ wantedPx }) => commitLayout((held) => withHeight(held, path, wantedPx, { drawnAs, ask })),
	};
}

function grip(className, onPointerDown, { key, style }) {
	return h(
		"div",
		{ className: `wg-tree-handle ${className}`, key, onPointerDown, style },
		h("i", { className: "wg-tree-grip" }),
	);
}

function addZone(column, draw) {
	const isOnly = column.of.length === 0;
	return h(
		"button",
		{
			className: `wg-tree-add${isOnly ? " is-only" : ""}${draw.editing ? "" : " is-quiet"}`,
			key: "add",
			type: "button",
			style: isOnly ? undefined : { marginTop: `${column.gap}px` },
			onClick: () => draw.onAdd(column.path),
		},
		[h(Icon, { key: "plus", name: "plus", size: 20 }), h("span", { key: "label" }, "Add a widget")],
	);
}

function cellElement(leaf, draw) {
	const tile = draw.tileOf(leaf.id);
	if (!tile) return null;
	return h(Cell, {
		key: leaf.id,
		cell: leaf,
		tile,
		definition: draw.shared.registry.get(tile.widget),
		shared: draw.shared,
		patchTile: draw.patchTile,
		standInPx: draw.carry?.id === leaf.id ? draw.carry.height : 0,
		editing: draw.editing,
		settingsStandInPx: draw.settingsId === leaf.id ? Math.max(draw.settingsStandInPx, 1) : 0,
		onOpenSettings: draw.onOpenSettings,
		onRemove: draw.onRemove,
	});
}

function rowElement(row, draw) {
	const key = pathKey(row.path);
	return h(
		"div",
		{ className: "wg-tree-row", key, "data-path": key, "data-dir": ROW, style: styleOfNode(row), ...surfaceAttrs(row) },
		row.of.flatMap((child, at) => [
			at > 0 && !row.hasCollapsed
				? grip("is-across", draw.grabRatio(row.path, at - 1), {
						key: `grip-${pathKey(child.path)}`,
						style: { flex: `0 0 ${row.of[at - 1].gapAfter}px` },
					})
				: null,
			nodeElement(child, draw),
		]),
	);
}

function bandElement(child, draw) {
	return h("div", { className: "wg-tree-band", key: pathKey(child.path) }, [
		nodeElement(child, draw),
		alongElement(child, draw),
	]);
}

function alongElement(child, draw) {
	const style = { height: `${child.gapAfter}px` };
	if (child.kind === "box" && child.dir !== ROW) return h("div", { key: "along", style });
	return grip(`is-along${child.gapAfter === 0 ? " is-last" : ""}`, draw.grabHeight(child.path), {
		key: "along",
		style,
	});
}

function columnElement(column, draw) {
	const key = pathKey(column.path);
	const isEmpty = column.of.length === 0;
	const attrs = { className: "wg-tree", key, "data-path": key, "data-dir": COLUMN, style: styleOfNode(column) };
	return h("div", { ...attrs, ...surfaceAttrs(column) }, [
		...column.of.map((child) =>
			child.kind === "collapsed" ? collapsedElement(child, draw) : bandElement(child, draw),
		),
		draw.editing || isEmpty ? addZone(column, draw) : null,
	]);
}

const VIEW_GONE_FOR_GOOD =
	"The view goes for good, with the widgets in it and everything they were set to. This cannot be undone.";

function holdsCollection(ref, rows) {
	const held = rows.map((row) => ({
		ref: row.name,
		value: { name: row.name, value: row.name, hidden: Boolean(row.hidden) },
	}));
	return arrayGateway(() => held, {}, `${ref}?${stableKey(held)}`);
}

function useCellValue(cell) {
	const [held, setHeld] = useState(null);
	useEffect(() => {
		let isReading = true;
		const reread = () =>
			Promise.resolve(cell.get()).then((value) => {
				if (isReading) setHeld(value ?? null);
			});
		reread();
		const stop = cell.subscribe(reread);
		return () => {
			isReading = false;
			stop();
		};
	}, [cell]);
	return held;
}

// TRADE-OFF: a box with no id publishes nothing and keeps its pick under its path, because binding to a place rather than to an identity is what a moved box would silently break
function swapRefs(swap) {
	if (!swap.id) return { holds: null, selection: `swap:${pathKey(swap.path)}/selection` };
	return { holds: refOf(swap.id, "holds"), selection: refOf(swap.id, "selection") };
}

// TRADE-OFF: each box publishes a wrapper of its own over the shared cell, because a drop is matched by identity and a box leaving after its replacement arrived would otherwise take the replacement's selection with it
function ownedSelection(cell) {
	return valueGateway({
		id: cell.id,
		handlers: {
			get: () => cell.get(),
			update: (next) => cell.update(next),
			remove: () => cell.remove(),
		},
		subscribe: (listener) => cell.subscribe(listener),
	});
}

function describedSwap(swap, prop, kind) {
	return { tile: swap.id, prop, label: prop === "holds" ? "Views" : "Shown view", title: "View box", kind };
}

function SwapBox({ swap, draw }) {
	const { refs, cellFor } = draw.shared;
	const rows = holdsOf(swap);
	const named = swapRefs(swap);
	const cell = cellFor(named.selection);
	const shown = shownIn(rows, useCellValue(cell));
	const shownAt = rows.findIndex((row) => row.name === shown);
	const holds = useMemo(() => holdsCollection(named.holds ?? named.selection, rows), [named.holds, stableKey(rows)]);
	const selection = useMemo(() => ownedSelection(cell), [cell]);

	if (named.holds) {
		refs.put(named.holds, holds, { describes: describedSwap(swap, "holds", "collection") });
		refs.put(named.selection, selection, { describes: describedSwap(swap, "selection", "value") });
	}
	const published = useRef([]);
	published.current = named.holds
		? [
				[named.holds, holds],
				[named.selection, selection],
			]
		: [];
	useEffect(
		() => () => {
			for (const [ref, gateway] of published.current) refs.drop(ref, gateway);
		},
		[refs],
	);

	const apply = (step) => {
		if (movesSelection(step)) cell.update(step.selected ?? "");
		if (movesRows(step)) draw.commitHolds(swap.path, applyTabStep(rows, step));
	};

	const key = pathKey(swap.path);
	return h(
		"div",
		{ className: "wg-tree-swap", "data-path": key, "data-dir": SWAP, style: styleOfNode(swap), ...surfaceAttrs(swap) },
		swap.strip
			? h(EditableTabs, {
					key: "strip",
					className: "wg-tree-swap-strip",
					tabs: tabsOf(rows),
					archived: archivedOf(rows),
					selected: shown ?? "",
					onChange: apply,
					deleteWarning: VIEW_GONE_FOR_GOOD,
				})
			: null,
		swap.of.map((child, at) =>
			h(
				"div",
				{ className: "wg-tree-swap-held", key: pathKey(child.path), hidden: at !== shownAt },
				nodeElement(child, draw),
			),
		),
	);
}

function nodeElement(node, draw) {
	if (node.kind === "collapsed") return collapsedElement(node, draw);
	if (node.kind === "leaf") return cellElement(node, draw);
	if (node.dir === SWAP) return h(SwapBox, { key: pathKey(node.path), swap: node, draw });
	return node.dir === COLUMN ? columnElement(node, draw) : rowElement(node, draw);
}

function overlayElement(tile, draw) {
	return h(
		"div",
		{ className: "wg-tree-overlay", key: tile.id },
		h(TreeCell, {
			cell: { id: tile.id, path: null, width: 0, height: null },
			tile,
			definition: draw.shared.registry.get(tile.widget),
			shared: draw.shared,
			patchTile: draw.patchTile,
		}),
	);
}

// TRADE-OFF: a gap that moved because a widget's content was measured snaps into place, because motion answers a press and nobody pressed anything
function useSettledCells(rootRef, dragRef, insets) {
	const restingRef = useRef({});
	const measuredRef = useRef(insets);
	useLayoutEffect(() => {
		dragRef.current?.repaint();
		const now = positionsWithin(rootRef.current, ".wg-tree-cell", (node) => node.dataset.cell);
		const moves = measuredRef.current === insets ? movesFrom(restingRef.current, now) : {};
		restingRef.current = now;
		measuredRef.current = insets;
		playMoves(rootRef.current, moves, (root, id) => root.querySelector(`.wg-tree-cell[data-cell="${id}"]`));
	});
}

function useStopOnUnmount(gestureRef) {
	useEffect(
		() => () => {
			gestureRef.current?.stop();
			gestureRef.current = null;
		},
		[],
	);
}

// TRADE-OFF: `drawn` is the carry PREVIEW and is read for geometry only, because the grips measure the tree on screen; every commit goes out as a transform for the writer to apply to the board as it stands
function TreeRegion({ drawn, node, commitLayout, ask, insets, onCarry, overlay, ...rest }) {
	const rootRef = useRef(null);
	const dragRef = useRef(null);
	useStopOnUnmount(dragRef);
	useSettledCells(rootRef, dragRef, insets);

	const draw = {
		...rest,
		grabRatio: (boxPath, at) => (event) =>
			dragUntilDropped(dragRef, event, {
				...ratioRecipe({ drawn, ask, event, boxPath, at }),
				commit: (ratios) => commitLayout((held) => withRatios(held, boxPath, ratios)),
			}),
		grabHeight: (path) => (event) =>
			dragUntilDropped(dragRef, event, heightRecipe({ drawn, ask, event, path, commitLayout })),
	};

	return h(
		"div",
		{
			className: "wg-tree-region-body",
			ref: rootRef,
			onPointerDown: onCarry,
			style: { "--wg-tree-gap": `${GAP_PX}px` },
		},
		overlay.map((tile) => overlayElement(tile, draw)),
		nodeElement(node, draw),
	);
}

const CARRY_THRESHOLD_PX = 5;
const CARRY_EDGE_PX = 56;
const GHOST_TALLEST_PX = 96;
const GHOST_SHORTEST_PX = 44;
const GHOST_WIDEST_PX = 260;
const GHOST_NARROWEST_PX = 150;
const DWELL_MS = 50;
const LANDING_MS = 190;

function scrollerOf(node) {
	for (let at = node; at && at !== document.body; at = at.parentElement) {
		const flow = getComputedStyle(at).overflowY;
		if ((flow === "auto" || flow === "scroll") && at.scrollHeight > at.clientHeight) return at;
	}
	return document.scrollingElement;
}

const spotBox = (node) => {
	const at = node.getBoundingClientRect();
	return { left: at.left, top: at.top, right: at.right, bottom: at.bottom };
};

const standsOnScreen = (spot) => spot.box.right > spot.box.left && spot.box.bottom > spot.box.top;

// TRADE-OFF: the region element is a spot of its own over the same path as the box inside it, so the bare part of a column below its widgets still answers the pointer
function spotsUnder(node, carriedId) {
	const inside = [...node.querySelectorAll("[data-path]")]
		.filter((one) => one.dataset.cell !== carriedId)
		.map((one) => ({
			path: pathFrom(one.dataset.path),
			kind: one.dataset.cell === undefined ? "box" : "leaf",
			dir: one.dataset.dir ?? null,
			box: spotBox(one),
		}))
		.filter(standsOnScreen);
	if (node.dataset.region === undefined) return inside;
	return [
		...inside,
		{
			path: pathFrom(node.dataset.region),
			kind: "box",
			dir: node.querySelector("[data-dir]")?.dataset.dir ?? COLUMN,
			box: spotBox(node),
		},
	];
}

function spotsIn(roots, carriedId) {
	return [...roots].flatMap(([, node]) => spotsUnder(node, carriedId));
}

function rollTowards(scroller, y) {
	if (!scroller) return;
	const edge = scroller.getBoundingClientRect();
	const above = y - edge.top;
	const below = edge.bottom - y;
	if (above < CARRY_EDGE_PX) scroller.scrollTop -= (CARRY_EDGE_PX - above) / 4;
	else if (below < CARRY_EDGE_PX) scroller.scrollTop += (CARRY_EDGE_PX - below) / 4;
}

function ghostBox(carry) {
	return {
		left: `${carry.ghost.left}px`,
		top: `${carry.ghost.top}px`,
		width: `${carry.ghost.across}px`,
		height: `${carry.ghost.down}px`,
		"--wg-ghost-lifted-from": carry.ghost.liftedFrom,
	};
}

function flyGhostHome(page, ghost, carry) {
	if (!page || !ghost) return;
	const home = page.querySelector(`.wg-tree-cell[data-cell="${carry.id}"]`)?.getBoundingClientRect();
	if (!home) return;
	const at = page.getBoundingClientRect();
	ghost.style.transition = `transform ${LANDING_MS}ms cubic-bezier(0.2, 0, 0, 1), opacity ${LANDING_MS}ms linear`;
	ghost.style.transform = `translate(${home.left - at.left - carry.ghost.left}px, ${home.top - at.top - carry.ghost.top}px)`;
	ghost.style.opacity = "0";
}

function ghostFor(box, grabbed) {
	const across = Math.min(Math.max(box.width, GHOST_NARROWEST_PX), GHOST_WIDEST_PX);
	const down = Math.min(Math.max(box.height, GHOST_SHORTEST_PX), GHOST_TALLEST_PX);
	return {
		across,
		down,
		gripAcross: box.width > 0 ? (grabbed.x - box.left) / box.width : 0.5,
		gripDown: box.height > 0 ? (grabbed.y - box.top) / box.height : 0.5,
		liftedFrom: Math.max(box.width / across, box.height / down),
	};
}

const DECLARED_SIZES = { minPx: "stackBelowPx", cap: "tallestPx", shortestPx: "shortestPx", tallestPx: "tallestPx" };

function askOf({ widgetOf, manifestOf, insets }) {
	return (id) => {
		const manifest = manifestOf(id) ?? {};
		const held = Object.entries(DECLARED_SIZES).map(([name, declared]) => [name, manifest[declared] ?? 0]);
		return { ...Object.fromEntries(held), widget: widgetOf(id), role: manifest.role, insets: insets[id] };
	};
}

function aimKeeper(held) {
	let dwelling = 0;
	const rest = () => {
		window.clearTimeout(dwelling);
		dwelling = 0;
	};
	return {
		rest,
		aim: (pointer, isFirst) => {
			const aimed = aimedAt(held.spots(), pointer.clientX, pointer.clientY);
			if (sameTarget(aimed, held.target())) return rest();
			if (isFirst) return held.onTarget(aimed);
			window.clearTimeout(dwelling);
			dwelling = window.setTimeout(() => held.onSettled(aimed), DWELL_MS);
		},
	};
}

function liftedGhost({ box, grabbed, lifted, page }) {
	const ghost = ghostFor(box, grabbed);
	return {
		...ghost,
		left: lifted.x - ghost.gripAcross * ghost.across - page.left,
		top: lifted.y - ghost.gripDown * ghost.down - page.top,
	};
}

function isCarriedFar(from, to) {
	return Math.abs(to.x - from.x) + Math.abs(to.y - from.y) >= CARRY_THRESHOLD_PX;
}

function startCarry({ event, page, regions, carryRef, ghostRef, setCarry, commitLayout }) {
	const node = event.target.closest(".wg-tree-cell");
	const id = node.dataset.cell;
	const grabbed = { x: event.clientX, y: event.clientY };
	const box = node.getBoundingClientRect();
	const scroller = scrollerOf(node);
	const scrolledAt = scroller?.scrollTop ?? 0;
	const carried = { spots: [], target: null, latest: grabbed, lifted: grabbed, frame: 0 };

	const roll = () => {
		carried.frame = window.requestAnimationFrame(roll);
		rollTowards(scroller, carried.latest.y);
	};

	const keeper = aimKeeper({
		spots: () => carried.spots,
		target: () => carried.target,
		onTarget: (aimed) => {
			carried.target = aimed;
		},
		onSettled: (aimed) => {
			carried.target = aimed;
			setCarry((was) => ({ ...was, target: aimed }));
		},
	});

	const paintGhost = () => {
		if (!ghostRef.current) return;
		const rolled = (scroller?.scrollTop ?? 0) - scrolledAt;
		const { latest, lifted } = carried;
		ghostRef.current.style.transform = `translate(${latest.x - lifted.x}px, ${latest.y - lifted.y + rolled}px)`;
	};

	const begin = (pointer) => {
		carried.spots = spotsIn(regions.entries(), id);
		carryRef.current.isStarted = true;
		document.body.classList.add("wg-tree-carrying");
		carried.frame = window.requestAnimationFrame(roll);
		keeper.aim(pointer, true);
		carried.lifted = carried.latest;
		setCarry({
			id,
			target: carried.target,
			height: Math.round(box.height),
			ghost: liftedGhost({ box, grabbed, lifted: carried.lifted, page }),
		});
	};

	const move = (pointer) => {
		carried.latest = { x: pointer.clientX, y: pointer.clientY };
		if (carryRef.current.isStarted) {
			paintGhost();
			keeper.aim(pointer, false);
			return;
		}
		if (isCarriedFar(grabbed, carried.latest)) begin(pointer);
	};

	const gesture = new AbortController();
	const finish = (isKept) => {
		gesture.abort();
		window.cancelAnimationFrame(carried.frame);
		keeper.rest();
		document.body.classList.remove("wg-tree-carrying");
		const wasStarted = carryRef.current?.isStarted;
		carryRef.current = null;
		if (!isKept || !wasStarted || !carried.target) return setCarry(null);
		commitLayout((held) => movedInto(held, id, carried.target));
		setCarry((was) => ({ ...was, isLanding: true }));
	};
	const abandon = () => finish(false);
	const untilDropped = { signal: gesture.signal };

	carryRef.current = { isStarted: false, stop: abandon };
	window.addEventListener("pointermove", move, untilDropped);
	window.addEventListener("pointerup", () => finish(true), untilDropped);
	window.addEventListener("pointercancel", abandon, untilDropped);
	window.addEventListener("keydown", (held) => held.key === "Escape" && abandon(), untilDropped);
}

function ghostElement(carry, named, ghostRef) {
	if (!carry?.ghost) return null;
	return h(
		"div",
		{ className: "wg-tree-ghost", ref: ghostRef, key: "ghost", style: ghostBox(carry) },
		h(
			"div",
			{
				className: "wg-tree-ghost-plate",
				style: { transformOrigin: `${carry.ghost.gripAcross * 100}% ${carry.ghost.gripDown * 100}%` },
			},
			h("b", null, named),
		),
	);
}

function sidebarRecipe({ root, at, toward, event, width, pageRef }) {
	const held = sidebarWidth(root, at);
	const grabbed = event.clientX;
	const node = pageRef.current?.querySelector(`.wg-tree-region[data-region="${at}"]`);
	const wantedAt = (pointer) => held + (pointer.clientX - grabbed) * toward;
	return {
		read: (pointer, give) => widenedBox(root, at, { wantedPx: wantedAt(pointer), width, give }),
		paint: (given) => {
			if (node) node.style.flexBasis = `${given}px`;
		},
	};
}

function useLandingGhost(carry, setCarry, { pageRef, ghostRef }) {
	useLayoutEffect(() => {
		if (!carry?.isLanding) return undefined;
		flyGhostHome(pageRef.current, ghostRef.current, carry);
		const settling = window.setTimeout(() => setCarry(null), LANDING_MS);
		return () => window.clearTimeout(settling);
	}, [carry?.isLanding]);
}

const TREE_PLACE = { x: 0, y: 0, w: 1, h: 1 };
const UNMEASURED_CELL = { width: MIN_SIDEBAR_PX, height: MIN_HEIGHT_PX };

function surfaceOfTile(layout, id, commitLayout, host) {
	const path = pathOfLeaf(layout, id);
	if (!path) return null;
	const node = nodeAt(layout, path);
	const wear = (surface, side) =>
		commitLayout((now) => {
			const { layout: next, refusal } = wornSurfaceAt(now, path, surface, side);
			if (refusal) host?.ui?.notify?.(saidRefusal(refusal));
			return next;
		});
	return {
		now: node?.surface ?? NO_SURFACE,
		side: node?.side ?? null,
		choices: () => surfaceChoicesAt(layout, path),
		wear,
	};
}

function TreeSettings({ session, tile, canvasBox, shared, patchTile, layout, commitLayout, frame }) {
	const definition = shared.registry.get(tile.widget);
	const settingsWindow = useSettingsWindow({
		...frame,
		session,
		definition,
		tile,
		canvasBox,
		onPatch: (patch) => patchTile(tile.id, patch),
		surface: surfaceOfTile(layout, tile.id, commitLayout, frame.host),
		place: { ...TREE_PLACE, id: tile.id },
		widget: treeCellBody({ tile, definition, shared, cell: { width: canvasBox.width }, patchTile }),
	});
	return settingsWindow.dialog;
}

function regionSurfaceAttrs(worn) {
	return worn.surface === NO_SURFACE ? {} : { "data-surface": worn.surface, "data-side": worn.side };
}

const lookOf = (into, side) => (into === DRAWER ? side : into);

function toggleTitle(name, look, isOn) {
	if (name) return (isOn ? HIDE_NAMED : SHOW_NAMED).replace("{name}", name);
	return (isOn ? HIDE_UNNAMED : SHOW_UNNAMED)[look];
}

function boxAction({ openKey, look, name, isOn, press }) {
	return { key: `box:${openKey}`, icon: ICON_OF_LOOK[look], title: toggleTitle(name, look, isOn), isOn, press };
}

function CollapsedPanel({ openKey, look, width, shared, pressAt, children }) {
	const cell = useMemo(() => shared.cellFor(openKey), [shared, openKey]);
	const isOpen = useCellValue(cell) === true;
	useEffect(() => () => void cell.update(false), [cell]);
	return h(
		RegionDrawer,
		{ name: look, isOpen, pressAt: isOpen ? pressAt(openKey) : null, width, onClose: () => cell.update(false) },
		children,
	);
}

function collapsedElement(node, draw) {
	const key = `collapsed-${pathKey(node.path)}`;
	const body = h("div", { className: "wg-collapsed-body" }, nodeElement(node.node, draw));
	if (node.into === HIDE) return h("div", { className: "wg-tree-fold", key, "aria-hidden": "true" }, body);
	const look = lookOf(node.into, node.side);
	const width = overlayWidthOf(node.into, window.innerWidth);
	return h(
		CollapsedPanel,
		{ key, openKey: node.openKey, look, width, shared: draw.shared, pressAt: draw.pressAt },
		body,
	);
}

function edgeGrip(at, toward, chrome) {
	return h(
		"div",
		{ className: "wg-tree-handle is-across is-edge", key: `edge-${at}`, onPointerDown: chrome.grabSidebar(at, toward) },
		h("i", { className: "wg-tree-grip" }),
	);
}

function edgeBetween(before, column, chrome) {
	if (!before) return null;
	if (before.at !== chrome.keep) return edgeGrip(before.at, 1, chrome);
	if (column.at !== chrome.keep) return edgeGrip(column.at, -1, chrome);
	return null;
}

function standingColumns(beside, chrome) {
	return beside.flatMap((column, index) => [
		edgeBetween(beside[index - 1], column, chrome),
		chrome.region(column.at, column.width),
	]);
}

function foldedAside(at, chrome) {
	return h(
		"div",
		{ className: "wg-tree-fold", key: `folded-${at}`, "aria-hidden": "true" },
		chrome.region(at, sidebarWidth(chrome.root, at)),
	);
}

function regionOverlay(at, chrome) {
	const into = regionCollapseOf(chrome.drawn, at);
	if (into === HIDE) return foldedAside(at, chrome);
	const look = lookOf(into, sideOf(chrome.drawn, at));
	const width = overlayWidthOf(into, window.innerWidth);
	return h(
		CollapsedPanel,
		{
			key: `drawer-${at}`,
			openKey: openKeyOf(chrome.drawn.of[at], [at]),
			look,
			width,
			shared: chrome.shared,
			pressAt: chrome.pressAt,
		},
		chrome.region(at, width, true),
	);
}

function triggerPoint(openKey) {
	const tile = openKey.split("/")[0];
	const cell = document.querySelector(`.wg-tree-cell[data-cell="${CSS.escape(tile)}"]`);
	if (!cell) return null;
	const box = cell.getBoundingClientRect();
	return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function floatingAction(at, chrome) {
	const node = chrome.drawn.of[at];
	const into = regionCollapseOf(chrome.drawn, at);
	if (node.trigger || into === HIDE) return null;
	const openKey = openKeyOf(node, [at]);
	return boxAction({
		openKey,
		look: lookOf(into, sideOf(chrome.drawn, at)),
		name: node.name ?? node.purpose,
		isOn: chrome.open.has(openKey),
		press: (point) => chrome.toggleOpen(openKey, point),
	});
}

function dockedAction(at, chrome) {
	const node = chrome.drawn.of[at];
	if (at === chrome.keep || !isAlwaysToggled(node) || node.trigger) return null;
	return boxAction({
		openKey: openKeyOf(node, [at]),
		look: sideOf(chrome.drawn, at),
		name: node.name ?? node.purpose,
		isOn: !isFolded(chrome.root, at),
		press: () => chrome.commitLayout((held) => toggledFold(held, at)),
	});
}

function nestedAction(toggle, chrome) {
	if (toggle.hasTrigger) return null;
	const foldAt = () => chrome.commitLayout((held) => toggledFoldAt(held, toggle.path));
	if (toggle.kind === "box")
		return boxAction({ openKey: toggle.openKey, look: toggle.side, name: toggle.label, isOn: true, press: foldAt });
	if (toggle.isFolded)
		return boxAction({ openKey: toggle.openKey, look: toggle.side, name: toggle.name, isOn: false, press: foldAt });
	if (toggle.into === HIDE) return null;
	return boxAction({
		openKey: toggle.openKey,
		look: lookOf(toggle.into, toggle.side),
		name: toggle.name,
		isOn: chrome.open.has(toggle.openKey),
		press: (point) => chrome.toggleOpen(toggle.openKey, point),
	});
}

function useOpenKeys(keys, cellFor) {
	const [open, setOpen] = useState(() => new Set());
	const joined = keys.join("\n");
	useEffect(() => {
		let isReading = true;
		const cells = keys.map((key) => [key, cellFor(key)]);
		const reread = () =>
			Promise.all(
				cells.map(([key, cell]) => Promise.resolve(cell.get()).then((value) => (value === true ? key : null))),
			).then((held) => {
				if (isReading) setOpen(new Set(held.filter(Boolean)));
			});
		reread();
		const stops = cells.map(([, cell]) => cell.subscribe(reread));
		return () => {
			isReading = false;
			for (const stop of stops) stop();
		};
	}, [joined, cellFor]);
	return open;
}

function useHeaderActions(actions, onActions) {
	useEffect(() => {
		onActions?.(actions);
	});
	useEffect(() => () => onActions?.([]), []);
}

function TreeBoard({
	board,
	width,
	commitLayout,
	commitHolds,
	shared,
	editing,
	settingsId,
	settingsStandInPx,
	onOpenSettings,
	onRemove,
	onAdd,
	patchTile,
	onActions,
}) {
	const { registry } = shared;
	const pageRef = useRef(null);
	const regionsRef = useRef(new Map());
	const carryRef = useRef(null);
	const ghostRef = useRef(null);
	const sidebarRef = useRef(null);
	const [carry, setCarry] = useState(null);
	const pressedRef = useRef(new Map());
	const carrying = carry?.isLanding ? null : carry;
	const root = board.layout;
	const drawn = carrying ? movedInto(root, carrying.id, carrying.target) : root;
	const { beside, floating, hidden, alone } = columnsOf(drawn, width, REGION_GAP_PX);
	const tileOf = (id) => board.tiles.find((tile) => tile.id === id);
	const widgetOf = (id) => tileOf(id)?.widget;
	const manifestOf = (id) => registry.get(widgetOf(id))?.manifest;
	const [insets, setInsets] = useState({});
	useContentInsets(pageRef, setInsets);
	const ask = askOf({ widgetOf, manifestOf, insets });
	const placed = new Set(leavesOf(root).map((leaf) => leaf.id));
	const unplaced = board.tiles.filter((tile) => !placed.has(tile.id));
	const keep = keptAt(drawn);
	// TRADE-OFF: a root with no `keep` child still stands (columnsOf answers `alone`), so the overlay falls to the first region drawn — unmounted it takes every ref its widgets publish with it
	const overlayAt = keep >= 0 ? keep : (alone[0] ?? beside[0]?.at ?? null);
	const regionClass = (at) => (at === keep ? "is-main" : `is-${sideOf(drawn, at)}`);

	useStopOnUnmount(carryRef);
	useLandingGhost(carry, setCarry, { pageRef, ghostRef });
	const everyRegionRef = useRef(new Map());
	useMeasuredSurfaces(pageRef, shared.host, everyRegionRef);

	const carryFrom = (event) => {
		const id = event.target.closest(".wg-tree-cell")?.dataset.cell;
		if (!id || !editing || event.button !== 0 || carryRef.current) return;
		event.preventDefault();
		startCarry({
			event,
			page: pageRef.current.getBoundingClientRect(),
			regions: regionsRef.current,
			carryRef,
			ghostRef,
			setCarry,
			commitLayout,
		});
	};

	const grabSidebar = (at, toward) => (event) => {
		event.preventDefault();
		event.stopPropagation();
		dragUntilDropped(sidebarRef, event, {
			...sidebarRecipe({ root, at, toward, event, width, pageRef }),
			commit: (given) => commitLayout((held) => withWidth(held, [at], given)),
		});
	};

	const holdColumn = (at) => (node) =>
		node && !node.closest(".wg-drawer-over:not(.is-open)")
			? regionsRef.current.set(at, node)
			: regionsRef.current.delete(at);

	const pressAt = (openKey) => pressedRef.current.get(openKey) ?? triggerPoint(openKey);

	const toggleOpen = (openKey, point) => {
		pressedRef.current.set(openKey, point);
		const cell = shared.cellFor(openKey);
		return Promise.resolve(cell.get()).then((isOpen) => cell.update(isOpen !== true));
	};

	const laidCache = new Map();
	const placedOf = (at, given, isFloating) => {
		const key = `${at}:${given}:${isFloating}`;
		if (!laidCache.has(key))
			laidCache.set(key, laidRegion(drawn, at, given, { ask, isFloating, viewportPx: window.innerWidth }));
		return laidCache.get(key);
	};

	const region = (at, given, isFloating = false) => {
		const placed = placedOf(at, given, isFloating);
		return h(
			"div",
			{
				className: `wg-tree-region ${regionClass(at)}`,
				key: at,
				"data-region": at,
				ref: (node) => {
					holdColumn(at)(node);
					if (node) everyRegionRef.current.set(`${at}:${isFloating}`, node);
					else everyRegionRef.current.delete(`${at}:${isFloating}`);
				},
				...regionSurfaceAttrs(placed.worn),
				style: {
					...(at === keep || isFloating ? { flex: "1 1 0", minWidth: 0 } : { flex: `0 0 ${given}px`, minWidth: 0 }),
					...plateVars(placed.plate),
				},
			},
			h(TreeRegion, {
				drawn,
				node: placed.node,
				shared,
				editing,
				settingsId,
				settingsStandInPx,
				onOpenSettings,
				onRemove,
				onAdd,
				patchTile,
				commitLayout,
				commitHolds,
				ask,
				insets,
				tileOf,
				pressAt,
				carry: carrying,
				onCarry: carryFrom,
				overlay: at === overlayAt ? unplaced : [],
			}),
		);
	};

	const standing = [
		...beside.map((column) => placedOf(column.at, column.width, false)),
		...alone.map((at) => placedOf(at, width, false)),
	];
	const toggles = standing.flatMap((placed) => togglesUnder(placed.node));
	const openable = [
		...floating.map((at) => openKeyOf(drawn.of[at], [at])),
		...toggles.filter((toggle) => toggle.kind === "collapsed").map((toggle) => toggle.openKey),
	];
	const open = useOpenKeys(openable, shared.cellFor);
	const chrome = { root, drawn, keep, shared, region, grabSidebar, commitLayout, pressAt, toggleOpen, open };
	const actions = [
		...drawn.of.map((child, at) => (floating.includes(at) ? floatingAction(at, chrome) : dockedAction(at, chrome))),
		...toggles.map((toggle) => nestedAction(toggle, chrome)),
	].filter(Boolean);
	useHeaderActions(actions, onActions);

	return h(
		"div",
		{
			className: "wg-tree-page",
			ref: pageRef,
			style: { "--wg-tree-gap": `${GAP_PX}px`, ...gapVarsOf(1) },
		},
		beside.length > 0
			? h(
					"div",
					{ className: "wg-tree-columns", style: { "--wg-tree-edge-gap": `${REGION_GAP_PX}px` } },
					standingColumns(beside, chrome),
				)
			: null,
		alone.map((at) => region(at, width)),
		floating.map((at) => regionOverlay(at, chrome)),
		hidden.map((at) => foldedAside(at, chrome)),
		ghostElement(carry, manifestOf(carry?.id)?.title ?? carry?.id, ghostRef),
	);
}

function contentWidthOf(element) {
	const style = getComputedStyle(element);
	return element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

function Board({ className, onWidth, children }) {
	const rootRef = useRef(null);

	useEffect(() => {
		const element = rootRef.current;
		if (!element) return;
		// A board that is detached, hidden or still being laid out reports a width of zero or
		// a few pixels. Taking that seriously drew the whole board at a column count the
		// screen never had — and one edit in that moment authored the phantom width for good.
		const watcher = createWidthWatcher({
			minimum: MIN_BOARD_WIDTH_PX,
			onWidth,
			schedule: (task, delay) => window.setTimeout(task, delay),
			cancel: (timer) => window.clearTimeout(timer),
		});
		const observer = new ResizeObserver(([entry]) => watcher.measured(entry.contentRect.width));
		observer.observe(element);
		watcher.measured(contentWidthOf(element));
		return () => {
			observer.disconnect();
			watcher.stop();
		};
	}, []);

	return h("div", { className: className, ref: rootRef }, children);
}

// the expanded board is its own render root: moving the node would make preact
// fight us for it, and any re-render would snap it back into the note
function Page({ boardNode, children }) {
	const pane = boardNode?.closest(PANE_SELECTOR);
	const pageRef = usePageIn(pane);

	useEffect(() => {
		pageRef.current?.draw(children);
	});

	return pane ? null : children;
}

const viewTiles = (tiles, registry) => tiles.filter((tile) => registry.get(tile.widget)?.manifest?.view);

function boardWithHolds(board, path, rows) {
	const layout = withHolds(board.layout, path, rows);
	const kept = new Set(leavesOf(layout).map((leaf) => leaf.id));
	const gone = leavesOf(nodeAt(board.layout, path)).filter((leaf) => !kept.has(leaf.id));
	const dropped = new Set(gone.map((leaf) => leaf.id));
	return { ...board, tiles: board.tiles.filter((tile) => !dropped.has(tile.id)), layout };
}

function firstBoxIn(root) {
	const at = root.of.findIndex(isBox);
	return at < 0 ? null : [at];
}

function seatedBeside(layout, box) {
	const keep = keptAt(layout) >= 0 ? [keptAt(layout)] : firstBoxIn(layout);
	const seated = keep === null ? null : insertedAt(layout, keep, nodeAt(layout, keep).of.length, box);
	if (seated) return seated;
	console.warn(NO_BOX_FOR_THE_VIEWS);
	return layout;
}

// TRADE-OFF: the tile standing first is marked before the others are taken out, because pruning moves every path behind it and the seat has to survive that
function layoutWithSwap(layout, moved, box) {
	const stood = moved.map((tile) => pathOfLeaf(layout, tile.id)).find(Boolean);
	if (!stood) return seatedBeside(layout, box);
	const emptied = moved.reduce((held, tile) => withoutLeaf(held, tile.id), replacedAt(layout, stood, { id: SEAT }));
	const seat = pathOfLeaf(emptied, SEAT);
	return seat ? pruned(replacedAt(emptied, seat, box)) : seatedBeside(emptied, box);
}

const swapsStanding = (layout) =>
	swapBoxes(layout)
		.filter((held) => held.box.id)
		.map((held) => ({ widget: VIEW_GROUP, id: held.box.id }));

function swapOfViews(moved, registry, id) {
	const taken = new Set();
	return {
		dir: SWAP,
		id,
		of: moved.map((tile) => ({ id: tile.id, ratio: 1, name: uniqueName(taken, declaredName(registry, tile.widget)) })),
	};
}

const bornTileId = () => `w${Math.random().toString(36).slice(2, 8)}`;

const NO_BOX_TO_ADD_INTO =
	'Widgetarium: the widget was not added — no box stands at "{path}" on this board any more, so the pick had nowhere to go';

export function WidgetSurface({
	board: saved,
	boardNode,
	registry,
	host,
	editing,
	onChange: save,
	onActions,
	screen,
	initialWidth = 0,
	onWidth,
	onDrafting,
}) {
	const dragRef = useRef(null);
	const latestRef = useRef(null);

	// THE PLAYGROUND IS A DRAFT. A size changed in the settings window used to reach the file at
	// once, so cancelling put the numbers back but the layout it had already re-flowed stayed
	// re-flowed. While the window is up every write lands here instead, and only Done saves it.
	const [staged, setStaged] = useState(null);
	const board = staged ?? saved;
	const onChange = (next, isCommit = true) => (staged === null ? save(next, isCommit) : setStaged(next));

	// seeded from the last measurement of the previous element: Obsidian rebuilds the block
	// after a write, and starting from zero again cost a blank frame every time
	const [width, setWidth] = useState(initialWidth);
	const isPage = board.mode === "expanded";
	const [preview, setPreview] = useState(null);
	const [openedChip, setOpenedChip] = useState(null);
	const [settingsTile, setSettingsTile] = useState(null);
	const [closingTile, setClosingTile] = useState(null);
	const [removingId, setRemovingId] = useState(null);
	const [pickingInto, setPickingInto] = useState(null);
	// CONTEXT: a new number every opening, so the window's own state is fresh without an effect
	const sessionRef = useRef(0);
	// The pointer's own geometry, in STATE rather than written onto the node. Written
	// directly it had two owners: preact only rewrites a style key whose value changed, and
	// while a resize pressed against a limit the snapped size stopped changing — so preact
	// never re-rendered, its record kept the last snapped size, and on release it compared
	// that to itself and wrote nothing. The tile stayed squeezed.
	const [live, setLive] = useState(null);

	// A drag hangs its listeners on window and takes them down in stop(). If the surface is
	// unmounted first — Obsidian rebuilds a block's element often — those listeners outlive
	// it, and the stop they eventually run would commit a board that is two states old over
	// the live one.
	useEffect(
		() => () => {
			const drag = dragRef.current;
			if (!drag) return;
			window.removeEventListener("pointermove", drag.move);
			window.removeEventListener("pointerup", drag.stop);
			dragRef.current = null;
		},
		[],
	);

	// CONTEXT: local to this viewer — two people on one board must filter without moving each other
	const refs = useMemo(() => createGatewayRefs(), []);
	const cellFor = useMemo(() => createViewCells(), []);
	const shells = useMemo(() => createTileShells(), []);
	useEffect(() => {
		shells.keepOnly(board.tiles.map((tile) => tile.id));
	});
	useEffect(() => () => shells.keepOnly([]), [shells]);
	const treeScale = scaleOf(classOf(Math.max(width, MIN_BOARD_WIDTH_PX)));
	const foldRef = useRef(null);
	const shared = useMemo(
		() => ({
			host,
			scale: treeScale,
			refs,
			cellFor,
			shells,
			registry,
			onCollapse: () => {},
			onExpand: () => {},
			patchMounted: () => {},
			isMounted: false,
			foldIntoGroup: () => foldRef.current?.() ?? refuseFold(),
		}),
		[host, treeScale, refs, cellFor, shells, registry],
	);

	useEffect(() => {
		onDrafting?.(staged !== null);
	});

	const boardShell = (children) =>
		h(Board, {
			className: `wg-root wg-board${editing ? " is-editing" : ""}${screen ? " is-screen" : ""}${isPage ? " is-page" : ""}`,
			onWidth: (value) => {
				setWidth(value);
				onWidth?.(value);
			},
			children,
		});

	// Every hook is above this line, so the early return is safe. Nothing below may run on an
	// unmeasured width: measureGrid(0) returns a NEGATIVE cell, and latestRef would then hold
	// a phantom column count for the next commit to author.
	if (width < MIN_BOARD_WIDTH_PX) return isPage ? h(Page, { boardNode }, boardShell(null)) : boardShell(null);

	const boardAsItStands = () => latestRef.current?.board ?? board;

	// TRADE-OFF: a transform answering nothing writes nothing, so a refusal needs no second entrance to the file
	const commitBoard = (change) => {
		const next = change(boardAsItStands());
		if (next) onChange(next, true);
	};

	const commitLayout = (change) => commitBoard((now) => ({ ...now, layout: change(now.layout) }));

	// TRADE-OFF: the rows and the tiles under them move in one write, because a deleted view whose tiles stayed on the board would keep drawing them in the overlay nobody can see
	const commitHolds = (path, rows) => commitBoard((now) => boardWithHolds(now, path, rows));

	const patchTile = (id, patch) => {
		const patched = (tile) => ({ ...tile, ...(typeof patch === "function" ? patch(tile) : patch) });
		commitBoard((now) => ({ ...now, tiles: now.tiles.map((tile) => (tile.id === id ? patched(tile) : tile)) }));
	};

	const bornTile = (now, widgetId) => {
		const id = bornTileId();
		const widget = registry.tileRefOf?.(widgetId) ?? widgetId;
		return { id, tiles: wiredTiles([...now.tiles, { id, widget }], registry, swapsStanding(now.layout)) };
	};

	const catalogue = (onPick) =>
		h(CatalogueDialog, {
			key: "catalogue",
			registry,
			host,
			mode: "place",
			onPick: (widgetId) => {
				onPick(widgetId);
				setPickingInto(null);
			},
			onClose: () => setPickingInto(null),
		});

	const openSettings = (id, canvasBox = null) => {
		sessionRef.current += 1;
		setClosingTile(null);
		setStaged(boardAsItStands());
		setSettingsTile({ id, key: String(sessionRef.current), canvasBox });
	};

	// TRADE-OFF: the panels fade first and the box follows, per the kit's rule on panels that bounce
	const closeSettings = (keep = false) => {
		const held = settingsTile;
		const draft = staged;
		setSettingsTile(null);
		setStaged(null);
		// Done keeps the draft, anything else drops it — and dropping it is the whole point:
		// a layout the person backed out of must not survive in the file.
		if (keep && draft) save(draft, true);
		if (!held) return;
		setClosingTile(held);
		window.setTimeout(() => setClosingTile((current) => (current === held ? null : current)), SETTINGS_FADE_MS);
	};

	// CONTEXT: the resolved folder, so a source falling back to its manifest still counts
	const countReaders = (folderPath) => {
		if (!folderPath) return 0;
		let found = 0;
		const walk = (widget, props) => {
			const declared = registry.get(widget)?.manifest?.props ?? {};
			for (const name of Object.keys(declared)) {
				if ((props?.[name]?.path || declared[name]?.default?.path || "") === folderPath) found += 1;
			}
		};
		const descend = (held) => {
			for (const entry of Object.values(held ?? {})) {
				walk(entry.widget, entry.props);
				descend(entry.mounted);
			}
		};
		for (const tile of board.tiles) {
			walk(tile.widget, tile.props);
			descend(tile.mounted);
		}
		return found;
	};

	const removeTile = (id) =>
		commitBoard((now) => ({
			...now,
			tiles: now.tiles.filter((tile) => tile.id !== id),
			layout: withoutLeaf(now.layout, id),
		}));

	const removalDialog = () =>
		h(ConfirmDialog, {
			key: "removal",
			isOpen: removingId !== null,
			title: "Remove this widget?",
			description: "It leaves the board and its settings go with it.",
			confirmLabel: "Remove",
			onConfirm: () => {
				removeTile(removingId);
				setRemovingId(null);
			},
			onOpenChange: () => setRemovingId(null),
		});

	const foldIntoGroup = () => {
		let folded = false;
		commitBoard((now) => {
			const moved = viewTiles(now.tiles, registry);
			if (moved.length === 0) return null;
			folded = true;
			const layout = layoutWithSwap(now.layout, moved, swapOfViews(moved, registry, bornTileId()));
			return { ...now, tiles: wiredTiles(now.tiles, registry, swapsStanding(layout)), layout };
		});
		if (!folded) console.warn(NO_VIEWS_TO_FOLD);
		return folded;
	};

	foldRef.current = foldIntoGroup;

	const addTileInto = (widgetId, path) =>
		commitBoard((now) => {
			const box = nodeAt(now.layout, path);
			if (!isBox(box)) {
				console.warn(NO_BOX_TO_ADD_INTO.replace("{path}", pathKey(path)));
				return null;
			}
			const { id, tiles } = bornTile(now, widgetId);
			return { ...now, tiles, layout: insertedAt(now.layout, path, box.of.length, { id, ratio: 1 }) };
		});

	latestRef.current = { board };
	const metrics = measureGrid(width);
	const held = settingsTile ?? closingTile;
	const configured = held && board.tiles.find((tile) => tile.id === held.id);
	const canvasBox = held?.canvasBox ?? UNMEASURED_CELL;
	const drawn = boardShell([
		h(TreeBoard, {
			key: "tree",
			board,
			width,
			shared,
			editing,
			settingsId: held?.id ?? null,
			settingsStandInPx: held ? canvasBox.height : 0,
			onOpenSettings: openSettings,
			onRemove: setRemovingId,
			onAdd: setPickingInto,
			patchTile,
			commitLayout,
			commitHolds,
			onActions,
		}),
		configured
			? h(TreeSettings, {
					key: "settings",
					session: `${settingsTile ? "open" : "closing"}:${held.key}`,
					tile: configured,
					canvasBox,
					shared,
					patchTile,
					layout: board.layout,
					commitLayout,
					frame: {
						host,
						registry,
						refs,
						cell: metrics.cell,
						gap: metrics.gap,
						phone: classOf(width).name === "phone",
						columns: metrics.columns,
						countReaders,
						onDone: () => closeSettings(true),
						onDismiss: () => closeSettings(false),
					},
				})
			: null,
		removalDialog(),
		Array.isArray(pickingInto) ? catalogue((widgetId) => addTileInto(widgetId, pickingInto)) : null,
	]);
	return isPage ? h(Page, { boardNode }, drawn) : drawn;
}

function usePageIn(pane) {
	const pageRef = useRef(null);

	useEffect(() => {
		if (!pane) return trace("page stays in the block", { reason: "the board's own node stands in no pane yet" });
		const stood = standPageIn(pane);
		pageRef.current = stood.page;
		return () => {
			stood.leave();
			pageRef.current = null;
		};
	}, [pane]);

	return pageRef;
}

function standPageIn(pane) {
	const wasStatic = getComputedStyle(pane).position === "static";
	if (wasStatic) pane.style.position = "relative";
	const page = mountInto(pane, "wg-page");
	return {
		page,
		leave: () => {
			page.dispose();
			if (wasStatic) pane.style.position = "";
		},
	};
}
