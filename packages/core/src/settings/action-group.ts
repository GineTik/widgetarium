import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Field, Icon, IconButton, SidebarGroup, SidebarRow, Switch } from "@widgetarium/kit";
import type { CommandSpec } from "../gateway/manifest.js";
import type { RefDescription } from "../gateway/refs.js";
import { isObject } from "../engine/is-object.js";
import { TARGET_FIELD, TYPED_ROW_COMMANDS, TYPED_VALUE_COMMANDS } from "../surface/host-commands.js";
import { draftOnInput, editorPopover, group, note, reportRow, valueRow } from "./settings-rows.js";
import type { SettingsState } from "./settings-state.js";

const ACTIONS_HINT = "What the widget can do. Each one runs through what you pick.";
const WHERE_IT_ACTS = "Where it acts";
const ROWS_IT_CHANGES = "Rows it changes";
const VALUE_IT_SETS = "Value it sets";
const NOT_SET_UP = "Not set up: pick where it acts.";
const NOTHING_TYPED = "Nothing on this board is typed by hand yet. Type it into a widget first, then pick it here.";
const ONLY_TYPED = "Only what is typed by hand is offered.";
const FIND_IT = "Find a list or a widget";
const THIS_WIDGET = "This widget";
const RUN_SAYS = "runs it through what you picked";
const SWITCHED_HERE = "Switch it off and this tile can no longer do it, whatever the widget asks for.";

const COMMAND_TITLES: Readonly<Record<string, { readonly title: string; readonly said: string }>> = {
	"@core/typed-rows-create": { title: "Add a row", said: "Adds a row to a typed list on this board." },
	"@core/typed-rows-update": { title: "Change a row", said: "Rewrites a row of a typed list on this board." },
	"@core/typed-rows-remove": { title: "Remove a row", said: "Drops a row from a typed list on this board." },
	"@core/typed-value-set": { title: "Set a value", said: "Sets a value typed on this board." },
};

interface CommandBinding {
	readonly implementation?: string;
	readonly fields?: Readonly<Record<string, unknown>>;
	readonly allow?: readonly string[];
}

type Offered = RefDescription & { readonly ref: string };

export function actionGroup(state: SettingsState): ReactElement | null {
	const commands = commandsOf(state);
	if (commands.length === 0) return null;
	return group(
		"actions",
		"Actions",
		commands.map(([name, spec]) => commandRow(state, name, spec)),
		ACTIONS_HINT,
	);
}

export function commandDataGroups(state: SettingsState): ReactElement[] {
	return commandsOf(state).map(([name, spec]) => {
		const binding = bindingOf(state, name);
		const isOn = !Array.isArray(binding.allow) || binding.allow.includes("run");
		const flip = (next: boolean): void => writeBinding(state, name, { ...binding, allow: next ? ["run"] : [] });
		return group(
			`can:${name}`,
			`What ${spec.label} can do`,
			reportRow("run", spec.label, RUN_SAYS, h(Switch, { checked: isOn, label: spec.label, onChange: flip }), isOn),
			SWITCHED_HERE,
		);
	});
}

function commandsOf(state: SettingsState): (readonly [string, CommandSpec])[] {
	const held = state.manifest.commands;
	if (!isObject(held)) return [];
	return Object.entries(held).filter((entry): entry is [string, CommandSpec] => isCommandSpec(entry[1]));
}

function isCommandSpec(held: unknown): held is CommandSpec {
	return isObject(held) && typeof held["label"] === "string";
}

function commandRow(state: SettingsState, name: string, spec: CommandSpec): ReactElement {
	const binding = bindingOf(state, name, spec);
	const trigger = valueRow({
		label: spec.label,
		sub: spec.hint ?? sayingOf(binding),
		value: null,
		unset: !binding.implementation,
	});
	const sourcesOpen = state.openRow === sourcesKeyOf(name);
	const body = h("div", { className: "wg-set-pop-body" }, [
		commandHead(state, name, spec, binding),
		...(sourcesOpen || !binding.implementation ? sourceRows(state, name, binding) : targetChoice(state, name, binding)),
	]);
	return editorPopover(state, popKeyOf(name), trigger, body, "", sourcesOpen);
}

function commandHead(state: SettingsState, name: string, spec: CommandSpec, binding: CommandBinding): ReactElement {
	const isOpen = state.openRow === sourcesKeyOf(name);
	return h("div", { className: "wg-set-pop-headline", key: "head" }, [
		h("div", { className: "wg-set-pop-head", key: "said" }, [
			h("span", { className: "wg-set-pop-title", key: "title" }, spec.label),
			h("span", { className: "wg-set-pop-hint", key: "hint" }, sayingOf(binding)),
		]),
		h(
			IconButton,
			{
				size: "s",
				key: "source",
				label: WHERE_IT_ACTS,
				className: "wg-set-pop-source",
				"aria-pressed": isOpen,
				onClick: () => state.openEditor(isOpen ? popKeyOf(name) : sourcesKeyOf(name)),
			},
			h(Icon, { name: "database" }),
		),
	]);
}

function sourceRows(state: SettingsState, name: string, binding: CommandBinding): ReactNode[] {
	const implementations = [...Object.keys(TYPED_ROW_COMMANDS), ...Object.keys(TYPED_VALUE_COMMANDS)];
	const rows = implementations.map((implementation) =>
		h(SidebarRow, {
			key: implementation,
			as: "button",
			label: COMMAND_TITLES[implementation]?.title ?? implementation,
			sub: COMMAND_TITLES[implementation]?.said,
			selected: binding.implementation === implementation,
			onClick: () => {
				writeBinding(state, name, { implementation });
				state.openEditor(popKeyOf(name), "");
			},
		}),
	);
	return [note(WHERE_IT_ACTS), h(SidebarGroup, { className: "wg-set-sources", key: "sources" }, rows)];
}

function targetChoice(state: SettingsState, name: string, binding: CommandBinding): ReactNode[] {
	const kind = binding.implementation && TYPED_VALUE_COMMANDS[binding.implementation] ? "value" : "collection";
	const offered = typedOffered(state, kind);
	if (offered.length === 0) return [note(NOTHING_TYPED)];
	const typed = (state.draft ?? "").trim().toLowerCase();
	const shown = offered.filter((held) => !typed || `${held.label} ${held.title}`.toLowerCase().includes(typed));
	const byTile = [...new Set(shown.map((held) => held.tile))].sort((one, other) =>
		one === state.tile.id ? -1 : other === state.tile.id ? 1 : 0,
	);
	const target = binding.fields?.[TARGET_FIELD];
	return [
		note(kind === "value" ? VALUE_IT_SETS : ROWS_IT_CHANGES),
		h(Field, {
			block: true,
			key: "find",
			value: state.draft ?? "",
			placeholder: FIND_IT,
			onInput: draftOnInput(state),
		}),
		...byTile.map((tile, index) =>
			h(
				SidebarGroup,
				{
					className: "wg-set-sources",
					key: tile,
					label: tile === state.tile.id ? THIS_WIDGET : (shown.find((held) => held.tile === tile)?.title ?? tile),
					hint: index === byTile.length - 1 ? ONLY_TYPED : undefined,
				},
				shown
					.filter((held) => held.tile === tile)
					.map((held) =>
						h(SidebarRow, {
							key: held.ref,
							as: "button",
							label: held.label,
							selected: target === held.ref,
							onClick: () =>
								writeBinding(state, name, { ...binding, fields: { ...binding.fields, [TARGET_FIELD]: held.ref } }),
						}),
					),
			),
		),
	];
}

function typedOffered(state: SettingsState, kind: string): Offered[] {
	return (state.refs?.offered() ?? []).filter(
		(described): described is Offered =>
			described.kind === kind && described.isTyped === true && typeof described.ref === "string",
	);
}

function sayingOf(binding: CommandBinding): string {
	if (!binding.implementation) return NOT_SET_UP;
	return COMMAND_TITLES[binding.implementation]?.said ?? binding.implementation;
}

function bindingOf(state: SettingsState, name: string, spec?: CommandSpec): CommandBinding {
	const held: unknown = state.tile.props?.[name];
	if (isObject(held)) return held;
	return spec?.source ? { implementation: spec.source.implementation } : {};
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
