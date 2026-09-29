import { createElement as h } from "react";
import { Field, Icon, PopoverItem } from "@widgetarium/kit";
import { NOTE_CONTENT, NOTE_NAME, noteFieldOf } from "../gateway/obsidian.js";
import { NOTHING_OFFERED } from "./offered-boxes.js";
import { FROM_WIDGET, IN_VAULT, writeProp, writtenPlainly } from "./prop-writing.js";
import { popoverFoot } from "./settings-rows.js";
import { FOLDERS_SHOWN, offeredPaths } from "./vault-paths.js";

const NOTE_FIELDS_HEADING = "Which part of the note";

const NOTE_WITHOUT_PROPERTIES = "This note has no properties yet.";

export function vaultBody(state, key, spec, config) {
	const offered = offeredPaths(state.host, spec);
	const path = config.path ?? "";
	const needle = String(state.draft ?? "").toLowerCase();
	const found = offered.filter((entry) => entry.toLowerCase().includes(needle)).slice(0, FOLDERS_SHOWN);
	return [
		...noteFieldItems(state, key, spec, config, path),
		h(Field, {
			block: true,
			key: "field",
			icon: h(Icon, { name: "search" }),
			value: state.draft ?? "",
			placeholder: spec.kind === "value" ? "Note in the vault" : "Folder in the vault",
			onInput: (event) => state.setDraft(event.target.value),
		}),
		...found.map((entry) =>
			h(
				PopoverItem,
				{ key: entry, checked: entry === path, onClick: () => pickNote(state, key, spec, config, entry) },
				[h("span", { className: "wg-set-pop-name", key: "name" }, entry)],
			),
		),
		popoverFoot(
			state,
			() => state.setDraft(""),
			(typed) => writeProp(state, key, spec, { ...config, from: IN_VAULT, path: typed.trim() }),
		),
	];
}

export function refBody(state, key, spec, config) {
	const offered = (state.refs?.offered?.() ?? []).filter(
		(entry) => entry.tile !== state.tile.id && entry.kind === (spec.kind === "value" ? "value" : "collection"),
	);
	if (offered.length === 0) return [h("p", { className: "wg-set-pop-note", key: "none" }, NOTHING_OFFERED)];
	const byTitle = new Map();
	for (const entry of offered) byTitle.set(entry.title, [...(byTitle.get(entry.title) ?? []), entry]);
	return [...byTitle.entries()].flatMap(([title, entries]) => [
		h("p", { className: "wg-set-pop-note", key: `t${title}` }, title),
		...entries.map((entry) =>
			h(
				PopoverItem,
				{
					key: entry.ref,
					checked: entry.ref === config.ref,
					onClick: () => writeProp(state, key, spec, { ...config, from: FROM_WIDGET, ref: entry.ref }),
				},
				[h("span", { className: "wg-set-pop-name", key: "name" }, entry.label)],
			),
		),
	]);
}

function noteFieldItems(state, key, spec, config, path) {
	if (!writtenPlainly(spec) || !path) return [];
	const picked = noteFieldOf(spec, config);
	const properties = state.host?.propertiesOf?.(path) ?? [];
	const pick = (field) => writeProp(state, key, spec, { ...config, from: IN_VAULT, path, field });
	const item = (field, label) =>
		h(PopoverItem, { key: `field:${field}`, checked: field === picked, onClick: () => pick(field) }, [
			h("span", { className: "wg-set-pop-name", key: "name" }, label),
		]);
	return [
		h("p", { className: "wg-set-pop-note", key: "fields" }, NOTE_FIELDS_HEADING),
		item(NOTE_CONTENT, "Content"),
		item(NOTE_NAME, "Name"),
		...properties.filter((name) => name !== NOTE_CONTENT && name !== NOTE_NAME).map((name) => item(name, name)),
		properties.length === 0
			? h("p", { className: "wg-set-pop-note", key: "no-properties" }, NOTE_WITHOUT_PROPERTIES)
			: null,
	];
}

function pickNote(state, key, spec, config, entry) {
	if (!writtenPlainly(spec)) {
		state.setDraft(entry);
		return;
	}
	writeProp(state, key, spec, { ...config, from: IN_VAULT, path: entry });
}
