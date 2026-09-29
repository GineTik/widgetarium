import { WIDGETS_DIR } from "./paths.js";
import { RECORD_FILE, cardOf, firstDifferingCardKey, recordIn } from "./engine/catalogue-index.js";
import { compatibility } from "./engine/compatibility.js";
import { widgetKeyOf, widgetRef } from "./engine/widget-ref.js";
import { commitsOf } from "./engine/widget-lock.js";
import { folderFor } from "./engine/github.js";

const CARD_DIFFERS = "{widget}'s card says one thing about {key} and its code another, so it was not installed";

export async function placementForUpdate(installing, lock, key, held) {
	const newest = generationsIn(lock, key).at(-1);
	if (!newest) return { id: key, commits: [], isAbsorbed: false, isNewGeneration: false };
	const verdict = compatibility(await installedCard(installing, newest), servedCard(held.files));
	if (verdict.isCompatible)
		return { id: newest, commits: commitsOf(lock.widgets[newest]), isAbsorbed: true, isNewGeneration: false };
	return { id: widgetRef(key, held.commit), commits: [], isAbsorbed: false, isNewGeneration: true };
}

export async function placementForSharedCommit(installing, lock, key, held) {
	const written = servedCard(held.files);
	for (const id of generationsIn(lock, key)) {
		if (compatibility(written, await installedCard(installing, id)).isCompatible)
			return { id, commits: commitsOf(lock.widgets[id]), isAbsorbed: true, isNewGeneration: false };
	}
	const isNewGeneration = generationsIn(lock, key).length > 0;
	return { id: isNewGeneration ? widgetRef(key, held.commit) : key, commits: [], isAbsorbed: false, isNewGeneration };
}

export async function cardMismatchIn({ declaredIn }, held) {
	const served = servedCard(held.files);
	if (!served || !declaredIn) return null;
	const declared = await declaredIn(held);
	const differs = declared ? firstDifferingCardKey(cardOf(declared, served.api), served) : null;
	return differs ? CARD_DIFFERS.replace("{widget}", held.record.id).replace("{key}", differs) : null;
}

async function installedCard({ readJson }, id) {
	const folder = folderFor(WIDGETS_DIR, id);
	return readJson(`${folder}/${RECORD_FILE}`, null);
}

function servedCard(files) {
	try {
		return JSON.parse(recordIn(files) ?? "null");
	} catch {
		return null;
	}
}

function generationsIn(lock, key) {
	return Object.keys(lock.widgets).filter((id) => widgetKeyOf(id) === key);
}
