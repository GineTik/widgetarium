import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Field, Icon, PopoverItem } from "@widgetarium/kit";
import type { TileProp } from "../model.js";
import { NOTE_CONTENT, NOTE_NAME, noteFieldOf } from "../gateway/obsidian.js";
import { NOTHING_OFFERED, offeredEntries } from "./offered-boxes.js";
import type { OfferedEntry } from "./offered-boxes.js";
import { FROM_WIDGET, IN_VAULT, writeProp, writtenPlainly } from "./prop-writing.js";
import { draftOnInput, popoverFoot } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";
import { FOLDERS_SHOWN, offeredPaths } from "./vault-paths.js";

const NOTE_FIELDS_HEADING = "Which part of the note";

const NOTE_WITHOUT_PROPERTIES = "This note has no properties yet.";

export function vaultBody(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactNode[] {
	const offered = offeredPaths(state.host, spec);
	const path = config.path ? String(config.path) : "";
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
			onInput: draftOnInput(state),
		}),
		...found.map((entry) => pickedItem(entry, entry, entry === path, () => pickNote(state, key, spec, config, entry))),
		popoverFoot(
			state,
			() => state.setDraft(""),
			(typed) => writeProp(state, key, spec, { ...config, from: IN_VAULT, path: typed.trim() }),
		),
	];
}

export function refBody(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactElement[] {
	const wanted = spec.kind === "value" ? "value" : "collection";
	const offered = offeredEntries(state.refs).filter((entry) => entry.tile !== state.tile.id && entry.kind === wanted);
	if (offered.length === 0) return [h("p", { className: "wg-set-pop-note", key: "none" }, NOTHING_OFFERED)];
	const byTitle = new Map<string, OfferedEntry[]>();
	for (const entry of offered) byTitle.set(entry.title, [...(byTitle.get(entry.title) ?? []), entry]);
	const pick = (entry: OfferedEntry): void =>
		writeProp(state, key, spec, { ...config, from: FROM_WIDGET, ref: entry.ref });
	return [...byTitle.entries()].flatMap(([title, entries]) => [
		h("p", { className: "wg-set-pop-note", key: `t${title}` }, title),
		...entries.map((entry) => pickedItem(entry.ref, entry.label, entry.ref === config.ref, () => pick(entry))),
	]);
}

function pickedItem(key: string, label: ReactNode, checked: boolean, onClick: () => void): ReactElement {
	return h(PopoverItem, { key, checked, onClick }, [h("span", { className: "wg-set-pop-name", key: "name" }, label)]);
}

function noteFieldItems(
	state: SettingsState,
	key: string,
	spec: SettingsSpec,
	config: TileProp,
	path: string,
): ReactNode[] {
	if (!writtenPlainly(spec) || !path) return [];
	const picked = noteFieldOf(spec, { field: typeof config.field === "string" ? config.field : undefined });
	const properties = state.host?.propertiesOf?.(path) ?? [];
	const pick = (field: string): void => writeProp(state, key, spec, { ...config, from: IN_VAULT, path, field });
	const item = (field: string, label: string): ReactElement =>
		pickedItem(`field:${field}`, label, field === picked, () => pick(field));
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

function pickNote(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp, entry: string): void {
	if (!writtenPlainly(spec)) {
		state.setDraft(entry);
		return;
	}
	writeProp(state, key, spec, { ...config, from: IN_VAULT, path: entry });
}
