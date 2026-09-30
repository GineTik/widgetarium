import { WIDGETS_DIR } from "./paths.js";
import { RECORD_FILE, cardOf, firstDifferingCardKey, recordIn } from "./engine/catalogue-index.js";
import type { Fields } from "./engine/catalogue-index.js";
import { compatibility } from "./engine/compatibility.js";
import { widgetKeyOf, widgetRef } from "./engine/widget-ref.js";
import { commitsOf } from "./engine/widget-lock.js";
import type { WidgetLock } from "./engine/widget-lock.js";
import { folderFor } from "./engine/github.js";
import { isObject } from "./engine/is-object.js";
import type { HeldWidgetFiles, Installing } from "./installer-context.js";

export interface Placement {
	readonly id: string;
	readonly commits: readonly string[];
	readonly isAbsorbed: boolean;
	readonly isNewGeneration: boolean;
}

const CARD_DIFFERS = "{widget}'s card says one thing about {key} and its code another, so it was not installed";

export async function placementForUpdate(
	installing: Installing,
	lock: WidgetLock,
	key: string,
	held: HeldWidgetFiles,
): Promise<Placement> {
	const generations = generationsIn(lock, key);
	const newest = generations[generations.length - 1];
	if (!newest) return { id: key, commits: [], isAbsorbed: false, isNewGeneration: false };
	const verdict = compatibility(await installedCard(installing, newest), fieldsIn(servedCard(held.files)));
	if (verdict.isCompatible)
		return { id: newest, commits: lockedCommits(lock, newest), isAbsorbed: true, isNewGeneration: false };
	return { id: widgetRef(key, held.commit), commits: [], isAbsorbed: false, isNewGeneration: true };
}

export async function placementForSharedCommit(
	installing: Installing,
	lock: WidgetLock,
	key: string,
	held: HeldWidgetFiles,
): Promise<Placement> {
	const written = fieldsIn(servedCard(held.files));
	for (const id of generationsIn(lock, key)) {
		if (compatibility(written, await installedCard(installing, id)).isCompatible)
			return { id, commits: lockedCommits(lock, id), isAbsorbed: true, isNewGeneration: false };
	}
	const isNewGeneration = generationsIn(lock, key).length > 0;
	return { id: isNewGeneration ? widgetRef(key, held.commit) : key, commits: [], isAbsorbed: false, isNewGeneration };
}

export async function cardMismatchIn({ declaredIn }: Installing, held: HeldWidgetFiles): Promise<string | null> {
	const served = servedCard(held.files);
	if (!served || !declaredIn) return null;
	const declared = await declaredIn(held);
	const card = fieldsIn(served);
	const differs = declared ? firstDifferingCardKey(cardOf(declared, card?.["api"]), card) : null;
	return differs ? CARD_DIFFERS.replace("{widget}", held.record.id).replace("{key}", differs) : null;
}

function lockedCommits(lock: WidgetLock, id: string): string[] {
	return commitsOf(lock.widgets[id]).filter((commit): commit is string => typeof commit === "string");
}

async function installedCard({ readJson }: Installing, id: string): Promise<Fields | null> {
	const folder = folderFor(WIDGETS_DIR, id);
	return fieldsIn(await readJson(`${folder}/${RECORD_FILE}`, null));
}

function servedCard(files: Readonly<Record<string, string>>): unknown {
	try {
		return JSON.parse(recordIn(files) ?? "null");
	} catch {
		return null;
	}
}

function fieldsIn(held: unknown): Fields | null {
	return isObject(held) ? held : null;
}

function generationsIn(lock: WidgetLock, key: string): string[] {
	return Object.keys(lock.widgets).filter((id) => widgetKeyOf(id) === key);
}
