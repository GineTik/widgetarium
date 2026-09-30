import KIT_THEME from "@widgetarium/kit/theme.css";
import { failureMessage } from "./failure-message.js";
import { isObject } from "./is-object.js";

interface Stylesheet {
	readonly path: string;
	readonly base: string;
	readonly content: string;
}

type LoadStylesheet = (specifier: string, base: string) => Promise<Stylesheet>;

interface TailwindCompiler {
	compile(
		css: string,
		options: { readonly base: string; readonly loadStylesheet: LoadStylesheet },
	): Promise<{ build(candidates: readonly string[]): string }>;
}

interface SheetRequest {
	readonly entry: Stylesheet;
	readonly compiler: unknown;
	readonly sheetOfTailwind: (name: string) => Promise<string>;
	readonly readFile: (path: string) => Promise<string | null>;
	readonly candidates: readonly string[];
}

export type SheetInputs = Record<string, string>;

type SheetBuild =
	| { readonly ok: true; readonly css: string; readonly inputs: SheetInputs; readonly failure: null }
	| { readonly ok: false; readonly css: null; readonly inputs: null; readonly failure: string };

export const TAILWIND = "tailwindcss";
const KIT_THEME_SHEET = "widgetarium/theme.css";
const WIDGETARIUM = "widgetarium";
const KIT_SCOPE = `${WIDGETARIUM}/`;
export const TAILWIND_RANGE = "^4";
const TAILWIND_SHEETS: readonly string[] = ["theme.css", "utilities.css"];

const TAILWIND_IMPORT = /@import\s+["']tailwindcss["']/;
const PREFLIGHT = "tailwindcss/preflight.css";

// TRADE-OFF: preflight is dropped rather than offered, because it restyles the host's own elements and a plugin has no page of its own to reset
const WITHOUT_PREFLIGHT = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);`;

export function importsTailwind(css: unknown): boolean {
	return TAILWIND_IMPORT.test(String(css ?? ""));
}

// TODO: split the way Tailwind's own scanner does — every word in the build is offered, so a string holding "block" or "flex" emits a utility nothing asked for
export function candidatesIn(source: unknown): string[] {
	return [...new Set(String(source ?? "").match(/[^\s"'`]+/g) ?? [])];
}

export async function buildSheet({
	entry,
	compiler,
	sheetOfTailwind,
	readFile,
	candidates,
}: SheetRequest): Promise<SheetBuild> {
	const inputs: SheetInputs = { [entry.path]: entry.content };
	const loadStylesheet = stylesheetLoader({ reachable: folderOf(entry.base), inputs, sheetOfTailwind, readFile });
	try {
		if (!isTailwindCompiler(compiler)) throw new Error("the tailwindcss module exposes no compile");
		const compiled = await compiler.compile(entry.content, { base: entry.base, loadStylesheet });
		return { ok: true, css: compiled.build(candidates), inputs, failure: null };
	} catch (failure) {
		return {
			ok: false,
			css: null,
			inputs: null,
			failure: `the widget's sheet did not build: ${failureMessage(failure)}`,
		};
	}
}

export function servedContent(path: string): string | null {
	return path === KIT_THEME_SHEET ? KIT_THEME : null;
}

interface LoaderScope {
	readonly reachable: string;
	readonly inputs: SheetInputs;
	readonly sheetOfTailwind: SheetRequest["sheetOfTailwind"];
	readonly readFile: SheetRequest["readFile"];
}

function stylesheetLoader({ reachable, inputs, sheetOfTailwind, readFile }: LoaderScope): LoadStylesheet {
	return async (specifier, base) => {
		const served = await serveToTailwind(specifier, sheetOfTailwind);
		if (served !== null) {
			if (servedContent(served.path) !== null) inputs[served.path] = served.content;
			return served;
		}
		if (!specifier.startsWith(".")) throw new Error(`"${specifier}" is not a file this widget can reach`);

		const path = joinPath(base, specifier);
		if (path !== reachable && !path.startsWith(`${reachable}/`))
			throw new Error(
				`"${specifier}" leaves ${reachable}, and a widget's sheet may only import what its own scope holds`,
			);

		const content = await readFile(path);
		if (content === null)
			throw new Error(`"${specifier}" is imported by the widget's sheet, and no such file is there`);

		inputs[path] = content;
		return { path, base: folderOf(path), content };
	};
}

function isTailwindCompiler(held: unknown): held is TailwindCompiler {
	return isObject(held) && typeof held["compile"] === "function";
}

function folderOf(path: string): string {
	const cut = path.lastIndexOf("/");
	return cut < 0 ? "" : path.slice(0, cut);
}

function joinPath(base: string, specifier: string): string {
	const held: string[] = [];
	for (const part of `${base}/${specifier}`.split("/")) {
		if (part === "" || part === ".") continue;
		if (part === "..") held.pop();
		else held.push(part);
	}
	return held.join("/");
}

async function serveToTailwind(
	specifier: string,
	sheetOfTailwind: SheetRequest["sheetOfTailwind"],
): Promise<Stylesheet | null> {
	if (specifier === KIT_THEME_SHEET) return { path: KIT_THEME_SHEET, base: "", content: KIT_THEME };
	if (specifier === WIDGETARIUM || specifier.startsWith(KIT_SCOPE))
		throw new Error(`widgetarium serves no "${specifier.slice(KIT_SCOPE.length)}", only its theme.css`);
	if (specifier === TAILWIND) return { path: TAILWIND, base: "", content: WITHOUT_PREFLIGHT };
	if (specifier === PREFLIGHT)
		throw new Error(`"${PREFLIGHT}" restyles the host's own elements, so a widget may not import it`);
	if (!specifier.startsWith(`${TAILWIND}/`)) return null;

	const name = specifier.slice(TAILWIND.length + 1);
	if (!TAILWIND_SHEETS.includes(name)) throw new Error(`tailwindcss serves no "${name}"`);
	return { path: specifier, base: "", content: await sheetOfTailwind(name) };
}
