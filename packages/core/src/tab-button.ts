import { createElement as h } from "react";
import type { FocusEvent, KeyboardEvent, ReactElement } from "react";
import type { TabStrip } from "./use-tab-strip.js";

export function tabButtonOf(tab: string, strip: TabStrip): ReactElement {
	const isEditing = strip.editing === tab;
	return h(
		"button",
		{
			type: "button",
			key: tab,
			className: `wg-kit-btn is-s${tab === strip.selected ? "" : " is-ghost"} wg-tabs-tab${isEditing ? " is-editing" : ""}`,
			role: "tab",
			"aria-selected": tab === strip.selected ? "true" : "false",
			contentEditable: isEditing ? "true" : undefined,
			suppressContentEditableWarning: true,
			onClick: () => {
				if (!isEditing) strip.select(tab);
			},
			onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
				if (isEditing) answerEditingKey(event, tab, strip);
			},
			onBlur: (event: FocusEvent<HTMLButtonElement>) => {
				if (isEditing) strip.rename(tab, event.currentTarget);
			},
			ref: (node: HTMLButtonElement | null) => {
				if (node && isEditing) takeCaret(node);
			},
		},
		tab,
	);
}

function answerEditingKey(event: KeyboardEvent<HTMLButtonElement>, tab: string, strip: TabStrip): void {
	if (event.key === "Enter") {
		event.preventDefault();
		strip.rename(tab, event.currentTarget);
	}
	if (event.key === "Escape") {
		event.currentTarget.textContent = tab;
		strip.setEditing("");
	}
}

function takeCaret(node: HTMLElement): void {
	if (node.ownerDocument.activeElement === node) return;
	node.focus();
	// TRADE-OFF: the node's own window, because a bare getSelection() is not a global everywhere
	const selection = node.ownerDocument.defaultView?.getSelection?.();
	if (!selection) return;
	const range = node.ownerDocument.createRange();
	range.selectNodeContents(node);
	selection.removeAllRanges();
	selection.addRange(range);
}
