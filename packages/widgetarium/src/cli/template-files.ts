import fs from "node:fs";
import path from "node:path";

export type TemplateValues = Readonly<Record<string, string>>;

const PLACEHOLDER = /\{([a-z][a-z.]*)\}/g;
const RENAMED_ON_WRITE: ReadonlyMap<string, string> = new Map([["_gitignore", ".gitignore"]]);

export function writeTemplates(templates: string, target: string, values: TemplateValues): void {
	for (const relative of filesUnder(templates, () => true)) {
		const text = filled(fs.readFileSync(path.join(templates, relative), "utf8"), values);
		writeFile(path.join(target, renamedOnWrite(relative)), text);
	}
}

export function copyFiles(from: string, to: string, isCopied: (relative: string) => boolean): void {
	for (const relative of filesUnder(from, isCopied)) {
		fs.mkdirSync(path.dirname(path.join(to, relative)), { recursive: true });
		fs.copyFileSync(path.join(from, relative), path.join(to, relative));
	}
}

export function filled(text: string, values: TemplateValues): string {
	return text.replace(PLACEHOLDER, (placeholder, key: string) => values[key] ?? placeholder);
}

export function writeFile(at: string, text: string): void {
	fs.mkdirSync(path.dirname(at), { recursive: true });
	fs.writeFileSync(at, text);
}

function filesUnder(folder: string, isWanted: (relative: string) => boolean): string[] {
	return fs
		.readdirSync(folder, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.relative(folder, path.join(entry.parentPath, entry.name)))
		.filter(isWanted)
		.sort();
}

function renamedOnWrite(relative: string): string {
	const renamed = RENAMED_ON_WRITE.get(path.basename(relative));
	return renamed === undefined ? relative : path.join(path.dirname(relative), renamed);
}
