import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { checkWidget } from "@widgetarium/core/widget-check.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { isWidgetModule } from "@widgetarium/core/engine/widget-build.js";
import { cardIn } from "./entries.js";
import type { WidgetEntry } from "./widget-entry.js";

const STYLE_FILES = ["widget.css"];

export type WidgetFindings = ReturnType<typeof checkWidget>;

export async function checkedWidget(entry: WidgetEntry, surface: readonly string[]): Promise<WidgetFindings> {
	const card = await cardIn(entry.folder);
	return checkWidget({
		id: entry.id,
		source: await joinFiles(entry, isWidgetModule),
		styles: await joinFiles(entry, (name) => STYLE_FILES.includes(name)),
		card: isObject(card) ? card : null,
		surface,
	});
}

async function joinFiles(entry: WidgetEntry, isWanted: (name: string) => boolean): Promise<string> {
	const named = (entry.files ?? []).filter(isWanted);
	const texts: string[] = [];
	for (const name of named) texts.push(await readFile(join(entry.folder ?? "", name), "utf8").catch(() => ""));
	return texts.join("\n");
}
