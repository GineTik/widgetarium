import { createElement as h, Component, Fragment } from "react";
import { memo } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { classOf, measureGrid, scaleOf } from "./paths.js";
import { createWidthWatcher } from "./width-gate.js";
import { isTooNarrow, openedBox, wantedBox } from "./chip.js";
import { arrange, clampPlace, FOLDED_COLUMNS, rowsOf, toPixels, toCells, toCellSpan, spanToPixels, hoverScale } from "./layout.js";
import { heldKey, heldTile, mountList, mountPatch, mountRows, placedIds, layoutFor, propConfig, rekeyed, uniqueName } from "./model.js";
import { widgetCatalogue } from "./catalogue-dialog.js";
import { mountInto } from "./portal.js";
import { DrawnInShell } from "./mounted.js";
import { leaseFor } from "./engine/render.js";
import { createTileShells } from "./engine/tile-shells.js";
import { viewHost } from "./engine/view-host.js";
import { NOWHERE } from "./engine/navigator-none.js";
import { trace } from "./trace.js";
import { stableKey } from "./gateway/cache.js";
import { arrayGateway } from "./gateway/create.js";
import { folderGateway, fileGateway } from "./gateway/obsidian.js";
import { createGatewayRefs, createViewCells, narrowedByRefs, pickedGateway, refCollection, refOf, refValue, refsWithin, selectionGateway } from "./gateway/refs.js";
import { bindingOf, hardcodeCollection, hardcodeValue, requestedVerbs, unmetVerbs } from "./gateway/props.js";
import { mappedCollection } from "./gateway/mapped.js";
import { useSettingsWindow } from "./settings-window.js";
import { CatalogueDialog } from "./catalogue-dialog.js";
import { ConfirmDialog } from "./dialog.js";
import { declaredName } from "./registry.js";
import { isUnresolved, wiredTiles } from "./engine/wiring.js";
import { foldLabel } from "./fold-copy.js";
import { Icon, IconButton } from "./kit.js";
import { aimedAt, carriedInto, columnsOf, foldableIn, growsOf, isFolded, isUnder, toggledFold, GAP_PX, innerOf, layTree, REGIONS, REGION_GAP_PX, REGION_PAD_PX, resized, restacked, rowIndexesAfterLeaving, sameTarget, sidebarWidth, tallestOf, widenedRegion, widthsOf, withoutCell, MIN_HEIGHT_PX, MIN_SIDEBAR_PX } from "./tree.js";
import { movesFrom, playMoves, positionsWithin } from "./flip.js";
import { resist } from "./give.js";

const EDIT_LABEL = { on: "Widgetarium: leave edit mode", off: "Widgetarium: enter edit mode" };

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

const REM = 16;
// under this a board is not laid out yet, and its width is not a fact about the screen
const MIN_BOARD_WIDTH_PX = 120;
// CONTEXT: the window must be taller than the widget it frames, or it opens panned
// TRADE-OFF: the panels fade before the box returns, so closing does not read as a snap
const SETTINGS_FADE_MS = 140;

// Corners LAST. They overlap the two side grips they touch, and with one z-index the
// later sibling paints on top — so the corner has to come after the sides it covers.
function initialOf(name) {
	return String(name ?? "?").replace(/^@[\w-]+\//, "").trim().charAt(0).toUpperCase() || "?";
}

const EDGES = ["n", "s", "w", "e", "nw", "ne", "sw", "se"];

class Boundary extends Component {
	state = { failure: null };

	static getDerivedStateFromError(failure) {
		// the message alone names no file; without the stack a crash inside a widget costs a
		// bisect to locate
		console.error("Widgetarium: widget crashed", failure);
		return { failure };
	}

	render() {
		if (!this.state.failure) return this.props.children;
		return h("div", { className: "wg-error" }, [
			h("b", { key: "what" }, "Widget crashed"),
			h("code", { key: "why" }, String(this.state.failure?.message ?? this.state.failure)),
		]);
	}
}

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
export function resolveSlots(manifest, tile, registry, host, foldIntoGroup) {
	const slots = {};
	for (const [name, spec] of Object.entries(manifest.slots ?? {})) {
		const child = registry.get(tile.slots?.[name]?.widget ?? spec.default);
		if (!isDrawable(child)) {
			slots[name] = null;
			continue;
		}
		slots[name] = (given) =>
			h(child.component, {
				...given,
				size: given?.size ?? { w: 1, h: 1, scale: 1 },
				host: viewHost(host),
				here: host.here ?? null,
				navigator: host.navigator ?? NOWHERE,
				foldIntoGroup: foldIntoGroup ?? refuseFold,
			});
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
		patchMounted: (held, heldWas, patch) => patchMounted(name, was, { mounted: rekeyed(child.mounted, held, heldWas, patch) }),
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
		drawInto: drawable ? (element) => drawMounted(element, row.widget, h(MountedWidget, { ...mount, name: row.name, was: row.was, widget: row.widget, definition: held })) : null,
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
	const rows = entries.map((entry) => ({ ref: entry.name, value: { name: entry.name, value: entry.name, widget: entry.id, hidden: entry.hidden } }));
	return arrayGateway(() => rows, {}, `${refOf(tile.id, name)}?${stableKey(rows)}`);
}

export function whereOf(spec, config) {
	return [...(spec?.default?.where ?? []), ...(config?.where ?? [])];
}

function mappingFor(spec, config, shapes, path) {
	const needs = spec.needs ?? {};
	if (Object.keys(needs).length === 0) return null;
	return { needs, chosen: { ...shapes?.readShape(path), ...(config.map ?? {}) } };
}

function typedGateway({ name, spec, tile, config, refs, propsRef, patchProp, requested }) {
	const declared = spec.default ?? {};
	const asRendered = config.value ?? declared.value;
	const held = {
		id: `${tile.id}/${name}?${stableKey(asRendered)}`,
		readValue: () => propConfig({ ...tile, props: propsRef.current }, name, spec).value ?? declared.value,
		mutateValue: (step) => patchProp(name, (inFlight) => ({ value: step(inFlight?.value ?? asRendered) })),
		requested,
		spec,
	};
	if (spec.kind === "value") return hardcodeValue(held);
	return narrowedByRefs(hardcodeCollection(held), whereOf(spec, config), refs);
}

function folderRows({ spec, host, config, refs, path, requested }) {
	const declared = spec.default ?? {};
	const baked = { sort: [...(declared.sort ?? []), ...(config.sort ?? [])] };
	const base = folderGateway({ host, path, baked, requested });
	const mapping = mappingFor(spec, config, host?.shapes, path);
	return narrowedByRefs(mapping ? mappedCollection(base, mapping) : base, whereOf(spec, config), refs);
}

function vaultGateway({ spec, host, config, refs, kind, requested }) {
	const path = config.path || spec.default?.path || "";
	if (kind === "value") return fileGateway({ host, path, requested });
	return folderRows({ spec, host, config, refs, path, requested });
}

function resolveGateway({ name, spec, tile, host, refs, cellFor, propsRef, patchProp }) {
	const config = propConfig(tile, name, spec);
	const { kind, binding } = bindingOf(spec, config);
	const requested = requestedVerbs(spec);
	if (binding === "ref") return kind === "value" ? refValue(refs, config.ref) : refCollection(refs, config.ref);
	if (binding === "memory") return cellFor(refOf(tile.id, name));
	if (binding === "hardcode") return typedGateway({ name, spec, tile, config, refs, propsRef, patchProp, requested });
	return vaultGateway({ spec, host, config, refs, kind, requested });
}

const readingOver = (over, refs) => ({ collection: refCollection(refs, over), watches: (listener) => refs.watch([over], listener) });

const fieldNaming = (spec, gatewayFor) => (spec.fieldFrom ? () => gatewayFor(spec.fieldFrom)?.get() : spec.field ?? null);

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

export function WidgetHost({ definition, tile, place, host, scale, patchProp, refs, cellFor, registry, onCollapse, onExpand, onPatch, patchMounted, isMounted, foldIntoGroup }) {
	const manifest = definition.manifest;

	// CONTEXT: gateways read the tile through this ref, so a refetch sees the write that caused it
	const propsRef = useRef(tile.props);
	propsRef.current = tile.props ?? {};

	const mounts = resolveMounts(manifest, registry, { tile, place, host, scale, refs, cellFor, registry, onCollapse, onExpand, patchMounted, foldIntoGroup });

	const gateways = {};
	const gatewayFor = (name) => gateways[name] ?? null;
	const unmet = [];
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
		gateways[name] = resolveSelection({ name, spec, tile, refs, cellFor, config: tile.props?.[name] ?? {}, gatewayFor });
	}
	for (const [name, spec] of declaredProps) {
		if (!spec.picks) continue;
		gateways[name] = resolvePickedRow({ name, spec, tile, refs, config: propConfig(tile, name, spec), gatewayFor, manifest, propsRef, patchProp });
	}
	for (const [name, spec] of declaredProps) {
		unmet.push(...unmetVerbs(spec, gateways[name]).map((verb) => `${name}.${verb}`));
	}

	for (const [name, gateway] of Object.entries(gateways)) {
		const spec = manifest.props?.[name] ?? manifest.mounts?.[name] ?? {};
		const config = tile.props?.[name] ?? {};
		const leansOn = spec.of
			? [refOf(tile.id, spec.of), ...(spec.fieldFrom ? [refOf(tile.id, spec.fieldFrom)] : []), ...(spec.picks ? [refOf(tile.id, spec.picks)] : [])]
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
			// The VISIBLE truth, not the flag. A sidebar can be one column wide because the
			// layout made it so, without anybody folding it — and then its own button offered
			// to fold it further, which changed nothing anyone could see and read as dead.
			isCollapsed: Boolean(tile.folded) || place.w <= FOLDED_COLUMNS,
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
		slots: resolveSlots(manifest, tile, registry, host, foldOrRefuse),
		mounts,
	};

	// CONTEXT: mount-time match — a required verb nothing here provides is said, not discovered on click
	if (unmet.length > 0) {
		return h("div", { className: "wg-missing" }, [
			h("b", { key: "what" }, "This widget cannot run here"),
			h("span", { key: "why" }, `It needs ${unmet.join(", ")}, which this board does not provide.`),
		]);
	}

	return h(definition.component, props);
}

// the empty grid is real elements, so colour and radius come from tokens rather than
// from numbers baked into a generated image
function cellLayer(columns, rows) {
	const cells = [];
	for (let index = 0; index < columns * rows; index += 1) cells.push(h("i", { key: index }));
	return h("div", { className: "wg-cells", key: "cells" }, cells);
}

// The grip Apple puts on a resizable control is an ARC with round ends, sitting astride the
// widget's own corner: half the stroke outside the box, half in. Only an SVG stroke gives
// round caps, so the shape cannot be a div with a border-radius. One path serves all four
// corners — the flips in CSS carry the centre of curvature to the right place, checked.
const ARC_RADIUS = 30;
const ARC_BOX = 44;
const ARC_FROM_DEGREES = 18;
const ARC_TO_DEGREES = 72;

// derived, not transcribed: a hand-written path silently stops matching the moment one of
// the numbers above is retuned
function arcPath() {
	const centre = ARC_BOX - ARC_RADIUS;
	const at = (degrees) => {
		const radians = (degrees * Math.PI) / 180;
		return [centre + ARC_RADIUS * Math.cos(radians), centre + ARC_RADIUS * Math.sin(radians)];
	};
	const [fromX, fromY] = at(ARC_FROM_DEGREES);
	const [toX, toY] = at(ARC_TO_DEGREES);
	return `M${fromX.toFixed(2)} ${fromY.toFixed(2)} A${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${toX.toFixed(2)} ${toY.toFixed(2)}`;
}

function cornerArc() {
	return h(
		"svg",
		{ className: "wg-grip-arc", viewBox: `0 0 ${ARC_BOX} ${ARC_BOX}`, "aria-hidden": "true" },
		h("path", { d: arcPath(), fill: "none", strokeLinecap: "round", vectorEffect: "non-scaling-stroke" }),
	);
}

const ICON_GEAR = [
	"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
	"M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
];
// a bin, not a cross: removing a widget is a deletion, and the cross reads as "close"
const ICON_TRASH = ["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M10 11v6", "M14 11v6"];

function icon(paths) {
	return h(
		"svg",
		{ className: "wg-icon", viewBox: "0 0 24 24", "aria-hidden": "true" },
		paths.map((d, index) => h("path", { key: index, d, strokeLinecap: "round", strokeLinejoin: "round" })),
	);
}

function widgetPatchers(tile, onPatch) {
	return {
		patchProp: (name, patch) => onPatch((now) => ({ props: { ...(now.props ?? {}), [name]: resolvePatch(now.props?.[name] ?? {}, patch) } })),
		patchMounted: (name, was, patch) => onPatch({ mounted: rekeyed(tile.mounted, name, was, patch) }),
	};
}

function TileView(props) {
	const { definition, tile, place, pixels, live, cell, gap, scale, host, editing, isDragging, onDragStart, onRemove, onPatch, onCollapse, onExpand, onOpen, opened, settings, onOpenSettings, onCloseSettings, onResize, columns, phone, countReaders, board, refs, cellFor, registry, shells, foldIntoGroup } = props;
	const settingsShown = typeof settings === "string";

	// built BEFORE the window that may hold it: the window is a hook and must run on every
	// render, and it cannot be handed a widget declared further down the function
	const { patchProp, patchMounted } = widgetPatchers(tile, onPatch);

	const widget = drawnTile(
		shells,
		tile,
		h(WidgetHost, { definition, tile, place, host, scale, patchProp, patchMounted, refs, cellFor, registry, onCollapse, onExpand, onPatch, foldIntoGroup }),
	);

	const settingsWindow = useSettingsWindow({
		session: settings,
		definition,
		tile,
		place,
		widget,
		cell,
		gap,
		phone,
		host,
		registry,
		columns,
		refs,
		onPatch,
		onDone: () => onCloseSettings(true),
		onDismiss: () => onCloseSettings(false),
		onResize,
		onCollapse: () => onCollapse?.(place.id),
		onExpand: () => onExpand?.(place.id),
		countReaders,
	});

	// While a tile is under the pointer its geometry is the pointer's, not the grid's.
	// Rendering the snapped geometry instead made the tile flicker between the two every
	// time the snap changed: the render wrote the grid position, the next pointer event
	// wrote the cursor position, and the two fought for the frame.
	const shown = live ?? pixels;
	const style = {
		transform: `translate3d(${shown.left}px, ${shown.top}px, 0)`,
		width: `${shown.width}px`,
		height: `${shown.height}px`,
		// the content pulls back to make room for the ring; the chrome is a SIBLING of the
		// content, never a child, so it keeps its own size while the widget shrinks
		"--wg-tile-scale": editing && !settingsShown ? hoverScale(shown, cell) : 1,
	};

	if (!definition || definition.error) {
		return h("div", { className: "wg-tile wg-tile-missing", style }, [
			h("div", { className: "wg-missing", key: "missing" }, [
				h("b", { key: "what" }, definition ? "Widget failed to load" : "Widget not found"),
				h("code", { key: "id" }, tile.widget),
				h(
					"span",
					{ key: "why" },
					definition
						? String(definition.error?.message ?? definition.error)
						: "Settings are kept — restore the widget file and the tile comes back.",
				),
			]),
		]);
	}

	// TOO NARROW TO BE ITSELF. The tile keeps the width it was given — the board never refuses
	// one — and the widget stands aside for a chip. Opening the chip grows it from exactly
	// here, over its neighbours, so the two are visibly the same thing.
	// Shown while EDITING too. Hiding it there drew the full widget spilling out of a tile it
	// does not fit, so the person arranging the board saw one thing and the person reading it
	// saw another — and the arranger could not tell which block was the problem.
	const narrow = !settingsShown && isTooNarrow(shown.width, definition.manifest);
	// THE TILE BECOMES THE WINDOW: the same element, given a bigger box. No scale, because a
	// transformed ancestor re-parents every fixed popover inside the widget and kills the glass.
	// TRADE-OFF: the tile no longer becomes the window — the window is a dialog over the screen,
	// so the tile keeps its place and the board keeps its height
	const grown = !settingsShown && narrow && opened && !editing
		? openedBox(shown, wantedBox(definition.manifest, board), board)
		: null;
	const tileStyle = grown
		? {
				...style,
				transform: `translate3d(${grown.left}px, ${grown.top}px, 0)`,
				width: `${grown.width}px`,
				height: `${grown.height}px`,
		  }
		: style;


	// The chip replaces the CONTENT and nothing else. Returning it in place of the whole tile
	// took the ring, the grips and the chrome with it — the moment a resize made a tile narrow
	// enough to chip, the handles doing the resizing vanished from under the pointer.
	const chip =
		editing || !opened
			? h(
					editing ? "div" : "button",
					{
						className: "wg-narrow",
						title: editing
							? "Too narrow here — this is what a reader sees"
							: `Open ${definition.manifest.title ?? tile.widget}`,
						onClick: editing ? undefined : () => onOpen?.(tile.id),
					},
					[
						h("span", { className: "wg-narrow-mark", key: "mark" }, initialOf(definition.manifest.title ?? tile.widget)),
						h("span", { className: "wg-narrow-open", key: "open" }, "Open"),
					],
			  )
			: widget;


	return h(
		"div",
		{
			className: `wg-tile${editing ? " is-editing" : ""}${isDragging ? " is-dragging" : ""}${narrow ? " wg-tile-chip" : ""}${narrow && opened && !editing ? " is-open" : ""}`,
			style: tileStyle,
			"data-tile": tile.id,
		},
		[
			// while the window holds it, the widget is drawn THERE and not here: two live copies
			// of one widget resolve the same sources twice and both answer a press
			h("div", { className: "wg-tile-body", key: "body" }, settingsShown ? null : narrow ? chip : widget),
			editing && !settingsShown
				? [
						h("div", { className: "wg-tile-ring", key: "ring", onPointerDown: (event) => onDragStart(event, "move") }),
						h("span", { className: "wg-tile-actions", key: "actions" }, [
							h(
								"button",
								{ key: "settings", onClick: () => onOpenSettings?.(tile.id), title: "Settings", "aria-label": "Settings" },
								icon(ICON_GEAR),
							),
							h("button", { key: "remove", onClick: onRemove, title: "Remove", "aria-label": "Remove" }, icon(ICON_TRASH)),
						]),
				  ]
				: null,
			settingsWindow.dialog,
			editing && !settingsShown
				? EDGES.map((edge) =>
						h(
							"div",
							{
								key: edge,
								className: `wg-grip wg-grip-${edge}`,
								onPointerDown: (event) => onDragStart(event, "resize", edge),
							},
							edge.length === 2 ? cornerArc() : null,
						),
				  )
				: null,
		],
	);
}

// The live geometry moved into state, which means the whole board re-renders on every
// pointer move — and with it every widget's own component. Only the tile under the pointer
// actually changes, so the rest compare themselves out. The comparison is on values, not on
// object identity: pixels is built fresh each render and would never match by reference.
const Tile = memo(TileView, (before, after) => {
	if (before.definition !== after.definition || before.tile !== after.tile) return false;
	if (before.editing !== after.editing || before.isDragging !== after.isDragging) return false;
	if (before.scale !== after.scale || before.live !== after.live || before.cell !== after.cell || before.gap !== after.gap) return false;
	if (before.settings !== after.settings || before.columns !== after.columns || before.phone !== after.phone) return false;
	if (before.refs !== after.refs || before.cellFor !== after.cellFor) return false;
	// Whether this tile is the open one is a reason to redraw it. Left out, the chip was set
	// open, the scrim appeared, and the tile itself was skipped — the board dimmed around a
	// chip that never opened.
	if (before.opened !== after.opened) return false;
	if (before.board?.width !== after.board?.width || before.board?.height !== after.board?.height) return false;
	for (const key of ["left", "top", "width", "height"]) {
		if (before.pixels[key] !== after.pixels[key]) return false;
	}
	for (const key of ["x", "y", "w", "h"]) {
		if (before.place[key] !== after.place[key]) return false;
	}
	return true;
});

function tileActions(tileId, onOpenSettings, onRemove) {
	return h("span", { className: "wg-tile-actions", key: "actions", onPointerDown: (event) => event.stopPropagation() }, [
		h(
			"button",
			{ key: "settings", title: "Settings", "aria-label": "Settings", onClick: (event) => onOpenSettings?.(tileId, sizeOfCell(event.currentTarget)) },
			icon(ICON_GEAR),
		),
		h("button", { key: "remove", title: "Remove", "aria-label": "Remove", onClick: () => onRemove?.(tileId) }, icon(ICON_TRASH)),
	]);
}

function sizeOfCell(node) {
	const at = node.closest(".wg-tree-cell")?.getBoundingClientRect();
	return at ? { width: Math.round(at.width), height: Math.round(at.height) } : null;
}

function treeCellBody({ tile, definition, shared, cell, patchTile }) {
	if (!definition) return h("div", { className: "wg-missing" }, h("b", null, "This widget is not installed"));
	const onPatch = (patch) => patchTile(tile.id, patch);
	const place = { id: tile.id, x: 0, y: 0, w: cell.width, h: 1 };
	return drawnTile(shared.shells, tile, h(WidgetHost, { ...shared, ...widgetPatchers(tile, onPatch), definition, tile, place, onPatch }));
}

function TreeCell(props) {
	const { cell, tile, definition, shared, patchTile, standInPx, editing, settingsStandInPx, onOpenSettings, onRemove } = props;
	const style = { flexGrow: cell.grow ?? 1, flexShrink: 1, flexBasis: 0, minWidth: 0, ...(cell.cap ? { maxHeight: `${cell.cap}px` } : {}) };
	if (standInPx) return h("div", { className: "wg-tree-cell is-stand-in", style: { ...style, minHeight: `${standInPx}px` }, "data-cell": cell.id });
	const shownInCell = settingsStandInPx ? h("div", { style: { minHeight: `${settingsStandInPx}px` } }) : treeCellBody({ tile, definition, shared, cell, patchTile });
	return h("div", { className: "wg-tile wg-tree-cell", style, "data-cell": cell.id }, [
		h("div", { className: "wg-tile-body", key: "body" }, shownInCell),
		editing && !settingsStandInPx ? tileActions(tile.id, onOpenSettings, onRemove) : null,
	]);
}

const CELL_SHAPE = ["grow", "width", "cap", "id"];
const CELL_PROPS = ["standInPx", "editing", "settingsStandInPx", "tile", "definition", "shared"];

const Cell = memo(
	TreeCell,
	(before, after) => CELL_SHAPE.every((key) => before.cell[key] === after.cell[key]) && CELL_PROPS.every((key) => before[key] === after[key]),
);

function TreeRegion({ board, rows, width, shared, editing, settingsId, settingsStandInPx, onOpenSettings, onRemove, onAdd, patchTile, commitLayout, region, carry, onCarry, overlay }) {
	const { registry } = shared;
	const rootRef = useRef(null);
	const dragRef = useRef(null);
	const restingRef = useRef({});

	useEffect(
		() => () => {
			dragRef.current?.stop();
			dragRef.current = null;
		},
		[],
	);

	useLayoutEffect(() => {
		dragRef.current?.repaint();
		const now = positionsWithin(rootRef.current, ".wg-tree-cell", (node) => node.dataset.cell);
		const moves = movesFrom(restingRef.current, now);
		restingRef.current = now;
		playMoves(rootRef.current, moves, (root, id) => root.querySelector(`.wg-tree-cell[data-cell="${id}"]`));
	});

	const tileOf = (id) => board.tiles.find((tile) => tile.id === id);
	const floorOf = (id) => registry.get(tileOf(id)?.widget)?.manifest?.stackBelowPx ?? 0;
	const capOf = (id) => registry.get(tileOf(id)?.widget)?.manifest?.tallestPx ?? 0;
	const shortestOf = (id) => registry.get(tileOf(id)?.widget)?.manifest?.shortestPx ?? 0;

	const startDrag = (event, at, read) => {
		event.preventDefault();
		event.stopPropagation();
		const box = event.currentTarget.closest(".wg-tree-band")?.querySelector(".wg-tree-row")?.getBoundingClientRect();
		if (!box) return;
		const rowNow = () => rootRef.current?.querySelector(`.wg-tree-cell[data-cell="${rows[at][0].id}"]`)?.closest(".wg-tree-row") ?? null;
		let latest = null;
		let shown = null;
		const paint = () => {
			const node = rowNow();
			if (!node) return;
			const tall = tallestOf(shown);
			if (tall) node.style.height = `${tall}px`;
			const cells = [...node.querySelectorAll(":scope > .wg-tree-cell")];
			if (cells.length < 2) return;
			const grows = growsOf(shown);
			cells.forEach((cell, index) => {
				cell.style.flexGrow = grows[index];
			});
		};
		const move = (moved) => {
			latest = read(moved, box, event, false);
			shown = read(moved, box, event, true);
			paint();
		};
		const stop = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", stop);
			document.body.classList.remove("wg-tree-dragging");
			dragRef.current = null;
			if (!latest) return;
			shown = latest;
			paint();
			commitLayout(rows.map((row, index) => (index === at ? latest : row)));
		};
		dragRef.current = { stop, repaint: () => shown && paint() };
		document.body.classList.add("wg-tree-dragging");
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", stop);
	};

	const withFloors = (row) => row.map((cell) => ({ ...cell, minPx: floorOf(cell.id) }));
	const withHeights = (row) => row.map((cell) => ({ ...cell, shortestPx: shortestOf(cell.id), tallestPx: capOf(cell.id) }));
	const bare = (row) => row.map(({ minPx, shortestPx, tallestPx, ...cell }) => cell);

	const grabRatio = (at, boundary) => (event) =>
		startDrag(event, at, (moved, box, down, give) => {
			const inner = innerOf(rows[at].length, box.width, GAP_PX);
			const held = widthsOf(rows[at], inner).slice(0, boundary + 1).reduce((sum, one) => sum + one, 0);
			const grabbed = down.clientX - box.left - held;
			return bare(resized(withFloors(rows[at]), boundary, { boundaryPx: moved.clientX - box.left - grabbed, inner, isFree: moved.shiftKey, give }));
		});

	const grabHeight = (at) => (event) => startDrag(event, at, (moved, box, down, give) => bare(restacked(withHeights(rows[at]), box.height + moved.clientY - down.clientY, give)));

	const asked = rows.map((row) => row.filter((cell) => tileOf(cell.id)).map((cell) => ({ ...cell, minPx: floorOf(cell.id), cap: capOf(cell.id) })));
	const standInPx = (id) => (carry?.id === id ? carry.height : 0);
	const bandKey = (row) =>
		row.cells
			.map((cell) => cell.id)
			.filter((id) => id !== carry?.id)
			.join("/") || "carried";

	const rowNode = (row) =>
		h(
			"div",
			{ className: "wg-tree-band", key: bandKey(row), "data-row": row.from },
			h(
				"div",
				{
					className: "wg-tree-row",
					onPointerDown: (event) => onCarry(event, region),
					style: tallestOf(row.cells) ? { height: `${tallestOf(row.cells)}px` } : undefined,
				},
				row.cells.flatMap((cell, index) => [
					index > 0 && row.cells.length > 1
						? h("div", { className: "wg-tree-handle is-across", key: `grip-${cell.id}`, onPointerDown: grabRatio(row.from, index - 1) }, h("i", { className: "wg-tree-grip" }))
						: null,
					h(Cell, {
						key: cell.id,
						cell,
						tile: tileOf(cell.id),
						definition: registry.get(tileOf(cell.id).widget),
						shared,
						patchTile,
						standInPx: standInPx(cell.id),
						editing,
						settingsStandInPx: settingsId === cell.id ? Math.max(settingsStandInPx, 1) : 0,
						onOpenSettings,
						onRemove,
					}),
				]),
			),
			h("div", { className: "wg-tree-handle is-along", onPointerDown: grabHeight(row.from) }, h("i", { className: "wg-tree-grip" })),
		);

	const isEmpty = asked.length === 0;

	const addZone = () =>
		h(
			"button",
			{
				className: `wg-tree-add${isEmpty ? " is-only" : ""}${editing ? "" : " is-quiet"}`,
				key: "add",
				type: "button",
				onClick: () => onAdd(region),
			},
			[h(Icon, { key: "plus", name: "plus", size: 20 }), h("span", { key: "label" }, "Add a widget")],
		);

	return h(
		"div",
		{ className: "wg-tree", ref: rootRef, "data-region": region, style: { "--wg-tree-gap": `${GAP_PX}px` } },
		overlay.map((tile) =>
			h(
				"div",
				{ className: "wg-tree-overlay", key: tile.id },
				h(TreeCell, { cell: { id: tile.id, width: 0, height: null }, tile, definition: registry.get(tile.widget), shared, patchTile }),
			),
		),
		layTree(asked, width, GAP_PX)
			.filter((row) => row.cells.length > 0)
			.map(rowNode),
		editing || isEmpty ? addZone() : null,
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

function restingCells(band, id) {
	return [...band.querySelectorAll(".wg-tree-cell")]
		.filter((cell) => cell.dataset.cell !== id)
		.map((cell) => {
			const at = cell.getBoundingClientRect();
			return { id: cell.dataset.cell, left: at.left, right: at.right };
		});
}

function restingBand(band, id, from) {
	const box = band.getBoundingClientRect();
	const row = band.querySelector(".wg-tree-row").getBoundingClientRect();
	return { from, top: box.top, bottom: box.bottom, rowBottom: row.bottom, cells: restingCells(band, id) };
}

function restingBands(root, id, rows) {
	const renumbered = rowIndexesAfterLeaving(rows, id);
	return [...root.querySelectorAll(".wg-tree-band")]
		.map((band) => restingBand(band, id, renumbered[Number(band.dataset.row)]))
		.filter((band) => Number.isInteger(band.from) && band.cells.length > 0);
}

function restingRegions(roots, id, layout) {
	const resting = new Map();
	for (const [name, root] of roots) resting.set(name, { box: root.getBoundingClientRect(), bands: restingBands(root, id, layout[name]?.rows ?? []) });
	return resting;
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

const TREE_PLACE = { x: 0, y: 0, w: 1, h: 1 };
const UNMEASURED_CELL = { width: MIN_SIDEBAR_PX, height: MIN_HEIGHT_PX };

function TreeSettings({ session, tile, canvasBox, shared, patchTile, frame }) {
	const definition = shared.registry.get(tile.widget);
	const settingsWindow = useSettingsWindow({
		...frame,
		session,
		definition,
		tile,
		canvasBox,
		onPatch: (patch) => patchTile(tile.id, patch),
		place: { ...TREE_PLACE, id: tile.id },
		widget: treeCellBody({ tile, definition, shared, cell: { width: canvasBox.width }, patchTile }),
	});
	return settingsWindow.dialog;
}

function TreeBoard({ board, width, commitLayout: commitBoardLayout, shared, editing, onToggleEditing, settingsId, settingsStandInPx, onOpenSettings, onRemove, onAdd, patchTile }) {
	const passed = { shared, editing, settingsId, settingsStandInPx, onOpenSettings, onRemove, onAdd, patchTile };
	const pageRef = useRef(null);
	const regionsRef = useRef(new Map());
	const carryRef = useRef(null);
	const ghostRef = useRef(null);
	const [carry, setCarry] = useState(null);
	const carrying = carry?.isLanding ? null : carry;
	const drawn = carrying ? carriedInto(board.layout, carrying) : board.layout;
	const { beside, stacked } = columnsOf(drawn, width, REGION_GAP_PX);
	const placed = new Set(REGIONS.flatMap((name) => (board.layout?.[name]?.rows ?? []).flat().map((cell) => cell.id)));
	const unplaced = board.tiles.filter((tile) => !placed.has(tile.id));

	useEffect(
		() => () => {
			carryRef.current?.stop();
			carryRef.current = null;
		},
		[],
	);

	useLayoutEffect(() => {
		if (!carry?.isLanding) return undefined;
		flyGhostHome(pageRef.current, ghostRef.current, carry);
		const settling = window.setTimeout(() => setCarry(null), LANDING_MS);
		return () => window.clearTimeout(settling);
	}, [carry?.isLanding]);

	const carryFrom = (event, from) => {
		const node = event.target.closest(".wg-tree-cell");
		const id = node?.dataset.cell;
		if (!id || !editing || event.button !== 0 || carryRef.current) return;
		event.preventDefault();
		const grabbed = { x: event.clientX, y: event.clientY };
		const page = pageRef.current.getBoundingClientRect();
		const box = node.getBoundingClientRect();
		const scroller = scrollerOf(node);
		const scrolledAt = scroller?.scrollTop ?? 0;
		let resting = new Map();
		let target = null;
		let to = from;
		let latest = grabbed;
		let lifted = grabbed;
		let frame = 0;
		let dwelling = 0;

		const roll = () => {
			frame = window.requestAnimationFrame(roll);
			rollTowards(scroller, latest.y);
		};

		const aimFor = (pointer, isFirst) => {
			const over = [...resting.entries()].find(([, one]) => isUnder(one.box, pointer));
			const name = over ? over[0] : to;
			const aimed = aimedAt(resting.get(name).bands, pointer.clientX, pointer.clientY);
			if (name === to && sameTarget(aimed, target)) {
				window.clearTimeout(dwelling);
				dwelling = 0;
				return false;
			}
			if (isFirst) {
				to = name;
				target = aimed;
				return true;
			}
			window.clearTimeout(dwelling);
			dwelling = window.setTimeout(() => {
				to = name;
				target = aimed;
				setCarry((was) => ({ ...was, to, target }));
			}, DWELL_MS);
			return false;
		};

		const paintGhost = () => {
			if (!ghostRef.current) return;
			const rolled = (scroller?.scrollTop ?? 0) - scrolledAt;
			ghostRef.current.style.transform = `translate(${latest.x - lifted.x}px, ${latest.y - lifted.y + rolled}px)`;
		};

		const begin = (pointer) => {
			resting = restingRegions(regionsRef.current.entries(), id, board.layout);
			carryRef.current.isStarted = true;
			document.body.classList.add("wg-tree-carrying");
			frame = window.requestAnimationFrame(roll);
			aimFor(pointer, true);
			const ghost = ghostFor(box, grabbed);
			lifted = latest;
			setCarry({
				id,
				from,
				to,
				target,
				height: Math.round(box.height),
				ghost: { ...ghost, left: lifted.x - ghost.gripAcross * ghost.across - page.left, top: lifted.y - ghost.gripDown * ghost.down - page.top },
			});
		};

		const move = (pointer) => {
			latest = { x: pointer.clientX, y: pointer.clientY };
			if (carryRef.current.isStarted) {
				paintGhost();
				aimFor(pointer, false);
				return;
			}
			if (Math.abs(latest.x - grabbed.x) + Math.abs(latest.y - grabbed.y) < CARRY_THRESHOLD_PX) return;
			begin(pointer);
		};

		const gesture = new AbortController();
		const finish = (isKept) => {
			gesture.abort();
			window.cancelAnimationFrame(frame);
			window.clearTimeout(dwelling);
			document.body.classList.remove("wg-tree-carrying");
			const wasStarted = carryRef.current?.isStarted;
			carryRef.current = null;
			if (!isKept || !wasStarted || !target) return setCarry(null);
			commitBoardLayout(carriedInto(board.layout, { id, from, to, target }));
			setCarry((was) => ({ ...was, isLanding: true }));
		};
		const abandon = () => finish(false);
		const untilDropped = { signal: gesture.signal };

		carryRef.current = { isStarted: false, stop: abandon };
		window.addEventListener("pointermove", move, untilDropped);
		window.addEventListener("pointerup", () => finish(true), untilDropped);
		window.addEventListener("pointercancel", abandon, untilDropped);
		window.addEventListener("keydown", (event) => event.key === "Escape" && abandon(), untilDropped);
	};

	const ghost = () => {
		if (!carry?.ghost) return null;
		const tile = board.tiles.find((one) => one.id === carry.id);
		const named = shared.registry.get(tile?.widget)?.manifest?.title ?? carry.id;
		return h(
			"div",
			{ className: "wg-tree-ghost", ref: ghostRef, key: "ghost", style: ghostBox(carry) },
			h("div", { className: "wg-tree-ghost-plate", style: { transformOrigin: `${carry.ghost.gripAcross * 100}% ${carry.ghost.gripDown * 100}%` } }, h("b", null, named)),
		);
	};

	const grabSidebar = (name, toward) => (event) => {
		event.preventDefault();
		event.stopPropagation();
		const held = sidebarWidth(board.layout, name);
		const grabbed = event.clientX;
		const node = pageRef.current?.querySelector(`.wg-tree-region.is-${name}`);
		let latest = held;
		const paint = (given) => {
			if (node) node.style.flexBasis = `${given}px`;
		};
		const move = (pointer) => {
			const wanted = held + (pointer.clientX - grabbed) * toward;
			latest = widenedRegion(board.layout, name, wanted, width, REGION_GAP_PX, false);
			paint(widenedRegion(board.layout, name, wanted, width, REGION_GAP_PX, true));
		};
		const stop = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", stop);
			document.body.classList.remove("wg-tree-dragging");
			paint(latest);
			commitBoardLayout({ ...board.layout, [name]: { ...board.layout[name], width: latest } });
		};
		document.body.classList.add("wg-tree-dragging");
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", stop);
	};

	const holdColumn = (name) => (node) => (node ? regionsRef.current.set(name, node) : regionsRef.current.delete(name));

	const region = (name, given) =>
		h(
			"div",
			{
				className: `wg-tree-region is-${name}`,
				key: name,
				ref: holdColumn(name),
				style: name === "main" ? { flex: "1 1 0", minWidth: 0 } : { flex: `0 0 ${given}px`, minWidth: 0 },
			},
			h(TreeRegion, {
				...passed,
				board,
				region: name,
				carry: carrying,
				onCarry: carryFrom,
				overlay: name === "main" ? unplaced : [],
				rows: drawn[name].rows,
				width: given - REGION_PAD_PX * 2,
				commitLayout: (rows) => commitBoardLayout({ ...board.layout, [name]: { ...board.layout[name], rows } }),
			}),
		);

	const edge = (name, toward) =>
		h("div", { className: "wg-tree-handle is-across is-edge", key: `edge-${name}`, onPointerDown: grabSidebar(name, toward) }, h("i", { className: "wg-tree-grip" }));

	const toggle = (name) =>
		h(
			IconButton,
			{
				variant: "raised",
				size: "m",
				className: `wg-region-toggle is-${name}`,
				key: `toggle-${name}`,
				label: foldLabel(name, isFolded(board.layout, name)),
				"aria-pressed": String(!isFolded(board.layout, name)),
				onPointerDown: (event) => event.stopPropagation(),
				onClick: () => commitBoardLayout(toggledFold(board.layout, name)),
			},
			h(Icon, { name: `sidebar-${name}`, size: 20 }),
		);

	const editToggle = () =>
		h(
			IconButton,
			{
				variant: editing ? "accent" : "raised",
				size: "m",
				className: "wg-region-toggle is-edit",
				key: "toggle-editing",
				label: editing ? EDIT_LABEL.on : EDIT_LABEL.off,
				"aria-pressed": String(editing),
				onPointerDown: (event) => event.stopPropagation(),
				onClick: () => onToggleEditing?.(),
			},
			h(Icon, { name: "pencil", size: 20 }),
		);

	const foldable = foldableIn(drawn);

	const foldedAway = foldable.filter((name) => isFolded(board.layout, name));

	const standing = beside.flatMap((column, at) => {
		const before = beside[at - 1];
		const between = before && before.name !== "main" ? edge(before.name, 1) : before && column.name !== "main" ? edge(column.name, -1) : null;
		return [between, region(column.name, column.width)];
	});

	return h(
		"div",
		{ className: "wg-tree-page", ref: pageRef, style: { "--wg-tree-gap": `${GAP_PX}px` } },
		h(
			"div",
			{ className: "wg-region-bar" },
			foldable.includes("left") ? toggle("left") : null,
			editToggle(),
			h("span", { className: "wg-region-bar-gap" }),
			foldable.includes("right") ? toggle("right") : null,
		),
		beside.length > 0 ? h("div", { className: "wg-tree-columns", style: { "--wg-tree-edge-gap": `${REGION_GAP_PX}px` } }, standing) : null,
		stacked.map((name) => region(name, width)),
		foldedAway.map((name) => h("div", { className: "wg-tree-fold", key: `folded-${name}`, "aria-hidden": "true" }, region(name, sidebarWidth(board.layout, name)))),
		ghost(),
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
function Page({ onClose, children }) {
	const pageRef = useRef(null);

	useEffect(() => {
		const anchor = document.querySelector(".workspace-leaf.mod-active .view-content") ?? document.body;
		const wasStatic = getComputedStyle(anchor).position === "static";
		if (wasStatic) anchor.style.position = "relative";
		pageRef.current = mountInto(anchor, "wg-page", onClose);
		return () => {
			pageRef.current?.dispose();
			if (wasStatic) anchor.style.position = "";
		};
	}, []);

	useEffect(() => {
		pageRef.current?.draw(children);
	});

	return null;
}

export function WidgetSurface({ board: saved, registry, host, editing, onChange: save, onToggleEditing, screen, initialWidth = 0, onWidth, onDrafting }) {
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
	// The mode is written in the block, so it survives every re-render the editor causes —
	// and a page opens in the state it was left in.
	const isPage = board.mode === "expanded";
	const toggleExpanded = () => onChange({ ...board, mode: isPage ? "collapsed" : "expanded" }, true);
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
			foldIntoGroup: refuseFold,
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
	if (width < MIN_BOARD_WIDTH_PX) return isPage ? h(Page, { onClose: () => toggleExpanded() }, boardShell(null)) : boardShell(null);

	const patchTile = (id, patch) => {
		const boardAsItStands = latestRef.current?.board ?? board;
		const patched = (tile) => ({ ...tile, ...(typeof patch === "function" ? patch(tile) : patch) });
		onChange({ ...boardAsItStands, tiles: boardAsItStands.tiles.map((tile) => (tile.id === id ? patched(tile) : tile)) }, true);
	};

	const commitLayout = (layout) => onChange({ ...(latestRef.current?.board ?? board), layout }, true);

	const bornTile = (held, widgetId) => {
		const id = `w${Math.random().toString(36).slice(2, 8)}`;
		return { id, tiles: wiredTiles([...held, { id, widget: widgetId }], registry) };
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

	const palette = (onPick, chips = []) =>
		editing
			? h("div", { className: "wg-palette", key: "palette" }, [
					h("button", { className: "wg-chip wg-palette-open", key: "add", onClick: () => setPickingInto("grid") }, "Add widget"),
					...chips,
					pickingInto === "grid" ? catalogue(onPick) : null,
			  ])
			: null;

	const openSettings = (id, canvasBox = null) => {
		sessionRef.current += 1;
		setClosingTile(null);
		// CONTEXT: the draft starts as what is saved, so the window opens on the board as it stands
		setStaged(latestRef.current?.board ?? board);
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

	// Removing a tile removes the TILE, not its place at this one width. Dropping only the
	// place left it in board.tiles, so the next width derived it back and a widget deleted in
	// the collapsed board reappeared expanded.
	const removeTile = (id) => {
		const now = latestRef.current?.board ?? board;
		const layouts = {};
		for (const [columns, layout] of Object.entries(now.layouts)) {
			layouts[columns] = layout.filter((place) => place.id !== id);
		}
		const next = { ...now, tiles: now.tiles.filter((tile) => tile.id !== id), layouts };
		if (now.layout) {
			next.layout = Object.fromEntries(Object.entries(now.layout).map(([name, held]) => [name, { ...held, rows: withoutCell(held.rows, id) }]));
		}
		onChange(next, true);
	};

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

	if (board.layout) {
		const addTreeTile = (widgetId, region) => {
			const now = latestRef.current?.board ?? board;
			const { id, tiles } = bornTile(now.tiles, widgetId);
			onChange(
				{
					...now,
					tiles,
					layout: { ...now.layout, [region]: { ...now.layout[region], rows: [...now.layout[region].rows, [{ id, ratio: 1 }]] } },
				},
				true,
			);
		};
		latestRef.current = { board };
		const treeMetrics = measureGrid(width);
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
				onToggleEditing,
				settingsId: held?.id ?? null,
				settingsStandInPx: held ? canvasBox.height : 0,
				onOpenSettings: openSettings,
				onRemove: setRemovingId,
				onAdd: setPickingInto,
				patchTile,
				commitLayout,
			}),
			configured
				? h(TreeSettings, {
						key: "settings",
						session: `${settingsTile ? "open" : "closing"}:${held.key}`,
						tile: configured,
						canvasBox,
						shared,
						patchTile,
						frame: {
							host,
							registry,
							refs,
							cell: treeMetrics.cell,
							gap: treeMetrics.gap,
							phone: classOf(width).name === "phone",
							columns: treeMetrics.columns,
							countReaders,
							onDone: () => closeSettings(true),
							onDismiss: () => closeSettings(false),
						},
				  })
				: null,
			removalDialog(),
			REGIONS.includes(pickingInto) ? catalogue((widgetId) => addTreeTile(widgetId, pickingInto)) : null,
		]);
		return isPage ? h(Page, { onClose: () => toggleExpanded() }, drawn) : drawn;
	}

	// the class no longer picks a layout — the column count does. It survives only to say
	// how far the screen sits from the eye, which is what the type scale is for.
	const active = classOf(width);

	const metrics = measureGrid(width);
	// Diagnostics for a bug that has outlived three fixes: every width change and every
	// commit is printed, so a report can be read instead of guessed at. Switched by
	// localStorage.setItem("widgetarium-trace", "1") in the console.
	if (latestRef.current?.columns !== metrics.columns) {
		trace("columns", { width: Math.round(width), from: latestRef.current?.columns ?? null, to: metrics.columns });
	}

	// What a widget declares, and all of it: where a new tile is born, and whether it grows
	// into free space. A folded tile answers "keep" whatever its manifest says — that is what
	// folded MEANS, and it is why the sidebar used to spring open on the next resize.
	const manifestOf = (id) => registry.get(board.tiles.find((tile) => tile.id === id)?.widget)?.manifest;
	const declaredBy = (id) => {
		const manifest = manifestOf(id);
		const folded = board.tiles.find((tile) => tile.id === id)?.folded;
		return {
			defaultSize: manifest?.defaultSize,
			growth: folded ? "keep" : (manifest?.growth ?? "fill"),
		};
	};
	const { places, isAuthored } = layoutFor(board, metrics.columns, declaredBy);
	// WHAT YOU SEE WHILE DRAGGING IS WHAT YOU GET. The preview ran packPlaces alone while the
	// commit ran the fitting law, so a neighbour dropped to the next row for the whole length
	// of the drag and jumped back into place on release. The two must be the same arithmetic.
	const shown = preview
		? arrange([...places.filter((place) => place.id !== preview.id), preview], metrics.columns, { movedId: preview.id, moving: dragRef.current?.mode === "move" })
		: places;
	const rows = rowsOf(shown);
	// the settings window is a DIALOG over the screen now, so it no longer stretches the board
	// to hold itself — which is what used to push the note's own scrollbar in behind it
	const boardRows = Math.max(1, rows);
	const boardBox = { width: metrics.boardWidth, height: boardRows * (metrics.cell + metrics.gap) };

	// editing a derived width authors it: the file gains an entry only once something moved
	// A drag registers its handlers once and they live until the pointer is released, so
	// everything they close over is frozen at the moment of the press. The board width can
	// change under a drag — a taller layout brings the note's scrollbar in, which takes a
	// column away — and the commit then landed on a column count that was no longer the one
	// on screen. That width became authored with the wrong places, the live width derived
	// from it, and the board walked itself down a size at a time.
	latestRef.current = { board, columns: metrics.columns, places };

	const samePlaces = (left, right) =>
		left.length === right.length &&
		left.every((place, index) => {
			const other = right[index];
			return (
				place.id === other.id &&
				place.x === other.x &&
				place.y === other.y &&
				place.w === other.w &&
				place.h === other.h &&
				place.wasW === other.wasW
			);
		});

	const commit = (nextPlaces, isCommit = true) => {
		const now = latestRef.current;
		// A commit that changes nothing must not write. It used to: a width change re-derived
		// the same layout, wrote the file, Obsidian re-rendered the block, the fresh element
		// measured a slightly different width because the scrollbar came and went — and the
		// board wrote itself in a loop the user saw as the whole panel shaking.
		if (samePlaces(now.places, nextPlaces)) {
			trace("commit skipped", { columns: now.columns, reason: "nothing moved" });
			return;
		}

		trace("commit", {
			columns: now.columns,
			wasAuthored: Boolean(now.board.layouts[now.columns]),
			authoredBefore: Object.keys(now.board.layouts).join(","),
			places: nextPlaces.map((place) => `${place.id} ${place.x},${place.y} ${place.w}x${place.h}`).join(" | "),
		});
		onChange({ ...now.board, layouts: { ...now.board.layouts, [now.columns]: nextPlaces } }, isCommit);
	};


	// CONTEXT: `view` in a manifest is a widget declaring itself a nameable view
	const viewTiles = (tiles) => tiles.filter((tile) => registry.get(tile.widget)?.manifest?.view);

	// TRADE-OFF: the board folds it, not the widget — only the board can move a tile INTO a holder
	const addHolder = () => {
		const holder = registry.list().find((entry) => Object.keys(entry.manifest?.mounts ?? {}).length > 0);
		if (!holder) {
			console.warn("Widgetarium: no installed widget holds views");
			return false;
		}
		const now = latestRef.current;
		const [mountName, spec] = Object.entries(holder.manifest.mounts)[0];
		const moved = viewTiles(now.board.tiles);
		const taken = new Set();
		const held = moved.map((tile) => ({ name: uniqueName(taken, declaredName(registry, tile.widget)), widget: tile.widget, tile }));
		// CONTEXT: a holder of one view switches nothing, so its declared default fills the rest
		const owned = new Set(moved.map((tile) => tile.widget));
		const spare = mountRows(spec?.default ?? [], (id) => declaredName(registry, id)).filter((row) => !owned.has(row.widget));
		const rows = [
			...held.map((row) => ({ name: row.name, widget: row.widget })),
			...spare.map((row) => ({ name: uniqueName(taken, row.name), widget: row.widget })),
		];
		const mounted = {};
		for (const row of held) {
			mounted[row.name] = { widget: row.widget, settings: row.tile.settings, mounts: row.tile.mounts, props: row.tile.props, slots: row.tile.slots, mounted: row.tile.mounted };
		}
		const id = `w${Math.random().toString(36).slice(2, 8)}`;
		const gone = new Set(moved.map((tile) => tile.id));
		const born = holder.manifest.defaultSize ?? { w: 3, h: 2 };
		// CONTEXT: the holder stands where the tile it swallowed stood, at every authored width
		const stand = (places) => {
			const stood = places.find((place) => gone.has(place.id));
			const rest = places.filter((place) => !gone.has(place.id));
			return [...rest, stood ? { ...stood, id } : { id, x: 0, y: rowsOf(rest), w: born.w, h: born.h }];
		};
		const layouts = {};
		for (const [columns, places] of Object.entries(now.board.layouts)) layouts[columns] = stand(places);
		layouts[now.columns] = stand(now.places);
		onChange(
			{
				...now.board,
				tiles: wiredTiles(
					[
						...now.board.tiles.filter((tile) => !gone.has(tile.id)),
						{ id, widget: holder.manifest.id, mounts: { [mountName]: rows }, mounted },
					],
					registry,
				),
				layouts,
			},
			true,
		);
		return true;
	};

	const foldIntoGroup = () => addHolder();

	// The size on the board is a PLACE, so the settings window asks the board to write it.
	const resizeTile = (id, patch) => {
		const now = latestRef.current;
		const before = now.places.find((place) => place.id === id);
		if (!before) return;
		const manifest = manifestOf(id);
		const after = clampPlace({ ...before, ...patch }, now.columns, manifest?.minSize, manifest?.maxSize);
		commit(arrange(now.places.map((place) => (place.id === id ? after : place)), now.columns, { movedId: id }));
	};

	// The board folds the intent: one writer for a place, and the width it came from is kept
	// on that place so reopening cannot guess.
	// Folding is the PROGRAM taking the space, so the row it emptied is re-laid — see
	// autofillFreedSpan. A drag is a person taking it, and a person's gap is left alone.
	// Folding is the PROGRAM taking the space, so the row it emptied is re-laid — see
	// autofillFreedSpan. A drag is a person taking it, and a person's gap is left alone.
	//
	// The FLAG lives on the tile and the WIDTH lives on the place, and that split is the point:
	// folded is one fact about the widget, while how wide it was is a fact about this screen.
	const foldTile = (id, folded) => {
		const now = latestRef.current;
		const before = now.places.find((place) => place.id === id);
		if (!before) return;
		// Unfolding goes back to the width it was folded from — and when it was never folded,
		// to the width the widget says it wants. Restoring `before.w` gave a one-column tile
		// one column back, which is why the button looked dead.
		const born = manifestOf(id)?.defaultSize?.w ?? 4;
		const after = folded
			? { ...before, w: FOLDED_COLUMNS, wasW: before.w > FOLDED_COLUMNS ? before.w : born }
			: { ...before, w: Math.max(before.wasW ?? born, FOLDED_COLUMNS + 1), wasW: undefined };
		const moved = now.places.map((place) => (place.id === id ? after : place));
		onChange(
			{
				...now.board,
				tiles: now.board.tiles.map((tile) => (tile.id === id ? { ...tile, folded } : tile)),
				layouts: { ...now.board.layouts, [now.columns]: arrange(moved, now.columns, { movedId: id, freed: { from: before, to: after } }) },
			},
			true,
		);
	};

	const collapseTile = (id) => foldTile(id, true);
	const expandTile = (id) => foldTile(id, false);

	const addTile = (widgetId) => {
		const born = registry.get(widgetId)?.manifest?.defaultSize ?? { w: 3, h: 2 };
		// The catalogue stays open while a person reads it, and the board can move underneath —
		// a pick written from the render that opened it would put the board back as it was then.
		// Every other writer here already reads the latest; this one did not.
		const now = latestRef.current;
		const { id, tiles } = bornTile(now.board.tiles, widgetId);
		onChange(
			{
				// CONTEXT: a board carries more than tiles — rebuilt, it loses its mode and its
				// property list, and that list is what the filter bar and the task dialog read
				...now.board,
				tiles,
				layouts: {
					...now.board.layouts,
					[now.columns]: [...now.places, { id, x: 0, y: rowsOf(now.places), w: born.w, h: born.h }],
				},
			},
			true,
		);
	};

	const startDrag = (event, mode, place, edge = "se") => {
		if (!editing) return;
		event.preventDefault();
		const element = event.currentTarget.closest(".wg-tile");
		// A drag is bounded by the BOARD and nothing else: a person dragging a tile narrower
		// than a widget likes is allowed to, and the widget answers with a compact design or
		// a chip. Refusing the drag was the same wall by another name.
		dragRef.current = { id: place.id, mode, edge, startX: event.clientX, startY: event.clientY, place, element };
		setPreview(place);

		const settle = (geometry, next) => {
			const drag = dragRef.current;
			setLive({ id: drag.id, ...geometry });

			const bounds = manifestOf(drag.id);
			const clamped = clampPlace(next, metrics.columns, bounds?.minSize, bounds?.maxSize);
			setPreview((current) =>
				current && current.x === clamped.x && current.y === clamped.y && current.w === clamped.w && current.h === clamped.h
					? current
					: clamped,
			);
			return clamped;
		};

		const moveBy = (dx, dy) => {
			const drag = dragRef.current;
			const base = toPixels(drag.place, metrics.cell, metrics.gap);
			settle(
				{ ...base, left: base.left + dx, top: base.top + dy },
				{ ...drag.place, ...toCells(base.left + dx, base.top + dy, metrics.cell, metrics.gap) },
			);
		};

		const resizeBy = (dx, dy) => {
			const drag = dragRef.current;
			const base = toPixels(drag.place, metrics.cell, metrics.gap);
			// which sides the grip holds. A grip on the left or the top moves the corner it is
			// NOT holding, so the opposite edge stays put and the box grows towards the pointer.
			const holdsLeft = drag.edge.includes("w");
			const holdsTop = drag.edge.includes("n");
			const acrossX = holdsLeft || drag.edge.includes("e");
			const acrossY = holdsTop || drag.edge.includes("s");
			// The handle stops where the widget stops. Letting the box shrink past the
			// manifest's minimum detached the pointer from the handle: the cursor ended up in
			// the middle of the widget, and pulling back out did nothing until it had retraced
			// all that dead travel. Clamped here, the box answers the moment the pointer comes
			// back to the handle.
			// CONTEXT: a control that cannot use height says so with maxSize; the handle stops there
			const smallest = manifestOf(drag.id)?.minSize;
			const largest = manifestOf(drag.id)?.maxSize;
			const widest = Math.min(largest?.w ?? metrics.columns, metrics.columns);
			const minWidth = spanToPixels(smallest?.w ?? 1, metrics.cell, metrics.gap);
			const maxWidth = spanToPixels(widest, metrics.cell, metrics.gap);
			const minHeight = spanToPixels(smallest?.h ?? 1, metrics.cell, metrics.gap);
			const maxHeight = largest?.h ? spanToPixels(largest.h, metrics.cell, metrics.gap) : Infinity;

			const wantedWidth = !acrossX ? base.width : holdsLeft ? base.width - dx : base.width + dx;
			const wantedHeight = !acrossY ? base.height : holdsTop ? base.height - dy : base.height + dy;
			const width = resist(wantedWidth, minWidth, maxWidth);
			const height = resist(wantedHeight, minHeight, maxHeight);
			const left = holdsLeft ? base.left + (base.width - width) : base.left;
			const top = holdsTop ? base.top + (base.height - height) : base.top;

			const clamped = settle({ ...base, left, top, width, height }, {
				...drag.place,
				x: holdsLeft ? toCells(left, 0, metrics.cell, metrics.gap).x : drag.place.x,
				y: holdsTop ? toCells(0, top, metrics.cell, metrics.gap).y : drag.place.y,
				w: toCellSpan(width, metrics.cell, metrics.gap),
				h: toCellSpan(height, metrics.cell, metrics.gap),
			});

			// the manifest's limits stop the resize silently; saying so is the difference
			// between "the editor is broken" and "this widget cannot go smaller"
			drag.element.dataset.size = `${clamped.w}x${clamped.h}`;
		};

		const move = (pointer) => {
			const drag = dragRef.current;
			if (!drag) return;
			const dx = pointer.clientX - drag.startX;
			const dy = pointer.clientY - drag.startY;
			// the two modes share nothing but the delta: a move must never consult the size
			// limits, or dragging a tile leftwards reads as "this widget is as narrow as it goes"
			if (drag.mode === "move") return moveBy(dx, dy);
			resizeBy(dx, dy);
		};

		const stop = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", stop);
			const drag = dragRef.current;
			dragRef.current = null;
			setLive(null);
			setPreview((current) => {
				// A press with no movement must author nothing. It used to commit the layout as
				// it stood, which froze a DERIVED width as the user's — and that width then
				// became the nearest source for its neighbours, pulling the whole board toward
				// whatever the derivation had shrunk it to.
				const moved =
					current &&
					(current.x !== drag.place.x ||
						current.y !== drag.place.y ||
						current.w !== drag.place.w ||
						current.h !== drag.place.h);
				// the same reason: read the layout as it stands now, not as it stood at the press
				const live = latestRef.current.places;
				// The same law the screen resize and a fold both run: an overflowing row shares
				// the loss before anybody is dropped. Only packPlaces ran here, and its single
				// answer to an overlap is to push a tile down a row.
				if (moved) {
					const next = [...live.filter((place) => place.id !== current.id), current];
					commit(arrange(next, latestRef.current.columns, { movedId: current.id, moving: drag.mode === "move" }));
				}
				return null;
			});
			// NOTHING is stripped from the node here. preact set width, height and transform
			// from the vnode, and it only writes a style key again when that key's VALUE
			// changes. Removing them behind its back left the record saying they were still
			// applied, so no later render restored them — the tile lost its width entirely
			// and shrank to its content. That collapse produced no commit, no write and no
			// column change, which is why the trace stayed silent through it.
			// The release still eases into the grid: the drag rendered the live geometry, the
			// stop renders the snapped one, and the transition carries the difference.
			if (drag?.element) delete drag.element.dataset.size;
		};

		dragRef.current.move = move;
		dragRef.current.stop = stop;
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", stop);
	};

	// the width's state has to be visible: without it the board silently looks different at
	// 11 and 12 columns and the reader has no way to tell an edit of theirs from a guess of ours
	const stateChip = editing
		? h("span", { className: `wg-state${isAuthored ? " is-authored" : ""}`, key: "state" }, [
				h("b", { key: "count" }, `${metrics.columns} columns`),
				h("span", { key: "kind" }, isAuthored ? "yours" : "derived"),
				isAuthored
					? h(
							"button",
							{
								key: "reset",
								className: "wg-state-reset",
								title: "Forget this width and derive it again",
								onClick: () => {
									const next = { ...board.layouts };
									delete next[metrics.columns];
									onChange({ ...board, layouts: next }, true);
								},
							},
							"Reset",
					  )
					: null,
		  ])
		: null;

	// One extra click, deliberately. While a chip is open the board is not interactive: the
	// first click closes it and the second reaches the board. Acting on the widget under the
	// pointer instead is how people delete the thing they meant to dismiss.
	const scrim =
		openedChip === null && settingsTile === null
			? null
			: h("div", {
					className: "wg-scrim",
					key: "scrim",
					onPointerDown: (event) => {
						event.preventDefault();
						event.stopPropagation();
						setOpenedChip(null);
						closeSettings();
					},
			  });

	const tiles =
		shown.length === 0
			? h("div", { className: "wg-blank" }, [
					h("b", { key: "title" }, "This board is empty"),
					h("span", { key: "hint" }, "Add a widget below; every other screen width derives from what you lay out here."),
			  ])
			: shown.map((place) => {
					const tile = board.tiles.find((entry) => entry.id === place.id);
					if (!tile) return null;
					return h(Tile, {
						key: place.id,
						tile,
						place,
						pixels: toPixels(place, metrics.cell, metrics.gap),
						cell: metrics.cell,
						gap: metrics.gap,
						columns: metrics.columns,
						phone: active.name === "phone",
						countReaders,
						settings: settingsTile?.id === place.id ? `open:${settingsTile.key}` : closingTile?.id === place.id ? `closing:${closingTile.key}` : null,
						onOpenSettings: openSettings,
						onCloseSettings: closeSettings,
						onResize: (patch) => resizeTile(place.id, patch),
						refs,
						cellFor,
						shells,
						live: live?.id === place.id ? live : null,
						scale: scaleOf(active),
						definition: registry.get(tile.widget),
						// the tile needs the registry ITSELF, not just its own definition: a slot
						// names another widget by id, and resolving it is the tile's job
						registry,
						host,
						editing,
						isDragging: dragRef.current?.id === place.id,
						onDragStart: (event, mode, edge) => startDrag(event, mode, place, edge),
						onRemove: () => setRemovingId(place.id),
						onPatch: (patch) => patchTile(place.id, patch),
						onOpen: setOpenedChip,
						opened: openedChip === place.id,
						board: boardBox,
						onCollapse: collapseTile,
						onExpand: expandTile,
						foldIntoGroup,
					});
			  });

	const hidden = board.tiles.filter((tile) => !placedIds(board, metrics.columns).has(tile.id));

	const content = [
			h("div", { className: "wg-toolbar", key: "toolbar" }, [
				stateChip,
				h("span", { className: "wg-toolbar-gap", key: "gap" }),
				editing
					? h(
							"button",
							{
								key: "autofit",
								className: "wg-tool",
								onClick: () => commit(arrange(latestRef.current.places, latestRef.current.columns, { autoFit: true })),
								title: "Grow every tile into the empty cells around it",
							},
							"Auto-fit",
					  )
					: null,
				onToggleEditing
					? h(
							"button",
							{ key: "edit", className: "wg-tool", onClick: onToggleEditing, title: editing ? "Done editing" : "Edit tiles" },
							editing ? "Done" : "Edit",
					  )
					: null,
				h(
					"button",
					{ key: "expand", className: "wg-tool", onClick: () => toggleExpanded(), title: isPage ? "Collapse" : "Expand" },
					isPage ? "Collapse" : "Expand",
				),
			]),
			h(
				"div",
				{
					key: "grid",
					className: "wg-grid",
					style: {
						fontSize: `${(scaleOf(active) * REM).toFixed(3)}px`,
						width: `${metrics.boardWidth}px`,
						height: `${boardRows * (metrics.cell + metrics.gap) - metrics.gap}px`,
						"--wg-board-pad": `${metrics.pad}px`,
						"--wg-cell": `${metrics.cell}px`,
						"--wg-gap": `${metrics.gap}px`,
						"--wg-columns": metrics.columns,
					},
				},
				[editing ? cellLayer(metrics.columns, boardRows) : null, scrim, h(Fragment, { key: "tiles" }, tiles)],
			),
			removalDialog(),
			palette(
				addTile,
				hidden.map((tile) =>
					h(
						"button",
						{
							className: "wg-chip is-hidden",
							key: `hidden-${tile.id}`,
							title: "Not on this layout — click to place it here",
							onClick: () => commit([...places, { id: tile.id, x: 0, y: rows, w: 3, h: 2 }]),
						},
						`↩ ${registry.get(tile.widget)?.manifest?.title ?? tile.widget}`,
					),
				),
			),
	];

	const surface = boardShell(content);

	return isPage ? h(Page, { onClose: () => toggleExpanded() }, surface) : surface;
}
