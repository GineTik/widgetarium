import type { DataAdapter } from "obsidian";
import { readSpec, specPathOf, SPEC_FOLDER } from "@widgetarium/core/app-spec.js";
import { ROOT } from "@widgetarium/core/paths.js";
import { specMarkdownOf } from "widgetarium/studio";
import type { CanvasDoc } from "@widgetarium/core/engine/design-port.js";
import type WidgetariumPlugin from "./main.js";

const APP_DOCS = [
	{ name: "Research", file: "research.md" },
	{ name: "Design notes", file: "design.md" },
	{ name: "This app's design system", file: "design-system.md" },
] as const;
const SPEC_DOC = "Spec";
const VAULT_SYSTEM = "Your design system";

export async function docsOf(plugin: WidgetariumPlugin, app: string): Promise<readonly CanvasDoc[]> {
	const adapter = plugin.app.vault.adapter;
	const folder = `${SPEC_FOLDER}/${app}`;
	const docs = await Promise.all([
		specDocOf(adapter, app),
		...APP_DOCS.map((doc) => docAt(adapter, doc.name, `${folder}/${doc.file}`)),
		docAt(adapter, VAULT_SYSTEM, `${ROOT}/design-system.md`),
	]);
	return docs.flat();
}

async function docAt(adapter: DataAdapter, name: string, path: string): Promise<CanvasDoc[]> {
	const markdown = await adapter.read(path).catch(() => null);
	return markdown === null || markdown.trim() === "" ? [] : [{ name, path, markdown }];
}

async function specDocOf(adapter: DataAdapter, app: string): Promise<CanvasDoc[]> {
	const path = specPathOf(app);
	const text = await adapter.read(path).catch(() => null);
	const spec = text === null ? null : readSpec(text).spec;
	return spec ? [{ name: SPEC_DOC, path, markdown: specMarkdownOf(spec) }] : [];
}
