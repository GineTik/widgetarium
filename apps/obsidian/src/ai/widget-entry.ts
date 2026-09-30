import { isObject } from "@widgetarium/core/engine/is-object.js";

export interface RoledCard {
	readonly id: string;
	readonly role: string | null;
}

export interface EntryPlace {
	readonly installed: boolean;
	readonly folder?: string;
	readonly files?: readonly string[];
	readonly origin?: string | null;
	readonly path?: string | null;
}

export interface WidgetEntry extends RoledCard, EntryPlace {
	readonly pack: string;
	readonly title: string;
	readonly description: string;
	readonly keywords: string[];
	readonly defaultSize: unknown;
	readonly api: number;
}

export type CardFrom = (raw: unknown, id: string, extra: EntryPlace) => WidgetEntry;

export function cardFrom(raw: unknown, id: string, extra: EntryPlace): WidgetEntry {
	const held = isObject(raw) ? raw : {};
	const { title, description, keywords, api, role } = held;
	return {
		id,
		pack: String(id).split("/")[0] ?? "",
		title: typeof title === "string" && title !== "" ? title : id,
		description: typeof description === "string" ? description : "",
		keywords: Array.isArray(keywords) ? keywords.map(String) : [],
		defaultSize: held["defaultSize"] ?? null,
		api: typeof api === "number" && Number.isInteger(api) ? api : 1,
		role: typeof role === "string" ? role : null,
		...extra,
	};
}

export function mergeEntries(installed: readonly WidgetEntry[], offered: readonly WidgetEntry[]): WidgetEntry[] {
	const held = new Map<string, WidgetEntry>();
	for (const entry of [...offered, ...installed]) {
		if (!entry.id) continue;
		const was = held.get(entry.id);
		held.set(entry.id, was ? { ...was, ...entry } : entry);
	}
	return [...held.values()].sort((one, other) => one.id.localeCompare(other.id));
}
