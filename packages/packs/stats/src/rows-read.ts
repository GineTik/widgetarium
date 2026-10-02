import { isObject } from "@widgetarium/core/engine/is-object.js";
import { PropRefSchema } from "@widgetarium/core/engine/prop-ref.js";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";

export const STAT_CEILING = 1000;

const NO_ROWS = "no list: pick the widget whose rows are counted in the settings window";
const NOT_A_LIST = "{ref} is no list on this board";

export async function rowsAt(ports: ImplementationPorts, held: unknown): Promise<unknown[]> {
	const ref = refIn(held);
	if (!ref) throw new Error(NO_ROWS);
	const list = listOf(ports.refs.get(ref));
	if (!list) throw new Error(NOT_A_LIST.replace("{ref}", ref));
	const answer: unknown = await list({ limit: STAT_CEILING });
	return isObject(answer) && Array.isArray(answer["rows"]) ? answer["rows"] : [];
}

export function watchRows(ports: ImplementationPorts, held: unknown, changed: () => void): () => void {
	const ref = refIn(held);
	return ref ? ports.refs.watch([ref], changed) : () => {};
}

function refIn(held: unknown): string | null {
	const parsed = PropRefSchema.safeParse(held);
	return parsed.success ? parsed.data : null;
}

function listOf(gateway: unknown): ((query: unknown) => unknown) | null {
	if (!isObject(gateway)) return null;
	const list: unknown = gateway["list"];
	return typeof list === "function" ? (query) => Reflect.apply(list, gateway, [query]) : null;
}
