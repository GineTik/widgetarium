import { ROOT } from "../paths.js";
import HANDBOOK_BOARD from "../../docs/ai/board.md";
import HANDBOOK_SURFACES from "../../docs/ai/surfaces.md";
import HANDBOOK_EXAMPLES from "../../docs/ai/examples.md";
import HANDBOOK_WIDGET from "../../docs/ai/widget.md";
import HANDBOOK_TOOLS from "../../docs/ai/tools.md";
import WIDGETS_CLI from "widgetarium:widgets-cli";
import WIDGET_TYPES from "widgetarium:widget-types";

export const HANDBOOK_DIR = `${ROOT}/agent`;
export const BIN_DIR = `${ROOT}/bin`;
export const WIDGETS_DIR = `${ROOT}/widgets`;
export const TYPES_DIR = `${WIDGETS_DIR}/types`;
export const GATEWAY_TYPES_DIR = `${TYPES_DIR}/gateway`;
export const TOOL_PATH = `${BIN_DIR}/widgets.mjs`;

export const HANDBOOK = {
	"board.md": HANDBOOK_BOARD,
	"surfaces.md": HANDBOOK_SURFACES,
	"examples.md": HANDBOOK_EXAMPLES,
	"widget.md": HANDBOOK_WIDGET,
	"tools.md": HANDBOOK_TOOLS,
};

const PAGES_LAID_BEFORE = `${HANDBOOK_DIR}/patterns`;

// TRADE-OFF: only markdown beside the pages and the one folder this file used to lay, because the
// TRADE-OFF: agent keeps its own measurements under the same roof and a wider sweep would eat them
async function sweptOfPagesNoLongerLaid(adapter) {
	const gone = [];
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

async function writeIfChanged(adapter, path, text) {
	if ((await adapter.exists(path)) && (await adapter.read(path)) === text) return false;
	await adapter.write(path, text);
	return true;
}

async function layWidgetTypes(adapter) {
	const written = [];
	for (const folder of [WIDGETS_DIR, TYPES_DIR, GATEWAY_TYPES_DIR]) {
		if (!(await adapter.exists(folder))) await adapter.mkdir(folder);
	}
	for (const [name, text] of Object.entries(WIDGET_TYPES)) {
		if (await writeIfChanged(adapter, `${WIDGETS_DIR}/${name}`, text)) written.push(name);
	}
	return written;
}

export async function layAgentFiles(adapter) {
	const written = [];
	for (const folder of [HANDBOOK_DIR, BIN_DIR]) {
		if (!(await adapter.exists(folder))) await adapter.mkdir(folder);
	}
	for (const [name, text] of Object.entries(HANDBOOK)) {
		if (await writeIfChanged(adapter, `${HANDBOOK_DIR}/${name}`, text)) written.push(name);
	}
	written.push(...(await sweptOfPagesNoLongerLaid(adapter)));
	if (await writeIfChanged(adapter, TOOL_PATH, WIDGETS_CLI)) written.push("widgets.mjs");
	written.push(...(await layWidgetTypes(adapter)));
	return written;
}
