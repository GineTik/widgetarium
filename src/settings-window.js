import { createElement as h } from "react";
import { useEffect, useRef, useState } from "react";
import { declaredName } from "./registry.js";
import { heldKey, heldTile, mountRows, mountSetting, rekeyed, uniqueName } from "./model.js";
import { DialogClose, DialogOverlay } from "./dialog.js";
import { Button, Field, Icon, IconButton, List, Pill, Popover, PopoverItem, Row, RowBadge, RowLabel, RowValue, Segmented, Sidebar, SidebarGroup, SidebarRow, SidebarSheet, Switch } from "./kit.js";
import { CatalogueDialog } from "./catalogue-dialog.js";
import { slotFit } from "./fit.js";
import { spanToPixels } from "./layout.js";
import { CHROME, barPlacement, clampPan, dialogBox, freeArea, openingPan, openingScale } from "./settings-fit.js";

const TABS = [
	{ value: "settings", label: "Settings" },
	{ value: "data", label: "Data" },
	{ value: "design", label: "Design" },
];

const ZOOM_STEP = 0.1;
const ZOOM_FLOOR = 0.25;
// CONTEXT: measured on a trackpad — one comfortable swipe is ~50 units, and at 0.001 that moved
// the zoom by 5%, which reads as nothing happening. 0.003 turns the same swipe into about 15%.
const ZOOM_PER_WHEEL_UNIT = 0.003;
// TRADE-OFF: a trackpad reports small deltas and the canvas is large, so panning 1:1 with the
// fingers crawls — the canvas travels twice as far as they do
const PAN_PER_WHEEL_UNIT = 2;
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
	return h(SidebarGroup, { className: "wg-set-group", key, label: heading, hint: under }, rows);
}

function valueRow(parts) {
	return h(SidebarRow, {
		className: "wg-set-row",
		pressable: true,
		unset: parts.unset,
		onClick: parts.onClick,
		icon: parts.badge,
		label: parts.label,
		sub: parts.sub,
		value: parts.value,
		after: parts.after ?? h(Icon, { name: "chevron", className: "wg-set-chev", key: "chev" }),
	});
}

// PERMANENTLY VISIBLE, NEVER ON HOVER. Gutenberg shipped a hover-only parent selector, called it
// a usability mistake, and was still adding a back button to it five years later.
function enterButton(state, step) {
	return h(
		IconButton,
		{
			size: "s",
			key: "enter",
			className: "wg-set-enter",
			label: "Open its own settings",
			onClick: (event) => {
				event.stopPropagation();
				state.enter(step);
			},
		},
		h(Icon, { name: "chevron" }),
	);
}

function reportRow(key, label, note, value, on) {
	return h(Row, { className: "wg-set-row", key }, [
		h(RowLabel, { className: "wg-set-two", key: "label" }, [label, h("span", { className: "wg-set-sub", key: "sub" }, note)]),
		h(RowValue, { className: `wg-set-value${on ? "" : " is-unset"}`, key: "value" }, value),
	]);
}

function editorPopover(state, key, trigger, body, seed) {
	return h(
		Popover,
		{
			key,
			className: "wg-set-pop",
			open: state.openRow === key,
			onOpenChange: (next) => state.openEditor(next ? key : null, seed),
			trigger,
		},
		body,
	);
}

function popoverFoot(state, onReset, onApply) {
	return h("div", { className: "wg-set-pop-foot", key: "foot" }, [
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
	return h("div", { className: "wg-set-pop-body" }, [
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

function settingRows(state, wanted = (field) => !field.design) {
	const { manifest, tile, onPatch } = state;
	const held = tile.settings ?? {};
	return (manifest.settings ?? []).filter(wanted).map((field) => {
		const label = field.label ?? field.key;
		const write = (value) => onPatch({ settings: { ...held, [field.key]: value } });
		if (field.type === "boolean") {
			return h(Row, { className: "wg-set-row", key: field.key }, [
				h(RowLabel, { key: "label" }, label),
				h(RowValue, { className: "wg-set-value", key: "value" }, h(Switch, { checked: Boolean(held[field.key] ?? field.default), onChange: write, label })),
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
			value: path ? h("span", { className: "wg-set-path" }, path) : "Pick a folder",
			unset: own === "",
		});

		const needle = String(state.draft ?? "").toLowerCase();
		const offered = folders.filter((folder) => folder.toLowerCase().includes(needle)).slice(0, FOLDERS_SHOWN);
		const body = h("div", { className: "wg-set-pop-body" }, [
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
					h("span", { className: "wg-set-pop-name", key: "name" }, folder),
				]),
			),
			popoverFoot(state, () => state.setDraft(declared), write),
		]);

		const readers = countReaders(path);
		const under = path && readers > 1 ? `${readers} widgets on this board read this folder.` : null;
		return group(`source:${key}`, declaredSources.length > 1 ? `Source · ${label}` : "Source", editorPopover(state, `source:${key}`, trigger, body), under);
	});
}

// A SLOT PICKER IS A CATALOGUE, NOT A LIST OF NAMES. What goes in a slot is drawn on every row of
// the parent, so the question is what it LOOKS like — and the same surface can rank the candidates
// against what this slot declares it hands down, which a list of titles cannot say anything about.
function slotRows(state) {
	const { manifest, tile, registry, host, onPatch } = state;
	const picks = tile.slots ?? {};
	return Object.entries(manifest.slots ?? {}).map(([name, spec]) => {
		const chosen = picks[name]?.widget ?? spec.default ?? "";
		const held = registry.get(chosen);
		const key = `slot:${name}`;
		// CONTEXT: a new widget in the slot is a new record — the old one's settings are not its
		const write = (id) => {
			const { [name]: dropped, ...rest } = picks;
			onPatch({ slots: id ? { ...picks, [name]: { widget: id } } : rest });
			state.openEditor(null);
		};
		// CONTEXT: a `gives` clause is the manifest saying the parent feeds this slot
		const fed = Object.keys(spec.gives ?? {});
		const row = valueRow({
			badge: h(Icon, { name: "check" }),
			label: titleCase(name),
			sub: fed.length ? `Fed ${fed.join(", ")}` : null,
			value: held?.manifest?.title ?? chosen ?? "Nothing",
			unset: !chosen,
			onClick: () => state.openEditor(key),
			after: fed.length === 0 && chosen ? enterButton(state, { hold: "slots", key: name, widget: chosen }) : null,
		});
		return h("div", { className: "wg-set-slot", key }, [
			row,
			state.openRow === key
				? h(CatalogueDialog, {
						key: "pick",
						registry,
						host,
						mode: "fill",
						rank: (candidate) => slotFit(candidate, spec.gives),
						foot: spec.default
							? h(Button, { size: "s", onClick: () => write(null) }, "Back to the widget's default")
							: null,
						onPick: write,
						onClose: () => state.openEditor(null),
				  })
				: null,
		]);
	});
}

// CONTEXT: the row's name IS the record's key, so a rename has to carry the record with it
function movedRecord(held, from, to) {
	if (from === to || !held?.[from]) return held ?? {};
	const { [from]: moved, ...rest } = held;
	return { ...rest, [to]: moved };
}

// CONTEXT: every other row keeps its name, so a rename never moves a record it did not touch
function renamed(rows, index, wanted) {
	const taken = new Set(rows.filter((row, at) => at !== index).map((row) => row.name));
	return rows.map((row, at) => (at === index ? { ...row, name: uniqueName(taken, wanted) } : row));
}

function mountRow(state, rows, index, write, rename) {
	const { registry } = state;
	const row = rows[index];
	const found = registry.get(row.widget);
	const key = `mount:${row.widget}:${index}`;
	const drop = (event) => {
		event.stopPropagation();
		write(rows.filter((entry, at) => at !== index));
	};
	// A NAME IS RENAMED WHERE IT IS READ. The row is the trigger, so the thing pressed is the
	// thing edited — the same move a text setting already makes, and no second control for it.
	const trigger = h(Row, { pressable: true, className: "wg-set-row" }, [
		h(RowLabel, { className: "wg-set-two", key: "label" }, [row.name, h("span", { className: "wg-set-sub is-mono", key: "sub" }, row.widget)]),
		h(RowValue, { className: "wg-set-value", key: "value" }, [
			found?.component ? null : h(Pill, { tone: "error", key: "gone" }, "Not installed"),
			// CONTEXT: a mount is never fed, so it always has its own settings inside it
			found?.component ? enterButton(state, { hold: "mounted", key: row.name, was: row.was, widget: row.widget }) : null,
			h(IconButton, { size: "s", key: "drop", label: "Remove", onClick: drop }, h(Icon, { name: "close" })),
		]),
	]);
	const apply = (typed) => rename(renamed(rows, index, typed.trim() || declaredName(registry, row.widget)), index);
	return editorPopover(state, key, trigger, textEditor(state, row.name, apply), row.name);
}

// TRADE-OFF: no rank — a mount hands nothing down, so slotFit has no clause to weigh
function mountGroups(state) {
	const { manifest, tile, registry, host, onPatch } = state;
	const held = tile.settings ?? {};
	return Object.entries(manifest.mounts ?? {}).map(([name, spec]) => {
		const rows = mountRows(mountSetting(held, name, spec), (id) => declaredName(registry, id));
		// CONTEXT: the setting's old key goes in the same write, so the next read has one answer
		const write = (next, moved) => {
			const { [spec?.was]: dropped, ...rest } = held;
			const settings = { ...rest, [name]: next.map((row) => ({ name: row.name, widget: row.widget })) };
			onPatch(moved ? { settings, mounted: moved } : { settings });
		};
		const add = (id) => {
			write([...rows, { name: uniqueName(new Set(rows.map((row) => row.name)), declaredName(registry, id)), widget: id }]);
			state.openEditor(null);
		};
		const key = `mount:${name}`;
		const trigger = h(Row, { pressable: true, className: "wg-set-row is-add", onClick: () => state.openEditor(key) }, [
			h(Icon, { name: "plus" }),
			h(RowLabel, { key: "label" }, "Add a view"),
		]);
		const picker = h("div", { className: "wg-set-slot", key: "add" }, [
			trigger,
			state.openRow === key
				? h(CatalogueDialog, {
						key: "pick",
						registry,
						host,
						mode: "mount",
						onPick: add,
						onClose: () => state.openEditor(null),
				  })
				: null,
		]);
		// CONTEXT: the record sits under the old name, or still under the widget id it arrived as
		const rename = (next, index) =>
			write(next, movedRecord(tile.mounted, heldKey(tile.mounted, rows[index].name, rows[index].was), next[index].name));
		const drawn = rows.map((row, index) => mountRow(state, rows, index, write, rename));
		return group(key, spec?.label ?? titleCase(name), [...drawn, picker], spec?.hint ?? null);
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
						h(Row, { className: "wg-set-row", key: index }, [
							h(RowLabel, { className: "wg-set-two", key: "label" }, [filterSentence(entry.row), h("span", { className: "wg-set-sub is-mono", key: "sub" }, filterRaw(entry.row))]),
							h(RowValue, { className: "wg-set-value", key: "value" }, h(Pill, null, entry.fixed ? "Fixed" : "Yours")),
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
						h(Row, { className: "wg-set-row", key: index }, [
							h(RowLabel, { key: "label" }, row.prop),
							h(RowValue, { className: "wg-set-value", key: "value" }, row.dir === "desc" ? "Descending" : "Ascending"),
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
	return [group("no-data", "Data", h(Row, { className: "wg-set-row" }, h(RowLabel, null, "This widget declares no source")), null)];
}

function designGroups(state) {
	const { place, columns, onResize, isCollapsed, onCollapse, onExpand } = state;
	const own = settingRows(state, (field) => field.design === true);
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
			h(Row, { className: "wg-set-row" }, [
				h(RowLabel, { key: "label" }, "Fold to one column"),
				h(RowValue, { className: "wg-set-value", key: "value" }, h(Switch, { checked: isCollapsed, label: "Folded", onChange: (next) => (next ? onCollapse?.() : onExpand?.()) })),
			]),
			null,
		),
		own.length > 0 ? group("design:own", "This widget", own, null) : null,
	].filter(Boolean);
}

// CONTEXT: a widget writing a key nobody reads looks configured and steers nothing
function unheard(state) {
	const heard = state.boardConsumes;
	if (!heard) return null;
	const mute = (state.manifest.provides ?? []).filter((key) => !heard.includes(key));
	if (mute.length === 0) return null;
	return `Nothing on this board reads ${mute.join(", ")}, so these settings steer nothing yet.`;
}

function panelBody(state) {
	if (state.tab === "data") return dataGroups(state);
	if (state.tab === "design") return designGroups(state);
	return [
		...sourceGroups(state),
		state.manifest.settings?.length ? group("settings", "Settings", settingRows(state), unheard(state)) : null,
		state.manifest.slots ? group("slots", "Slots", slotRows(state), "A slot is a hole this widget fills with another widget.") : null,
		...mountGroups(state),
	];
}

// A BREADCRUMB, NOT A TREE. It is what Gutenberg shipped after reverting click-through, and it is
// enough at this depth.
function crumbTrail(state) {
	const last = state.crumbs.length - 1;
	return state.crumbs.flatMap((crumb, depth) =>
		depth === last
			? [h("span", { className: "wg-set-here", key: depth }, crumb)]
			: [
					h("button", { type: "button", className: "wg-set-crumb", key: depth, onClick: () => state.popTo(depth) }, crumb),
					h("span", { className: "wg-set-crumb-sep", key: `sep${depth}`, "aria-hidden": "true" }, "\u203a"),
			  ],
	);
}

function header(state) {
	return h("div", { className: `wg-set-head wg-kit-glass${state.phone ? " is-sheet" : ""}`, key: "head" }, [
		h("span", { className: "wg-set-crumbs", key: "crumbs" }, crumbTrail(state)),
		h("span", { className: "wg-set-head-right", key: "right" }, [
			// CONTEXT: the size is the tile's place on the board, which nothing below the root has
			state.crumbs.length > 1 ? null : h(Pill, { key: "size" }, `${state.place.w} × ${state.place.h}`),
			// TRADE-OFF: both, and they do the same thing — every edit is already written, so
			// Done is what a person looks for and the cross is what they reach for by habit
			h(Button, { size: "s", variant: "accent", key: "done", onClick: () => state.onDone() }, "Done"),
			h(DialogClose, { key: "close", onClose: () => state.onDismiss(), label: "Close without keeping the changes" }),
		]),
	]);
}

function zoomBar(state) {
	const percent = `${Math.round(state.scale * 100)}%`;
	const said = state.opening.panned && state.zoom === null ? `${percent} · panned to the top left` : percent;
	return h("div", { className: `wg-set-bar wg-kit-glass${state.barHidden ? " is-hidden" : ""}`, key: "bar", style: state.barStyle }, [
		h("button", { type: "button", key: "fit", "aria-pressed": String(state.zoom === null), onClick: () => state.setZoom(null) }, "Fit"),
		h("button", { type: "button", key: "one", "aria-pressed": String(state.live), onClick: () => state.setZoom(1) }, "1:1"),
		h("span", { className: "wg-set-div", key: "d1" }),
		h("button", { type: "button", key: "out", "aria-label": "Zoom out", onClick: () => state.setZoom(clamp(state.scale - ZOOM_STEP, ZOOM_FLOOR, 1)) }, "-"),
		h("button", { type: "button", key: "in", "aria-label": "Zoom in", onClick: () => state.setZoom(clamp(state.scale + ZOOM_STEP, ZOOM_FLOOR, 1)) }, "+"),
		h("span", { className: "wg-set-said", key: "said" }, said),
		state.canNarrow ? h("span", { className: "wg-set-div", key: "d2" }) : null,
		state.canNarrow ? h("button", { type: "button", key: "narrow", "aria-pressed": String(state.narrow), onClick: () => state.setNarrow(!state.narrow) }, "Narrow") : null,
		h("span", { className: "wg-set-div", key: "d3" }),
		h(
			"button",
			{ type: "button", key: "fold", "aria-pressed": String(state.folded), "aria-label": "Fold the settings away", onClick: () => state.setFolded(!state.folded) },
			h(Icon, { name: state.folded ? "fold" : "chevron" }),
		),
	]);
}

function panel(state) {
	if (state.folded) {
		return h(
			IconButton,
			{ key: "panel", className: "wg-set-fold wg-kit-glass", label: "Bring the settings back", style: state.panelStyle, onClick: () => state.setFolded(false) },
			h(Icon, { name: "fold" }),
		);
	}
	const inside = [
		h(Segmented, { key: "tabs", className: "wg-set-tabs", items: state.tabs, value: state.tab, onChange: state.setTab }),
		h("div", { className: "wg-set-scroll", key: "scroll" }, panelBody(state)),
		h("div", { className: "wg-set-foot", key: "foot" }, h("code", null, state.manifest.id)),
	];

	// CONTEXT: on a phone the panel IS a sheet, and the kit owns what a sheet does — the grip,
	// the drag, the point of no return and the spring
	if (state.phone) {
		return h(
			SidebarSheet,
			{
				as: "aside",
				key: "panel",
				surface: "glass",
				className: "wg-set-panel is-sheet",
				style: state.panelStyle,
				open: state.sheetFull,
				onOpen: state.setSheetFull,
				peekPx: state.sheetPeekPx,
				maxPx: state.sheetMaxPx,
				onHeight: state.setSheetHeight,
			},
			inside,
		);
	}

	return h(Sidebar, { as: "aside", surface: "glass", className: "wg-set-panel", key: "panel", style: state.panelStyle }, inside);
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
			className: "wg-set-cells",
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

// THE WHEEL DRIVES THE PLAYGROUND. A trackpad pinch arrives as a wheel event with ctrlKey set —
// the browser reports it that way and there is no separate gesture — so pinch and ctrl+wheel are
// one path, and a plain two-finger swipe is the other.
// TRADE-OFF: a wheel over the widget pans the canvas instead of scrolling the widget. At 1:1 the
// widget is the thing being looked at, not used; the chrome is exempt so its lists still scroll.
function wheelHandler(state) {
	return (event) => {
		if (event.target?.closest?.(".wg-set-chrome")) return;
		event.preventDefault();

		const rect = event.currentTarget.getBoundingClientRect();
		const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };

		if (!(event.ctrlKey || event.metaKey)) {
			state.setLook({
				pan: {
					x: state.at.x - event.deltaX * PAN_PER_WHEEL_UNIT,
					y: state.at.y - event.deltaY * PAN_PER_WHEEL_UNIT,
				},
			});
			return;
		}

		// the point under the cursor is the one that must not move, so the canvas corner moves
		// by whatever keeps it still — zooming about the corner slides the whole picture away
		const wanted = clamp(state.scale * Math.exp(-event.deltaY * ZOOM_PER_WHEEL_UNIT), ZOOM_FLOOR, 1);
		if (wanted === state.scale) return;
		const ratio = wanted / state.scale;
		state.setLook({
			zoom: wanted,
			pan: { x: pointer.x - (pointer.x - state.at.x) * ratio, y: pointer.y - (pointer.y - state.at.y) * ratio },
		});
	};
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

function startingDraft(key, here, place) {
	const [kind, name] = String(key).split(":");
	if (kind === "setting") {
		const field = (here.manifest.settings ?? []).find((entry) => entry.key === name);
		const held = here.tile.settings?.[name] ?? field?.default;
		return held === undefined || held === null ? "" : String(held);
	}
	if (kind === "source") return here.tile.sources?.[name]?.path ?? here.manifest.sources?.[name]?.default?.path ?? "";
	if (kind === "size") return String(name === "w" ? place.w : place.h);
	return "";
}

// ONE TRIPLE, ADDRESSED BY THE PATH. Everything the panel draws below the root reads the record
// the path names — its own manifest, its own record, and a write that lands inside it.
function addressed(options, path) {
	const root = options.definition?.manifest ?? {};
	let manifest = root;
	let tile = options.tile;
	let onPatch = options.onPatch;
	const crumbs = [root.title ?? root.id ?? "Widget"];
	for (const step of path) {
		const held = tile[step.hold] ?? {};
		const write = onPatch;
		manifest = options.registry.get(step.widget)?.manifest ?? { id: step.widget };
		tile = heldTile(tile, step.hold, heldKey(held, step.key, step.was), step.widget);
		onPatch = (patch) => write({ [step.hold]: rekeyed(held, step.key, step.was, { widget: step.widget, ...patch }) });
		crumbs.push(manifest.title ?? manifest.id);
	}
	return { manifest, tile, onPatch, crumbs };
}

// CONTEXT: a child has no place on the board, so there is no width, height or fold to draw
const CHILD_TABS = TABS.filter((entry) => entry.value !== "design");

// TRADE-OFF: one keyed record, not eight resets in an effect — an effect that resets on open
// RACES the first press, and wiped the popover the person had just opened
const FRESH = { tab: "settings", zoom: null, pan: null, folded: false, narrow: false, sheetFull: false, openRow: null, draft: "", path: [] };

export function useSettingsWindow(options) {
	const { session, definition, tile, place, widget, cell, gap, phone, host, registry, columns, onDone, onDismiss, onResize, onCollapse, onExpand, countReaders, boardConsumes } = options;
	const [phase, key] = String(session ?? "").split(":");
	const open = phase === "open";
	const closing = phase === "closing";
	const [held, setHeld] = useState(null);
	// CONTEXT: read from the sheet, never recomputed — see SidebarSheet's onHeight
	const [sheetHeight, setSheetHeight] = useState(CHROME.sheetPeekPx);
	const view = held && held.key === key ? held : { ...FRESH, key };
	// CONTEXT: read from the record, never from the render's copy — Escape pops from a listener
	const put = (patch) => setHeld((current) => ({ ...(current && current.key === key ? current : { ...FRESH, key }), ...patch }));
	const { tab, zoom, pan, folded, narrow, sheetFull, openRow, draft, path } = view;
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

	// CLOSE POPS ONE RUNG. A popover and the slot picker are nearer and close themselves, then one
	// level, and only at the root does the window go — dismissing under any of them drops the draft.
	// The portal freezes its Escape handler at mount, so the live ladder is read through a ref.
	const ladderRef = useRef(null);
	ladderRef.current = () => {
		if (openRow) return;
		if (path.length === 0) return onDismiss();
		put({ path: path.slice(0, -1), tab: "settings", openRow: null, draft: "" });
	};
	const closeOne = useRef(() => ladderRef.current()).current;

	if (!open && !closing) return { shown: false, dialog: null };

	const manifest = definition?.manifest ?? {};
	// CONTEXT: the canvas always draws the tile's own widget; only the panel follows the path
	const here = addressed(options, path);
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
		manifest: here.manifest,
		tile: here.tile,
		onPatch: here.onPatch,
		crumbs: here.crumbs,
		tabs: path.length > 0 ? CHILD_TABS : TABS,
		enter: (step) => put({ path: [...path, step], tab: "settings", openRow: null, draft: "" }),
		popTo: (depth) => put({ path: path.slice(0, depth), tab: "settings", openRow: null, draft: "" }),
		place,
		host,
		registry,
		columns,
		onDone,
		onDismiss,
		onResize,
		onCollapse,
		onExpand,
		countReaders,
		boardConsumes,
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
		openEditor: (next, seed) => put({ openRow: next, draft: next ? (seed ?? startingDraft(next, here, place)) : "" }),
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
			  }
			: {
					right: `${CHROME.padPx}px`,
					top: `${CHROME.padPx}px`,
					bottom: `${CHROME.padPx}px`,
					width: `${CHROME.panelWidthPx}px`,
			  },
		barStyle: phone && !folded ? { bottom: `${barPlacement(CHROME, sheetHeight, frame.height).bottomPx}px` } : null,
		barHidden: phone && barPlacement(CHROME, sheetHeight, frame.height).hidden,
		sheetHeight,
		setSheetHeight,
		sheetMaxPx: Math.max(CHROME.sheetPeekPx, frame.height - 2 * CHROME.padPx - CHROME.headerHeightPx - CHROME.gapPx),
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
		h("div", { className: "wg-set-pan", key: "pan", ...panHandlers(state) }),
		h("div", { className: `wg-set-body${live ? " is-live" : ""}`, key: "body", style: bodyStyle }, widget),
		showingChip
			? h(
					"div",
					{ className: "wg-set-chip", key: "chip", style: canvasStyle },
					h("div", { className: "wg-narrow" }, [
						h("span", { className: "wg-narrow-mark" }, initialOf(manifest.title ?? manifest.id)),
						h("span", { className: "wg-narrow-open" }, "Narrow"),
					]),
			  )
			: null,
		live ? null : h("div", { className: "wg-set-look", key: "look", ...panHandlers(state) }),
		h("div", { className: `wg-set-chrome${closing ? " is-leaving" : ""}`, key: "chrome" }, [header(state), panel(state), zoomBar(state)]),
	];

	const dialog = h(
		DialogOverlay,
		{ className: `wg-set-over${closing ? " is-leaving" : ""}`, onClose: closeOne },
		h(
			"div",
			{
				className: `wg-set-window${closing ? " is-leaving" : ""}`,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": `${manifest.title ?? manifest.id} settings`,
				tabIndex: -1,
				// the grid inside is drawn in CELLS, and the cell tokens live on the BOARD's element.
				// The window is portaled onto <body> and inherits from nothing, so it carries its own.
				onWheel: wheelHandler(state),
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
