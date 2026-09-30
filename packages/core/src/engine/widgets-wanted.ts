import { failureMessage } from "./failure-message.js";

interface InstallOutcome {
	readonly ok: boolean;
	readonly failure?: string | null;
}

interface WidgetDoor {
	isHeld(id: string): boolean;
	installOne(id: string): Promise<InstallOutcome>;
	reread(): Promise<unknown>;
	onInstalled?: (ids: readonly string[]) => unknown;
}

type OnWantedStep = (id: string) => void;

interface WantedWidgets {
	want(ids: readonly string[], onStep?: OnWantedStep): Promise<string[]>;
	refusalOf(id: string): string | null;
}

interface Kept {
	readonly refused: Map<string, string | null | undefined>;
	readonly fetching: Set<string>;
}

const INSTALLED_BUT_MISSING = "{widget} installed without landing in the vault, so it will not be asked for again";

export function createWantedWidgets(door: WidgetDoor): WantedWidgets {
	const kept: Kept = { refused: new Map(), fetching: new Set() };
	return {
		want: (ids, onStep) => wantThem(door, kept, ids, onStep),
		refusalOf: (id) => kept.refused.get(id) ?? null,
	};
}

async function wantThem(
	door: WidgetDoor,
	kept: Kept,
	ids: readonly string[],
	onStep: OnWantedStep | undefined,
): Promise<string[]> {
	const asked = stillWorthAsking(ids, door, kept);
	if (asked.length === 0) return [];
	for (const id of asked) kept.fetching.add(id);
	try {
		await installEach(door, kept, asked, onStep);
	} catch (failure) {
		refuseUnresolved(door, kept, asked, failureMessage(failure));
	} finally {
		await absorb(door, kept, asked);
	}
	return asked;
}

async function installEach(
	door: WidgetDoor,
	kept: Kept,
	ids: readonly string[],
	onStep: OnWantedStep | undefined,
): Promise<void> {
	for (const id of ids) {
		onStep?.(id);
		const done = await door.installOne(id);
		if (!done.ok) kept.refused.set(id, done.failure);
	}
}

async function absorb(door: WidgetDoor, kept: Kept, asked: readonly string[]): Promise<void> {
	await door.reread();
	const landed = asked.filter((id) => door.isHeld(id));
	if (landed.length > 0) door.onInstalled?.(landed);
	for (const id of asked) kept.fetching.delete(id);
	refuseUnresolved(door, kept, asked, null);
}

function refuseUnresolved(door: WidgetDoor, kept: Kept, ids: readonly string[], why: string | null): void {
	for (const id of ids) {
		if (door.isHeld(id) || kept.refused.has(id)) continue;
		kept.refused.set(id, why ?? INSTALLED_BUT_MISSING.replace("{widget}", id));
	}
}

function stillWorthAsking(ids: readonly string[], door: WidgetDoor, kept: Kept): string[] {
	return [...new Set(ids)].filter((id) => !door.isHeld(id) && !kept.refused.has(id) && !kept.fetching.has(id));
}
