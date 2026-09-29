import { ROOT } from "./paths.js";
import { createModuleSpace } from "./engine/modules.js";
import { createBuilder } from "./engine/builder.js";
import { createWidgetSource } from "./engine/widget-source.js";
import { sourcesOf } from "./sources.js";
import { SHIPPED_SOURCES } from "./registries.js";

export const INDEX_PATH = `${ROOT}/catalogue.json`;

export function installerContext({
	adapter,
	fetchJson,
	fetchText,
	disk,
	readAdded = async () => [],
	shipped = SHIPPED_SOURCES,
	declaredIn = null,
}) {
	const space = createModuleSpace({ adapter, fetchText });
	const readJson = (path, fallback) => readJsonAt(adapter, path, fallback);
	return {
		adapter,
		declaredIn,
		space,
		widgets: createWidgetSource({ fetchJson, fetchText, disk }),
		builder: createBuilder({ adapter, space }),
		readJson,
		writeJson: (path, value) => adapter.write(path, `${JSON.stringify(value, null, "\t")}\n`),
		readCatalogue: async () => {
			const legacy = await readJson(INDEX_PATH, null);
			return { raw: legacy, sources: sourcesOf({ added: await readAdded(), legacy, shipped }) };
		},
	};
}

export function refuse(failure) {
	return { ok: false, failure };
}

async function readJsonAt(adapter, path, fallback) {
	if (!(await adapter.exists(path))) return fallback;
	try {
		return JSON.parse(await adapter.read(path));
	} catch (failure) {
		console.error(`[widgetarium] cannot read ${path}`, failure);
		return fallback;
	}
}
