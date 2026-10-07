import { readSpec, specPathOf, SPEC_FOLDER } from "@widgetarium/core/app-spec.js";
import { ROOT } from "@widgetarium/core/paths.js";
import { NO_DOCS, specMarkdownOf } from "./design-docs.js";
import type { CanvasDoc, CanvasDocs } from "./design-docs.js";
import type WidgetariumPlugin from "./main.js";

const BRIEF_DOCS = [
	{ name: "Research", file: "research.md" },
	{ name: "Design notes", file: "design.md" },
] as const;
const SPEC_DOC = "Spec";
const APP_SYSTEM = "This app's design system";
const VAULT_SYSTEM = "Your design system";

export async function docsOf(plugin: WidgetariumPlugin, app: string): Promise<CanvasDocs> {
	const adapter = plugin.app.vault.adapter;
	const read = async (name: string, path: string): Promise<CanvasDoc[]> => {
		const markdown = await adapter.read(path).catch(() => null);
		return markdown === null || markdown.trim() === "" ? [] : [{ name, path, markdown }];
	};
	const specText = await adapter.read(specPathOf(app)).catch(() => null);
	const spec = specText === null ? null : readSpec(specText).spec;
	const specDoc = spec ? [{ name: SPEC_DOC, path: specPathOf(app), markdown: specMarkdownOf(spec) }] : [];
	const folder = `${SPEC_FOLDER}/${app}`;
	const brief = [
		...specDoc,
		...(await Promise.all(BRIEF_DOCS.map((doc) => read(doc.name, `${folder}/${doc.file}`)))).flat(),
	];
	const system = [
		...(await read(APP_SYSTEM, `${folder}/design-system.md`)),
		...(await read(VAULT_SYSTEM, `${ROOT}/design-system.md`)),
	];
	return brief.length === 0 && system.length === 0 ? NO_DOCS : { brief, system };
}
