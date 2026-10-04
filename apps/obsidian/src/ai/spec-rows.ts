import { createElement as h, useState } from "react";
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

export interface Fold {
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

export function useFolds(): (section: string) => Fold {
	const [shut, setShut] = useState<ReadonlySet<string>>(new Set());
	return (section) => ({ isOpen: !shut.has(section), onToggle: () => setShut(toggledIn(shut, section)) });
}

export function foldedRows(key: string, label: string, rows: ReactNode[], { isOpen, onToggle }: Fold): ReactElement {
	const press = { type: "button", className: "wg-ai-spec-label is-fold", "aria-expanded": isOpen, onClick: onToggle };
	return h("div", { key, className: "wg-ai-spec-group" }, [
		h("button", { key: "label", ...press }, [label, foldChevron(isOpen)]),
		foldOf(isOpen, h(List, {}, rows)),
	]);
}

export function foldOf(isOpen: boolean, children: ReactNode): ReactElement {
	return h("div", { key: "fold", className: isOpen ? "wg-ai-fold" : "wg-ai-fold is-shut" }, h("div", {}, children));
}

export function foldChevron(isOpen: boolean): ReactElement {
	return h(Icon, {
		key: "chevron",
		name: "chevron-down",
		size: 16,
		className: isOpen ? "wg-ai-fold-chevron" : "wg-ai-fold-chevron is-shut",
	});
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

function toggledIn(shut: ReadonlySet<string>, section: string): ReadonlySet<string> {
	const next = new Set(shut);
	if (!next.delete(section)) next.add(section);
	return next;
}
