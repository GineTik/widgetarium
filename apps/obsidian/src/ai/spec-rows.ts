import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon, List, Row } from "@widgetarium/kit";

export interface PressableRow {
	readonly isOpen: boolean;
	readonly onToggle: () => void;
	readonly className?: string;
}

export function platedRows(key: string, label: string | null, rows: ReactNode[]): ReactElement {
	return h("div", { key, className: "wg-ai-spec-group" }, [
		label ? h("span", { key: "label", className: "wg-ai-spec-label" }, label) : null,
		h(List, { key: "list" }, rows),
	]);
}

export function rowText(name: string, sub: string | null): ReactElement {
	return h("span", { key: "text", className: "wg-ai-spec-text" }, [
		h("span", { key: "name", className: "wg-ai-spec-name" }, name),
		sub ? h("span", { key: "sub", className: "wg-ai-spec-sub" }, sub) : null,
	]);
}

export function plainRow(key: string | number, name: string, sub: string | null): ReactElement {
	return h(Row, { key }, rowText(name, sub));
}

export function pressableRow({ isOpen, onToggle, className }: PressableRow, parts: ReactNode[]): ReactElement {
	const chevron = h(Icon, { key: "more", name: isOpen ? "chevron-down" : "chevron-right", size: 16 });
	const press = { type: "button", "aria-expanded": isOpen, onClick: onToggle };
	return h(
		Row,
		{ key: "pressable", asChild: true, pressable: true, className },
		h("button", press, [...parts, chevron]),
	);
}
