import { createElement as h } from "react";
import { bindingOf, declaredOf, typedIn } from "../gateway/props.js";
import { NOTE_CONTENT, noteFieldOf } from "../gateway/obsidian.js";
import { hostGatewayFor } from "../engine/host-gateways.js";
import { problemsOf } from "../gateway/problems.js";
import { refOf } from "../gateway/refs.js";
import { isShown } from "../prop-visibility.js";
import { implementationBody, implementationLabel } from "./implementation-body.js";
import { said } from "./item-yaml.js";
import { refLabel } from "./offered-boxes.js";
import { ProblemsMark } from "./problems-mark.js";
import { isSwitched, propConfigOf, writtenPlainly, writtenText } from "./prop-writing.js";
import { editorPopover, group, valueRow } from "./settings-rows.js";
import { sourceButton, sourceList, sourcesOpenKey } from "./source-list.js";
import { statBody, statLabel, statStepOf } from "./stat-body.js";
import { choiceBody, chosenLabel, pickedRowValue, switchedValue, typedBody, typedLabel } from "./typed-body.js";
import { itemBody, itemRows, listedFields, openedItem } from "./typed-rows.js";
import { refBody, vaultBody } from "./vault-body.js";

const FROM_FOLDER = "Every note in the folder arrives as one item.";

const FROM_FILE = "What the note holds is this value.";

const FROM_NOTE_FIELD = "Reads one note: what it says, its name, or one of its properties.";

const TYPED_ITEMS = "The items live in this tile, not in the vault.";

const TYPED_VALUE = "The value lives in this tile.";

const FROM_ANOTHER = "Reads another widget on this board, and the two move together.";

const OWN_BOX_NOTE = "This widget keeps the pick to itself until you bind it.";

const FROM_STATISTICS = "Counts the notes in a folder, and this prop gets the one number that comes out.";

const READ_BY_MANY_FOLDER = "This folder is read by {field} widgets on this board.";

const READ_BY_MANY_NOTE = "This note is read by {field} widgets on this board.";

const FIELD_OF_NOTE = "{field} of {note}";

export function propRow(state, prop) {
	const { key, spec, config, binding, path } = prop;
	const readerCount = binding === "vault" ? state.countReaders(path) : 0;
	const at = listedFields(spec, binding) ? openedItem(state.openRow, key) : null;
	const under = at === null ? propBody(state, prop, readerCount) : itemBody(state, key, spec, config, at);
	const seed = binding === "hardcode" ? writtenText(spec, typedIn(spec, config) ?? declaredOf(spec)) : path;
	const body = h("div", { className: "wg-set-pop-body" }, under);
	const isOnAStep =
		at !== null ||
		state.openRow === sourcesOpenKey(key) ||
		(binding === "stat" && statStepOf(state.openRow, key) !== null);
	return editorPopover(state, `prop:${key}`, propTrigger(state, prop), body, seed, isOnAStep);
}

export function boundProp(state, key, spec) {
	const config = propConfigOf(state, key, spec);
	return { key, spec, config, binding: bindingOf(spec, config).binding, path: config.path || "" };
}

export function declaredProps(manifest, wanted) {
	return Object.entries(manifest.props ?? {}).filter(([, spec]) => wanted(spec));
}

export function propGroup(state) {
	const declared = declaredProps(state.manifest, (spec) => spec.design !== true)
		.filter(([key]) => !state.fed.includes(key))
		.filter(([, spec]) => isShown(spec, state.seen));
	if (declared.length === 0) return null;
	const rows = declared.map(([key, spec]) => propRow(state, boundProp(state, key, spec)));
	return group("props", declared.length > 1 ? "Sources" : "Source", rows, null);
}

function kindNote(spec, binding) {
	if (binding === "box") return OWN_BOX_NOTE;
	if (binding === "ref") return FROM_ANOTHER;
	if (binding === "stat") return FROM_STATISTICS;
	if (binding === "hardcode") return spec.kind === "value" ? TYPED_VALUE : TYPED_ITEMS;
	if (spec.kind !== "value") return FROM_FOLDER;
	return writtenPlainly(spec) ? FROM_NOTE_FIELD : FROM_FILE;
}

function readersNote(spec, readerCount) {
	if (readerCount < 2) return null;
	return h(
		"p",
		{ className: "wg-set-pop-note", key: "readers" },
		said(spec.kind === "value" ? READ_BY_MANY_NOTE : READ_BY_MANY_FOLDER, readerCount),
	);
}

function propHead(state, prop) {
	const { key, spec, config, binding } = prop;
	const said = config.implementation ? hostGatewayFor(spec, config)?.description : kindNote(spec, binding);
	return h("div", { className: "wg-set-pop-headline", key: "head" }, [
		h("div", { className: "wg-set-pop-head", key: "said" }, [
			h("span", { className: "wg-set-pop-title", key: "title" }, spec.label ?? key),
			h("span", { className: "wg-set-pop-hint", key: "hint" }, spec.hint ?? said),
		]),
		state.refs
			? h(ProblemsMark, { key: "problems", store: problemsOf(state.refs), propRef: refOf(state.tile.id, key) })
			: null,
		sourceButton(state, key, spec),
	]);
}

function unpickedLabel(spec) {
	return spec.kind === "value" ? "Pick a note" : "Pick a folder";
}

function boundLabel(state, prop) {
	const { spec, config, binding, path } = prop;
	if (config.implementation) return implementationLabel(state, prop);
	if (binding === "box") return "Its own";
	if (binding === "ref") return refLabel(state, config.ref);
	if (binding === "stat") return statLabel(config);
	if (binding === "hardcode") return typedLabel(spec, config);
	if (!path) return unpickedLabel(spec);
	const field = noteFieldOf(spec, config);
	if (!field || field === NOTE_CONTENT) return path;
	return said(FIELD_OF_NOTE, field, path);
}

function bindingBody(state, prop) {
	const { key, spec, config, binding } = prop;
	if (config.implementation) return implementationBody(state, prop);
	if (binding === "ref") return refBody(state, key, spec, config);
	if (binding === "box") return [];
	if (binding === "stat") return statBody(state, key, spec, config);
	if (binding !== "hardcode") return vaultBody(state, key, spec, config);
	if (isSwitched(spec)) return [];
	if (spec.options) return choiceBody(state, key, spec, config);
	return listedFields(spec, binding) ? itemRows(state, key, spec, config) : typedBody(state, key, spec, config);
}

function propValue(state, prop, switched) {
	const { key, spec, config, binding } = prop;
	if (switched) return switchedValue(state, key, spec, config);
	if (spec.options && binding === "hardcode") return h("span", { className: "wg-set-path" }, chosenLabel(spec, config));
	return pickedRowValue(spec, config, binding) ?? h("span", { className: "wg-set-path" }, boundLabel(state, prop));
}

function propTrigger(state, prop) {
	const { key, spec, config, binding } = prop;
	const switched = isSwitched(spec) && binding === "hardcode";
	return valueRow({
		label: spec.label ?? key,
		value: propValue(state, prop, switched),
		unset:
			!switched &&
			!spec.options &&
			!config.path &&
			typedIn(spec, config) === undefined &&
			!config.ref &&
			!config.implementation,
	});
}

function propBody(state, prop, readerCount) {
	const { key, spec, config } = prop;
	const head = propHead(state, prop);
	if (state.openRow === sourcesOpenKey(key)) return [head, ...sourceList(state, key, spec, config)];
	return [head, readersNote(spec, readerCount), ...bindingBody(state, prop)];
}
