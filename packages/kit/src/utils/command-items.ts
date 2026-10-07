import { Children, isValidElement } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { isElement } from "./dom-nodes";

export const COMMAND_ITEM = "[data-command-item]:not([disabled])";

export interface CommandItemWords {
	readonly value?: string | undefined;
	readonly keywords?: readonly string[] | undefined;
	readonly children?: ReactNode;
}

export function textOfNode(node: ReactNode): string {
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) return node.map(textOfNode).join(" ");
	if (isValidElement<{ children?: ReactNode }>(node)) return textOfNode(node.props.children);
	return "";
}

export function commandValueOf(item: CommandItemWords): string {
	return (item.value ?? textOfNode(item.children)).trim();
}

export function matchesSearch(item: CommandItemWords, search: string): boolean {
	const asked = search.trim().toLowerCase();
	if (asked === "") return true;
	return [commandValueOf(item), ...(item.keywords ?? [])].some((word) => word.toLowerCase().includes(asked));
}

export function itemsIn(children: ReactNode, isItem: (type: unknown) => boolean): CommandItemWords[] {
	const found: CommandItemWords[] = [];
	Children.forEach(children, (child) => {
		if (!isValidElement<CommandItemWords>(child)) return;
		if (isItem(child.type)) found.push(child.props);
		else found.push(...itemsIn(child.props.children, isItem));
	});
	return found;
}

export function movesBetweenCommandItems(event: KeyboardEvent<HTMLElement>): void {
	const items = [...event.currentTarget.querySelectorAll<HTMLElement>(COMMAND_ITEM)];
	if (items.length === 0) return;
	if (event.key === "Enter" && isElement(event.target) && event.target.tagName === "INPUT") {
		event.preventDefault();
		items[0]?.click();
		return;
	}
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
	event.preventDefault();
	const at = items.findIndex((item) => item === document.activeElement);
	const step = event.key === "ArrowDown" ? 1 : -1;
	items[(at + step + items.length) % items.length]?.focus();
}
