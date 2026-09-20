import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { buildMirror } from "./mirror.mjs";

// CONTEXT: src is ESM but Node reads .js as CommonJS here, so every suite goes through the mirror
buildMirror();
const { findBlocks, replaceBlock, readBody, replaceBody } = await import("./.mjs-cache/block-writer.mjs");

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

function normalizeSources(input) {
	const result = {};
	for (const [name, value] of Object.entries(input)) {
		result[name] = { path: value.path ?? "", filters: value.filters ?? [], sort: value.sort ?? [] };
	}
	return result;
}

function normalize(input) {
	const list = Array.isArray(input) ? input : [];
	return list.map((tile, index) => ({
		id: tile.id ?? `w${index}`,
		widget: tile.widget,
		x: tile.x ?? 0,
		y: tile.y ?? index * 2,
		w: tile.w ?? 3,
		h: tile.h ?? 2,
		settings: tile.settings ?? {},
		sources: normalizeSources(tile.sources ?? tile.data ?? {}),
	}));
}

// what Obsidian gives us: the block source and its section bounds
function sectionInfo(text) {
	const lines = text.split("\n");
	const block = findBlocks(lines)[0];
	return {
		text,
		lineStart: block.start,
		lineEnd: block.end,
		source: lines.slice(block.start + 1, block.end).join("\n"),
	};
}

let file = NOTE;
let broken = null;

for (let step = 0; step < 60 && !broken; step += 1) {
	// RENDER: same as renderBlock
	const info = sectionInfo(file);
	let layout;
	try {
		layout = normalize(parseYaml(info.source) ?? []);
	} catch (failure) {
		broken = `YAML broke at step ${step}: ${failure.message}`;
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

	// WRITE: same as flushWrites — drag the third tile
	layout[2].y = 10 + (step % 5);
	const next = replaceBlock(file, blockIndex, stringifyYaml(layout), (written) => {
		const parsed = parseYaml(written);
		return Array.isArray(parsed) && parsed.length === layout.length;
	});
	if (next === null) {
		broken = `replaceBlock refused at step ${step}`;
		break;
	}
	file = next;
}

const finalInfo = sectionInfo(file);
const tiles = normalize(parseYaml(finalInfo.source) ?? []);

// A SCRIPT THAT ONLY PRINTS CANNOT FAIL, and this is the only cover the write path has: sixty
// parse-and-replace cycles over the note's fenced block. It printed BROKEN and exited 0.
let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

check("sixty writes never refuse", broken, null);
// CONTEXT: three is the count the loop itself guards every step, so it is the invariant
check("and the tiles all survive them", tiles.length, 3);
check("the note still holds exactly one block", findBlocks(file.split("\n")).length, 1);
check("and the block still parses as a list", Array.isArray(parseYaml(finalInfo.source)), true);

// THE OTHER REGION OF A NOTE. A board block is replaced without eating the rest of the file;
// a note's BODY has to be replaced the same way, because the half above it is the properties
// every widget reads. A body write that reformats the frontmatter loses data nobody edited.
const NOTE_WITH_PROPS = `---
title: "Audit the type scale"
status: Doing
---

Check every heading against the ramp.

---

Then write it up.
`;
const NOTE_BARE = "Just a note.\nNo properties at all.\n";

const frontmatterOf = (text) => text.split("\n").slice(0, 3).join("\n");

check(
	"a note's body is what follows its frontmatter",
	readBody(NOTE_WITH_PROPS).trim().split("\n")[0],
	"Check every heading against the ramp.",
);
// a rule in the body is NOT a second frontmatter fence; reading must not stop at it
check("and a rule inside the body stays in the body", readBody(NOTE_WITH_PROPS).includes("Then write it up."), true);
check("a note without frontmatter is all body", readBody(NOTE_BARE), NOTE_BARE);

const rewritten = replaceBody(NOTE_WITH_PROPS, "Rewritten.\n\n---\n\nStill mine.");
check("a body write leaves the frontmatter byte-identical", frontmatterOf(rewritten), frontmatterOf(NOTE_WITH_PROPS));
// LOAD-BEARING ONLY ONCE THE TWO ABOVE ARE GREEN: with an empty body at both ends this
// compares nothing at all, which is exactly how a body seam can look finished and be absent.
check("and what is read back is what was written", readBody(rewritten), "Rewritten.\n\n---\n\nStill mine.");
check("the write really changed the note", readBody(rewritten) !== readBody(NOTE_WITH_PROPS), true);

// REFUSE, do not half-write: a bare note given a body that opens with a rule would gain
// frontmatter it never had, and the next read would take the first paragraph for properties.
check(
	"a body that would become frontmatter is refused",
	replaceBody(NOTE_BARE, "---\nnot: properties\n---\nbody"),
	null,
);
// the same text under real frontmatter is only a rule, and must go through
check(
	"but the same text under real frontmatter goes through",
	readBody(replaceBody(NOTE_WITH_PROPS, "---\nnot: properties\n---\nbody")),
	"---\nnot: properties\n---\nbody",
);

check(
	"an empty body empties the note without touching its properties",
	frontmatterOf(replaceBody(NOTE_WITH_PROPS, "")),
	frontmatterOf(NOTE_WITH_PROPS),
);
check("and reads back empty", readBody(replaceBody(NOTE_WITH_PROPS, "")), "");

console.log(failed ? `\n${failed} failed` : "\nthe note survives being written to");
process.exit(failed ? 1 : 0);
