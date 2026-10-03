import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "@widgetarium/kit";

export interface PressableRow {
	readonly isOpen: boolean;
	readonly onToggle: () => void;
	readonly className?: string;
}

export function platedRows(key: string, label: string | null, rows: ReactNode[]): ReactElement {
	return h("div", { key, className: "wg-ai-spec-group" }, [
		label ? h("span", { key: "label", className: "wg-ai-spec-label" }, label) : null,
		h("div", { key: "plate", className: "wg-ai-spec-plate" }, rows),
	]);
}

export function rowText(name: string, sub: string | null): ReactElement {
	return h("span", { key: "text", className: "wg-ai-spec-text" }, [
		h("span", { key: "name", className: "wg-ai-spec-name" }, name),
		sub ? h("span", { key: "sub", className: "wg-ai-spec-sub" }, sub) : null,
	]);
}

export function plainRow(key: string | number, name: string, sub: string | null): ReactElement {
	return h("div", { key, className: "wg-ai-spec-row" }, rowText(name, sub));
}

export function pressableRow({ isOpen, onToggle, className = "" }: PressableRow, parts: ReactNode[]): ReactElement {
	return h(
		"button",
		{
			key: "pressable",
			type: "button",
			className: `wg-ai-spec-row is-pressable ${className}`.trim(),
			"aria-expanded": isOpen,
			onClick: onToggle,
		},
		[...parts, h(Icon, { key: "more", name: isOpen ? "chevron-down" : "chevron-right", size: 16 })],
	);
}
