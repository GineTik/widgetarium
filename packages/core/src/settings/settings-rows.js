import { createElement as h } from "react";
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

export function titleCase(name) {
	return `${String(name).charAt(0).toUpperCase()}${String(name).slice(1)}`;
}

export function shownValue(value, fallback) {
	const held = value ?? fallback;
	if (held === undefined || held === null || held === "") return null;
	return String(held);
}

export function group(key, heading, rows, under) {
	return h(SidebarGroup, { className: "wg-set-group", key, label: heading, hint: under }, rows);
}

export function valueRow(parts) {
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

export function enterButton(state, step) {
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

export function reportRow(key, label, note, value, on) {
	return h(Row, { className: "wg-set-row", key }, [
		h(RowLabel, { className: "wg-set-two", key: "label" }, [
			label,
			h("span", { className: "wg-set-sub", key: "sub" }, note),
		]),
		h(RowValue, { className: `wg-set-value${on ? "" : " is-unset"}`, key: "value" }, value),
	]);
}

export function editorPopover(state, key, trigger, body, seed, isAlsoOpen) {
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

export function popoverFoot(state, onReset, onApply) {
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

export function textEditor(state, fallback, onApply) {
	return h("div", { className: "wg-set-pop-body" }, [
		h(Field, {
			block: true,
			key: "field",
			value: state.draft ?? "",
			placeholder: fallback === undefined || fallback === null ? "" : String(fallback),
			onInput: (event) => state.setDraft(event.target.value),
		}),
		popoverFoot(
			state,
			() => state.setDraft(fallback === undefined || fallback === null ? "" : String(fallback)),
			onApply,
		),
	]);
}

export function note(said) {
	return h("p", { className: "wg-set-pop-note", key: "note" }, said);
}

export function pickRow(key, label, onClick, checked) {
	return h(PopoverItem, { key, checked, onClick }, [h("span", { className: "wg-set-pop-name", key: "name" }, label)]);
}
