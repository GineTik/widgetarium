import { ROOT } from "../paths.js";
import { contentHash } from "./content-hash.js";
import { failureMessage } from "./failure-message.js";
import { isObject } from "./is-object.js";

export interface ModuleAdapter {
	exists(path: string): Promise<boolean>;
	mkdir(path: string): Promise<unknown>;
	read(path: string): Promise<string>;
	write(path: string, text: string): Promise<unknown>;
	rmdir(path: string, recursive: boolean): Promise<unknown>;
}

export interface LockedModules {
	readonly modules?: Readonly<Record<string, unknown>>;
}

export type ModuleRefusal = {
	readonly ok: false;
	readonly key: null;
	readonly path: null;
	readonly hash: null;
	readonly failure: string;
};

export type TakenModule =
	| { readonly ok: true; readonly key: string; readonly path: string; readonly hash: string; readonly failure: null }
	| ModuleRefusal;

export interface ModuleSpace {
	take(lock: LockedModules | null | undefined, name: string, range: string): Promise<TakenModule>;
	takeAsset(key: string, name: string): Promise<string>;
	collect(key: string): Promise<void>;
}

export interface ModuleSpaceDoors {
	readonly adapter: ModuleAdapter;
	readonly fetchText: (url: string) => Promise<string>;
}

type ResolvedKey =
	{ readonly ok: true; readonly key: string; readonly realPath: string; readonly failure: null } | ModuleRefusal;

export const MODULES_DIR = `${ROOT}/modules`;

const ESM_HOST = "https://esm.sh";
const SAFE_NAME = /^(?:@[a-zA-Z0-9][a-zA-Z0-9._-]*\/)?[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const SAFE_RANGE = /^[a-zA-Z0-9.^~*|<>=\s+-]+$/;
const SAFE_VERSION = /^[a-zA-Z0-9][a-zA-Z0-9.+-]*$/;
const SAFE_ASSET = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

const KEPT_OUTSIDE_A_BUNDLE: readonly string[] = ["react", "react-dom"];
export const HELD_BY_THE_ENGINE: readonly string[] = [
	"widgetarium",
	"widgetarium/kit",
	"widgetarium/kit/emojis",
	"widgetarium/kit/charts",
];
export const ANSWERED_BY_THE_ENGINE: readonly string[] = [...HELD_BY_THE_ENGINE, ...KEPT_OUTSIDE_A_BUNDLE];

export function keyFor(name: string, version: string): string {
	return `${name}@${version}`;
}

export function nameIn(key: unknown): string {
	const held = String(key ?? "");
	const at = held.lastIndexOf("@");
	return at > 0 ? held.slice(0, at) : "";
}

export function moduleFolder(key: string): string {
	return `${MODULES_DIR}/${key}`;
}

export function modulePath(key: string): string {
	return `${moduleFolder(key)}/index.js`;
}

export function facadeUrl(name: string, range: string): string {
	const outside = KEPT_OUTSIDE_A_BUNDLE.filter((held) => held !== name);
	const asked = outside.length > 0 ? `?bundle&external=${outside.join(",")}` : "?bundle";
	return `${ESM_HOST}/${name}@${encodeURIComponent(range)}${asked}`;
}

export function realPathIn(facade: unknown): string | null {
	const found = /export\s*\*\s*from\s*["']([^"']+)["']/.exec(String(facade ?? ""));
	return found?.[1] ?? null;
}

export function versionIn(path: string | null | undefined, name: string): string | null {
	const held = String(path ?? "");
	const prefix = `/${name}@`;
	if (!held.startsWith(prefix)) return null;
	return held.slice(prefix.length).split("/")[0] || null;
}

export function declaredDependencies(manifest: unknown): [string, string][] {
	const held = isObject(manifest) ? manifest["dependencies"] : null;
	if (!isObject(held) || Array.isArray(held)) return [];
	return Object.entries(held).map(([name, range]) => [name, String(range ?? "")]);
}

export function createModuleSpace({ adapter, fetchText }: ModuleSpaceDoors): ModuleSpace {
	return {
		async take(lock, name, range) {
			try {
				const found = await resolveKey(fetchText, name, range);
				if (!found.ok) return found;

				return (
					(await heldOnDisk(adapter, lock, found.key)) ??
					(await download({ adapter, fetchText }, found.key, found.realPath))
				);
			} catch (failure) {
				return refuseModule(`cannot fetch "${name}@${range}": ${failureMessage(failure)}`);
			}
		},

		async takeAsset(key, name) {
			if (!SAFE_ASSET.test(String(name ?? ""))) throw new Error(`"${name}" is not a file a package can serve`);
			const at = `${moduleFolder(key)}/${name}`;
			if (await adapter.exists(at)) return adapter.read(at);

			const text = await fetchText(`${ESM_HOST}/${key}/${name}`);
			await makeFolders(adapter, key);
			await adapter.write(at, text);
			return text;
		},

		async collect(key) {
			const folder = moduleFolder(key);
			if (await adapter.exists(folder)) await adapter.rmdir(folder, true);
		},
	};
}

function refuseModule(failure: string): ModuleRefusal {
	return { ok: false, key: null, path: null, hash: null, failure };
}

async function heldOnDisk(
	adapter: ModuleAdapter,
	lock: LockedModules | null | undefined,
	key: string,
): Promise<TakenModule | null> {
	const held = lock?.modules?.[key];
	const hash = isObject(held) ? held["hash"] : null;
	if (typeof hash !== "string") return null;
	if (!(await adapter.exists(modulePath(key)))) return null;
	return { ok: true, key, path: modulePath(key), hash, failure: null };
}

function unaskableFor(name: string, range: string): string | null {
	if (!SAFE_NAME.test(String(name ?? ""))) return `"${name}" is not a package name`;
	if (HELD_BY_THE_ENGINE.includes(name))
		return `"${name}" is what the plugin itself hands a widget, so nothing may be installed under that name`;
	if (!SAFE_RANGE.test(String(range ?? ""))) return `"${name}" asks for "${range}", which is not a version`;
	return null;
}

async function makeFolder(adapter: ModuleAdapter, path: string): Promise<void> {
	if (!(await adapter.exists(path))) await adapter.mkdir(path);
}

async function makeFolders(adapter: ModuleAdapter, key: string): Promise<void> {
	const folder = moduleFolder(key);
	const scope = folder.slice(0, folder.lastIndexOf("/"));
	await makeFolder(adapter, MODULES_DIR);
	if (scope.length > MODULES_DIR.length) await makeFolder(adapter, scope);
	await makeFolder(adapter, folder);
}

async function download({ adapter, fetchText }: ModuleSpaceDoors, key: string, realPath: string): Promise<TakenModule> {
	const text = await fetchText(`${ESM_HOST}${realPath}`);
	await makeFolders(adapter, key);
	await adapter.write(modulePath(key), text);
	return { ok: true, key, path: modulePath(key), hash: contentHash(text), failure: null };
}

async function resolveKey(fetchText: ModuleSpaceDoors["fetchText"], name: string, range: string): Promise<ResolvedKey> {
	const unaskable = unaskableFor(name, range);
	if (unaskable) return refuseModule(unaskable);

	const realPath = realPathIn(await fetchText(facadeUrl(name, range)));
	const version = versionIn(realPath, name);
	if (!realPath || !version || !SAFE_VERSION.test(version))
		return refuseModule(`esm.sh answered "${name}@${range}" with something that is not that package`);
	return { ok: true, key: keyFor(name, version), realPath, failure: null };
}
