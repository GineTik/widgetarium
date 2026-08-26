import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { findBlocks, replaceBlock } from "/tmp/block-writer.mjs";

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
	return { text, lineStart: block.start, lineEnd: block.end, source: lines.slice(block.start + 1, block.end).join("\n") };
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
	if (layout.length !== 3) { broken = `tile count became ${layout.length} at step ${step}`; break; }

	const blockIndex = findBlocks(info.text.split("\n")).findIndex((b) => b.start === info.lineStart);
	if (blockIndex < 0) { broken = `blockIndex lost at step ${step}`; break; }

	// WRITE: same as flushWrites — drag the third tile
	layout[2].y = 10 + (step % 5);
	const next = replaceBlock(file, blockIndex, stringifyYaml(layout), (written) => {
		const parsed = parseYaml(written);
		return Array.isArray(parsed) && parsed.length === layout.length;
	});
	if (next === null) { broken = `replaceBlock refused at step ${step}`; break; }
	file = next;
}

const finalInfo = sectionInfo(file);
const tiles = normalize(parseYaml(finalInfo.source) ?? []);
console.log(broken ?? `60 render/write cycles: tiles = ${tiles.length}, blocks = ${findBlocks(file.split("\n")).length}`);
console.log(broken ? "BROKEN" : "INTACT");
if (!broken) console.log(finalInfo.source.split("\n").slice(0, 12).join("\n"));
