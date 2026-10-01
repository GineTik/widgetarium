import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface LiteralGap {
	readonly line: number;
	readonly said: string;
}

const WIDGETS = "registry";
const SHEET = "widget.css";
const LITERAL_GAP = /(?:^|[\s;{])((?:row-|column-)?gap)\s*:\s*([^;}\n]*\d[^;}\n]*)/g;
const ENGINE_GAP = /var\(--wg-gap-(items|parts|cards)\)/;

export function literalGapsIn(text: string): LiteralGap[] {
	return text.split("\n").flatMap((line, at) =>
		[...line.matchAll(LITERAL_GAP)].flatMap(([, property, value]) => {
			if (property === undefined || value === undefined) return [];
			if (ENGINE_GAP.test(value) || value.trim().startsWith("var(")) return [];
			return [{ line: at + 1, said: `${property}: ${value.trim()}` }];
		}),
	);
}

function widgetSources(): string[] {
	return readdirSync(WIDGETS)
		.filter((scope) => scope.startsWith("@"))
		.flatMap((scope) => readdirSync(path.join(WIDGETS, scope)).map((name) => path.join(WIDGETS, scope, name)))
		.filter((folder) => statSync(folder).isDirectory())
		.flatMap((folder) => [...modulesIn(folder), SHEET].map((file) => path.join(folder, file)))
		.filter((file) => existsSync(file));
}

function modulesIn(folder: string): string[] {
	return readdirSync(folder, { recursive: true })
		.map((name) => String(name).split(path.sep).join("/"))
		.filter((name) => /\.tsx?$/.test(name) && !name.endsWith(".d.ts") && !name.startsWith("build/"));
}

function report(): void {
	const found = widgetSources()
		.map((file) => ({ file, gaps: literalGapsIn(readFileSync(file, "utf8")) }))
		.filter((one) => one.gaps.length > 0);
	for (const { file, gaps } of found) {
		console.log(`${file}: ${gaps.length}`);
		for (const gap of gaps) console.log(`  ${gap.line}  ${gap.said}`);
	}
	const total = found.reduce((sum, one) => sum + one.gaps.length, 0);
	console.log(
		`\ngap audit: ${total} gap(s) written as a number in ${found.length} widget file(s); the engine's are var(--wg-gap-items), var(--wg-gap-parts) and var(--wg-gap-cards)`,
	);
}

const ranAs = process.argv[1];
if (ranAs !== undefined && import.meta.url === pathToFileURL(ranAs).href) report();
