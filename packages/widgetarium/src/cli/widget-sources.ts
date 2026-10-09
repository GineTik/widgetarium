import path from "node:path";
import { scopeFolderOf, type CatalogueEntry } from "./catalogue-read.js";
import { CliRefusal } from "./cli-output.js";
import { libsImportedBy, type LibFile, type ScopeOfWidget, type SourceFile } from "./lib-imports.js";

export interface WidgetSources {
	readonly scope: ScopeOfWidget;
	readonly files: readonly SourceFile[];
	readonly libs: readonly LibFile[];
}

export async function widgetSourcesOf(entry: CatalogueEntry): Promise<WidgetSources> {
	if (entry.card.files.length === 0)
		throw new CliRefusal(`${entry.id}'s card lists no files; regenerate it with npm run manifest in its registry`);
	const files = await Promise.all(entry.card.files.map((file) => sourceAt(entry, file)));
	const scope = { name: entry.scope, folder: scopeFolderOf(entry), reader: entry.reader };
	return { scope, files, libs: await libsImportedBy(files, scope) };
}

export function inWidgetFolder(entry: CatalogueEntry, file: SourceFile): string {
	return path.posix.relative(entry.folder, file.path);
}

async function sourceAt(entry: CatalogueEntry, file: string): Promise<SourceFile> {
	const at = `${entry.folder}/${file}`;
	const text = await entry.reader.read(at);
	if (text === null)
		throw new CliRefusal(`${entry.id}'s card lists ${file}, which ${entry.reader.at}/${at} does not hold`);
	return { path: at, text };
}
