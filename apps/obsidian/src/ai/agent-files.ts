import type { DataAdapter } from "obsidian";
import { ROOT } from "@widgetarium/core/paths.js";
import HANDBOOK_BOARD from "../../../../docs/ai/board.md";
import HANDBOOK_SURFACES from "../../../../docs/ai/surfaces.md";
import HANDBOOK_EXAMPLES from "../../../../docs/ai/examples.md";
import HANDBOOK_WIDGET from "../../../../docs/ai/widget.md";
import HANDBOOK_TOOLS from "../../../../docs/ai/tools.md";
import unpackWidgetsCli, { packedHash as WIDGETS_CLI_HASH } from "widgetarium:widgets-cli";
import unpackWidgetTypes, { packedHash as WIDGET_TYPES_HASH } from "widgetarium:widget-types";

export const HANDBOOK_DIR = `${ROOT}/agent`;
export const BIN_DIR = `${ROOT}/bin`;
export const WIDGETS_DIR = `${ROOT}/widgets`;
export const TOOL_PATH = `${BIN_DIR}/widgets.mjs`;
const TYPES_DIR = `${WIDGETS_DIR}/types`;
export const LAID_MARK_FILE = ".laid-by-plugin";
const TYPES_MARK_PATH = `${TYPES_DIR}/${LAID_MARK_FILE}`;
const TOOL_MARK_PATH = `${BIN_DIR}/${LAID_MARK_FILE}`;
const TOOL_MARK_TEXT = laidMarkTextOf("This tool is", WIDGETS_CLI_HASH);
const TYPES_MARK_TEXT = laidMarkTextOf("These types are", WIDGET_TYPES_HASH);

export type AgentFilesAdapter = Pick<DataAdapter, "exists" | "mkdir" | "list" | "rmdir" | "remove" | "read" | "write">;

export const HANDBOOK: Readonly<Record<string, string>> = {
	"board.md": HANDBOOK_BOARD,
	"surfaces.md": HANDBOOK_SURFACES,
	"examples.md": HANDBOOK_EXAMPLES,
	"widget.md": HANDBOOK_WIDGET,
	"tools.md": HANDBOOK_TOOLS,
};

const PAGES_LAID_BEFORE = `${HANDBOOK_DIR}/patterns`;

export async function layAgentFiles(adapter: AgentFilesAdapter): Promise<string[]> {
	const written: string[] = [];
	for (const folder of [HANDBOOK_DIR, BIN_DIR]) {
		if (!(await adapter.exists(folder))) await adapter.mkdir(folder);
	}
	for (const [name, text] of Object.entries(HANDBOOK)) {
		if (await writeIfChanged(adapter, `${HANDBOOK_DIR}/${name}`, text)) written.push(name);
	}
	written.push(...(await sweepPagesNoLongerLaid(adapter)));
	if (await layTool(adapter)) written.push("widgets.mjs");
	written.push(...(await layWidgetTypes(adapter)));
	return written;
}

export async function writeIfChanged(adapter: AgentFilesAdapter, path: string, text: string): Promise<boolean> {
	if ((await adapter.exists(path)) && (await adapter.read(path)) === text) return false;
	await adapter.write(path, text);
	return true;
}

export async function writeWithoutDownloading(adapter: AgentFilesAdapter, path: string, text: string): Promise<void> {
	if (await adapter.exists(path)) await adapter.remove(path);
	await adapter.write(path, text);
}

export function laidMarkTextOf(whatIsLaid: string, bundleHash: string): string {
	return `${whatIsLaid} laid by the Widgetarium plugin and rewritten when the plugin's copy changes.\nbundle ${bundleHash}\n`;
}

export function readLaidMark(adapter: AgentFilesAdapter, path: string): Promise<string | null> {
	return adapter.read(path).catch(() => null);
}

async function layTool(adapter: AgentFilesAdapter): Promise<boolean> {
	if ((await readLaidMark(adapter, TOOL_MARK_PATH)) === TOOL_MARK_TEXT) return false;
	await writeWithoutDownloading(adapter, TOOL_PATH, await unpackWidgetsCli());
	await adapter.write(TOOL_MARK_PATH, TOOL_MARK_TEXT);
	return true;
}

// TRADE-OFF: only markdown beside the pages and the one folder this file used to lay, because the
// TRADE-OFF: agent keeps its own measurements under the same roof and a wider sweep would eat them
async function sweepPagesNoLongerLaid(adapter: AgentFilesAdapter): Promise<string[]> {
	const gone: string[] = [];
	if (await adapter.exists(PAGES_LAID_BEFORE)) {
		await adapter.rmdir(PAGES_LAID_BEFORE, true);
		gone.push("patterns/");
	}
	const held = await adapter.list(HANDBOOK_DIR);
	for (const at of held?.files ?? []) {
		const name = at.slice(HANDBOOK_DIR.length + 1);
		if (!name.endsWith(".md") || Object.hasOwn(HANDBOOK, name)) continue;
		await adapter.remove(at);
		gone.push(name);
	}
	return gone;
}

function foldersHolding(names: readonly string[]): string[] {
	const folders = new Set([WIDGETS_DIR]);
	for (const name of names) {
		const parts = `${WIDGETS_DIR}/${name}`.split("/").slice(0, -1);
		for (let depth = WIDGETS_DIR.split("/").length + 1; depth <= parts.length; depth += 1)
			folders.add(parts.slice(0, depth).join("/"));
	}
	return [...folders];
}

async function layWidgetTypes(adapter: AgentFilesAdapter): Promise<string[]> {
	if ((await readLaidMark(adapter, TYPES_MARK_PATH)) === TYPES_MARK_TEXT) return [];
	const types = await unpackWidgetTypes();
	const written: string[] = [];
	for (const folder of foldersHolding(Object.keys(types))) {
		if (!(await adapter.exists(folder))) await adapter.mkdir(folder);
	}
	for (const [name, text] of Object.entries(types)) {
		await writeWithoutDownloading(adapter, `${WIDGETS_DIR}/${name}`, text);
		written.push(name);
	}
	if (await adapter.exists(TYPES_DIR)) written.push(...(await sweepTypesNoLongerLaid(adapter, TYPES_DIR, types)));
	await adapter.write(TYPES_MARK_PATH, TYPES_MARK_TEXT);
	return written;
}

async function sweepTypesNoLongerLaid(
	adapter: AgentFilesAdapter,
	folder: string,
	types: Readonly<Record<string, string>>,
): Promise<string[]> {
	const gone: string[] = [];
	const held = await adapter.list(folder);
	for (const at of held.files) {
		if (Object.hasOwn(types, laidNameOf(at))) continue;
		await adapter.remove(at);
		gone.push(laidNameOf(at));
	}
	for (const at of held.folders) {
		if (holdsLaidTypes(at, types)) {
			gone.push(...(await sweepTypesNoLongerLaid(adapter, at, types)));
			continue;
		}
		await adapter.rmdir(at, true);
		gone.push(`${laidNameOf(at)}/`);
	}
	return gone;
}

const laidNameOf = (at: string): string => at.slice(WIDGETS_DIR.length + 1);

function holdsLaidTypes(folder: string, types: Readonly<Record<string, string>>): boolean {
	const inside = `${laidNameOf(folder)}/`;
	return Object.keys(types).some((name) => name.startsWith(inside));
}
