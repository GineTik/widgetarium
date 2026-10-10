import { failureMessage } from "../engine/failure-message.js";
import { compileWidget, moduleCandidatesOf, requiredIn } from "../engine/widget-build.js";
import type { CompiledModules, ResolvedImports } from "../engine/widget-build.js";
import type { ProjectAliases } from "./project-config.js";
import type { ProjectFinding } from "./project-finding.js";
import type { ProjectFiles } from "./project-files.js";

export interface ImportGraph {
	readonly compiled: CompiledModules;
	readonly resolved: ResolvedImports;
	readonly refused: readonly ProjectFinding[];
}

interface ReadModule {
	readonly path: string;
	readonly text: string;
}

interface WalkedModule {
	readonly path: string;
	readonly code: string;
	readonly resolved: Readonly<Record<string, string>>;
	readonly next: readonly ReadModule[];
	readonly refused: readonly ProjectFinding[];
}

interface ReadEntries {
	readonly read: readonly ReadModule[];
	readonly missing: readonly ProjectFinding[];
}

interface Walk {
	readonly files: ProjectFiles;
	readonly aliases: ProjectAliases;
}

const RELATIVE = /^\.\.?(\/|$)/;
const MISSING_ENTRY = "was found, but could not be read";
const CANNOT_IMPORT = 'imports "{spec}", which names no module in this project';
const DID_NOT_COMPILE = "did not compile: {failure}";

export async function importGraphOf(
	files: ProjectFiles,
	aliases: ProjectAliases,
	entries: readonly string[],
): Promise<ImportGraph> {
	const { read: entered, missing } = await readEach(files, entries);
	const walked = await walkAll({ files, aliases }, entered);
	return {
		compiled: Object.fromEntries(walked.map(({ path, code }) => [path, code])),
		resolved: Object.fromEntries(walked.map(({ path, resolved }) => [path, resolved])),
		refused: [...missing, ...walked.flatMap(({ refused }) => refused)],
	};
}

async function walkAll(walk: Walk, entered: readonly ReadModule[]): Promise<WalkedModule[]> {
	const seen = new Set<string>();
	const walked: WalkedModule[] = [];
	let frontier = entered;
	while (frontier.length > 0) {
		const fresh = [...new Map(frontier.map((read) => [read.path, read])).values()].filter(
			({ path }) => !seen.has(path),
		);
		for (const { path } of fresh) seen.add(path);
		const layer = await Promise.all(fresh.map(async (read) => walkModule(walk, read)));
		walked.push(...layer);
		frontier = layer.flatMap(({ next }) => next);
	}
	return walked;
}

async function readEach(files: ProjectFiles, paths: readonly string[]): Promise<ReadEntries> {
	const asked = await Promise.all(paths.map(async (path) => ({ path, text: await files.read(path) })));
	return {
		read: asked.flatMap(({ path, text }) => (text === null ? [] : [{ path, text }])),
		missing: asked.flatMap(({ path, text }) => (text === null ? [{ path, message: MISSING_ENTRY }] : [])),
	};
}

async function walkModule(walk: Walk, { path, text }: ReadModule): Promise<WalkedModule> {
	const code = compiledOrRefusal(text, path);
	if (typeof code !== "string") return { path, code: "", resolved: {}, next: [], refused: [code.refused] };
	const local = requiredIn(code).filter((spec) => projectPathOf(walk.aliases, path, spec) !== null);
	const found = await Promise.all(local.map(async (spec) => ({ spec, module: await moduleAt(walk, path, spec) })));
	return {
		path,
		code,
		resolved: Object.fromEntries(found.flatMap(({ spec, module }) => (module ? [[spec, module.path]] : []))),
		next: found.flatMap(({ module }) => (module ? [module] : [])),
		refused: found.flatMap(({ spec, module }) =>
			module ? [] : [{ path, message: CANNOT_IMPORT.replace("{spec}", spec) }],
		),
	};
}

function compiledOrRefusal(text: string, path: string): string | { readonly refused: ProjectFinding } {
	try {
		return compileWidget(text, path);
	} catch (failure) {
		return { refused: { path, message: DID_NOT_COMPILE.replace("{failure}", failureMessage(failure)) } };
	}
}

async function moduleAt(walk: Walk, from: string, spec: string): Promise<ReadModule | null> {
	const base = projectPathOf(walk.aliases, from, spec);
	if (base === null) return null;
	for (const path of moduleCandidatesOf(base)) {
		const text = await walk.files.read(path);
		if (text !== null) return { path, text };
	}
	return null;
}

function projectPathOf(aliases: ProjectAliases, from: string, spec: string): string | null {
	if (RELATIVE.test(spec)) return joinedFrom(from, spec);
	const aliased = Object.entries(aliases)
		.filter(([name]) => spec === name || spec.startsWith(`${name}/`))
		.sort(([one], [other]) => other.length - one.length)[0];
	return aliased === undefined ? null : `${aliased[1]}${spec.slice(aliased[0].length)}`;
}

function joinedFrom(from: string, spec: string): string {
	const base = from.split("/").slice(0, -1);
	for (const part of spec.split("/")) {
		if (part === "..") base.pop();
		else if (part !== "." && part !== "") base.push(part);
	}
	return base.join("/");
}
