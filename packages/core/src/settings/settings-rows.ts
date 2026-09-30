import { createElement as h } from "react";
import type { FormEvent, MouseEvent, ReactElement, ReactNode } from "react";
import {
	Button,
	Field,
	Icon,
	IconButton,
	Popover,
	PopoverItem,
	Row,
	RowLabel,
	RowValue,
	SidebarGroup,
	SidebarRow,
} from "@widgetarium/kit";
import type { MountStep } from "./use-settings-look.js";

export interface EditorState {
	readonly openRow: string | null;
	readonly draft: string;
	readonly openEditor: (next: string | null, seed?: string) => void;
	readonly setDraft: (next: string) => void;
}

export interface EnteringState {
	readonly enter: (step: MountStep) => void;
}

export interface ValueRowParts {
	readonly key?: string | undefined;
	readonly label: ReactNode;
	readonly value: ReactNode;
	readonly sub?: ReactNode;
	readonly glyph?: ReactNode;
	readonly after?: ReactNode;
	readonly unset?: boolean | undefined;
	readonly onClick?: (() => void) | undefined;
}

export type Apply = (typed: string) => void;

export function titleCase(name: unknown): string {
	return `${String(name).charAt(0).toUpperCase()}${String(name).slice(1)}`;
}

export function shownValue(value: unknown, fallback: unknown): string | null {
	const held = value ?? fallback;
	if (held === undefined || held === null || held === "") return null;
	return String(held);
}

export function group(key: string, heading: ReactNode, rows: ReactNode, under: ReactNode): ReactElement {
	return h(SidebarGroup, { className: "wg-set-group", key, label: heading, hint: under }, rows);
}

export function valueRow(parts: ValueRowParts): ReactElement {
	return h(SidebarRow, {
		className: "wg-set-row",
		key: parts.key,
		pressable: true,
		unset: parts.unset,
		onClick: parts.onClick,
		icon: parts.glyph,
		label: parts.label,
		sub: parts.sub,
		value: parts.value,
		after: parts.after ?? h(Icon, { name: "chevron", className: "wg-set-chev", key: "chev" }),
	});
}

export function enterButton(state: EnteringState, step: MountStep): ReactElement {
	return h(
		IconButton,
		{
			size: "s",
			key: "enter",
			className: "wg-set-enter",
			label: "Open its own settings",
			onClick: (event: MouseEvent) => {
				event.stopPropagation();
				state.enter(step);
			},
		},
		h(Icon, { name: "chevron" }),
	);
}

export function reportRow(key: string, label: ReactNode, note: ReactNode, value: ReactNode, on: boolean): ReactElement {
	return h(Row, { className: "wg-set-row", key }, [
		h(RowLabel, { className: "wg-set-two", key: "label" }, [
			label,
			h("span", { className: "wg-set-sub", key: "sub" }, note),
		]),
		h(RowValue, { className: `wg-set-value${on ? "" : " is-unset"}`, key: "value" }, value),
	]);
}

export function editorPopover(
	state: EditorState,
	key: string,
	trigger: ReactNode,
	body: ReactNode,
	seed?: string,
	isAlsoOpen?: boolean,
): ReactElement {
	return h(
		Popover,
		{
			key,
			className: "wg-set-pop",
			isOpen: state.openRow === key || isAlsoOpen === true,
			onOpenChange: (next: boolean) => state.openEditor(next ? key : null, seed),
			trigger,
		},
		body,
	);
}

export function useItButton(disabled: boolean, onClick: () => void): ReactElement {
	return h(Button, { size: "s", variant: "accent", key: "use", disabled, onClick }, "Use it");
}

export function popoverFoot(state: EditorState, onReset: () => void, onApply: Apply): ReactElement {
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

export function textEditor(state: EditorState, fallback: unknown, onApply: Apply): ReactElement {
	const fallbackText = fallback === undefined || fallback === null ? "" : String(fallback);
	return h("div", { className: "wg-set-pop-body" }, [
		h(Field, {
			block: true,
			key: "field",
			value: state.draft ?? "",
			placeholder: fallbackText,
			onInput: draftOnInput(state),
		}),
		popoverFoot(state, () => state.setDraft(fallbackText), onApply),
	]);
}

export function note(said: ReactNode): ReactElement {
	return h("p", { className: "wg-set-pop-note", key: "note" }, said);
}

export function pickRow(key: string, label: ReactNode, onClick: () => void, checked?: boolean): ReactElement {
	return h(PopoverItem, { key, checked, onClick }, [h("span", { className: "wg-set-pop-name", key: "name" }, label)]);
}

export function draftOnInput(state: Pick<EditorState, "setDraft">): (event: FormEvent) => void {
	return (event) => state.setDraft(typedValueOf(event.target));
}

function typedValueOf(target: EventTarget): string {
	return "value" in target && typeof target.value === "string" ? target.value : "";
}
