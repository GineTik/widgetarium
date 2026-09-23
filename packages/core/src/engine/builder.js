import { buildIsCurrent, buildRecord, withBuild, withModule } from "./widget-lock.js";
import {
	SHEET_FILES,
	SOURCE_FILES,
	buildFolder,
	builtCodePath,
	builtSheetPath,
	compileWidget,
	sourceFileIn,
} from "./widget-build.js";
import { TAILWIND, TAILWIND_RANGE, importsTailwind, buildSheet, candidatesIn } from "./tailwind.js";
import { moduleFromBundle } from "./compiled-module.js";

export function compiledSource(files, folder) {
	const from = sourceFileIn(files);
	if (!from) return { ok: true, from: null, code: null, failure: null };
	try {
		return { ok: true, from, code: compileWidget(files[from], `${folder}/${from}`), failure: null };
	} catch (failure) {
		return {
			ok: false,
			from: null,
			code: null,
			failure: `${from} did not compile: ${String(failure?.message ?? failure)}`,
		};
	}
}

export function createBuilder({ adapter, space }) {
	async function writeBuild(folder, built, css) {
		await adapter.mkdir(buildFolder(folder));
		await adapter.write(builtCodePath(folder), built.code);
		if (css !== null) return adapter.write(builtSheetPath(folder), css);
		if (await adapter.exists(builtSheetPath(folder))) await adapter.remove(builtSheetPath(folder));
	}

	async function make({ lock, id, folder, files, aboutToBeWritten = {} }) {
		const built = compiledSource(files, folder);
		if (!built.ok) return refused(lock, built.failure);

		const styled = await styledBy({ adapter, space, lock, id, folder, files, code: built.code, aboutToBeWritten });
		if (!styled.ok) return refused(lock, styled.failure);

		return {
			ok: true,
			lock: styled.lock,
			built,
			css: styled.css,
			record: recordOfBuild(folder, built, styled, files),
			failure: null,
		};
	}

	return {
		writeBuild,
		make,

		async isCurrent(record, folder, files) {
			if (!inputNamesFor(folder, files).every((path) => path in (record?.inputs ?? {}))) return false;

			const onDisk = {};
			for (const path of Object.keys(record.inputs)) onDisk[path] = await readIfThere(adapter, path);
			return buildIsCurrent(record, onDisk);
		},

		async sourceAndSheetsAt(folder) {
			const held = {};
			for (const name of [...SOURCE_FILES, ...SHEET_FILES]) {
				const text = await readIfThere(adapter, `${folder}/${name}`);
				if (text !== null) held[name] = text;
			}
			return sourceFileIn(held) ? held : null;
		},

		async rebuild(lock, id, folder, files) {
			const made = await make({ lock, id, folder, files });
			if (!made.ok) return { ok: false, lock, failure: made.failure };

			await writeBuild(folder, made.built, made.css);
			return { ok: true, lock: withBuild(made.lock, id, made.record), failure: null };
		},
	};
}

function refused(lock, failure) {
	return { ok: false, lock, built: null, css: null, record: null, failure };
}

function inputNamesFor(folder, files) {
	const from = sourceFileIn(files);
	const names = from ? [from] : [];
	for (const name of SHEET_FILES) {
		if (typeof files?.[name] === "string") names.push(name);
	}
	return names.map((name) => `${folder}/${name}`);
}

function recordOfBuild(folder, built, styled, files) {
	if (!built.from) return null;

	const own = {};
	for (const path of inputNamesFor(folder, files)) own[path] = files[path.slice(folder.length + 1)];
	return buildRecord({ from: built.from, compiler: styled.compiler, inputs: { ...own, ...styled.inputs } });
}

async function styledBy({ adapter, space, lock, id, folder, files, code, aboutToBeWritten }) {
	const name = SHEET_FILES.find((each) => typeof files?.[each] === "string");
	if (!name || !importsTailwind(files[name]))
		return { ok: true, lock, css: null, compiler: null, inputs: {}, failure: null };

	const found = await space.take(lock, TAILWIND, TAILWIND_RANGE);
	if (!found.ok) return { ok: false, lock, css: null, compiler: null, inputs: null, failure: found.failure };

	const done = await buildSheet({
		entry: { path: `${folder}/${name}`, content: files[name], base: folder },
		compiler: moduleFromBundle(await adapter.read(found.path), found.path),
		sheetOfTailwind: (each) => space.takeAsset(found.key, each),
		readFile: async (path) => aboutToBeWritten[path] ?? readIfThere(adapter, path),
		candidates: candidatesIn(code),
	});
	return { ...done, compiler: found.key, lock: withModule(lock, id, found) };
}

async function readIfThere(adapter, path) {
	return (await adapter.exists(path)) ? adapter.read(path) : null;
}
