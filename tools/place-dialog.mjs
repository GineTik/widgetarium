// One-off: the task dialog draws nothing until a card is pressed, so it needs a PLACE on the
// board without taking a row from anything that does draw. It goes in the first free cell of
// the top row, and only falls to a new bottom row when the top row is full.
import { readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "yaml";
import { buildMirror } from "./mirror.mjs";
buildMirror();
const { findBlocks, replaceBlock } = await import("./.mjs-cache/block-writer.mjs");

const [, , file] = process.argv;
const ID = "taskdialog";
const WIDGET = "@orbitask/task-dialog";

const text = readFileSync(file, "utf8");
const lines = text.split("\n");
const block = findBlocks(lines)[0];
const board = parse(lines.slice(block.start + 1, block.end).join("\n"));

if (!board.tiles.some((tile) => tile.id === ID)) {
	board.tiles.push({ id: ID, widget: WIDGET, sources: { tasks: { path: "Orbitask/Tasks" } } });
	console.log(`added the tile ${ID}`);
}

for (const [columns, layout] of Object.entries(board.layouts ?? {})) {
	const places = layout.places ?? layout;
	if (places.some((place) => place.id === ID)) continue;
	const wide = Number(columns);
	const topRow = places.filter((place) => place.y === 0);
	const taken = new Set();
	for (const place of topRow) for (let x = place.x; x < place.x + place.w; x += 1) taken.add(x);
	let free = -1;
	for (let x = 0; x < wide; x += 1) if (!taken.has(x)) { free = x; break; }
	const bottom = places.reduce((low, place) => Math.max(low, place.y + place.h), 0);
	const at = free >= 0 ? { x: free, y: 0 } : { x: 0, y: bottom };
	places.push({ id: ID, ...at, w: 1, h: 1 });
	console.log(`  ${columns} columns — placed at x${at.x} y${at.y}`);
}

const rewritten = replaceBlock(text, 0, stringify(board, { lineWidth: 0 }));
if (rewritten === null) {
	console.error("refused: the rewrite would not have parsed back as one block");
	process.exit(1);
}
writeFileSync(file, rewritten);
console.log("board written");
