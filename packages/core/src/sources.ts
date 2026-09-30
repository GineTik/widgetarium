import { isObject } from "./engine/is-object.js";
import type { WidgetSourcePlace } from "./engine/source-offers.js";

const SOURCE_UNREADABLE = "[widgetarium] this source names neither a folder nor a repository, so it was skipped";

export interface SourceLists {
	readonly added?: unknown;
	readonly legacy?: unknown;
	readonly shipped?: unknown;
}

export function sourcesOf({ added, legacy, shipped }: SourceLists): WidgetSourcePlace[] {
	const held: WidgetSourcePlace[] = [];
	const seen = new Set<string>();
	for (const source of [...asList(added), ...asList(fieldOf(legacy, "sources")), ...asList(shipped)]) {
		if (!isReachableSource(source)) {
			console.error(SOURCE_UNREADABLE, source);
			continue;
		}
		const identity = identityOf(source);
		if (seen.has(identity)) continue;
		seen.add(identity);
		held.push(source);
	}
	return held;
}

export function identityOf(source: WidgetSourcePlace | null | undefined): string {
	return namesARepository(source)
		? `${source.repository}#${source.ref ?? ""}/${source.path ?? ""}`
		: String(source?.path ?? "");
}

export const isReachableSource = (source: unknown): source is WidgetSourcePlace =>
	isObject(source) && carriesAWorkableRef(source) && (namesARepository(source) || namesAFolderOnThisMachine(source));

export const namesAFolderOnThisMachine = (source: unknown): boolean =>
	!namesARepository(source) && isNamed(fieldOf(source, "path"));

const namesARepository = (source: unknown): source is WidgetSourcePlace & { readonly repository: string } =>
	isNamed(fieldOf(source, "repository"));

const carriesAWorkableRef = (source: unknown): boolean => {
	const ref = fieldOf(source, "ref");
	return ref === undefined || isNamed(ref);
};

const isNamed = (held: unknown): held is string => typeof held === "string" && held !== "";

const asList = (held: unknown): readonly unknown[] => (Array.isArray(held) ? held : []);

const fieldOf = (held: unknown, key: string): unknown => (isObject(held) ? held[key] : undefined);
