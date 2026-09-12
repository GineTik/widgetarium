import { ROOT } from "../paths.js";
import { contentHash } from "./content-hash.js";

export const MODULES_DIR = `${ROOT}/modules`;

const ESM_HOST = "https://esm.sh";
const SAFE_NAME = /^(?:@[a-zA-Z0-9][a-zA-Z0-9._-]*\/)?[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const SAFE_RANGE = /^[a-zA-Z0-9.^~*|<>=\s+-]+$/;
const SAFE_VERSION = /^[a-zA-Z0-9][a-zA-Z0-9.+-]*$/;

export function keyFor(name, version) {
	return `${name}@${version}`;
}

export function nameIn(key) {
	const held = String(key ?? "");
	const at = held.lastIndexOf("@");
	return at > 0 ? held.slice(0, at) : "";
}

export function moduleFolder(key) {
	return `${MODULES_DIR}/${key}`;
}

export function modulePath(key) {
	return `${moduleFolder(key)}/index.js`;
}

export function facadeUrl(name, range) {
	return `${ESM_HOST}/${name}@${encodeURIComponent(range)}?bundle&external=react,react-dom`;
}

export function realPathIn(facade) {
	const found = /export\s*\*\s*from\s*["']([^"']+)["']/.exec(String(facade ?? ""));
	return found ? found[1] : null;
}

export function versionIn(path, name) {
	const held = String(path ?? "");
	const prefix = `/${name}@`;
	if (!held.startsWith(prefix)) return null;
	return held.slice(prefix.length).split("/")[0] || null;
}

export function declaredDependencies(manifest) {
	const held = manifest?.dependencies;
	if (!held || typeof held !== "object" || Array.isArray(held)) return [];
	return Object.entries(held).map(([name, range]) => [name, String(range ?? "")]);
}

export function createModuleSpace({ adapter, fetchText }) {
	const refuse = (failure) => ({ ok: false, key: null, path: null, hash: null, failure });

	async function makeFolder(path) {
		if (!(await adapter.exists(path))) await adapter.mkdir(path);
	}

	async function makeFolders(key) {
		const folder = moduleFolder(key);
		const scope = folder.slice(0, folder.lastIndexOf("/"));
		await makeFolder(MODULES_DIR);
		if (scope.length > MODULES_DIR.length) await makeFolder(scope);
		await makeFolder(folder);
	}

	async function download(key, realPath) {
		const text = await fetchText(`${ESM_HOST}${realPath}`);
		await makeFolders(key);
		await adapter.write(modulePath(key), text);
		return { ok: true, key, path: modulePath(key), hash: contentHash(text), failure: null };
	}

	async function resolveKey(name, range) {
		if (!SAFE_NAME.test(String(name ?? ""))) return refuse(`"${name}" is not a package name`);
		if (!SAFE_RANGE.test(String(range ?? ""))) return refuse(`"${name}" asks for "${range}", which is not a version`);

		const realPath = realPathIn(await fetchText(facadeUrl(name, range)));
		const version = versionIn(realPath, name);
		if (!version || !SAFE_VERSION.test(version)) return refuse(`esm.sh answered "${name}@${range}" with something that is not that package`);
		return { ok: true, key: keyFor(name, version), realPath, failure: null };
	}

	return {
		async take(lock, name, range) {
			try {
				const found = await resolveKey(name, range);
				if (!found.ok) return found;

				const held = lock?.modules?.[found.key];
				if (held && (await adapter.exists(modulePath(found.key)))) return { ok: true, key: found.key, path: modulePath(found.key), hash: held.hash, failure: null };
				return await download(found.key, found.realPath);
			} catch (failure) {
				return refuse(`cannot fetch "${name}@${range}": ${String(failure?.message ?? failure)}`);
			}
		},

		async collect(key) {
			const folder = moduleFolder(key);
			if (await adapter.exists(folder)) await adapter.rmdir(folder, true);
		},
	};
}
