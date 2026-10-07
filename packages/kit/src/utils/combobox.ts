import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import { isRecord } from "./is-record";

export const COMBOBOX_ITEM = "[data-slot='combobox-item']:not([data-disabled])";

export function stringOfItem(item: unknown): string {
	if (typeof item === "string") return item;
	if (typeof item === "number") return String(item);
	if (isRecord(item) && typeof item["label"] === "string") return item["label"];
	if (isRecord(item) && typeof item["value"] === "string") return item["value"];
	return String(item);
}

export function optionIdOf(listId: string, key: string): string {
	return `${listId}-option-${encodeURIComponent(key)}`;
}

export function matchesQuery(text: string, query: string): boolean {
	const asked = query.trim().toLowerCase();
	return asked === "" || text.toLowerCase().includes(asked);
}

export function itemValuesIn(children: ReactNode, isItem: (type: unknown) => boolean): unknown[] {
	const found: unknown[] = [];
	Children.forEach(children, (child) => {
		if (!isValidElement<{ value?: unknown; children?: ReactNode }>(child)) return;
		if (isItem(child.type)) found.push(child.props.value);
		else found.push(...itemValuesIn(child.props.children, isItem));
	});
	return found;
}

export function asCallerItems<T>(values: readonly unknown[]): T[] {
	// TRADE-OFF: context erases the item type; these are the caller's own items handed back
	return values.map((value) => value as T);
}
