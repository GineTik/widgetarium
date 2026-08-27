import { h, Component } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { CLASSES, classOf, measureGrid } from "./paths.js";
import { clampPlace, packPlaces, rowsOf, toPixels, toCells, generatePlaces } from "./layout.js";
import { placedIds } from "./model.js";
import { mountInto } from "./portal.js";
import { useSource } from "./source.js";
import { createAction } from "./action.js";

const REM = 16;
const DESIGN_WIDTH = 352;
const SCALE_RANGE = { min: 0.55, max: 2.6 };

class Boundary extends Component {
	static getDerivedStateFromError(failure) {
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

function buildActions(manifest, host, sources, notify) {
	const result = {};
	for (const [name, spec] of Object.entries(manifest.actions ?? {})) {
		const source = sources[spec.params?.source];
		if (spec.use === "obsidian/createFile") {
			result[name] = createAction({
				can: Boolean(source?.canCreate),
				blockedReason: source?.canCreate ? null : "Bind a folder in the tile settings",
				run: (payload) => source.create(payload),
			});
			continue;
		}
		result[name] = createAction({
			can: false,
			blockedReason: `Action "${spec.use}" is not implemented in this runtime`,
			run: async () => notify(`Action "${name}" is unavailable here`),
		});
	}
	return result;
}

function defaults(definition) {
	const result = {};
	for (const field of definition.manifest.settings ?? []) {
		if (field.default !== undefined) result[field.key] = field.default;
	}
	return result;
}

function WidgetHost({ definition, tile, place, host, scale, patchSource }) {
	const manifest = definition.manifest;
	const sources = {};
	for (const name of Object.keys(manifest.sources ?? {})) {
		sources[name] = useSource({
			host,
			name,
			config: tile.sources?.[name],
			manifest: manifest.sources[name].default,
			patchConfig: patchSource,
		});
	}

	const props = {
		settings: { ...defaults(definition), ...(tile.settings ?? {}) },
		size: { w: place.w, h: place.h, scale },
		fullscreen: { isFullscreen: false, canFullscreen: false, open() {}, close() {}, toggle() {} },
		host,
		...sources,
		...buildActions(manifest, host, sources, host.ui.notify),
	};

	return h(definition.component, props);
}

function Tile({ definition, tile, place, pixels, host, editing, isDragging, onDragStart, onRemove, onPatch }) {
	const [showSettings, setShowSettings] = useState(false);

	const designWidth = definition?.manifest?.design?.width ?? DESIGN_WIDTH;
	const scale = Math.min(SCALE_RANGE.max, Math.max(SCALE_RANGE.min, pixels.width / designWidth));

	const style = {
		transform: `translate3d(${pixels.left}px, ${pixels.top}px, 0)`,
		width: `${pixels.width}px`,
		height: `${pixels.height}px`,
		fontSize: `${(scale * REM).toFixed(3)}px`,
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

	return h(
		"div",
		{
			class: `wg-tile${editing ? " is-editing" : ""}${isDragging ? " is-dragging" : ""}${
				definition.manifest.surface === "none" ? " is-bare" : ""
			}`,
			style,
			"data-tile": tile.id,
		},
		[
			h(
				"div",
				{ class: "wg-tile-body" },
				h(
					Boundary,
					{ key: tile.widget },
					h(WidgetHost, { definition, tile, place, host, scale, patchSource }),
				),
			),
			editing
				? h("div", { class: "wg-tile-bar", onPointerDown: (event) => onDragStart(event, "move") }, [
						h("span", { class: "wg-tile-name" }, definition.manifest.title ?? definition.manifest.id),
						h("span", { class: "wg-tile-actions" }, [
							h("button", { onClick: () => setShowSettings((value) => !value), title: "Settings" }, "⚙"),
							h("button", { onClick: onRemove, title: "Remove" }, "✕"),
						]),
				  ])
				: null,
			showSettings
				? h(SettingsPanel, { definition, tile, onChange: onPatch, onClose: () => setShowSettings(false) })
				: null,
			editing
				? h("div", { class: "wg-resize", onPointerDown: (event) => onDragStart(event, "resize") })
				: null,
		],
	);
}

function Board({ className, onWidth, children }) {
	const rootRef = useRef(null);

	useEffect(() => {
		const element = rootRef.current;
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => onWidth(entry.contentRect.width));
		observer.observe(element);
		onWidth(element.clientWidth);
		return () => observer.disconnect();
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

export function WidgetSurface({ board, registry, host, editing, onChange, onToggleEditing, screen }) {
	const dragRef = useRef(null);

	const [width, setWidth] = useState(0);
	const [isPage, setPage] = useState(false);
	const [pickedClass, setPickedClass] = useState(null);
	const [preview, setPreview] = useState(null);

	const deviceClass = classOf(typeof window === "undefined" ? 1280 : window.innerWidth);
	const deviceRank = CLASSES.findIndex((entry) => entry.name === deviceClass.name);
	const naturalClass = classOf(width || 700);
	const active = editing && pickedClass ? CLASSES.find((entry) => entry.name === pickedClass) : naturalClass;

	const metrics = measureGrid(width || 700, active.columns);
	const places = board.layouts[active.name];
	const shown = preview ? packPlaces([...places.filter((place) => place.id !== preview.id), preview], preview.id) : places;
	const rows = rowsOf(shown);

	const commit = (nextPlaces, isCommit = true) => {
		onChange({ ...board, layouts: { ...board.layouts, [active.name]: nextPlaces } }, isCommit);
	};

	const patchTile = (id, patch) => {
		onChange({ ...board, tiles: board.tiles.map((tile) => (tile.id === id ? { ...tile, ...patch } : tile)) }, true);
	};

	const removeTile = (id) => commit(places.filter((place) => place.id !== id));

	const addTile = (widgetId) => {
		const minimum = registry.get(widgetId)?.manifest?.minSize ?? { w: 3, h: 2 };
		const id = `w${Math.random().toString(36).slice(2, 8)}`;
		onChange(
			{
				tiles: [...board.tiles, { id, widget: widgetId, settings: {}, sources: {} }],
				layouts: {
					...board.layouts,
					[active.name]: [...places, { id, x: 0, y: rows, w: minimum.w, h: minimum.h }],
				},
			},
			true,
		);
	};

	const startDrag = (event, mode, place) => {
		if (!editing) return;
		event.preventDefault();
		const element = event.currentTarget.closest(".wg-tile");
		const manifest = registry.get(board.tiles.find((tile) => tile.id === place.id)?.widget)?.manifest;
		const minimum = manifest?.minSize;
		const maximum = manifest?.maxSize;

		dragRef.current = { id: place.id, mode, startX: event.clientX, startY: event.clientY, place, element, minimum, maximum };
		setPreview(place);

		const move = (pointer) => {
			const drag = dragRef.current;
			if (!drag) return;
			const dx = pointer.clientX - drag.startX;
			const dy = pointer.clientY - drag.startY;
			const base = toPixels(drag.place, metrics.cell, metrics.gap);

			if (drag.mode === "move") {
				drag.element.style.transform = `translate3d(${base.left + dx}px, ${base.top + dy}px, 0)`;
			} else {
				drag.element.style.width = `${Math.max(metrics.cell, base.width + dx)}px`;
				drag.element.style.height = `${Math.max(metrics.cell, base.height + dy)}px`;
			}

			const next =
				drag.mode === "move"
					? { ...drag.place, ...toCells(base.left + dx, base.top + dy, metrics.cell, metrics.gap) }
					: {
							...drag.place,
							w: Math.max(1, toCells(base.width + dx, 0, metrics.cell, metrics.gap).x || 1),
							h: Math.max(1, toCells(0, base.height + dy, metrics.cell, metrics.gap).y || 1),
					  };

			const clamped = clampPlace(next, active.columns, drag.minimum, drag.maximum);
			setPreview((current) =>
				current && current.x === clamped.x && current.y === clamped.y && current.w === clamped.w && current.h === clamped.h
					? current
					: clamped,
			);
		};

		const stop = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", stop);
			const drag = dragRef.current;
			dragRef.current = null;
			if (drag?.element) {
				drag.element.style.removeProperty("width");
				drag.element.style.removeProperty("height");
			}
			setPreview((current) => {
				if (current) commit(packPlaces([...places.filter((place) => place.id !== current.id), current], current.id));
				return null;
			});
		};

		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", stop);
	};

	const donor = CLASSES.map((entry) => entry.name).find(
		(name) => name !== active.name && board.layouts[name].length > 0,
	);

	const tabs = editing
		? h(
				"div",
				{ class: "wg-tabs" },
				CLASSES.map((entry, index) =>
					h(
						"button",
						{
							key: entry.name,
							class: `wg-tab${entry.name === active.name ? " is-active" : ""}`,
							disabled: index > deviceRank,
							title:
								index > deviceRank
									? `${entry.label} can only be edited on a wider screen`
									: `Edit the ${entry.label.toLowerCase()} layout`,
							onClick: () => setPickedClass(entry.name),
						},
						`${entry.label} · ${entry.columns}`,
					),
				),
		  )
		: null;

	const body =
		shown.length === 0
			? h("div", { class: "wg-blank" }, [
					h("b", null, `The ${active.label.toLowerCase()} layout is empty`),
					h("span", null, "Widgets placed here show up on this screen size only."),
					donor
						? h(
								"button",
								{
									class: "wg-tool",
									onClick: () => commit(generatePlaces(board.layouts[donor], donor, active.name)),
								},
								`Generate from ${donor}`,
						  )
						: null,
			  ])
			: shown.map((place) => {
					const tile = board.tiles.find((entry) => entry.id === place.id);
					if (!tile) return null;
					return h(Tile, {
						key: place.id,
						tile,
						place,
						pixels: toPixels(place, metrics.cell, metrics.gap),
						definition: registry.get(tile.widget),
						host,
						editing,
						isDragging: dragRef.current?.id === place.id,
						onDragStart: (event, mode) => startDrag(event, mode, place),
						onRemove: () => removeTile(place.id),
						onPatch: (patch) => patchTile(place.id, patch),
					});
			  });

	const hidden = board.tiles.filter((tile) => !placedIds(board, active.name).has(tile.id));

	const content = [
			h("div", { class: "wg-toolbar" }, [
				tabs,
				h("span", { class: "wg-toolbar-gap" }),
				onToggleEditing
					? h(
							"button",
							{ class: "wg-tool", onClick: onToggleEditing, title: editing ? "Done editing" : "Edit tiles" },
							editing ? "Done" : "Edit",
					  )
					: null,
				h(
					"button",
					{ class: "wg-tool", onClick: () => setPage((value) => !value), title: isPage ? "Collapse" : "Expand" },
					isPage ? "Collapse" : "Expand",
				),
			]),
			h(
				"div",
				{
					class: "wg-grid",
					style: {
						width: `${metrics.boardWidth}px`,
						height: `${Math.max(1, rows) * (metrics.cell + metrics.gap) - metrics.gap}px`,
						padding: `${metrics.pad}px`,
						backgroundSize: `${metrics.cell + metrics.gap}px ${metrics.cell + metrics.gap}px`,
						backgroundPosition: `${metrics.pad + metrics.cell / 2}px ${metrics.pad + metrics.cell / 2}px`,
					},
				},
				body,
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

	const surface = h(Board, {
		className: `wg-root${editing ? " is-editing" : ""}${screen ? " is-screen" : ""}${isPage ? " is-page" : ""}`,
		onWidth: setWidth,
		children: content,
	});

	return isPage ? h(Page, { onClose: () => setPage(false) }, surface) : surface;
}
