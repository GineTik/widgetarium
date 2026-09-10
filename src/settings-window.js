import { createElement as h } from "react";
import { useEffect, useRef, useState } from "react";
import { declaredName } from "./registry.js";
import { heldKey, heldTile, keptRecords, mountList, mountRows, propConfig, rekeyed, storedMountRow, uniqueName, withoutKey } from "./model.js";
import { DialogClose, DialogOverlay } from "./dialog.js";
import { parse as parseYaml } from "yaml";
import { Button, CodeArea, Field, Icon, IconButton, List, Pill, Popover, PopoverItem, Row, RowBadge, RowLabel, RowValue, Segmented, Sidebar, SidebarGroup, SidebarRow, SidebarSheet, Switch } from "./kit.js";
import { CatalogueDialog } from "./catalogue-dialog.js";
import { bindingOf, storedRows } from "./gateway/props.js";
import { fieldsOf } from "./gateway/fields.js";
import { boxNamed, matchesNeedle, referenceIn, referenceText, widgetsOffering } from "./ref-draft.js";
import { conditionOfRow, conditionsFor, rowFor } from "./gateway/operators.js";
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

function boundPath(spec, config) {
	return config.path || spec.default?.path || "";
}

function folderRead(spec, config) {
	if (spec.kind === "value" || spec.of) return "";
	if (bindingOf(spec, config).binding !== "vault") return "";
	return boundPath(spec, config);
}

function vaultPathsOf(manifest, tile) {
	const held = Object.entries(manifest?.props ?? {}).map(([name, spec]) => folderRead(spec, propConfig(tile, name, spec)));
	return [...new Set(held)].filter(Boolean).sort();
}

function useVaultFields(host, paths) {
	const [held, setHeld] = useState({});
	const wanted = JSON.stringify(paths);
	useEffect(() => {
		let alive = true;
		const asked = JSON.parse(wanted);
		Promise.all(asked.map((path) => host?.slot?.({ kind: "folder", path })?.describe?.() ?? []))
			.then((found) => alive && setHeld(Object.fromEntries(asked.map((path, at) => [path, found[at] ?? []]))))
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [wanted, host]);
	return held;
}

function initialOf(name) {
	return String(name ?? "?").replace(/^@[\w-]+\//, "").trim().charAt(0).toUpperCase() || "?";
}

function titleCase(name) {
	return `${String(name).charAt(0).toUpperCase()}${String(name).slice(1)}`;
}

function notesOf(host) {
	const files = host?.app?.vault?.getAllLoadedFiles?.() ?? [];
	return files
		.filter((file) => !Array.isArray(file?.children) && typeof file.path === "string")
		.map((file) => file.path)
		.sort();
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

function editorPopover(state, key, trigger, body, seed, isAlsoOpen) {
	return h(
		Popover,
		{
			key,
			className: "wg-set-pop",
			isOpen: state.openRow === key || isAlsoOpen === true,
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

function propConfigOf(state, key, spec) {
	return propConfig(state.tile, key, spec);
}

const PLAIN_TYPES = new Set(["text", "number", "boolean"]);

function writtenPlainly(spec) {
	return spec.kind === "value" && PLAIN_TYPES.has(spec.type);
}

function isSwitched(spec) {
	return spec.kind === "value" && spec.type === "boolean";
}

const TYPED_HERE = "typed";
const IN_VAULT = "vault";
const FROM_WIDGET = "ref";
const FIELDS_SHOWN = 6;

const OWN_BOX = "box";

function kindItems(state, spec) {
	const typed = { value: TYPED_HERE, label: "Typed here" };
	const shared = (state.refs?.offered?.() ?? []).length > 0 ? [{ value: FROM_WIDGET, label: "From a widget" }] : [];
	if (spec.of) return [{ value: OWN_BOX, label: "This widget's" }, ...shared];
	if (writtenPlainly(spec)) return [typed, ...shared];
	return [{ value: IN_VAULT, label: spec.kind === "value" ? "File" : "Folder" }, typed, ...shared];
}

function writtenText(spec, held) {
	if (held === undefined) return "";
	return writtenPlainly(spec) ? String(held) : JSON.stringify(held);
}

const BLANK_OF_TYPE = { text: "", number: 0, boolean: false };

function blankValue(spec) {
	if (spec.default?.value !== undefined) return spec.default.value;
	if (spec.type) return BLANK_OF_TYPE[spec.type] ?? "";
	return spec.kind === "value" ? "" : [];
}

function typedAs(spec, typed) {
	return spec.type === "number" ? Number(typed) : typed.trim();
}

// TRADE-OFF: not rekeyed() — that MERGES, and switching a prop to its own box writes a record with keys deliberately dropped
function writeProp(state, key, spec, config) {
	const kept = Object.entries(state.tile.props ?? {}).filter(([propName]) => propName !== spec?.was);
	const settings = withoutKey(withoutKey(state.tile.settings, spec?.was), key);
	state.onPatch({ props: { ...Object.fromEntries(kept), [key]: config }, settings });
}

const KIND_OF_BINDING = { ref: FROM_WIDGET, box: OWN_BOX, hardcode: TYPED_HERE };
const ICON_OF_BINDING = { ref: "link", box: "check", hardcode: "check" };

function kindSwitch(state, key, spec, config, binding) {
	const held = KIND_OF_BINDING[binding] ?? IN_VAULT;
	const items = kindItems(state, spec);
	if (items.length < 2) return null;
	const pick = (kind) => {
		if (kind === held) return;
		if (kind === OWN_BOX) {
			const { ref: dropped, from: gone, ...rest } = config;
			writeProp(state, key, spec, rest);
			return;
		}
		const typed = kind === TYPED_HERE;
		const kept = {
			...config,
			from: kind,
			value: config.value === undefined && typed ? blankValue(spec) : config.value,
			path: config.path === undefined && kind === IN_VAULT ? spec.default?.path ?? "" : config.path,
		};
		writeProp(state, key, spec, kept);
		state.openEditor(`prop:${key}`, typed ? writtenText(spec, kept.value) : kept.path);
	};
	return h(Segmented, { key: "kind", className: "wg-set-pop-kind", size: "s", items, value: held, onChange: pick });
}

const FROM_FOLDER = "Every note in the folder arrives as one item.";
const FROM_FILE = "What the note holds is this value.";
const TYPED_ITEMS = "The items live in this tile, not in the vault.";
const TYPED_VALUE = "The value lives in this tile.";
const FROM_ANOTHER = "Reads another widget on this board, and the two move together.";
const OWN_BOX_NOTE = "This widget keeps the pick to itself until you bind it.";

function kindNote(spec, binding) {
	if (binding === "box") return OWN_BOX_NOTE;
	if (binding === "ref") return FROM_ANOTHER;
	if (binding === "hardcode") return spec.kind === "value" ? TYPED_VALUE : TYPED_ITEMS;
	return spec.kind === "value" ? FROM_FILE : FROM_FOLDER;
}

function typedBody(state, key, spec, config) {
	const shown = writtenText(spec, config.value ?? spec.default?.value);
	const apply = (typed) => {
		if (writtenPlainly(spec)) {
			writeProp(state, key, spec, { ...config, from: TYPED_HERE, value: typedAs(spec, typed) });
			return;
		}
		let parsed;
		try {
			parsed = JSON.parse(typed);
		} catch {
			state.host?.ui?.notify("That is not valid JSON, so the value was not kept.");
			return;
		}
		if (spec.kind !== "value" && !Array.isArray(parsed)) {
			state.host?.ui?.notify("This prop is a collection, so the value must be a JSON array.");
			return;
		}
		writeProp(state, key, spec, { ...config, from: TYPED_HERE, value: parsed });
	};
	return [
		h(Field, {
			block: true,
			key: "field",
			value: state.draft ?? "",
			placeholder: shown || (writtenPlainly(spec) ? "A value" : "A JSON value"),
			onInput: (event) => state.setDraft(event.target.value),
		}),
		popoverFoot(state, () => state.setDraft(shown), apply),
	];
}

function offeredPaths(host, spec) {
	return spec.kind === "value" ? notesOf(host) : foldersOf(host);
}

function vaultBody(state, key, spec, config) {
	const offered = offeredPaths(state.host, spec);
	const declared = spec.default?.path ?? "";
	const path = config.path ?? declared;
	const needle = String(state.draft ?? "").toLowerCase();
	const found = offered.filter((entry) => entry.toLowerCase().includes(needle)).slice(0, FOLDERS_SHOWN);
	return [
		h(Field, {
			block: true,
			key: "field",
			icon: h(Icon, { name: "search" }),
			value: state.draft ?? "",
			placeholder: declared || (spec.kind === "value" ? "Note in the vault" : "Folder in the vault"),
			onInput: (event) => state.setDraft(event.target.value),
		}),
		...found.map((entry) =>
			h(PopoverItem, { key: entry, checked: entry === path, onClick: () => state.setDraft(entry) }, [
				h("span", { className: "wg-set-pop-name", key: "name" }, entry),
			]),
		),
		popoverFoot(state, () => state.setDraft(declared), (typed) => writeProp(state, key, spec, { ...config, from: IN_VAULT, path: typed.trim() })),
	];
}

function refBody(state, key, spec, config) {
	const offered = (state.refs?.offered?.() ?? []).filter((entry) => entry.tile !== state.tile.id && entry.kind === (spec.kind === "value" ? "value" : "collection"));
	if (offered.length === 0) return [h("p", { className: "wg-set-pop-note", key: "none" }, NOTHING_OFFERED)];
	const byTitle = new Map();
	for (const entry of offered) byTitle.set(entry.title, [...(byTitle.get(entry.title) ?? []), entry]);
	return [...byTitle.entries()].flatMap(([title, entries]) => [
		h("p", { className: "wg-set-pop-note", key: `t${title}` }, title),
		...entries.map((entry) =>
			h(PopoverItem, { key: entry.ref, checked: entry.ref === config.ref, onClick: () => writeProp(state, key, spec, { ...config, from: FROM_WIDGET, ref: entry.ref }) }, [
				h("span", { className: "wg-set-pop-name", key: "name" }, entry.label),
			]),
		),
	]);
}

function itemFields(spec) {
	const declared = spec.item?.fields;
	if (!Array.isArray(declared) || declared.length === 0) return null;
	const fields = declared
		.slice(0, FIELDS_SHOWN)
		.map((field) => ({ key: field.key ?? "", label: field.label ?? field.key, type: field.type ?? "text", required: field.required === true }))
		.filter((field) => field.key !== "");
	return fields.length > 0 ? fields : null;
}

function listedItems(spec, config) {
	const held = config.value ?? spec.default?.value;
	return Array.isArray(held) ? held : [];
}

const isWrappedRow = (row) => Boolean(row) && typeof row === "object" && "id" in row && "value" in row;
const itemOf = (row) => (isWrappedRow(row) ? row.value : row) ?? {};
const rowWith = (row, item) => (isWrappedRow(row) ? { ...row, value: item } : item);

const ITEM_IS_YAML = "YAML, one field per line. A field marked optional may stay empty.";
const BAD_YAML = "That is not valid YAML, so nothing was kept.";
const NOT_A_MAP = "An item is a set of fields, so this has to be a YAML map.";
const UNKNOWN_FIELD = 'The field "{field}" is not one this list keeps.';
const EMPTY_FIELD = 'The field "{field}" is required, so it cannot be left empty.';
const BAD_DATETIME = 'The field "{field}" must be a date and time, like 2026-09-01T09:00:00Z.';
const BAD_BOOLEAN = 'The field "{field}" must be true or false.';
const BOOLEAN_WORDS = new Set(["true", "false"]);

const said = (sentence, field) => sentence.replace("{field}", field);
const isMap = (held) => Boolean(held) && typeof held === "object" && !Array.isArray(held);
const isEmpty = (held) => held === undefined || held === null || String(held).trim() === "";

function noteOf(field) {
	return field.required ? ` # ${field.type ?? "text"}` : ` # optional, ${field.type ?? "text"}`;
}

function yamlOf(fields, item) {
	return fields
		.map((field) => {
			const held = item[field.key];
			const empty = field.required ? '""' : "null";
			const spelled = field.type === "boolean" ? String(held) : JSON.stringify(String(held));
			return `${field.key}: ${isEmpty(held) ? empty : spelled}${noteOf(field)}`;
		})
		.join("\n");
}

function readYaml(text, fields) {
	let parsed;
	try {
		parsed = parseYaml(String(text ?? "")) ?? {};
	} catch {
		return { failure: BAD_YAML };
	}
	if (!isMap(parsed)) return { failure: NOT_A_MAP };
	const known = new Set(fields.map((field) => field.key));
	const stray = Object.keys(parsed).find((name) => !known.has(name));
	if (stray) return { failure: said(UNKNOWN_FIELD, stray) };
	const item = {};
	for (const field of fields) {
		const held = parsed[field.key];
		if (isEmpty(held)) {
			if (field.required) return { failure: said(EMPTY_FIELD, field.key) };
			continue;
		}
		const written = held instanceof Date ? held.toISOString() : String(held);
		if (field.type === "datetime" && Number.isNaN(Date.parse(written))) return { failure: said(BAD_DATETIME, field.key) };
		if (field.type === "boolean" && !BOOLEAN_WORDS.has(written)) return { failure: said(BAD_BOOLEAN, field.key) };
		item[field.key] = field.type === "boolean" ? written === "true" : written;
	}
	return { item };
}

function openedItem(openRow, key) {
	const at = String(openRow ?? "").startsWith(`prop:${key}#`) ? Number(String(openRow).split("#")[1]) : NaN;
	return Number.isInteger(at) ? at : null;
}

function itemBody(state, key, spec, config, index) {
	const fields = itemFields(spec);
	const rows = listedItems(spec, config);
	const isExisting = index < rows.length;
	const read = readYaml(state.draft, fields);
	const write = (next) => {
		writeProp(state, key, spec, { ...config, from: TYPED_HERE, value: next });
		state.openEditor(`prop:${key}`, writtenText(spec, next));
	};
	return [
		h(CodeArea, { key: "yaml", value: state.draft ?? "", onInput: (event) => state.setDraft(event.target.value) }),
		h("p", { className: read.failure ? "wg-set-pop-error" : "wg-set-pop-note", key: "note" }, read.failure ?? ITEM_IS_YAML),
		h("div", { className: "wg-set-pop-foot", key: "foot" }, [
			isExisting
				? h(Button, { size: "s", key: "remove", onClick: () => write(rows.filter((_, at) => at !== index)) }, "Remove")
				: h(Button, { size: "s", key: "back", onClick: () => state.openEditor(`prop:${key}`, "") }, "Back"),
			h(
				Button,
				{
					size: "s",
					variant: "accent",
					key: "apply",
					disabled: Boolean(read.failure),
					onClick: () => {
						if (read.failure) return;
						write(isExisting ? rows.map((row, at) => (at === index ? rowWith(row, read.item) : row)) : [...rows, read.item]);
					},
				},
				"Apply",
			),
		]),
	];
}

function itemRows(state, key, spec, config) {
	const fields = itemFields(spec);
	const rows = listedItems(spec, config);
	const open = (index, item) => state.openEditor(`prop:${key}#${index}`, yamlOf(fields, item));
	const listed = rows.map((row, index) => {
		const item = itemOf(row);
		return h(Row, { key: `item${index}`, pressable: true, className: "wg-set-row", onClick: () => open(index, item) }, [
			h(RowLabel, { key: "label" }, String(item[fields[0].key] ?? "") || "Empty"),
			h(RowValue, { className: "wg-set-value", key: "value" }, shownValue(item[fields[1]?.key], null) ?? ""),
		]);
	});
	const add = h(Row, { key: "add", pressable: true, className: "wg-set-row is-add", onClick: () => open(rows.length, {}) }, [
		h(Icon, { name: "plus", key: "plus" }),
		h(RowLabel, { key: "label" }, "Add item"),
	]);
	return [h(SidebarGroup, { className: "wg-set-group", key: "items" }, [...listed, add])];
}

const READ_BY_MANY_FOLDER = "This folder is read by {field} widgets on this board.";
const READ_BY_MANY_NOTE = "This note is read by {field} widgets on this board.";

function readersNote(spec, readerCount) {
	if (readerCount < 2) return null;
	return h("p", { className: "wg-set-pop-note", key: "readers" }, said(spec.kind === "value" ? READ_BY_MANY_NOTE : READ_BY_MANY_FOLDER, readerCount));
}

function propHead(spec, key, binding) {
	return h("div", { className: "wg-set-pop-head", key: "head" }, [
		h("span", { className: "wg-set-pop-title", key: "title" }, spec.label ?? key),
		h("span", { className: "wg-set-pop-hint", key: "hint" }, spec.hint ?? kindNote(spec, binding)),
	]);
}

function collectionFields(spec) {
	return spec.kind !== "value" && itemFields(spec);
}

function listedFields(spec, binding) {
	return binding === "hardcode" && collectionFields(spec);
}

function typedLabel(spec, config) {
	if (collectionFields(spec)) return "Typed here";
	if (isSwitched(spec)) return heldBoolean(spec, config) ? "On" : "Off";
	return writtenText(spec, config.value ?? spec.default?.value) || "Empty";
}

function heldBoolean(spec, config) {
	return Boolean(config.value ?? spec.default?.value);
}

function switchedValue(state, key, spec, config) {
	const flip = (next) => writeProp(state, key, spec, { ...config, from: TYPED_HERE, value: next });
	return h(
		"span",
		{ className: "wg-set-switch", onClick: (event) => event.stopPropagation() },
		h(Switch, { checked: heldBoolean(spec, config), label: spec.label ?? key, onChange: flip }),
	);
}

function unpickedLabel(spec) {
	return spec.kind === "value" ? "Pick a note" : "Pick a folder";
}

function boundLabel(state, prop) {
	const { spec, config, binding, path } = prop;
	if (binding === "box") return "Its own";
	if (binding === "ref") return refLabel(state, config.ref);
	if (binding === "hardcode") return typedLabel(spec, config);
	return path || unpickedLabel(spec);
}

function bindingBody(state, prop) {
	const { key, spec, config, binding } = prop;
	if (binding === "ref") return refBody(state, key, spec, config);
	if (binding === "box") return [];
	if (binding !== "hardcode") return vaultBody(state, key, spec, config);
	if (isSwitched(spec)) return [];
	return listedFields(spec, binding) ? itemRows(state, key, spec, config) : typedBody(state, key, spec, config);
}

function propTrigger(state, prop) {
	const { key, spec, config, binding } = prop;
	const switched = isSwitched(spec) && binding === "hardcode";
	return valueRow({
		badge: h(Icon, { name: ICON_OF_BINDING[binding] ?? "folder" }),
		label: spec.label ?? key,
		value: switched ? switchedValue(state, key, spec, config) : h("span", { className: "wg-set-path" }, boundLabel(state, prop)),
		unset: !switched && !config.path && config.value === undefined && !config.ref,
	});
}

function propBody(state, prop, readerCount) {
	const { key, spec, config, binding } = prop;
	return [
		propHead(spec, key, binding),
		kindSwitch(state, key, spec, config, binding),
		readersNote(spec, readerCount),
		...bindingBody(state, prop),
	];
}

function propRow(state, prop) {
	const { key, spec, config, binding, path } = prop;
	const readerCount = binding === "vault" ? state.countReaders(path) : 0;
	const at = listedFields(spec, binding) ? openedItem(state.openRow, key) : null;
	const under = at === null ? propBody(state, prop, readerCount) : itemBody(state, key, spec, config, at);
	const seed = binding === "hardcode" ? writtenText(spec, config.value ?? spec.default?.value) : path;
	const body = h("div", { className: "wg-set-pop-body" }, under);
	return editorPopover(state, `prop:${key}`, propTrigger(state, prop), body, seed, at !== null);
}

function boundProp(state, key, spec) {
	const config = propConfigOf(state, key, spec);
	return { key, spec, config, binding: bindingOf(spec, config).binding, path: config.path || spec.default?.path || "" };
}

function declaredProps(manifest, wanted) {
	return Object.entries(manifest.props ?? {}).filter(([, spec]) => wanted(spec));
}

function propGroup(state) {
	const declared = declaredProps(state.manifest, (spec) => spec.design !== true);
	if (declared.length === 0) return null;
	const rows = declared.map(([key, spec]) => propRow(state, boundProp(state, key, spec)));
	return group("props", declared.length > 1 ? "Sources" : "Source", rows, null);
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

function mountWrite(tile, name, spec, onPatch) {
	return (next, moved) =>
		onPatch({
			mounts: { ...withoutKey(tile.mounts, spec?.was), [name]: next.map(storedMountRow) },
			settings: withoutKey(withoutKey(tile.settings, spec?.was), name),
			mounted: keptRecords(moved ?? tile.mounted, next),
		});
}

function mountPicker(state, key, onPick) {
	const trigger = h(Row, { pressable: true, className: "wg-set-row is-add", onClick: () => state.openEditor(key) }, [
		h(Icon, { name: "plus" }),
		h(RowLabel, { key: "label" }, "Add a view"),
	]);
	const dialog = h(CatalogueDialog, { key: "pick", registry: state.registry, host: state.host, mode: "mount", onPick, onClose: () => state.openEditor(null) });
	return h("div", { className: "wg-set-slot", key: "add" }, [trigger, state.openRow === key ? dialog : null]);
}

// TRADE-OFF: no rank — a mount hands nothing down, so slotFit has no clause to weigh
function mountGroups(state) {
	const { manifest, tile, registry, host, onPatch } = state;
	return Object.entries(manifest.mounts ?? {}).map(([name, spec]) => {
		const rows = mountRows(mountList(tile, name, spec), (id) => declaredName(registry, id));
		// CONTEXT: the setting's old key goes in the same write, so the next read has one answer
		const write = mountWrite(tile, name, spec, onPatch);
		const add = (id) => {
			write([...rows, { name: uniqueName(new Set(rows.map((row) => row.name)), declaredName(registry, id)), widget: id }]);
			state.openEditor(null);
		};
		const key = `mount:${name}`;
		const picker = mountPicker(state, key, add);
		// CONTEXT: the record sits under the old name, or still under the widget id it arrived as
		const rename = (next, index) =>
			write(next, movedRecord(tile.mounted, heldKey(tile.mounted, rows[index].name, rows[index].was), next[index].name));
		const drawn = rows.map((row, index) => mountRow(state, rows, index, write, rename));
		return group(key, spec?.label ?? titleCase(name), [...drawn, picker], spec?.hint ?? null);
	});
}

function valueRefsOf(refs) {
	return (refs?.offered?.() ?? []).filter((entry) => entry.kind === "value").map((entry) => entry.ref);
}

function useBoxValues(refs, isOpen) {
	const [held, setHeld] = useState({});
	const wanted = isOpen ? valueRefsOf(refs).join("|") : "";
	useEffect(() => {
		if (!wanted) return undefined;
		let alive = true;
		const asked = wanted.split("|");
		const reread = () =>
			Promise.all(asked.map((ref) => Promise.resolve(refs.read(ref)).catch(() => null))).then(
				(found) => alive && setHeld(Object.fromEntries(asked.map((ref, at) => [ref, found[at]]))),
			);
		reread();
		const stop = refs.watch(asked, reread);
		return () => {
			alive = false;
			stop?.();
		};
	}, [wanted, refs]);
	return held;
}

function fieldsFor(state, spec, config) {
	if (bindingOf(spec, config).binding === "hardcode") return fieldsOf(storedRows(config.value ?? spec.default?.value, spec).map((row) => row.value));
	return state.vaultFields?.[boundPath(spec, config)] ?? [];
}

const NOTHING_OFFERED = "Nothing else on this board offers a value yet.";
const NOT_WIRED = "nothing on this board yet";
const PICK_FIELD = "Which property of the data are we looking at?";
const PICK_CONDITION = "How should that property be compared?";
const PICK_VALUE = "What is it compared against?";
const PICK_SPREAD = "Everything a filter has picked arrives as conditions of its own.";
const OTHER_FIELD = "A property the notes here do not carry yet";
const FROM_A_WIDGET = "From another widget";
const PICK_WIDGET = "Which widget is it read from?";
const PICK_ITS_FIELD = "Which of its fields?";
const NO_SUCH_BOX = "Nothing on this board is called that.";
const FIELD_PLACEHOLDER = { text: "Anything the notes carry", number: "A number", day: "2026-09-01", one: "One value", many: "One value" };

function refLabel(state, ref) {
	const found = state.refs?.offered?.().find((entry) => entry.ref === ref);
	return found ? `${found.title} · ${found.label}` : ref;
}

function valueSaid(state, held) {
	if (typeof held?.ref === "string") return refLabel(state, held.ref);
	if (typeof held?.wants === "string") return NOT_WIRED;
	if (Array.isArray(held)) return held.join(", ");
	return String(held ?? "");
}

function fieldNamed(fields, prop) {
	return fields.find((field) => field.prop === prop) ?? { prop, type: "text", values: [] };
}

function conditionSentence(state, fields, row) {
	if (row.spread) return `everything ${valueSaid(state, row.spread)} has picked`;
	const field = fieldNamed(fields, row.prop);
	const kind = conditionOfRow(field.type, row);
	if (!kind) return `${row.prop} ${row.op ?? "is"} ${valueSaid(state, row.value)}`;
	return kind.takes === "none" ? `${row.prop} ${kind.label}` : `${row.prop} ${kind.label} ${valueSaid(state, row.value)}`;
}

function stepAt(openRow, key) {
	const head = `where:${key}#`;
	if (!String(openRow ?? "").startsWith(head)) return null;
	const [index, step] = String(openRow).slice(head.length).split("|");
	return { index, step: step ?? "" };
}

function writeWhere(state, at, rows) {
	const fixed = (at.config.where ?? []).filter((row) => row.fixed === true);
	state.onPatch({ props: { ...(state.tile.props ?? {}), [at.key]: { ...at.config, where: [...fixed, ...rows] } } });
}

function withRowAt(rows, index, row) {
	return index < rows.length ? rows.map((held, one) => (one === index ? row : held)) : [...rows, row];
}

function openStep(state, at, step, seed) {
	state.openEditor(`where:${at.key}#${at.index}${step ? `|${step}` : ""}`, seed ?? "");
}

function keepRow(state, at, row, step, seed) {
	writeWhere(state, at, withRowAt(at.rows, at.index, row));
	if (step) openStep(state, at, step, seed);
	else state.openEditor(null);
}

function note(said) {
	return h("p", { className: "wg-set-pop-note", key: "note" }, said);
}

function pickRow(key, label, onClick, checked) {
	return h(PopoverItem, { key, checked, onClick }, [h("span", { className: "wg-set-pop-name", key: "name" }, label)]);
}

function fieldStep(state, at, fields) {
	const typed = String(state.draft ?? "").trim();
	const start = (prop) => keepRow(state, at, { prop, op: conditionsFor(fieldNamed(fields, prop).type)[0].op, value: "" }, "op");
	return [
		note(PICK_FIELD),
		...fields.map((field) => pickRow(field.prop, field.prop, () => start(field.prop), field.prop === at.rows[at.index]?.prop)),
		h(Field, { block: true, key: "typed", value: state.draft ?? "", placeholder: OTHER_FIELD, onInput: (event) => state.setDraft(event.target.value) }),
		h("div", { className: "wg-set-pop-foot", key: "foot" }, [
			h(Button, { size: "s", variant: "accent", key: "apply", disabled: typed === "", onClick: () => typed && start(typed) }, "Use it"),
		]),
	];
}

function conditionStep(state, at, field) {
	const held = at.rows[at.index] ?? {};
	const pick = (kind) => keepRow(state, at, rowFor(field.prop, kind, held.value ?? ""), kind.takes === "none" ? null : "value");
	return [
		note(PICK_CONDITION),
		...conditionsFor(field.type).map((kind) =>
			pickRow(kind.id, kind.label, () => pick(kind), kind.id === conditionOfRow(field.type, held)?.id),
		),
	];
}

function fitsSlot(entry, shape, mine) {
	return !mine.has(entry.ref) && entry.kind === "value" && (entry.shape ?? "value") === shape;
}

function offeredBoxes(state, shape) {
	const mine = new Set(Object.keys(state.manifest.props ?? {}).map((name) => `${state.tile.id}/${name}`));
	const byTitle = new Map();
	for (const entry of state.refs?.offered?.() ?? []) {
		if (!fitsSlot(entry, shape, mine)) continue;
		byTitle.set(entry.title, [...(byTitle.get(entry.title) ?? []), entry]);
	}
	return byTitle;
}

function boxRows(state, shape, onPick) {
	const offered = [...offeredBoxes(state, shape).values()].flat();
	if (offered.length === 0) return [note(NOTHING_OFFERED)];
	return [
		h(
			SidebarGroup,
			{ key: "boxes", label: FROM_A_WIDGET },
			offered.map((entry) => pickRow(entry.ref, `${entry.title} · ${entry.label}`, () => onPick(entry))),
		),
	];
}

function offeredValues(state, shape) {
	return [...offeredBoxes(state, shape).values()].flat();
}

function widgetRows(offered, needle, onPick) {
	return widgetsOffering(offered)
		.filter((entry) => matchesNeedle(entry.tile, needle) || matchesNeedle(entry.title, needle))
		.map((entry) => pickRow(entry.tile, entry.tile, () => onPick(entry.tile)));
}

function boxFieldRows(offered, tile, needle, onPick) {
	return offered
		.filter((entry) => entry.tile === tile && (matchesNeedle(entry.prop, needle) || matchesNeedle(entry.label, needle)))
		.map((entry) => pickRow(entry.ref, entry.prop, () => onPick(entry)));
}

function completionRows(state, said, offered, setDraft, onPick) {
	if (!said) return [h(SidebarGroup, { key: "boxes", label: FROM_A_WIDGET }, widgetRows(offered, "", (tile) => setDraft(referenceText(tile))))];
	if (said.tile === null) {
		return [
			note(PICK_WIDGET),
			h(SidebarGroup, { key: "boxes", label: FROM_A_WIDGET }, widgetRows(offered, said.needle, (tile) => setDraft(referenceText(tile)))),
		];
	}
	const rows = boxFieldRows(offered, said.tile, said.needle, onPick);
	return [
		note(rows.length === 0 ? NO_SUCH_BOX : PICK_ITS_FIELD),
		h(SidebarGroup, { key: "boxes", label: FROM_A_WIDGET }, rows),
	];
}

function draftOf(value, state) {
	if (typeof value?.ref !== "string") return typeof value === "object" ? "" : String(value ?? "");
	const found = state.refs?.offered?.().find((entry) => entry.ref === value.ref);
	return found ? referenceText(found.tile, found.prop) : "";
}

function heldValues(held) {
	if (Array.isArray(held)) return held;
	return held === undefined || held === null || held === "" ? [] : [held];
}

function valueChoices(state, at, field, kind) {
	const held = at.rows[at.index] ?? {};
	const chosen = heldValues(held.value);
	const keep = (value) => keepRow(state, at, { ...held, value }, null);
	const toggle = (value) => {
		const next = chosen.includes(value) ? chosen.filter((one) => one !== value) : [...chosen, value];
		writeWhere(state, at, withRowAt(at.rows, at.index, { ...held, value: next }));
	};
	if (kind.takes === "many") return field.values.map((value) => pickRow(value, value, () => toggle(value), chosen.includes(value)));
	return field.values.map((value) => pickRow(value, value, () => keep(value), held.value === value));
}

function valueStep(state, at, field, kind) {
	const held = at.rows[at.index] ?? {};
	const typed = String(state.draft ?? "").trim();
	const said = referenceIn(typed);
	const offered = offeredValues(state, "value");
	const pointedAt = boxNamed(offered, said);
	const keepValue = (value) => keepRow(state, at, { ...held, value }, null);
	const apply = () => keepValue(pointedAt ? { ref: pointedAt.ref } : kind.takes === "number" ? Number(typed) : typed);
	return [
		note(PICK_VALUE),
		...valueChoices(state, at, field, kind),
		h(Field, {
			block: true,
			key: "typed",
			className: said ? (pointedAt ? "wg-set-ref" : "wg-set-ref-unknown") : null,
			value: state.draft ?? "",
			placeholder: FIELD_PLACEHOLDER[kind.takes] ?? FIELD_PLACEHOLDER.one,
			onInput: (event) => state.setDraft(event.target.value),
		}),
		h("div", { className: "wg-set-pop-foot", key: "foot" }, [
			h(
				Button,
				{ size: "s", variant: "accent", key: "apply", disabled: typed === "" || (said !== null && !pointedAt), onClick: apply },
				"Use it",
			),
		]),
		...completionRows(state, said, offered, state.setDraft, (entry) => keepValue({ ref: entry.ref })),
	];
}

function summaryRow(state, at, step, label, value, seed) {
	return valueRow({ label, value: h("span", { className: "wg-set-path" }, value), onClick: () => openStep(state, at, step, seed) });
}

function conditionSummary(state, at, field) {
	const held = at.rows[at.index] ?? {};
	const kind = conditionOfRow(field.type, held);
	const rows = [
		summaryRow(state, at, "field", "Property", held.prop ?? "Pick one", ""),
		summaryRow(state, at, "op", "Condition", kind?.label ?? "Pick one", ""),
	];
	if (kind && kind.takes !== "none") {
		rows.push(summaryRow(state, at, "value", "Value", valueSaid(state, held.value) || "Pick one", draftOf(held.value, state)));
	}
	return [
		...rows,
		h("div", { className: "wg-set-pop-foot", key: "foot" }, [
			h(Button, { size: "s", key: "remove", onClick: () => { writeWhere(state, at, at.rows.filter((_, one) => one !== at.index)); state.openEditor(null); } }, "Remove"),
			h(Button, { size: "s", variant: "accent", key: "done", onClick: () => state.openEditor(null) }, "Done"),
		]),
	];
}

function conditionBody(state, at, fields, step) {
	const held = at.rows[at.index] ?? {};
	const field = fieldNamed(fields, held.prop);
	if (step === "field" || !held.prop) return fieldStep(state, at, fields);
	if (step === "op") return conditionStep(state, at, field);
	const kind = conditionOfRow(field.type, held);
	if (step === "value" && kind) return valueStep(state, at, field, kind);
	return conditionSummary(state, at, field);
}

function spreadBody(state, at) {
	return [note(PICK_SPREAD), ...boxRows(state, "conditions", (entry) => keepRow(state, at, { spread: { ref: entry.ref } }, null))];
}

function conditionRow(state, at, fields, trigger) {
	const body = at.index === "spread" ? spreadBody(state, at) : conditionBody(state, at, fields, at.step ?? "");
	return editorPopover(state, `where:${at.key}#${at.index}`, trigger, h("div", { className: "wg-set-pop-body" }, body), "", at.step !== null);
}

function fixedCondition(state, fields, row, index) {
	return h(Row, { className: "wg-set-row", key: `fixed${index}` }, [
		h(RowLabel, { key: "label" }, conditionSentence(state, fields, row)),
		h(RowValue, { className: "wg-set-value", key: "value" }, h(Pill, null, "Fixed")),
	]);
}

const addRow = (said) => h(Row, { className: "wg-set-row is-add", pressable: true }, [h(Icon, { name: "plus", key: "plus" }), h(RowLabel, { key: "label" }, said)]);

function whereGroup(state, key, spec, config) {
	const fields = fieldsFor(state, spec, config);
	const held = config.where ?? [];
	const rows = held.filter((row) => row.fixed !== true);
	const open = stepAt(state.openRow, key);
	const at = (index) => ({ key, config, rows, index, step: open?.index === String(index) ? open.step : null });
	const drawn = [
		...held.filter((row) => row.fixed === true).map((row, index) => fixedCondition(state, fields, row, index)),
		...rows.map((row, index) => conditionRow(state, at(index), fields, valueRow({ label: conditionSentence(state, fields, row), value: "" }))),
		conditionRow(state, at(rows.length), fields, addRow("Add condition")),
	];
	if (offeredBoxes(state, "conditions").size > 0) {
		drawn.push(conditionRow(state, at("spread"), fields, addRow("Everything a filter has picked")));
	}
	return group(`where:${key}`, `Where · ${spec.label ?? key}`, drawn, "These decide which data arrives. A condition the widget declares cannot be edited here.");
}

function dataGroups(state) {
	const { manifest } = state;
	const groups = [];

	for (const [key, spec] of Object.entries(manifest.props ?? {})) {
		const config = propConfigOf(state, key, spec);
		const label = spec.label ?? key;
		const declared = spec.default ?? {};

		if (spec.kind !== "value" && !spec.of) groups.push(whereGroup(state, key, spec, config));

		const sort = [...(declared.sort ?? []), ...(config.sort ?? [])];
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

		const isHardcoded = bindingOf(spec, config).binding === "hardcode";
		const path = config.path || declared.path || "";
		const isOn = isHardcoded || Boolean(path);
		const verbs = Array.isArray(spec.verbs) ? spec.verbs : Object.keys(spec.verbs ?? {});
		const asked = verbs.length > 0 ? verbs : ["list", "create", "update", "remove"];
		const said = {
			list: isHardcoded ? "reads this widget's own list" : `reads the notes in ${path || "nowhere"}`,
			get: "reads one record",
			create: isHardcoded ? "adds a row to this widget's own list" : `a new note lands in ${path || "nowhere"}`,
			update: isHardcoded ? "rewrites a row in this widget's own list" : "writes frontmatter on the note it came from",
			remove: isHardcoded ? "drops a row from this widget's own list" : "moves the note to the vault's trash",
		};
		groups.push(
			group(
				`can:${key}`,
				`What ${label} can do`,
				asked.map((verb) => reportRow(verb, titleCase(verb), said[verb] ?? `runs "${verb}" on this source`, isOn ? "On" : "Off", isOn)),
				isHardcoded ? "The rows live in this tile, so every verb is on." : isOn ? "All of these follow the binding. Clear it and they go off together." : "One empty field turns the rows grey.",
			),
		);
	}

	if (groups.length > 0) return groups;
	return [group("no-data", "Data", h(Row, { className: "wg-set-row" }, h(RowLabel, null, "This widget declares no source")), null)];
}

function sizeOnBoardGroup(state) {
	const { place, columns, onResize } = state;
	const sizeRow = (axis, label, cellsNow, apply) =>
		editorPopover(state, `size:${axis}`, valueRow({ label, value: `${cellsNow} cells` }), textEditor(state, String(cellsNow), (typed) => apply(Number(typed))));
	if (!onResize) return null;
	return group(
		"size",
		"Size on the board",
		[
			sizeRow("w", "Width", place.w, (cellsWanted) => onResize({ w: clamp(Number.isFinite(cellsWanted) ? cellsWanted : place.w, 1, columns) })),
			sizeRow("h", "Height", place.h, (cellsWanted) => onResize({ h: Math.max(1, Number.isFinite(cellsWanted) ? cellsWanted : place.h) })),
		],
		"The widget is drawn at the size it has on the board, so a change here is visible behind the panel.",
	);
}

function foldGroup({ isCollapsed, onCollapse, onExpand }) {
	if (!onCollapse) return null;
	const switching = h(Switch, { checked: isCollapsed, label: "Folded", onChange: (next) => (next ? onCollapse() : onExpand()) });
	return group(
		"fold",
		"Folded",
		h(Row, { className: "wg-set-row" }, [h(RowLabel, { key: "label" }, "Fold to one column"), h(RowValue, { className: "wg-set-value", key: "value" }, switching)]),
		null,
	);
}

function designGroups(state) {
	const own = declaredProps(state.manifest, (spec) => spec.design === true).map(([key, spec]) => propRow(state, boundProp(state, key, spec)));
	const groups = [sizeOnBoardGroup(state), foldGroup(state), own.length > 0 ? group("design:own", "This widget", own, null) : null].filter(Boolean);
	if (groups.length > 0) return groups;
	return [group("no-design", "Design", h(Row, { className: "wg-set-row" }, h(RowLabel, null, "This widget is drawn at the size its row gives it")), null)];
}

function panelBody(state) {
	if (state.tab === "data") return dataGroups(state);
	if (state.tab === "design") return designGroups(state);
	return [
		propGroup(state),
		state.manifest.slots ? group("slots", "Slots", slotRows(state), "A hole this widget fills with another widget.") : null,
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
				isOpen: state.sheetFull,
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
	if (kind === "where") return "";
	if (kind === "prop") {
		const spec = here.manifest.props?.[name];
		const config = here.tile.props?.[name] ?? {};
		if (bindingOf(spec, config).binding === "hardcode") {
			const held = config.value ?? spec?.default?.value;
			if (held === undefined) return "";
			return writtenText(spec, held);
		}
		return config.path ?? spec?.default?.path ?? "";
	}
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
	const { session, definition, tile, place, widget, canvasBox, cell, gap, phone, host, registry, columns, onDone, onDismiss, onResize, onCollapse, onExpand, countReaders, refs } = options;
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
	const here = addressed(options, path);
	const vaultFields = useVaultFields(host, vaultPathsOf(here.manifest, here.tile));
	const boxValues = useBoxValues(refs, open);

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
	const frame = dialogBox(viewport, phone);
	const windowBox = { width: frame.width, height: frame.height };
	const layout = {
		...CHROME,
		sheet: phone,
		panelWidthPx: folded ? CHROME.foldedPanelPx : CHROME.panelWidthPx,
		sheetPeekPx: folded ? CHROME.foldedPanelPx : CHROME.sheetPeekPx,
	};
	const free = freeArea(windowBox, layout);

	const wanted = canvasBox ?? { width: spanToPixels(place.w, cell, gap), height: spanToPixels(place.h, cell, gap) };
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
		refs,
		vaultFields,
		boxValues,
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
		{ key: "settings-window", className: `wg-set-over${closing ? " is-leaving" : ""}`, onClose: closeOne },
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
