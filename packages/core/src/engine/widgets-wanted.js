const INSTALLED_BUT_MISSING = "{widget} installed without landing in the vault, so it will not be asked for again";

export function createWantedWidgets(door) {
	const kept = { refused: new Map(), fetching: new Set() };
	return {
		want: (ids, onStep) => wantThem(door, kept, ids, onStep),
		refusalOf: (id) => kept.refused.get(id) ?? null,
	};
}

async function wantThem(door, kept, ids, onStep) {
	const asked = stillWorthAsking(ids, door, kept);
	if (asked.length === 0) return [];
	for (const id of asked) kept.fetching.add(id);
	try {
		await installEach(door, kept, asked, onStep);
	} catch (failure) {
		refuseUnresolved(door, kept, asked, String(failure?.message ?? failure));
	} finally {
		await absorb(door, kept, asked);
	}
	return asked;
}

async function installEach(door, kept, ids, onStep) {
	for (const id of ids) {
		onStep?.(id);
		const done = await door.installOne(id);
		if (!done.ok) kept.refused.set(id, done.failure);
	}
}

async function absorb(door, kept, asked) {
	await door.reread();
	const landed = asked.filter((id) => door.isHeld(id));
	if (landed.length > 0) door.onInstalled?.(landed);
	for (const id of asked) kept.fetching.delete(id);
	refuseUnresolved(door, kept, asked, null);
}

function refuseUnresolved(door, kept, ids, why) {
	for (const id of ids) {
		if (door.isHeld(id) || kept.refused.has(id)) continue;
		kept.refused.set(id, why ?? INSTALLED_BUT_MISSING.replace("{widget}", id));
	}
}

function stillWorthAsking(ids, door, kept) {
	return [...new Set(ids)].filter((id) => !door.isHeld(id) && !kept.refused.has(id) && !kept.fetching.has(id));
}
