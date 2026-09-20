import { markOf, withMark } from "./note-mark.js";

const KEY = "wgId";

// CONTEXT: the flat key is accepted on read — nothing bulk-rewrites a vault here
export function readId(props) {
	const id = markOf(props)[KEY] ?? props?.[KEY];
	return typeof id === "string" && id.trim() !== "" ? id.trim() : null;
}

export function withId(props, id) {
	return withMark(props, { [KEY]: id });
}

export function mintId() {
	return crypto.randomUUID();
}

// CONTEXT: duplicates come from copies, and a synced vault makes a random winner disagree
// TRADE-OFF: path-sort, not ctime — ctime lies across a copy and across sync
export function duplicateIds(records) {
	const byId = new Map();
	for (const record of records ?? []) {
		if (!record?.id) continue;
		byId.set(record.id, [...(byId.get(record.id) ?? []), record]);
	}
	const found = [];
	for (const [id, held] of byId) {
		if (held.length < 2) continue;
		const sorted = [...held].sort((first, second) => (first.path < second.path ? -1 : 1));
		found.push({ id, keeps: sorted[0].path, remints: sorted.slice(1).map((record) => record.path) });
	}
	return found;
}

// CONTEXT: detection is a read, the re-mint is a write — it waits for one
export function mustRemint(duplicates, path) {
	return (duplicates ?? []).some((entry) => entry.remints.includes(path));
}

// TRADE-OFF: forgotten here rather than re-detected, because the list() that follows a write reads a metadata cache that has not reparsed yet and would name the same record a loser all over again
export function withoutRemint(duplicates, path) {
	return (duplicates ?? [])
		.map((entry) => ({ ...entry, remints: entry.remints.filter((held) => held !== path) }))
		.filter((entry) => entry.remints.length > 0);
}

// CONTEXT: authored whole, filled by replace — a built sentence cannot be reordered
const REPORT =
	"Widgetarium: {count} records claim the id {id}. {keeps} keeps it; the rest are re-minted on their next write.";

export function reportDuplicates(duplicates, said) {
	for (const entry of duplicates) {
		said(
			REPORT.replace("{count}", String(entry.remints.length + 1))
				.replace("{id}", entry.id)
				.replace("{keeps}", entry.keeps),
		);
	}
}
