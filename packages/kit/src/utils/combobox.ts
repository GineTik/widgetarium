import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import { isRecord } from "./is-record";

export const COMBOBOX_ITEM = "[data-slot='combobox-item']:not([data-disabled])";

export type ItemGuard<T> = (value: unknown) => value is T;

export type ItemsRender<X> = ReactNode | ((item: X, index: number) => ReactNode);

export interface ItemNaming<T> {
	readonly keyOf?: ((item: T) => string) | undefined;
	readonly labelOf?: ((item: T) => string) | undefined;
}

export interface ComboboxEntry<T> {
	readonly item: T;
	readonly key: string;
	readonly label: string;
}

const keysOfObjects = new WeakMap<object, string>();
const objectsKeyed = { count: 0 };

export function isText(value: unknown): value is string {
	return typeof value === "string";
}

export function entriesOf<T>(items: readonly T[], naming: ItemNaming<T>): ComboboxEntry<T>[] {
	const byKey = new Map<string, ComboboxEntry<T>>();
	for (const item of items) {
		const key = naming.keyOf ? `v:${naming.keyOf(item)}` : itemKeyOf(item);
		if (!byKey.has(key)) byKey.set(key, { item, key, label: entryLabelOf(item, naming) });
	}
	return [...byKey.values()];
}

export function itemKeyOf(item: unknown): string {
	if ((typeof item === "object" && item !== null) || typeof item === "function") return objectKeyOf(item);
	return `${typeof item}:${String(item)}`;
}

export function labelOfItem(item: unknown): string {
	if (typeof item === "string") return item;
	if (typeof item === "number") return String(item);
	if (!isRecord(item)) return "";
	if (typeof item["label"] === "string") return item["label"];
	return typeof item["value"] === "string" ? item["value"] : "";
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

export function drawEach<X>(items: readonly X[], render: ItemsRender<X>): ReactNode {
	return typeof render === "function" ? items.map(render) : render;
}

function entryLabelOf<T>(item: T, naming: ItemNaming<T>): string {
	if (naming.labelOf) return naming.labelOf(item);
	return labelOfItem(item) || (naming.keyOf?.(item) ?? "");
}

function objectKeyOf(item: object): string {
	const held = keysOfObjects.get(item);
	if (held !== undefined) return held;
	objectsKeyed.count += 1;
	const key = `object:${objectsKeyed.count}`;
	keysOfObjects.set(item, key);
	return key;
}
