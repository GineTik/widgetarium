import { markOf, withMark } from "./note-mark.js";
import type { Frontmatter } from "./note-mark.js";
import type { DuplicateIdReport } from "./gateway/contract.js";

const KEY = "wgId";

const REPORT =
	"Widgetarium: {count} records claim the id {id}. {keeps} keeps it; the rest are re-minted on their next write.";

export interface IdentifiedRecord {
	readonly id?: string | null;
	readonly path: string;
}

type Held<T> = T | null | undefined;

// TRADE-OFF: the flat key is still read, because nothing bulk-rewrites a vault.
export function readId(props: unknown): string | null {
	const id = markOf(props)[KEY] ?? flatIdOf(props);
	return typeof id === "string" && id.trim() !== "" ? id.trim() : null;
}

export function withId(props: Held<Frontmatter>, id: string): Frontmatter {
	return withMark(props, { [KEY]: id });
}

export function mintId(): string {
	return crypto.randomUUID();
}

// TRADE-OFF: path-sort, not ctime — ctime lies across a copy and across sync.
export function duplicateIds(records: Held<readonly Held<IdentifiedRecord>[]>): DuplicateIdReport[] {
	const byId = new Map<string, IdentifiedRecord[]>();
	for (const record of records ?? []) {
		if (!record?.id) continue;
		byId.set(record.id, [...(byId.get(record.id) ?? []), record]);
	}
	return [...byId].flatMap(([id, held]) => reportOf(id, held));
}

export function mustRemint(duplicates: Held<readonly DuplicateIdReport[]>, path: string): boolean {
	return (duplicates ?? []).some((entry) => entry.remints.includes(path));
}

// TRADE-OFF: forgotten here rather than re-detected, because the list() after a write reads a metadata cache that has not reparsed yet.
export function withoutRemint(duplicates: Held<readonly DuplicateIdReport[]>, path: string): DuplicateIdReport[] {
	return (duplicates ?? [])
		.map((entry) => ({ ...entry, remints: entry.remints.filter((held) => held !== path) }))
		.filter((entry) => entry.remints.length > 0);
}

export function reportDuplicates(duplicates: readonly DuplicateIdReport[], said: (sentence: string) => void): void {
	for (const entry of duplicates) {
		said(
			REPORT.replace("{count}", String(entry.remints.length + 1))
				.replace("{id}", entry.id)
				.replace("{keeps}", entry.keeps),
		);
	}
}

function flatIdOf(props: unknown): unknown {
	return typeof props === "object" && props !== null && KEY in props ? props[KEY] : undefined;
}

function reportOf(id: string, held: readonly IdentifiedRecord[]): DuplicateIdReport[] {
	const [kept, ...reminted] = [...held].sort((first, second) => (first.path < second.path ? -1 : 1));
	if (!kept || reminted.length === 0) return [];
	return [{ id, keeps: kept.path, remints: reminted.map((record) => record.path) }];
}
