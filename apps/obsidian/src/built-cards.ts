import type { DataAdapter } from "obsidian";
import { WIDGETS_DIR } from "@widgetarium/core/paths.js";
import { BUILT_CARD_FILE, RECORD_FILE, cardOf } from "@widgetarium/core/engine/catalogue-index.js";
import { WIDGET_API } from "@widgetarium/core/version.js";
import type { WidgetDefinition, WidgetLookup } from "@widgetarium/core/registry.js";

type CardAdapter = Pick<DataAdapter, "exists" | "read" | "write" | "mkdir">;

export async function writeBuiltCards(adapter: CardAdapter, registry: WidgetLookup): Promise<string[]> {
	const written: string[] = [];
	for (const definition of registry.list()) {
		const folder = await vaultFolderWithoutCard(adapter, definition);
		if (folder && (await writeCardIfChanged(adapter, folder, definition))) written.push(`${folder}/${BUILT_CARD_FILE}`);
	}
	return written;
}

async function vaultFolderWithoutCard(adapter: CardAdapter, definition: WidgetDefinition): Promise<string | null> {
	const { folder } = definition;
	if (!folder?.startsWith(`${WIDGETS_DIR}/`) || definition.error) return null;
	return (await adapter.exists(`${folder}/${RECORD_FILE}`)) ? null : folder;
}

async function writeCardIfChanged(
	adapter: CardAdapter,
	folder: string,
	definition: WidgetDefinition,
): Promise<boolean> {
	const card = `${JSON.stringify(cardOf(definition.manifest, WIDGET_API), null, "\t")}\n`;
	const path = `${folder}/${BUILT_CARD_FILE}`;
	if ((await adapter.exists(path)) && (await adapter.read(path)) === card) return false;
	if (!(await adapter.exists(`${folder}/build`))) await adapter.mkdir(`${folder}/build`);
	await adapter.write(path, card);
	return true;
}
