import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { List, Row } from "@widgetarium/kit";
import { Chevron } from "../chevron.js";

export interface PressableRow {
	readonly isOpen: boolean;
	readonly onToggle: () => void;
	readonly className?: string;
}

export function platedRows(key: string, label: string | null, rows: ReactNode[]): ReactElement {
	return h("div", { key, className: "wg-studio-ai-spec-group" }, [
		label ? h("span", { key: "label", className: "wg-studio-ai-spec-label" }, label) : null,
		h(List, { key: "list" }, rows),
	]);
}

export function rowText(name: string, sub: string | null): ReactElement {
	return h("span", { key: "text", className: "wg-studio-ai-spec-text" }, [
		h("span", { key: "name", className: "wg-studio-ai-spec-name" }, name),
		sub ? h("span", { key: "sub", className: "wg-studio-ai-spec-sub" }, sub) : null,
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
	const press = {
		type: "button",
		className: "wg-studio-ai-spec-label is-fold",
		"aria-expanded": isOpen,
		onClick: onToggle,
	};
	return h("div", { key, className: "wg-studio-ai-spec-group" }, [
		h("button", { key: "label", ...press }, [label, h(Chevron, { key: "chevron", isOpen })]),
		foldOf(isOpen, h(List, {}, rows)),
	]);
}

export function foldOf(isOpen: boolean, children: ReactNode): ReactElement {
	return h(
		"div",
		{ key: "fold", className: isOpen ? "wg-studio-ai-fold" : "wg-studio-ai-fold is-shut" },
		h("div", {}, children),
	);
}

export function plainRow(key: string | number, name: string, sub: string | null): ReactElement {
	return h(Row, { key }, rowText(name, sub));
}

export function pressableRow({ isOpen, onToggle, className }: PressableRow, parts: ReactNode[]): ReactElement {
	const chevron = h(Chevron, { key: "more", isOpen });
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
