import { h } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { GRID } from "./paths.js";

const REM = 16;

function overlaps(a, b) {
	return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function resolveCollisions(items, movedId) {
	const ordered = [...items].sort((first, second) => first.y - second.y || first.x - second.x);
	const placed = [];
	const moved = items.find((item) => item.id === movedId);
	if (moved) placed.push(moved);

	for (const item of ordered) {
		if (item.id === movedId) continue;
		const candidate = { ...item };
		while (placed.some((other) => overlaps(candidate, other))) candidate.y += 1;
		placed.push(candidate);
	}
	return placed;
}

function clampTile(tile, columns) {
	const width = Math.max(1, Math.min(tile.w, columns));
	return {
		...tile,
		w: width,
		h: Math.max(1, tile.h),
		x: Math.max(0, Math.min(tile.x, columns - width)),
		y: Math.max(0, tile.y),
	};
}

function SettingsPanel({ definition, tile, onChange, onClose }) {
	const settings = tile.settings ?? {};
	const bindings = tile.data ?? {};

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
						placeholder: field.placeholder ?? "",
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

	const slots = Object.entries(definition.manifest.data ?? {}).map(([key, slot]) =>
		h("label", { class: "wg-field", key: `data-${key}` }, [
			h("span", null, `${slot.label ?? key} — тека`),
			h("input", {
				type: "text",
				value: bindings[key]?.path ?? "",
				placeholder: "Widgetarium Demo/Tasks",
				onInput: (event) =>
					onChange({ data: { ...bindings, [key]: { kind: "folder", path: event.target.value } } }),
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

function Tile({ definition, tile, host, editing, cell, onPatch, onRemove, onFullscreen, fullscreen }) {
	const [showSettings, setShowSettings] = useState(false);
	const [error, setError] = useState(null);

	const slots = useMemo(() => {
		const result = {};
		for (const key of Object.keys(definition?.manifest?.data ?? {})) {
			result[key] = host.slot(tile.data?.[key] ?? { kind: "folder", path: "" });
		}
		return result;
	}, [definition, tile.data, host]);

	const style = fullscreen
		? {}
		: {
				gridColumn: `${tile.x + 1} / span ${tile.w}`,
				gridRow: `${tile.y + 1} / span ${tile.h}`,
		  };

	const startDrag = (event, mode) => {
		if (!editing) return;
		event.preventDefault();
		const origin = { x: event.clientX, y: event.clientY, tile: { ...tile } };

		const move = (pointer) => {
			const dx = Math.round((pointer.clientX - origin.x) / cell.width);
			const dy = Math.round((pointer.clientY - origin.y) / cell.height);
			if (mode === "move") onPatch({ x: origin.tile.x + dx, y: origin.tile.y + dy });
			else onPatch({ w: origin.tile.w + dx, h: origin.tile.h + dy });
		};
		const stop = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", stop);
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", stop);
	};

	if (!definition) {
		return h("div", { class: "wg-tile wg-tile-missing", style }, [
			h("div", { class: "wg-missing" }, [
				h("b", null, "Віджет не знайдено"),
				h("code", null, tile.widget),
				h("span", null, "Налаштування збережені — поверніть файл віджета, і плитка оживе."),
			]),
		]);
	}

	const Component = definition.component;
	const supportsFullscreen = definition.manifest.supportsFullscreen && host.can.fullscreen;

	let body;
	try {
		body = error
			? h("div", { class: "wg-error" }, [h("b", null, "Помилка віджета"), h("code", null, String(error))])
			: h(Component, {
					settings: { ...defaults(definition), ...(tile.settings ?? {}) },
					data: slots,
					host,
					size: { w: tile.w, h: tile.h },
					fullscreen,
			  });
	} catch (failure) {
		body = h("div", { class: "wg-error" }, String(failure));
		if (!error) setError(failure);
	}

	return h(
		"div",
		{
			class: `wg-tile${editing ? " is-editing" : ""}${fullscreen ? " is-fullscreen" : ""}`,
			style,
			"data-widget": tile.widget,
		},
		[
			editing
				? h("div", { class: "wg-tile-bar", onPointerDown: (event) => startDrag(event, "move") }, [
						h("span", { class: "wg-tile-name" }, definition.manifest.title ?? definition.manifest.id),
						h("span", { class: "wg-tile-actions" }, [
							h("button", { onClick: () => setShowSettings((value) => !value), title: "Налаштування" }, "⚙"),
							h("button", { onClick: onRemove, title: "Прибрати" }, "✕"),
						]),
				  ])
				: null,
			supportsFullscreen
				? h(
						"button",
						{ class: "wg-fs", title: fullscreen ? "Згорнути" : "На весь екран", onClick: onFullscreen },
						fullscreen ? "⤡" : "⤢",
				  )
				: null,
			h("div", { class: "wg-tile-body" }, body),
			showSettings
				? h(SettingsPanel, {
						definition,
						tile,
						onChange: onPatch,
						onClose: () => setShowSettings(false),
				  })
				: null,
			editing && !fullscreen
				? h("div", { class: "wg-resize", onPointerDown: (event) => startDrag(event, "resize") })
				: null,
		],
	);
}

function defaults(definition) {
	const result = {};
	for (const field of definition.manifest.settings ?? []) {
		if (field.default !== undefined) result[field.key] = field.default;
	}
	return result;
}

export function WidgetSurface({ layout, registry, host, editing, onChange, screen }) {
	const containerRef = useRef(null);
	const [width, setWidth] = useState(0);
	const [fullscreenId, setFullscreenId] = useState(null);

	useEffect(() => {
		const element = containerRef.current;
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		observer.observe(element);
		setWidth(element.clientWidth);
		return () => observer.disconnect();
	}, []);

	const gap = GRID.gapRem * REM;
	const cell = {
		width: width ? (width - gap * (GRID.columns - 1)) / GRID.columns : 80,
		height: GRID.cellHeightRem * REM,
	};

	const patchTile = (id, patch) => {
		const next = layout.map((tile) => (tile.id === id ? clampTile({ ...tile, ...patch }, GRID.columns) : tile));
		onChange(resolveCollisions(next, id));
	};

	const removeTile = (id) => onChange(layout.filter((tile) => tile.id !== id));

	const addTile = (widgetId) => {
		const bottom = layout.reduce((lowest, tile) => Math.max(lowest, tile.y + tile.h), 0);
		const definition = registry.get(widgetId);
		const minimum = definition?.manifest?.minSize ?? { w: 3, h: 2 };
		onChange([
			...layout,
			{
				id: `w${Math.random().toString(36).slice(2, 8)}`,
				widget: widgetId,
				x: 0,
				y: bottom,
				w: minimum.w,
				h: minimum.h,
				settings: {},
				data: {},
			},
		]);
	};

	const fullscreenTile = fullscreenId ? layout.find((tile) => tile.id === fullscreenId) : null;

	return h("div", { class: `wg-root${editing ? " is-editing" : ""}${screen ? " is-screen" : ""}` }, [
		h(
			"div",
			{
				class: "wg-grid",
				ref: containerRef,
				style: {
					gridTemplateColumns: `repeat(${GRID.columns}, minmax(0, 1fr))`,
					gridAutoRows: `${GRID.cellHeightRem}rem`,
					gap: `${GRID.gapRem}rem`,
					backgroundSize: `${cell.width + gap}px ${cell.height + gap}px`,
				},
			},
			layout.map((tile) =>
				h(Tile, {
					key: tile.id,
					tile,
					definition: registry.get(tile.widget),
					host,
					editing,
					cell,
					fullscreen: false,
					onPatch: (patch) => patchTile(tile.id, patch),
					onRemove: () => removeTile(tile.id),
					onFullscreen: () => setFullscreenId(tile.id),
				}),
			),
		),
		editing
			? h("div", { class: "wg-palette" }, [
					h("span", { class: "wg-palette-label" }, "Додати віджет:"),
					...registry.list().map((definition) =>
						h(
							"button",
							{ class: "wg-chip", key: definition.manifest.id, onClick: () => addTile(definition.manifest.id) },
							definition.manifest.title ?? definition.manifest.id,
						),
					),
					registry.list().length === 0
						? h("span", { class: "wg-empty" }, "у .widgetarium/widgets поки порожньо")
						: null,
			  ])
			: null,
		fullscreenTile
			? h("div", { class: "wg-overlay", onClick: (event) => event.target === event.currentTarget && setFullscreenId(null) },
					h(Tile, {
						tile: fullscreenTile,
						definition: registry.get(fullscreenTile.widget),
						host,
						editing: false,
						cell,
						fullscreen: true,
						onPatch: (patch) => patchTile(fullscreenTile.id, patch),
						onRemove: () => removeTile(fullscreenTile.id),
						onFullscreen: () => setFullscreenId(null),
					}),
			  )
			: null,
	]);
}
