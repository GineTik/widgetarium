import { type LinkedName, refuseUnmergeable } from "./kit-source.js";

export interface LinkEntry {
	readonly kind: "import" | "reexport" | "local-export";
	readonly specifier: string;
	readonly names: readonly LinkedName[];
}

export interface MergedLinks {
	readonly imports: ReadonlyMap<string, ReadonlyMap<string, LinkedName>>;
	readonly reexports: ReadonlyMap<string, ReadonlyMap<string, LinkedName>>;
	readonly localExports: ReadonlyMap<string, LinkedName>;
	readonly importedLocals: ReadonlySet<string>;
}

interface NameBook {
	readonly group: string;
	readonly bySpecifier: Map<string, Map<string, LinkedName>>;
	readonly specifierOf: Map<string, string>;
}

const LINE_WIDTH = 120;
const LOCAL = "";

export function mergedLinksOf(
	group: string,
	nativeExports: ReadonlyMap<string, string>,
	entries: readonly LinkEntry[],
): MergedLinks {
	const imports = emptyBook(group);
	const reexports = emptyBook(group);
	const localExports = emptyBook(group);
	const books: Readonly<Record<LinkEntry["kind"], NameBook>> = {
		import: imports,
		reexport: reexports,
		"local-export": localExports,
	};
	for (const entry of entries) {
		for (const name of namesToRecord(group, nativeExports, entry)) recordName(books[entry.kind], entry.specifier, name);
	}
	return {
		imports: imports.bySpecifier,
		reexports: reexports.bySpecifier,
		localExports: localExports.bySpecifier.get(LOCAL) ?? new Map(),
		importedLocals: new Set(imports.specifierOf.keys()),
	};
}

export function renderHead(links: MergedLinks): string {
	const imports = inSpecifierOrder(links.imports).map(([from, names]) => statementOf("import", names, from));
	const reexports = inSpecifierOrder(links.reexports).map(([from, names]) => statementOf("export", names, from));
	return [imports.join("\n"), reexports.join("\n")].filter((block) => block.length > 0).join("\n\n");
}

export function renderTail(links: MergedLinks): string {
	return links.localExports.size === 0 ? "" : statementOf("export", links.localExports, null);
}

function namesToRecord(
	group: string,
	nativeExports: ReadonlyMap<string, string>,
	entry: LinkEntry,
): readonly LinkedName[] {
	if (entry.kind === "import") return entry.names;
	const clash = entry.names.find(
		({ name, as }) => nativeExports.has(as) && (entry.kind === "reexport" || nativeExports.get(as) !== name),
	);
	if (clash !== undefined) refuseUnmergeable(group, `exports ${clash.as} as two different things`);
	return entry.names.filter(({ as }) => !nativeExports.has(as));
}

function emptyBook(group: string): NameBook {
	return { group, bySpecifier: new Map(), specifierOf: new Map() };
}

function recordName(book: NameBook, specifier: string, name: LinkedName): void {
	const known = book.specifierOf.get(name.as);
	const held = book.bySpecifier.get(known ?? specifier)?.get(name.as);
	if (isBoundElsewhere(held, known, specifier, name))
		refuseUnmergeable(book.group, `binds ${name.as} to two different things`);
	const merged = { ...name, typeOnly: name.typeOnly && (held?.typeOnly ?? true) };
	book.bySpecifier.set(specifier, new Map(book.bySpecifier.get(specifier)).set(name.as, merged));
	book.specifierOf.set(name.as, specifier);
}

function isBoundElsewhere(
	held: LinkedName | undefined,
	known: string | undefined,
	specifier: string,
	name: LinkedName,
): boolean {
	if (held === undefined) return false;
	return known !== specifier || held.name !== name.name;
}

function inSpecifierOrder(
	book: ReadonlyMap<string, ReadonlyMap<string, LinkedName>>,
): [string, ReadonlyMap<string, LinkedName>][] {
	return [...book].sort(([left], [right]) => (specifierRank(left) < specifierRank(right) ? -1 : 1));
}

function specifierRank(specifier: string): string {
	return `${specifier.startsWith(".") ? 1 : 0}${specifier}`;
}

function statementOf(
	keyword: "import" | "export",
	names: ReadonlyMap<string, LinkedName>,
	from: string | null,
): string {
	const sorted = [...names.values()].sort((left, right) => (left.as < right.as ? -1 : 1));
	const typesOnly = sorted.every(({ typeOnly }) => typeOnly);
	const parts = sorted.map((name) => `${typesOnly || !name.typeOnly ? "" : "type "}${bindingOf(name)}`);
	const head = `${keyword}${typesOnly ? " type" : ""} `;
	const tail = from === null ? ";" : ` from "${from}";`;
	const oneLine = `${head}{ ${parts.join(", ")} }${tail}`;
	if (oneLine.length <= LINE_WIDTH) return oneLine;
	return `${head}{\n${parts.map((part) => `\t${part},`).join("\n")}\n}${tail}`;
}

function bindingOf({ name, as }: LinkedName): string {
	return name === as ? name : `${name} as ${as}`;
}
