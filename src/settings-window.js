import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { DialogClose, DialogOverlay } from "./dialog.js";
import { Button, Field, Icon, IconButton, List, Pill, Popover, PopoverItem, PopoverSeparator, Row, RowBadge, RowLabel, RowValue, Segmented, Switch } from "./kit.js";
import { spanToPixels } from "./layout.js";
import { CHROME, clampPan, dialogBox, freeArea, openingPan, openingScale } from "./settings-fit.js";

const TABS = [
	{ value: "settings", label: "Settings" },
	{ value: "data", label: "Data" },
	{ value: "design", label: "Design" },
];

const ZOOM_STEP = 0.1;
const ZOOM_FLOOR = 0.25;
// CONTEXT: under this a press is a tap, over it a pan
const TAP_SLOP_PX = 4;
const FOLDERS_SHOWN = 12;

function clamp(value, low, high) {
	return Math.max(low, Math.min(value, high));
}

// CONTEXT: the dialog holds the screen, so the screen resizing is the only thing that resizes it
function useViewport() {
	const read = () => ({ width: globalThis.window?.innerWidth ?? 0, height: globalThis.window?.innerHeight ?? 0 });
	const [box, setBox] = useState(read);
	useEffect(() => {
		const measure = () => setBox((held) => {
			const now = read();
			return held.width === now.width && held.height === now.height ? held : now;
		});
		globalThis.window?.addEventListener("resize", measure);
		return () => globalThis.window?.removeEventListener("resize", measure);
	}, []);
	return box;
}

// A dialog that lets the page scroll behind it is a panel, not a dialog: the wheel landed on
// the note and carried the board out from under a window that had not been dismissed.
function useHeldScroll(open) {
	useEffect(() => {
		if (!open) return;
		const body = globalThis.document?.body;
		if (!body) return;
		const held = body.style.overflow;
		body.style.overflow = "hidden";
		return () => {
			body.style.overflow = held;
		};
	}, [open]);
}

function initialOf(name) {
	return String(name ?? "?").replace(/^@[\w-]+\//, "").trim().charAt(0).toUpperCase() || "?";
}

function titleCase(name) {
	return `${String(name).charAt(0).toUpperCase()}${String(name).slice(1)}`;
}

function foldersOf(host) {
	const files = host?.app?.vault?.getAllLoadedFiles?.() ?? [];
	return files
		.filter((file) => Array.isArray(file?.children) && typeof file.path === "string" && file.path !== "/")
		.map((file) => file.path)
		.sort();
}

function shownValue(value, fallback) {
	const held = value ?? fallback;
	if (held === undefined || held === null || held === "") return null;
	return String(held);
}

// CONTEXT: the heading sits outside the block, so the block holds rows and nothing else
function group(key, heading, rows, under) {
	return h("div", { class: "wg-set-group", key }, [
		heading ? h("span", { class: "wg-set-label", key: "label" }, heading) : null,
		h(List, { class: "wg-set-list", key: "list" }, rows),
		under ? h("p", { class: "wg-set-under", key: "under" }, under) : null,
	]);
}

function valueRow(parts) {
	return h(Row, { pressable: true, class: `wg-set-row${parts.unset ? " is-unset" : ""}` }, [
		parts.badge ? h(RowBadge, { class: "wg-set-badge", key: "badge" }, parts.badge) : null,
		h(RowLabel, { key: "label" }, parts.label),
		h(RowValue, { class: `wg-set-value${parts.unset ? " is-unset" : ""}`, key: "value" }, parts.value),
		h(Icon, { name: "chevron", class: "wg-set-chev" }),
	]);
}

function reportRow(key, label, note, value, on) {
	return h(Row, { class: "wg-set-row", key }, [
		h(RowLabel, { class: "wg-set-two", key: "label" }, [label, h("span", { class: "wg-set-sub", key: "sub" }, note)]),
		h(RowValue, { class: `wg-set-value${on ? "" : " is-unset"}`, key: "value" }, value),
	]);
}

function editorPopover(state, key, trigger, body) {
	return h(
		Popover,
		{
			key,
			class: "wg-set-pop",
			open: state.openRow === key,
			onOpenChange: (next) => state.openEditor(next ? key : null),
			trigger,
		},
		body,
	);
}

function popoverFoot(state, onReset, onApply) {
	return h("div", { class: "wg-set-pop-foot", key: "foot" }, [
		h(Button, { size: "s", key: "reset", onClick: onReset }, "Reset"),
		h(
			Button,
			{
				size: "s",
				variant: "accent",
				key: "apply",
				onClick: () => {
					onApply(state.draft ?? "");
					state.openEditor(null);
				},
			},
			"Apply",
		),
	]);
}

function textEditor(state, fallback, onApply) {
	return h("div", { class: "wg-set-pop-body" }, [
		h(Field, {
			block: true,
			key: "field",
			value: state.draft ?? "",
			placeholder: fallback === undefined || fallback === null ? "" : String(fallback),
			onInput: (event) => state.setDraft(event.target.value),
		}),
		popoverFoot(state, () => state.setDraft(fallback === undefined || fallback === null ? "" : String(fallback)), onApply),
	]);
}

function settingRows(state) {
	const { manifest, tile, onPatch } = state;
	const held = tile.settings ?? {};
	return (manifest.settings ?? []).map((field) => {
		const label = field.label ?? field.key;
		const write = (value) => onPatch({ settings: { ...held, [field.key]: value } });
		if (field.type === "boolean") {
			return h(Row, { class: "wg-set-row", key: field.key }, [
				h(RowLabel, { key: "label" }, label),
				h(RowValue, { class: "wg-set-value", key: "value" }, h(Switch, { checked: Boolean(held[field.key] ?? field.default), onChange: write, label })),
			]);
		}
		const value = shownValue(held[field.key], field.default);
		const trigger = valueRow({ label, value: value ?? "Empty", unset: value === null });
		const apply = (typed) => write(field.type === "number" ? Number(typed) : typed);
		return editorPopover(state, `setting:${field.key}`, trigger, textEditor(state, field.default, apply));
	});
}

function sourceGroups(state) {
	const { manifest, tile, host, onPatch, countReaders } = state;
	const bindings = tile.sources ?? {};
	const folders = foldersOf(host);
	const declaredSources = Object.entries(manifest.sources ?? {});

	return declaredSources.map(([key, source]) => {
		const label = source.label ?? key;
		const declared = source.default?.path ?? "";
		const own = bindings[key]?.path ?? "";
		const path = own || declared;
		const write = (value) => onPatch({ sources: { ...bindings, [key]: { ...(bindings[key] ?? {}), path: value } } });

		const trigger = valueRow({
			badge: h(Icon, { name: "folder" }),
			label,
			value: path ? h("span", { class: "wg-set-path" }, path) : "Pick a folder",
			unset: own === "",
		});

		const needle = String(state.draft ?? "").toLowerCase();
		const offered = folders.filter((folder) => folder.toLowerCase().includes(needle)).slice(0, FOLDERS_SHOWN);
		const body = h("div", { class: "wg-set-pop-body" }, [
			h(Field, {
				block: true,
				key: "field",
				icon: h(Icon, { name: "search" }),
				value: state.draft ?? "",
				placeholder: declared || "Folder in the vault",
				onInput: (event) => state.setDraft(event.target.value),
			}),
			...offered.map((folder) =>
				h(PopoverItem, { key: folder, checked: folder === path, onClick: () => state.setDraft(folder) }, [
					h("span", { class: "wg-set-pop-name", key: "name" }, folder),
					h(Icon, { name: "tick", class: "wg-set-tick" }),
				]),
			),
			popoverFoot(state, () => state.setDraft(declared), write),
		]);

		const readers = countReaders(path);
		const under = path && readers > 1 ? `${readers} widgets on this board read this folder.` : null;
		return group(`source:${key}`, declaredSources.length > 1 ? `Source · ${label}` : "Source", editorPopover(state, `source:${key}`, trigger, body), under);
	});
}

function slotRows(state) {
	const { manifest, tile, registry, onPatch } = state;
	const picks = tile.slots ?? {};
	return Object.entries(manifest.slots ?? {}).map(([name, spec]) => {
		const chosen = picks[name] ?? spec.default ?? "";
		const held = registry.get(chosen);
		const write = (id) => {
			const { [name]: dropped, ...rest } = picks;
			onPatch({ slots: id ? { ...picks, [name]: id } : rest });
			state.openEditor(null);
		};
		const trigger = valueRow({
			badge: h(Icon, { name: "check" }),
			label: titleCase(name),
			value: held?.manifest?.title ?? chosen ?? "Nothing",
			unset: !chosen,
		});
		const body = h("div", { class: "wg-set-pop-body" }, [
			...registry.list().map((definition) =>
				h(PopoverItem, { key: definition.manifest.id, checked: definition.manifest.id === chosen, onClick: () => write(definition.manifest.id) }, [
					h("span", { class: "wg-set-pop-name", key: "name" }, definition.manifest.title ?? definition.manifest.id),
					h(Icon, { name: "tick", class: "wg-set-tick" }),
				]),
			),
			spec.default ? h(PopoverSeparator, { key: "sep" }) : null,
			spec.default ? h(PopoverItem, { key: "default", class: "wg-set-pop-default", onClick: () => write(null) }, h("span", { class: "wg-set-pop-name" }, "Back to the widget's default")) : null,
		]);
		return editorPopover(state, `slot:${name}`, trigger, body);
	});
}

function idsOf(value) {
	if (Array.isArray(value)) return value;
	return String(value ?? "")
		.split(",")
		.map((id) => id.trim())
		.filter(Boolean);
}

function mountGroups(state) {
	const { manifest, tile, registry, onPatch } = state;
	const held = tile.settings ?? {};
	return Object.keys(manifest.mounts ?? {}).map((name) => {
		const ids = idsOf(held[name] ?? (manifest.settings ?? []).find((field) => field.key === name)?.default);
		const write = (next) => onPatch({ settings: { ...held, [name]: next.join(", ") } });
		const rows = ids.map((id, index) => {
			const found = registry.get(id);
			return h(Row, { class: "wg-set-row", key: `${id}#${index}` }, [
				h(RowLabel, { class: "wg-set-two", key: "label" }, [found?.manifest?.title ?? id, h("span", { class: "wg-set-sub is-mono", key: "sub" }, id)]),
				h(RowValue, { class: "wg-set-value", key: "value" }, [
					found?.component ? null : h(Pill, { tone: "error", key: "gone" }, "Not installed"),
					h(IconButton, { size: "s", key: "drop", label: "Remove", onClick: () => write(ids.filter((entry, at) => at !== index)) }, h(Icon, { name: "close" })),
				]),
			]);
		});
		const trigger = h(Row, { pressable: true, class: "wg-set-row is-add" }, [h(Icon, { name: "plus" }), h(RowLabel, { key: "label" }, "Add a view")]);
		const body = h(
			"div",
			{ class: "wg-set-pop-body" },
			registry.list().map((definition) =>
				h(
					PopoverItem,
					{
						key: definition.manifest.id,
						onClick: () => {
							write([...ids, definition.manifest.id]);
							state.openEditor(null);
						},
					},
					h("span", { class: "wg-set-pop-name" }, definition.manifest.title ?? definition.manifest.id),
				),
			),
		);
		return group(`mount:${name}`, titleCase(name), [...rows, editorPopover(state, `mount:${name}`, trigger, body)], null);
	});
}

// CONTEXT: `{ spread: "@filters" }` is unreadable drawn literally, so the row is a sentence
function filterSentence(row) {
	if (typeof row.spread === "string") return "everything that source has set";
	return `${row.prop} ${row.op ?? "is"} ${String(row.value)}`;
}

function filterRaw(row) {
	return typeof row.spread === "string" ? `spread ${row.spread}` : `${row.prop}: ${row.op ?? "is"} ${String(row.value)}`;
}

function dataGroups(state) {
	const { manifest, tile } = state;
	const bindings = tile.sources ?? {};
	const groups = [];

	for (const [key, source] of Object.entries(manifest.sources ?? {})) {
		const declared = source.default ?? {};
		const own = bindings[key] ?? {};
		const path = own.path || declared.path || "";
		const label = source.label ?? key;

		const filters = [...(declared.filters ?? []).map((row) => ({ row, fixed: true })), ...(own.filters ?? []).map((row) => ({ row, fixed: false }))];
		if (filters.length > 0) {
			groups.push(
				group(
					`filters:${key}`,
					`Filters · ${label}`,
					filters.map((entry, index) =>
						h(Row, { class: "wg-set-row", key: index }, [
							h(RowLabel, { class: "wg-set-two", key: "label" }, [filterSentence(entry.row), h("span", { class: "wg-set-sub is-mono", key: "sub" }, filterRaw(entry.row))]),
							h(RowValue, { class: "wg-set-value", key: "value" }, h(Pill, null, entry.fixed ? "Fixed" : "Yours")),
						]),
					),
					"These decide which data arrives. A filter the widget declares cannot be edited here.",
				),
			);
		}

		const sort = [...(declared.sort ?? []), ...(own.sort ?? [])];
		if (sort.length > 0) {
			groups.push(
				group(
					`sort:${key}`,
					`Sort · ${label}`,
					sort.map((row, index) =>
						h(Row, { class: "wg-set-row", key: index }, [
							h(RowLabel, { key: "label" }, row.prop),
							h(RowValue, { class: "wg-set-value", key: "value" }, row.dir === "desc" ? "Descending" : "Ascending"),
						]),
					),
					null,
				),
			);
		}

		const on = Boolean(path);
		groups.push(
			group(
				`can:${key}`,
				`What ${label} can do`,
				[
					reportRow("create", "Create", on ? `a new note lands in ${path}` : "nowhere to put it", on ? "On" : "Off", on),
					reportRow("update", "Update", on ? "writes frontmatter on the note it came from" : "no note to write to", on ? "On" : "Off", on),
					reportRow("open", "Open", on ? "opens the note in a pane" : "nothing listed", on ? "On" : "Off", on),
					reportRow("remove", "Remove", on ? "moves the note to the vault's trash" : "nothing to remove", on ? "On" : "Off", on),
				],
				on ? "All four follow the folder. Clear the path and all four go off together." : "One empty field turns the rows grey.",
			),
		);
	}

	if (groups.length > 0) return groups;
	return [group("no-data", "Data", h(Row, { class: "wg-set-row" }, h(RowLabel, null, "This widget declares no source")), null)];
}

function designGroups(state) {
	const { place, columns, onResize, isCollapsed, onCollapse, onExpand } = state;
	const sizeRow = (axis, label, cellsNow, apply) =>
		editorPopover(state, `size:${axis}`, valueRow({ label, value: `${cellsNow} cells` }), textEditor(state, String(cellsNow), (typed) => apply(Number(typed))));

	return [
		group(
			"size",
			"Size on the board",
			[
				sizeRow("w", "Width", place.w, (cellsWanted) => onResize({ w: clamp(Number.isFinite(cellsWanted) ? cellsWanted : place.w, 1, columns) })),
				sizeRow("h", "Height", place.h, (cellsWanted) => onResize({ h: Math.max(1, Number.isFinite(cellsWanted) ? cellsWanted : place.h) })),
			],
			"The widget is drawn at the size it has on the board, so a change here is visible behind the panel.",
		),
		group(
			"fold",
			"Folded",
			h(Row, { class: "wg-set-row" }, [
				h(RowLabel, { key: "label" }, "Fold to one column"),
				h(RowValue, { class: "wg-set-value", key: "value" }, h(Switch, { checked: isCollapsed, label: "Folded", onChange: (next) => (next ? onCollapse?.() : onExpand?.()) })),
			]),
			null,
		),
	];
}

function panelBody(state) {
	if (state.tab === "data") return dataGroups(state);
	if (state.tab === "design") return designGroups(state);
	return [
		...sourceGroups(state),
		state.manifest.settings?.length ? group("settings", "Settings", settingRows(state), null) : null,
		state.manifest.slots ? group("slots", "Slots", slotRows(state), "A slot is a hole this widget fills with another widget.") : null,
		...mountGroups(state),
	];
}

function header(state) {
	return h("div", { class: `wg-set-head wg-kit-glass${state.phone ? " is-sheet" : ""}`, key: "head" }, [
		h("span", { class: "wg-set-crumbs", key: "crumbs" }, h("span", { class: "wg-set-here" }, state.manifest.title ?? state.manifest.id)),
		h("span", { class: "wg-set-head-right", key: "right" }, [
			h(Pill, { key: "size" }, `${state.place.w} × ${state.place.h}`),
			// TRADE-OFF: both, and they do the same thing — every edit is already written, so
			// Done is what a person looks for and the cross is what they reach for by habit
			h(Button, { size: "s", variant: "accent", key: "done", onClick: state.onClose }, "Done"),
			h(DialogClose, { key: "close", onClose: state.onClose, label: "Close the settings" }),
		]),
	]);
}

function zoomBar(state) {
	const percent = `${Math.round(state.scale * 100)}%`;
	const said = state.opening.panned && state.zoom === null ? `${percent} · panned to the top left` : percent;
	return h("div", { class: "wg-set-bar wg-kit-glass", key: "bar", style: state.barStyle }, [
		h("button", { type: "button", key: "fit", "aria-pressed": String(state.zoom === null), onClick: () => state.setZoom(null) }, "Fit"),
		h("button", { type: "button", key: "one", "aria-pressed": String(state.live), onClick: () => state.setZoom(1) }, "1:1"),
		h("span", { class: "wg-set-div", key: "d1" }),
		h("button", { type: "button", key: "out", "aria-label": "Zoom out", onClick: () => state.setZoom(clamp(state.scale - ZOOM_STEP, ZOOM_FLOOR, 1)) }, "-"),
		h("button", { type: "button", key: "in", "aria-label": "Zoom in", onClick: () => state.setZoom(clamp(state.scale + ZOOM_STEP, ZOOM_FLOOR, 1)) }, "+"),
		h("span", { class: "wg-set-said", key: "said" }, said),
		state.canNarrow ? h("span", { class: "wg-set-div", key: "d2" }) : null,
		state.canNarrow ? h("button", { type: "button", key: "narrow", "aria-pressed": String(state.narrow), onClick: () => state.setNarrow(!state.narrow) }, "Narrow") : null,
		h("span", { class: "wg-set-div", key: "d3" }),
		h(
			"button",
			{ type: "button", key: "fold", "aria-pressed": String(state.folded), "aria-label": "Fold the settings away", onClick: () => state.setFolded(!state.folded) },
			h(Icon, { name: "fold" }),
		),
	]);
}

function panel(state) {
	if (state.folded) {
		return h(
			IconButton,
			{ key: "panel", class: "wg-set-fold wg-kit-glass", label: "Bring the settings back", style: state.panelStyle, onClick: () => state.setFolded(false) },
			h(Icon, { name: "chevron" }),
		);
	}
	return h("aside", { class: `wg-set-panel wg-kit-glass${state.phone ? " is-sheet" : ""}`, key: "panel", style: state.panelStyle }, [
		state.phone
			? h("button", {
					type: "button",
					class: "wg-set-grip",
					key: "grip",
					"aria-label": "Raise the sheet",
					"aria-pressed": String(state.sheetFull),
					onClick: () => state.setSheetFull(!state.sheetFull),
			  })
			: null,
		h(Segmented, { key: "tabs", class: "wg-set-tabs", items: TABS, value: state.tab, onChange: state.setTab }),
		h("div", { class: "wg-set-scroll", key: "scroll" }, panelBody(state)),
		h("div", { class: "wg-set-foot", key: "foot" }, h("code", null, state.manifest.id)),
	]);
}

// THE GRID IS THE CANVAS, NOT WALLPAPER BEHIND IT — it is what says how big the widget is, so
// it takes the canvas scale and starts on the widget's corner. Drawn at a fixed pitch, a widget
// said to be 12 cells stopped covering 12 of them the moment anybody pressed +.
function cellLayer(box, at, scale, cell, gap) {
	const pitch = cell + gap;
	const step = pitch * scale;
	// the lattice line at or before the window's left edge, counted back from the widget's corner
	const left = at.x - Math.ceil(Math.max(0, at.x) / step) * step;
	const top = at.y - Math.ceil(Math.max(0, at.y) / step) * step;
	const across = Math.max(1, Math.ceil((box.width - left) / step));
	const down = Math.max(1, Math.ceil((box.height - top) / step));
	const held = [];
	for (let index = 0; index < across * down; index += 1) held.push(h("i", { key: index }));
	return h(
		"div",
		{
			class: "wg-set-cells",
			key: "cells",
			style: {
				left: `${left}px`,
				top: `${top}px`,
				width: `${across * pitch - gap}px`,
				transform: `scale(${scale})`,
				"--wg-set-across": across,
			},
		},
		held,
	);
}

// CONTEXT: below 1:1 a press pans and a tap snaps to 1:1 on the point it landed
function panHandlers(state) {
	return {
		onPointerDown: (event) => {
			const rect = event.currentTarget.getBoundingClientRect();
			const start = { x: event.clientX, y: event.clientY };
			const from = { ...state.at };
			let moved = false;
			const move = (pointer) => {
				const dx = pointer.clientX - start.x;
				const dy = pointer.clientY - start.y;
				if (Math.abs(dx) > TAP_SLOP_PX || Math.abs(dy) > TAP_SLOP_PX) moved = true;
				if (moved) state.setPan({ x: from.x + dx, y: from.y + dy });
			};
			const stop = (pointer) => {
				window.removeEventListener("pointermove", move);
				window.removeEventListener("pointerup", stop);
				if (moved || state.live) return;
				const px = pointer.clientX - rect.left;
				const py = pointer.clientY - rect.top;
				state.setPan({ x: px - (px - from.x) / state.scale, y: py - (py - from.y) / state.scale });
				state.setZoom(1);
			};
			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", stop);
		},
	};
}

function startingDraft(key, options) {
	const [kind, name] = String(key).split(":");
	const manifest = options.definition?.manifest ?? {};
	if (kind === "setting") {
		const field = (manifest.settings ?? []).find((entry) => entry.key === name);
		const held = options.tile.settings?.[name] ?? field?.default;
		return held === undefined || held === null ? "" : String(held);
	}
	if (kind === "source") return options.tile.sources?.[name]?.path ?? manifest.sources?.[name]?.default?.path ?? "";
	if (kind === "size") return String(name === "w" ? options.place.w : options.place.h);
	return "";
}

// TRADE-OFF: one keyed record, not eight resets in an effect — an effect that resets on open
// RACES the first press, and wiped the popover the person had just opened
const FRESH = { tab: "settings", zoom: null, pan: null, folded: false, narrow: false, sheetFull: false, openRow: null, draft: "" };

export function useSettingsWindow(options) {
	const { session, definition, tile, place, widget, cell, gap, phone, host, registry, columns, onPatch, onClose, onResize, onCollapse, onExpand, countReaders } = options;
	const [phase, key] = String(session ?? "").split(":");
	const open = phase === "open";
	const closing = phase === "closing";
	const [held, setHeld] = useState(null);
	const view = held && held.key === key ? held : { ...FRESH, key };
	const put = (patch) => setHeld({ ...view, ...patch });
	const { tab, zoom, pan, folded, narrow, sheetFull, openRow, draft } = view;
	const setTab = (next) => put({ tab: next });
	const setZoom = (next) => put({ zoom: next });
	const setPan = (next) => put({ pan: next });
	// CONTEXT: zoom and pan move TOGETHER on a pinch, and two puts in one handler lose the first
	const setLook = (patch) => put(patch);
	const setFolded = (next) => put({ folded: next });
	const setNarrow = (next) => put({ narrow: next });
	const setSheetFull = (next) => put({ sheetFull: next });
	const setDraft = (next) => put({ draft: next });

	const viewport = useViewport();
	useHeldScroll(open);

	useEffect(() => {
		if (!open) return;
		const closeOnEscape = (event) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", closeOnEscape, true);
		return () => document.removeEventListener("keydown", closeOnEscape, true);
	}, [open, onClose]);

	if (!open && !closing) return { shown: false, dialog: null };

	const manifest = definition?.manifest ?? {};
	const frame = dialogBox(viewport, phone);
	const windowBox = { width: frame.width, height: frame.height };
	const layout = {
		...CHROME,
		sheet: phone,
		panelWidthPx: folded ? CHROME.foldedPanelPx : CHROME.panelWidthPx,
		sheetPeekPx: folded ? CHROME.foldedPanelPx : CHROME.sheetPeekPx,
	};
	const free = freeArea(windowBox, layout);

	const wanted = { width: spanToPixels(place.w, cell, gap), height: spanToPixels(place.h, cell, gap) };
	const canNarrow = typeof manifest.collapseBelowPx === "number";
	const showingChip = canNarrow && narrow;
	const canvas = showingChip ? { width: manifest.collapseBelowPx - 1, height: wanted.height } : wanted;

	const opening = openingScale(canvas, free, CHROME.floorScale);
	const scale = zoom ?? opening.scale;
	const live = scale === 1;
	const at = clampPan(pan ?? openingPan(canvas, free, opening), canvas, scale, free, cell);

	const state = {
		manifest,
		tile,
		place,
		host,
		registry,
		columns,
		onPatch,
		onClose,
		onResize,
		onCollapse,
		onExpand,
		countReaders,
		tab,
		setTab,
		zoom,
		setZoom,
		scale,
		live,
		opening,
		at,
		setPan,
		setLook,
		folded,
		setFolded,
		narrow,
		setNarrow,
		canNarrow,
		phone,
		sheetFull,
		setSheetFull,
		openRow,
		openEditor: (next) => put({ openRow: next, draft: next ? startingDraft(next, options) : "" }),
		draft,
		setDraft,
		isCollapsed: Boolean(tile.folded),
		panelStyle: folded
			? { right: `${CHROME.padPx}px`, top: `${CHROME.padPx}px`, width: `${CHROME.foldedPanelPx}px`, height: `${CHROME.foldedPanelPx}px` }
			: phone
			? {
					left: `${CHROME.padPx}px`,
					right: `${CHROME.padPx}px`,
					bottom: `${CHROME.padPx}px`,
					top: sheetFull ? `${CHROME.padPx + CHROME.headerHeightPx + CHROME.gapPx}px` : "auto",
					height: sheetFull ? "auto" : `${CHROME.sheetPeekPx}px`,
			  }
			: {
					right: `${CHROME.padPx}px`,
					top: `${CHROME.padPx}px`,
					bottom: `${CHROME.padPx}px`,
					width: `${CHROME.panelWidthPx}px`,
			  },
		barStyle: phone && !folded ? { bottom: `${CHROME.padPx + CHROME.sheetPeekPx + CHROME.gapPx}px` } : null,
	};

	const canvasStyle = { left: `${at.x}px`, top: `${at.y}px`, width: `${canvas.width}px`, height: `${canvas.height}px` };
	const bodyStyle = {
		...canvasStyle,
		position: "absolute",
		transform: live ? "none" : `scale(${scale})`,
		transformOrigin: "top left",
		visibility: showingChip ? "hidden" : "visible",
	};

	// THE WIDGET TRAVELS INTO THE WINDOW. It is the same widget the board draws, drawn again at
	// the size the board gives it — which is what makes a size edit visible while it is made.
	const parts = [
		cellLayer(windowBox, at, scale, cell, gap),
		h("div", { class: "wg-set-pan", key: "pan", ...panHandlers(state) }),
		h("div", { class: `wg-set-body${live ? " is-live" : ""}`, key: "body", style: bodyStyle }, widget),
		showingChip
			? h(
					"div",
					{ class: "wg-set-chip", key: "chip", style: canvasStyle },
					h("div", { class: "wg-narrow" }, [
						h("span", { class: "wg-narrow-mark" }, initialOf(manifest.title ?? manifest.id)),
						h("span", { class: "wg-narrow-open" }, "Narrow"),
					]),
			  )
			: null,
		live ? null : h("div", { class: "wg-set-look", key: "look", ...panHandlers(state) }),
		h("div", { class: `wg-set-chrome${closing ? " is-leaving" : ""}`, key: "chrome" }, [header(state), panel(state), zoomBar(state)]),
	];

	const dialog = h(
		DialogOverlay,
		{ class: `wg-set-over${closing ? " is-leaving" : ""}`, onClose },
		h(
			"div",
			{
				class: `wg-set-window${closing ? " is-leaving" : ""}`,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": `${manifest.title ?? manifest.id} settings`,
				tabIndex: -1,
				// the grid inside is drawn in CELLS, and the cell tokens live on the BOARD's element.
				// The window is portaled onto <body> and inherits from nothing, so it carries its own.
				style: {
					inset: `${frame.inset}px`,
					"--wg-cell": `${cell}px`,
					"--wg-gap": `${gap}px`,
				},
			},
			parts,
		),
	);

	return { shown: true, live, dialog };
}
