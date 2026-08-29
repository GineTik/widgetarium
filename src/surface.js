import { h, Component } from "preact";
import { memo } from "preact/compat";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { classOf, measureGrid, scaleOf } from "./paths.js";
import { createWidthWatcher } from "./width-gate.js";
import { isTooNarrow, openedBox, wantedBox } from "./chip.js";
import { arrange, clampPlace, FOLDED_COLUMNS, rowsOf, toPixels, toCells, toCellSpan, spanToPixels, hoverScale } from "./layout.js";
import { placedIds, layoutFor } from "./model.js";
import { createContext } from "./engine/context.js";
import { mountInto } from "./portal.js";
import { viewHost } from "./engine/view-host.js";
import { trace } from "./trace.js";
import { useSource } from "./source.js";

const REM = 16;
// how far a resize may travel past a limit before it stops giving entirely
const GIVE_PX = 22;
// under this a board is not laid out yet, and its width is not a fact about the screen
const MIN_BOARD_WIDTH_PX = 120;
// Corners LAST. They overlap the two side grips they touch, and with one z-index the
// later sibling paints on top — so the corner has to come after the sides it covers.
function initialOf(name) {
	return String(name ?? "?").replace(/^@[\w-]+\//, "").trim().charAt(0).toUpperCase() || "?";
}

const EDGES = ["n", "s", "w", "e", "nw", "ne", "sw", "se"];

class Boundary extends Component {
	static getDerivedStateFromError(failure) {
		// the message alone names no file; without the stack a crash inside a widget costs a
		// bisect to locate
		console.error("Widgetarium: widget crashed", failure);
		return { failure };
	}

	render() {
		if (!this.state.failure) return this.props.children;
		return h("div", { class: "wg-error" }, [
			h("b", null, "Widget crashed"),
			h("code", null, String(this.state.failure?.message ?? this.state.failure)),
		]);
	}
}

function SettingsPanel({ definition, tile, onChange, onClose }) {
	const settings = tile.settings ?? {};
	const bindings = tile.sources ?? {};

	const fields = (definition.manifest.settings ?? []).map((field) =>
		h("label", { class: "wg-field", key: field.key }, [
			h("span", null, field.label ?? field.key),
			field.type === "boolean"
				? h("input", {
						type: "checkbox",
						checked: Boolean(settings[field.key] ?? field.default),
						onChange: (event) => onChange({ settings: { ...settings, [field.key]: event.target.checked } }),
				  })
				: h("input", {
						type: field.type === "number" ? "number" : "text",
						value: settings[field.key] ?? field.default ?? "",
						onInput: (event) =>
							onChange({
								settings: {
									...settings,
									[field.key]: field.type === "number" ? Number(event.target.value) : event.target.value,
								},
							}),
				  }),
		]),
	);

	const slots = Object.entries(definition.manifest.sources ?? {}).map(([key, source]) =>
		h("label", { class: "wg-field", key: `source-${key}` }, [
			h("span", null, `${source.label ?? key} — folder`),
			h("input", {
				type: "text",
				value: bindings[key]?.path ?? "",
				placeholder: "Widgetarium Demo/Tasks",
				onInput: (event) =>
					onChange({ sources: { ...bindings, [key]: { ...(bindings[key] ?? {}), path: event.target.value } } }),
			}),
		]),
	);

	return h("div", { class: "wg-settings" }, [
		h("div", { class: "wg-settings-head" }, [
			h("b", null, definition.manifest.title ?? definition.manifest.id),
			h("button", { class: "wg-x", onClick: onClose }, "✕"),
		]),
		...slots,
		...fields,
		h("div", { class: "wg-settings-foot" }, h("code", null, definition.manifest.id)),
	]);
}

function defaults(definition) {
	const result = {};
	for (const field of definition.manifest.settings ?? []) {
		if (field.default !== undefined) result[field.key] = field.default;
	}
	return result;
}

// A widget's source filter may name a context key with a leading @: `{ board: "@board" }`
// resolves against the board's shared selection. That indirection is the whole binding —
// the tabs widget writes "board", this one reads it, and neither knows the other exists.
export function resolveFilter(rows, context) {
	const out = [];
	for (const row of rows ?? []) {
		// { spread: "@filters" } becomes one clause per key the filter bar has set. Without
		// it a widget would have to know in advance which properties are filterable, which
		// is exactly the knowledge the filter bar reads off the data at runtime.
		if (typeof row.spread === "string" && row.spread.startsWith("@")) {
			const chosen = context.get(row.spread.slice(1));
			if (chosen && typeof chosen === "object") {
				for (const [prop, value] of Object.entries(chosen)) {
					if (value === undefined || value === null || value === "") continue;
					// A filter panel offers CHECKBOXES: three members ticked is one clause with
					// three values, not three clauses that can never all be true at once.
					if (Array.isArray(value)) {
						if (value.length > 0) out.push({ prop, op: "in", value });
						continue;
					}
					out.push({ prop, op: "is", value });
				}
			}
			continue;
		}

		const value = row.value;
		if (typeof value !== "string" || !value.startsWith("@")) {
			out.push(row);
			continue;
		}
		const resolved = context.get(value.slice(1));
		// an unset selection must not become a clause matching the empty string, or the board
		// would show nothing at all until something was picked
		if (resolved === undefined || resolved === null || resolved === "") continue;
		out.push({ ...row, value: resolved });
	}
	return out;
}

// A slot is where the board says WHICH widget draws part of another one. The parent feeds
// it — a card gets its row from the board — so a slotted widget has no source of its own; it
// is a view handed data. That is what makes "replace this card" a setting, not a fork.
export function resolveSlots(manifest, tile, registry, host, viewContext) {
	const slots = {};
	for (const [name, spec] of Object.entries(manifest.slots ?? {})) {
		const child = registry.get(tile.slots?.[name] ?? spec.default);
		if (!child?.component || child.error) {
			slots[name] = null;
			continue;
		}
		const childDefaults = defaults(child);
		slots[name] = (given) =>
			h(child.component, {
				...given,
				settings: { ...childDefaults, ...(given?.settings ?? {}) },
				size: given?.size ?? { w: 1, h: 1, scale: 1 },
				host: viewHost(host),
				context: viewContext,
			});
	}
	return slots;
}

// TRADE-OFF: a mount resolves its own sources, unlike a slot, which is handed its data
// CONTEXT: the SLOT, not the widget id — the same widget mounted twice is two of these
function mountedTile(tile, slot, widget) {
	const held = tile.mounted?.[slot] ?? {};
	return { id: `${tile.id}/${slot}`, widget, settings: held.settings ?? {}, sources: held.sources ?? {}, mounted: held.mounted ?? {} };
}

// CONTEXT: module scope, so returning to a view finds the same component type
function MountedWidget({ slot, widget, definition, tile, patchMounted, ...rest }) {
	const child = mountedTile(tile, slot, widget);
	return h(WidgetHost, {
		...rest,
		definition,
		tile: child,
		isMounted: true,
		patchSource: (name, patch) =>
			patchMounted(slot, { sources: { ...child.sources, [name]: { ...(child.sources[name] ?? {}), ...patch } } }),
		patchMounted: (held, patch) =>
			patchMounted(slot, { mounted: { ...child.mounted, [held]: { ...(child.mounted[held] ?? {}), ...patch } } }),
		onPatch: (patch) => patchMounted(slot, patch),
	});
}

function idsOf(value) {
	if (Array.isArray(value)) return value;
	return String(value ?? "")
		.split(",")
		.map((id) => id.trim())
		.filter(Boolean);
}

// CONTEXT: an id the registry could not resolve is still an entry — dropping it hid the gap
function mountEntry(slot, id, registry, mount) {
	const held = registry.get(id);
	const drawable = Boolean(held?.component) && !held.error;
	return {
		slot,
		id,
		title: held?.manifest?.title ?? id,
		// CONTEXT: the child's own declaration — what a holder matches on is the holder's business
		manifest: held?.manifest ? { ...held.manifest } : null,
		problem: drawable ? null : held ? "failed" : "not-found",
		failure: held?.error ? String(held.error.message ?? held.error) : null,
		render: drawable ? () => h(MountedWidget, { ...mount, key: slot, slot, widget: id, definition: held }) : null,
	};
}

// CONTEXT: a mount is filled by the SETTING of the same name, so which widgets it holds is configuration
export function resolveMounts(manifest, settings, registry, mount) {
	const mounts = {};
	for (const name of Object.keys(manifest.mounts ?? {})) {
		// CONTEXT: a repeated id is a second slot, with settings and sources of its own
		const taken = new Map();
		mounts[name] = idsOf(settings[name]).map((id) => {
			const nth = (taken.get(id) ?? 0) + 1;
			taken.set(id, nth);
			return mountEntry(nth === 1 ? id : `${id}#${nth}`, id, registry, mount);
		});
	}
	return mounts;
}

function WidgetHost({ definition, tile, place, host, scale, patchSource, context, registry, onCollapse, onExpand, onPatch, patchMounted, isMounted }) {
	const manifest = definition.manifest;
	const [, setTick] = useState(0);
	// CONTEXT: one INSTANCE, not one widget — two tiles of the same widget are two writers
	const owner = `${manifest.id}@${tile.id}`;

	// CONTEXT: a claim outliving its widget leaves the key unwritable for good
	useEffect(() => () => context.release(owner), [context, owner]);

	// Re-render when the shared selection moves. A widget that PROVIDES needs this as much as
	// one that consumes: the tab bar draws the active tab from the very key it writes, and
	// without the subscription the click would land but the underline would not follow.
	const touchesContext = (manifest.consumes ?? []).length > 0 || (manifest.provides ?? []).length > 0;
	useEffect(() => {
		if (!touchesContext) return;
		return context.subscribe(() => setTick((count) => count + 1));
	}, [context, touchesContext]);

	const sources = {};
	for (const name of Object.keys(manifest.sources ?? {})) {
		const declared = manifest.sources[name].default;
		sources[name] = useSource({
			host,
			name,
			config: tile.sources?.[name],
			manifest: declared ? { ...declared, filters: resolveFilter(declared.filters, context) } : declared,
			patchConfig: patchSource,
		});
	}

	// The view gets DATA and INTENTS, never the store. Handing a widget the source object
	// put the model inside the view: it held the vault slot, its bindings and its writer, so
	// the same component could not run anywhere else. Now the engine owns the writing and
	// the widget only says what it wants done.
	const data = {};
	const actions = {};
	const filters = {};
	for (const [name, source] of Object.entries(sources)) {
		data[name] = { rows: source.data.rows, total: source.data.total, isLoading: source.data.isLoading, failure: source.data.failure ?? null };
		actions[name] = {
			canCreate: source.canCreate,
			canUpdate: source.canUpdate,
			canRemove: source.canRemove,
			create: (draft) => source.create(draft),
			update: (ref, patch) => source.update(ref, patch),
			open: (ref) => source.openRecord(ref),
		};
		// only a filter UI needs these, and it needs them as data, not as a query engine
		filters[name] = { list: source.filters.list, update: source.filters.update, describe: source.describe };
	}

	const viewContext = {
		get: (key) => context.get(key),
		set: (key, value) => context.set(key, value, owner),
		offered: () => context.offered(),
	};

	// CONTEXT: a mount has no place, so folding one would fold the tile holding it
	const fold = (verb, run) => () => {
		if (!isMounted) return run?.(place.id);
		console.warn(`Widgetarium: ${owner} is mounted and cannot ${verb} — a mount has no place of its own`);
	};

	const settings = { ...defaults(definition), ...(tile.settings ?? {}) };
	const props = {
		settings,
		// A widget may CHANGE its own settings — the columns a board shows are a setting, and a
		// kanban with no way to add one had to fake it by creating a task with a new status and
		// letting the column appear as a side effect. The board still owns the tile; the widget
		// states what it wants and the board writes it, exactly as with size and folding.
		configure: (patch) => onPatch({ settings: { ...(tile.settings ?? {}), ...patch } }),
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
		// what this widget may read and write of the shared selection, and nothing else
		context: viewContext,
		data,
		actions,
		filters,
		slots: resolveSlots(manifest, tile, registry, host, viewContext),
		mounts: resolveMounts(manifest, settings, registry, { tile, place, host, scale, context, registry, onCollapse, onExpand, patchMounted }),
	};

	return h(definition.component, props);
}

// the empty grid is real elements, so colour and radius come from tokens rather than
// from numbers baked into a generated image
function cellLayer(columns, rows) {
	const cells = [];
	for (let index = 0; index < columns * rows; index += 1) cells.push(h("i", { key: index }));
	return h("div", { class: "wg-cells", key: "cells" }, cells);
}

// Past a limit the box keeps giving, but less and less — the further you pull, the less it
// yields, so it reads as stretched rubber rather than a wall. Apple's own resizable widgets
// do this: the box never simply stops under the finger, it just stops rewarding. The give
// never reaches half a cell, so the size that lands is still the limit itself.
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
		{ class: "wg-grip-arc", viewBox: `0 0 ${ARC_BOX} ${ARC_BOX}`, "aria-hidden": "true" },
		h("path", { d: arcPath(), fill: "none", "stroke-linecap": "round", "vector-effect": "non-scaling-stroke" }),
	);
}

function resist(wanted, low, high) {
	if (wanted < low) return low - GIVE_PX * (1 - GIVE_PX / (GIVE_PX + (low - wanted)));
	if (wanted > high) return high + GIVE_PX * (1 - GIVE_PX / (GIVE_PX + (wanted - high)));
	return wanted;
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
		{ class: "wg-icon", viewBox: "0 0 24 24", "aria-hidden": "true" },
		paths.map((d, index) => h("path", { key: index, d, "stroke-linecap": "round", "stroke-linejoin": "round" })),
	);
}

function TileView({ definition, tile, place, pixels, live, cell, scale, host, editing, isDragging, onDragStart, onRemove, onPatch, onCollapse, onExpand, onOpen, opened, board, context, registry }) {
	const [showSettings, setShowSettings] = useState(false);

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
		"--wg-tile-scale": editing ? hoverScale(shown, cell) : 1,
	};

	if (!definition || definition.error) {
		return h("div", { class: "wg-tile wg-tile-missing", style }, [
			h("div", { class: "wg-missing" }, [
				h("b", null, definition ? "Widget failed to load" : "Widget not found"),
				h("code", null, tile.widget),
				h(
					"span",
					null,
					definition
						? String(definition.error?.message ?? definition.error)
						: "Settings are kept — restore the widget file and the tile comes back.",
				),
			]),
		]);
	}

	const patchSource = (name, patch) =>
		onPatch({ sources: { ...(tile.sources ?? {}), [name]: { ...(tile.sources?.[name] ?? {}), ...patch } } });

	const patchMounted = (id, patch) =>
		onPatch({ mounted: { ...(tile.mounted ?? {}), [id]: { ...(tile.mounted?.[id] ?? {}), ...patch } } });

	// TOO NARROW TO BE ITSELF. The tile keeps the width it was given — the board never refuses
	// one — and the widget stands aside for a chip. Opening the chip grows it from exactly
	// here, over its neighbours, so the two are visibly the same thing.
	// Shown while EDITING too. Hiding it there drew the full widget spilling out of a tile it
	// does not fit, so the person arranging the board saw one thing and the person reading it
	// saw another — and the arranger could not tell which block was the problem.
	const narrow = isTooNarrow(shown.width, definition.manifest);
	const grown = narrow && opened && !editing ? openedBox(shown, wantedBox(definition.manifest, board), board) : null;
	const tileStyle = grown
		? {
				...style,
				transform: `translate3d(${grown.left}px, ${grown.top}px, 0)`,
				width: `${grown.width}px`,
				height: `${grown.height}px`,
		  }
		: style;

	const widget = h(
		Boundary,
		{ key: tile.widget },
		h(WidgetHost, { definition, tile, place, host, scale, patchSource, patchMounted, context, registry, onCollapse, onExpand, onPatch }),
	);

	// The chip replaces the CONTENT and nothing else. Returning it in place of the whole tile
	// took the ring, the grips and the chrome with it — the moment a resize made a tile narrow
	// enough to chip, the handles doing the resizing vanished from under the pointer.
	const chip =
		editing || !opened
			? h(
					editing ? "div" : "button",
					{
						class: "wg-narrow",
						title: editing
							? "Too narrow here — this is what a reader sees"
							: `Open ${definition.manifest.title ?? tile.widget}`,
						onClick: editing ? undefined : () => onOpen?.(tile.id),
					},
					[
						h("span", { class: "wg-narrow-mark" }, initialOf(definition.manifest.title ?? tile.widget)),
						h("span", { class: "wg-narrow-open" }, "Open"),
					],
			  )
			: widget;


	return h(
		"div",
		{
			class: `wg-tile${editing ? " is-editing" : ""}${isDragging ? " is-dragging" : ""}${narrow ? " wg-tile-chip" : ""}${narrow && opened && !editing ? " is-open" : ""}`,
			style: tileStyle,
			"data-tile": tile.id,
		},
		[
			h("div", { class: "wg-tile-body" }, narrow ? chip : widget),
			editing
				? [
						h("div", { class: "wg-tile-ring", key: "ring", onPointerDown: (event) => onDragStart(event, "move") }),
						h("span", { class: "wg-tile-actions", key: "actions" }, [
							h(
								"button",
								{ onClick: () => setShowSettings((value) => !value), title: "Settings", "aria-label": "Settings" },
								icon(ICON_GEAR),
							),
							h("button", { onClick: onRemove, title: "Remove", "aria-label": "Remove" }, icon(ICON_TRASH)),
						]),
				  ]
				: null,
			showSettings
				? h(SettingsPanel, { definition, tile, onChange: onPatch, onClose: () => setShowSettings(false) })
				: null,
			editing
				? EDGES.map((edge) =>
						h(
							"div",
							{
								key: edge,
								class: `wg-grip wg-grip-${edge}`,
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
	if (before.scale !== after.scale || before.live !== after.live || before.cell !== after.cell) return false;
	if (before.context !== after.context) return false;
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
		watcher.measured(element.clientWidth);
		return () => {
			observer.disconnect();
			watcher.stop();
		};
	}, []);

	return h("div", { class: className, ref: rootRef }, children);
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

export function WidgetSurface({ board, registry, host, editing, onChange, onToggleEditing, screen, initialWidth = 0, onWidth }) {
	const dragRef = useRef(null);
	const latestRef = useRef(null);

	// seeded from the last measurement of the previous element: Obsidian rebuilds the block
	// after a write, and starting from zero again cost a blank frame every time
	const [width, setWidth] = useState(initialWidth);
	// The mode is written in the block, so it survives every re-render the editor causes —
	// and a page opens in the state it was left in.
	const isPage = board.mode === "expanded";
	const toggleExpanded = () => onChange({ ...board, mode: isPage ? "collapsed" : "expanded" }, true);
	const [preview, setPreview] = useState(null);
	const [openedChip, setOpenedChip] = useState(null);
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

	const boardShell = (children) =>
		h(Board, {
			className: `wg-root${editing ? " is-editing" : ""}${screen ? " is-screen" : ""}${isPage ? " is-page" : ""}`,
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

	// the class no longer picks a layout — the column count does. It survives only to say
	// how far the screen sits from the eye, which is what the type scale is for.
	// One context per board, alive for as long as the board is, and LOCAL to this viewer. The
	// block seeds it — the file says where a fresh visitor starts — and nothing is written
	// back: two people on one board must be able to filter and open tasks without moving each
	// other's screen. Anything meant for everyone goes to a store instead.
	const context = useMemo(() => createContext(board.context ?? {}), []);

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

	const patchTile = (id, patch) => {
		onChange({ ...board, tiles: board.tiles.map((tile) => (tile.id === id ? { ...tile, ...patch } : tile)) }, true);
	};

	// Removing a tile removes the TILE, not its place at this one width. Dropping only the
	// place left it in board.tiles, so the next width derived it back and a widget deleted in
	// the collapsed board reappeared expanded.
	const removeTile = (id) => {
		const now = latestRef.current;
		const layouts = {};
		for (const [columns, layout] of Object.entries(now.board.layouts)) {
			layouts[columns] = layout.filter((place) => place.id !== id);
		}
		onChange({ ...now.board, tiles: now.board.tiles.filter((tile) => tile.id !== id), layouts }, true);
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
		const id = `w${Math.random().toString(36).slice(2, 8)}`;
		onChange(
			{
				tiles: [...board.tiles, { id, widget: widgetId, settings: {}, sources: {} }],
				layouts: {
					...board.layouts,
					[metrics.columns]: [...places, { id, x: 0, y: rows, w: born.w, h: born.h }],
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
		? h("span", { class: `wg-state${isAuthored ? " is-authored" : ""}` }, [
				h("b", null, `${metrics.columns} columns`),
				h("span", null, isAuthored ? "yours" : "derived"),
				isAuthored
					? h(
							"button",
							{
								class: "wg-state-reset",
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
		openedChip === null
			? null
			: h("div", {
					class: "wg-scrim",
					key: "scrim",
					onPointerDown: (event) => {
						event.preventDefault();
						event.stopPropagation();
						setOpenedChip(null);
					},
			  });

	const tiles =
		shown.length === 0
			? h("div", { class: "wg-blank" }, [
					h("b", null, "This board is empty"),
					h("span", null, "Add a widget below; every other screen width derives from what you lay out here."),
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
						context,
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
						onRemove: () => removeTile(place.id),
						onPatch: (patch) => patchTile(place.id, patch),
						onOpen: setOpenedChip,
						opened: openedChip === place.id,
						board: { width: metrics.boardWidth, height: Math.max(1, rowsOf(shown)) * (metrics.cell + metrics.gap) },
						onCollapse: collapseTile,
						onExpand: expandTile,
					});
			  });

	const hidden = board.tiles.filter((tile) => !placedIds(board, metrics.columns).has(tile.id));

	const content = [
			h("div", { class: "wg-toolbar" }, [
				stateChip,
				h("span", { class: "wg-toolbar-gap" }),
				editing
					? h(
							"button",
							{
								class: "wg-tool",
								onClick: () => commit(arrange(latestRef.current.places, latestRef.current.columns, { autoFit: true })),
								title: "Grow every tile into the empty cells around it",
							},
							"Auto-fit",
					  )
					: null,
				onToggleEditing
					? h(
							"button",
							{ class: "wg-tool", onClick: onToggleEditing, title: editing ? "Done editing" : "Edit tiles" },
							editing ? "Done" : "Edit",
					  )
					: null,
				h(
					"button",
					{ class: "wg-tool", onClick: () => toggleExpanded(), title: isPage ? "Collapse" : "Expand" },
					isPage ? "Collapse" : "Expand",
				),
			]),
			h(
				"div",
				{
					class: "wg-grid",
					style: {
						fontSize: `${(scaleOf(active) * REM).toFixed(3)}px`,
						width: `${metrics.boardWidth}px`,
						height: `${Math.max(1, rows) * (metrics.cell + metrics.gap) - metrics.gap}px`,
						"--wg-board-pad": `${metrics.pad}px`,
						"--wg-cell": `${metrics.cell}px`,
						"--wg-gap": `${metrics.gap}px`,
						"--wg-columns": metrics.columns,
					},
				},
				[editing ? cellLayer(metrics.columns, Math.max(1, rows)) : null, scrim, tiles],
			),
			editing
				? h("div", { class: "wg-palette" }, [
						h("span", { class: "wg-palette-label" }, "Add widget:"),
						...registry.list().map((definition) =>
							h(
								"button",
								{ class: "wg-chip", key: definition.manifest.id, onClick: () => addTile(definition.manifest.id) },
								definition.manifest.title ?? definition.manifest.id,
							),
						),
						...hidden.map((tile) =>
							h(
								"button",
								{
									class: "wg-chip is-hidden",
									key: `hidden-${tile.id}`,
									title: "Not on this layout — click to place it here",
									onClick: () =>
										commit([...places, { id: tile.id, x: 0, y: rows, w: 3, h: 2 }]),
								},
								`↩ ${registry.get(tile.widget)?.manifest?.title ?? tile.widget}`,
							),
						),
				  ])
				: null,
	];

	const surface = boardShell(content);

	return isPage ? h(Page, { onClose: () => toggleExpanded() }, surface) : surface;
}
