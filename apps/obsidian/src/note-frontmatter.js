const REPARSE_DEADLINE_MS = 2000;

const intendedByPath = new Map();

// TRADE-OFF: held until the cache shows the write or the deadline passes, never on the identity of Obsidian's frontmatter object — nothing promises that object is replaced rather than edited in place
export function frontmatterOf(app, file, cache = app.metadataCache.getFileCache(file)) {
	const cached = cache?.frontmatter;
	const held = intendedByPath.get(file.path);
	if (!held) return cached;
	if (held.isStillInFlight) return held.props;
	if (Date.now() < held.until && !alreadyShows(cached, held.props)) return held.props;
	intendedByPath.delete(file.path);
	return cached;
}

// TRADE-OFF: recorded before the write is attempted, not after, because a synced vault hands the file back only once it has fetched it and every reader would answer with the replaced value meanwhile
export function intendWrite(path, props) {
	intendedByPath.set(path, { props, isStillInFlight: true, until: 0 });
	return () => intendedByPath.delete(path);
}

export function landWrite(path, props) {
	intendedByPath.set(path, { props, isStillInFlight: false, until: Date.now() + REPARSE_DEADLINE_MS });
}

export function carryIntentAcrossRename(was, now) {
	const held = intendedByPath.get(was);
	if (!held || was === now) return;
	intendedByPath.delete(was);
	intendedByPath.set(now, held);
}

function alreadyShows(cached, written) {
	return Object.keys(written).every((key) => JSON.stringify(cached?.[key]) === JSON.stringify(written[key]));
}
