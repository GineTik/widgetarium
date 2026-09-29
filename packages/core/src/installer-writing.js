import { WIDGETS_DIR, LOCK_PATH } from "./paths.js";
import {
	INSTALL_PENDING,
	commitsOf,
	readLock,
	lockEntry,
	withBuild,
	withEntry,
	withModule,
} from "./engine/widget-lock.js";
import { declaredDependencies } from "./engine/modules.js";
import { scopeOf } from "./engine/widget-source.js";
import { folderFor } from "./engine/github.js";
import { refuse } from "./installer-context.js";
import { cardMismatchIn } from "./installer-placement.js";

export async function installPlaced(installing, listed, held, placed) {
	const mismatch = await cardMismatchIn(installing, held);
	if (mismatch) return refuse(mismatch);
	const made = await makeFor(installing, readLock(await installing.readJson(LOCK_PATH, null)), placed.id, held);
	if (!made.ok) return refuse(made.failure);
	await writeGeneration(installing, { listed, held, placed, made });
	return { ok: true, id: placed.id, commit: held.commit, isNewGeneration: placed.isNewGeneration, failure: null };
}

export async function absorbCommit({ writeJson }, lock, id, commit) {
	const entry = lock.widgets[id];
	await writeJson(LOCK_PATH, withEntry(lock, id, { ...entry, commits: [...new Set([...commitsOf(entry), commit])] }));
	return { ok: true, id, commit, isNewGeneration: false, failure: null };
}

async function makeFor(installing, lock, id, held) {
	const resolved = await withDependencies(installing, lock, id, held.record);
	if (!resolved.ok) return resolved;
	const folder = folderFor(WIDGETS_DIR, id);
	return installing.builder.make({
		lock: resolved.lock,
		id,
		folder,
		files: held.files,
		aboutToBeWritten: whatTheScopeIsAboutToGet(folder, held.scope),
	});
}

async function writeGeneration(installing, { listed, held, placed, made }) {
	const { writeJson } = installing;
	const id = placed.id;
	const folder = folderFor(WIDGETS_DIR, id);
	const source = listed?.origin ?? listed?.manifest?.repository;
	const described = {
		source,
		commit: held.commit,
		files: held.files,
		path: listed?.manifest?.path ?? null,
		commits: placed.commits,
	};
	await writeJson(LOCK_PATH, withEntry(made.lock, id, lockEntry({ ...described, state: INSTALL_PENDING })));
	await writeWidget(installing, folder, held.files, made);
	await writeWhatTheScopeShares(installing, folder, held.scope);
	await writeJson(LOCK_PATH, withBuild(withEntry(made.lock, id, lockEntry(described)), id, made.record));
}

async function writeWidget({ adapter, builder }, folder, files, made) {
	await adapter.mkdir(scopeOf(folder));
	await adapter.mkdir(folder);
	for (const [name, text] of Object.entries(files)) {
		for (const inner of foldersLeadingTo(name)) await adapter.mkdir(`${folder}/${inner}`);
		await adapter.write(`${folder}/${name}`, text);
	}
	if (made.built.from) await builder.writeBuild(folder, made.built, made.css);
}

function foldersLeadingTo(name) {
	const parts = name.split("/").slice(0, -1);
	return parts.map((part, at) => parts.slice(0, at + 1).join("/"));
}

function whatTheScopeIsAboutToGet(folder, scope) {
	const held = {};
	for (const [name, text] of Object.entries(scope ?? {})) held[`${scopeOf(folder)}/${name}`] = text;
	return held;
}

async function writeWhatTheScopeShares({ adapter }, folder, scope) {
	for (const [name, text] of Object.entries(scope)) await adapter.write(`${scopeOf(folder)}/${name}`, text);
}

async function withDependencies({ space }, lock, id, manifest) {
	let held = lock;
	for (const [name, range] of declaredDependencies(manifest)) {
		const found = await space.take(held, name, range);
		if (!found.ok) return { ok: false, lock: held, failure: found.failure };
		held = withModule(held, id, found);
	}
	return { ok: true, lock: held, failure: null };
}
