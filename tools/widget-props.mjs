import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";
import { fakeVault } from "./fake-vault.mjs";
import { widgetFiles } from "./harness.mjs";

if (!globalThis.document) {
	const dom = new JSDOM("<!doctype html><body></body>");
	for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
		globalThis[key] = key === "window" ? dom.window : dom.window[key];
	}
}

buildMirror();
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");

function vaultHolding(files) {
	const held = fakeVault();
	for (const [at, text] of Object.entries(files)) held.files.set(at, text);
	return held;
}

export async function manifestsAsTheEngineResolvesThem(files) {
	const registry = new WidgetRegistry({ vault: { adapter: vaultHolding(files) } });
	await registry.load();
	const byId = {};
	for (const id of [...registry.widgets.keys()].sort()) byId[id] = registry.get(id).manifest;
	return byId;
}

export async function propsAsTheEngineResolvesThem(files) {
	const found = await manifestsAsTheEngineResolvesThem(files);
	return Object.fromEntries(Object.entries(found).map(([id, manifest]) => [id, manifest.props ?? null]));
}

export const manifestOfEveryShippedWidget = () => manifestsAsTheEngineResolvesThem(widgetFiles());

export const propsOfEveryShippedWidget = () => propsAsTheEngineResolvesThem(widgetFiles());

function typeOf(value) {
	if (Array.isArray(value)) return "array";
	return value === null ? "null" : typeof value;
}

export function differences(wanted, got, at = []) {
	const said = at.join(" › ");
	if (typeOf(wanted) !== typeOf(got))
		return [`${said}: expected ${JSON.stringify(wanted)}, engine answers ${JSON.stringify(got)}`];
	if (typeOf(wanted) === "array") return arrayDifferences(wanted, got, at);
	if (typeOf(wanted) !== "object")
		return wanted === got ? [] : [`${said}: expected ${JSON.stringify(wanted)}, engine answers ${JSON.stringify(got)}`];

	const keys = [...new Set([...Object.keys(wanted), ...Object.keys(got)])];
	const ordered =
		Object.keys(wanted).join(",") === Object.keys(got).join(",")
			? []
			: [
					`${said}: keys are declared in the order ${Object.keys(got).join(", ")}, expected ${Object.keys(wanted).join(", ")}`,
				];
	return [...ordered, ...keys.flatMap((key) => keyDifference(wanted, got, key, at))];
}

function keyDifference(wanted, got, key, at) {
	if (!(key in got)) return [`${[...at, key].join(" › ")}: missing — the engine no longer answers it`];
	if (!(key in wanted))
		return [`${[...at, key].join(" › ")}: unexpected — the engine answers ${JSON.stringify(got[key])}`];
	return differences(wanted[key], got[key], [...at, key]);
}

function arrayDifferences(wanted, got, at) {
	const length = Math.max(wanted.length, got.length);
	return Array.from({ length }, (unused, index) => index).flatMap((index) => {
		if (index >= got.length) return [`${at.join(" › ")}[${index}]: missing ${JSON.stringify(wanted[index])}`];
		if (index >= wanted.length) return [`${at.join(" › ")}[${index}]: unexpected ${JSON.stringify(got[index])}`];
		return differences(wanted[index], got[index], [...at, `[${index}]`]);
	});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	console.log(JSON.stringify(await propsOfEveryShippedWidget(), null, "\t"));
}
