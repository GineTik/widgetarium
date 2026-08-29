import { readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "yaml";
import { findBlocks, replaceBlock } from "./.mjs-cache/block-writer.mjs";
import { buildMirror } from "./mirror.mjs";

const [, , file, id, widget, folder] = process.argv;
const text = readFileSync(file, "utf8");
const lines = text.split("\n");
const block = findBlocks(lines)[0];
const board = parse(lines.slice(block.start + 1, block.end).join("\n"));

if (!board.tiles.some((tile) => tile.id === id)) {
	const anchor = board.tiles.findIndex((tile) => tile.widget.endsWith("kanban-board"));
	board.tiles.splice(anchor < 0 ? board.tiles.length : anchor, 0, {
		id,
		widget,
		...(folder ? { sources: { tasks: { path: folder } } } : {}),
	});
}

for (const [columns, layout] of Object.entries(board.layouts ?? {})) {
	const places = layout.places ?? layout;
	if (places.some((place) => place.id === id)) continue;
	const board_ = places.find((place) => place.id === "board");
	if (!board_) continue;
	for (const place of places) if (place.y >= board_.y) place.y += 1;
	places.push({ id, x: board_.x, y: board_.y - 1 < 0 ? 0 : board_.y - 1, w: board_.w, h: 1 });
	// the row we just freed is the one directly above the board
	places.find((place) => place.id === id).y = board_.y - 1;
	console.log(`  ${columns} columns — placed at x${board_.x} y${board_.y - 1} w${board_.w}`);
}

const next = replaceBlock(text, 0, stringify(board));
if (next === null) throw new Error("the block would not round-trip — nothing written");
writeFileSync(file, next);
console.log(`${id} added to ${file}`);
