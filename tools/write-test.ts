import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { isObject } from "../packages/core/src/engine/is-object.js";

const { findBlocks, replaceBlock, readBody, replaceBody } = await import("../packages/core/src/block-writer.js");

const NOTE = `---
widgetarium: screen
---

\`\`\`widgetarium
- id: balance
  widget: "@wallet/balance"
  x: 0
  y: 0
  w: 7
  h: 6
- id: quick
  widget: "@wallet/quick-send"
  x: 0
  y: 6
  w: 7
  h: 4
  sources:
    contacts:
      path: Widgetarium Demo/Wallet/Contacts
- id: period
  widget: "@wallet/period"
  x: 0
  y: 10
  w: 7
  h: 1
\`\`\`
`;

interface WrittenSource {
	readonly path: unknown;
	readonly filters: unknown;
	readonly sort: unknown;
}

interface WrittenTile {
	readonly id: unknown;
	readonly widget: unknown;
	readonly x: unknown;
	y: unknown;
	readonly w: unknown;
	readonly h: unknown;
	readonly settings: unknown;
	readonly sources: Record<string, WrittenSource>;
}

interface SectionInfo {
	readonly text: string;
	readonly lineStart: number;
	readonly lineEnd: number;
	readonly source: string;
}

const fieldOf = (value: unknown, key: string): unknown => (isObject(value) ? value[key] : undefined);

function normalizeSources(input: unknown): Record<string, WrittenSource> {
	const result: Record<string, WrittenSource> = {};
	for (const [name, value] of Object.entries(isObject(input) ? input : {})) {
		result[name] = {
			path: fieldOf(value, "path") ?? "",
			filters: fieldOf(value, "filters") ?? [],
			sort: fieldOf(value, "sort") ?? [],
		};
	}
	return result;
}

function normalize(input: unknown): WrittenTile[] {
	const list: readonly unknown[] = Array.isArray(input) ? input : [];
	return list.map((tile, index) => ({
		id: fieldOf(tile, "id") ?? `w${index}`,
		widget: fieldOf(tile, "widget"),
		x: fieldOf(tile, "x") ?? 0,
		y: fieldOf(tile, "y") ?? index * 2,
		w: fieldOf(tile, "w") ?? 3,
		h: fieldOf(tile, "h") ?? 2,
		settings: fieldOf(tile, "settings") ?? {},
		sources: normalizeSources(fieldOf(tile, "sources") ?? fieldOf(tile, "data") ?? {}),
	}));
}

function sectionInfo(text: string): SectionInfo {
	const lines = text.split("\n");
	const block = findBlocks(lines)[0];
	if (!block) throw new Error("the note holds no widgetarium block");
	return {
		text,
		lineStart: block.start,
		lineEnd: block.end,
		source: lines.slice(block.start + 1, block.end).join("\n"),
	};
}

let file = NOTE;
let broken: string | null = null;

for (let step = 0; step < 60 && !broken; step += 1) {
	const info = sectionInfo(file);
	let layout: WrittenTile[];
	try {
		const parsedSource: unknown = parseYaml(info.source);
		layout = normalize(parsedSource ?? []);
	} catch (failure) {
		broken = `YAML broke at step ${step}: ${fieldOf(failure, "message")}`;
		break;
	}
	if (layout.length !== 3) {
		broken = `tile count became ${layout.length} at step ${step}`;
		break;
	}

	const blockIndex = findBlocks(info.text.split("\n")).findIndex((b) => b.start === info.lineStart);
	if (blockIndex < 0) {
		broken = `blockIndex lost at step ${step}`;
		break;
	}

	const dragged = layout[2];
	if (dragged) dragged.y = 10 + (step % 5);
	const next = replaceBlock(file, blockIndex, stringifyYaml(layout), (written) => {
		const parsed: unknown = parseYaml(written);
		return Array.isArray(parsed) && parsed.length === layout.length;
	});
	if (next === null) {
		broken = `replaceBlock refused at step ${step}`;
		break;
	}
	file = next;
}

const finalInfo = sectionInfo(file);
const finalSource: unknown = parseYaml(finalInfo.source);
const tiles = normalize(finalSource ?? []);

let failed = 0;
function check(name: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

check("sixty writes never refuse", broken, null);
check("and the tiles all survive them", tiles.length, 3);
check("the note still holds exactly one block", findBlocks(file.split("\n")).length, 1);
check("and the block still parses as a list", Array.isArray(finalSource), true);

const NOTE_WITH_PROPS = `---
title: "Audit the type scale"
status: Doing
---

Check every heading against the ramp.

---

Then write it up.
`;
const NOTE_BARE = "Just a note.\nNo properties at all.\n";

const frontmatterOf = (text: string): string => text.split("\n").slice(0, 3).join("\n");
const accepted = (text: string | null): string => {
	if (text === null) throw new Error("the body write was refused");
	return text;
};

check(
	"a note's body is what follows its frontmatter",
	readBody(NOTE_WITH_PROPS).trim().split("\n")[0],
	"Check every heading against the ramp.",
);
check("and a rule inside the body stays in the body", readBody(NOTE_WITH_PROPS).includes("Then write it up."), true);
check("a note without frontmatter is all body", readBody(NOTE_BARE), NOTE_BARE);

const rewritten = accepted(replaceBody(NOTE_WITH_PROPS, "Rewritten.\n\n---\n\nStill mine."));
check("a body write leaves the frontmatter byte-identical", frontmatterOf(rewritten), frontmatterOf(NOTE_WITH_PROPS));
check("and what is read back is what was written", readBody(rewritten), "Rewritten.\n\n---\n\nStill mine.");
check("the write really changed the note", readBody(rewritten) !== readBody(NOTE_WITH_PROPS), true);

check(
	"a body that would become frontmatter is refused",
	replaceBody(NOTE_BARE, "---\nnot: properties\n---\nbody"),
	null,
);
check(
	"but the same text under real frontmatter goes through",
	readBody(accepted(replaceBody(NOTE_WITH_PROPS, "---\nnot: properties\n---\nbody"))),
	"---\nnot: properties\n---\nbody",
);

check(
	"an empty body empties the note without touching its properties",
	frontmatterOf(accepted(replaceBody(NOTE_WITH_PROPS, ""))),
	frontmatterOf(NOTE_WITH_PROPS),
);
check("and reads back empty", readBody(accepted(replaceBody(NOTE_WITH_PROPS, ""))), "");

console.log(failed ? `\n${failed} failed` : "\nthe note survives being written to");
process.exit(failed ? 1 : 0);
