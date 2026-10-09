import path from "node:path";
import type { RegistryReader } from "./registry-reader.js";

export interface SourceFile {
	readonly path: string;
	readonly text: string;
}

export interface LibFile extends SourceFile {
	readonly inLibrary: string;
}

export interface ScopeOfWidget {
	readonly name: string;
	readonly folder: string;
	readonly reader: RegistryReader;
}

const IMPORT_SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"'\n]+)\2/g;
const TYPESCRIPT_FILE = /\.tsx?$/;
const LIB_EXTENSIONS: readonly string[] = [".ts", ".tsx"];

export async function libsImportedBy(widgetFiles: readonly SourceFile[], scope: ScopeOfWidget): Promise<LibFile[]> {
	const found = new Map<string, LibFile>();
	const pending: SourceFile[] = [...widgetFiles];
	for (let file = pending.pop(); file !== undefined; file = pending.pop()) {
		for (const lib of await libsReadFrom(file, scope)) {
			if (found.has(lib.path)) continue;
			found.set(lib.path, lib);
			pending.push(lib);
		}
	}
	return [...found.values()].sort((left, right) => left.path.localeCompare(right.path));
}

export interface LibRewrite {
	readonly scope: ScopeOfWidget;
	readonly libs: readonly LibFile[];
	readonly aliasOf: (lib: LibFile) => string;
}

export function withLibAliases(file: SourceFile, { scope, libs, aliasOf }: LibRewrite): string {
	return file.text.replace(IMPORT_SPECIFIER, (statement, lead: string, quote: string, specifier: string) => {
		const base = libBaseFor(specifier, file.path, scope);
		if (base === null) return statement;
		const candidates = candidatesOf(base);
		const lib = libs.find(({ path: at }) => candidates.includes(at));
		return lib === undefined ? statement : `${lead}${quote}${aliasOf(lib)}${quote}`;
	});
}

export function libraryNameOf(scope: string): string {
	return scope.replace(/^@/, "");
}

export function moduleNameOf(lib: LibFile): string {
	return lib.inLibrary.replace(TYPESCRIPT_FILE, "");
}

async function libsReadFrom(file: SourceFile, scope: ScopeOfWidget): Promise<LibFile[]> {
	if (!TYPESCRIPT_FILE.test(file.path)) return [];
	const bases = specifiersIn(file.text).flatMap((specifier) => libBaseFor(specifier, file.path, scope) ?? []);
	const read = await Promise.all([...new Set(bases)].map((base) => libAt(base, scope)));
	return read.flatMap((lib) => lib ?? []);
}

function specifiersIn(text: string): string[] {
	return [...text.matchAll(IMPORT_SPECIFIER)].flatMap(([, , , specifier]) => specifier ?? []);
}

function libBaseFor(specifier: string, importer: string, scope: ScopeOfWidget): string | null {
	const base = specifier.startsWith(`${scope.name}/`)
		? `${scope.folder}/${specifier.slice(scope.name.length + 1)}`
		: relativeTargetOf(specifier, importer);
	if (base === null || !base.startsWith(`${scope.folder}/`)) return null;
	return base.startsWith(`${widgetFolderOf(importer, scope)}/`) ? null : base;
}

function relativeTargetOf(specifier: string, importer: string): string | null {
	if (!specifier.startsWith(".")) return null;
	return path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
}

function widgetFolderOf(importer: string, scope: ScopeOfWidget): string {
	const [first = ""] = importer.slice(scope.folder.length + 1).split("/");
	return `${scope.folder}/${first}`;
}

function candidatesOf(base: string): string[] {
	return TYPESCRIPT_FILE.test(base) ? [base] : LIB_EXTENSIONS.map((extension) => `${base}${extension}`);
}

async function libAt(base: string, scope: ScopeOfWidget): Promise<LibFile | null> {
	for (const candidate of candidatesOf(base)) {
		const text = await scope.reader.read(candidate);
		if (text !== null) return { path: candidate, text, inLibrary: candidate.slice(scope.folder.length + 1) };
	}
	return null;
}
