import type { App, CachedMetadata, TFile } from "obsidian";
import type { Frontmatter } from "@widgetarium/core/note-mark.js";

const REPARSE_DEADLINE_MS = 2000;

interface IntendedWrite {
	readonly props: Frontmatter;
	readonly isStillInFlight: boolean;
	readonly until: number;
}

const intendedByPath = new Map<string, IntendedWrite>();

// TRADE-OFF: held until the cache shows the write or the deadline passes, never on the identity of Obsidian's frontmatter object — nothing promises that object is replaced rather than edited in place
export function frontmatterOf(
	app: App,
	file: TFile,
	cache: CachedMetadata | null = app.metadataCache.getFileCache(file),
): Frontmatter | undefined {
	const cached: Frontmatter | undefined = cache?.frontmatter;
	const held = intendedByPath.get(file.path);
	if (!held) return cached;
	if (held.isStillInFlight) return held.props;
	if (Date.now() < held.until && !alreadyShows(cached, held.props)) return held.props;
	intendedByPath.delete(file.path);
	return cached;
}

// TRADE-OFF: recorded before the write is attempted, not after, because a synced vault hands the file back only once it has fetched it and every reader would answer with the replaced value meanwhile
export function intendWrite(path: string, props: Frontmatter): () => boolean {
	intendedByPath.set(path, { props, isStillInFlight: true, until: 0 });
	return () => intendedByPath.delete(path);
}

export function landWrite(path: string, props: Frontmatter): void {
	intendedByPath.set(path, { props, isStillInFlight: false, until: Date.now() + REPARSE_DEADLINE_MS });
}

export function carryIntentAcrossRename(was: string, now: string): void {
	const held = intendedByPath.get(was);
	if (!held || was === now) return;
	intendedByPath.delete(was);
	intendedByPath.set(now, held);
}

function alreadyShows(cached: Frontmatter | undefined, written: Frontmatter): boolean {
	return Object.keys(written).every((key) => JSON.stringify(cached?.[key]) === JSON.stringify(written[key]));
}
