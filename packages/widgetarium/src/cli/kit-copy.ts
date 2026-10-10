import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { type KitLayout, groupFileOf, kitLayoutOf, groupSpecifierOf } from "./kit-layout.js";
import { mergeGroup } from "./kit-merge.js";
import { type KitModule, type SourceRange, kitModuleOf } from "./kit-source.js";
import { writeFile } from "./template-files.js";

const KIT_SOURCE = "src";
const KIT_THEME = "theme.css";
const KIT_MODULE = /\.tsx?$/;
const KIT_PACKAGE = "@widgetarium/kit";
const SOURCE_PREFIX = /^\.\/(?:src\/)?/;
const QUOTE_LENGTH = 1;

const KitExportsSchema = z.object({
	exports: z.record(z.string(), z.union([z.string(), z.object({ source: z.string() })])),
});

export function copyKit(kitRoot: string, target: string): void {
	for (const [relative, text] of mergeKit(kitSourcesIn(path.join(kitRoot, KIT_SOURCE)))) {
		writeFile(path.join(target, relative), text);
	}
	fs.copyFileSync(path.join(kitRoot, KIT_THEME), path.join(target, KIT_THEME));
}

export function mergeKit(sources: ReadonlyMap<string, string>): Map<string, string> {
	const layout = kitLayoutOf(new Map([...sources].map(([at, text]) => [at, kitModuleOf(at, text)])));
	const merged = [...layout.groups]
		.filter(([, members]) => members.length > 1)
		.map(([group, members]): [string, string] => [groupFileOf(group, members), mergeGroup(layout, group, members)]);
	const alone = [...layout.modules.values()]
		.filter((module) => !isMerged(layout, module))
		.map((module): [string, string] => [module.path, withLinksRewritten(layout, module)]);
	return new Map([...alone, ...merged].sort(([left], [right]) => (left < right ? -1 : 1)));
}

export function kitAliasesOf(kitRoot: string, kitPath: string): Record<string, string> {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(kitRoot, "package.json"), "utf8"));
	const { exports } = KitExportsSchema.parse(manifest);
	return Object.fromEntries(
		Object.entries(exports).map(([subpath, target]) => {
			const source = typeof target === "string" ? target : target.source;
			return [`${KIT_PACKAGE}${subpath.slice(1)}`, `${kitPath}/${source.replace(SOURCE_PREFIX, "")}`];
		}),
	);
}

function kitSourcesIn(folder: string): Map<string, string> {
	const files = fs
		.readdirSync(folder, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && KIT_MODULE.test(entry.name))
		.map((entry) => path.relative(folder, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"));
	return new Map(files.map((relative) => [relative, fs.readFileSync(path.join(folder, relative), "utf8")]));
}

function isMerged(layout: KitLayout, module: KitModule): boolean {
	const group = layout.groupByPath.get(module.path);
	return group !== undefined && (layout.groups.get(group)?.length ?? 0) > 1;
}

function withLinksRewritten(layout: KitLayout, module: KitModule): string {
	const edits = module.links.flatMap((link) => {
		const specifier = groupSpecifierOf(layout, module.path, link.specifier);
		return specifier === link.specifier ? [] : [{ range: link.specifierRange, specifier }];
	});
	const lastFirst = edits.sort((left, right) => right.range.start - left.range.start);
	return lastFirst.reduce((text, { range, specifier }) => withSpecifierReplaced(text, range, specifier), module.text);
}

function withSpecifierReplaced(text: string, literal: SourceRange, specifier: string): string {
	return `${text.slice(0, literal.start + QUOTE_LENGTH)}${specifier}${text.slice(literal.end - QUOTE_LENGTH)}`;
}
