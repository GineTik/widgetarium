import fs from "node:fs";
import path from "node:path";
import { widgetFiles } from "./widget-files.mts";

const PLUGIN_SHEET = "apps/obsidian/styles.css";
// TODO: read these from packages/core/src/engine/widget-build.ts once natively run tools can import it
const SHEET_FILES = ["widget.css", "styles.css"];
const CLASS_IN_A_RULE = /\.([a-z][\w-]*)/g;
const CLASS_WORD = /^[a-z][\w-]*$/;
const STATE_CLASS_WORD = /^(is|has)-[\w-]+$/;
const QUOTED = /"([^"]*)"|'([^']*)'|`([^`]*)`/g;
const INTERPOLATION = /\$\{[^}]*\}/g;
const CLASS_ATTRIBUTE = /\bclass(?:Name)?=(?:"([^"]*)"|\{`([^`]*)`\})/g;
const CLASS_EXPRESSION = /\bclass(?:Name)?=\{([^}]*)\}/g;
const CONTAINER_BLOCK = /@container[^{]*\{([\s\S]*?)\n\}/g;

const roots = process.argv.slice(2).filter((root) => fs.existsSync(root));
const classesTheEngineOwns = new Set(["orbi", "wg-widget-root", ...classesStyledIn(pluginSheet())]);
const offences = roots.flatMap((root) => widgetFiles(root).flatMap(offencesIn));

if (offences.length > 0) {
	console.error("class gate: every class in the markup needs a rule, or the host app styles it instead");
	for (const line of offences) console.error(`  ${line}`);
	process.exit(1);
}

console.log(`class gate: clean (${roots.length} root${roots.length === 1 ? "" : "s"})`);

function offencesIn(file: string): string[] {
	const text = folderSource(path.dirname(file));
	const styled = new Set(classesStyledIn(`${text}\n${scopeSheet(file)}\n${ownSheets(file)}`));
	const used = new Set([...classesInAttributes(text), ...quotedStateClasses(text)]);
	const quotedInClassExpressions = new Set(quotedClassWordsInExpressions(text));
	const unstyled = [...used]
		.filter((name) => !classesTheEngineOwns.has(name) && !styled.has(name))
		.map((name) => `${file} — class "${name}" is used but no rule mentions it`);
	const deadContainerTargets = containerTargets(text)
		.filter((name) => !used.has(name) && !quotedInClassExpressions.has(name) && !classesTheEngineOwns.has(name))
		.map((name) => `${file} — @container rule targets ".${name}", which the markup never uses`);
	return [...unstyled, ...deadContainerTargets];
}

function pluginSheet(): string {
	return fs.existsSync(PLUGIN_SHEET) ? fs.readFileSync(PLUGIN_SHEET, "utf8") : "";
}

function classesStyledIn(css: string): string[] {
	return [...css.matchAll(CLASS_IN_A_RULE)].map(([, name = ""]) => name);
}

function scopeSheet(file: string): string {
	const scope = path.dirname(path.dirname(file));
	const sheet = path.join(scope, "tokens.css");
	return fs.existsSync(sheet) ? fs.readFileSync(sheet, "utf8") : "";
}

function ownSheets(file: string): string {
	const folder = path.dirname(file);
	return SHEET_FILES.map((name) => path.join(folder, name))
		.filter((sheet) => fs.existsSync(sheet))
		.map((sheet) => fs.readFileSync(sheet, "utf8"))
		.join("\n");
}

function folderSource(folder: string): string {
	return fs
		.readdirSync(folder, { withFileTypes: true })
		.filter((entry) => entry.name !== "build" && entry.name !== "node_modules")
		.map((entry): string => {
			const at = path.join(folder, entry.name);
			if (entry.isDirectory()) return folderSource(at);
			return /\.tsx?$/.test(entry.name) ? fs.readFileSync(at, "utf8") : "";
		})
		.join("\n");
}

function quotedTexts(text: string): string[] {
	return [...text.matchAll(QUOTED)].map(([, double, single, backtick]) => double ?? single ?? backtick ?? "");
}

function literalClassWords(value: string): string[] {
	const outside = value.replace(INTERPOLATION, " ");
	const inside = [...value.matchAll(INTERPOLATION)].flatMap(([chunk]) => quotedTexts(chunk)).join(" ");
	return `${outside} ${inside}`.split(/\s+/);
}

function classesInAttributes(text: string): string[] {
	return [...text.matchAll(CLASS_ATTRIBUTE)]
		.flatMap(([, quoted, templated]) => literalClassWords(quoted ?? templated ?? ""))
		.filter((word) => CLASS_WORD.test(word));
}

function quotedClassWordsInExpressions(text: string): string[] {
	return [...text.matchAll(CLASS_EXPRESSION)]
		.flatMap(([, expression = ""]) => quotedTexts(expression))
		.flatMap((quoted) => quoted.split(/\s+/))
		.filter((word) => CLASS_WORD.test(word));
}

function quotedStateClasses(text: string): string[] {
	return quotedTexts(text)
		.flatMap((quoted) => quoted.split(/\s+/))
		.filter((word) => STATE_CLASS_WORD.test(word));
}

function containerTargets(text: string): string[] {
	return [...text.matchAll(CONTAINER_BLOCK)].flatMap(([, block = ""]) => classesStyledIn(block));
}
