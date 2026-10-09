import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SKIPPED_FOLDERS = new Set(["build", "node_modules"]);
const REWRITTEN_EXTENSIONS = new Set([".ts", ".tsx"]);
const WIDGETARIUM_IMPORTS = /import(\s+type)?\s*\{([^}]*)\}\s*from\s*(["'])widgetarium\3;?/g;
const ZOD_IMPORT = /import(\s+type)?\s*\{([^}]*)\}\s*from\s*(["'])zod\3;?/;
const Z_SPECIFIER = /^(type\s+)?z(\s+as\s+[A-Za-z_$][\w$]*)?$/;
const TYPE_PREFIX = /^type\s+/;
const LINE_END = /^\r?\n/;
const Z_STILL_FROM_WIDGETARIUM = /\b(?:import|export)\b[^;]*\bz\b[^;]*from\s*["']widgetarium["']/;

interface Rewrite {
	readonly file: string;
	readonly rewritten: string;
}

interface SplitImport {
	readonly kept: readonly string[];
	readonly taken: string;
}

interface ZImport {
	readonly statement: string;
	readonly at: number;
	readonly typeOnly: boolean;
	readonly split: SplitImport;
}

interface Specifier {
	readonly name: string;
	readonly typeOnly: boolean;
}

interface Splice {
	readonly start: number;
	readonly end: number;
	readonly text: string;
}

export function rewriteZodImports(folders: readonly string[]): string[] {
	const rewrites = folders.flatMap(sourceFilesIn).flatMap(rewriteOf);
	for (const { file, rewritten } of rewrites) writeFileSync(file, rewritten);
	return rewrites.map(({ file }) => file);
}

export function filesStillImportingZ(folders: readonly string[]): string[] {
	return folders.flatMap(sourceFilesIn).filter((file) => stillImportsZFromWidgetarium(readFileSync(file, "utf8")));
}

export function stillImportsZFromWidgetarium(source: string): boolean {
	return Z_STILL_FROM_WIDGETARIUM.test(source);
}

export function withZodFromZod(source: string): string {
	const carryingZ = zImportsOf(source);
	const [first] = carryingZ;
	if (first === undefined) return source;
	const moved = withZMoved(source, first);
	if (zImportsOf(moved).length !== carryingZ.length - 1)
		throw new Error(`the import of z from widgetarium survived the rewrite: ${first.statement}`);
	return withZodFromZod(moved);
}

function zImportsOf(source: string): ZImport[] {
	return [...source.matchAll(WIDGETARIUM_IMPORTS)].flatMap((found) => {
		const [statement, typeOnly = "", specifiers = ""] = found;
		const split = splitZ(specifiers);
		return split ? [{ statement, at: found.index, typeOnly: typeOnly !== "", split }] : [];
	});
}

function withZMoved(source: string, found: ZImport): string {
	const eol = source.includes("\r\n") ? "\r\n" : "\n";
	const kept = keptImport(found, eol);
	const z = {
		name: found.split.taken.replace(TYPE_PREFIX, ""),
		typeOnly: found.typeOnly || TYPE_PREFIX.test(found.split.taken),
	};
	const existing = ZOD_IMPORT.exec(source);
	if (!existing) {
		const text = [kept, zodImportOf([z])].filter(Boolean).join(eol);
		return spliced(source, { start: found.at, end: found.at + found.statement.length, text });
	}
	return withZMergedInto(source, existing, removalOf(source, found, kept), z);
}

function withZMergedInto(source: string, existing: RegExpExecArray, removal: Splice, z: Specifier): string {
	const merged = zodImportOf(withSpecifier(specifiersOf(existing[2] ?? "", existing[1] !== undefined), z));
	const splices = [removal, { start: existing.index, end: existing.index + existing[0].length, text: merged }];
	return splices.sort((one, other) => other.start - one.start).reduce(spliced, source);
}

function removalOf(source: string, found: ZImport, kept: string): Splice {
	const end = found.at + found.statement.length;
	if (kept !== "") return { start: found.at, end, text: kept };
	const lineEnd = LINE_END.exec(source.slice(end))?.[0] ?? "";
	return { start: found.at, end: end + lineEnd.length, text: "" };
}

function spliced(source: string, { start, end, text }: Splice): string {
	return `${source.slice(0, start)}${text}${source.slice(end)}`;
}

function specifiersOf(list: string, typeOnly: boolean): Specifier[] {
	return namedIn(list).map((specifier) => ({
		name: specifier.replace(TYPE_PREFIX, ""),
		typeOnly: typeOnly || TYPE_PREFIX.test(specifier),
	}));
}

function withSpecifier(held: readonly Specifier[], added: Specifier): Specifier[] {
	const already = held.find(({ name }) => name === added.name);
	if (already === undefined) return [added, ...held];
	const typeOnly = already.typeOnly && added.typeOnly;
	return held.map((specifier) => (specifier === already ? { name: added.name, typeOnly } : specifier));
}

function zodImportOf(specifiers: readonly Specifier[]): string {
	if (specifiers.every(({ typeOnly }) => typeOnly))
		return `import type { ${specifiers.map(({ name }) => name).join(", ")} } from "zod";`;
	const named = specifiers.map(({ name, typeOnly }) => (typeOnly ? `type ${name}` : name));
	return `import { ${named.join(", ")} } from "zod";`;
}

function namedIn(list: string): string[] {
	return list
		.split(",")
		.map((specifier) => specifier.trim())
		.filter(Boolean);
}

function splitZ(specifiers: string): SplitImport | null {
	const named = namedIn(specifiers);
	const taken = named.find((specifier) => Z_SPECIFIER.test(specifier));
	if (taken === undefined) return null;
	return { kept: named.filter((specifier) => specifier !== taken), taken };
}

function keptImport({ statement, typeOnly, split }: ZImport, eol: string): string {
	if (split.kept.length === 0) return "";
	const head = typeOnly ? "import type" : "import";
	if (!statement.includes("\n")) return `${head} { ${split.kept.join(", ")} } from "widgetarium";`;
	return `${head} {${eol}${split.kept.map((specifier) => `\t${specifier},`).join(eol)}${eol}} from "widgetarium";`;
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

function rewriteOf(file: string): Rewrite[] {
	const source = readFileSync(file, "utf8");
	const rewritten = withZodFromZod(source);
	return rewritten === source ? [] : [{ file, rewritten }];
}

if (import.meta.main) {
	const folders = process.argv.slice(2);
	if (folders.length === 0) {
		console.error("usage: node tools/codemod-zod-import.mts <dir>...");
		process.exit(1);
	}
	const rewritten = rewriteZodImports(folders);
	for (const file of rewritten) console.log(file);
	console.log(`${rewritten.length} files rewritten`);
	const leftovers = filesStillImportingZ(folders);
	for (const file of leftovers) console.log(`still imports z from widgetarium, rewrite by hand: ${file}`);
}
