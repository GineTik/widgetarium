import { WIDGETS_DIR, LOCK_PATH } from "./paths.js";
import { releaseModules, withoutEntry } from "./engine/widget-lock.js";
import { folderFor, idOfFolder } from "./engine/github.js";
import { refuse } from "./installer-context.js";

export async function rebuildDrifted(installing, lockNow) {
	const { adapter, writeJson } = installing;
	if (!(await adapter.exists(WIDGETS_DIR))) return { rebuilt: [], failures: [] };

	let lock = await lockNow();
	const rebuilt = [];
	const failures = [];
	for (const folder of await everyWidgetFolder(adapter)) {
		const made = await rebuiltIfDrifted(installing, lock, folder);
		if (made === null) continue;
		if (!made.ok) failures.push({ id: made.id, failure: made.failure });
		else {
			lock = made.lock;
			rebuilt.push(made.id);
		}
	}
	if (rebuilt.length > 0) await writeJson(LOCK_PATH, lock);
	for (const each of failures) console.error(`[widgetarium] ${each.id} did not build: ${each.failure}`);
	return { rebuilt, failures };
}

export async function uninstall({ adapter, space, writeJson }, lock, id) {
	if (!lock.widgets[id]) return refuse("that widget was not installed from a repository");

	const folder = folderFor(WIDGETS_DIR, id);
	for (const name of Object.keys(lock.widgets[id].files ?? {})) {
		if (await adapter.exists(`${folder}/${name}`)) await adapter.remove(`${folder}/${name}`);
	}
	if (await adapter.exists(folder)) await adapter.rmdir(folder, true);

	const released = releaseModules(lock, id);
	for (const key of released.collected) await space.collect(key);
	await writeJson(LOCK_PATH, withoutEntry(released.lock, id));
	return { ok: true, id, failure: null };
}

async function everyWidgetFolder(adapter) {
	const found = [];
	for (const scope of (await adapter.list(WIDGETS_DIR)).folders) found.push(...(await adapter.list(scope)).folders);
	return found;
}

async function rebuiltIfDrifted({ builder }, lock, folder) {
	const id = idOfFolder(folder);
	if (!id) return null;

	const files = await builder.sourceAndSheetsAt(folder);
	if (files === null) return null;
	if (await builder.isCurrent(lock.builds[id] ?? null, folder, files)) return null;

	return { id, ...(await builder.rebuild(lock, id, folder, files)) };
}
