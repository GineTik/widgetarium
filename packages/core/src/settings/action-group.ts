import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Field, Icon, IconButton, SidebarGroup, SidebarRow, Switch } from "@widgetarium/kit";
import type { RefDescription } from "../gateway/refs.js";
import {
	TARGET_FIELD,
	offeredCommandOf,
	offeredCommands,
	commandBindingOf,
	commandSpecsOf,
	isRunAllowed,
	targetOf,
	withRunAllowed,
} from "../surface/command-binding.js";
import type { CommandBinding, CommandTarget, OfferedCommand, ParsedCommandSpec } from "../surface/command-binding.js";
import { packFieldRows } from "./pack-fields.js";
import { draftOnInput, editorPopover, group, note, reportRow, valueRow } from "./settings-rows.js";
import type { SettingsState } from "./settings-state.js";

const ACTIONS_HINT = "What the widget can do. Each one runs through what you pick.";
const WHERE_IT_ACTS = "Where it acts";
const CHANGES_OF_TARGET: Readonly<Record<CommandTarget, string>> = {
	collection: "Rows it changes",
	value: "Value it sets",
};
const NOT_SET_UP = "Not set up: pick where it acts.";
const NOTHING_TO_CHANGE =
	"Nothing on this board holds what this changes yet. Place a widget that does, then pick it here.";
const FIND_IT = "Find a list or a widget";
const THIS_WIDGET = "This widget";
const RUN_DESCRIPTION = "runs it through what you picked";
const SWITCHED_HERE = "Switch it off and this tile can no longer do it, whatever the widget asks for.";

type Named = readonly [string, ParsedCommandSpec];

type OfferedRef = RefDescription & { readonly ref: string };

export function actionGroup(state: SettingsState): ReactElement | null {
	const commands = commandsOf(state);
	if (commands.length === 0) return null;
	return group(
		"actions",
		"Actions",
		commands.map((named) => commandRow(state, named)),
		ACTIONS_HINT,
	);
}

export function commandDataGroups(state: SettingsState): ReactElement[] {
	return commandsOf(state).map(([name, spec]) => {
		const binding = commandBindingOf(state.tile, name, spec);
		const isOn = isRunAllowed(binding, isVaultTarget(state, binding) || isPackCommand(binding));
		const flip = (next: boolean): void => writeBinding(state, name, withRunAllowed(binding, next));
		const toggle = h(Switch, { checked: isOn, label: spec.label, onChange: flip });
		return group(
			`can:${name}`,
			`What ${spec.label} can do`,
			reportRow("run", spec.label, RUN_DESCRIPTION, toggle, isOn),
			SWITCHED_HERE,
		);
	});
}

function commandsOf(state: SettingsState): Named[] {
	return Object.entries(commandSpecsOf(state.manifest.commands));
}

function commandRow(state: SettingsState, [name, spec]: Named): ReactElement {
	const binding = commandBindingOf(state.tile, name, spec);
	const sourcesOpen = state.openRow === sourcesKeyOf(name);
	const sub = spec.hint ?? sayingOf(binding);
	const trigger = valueRow({ label: spec.label, sub, value: null, unset: !binding.implementation });
	const choices =
		sourcesOpen || !hasChoicesOfItsOwn(binding)
			? implementationChoices(state, name, binding)
			: [...targetChoices(state, name, binding), ...fieldChoices(state, name, binding)];
	const body = h("div", { className: "wg-set-pop-body" }, [commandHead(state, name, spec, sourcesOpen), ...choices]);
	return editorPopover(state, popKeyOf(name), trigger, body, "", sourcesOpen);
}

function commandHead(state: SettingsState, name: string, spec: ParsedCommandSpec, sourcesOpen: boolean): ReactElement {
	const binding = commandBindingOf(state.tile, name, spec);
	return h("div", { className: "wg-set-pop-headline", key: "head" }, [
		h("div", { className: "wg-set-pop-head", key: "said" }, [
			h("span", { className: "wg-set-pop-title", key: "title" }, spec.label),
			h("span", { className: "wg-set-pop-hint", key: "hint" }, sayingOf(binding)),
		]),
		sourcesToggle(state, name, sourcesOpen),
	]);
}

function sourcesToggle(state: SettingsState, name: string, sourcesOpen: boolean): ReactElement {
	const onClick = (): void => state.openEditor(sourcesOpen ? popKeyOf(name) : sourcesKeyOf(name));
	const className = "wg-set-pop-source";
	const said = {
		size: "s" as const,
		key: "source",
		label: WHERE_IT_ACTS,
		className,
		"aria-pressed": sourcesOpen,
		onClick,
	};
	return h(IconButton, said, h(Icon, { name: "database" }));
}

function implementationChoices(state: SettingsState, name: string, binding: CommandBinding): ReactNode[] {
	const rows = offeredCommands().map((offered) =>
		implementationRow(state, { name, offered, selected: binding.implementation === offered.id }),
	);
	return [note(WHERE_IT_ACTS), h(SidebarGroup, { className: "wg-set-sources", key: "sources" }, rows)];
}

interface ImplementationRowAsk {
	readonly name: string;
	readonly offered: OfferedCommand;
	readonly selected: boolean;
}

function implementationRow(state: SettingsState, { name, offered, selected }: ImplementationRowAsk): ReactElement {
	const onClick = (): void => {
		writeBinding(state, name, { implementation: offered.id });
		if (offered.target || offered.fields) state.openEditor(popKeyOf(name), "");
	};
	return h(SidebarRow, { key: offered.id, as: "button", label: offered.title, sub: offered.said, selected, onClick });
}

function hasChoicesOfItsOwn(binding: CommandBinding): boolean {
	const offered = offeredCommandOf(binding.implementation);
	return Boolean(offered?.target || offered?.fields);
}

function fieldChoices(state: SettingsState, name: string, binding: CommandBinding): ReactNode[] {
	const schema = offeredCommandOf(binding.implementation)?.fields;
	if (!schema) return [];
	return packFieldRows(schema, binding.fields ?? {}, (fields) => writeBinding(state, name, { ...binding, fields }));
}

function isPackCommand(binding: CommandBinding): boolean {
	return offeredCommandOf(binding.implementation)?.isPack === true;
}

function targetKindOf(binding: CommandBinding): CommandTarget | null {
	return offeredCommandOf(binding.implementation)?.target ?? null;
}

function targetChoices(state: SettingsState, name: string, binding: CommandBinding): ReactNode[] {
	const target = targetKindOf(binding);
	if (!target) return [];
	const byTile = offeredByTile(state, target);
	if (byTile.size === 0) return [note(NOTHING_TO_CHANGE)];
	const groups = [...byTile].map(([tile, offered]) => tileGroup(state, { name, binding, tile, offered }));
	return [note(CHANGES_OF_TARGET[target]), findField(state), ...groups];
}

function findField(state: SettingsState): ReactElement {
	const onInput = draftOnInput(state);
	return h(Field, { block: true, key: "find", value: state.draft ?? "", placeholder: FIND_IT, onInput });
}

interface TileGroupAsk {
	readonly name: string;
	readonly binding: CommandBinding;
	readonly tile: string;
	readonly offered: readonly OfferedRef[];
}

function tileGroup(state: SettingsState, { name, binding, tile, offered }: TileGroupAsk): ReactElement {
	const label = tile === state.tile.id ? THIS_WIDGET : (offered[0]?.title ?? tile);
	const rows = offered.map((held) => {
		const pick = (): void =>
			writeBinding(state, name, { ...binding, fields: { ...binding.fields, [TARGET_FIELD]: held.ref } });
		const selected = binding.fields?.[TARGET_FIELD] === held.ref;
		return h(SidebarRow, { key: held.ref, as: "button", label: held.label, selected, onClick: pick });
	});
	return h(SidebarGroup, { className: "wg-set-sources", key: tile, label }, rows);
}

function offeredByTile(state: SettingsState, target: CommandTarget): Map<string, OfferedRef[]> {
	const typed = (state.draft ?? "").trim().toLowerCase();
	const byTile = new Map<string, OfferedRef[]>();
	const shown = refsOffered(state, target).filter(
		(held) => !typed || `${held.label} ${held.title}`.toLowerCase().includes(typed),
	);
	const ordered = shown.sort((one, other) => Number(other.tile === state.tile.id) - Number(one.tile === state.tile.id));
	for (const held of ordered) byTile.set(held.tile, [...(byTile.get(held.tile) ?? []), held]);
	return byTile;
}

function refsOffered(state: SettingsState, target: CommandTarget): OfferedRef[] {
	return (state.refs?.offered() ?? []).filter(
		(described): described is OfferedRef => described.kind === target && typeof described.ref === "string",
	);
}

function isVaultTarget(state: SettingsState, binding: CommandBinding): boolean {
	const target = targetOf(binding);
	return target ? state.refs?.described(target)?.isVault === true : false;
}

function sayingOf(binding: CommandBinding): string {
	if (!binding.implementation) return NOT_SET_UP;
	return offeredCommandOf(binding.implementation)?.said ?? binding.implementation;
}

function writeBinding(state: SettingsState, name: string, binding: CommandBinding): void {
	state.onPatch({ props: { ...state.tile.props, [name]: binding } });
}

function popKeyOf(name: string): string {
	return `command:${name}`;
}

function sourcesKeyOf(name: string): string {
	return `command:${name}#source`;
}
