import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HANDBOOK = "docs/ai";
const LAID = "node_modules/.cache/widgetarium/docs-code";
const SKIPPED_MARK = "skip-check";
const FENCE = /^```(tsx|ts)(?![\w-])([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm;
const NAMED_FILE = /\bfile=(\S+)/;
const DIAGNOSTIC = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const REFERENCED_PROJECTS = ["packages/kit", "packages/core"];
const WIDGET_CONFIG = "packages/sdk/tsconfig.widgets.json";
const WIDGET_DECLARATIONS = "packages/sdk/types/widgetarium.d.ts";

interface Block {
	readonly page: string;
	readonly line: number;
	readonly file: string;
	readonly source: string;
	readonly isSkipped: boolean;
	readonly refusal: string | null;
}

interface Findings {
	readonly byBlock: Map<Block, readonly string[]>;
	readonly outside: Set<string>;
}

interface CompilerAnswer {
	readonly status: number | null;
	readonly said: string;
}

function pagesIn(folder: string): string[] {
	return fs
		.readdirSync(folder, { withFileTypes: true })
		.flatMap((entry) => {
			const at = path.join(folder, entry.name);
			if (entry.isDirectory()) return pagesIn(at);
			return entry.name.endsWith(".md") ? [at] : [];
		})
		.sort();
}

const pageSlugOf = (page: string): string => path.relative(HANDBOOK, page).replace(/\.md$/, "").replaceAll("/", "-");

function refusalOfName(slug: string, named: string, language: string): string | null {
	const inside = path.resolve(LAID, slug);
	if (!path.resolve(inside, named).startsWith(`${inside}${path.sep}`)) return `file=${named} leaves the page's folder`;
	if (path.extname(named) !== `.${language}`) return `file=${named} is not a .${language} file`;
	return null;
}

function blocksOf(page: string): Block[] {
	const text = fs.readFileSync(page, "utf8");
	const slug = pageSlugOf(page);
	const blocks = [...text.matchAll(FENCE)].map((match, index) => {
		const [, language = "ts", info = "", source = ""] = match;
		const named = NAMED_FILE.exec(info)?.[1];
		return {
			page,
			line: text.slice(0, match.index).split("\n").length + 1,
			file: path.join(slug, named ?? `block-${index + 1}.${language}`),
			source,
			isSkipped: info.trim().split(/\s+/).includes(SKIPPED_MARK),
			refusal: named ? refusalOfName(slug, named, language) : null,
		};
	});
	return blocks.map((block, index) =>
		blocks.findIndex((one) => one.file === block.file) === index
			? block
			: { ...block, refusal: `${block.file} is named by an earlier block on this page` },
	);
}

function layProjectConfig(laid: readonly Block[], compiled: readonly Block[]): string {
	fs.rmSync(LAID, { recursive: true, force: true });
	for (const block of laid) {
		const at = path.join(LAID, block.file);
		fs.mkdirSync(path.dirname(at), { recursive: true });
		fs.writeFileSync(at, `${block.source}\nexport {};\n`);
	}
	const config = {
		extends: path.relative(LAID, WIDGET_CONFIG),
		references: REFERENCED_PROJECTS.map((project) => ({ path: path.relative(LAID, project) })),
		include: [],
		files: [path.relative(LAID, WIDGET_DECLARATIONS), ...compiled.map((block) => block.file)],
	};
	const configPath = path.join(LAID, "tsconfig.json");
	fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));
	return configPath;
}

function runCompiler(...args: string[]): CompilerAnswer {
	const ran = spawnSync("npx", ["--no-install", "tsc", ...args], { encoding: "utf8" });
	return { status: ran.status, said: `${ran.stdout ?? ""}${ran.stderr ?? ""}${ran.error?.message ?? ""}` };
}

function findingsIn({ status, said }: CompilerAnswer, laid: readonly Block[]): Findings {
	const findings: Findings = { byBlock: new Map(), outside: new Set() };
	for (const line of said.split("\n")) {
		const match = DIAGNOSTIC.exec(line.trim());
		if (!match) continue;
		const [, file = "", row = "0", column = "0", code = "", message = ""] = match;
		const block = laid.find((one) => path.resolve(LAID, one.file) === path.resolve(file));
		if (!block) {
			findings.outside.add(`${file}:${row}:${column} ${code} ${message}`);
			continue;
		}
		const at = `${block.page}:${block.line + Number(row) - 1}:${column}`;
		findings.byBlock.set(block, [...(findings.byBlock.get(block) ?? []), `${at} ${code} ${message}`]);
	}
	const isUnexplained = status !== 0 && findings.byBlock.size === 0 && findings.outside.size === 0;
	if (isUnexplained) findings.outside.add(`tsc exited ${status} naming no file:\n${said.trim()}`);
	return findings;
}

// TRADE-OFF: re-compiled without the failing blocks, since one syntax error hides every type error
function findingsOfEveryBlock(checked: readonly Block[]): Findings {
	const settled: Findings = { byBlock: new Map(), outside: new Set() };
	let remaining = checked;
	for (;;) {
		const found = findingsIn(runCompiler("-p", layProjectConfig(checked, remaining), "--pretty", "false"), checked);
		for (const finding of found.outside) settled.outside.add(finding);
		const failing = remaining.filter((block) => found.byBlock.has(block));
		for (const block of failing) settled.byBlock.set(block, found.byBlock.get(block) ?? []);
		if (failing.length === 0) return settled;
		remaining = remaining.filter((block) => !failing.includes(block));
	}
}

const blocks = pagesIn(HANDBOOK).flatMap(blocksOf);
const skipped = blocks.filter((block) => block.isSkipped);
const refused = blocks.filter((block) => !block.isSkipped && block.refusal !== null);
const checked = blocks.filter((block) => !block.isSkipped && block.refusal === null);

const built = runCompiler("-b", ...REFERENCED_PROJECTS);
if (built.status !== 0) {
	console.log(`the projects the blocks compile against did not build:\n${built.said}`);
	process.exit(1);
}

const findings = findingsOfEveryBlock(checked);

for (const block of skipped) console.log(`skip ${block.page}:${block.line}  ${block.file}`);
for (const block of refused) console.log(`!!  ${block.page}:${block.line}  ${block.refusal}`);
for (const block of checked) {
	const found = findings.byBlock.get(block) ?? [];
	console.log(`${found.length === 0 ? "ok  " : "!!  "}${block.page}:${block.line}  ${block.file}`);
	for (const finding of found) console.log(`      ${finding}`);
}
for (const finding of findings.outside) console.log(`!!  outside every block: ${finding}`);

const failedBlocks = findings.byBlock.size + refused.length;
const isClean = checked.length > 0 && failedBlocks === 0 && findings.outside.size === 0;
console.log(
	`\ndocs code: ${checked.length + refused.length} checked, ${failedBlocks} failed, ${skipped.length} skipped (${SKIPPED_MARK})`,
);
process.exit(isClean ? 0 : 1);
