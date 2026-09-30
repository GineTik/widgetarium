import { WIDGETS_DIR, LOCK_PATH } from "./paths.js";
import { releaseModules, withoutEntry } from "./engine/widget-lock.js";
import type { WidgetLock } from "./engine/widget-lock.js";
import { folderFor, idOfFolder } from "./engine/github.js";
import { isObject } from "./engine/is-object.js";
import { refuse } from "./installer-context.js";
import type { InstallerAdapter, Installing, Refusal } from "./installer-context.js";

export interface BuildFailure {
	readonly id: string;
	readonly failure: string;
}

export interface RebuiltDrifted {
	readonly rebuilt: string[];
	readonly failures: BuildFailure[];
}

export type Uninstalled = { readonly ok: true; readonly id: string; readonly failure: null } | Refusal;

type Remade =
	| { readonly ok: true; readonly id: string; readonly lock: WidgetLock; readonly failure: null }
	| { readonly ok: false; readonly id: string; readonly lock: WidgetLock; readonly failure: string };

export async function rebuildDrifted(
	installing: Installing,
	lockNow: () => Promise<WidgetLock>,
): Promise<RebuiltDrifted> {
	const { adapter, writeJson } = installing;
	if (!(await adapter.exists(WIDGETS_DIR))) return { rebuilt: [], failures: [] };

	let lock = await lockNow();
	const rebuilt: string[] = [];
	const failures: BuildFailure[] = [];
	for (const folder of await everyWidgetFolder(adapter)) {
		const made = await rebuildIfDrifted(installing, lock, folder);
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

export async function uninstall(
	{ adapter, space, writeJson }: Installing,
	lock: WidgetLock,
	id: string,
): Promise<Uninstalled> {
	const entry = lock.widgets[id];
	if (!entry) return refuse("that widget was not installed from a repository");

	const folder = folderFor(WIDGETS_DIR, id);
	for (const name of Object.keys(filesOf(entry))) {
		if (await adapter.exists(`${folder}/${name}`)) await adapter.remove(`${folder}/${name}`);
	}
	if (folder !== null && (await adapter.exists(folder))) await adapter.rmdir(folder, true);

	const released = releaseModules(lock, id);
	for (const key of released.collected) await space.collect(key);
	await writeJson(LOCK_PATH, withoutEntry(released.lock, id));
	return { ok: true, id, failure: null };
}

function filesOf(entry: unknown): object {
	const files = isObject(entry) ? entry["files"] : null;
	return isObject(files) ? files : {};
}

async function everyWidgetFolder(adapter: InstallerAdapter): Promise<string[]> {
	const found: string[] = [];
	for (const scope of (await adapter.list(WIDGETS_DIR)).folders) found.push(...(await adapter.list(scope)).folders);
	return found;
}

async function rebuildIfDrifted({ builder }: Installing, lock: WidgetLock, folder: string): Promise<Remade | null> {
	const id = idOfFolder(folder);
	if (!id) return null;

	const files = await builder.sourceAndSheetsAt(folder);
	if (files === null) return null;
	if (await builder.isCurrent(lock.builds[id] ?? null, folder, files)) return null;

	return { id, ...(await builder.rebuild(lock, id, folder, files)) };
}
