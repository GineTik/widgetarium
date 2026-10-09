import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CONTRACT_WORDS: readonly (readonly [RegExp, string])[] = [
	[/\bIQuery\.expects\(/g, "IQuery.output("],
	[/\bIQuery\.returnsAny\(/g, "IQuery.outputWithin("],
	[/\bIQuery\.returns\(/g, "IQuery.output("],
	[/\bICommand\.sends\(/g, "ICommand.input("],
	[/\bICommand\.takes\(/g, "ICommand.input("],
];

const SKIPPED_FOLDERS = new Set(["build", "node_modules"]);
const REWRITTEN_EXTENSIONS = new Set([".ts", ".tsx"]);

export function rewriteContractWords(folders: readonly string[]): string[] {
	const rewrites = folders.flatMap(sourceFilesIn).flatMap(rewriteOf);
	for (const { file, rewritten } of rewrites) writeFileSync(file, rewritten);
	return rewrites.map(({ file }) => file);
}

function sourceFilesIn(folder: string): string[] {
	return readdirSync(folder, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && REWRITTEN_EXTENSIONS.has(path.extname(entry.name)))
		.map((entry) => path.join(entry.parentPath, entry.name))
		.filter((file) => !isInSkippedFolder(path.relative(folder, file)));
}

function isInSkippedFolder(relative: string): boolean {
	return relative.split(path.sep).some((part) => SKIPPED_FOLDERS.has(part));
}

function rewriteOf(file: string): { readonly file: string; readonly rewritten: string }[] {
	const source = readFileSync(file, "utf8");
	const rewritten = withContractWords(source);
	return rewritten === source ? [] : [{ file, rewritten }];
}

function withContractWords(source: string): string {
	return CONTRACT_WORDS.reduce((text, [old, word]) => text.replace(old, word), source);
}

function isRunDirectly(): boolean {
	const entry = process.argv[1];
	return entry !== undefined && import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isRunDirectly()) {
	const folders = process.argv.slice(2);
	if (folders.length === 0) {
		console.error("usage: node --import ./tools/loader/register.mts tools/codemod-contract-words.mts <dir>...");
		process.exit(1);
	}
	for (const file of rewriteContractWords(folders)) console.log(file);
}
