import fs from "node:fs";
import { parse } from "yaml";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");
const { columnsOf } = await import("./.mjs-cache/tree.mjs");

const FENCE = String.fromCharCode(96, 96, 96);
const AT = process.argv[2];
const WIDTH = Number(process.argv[3] ?? 1400);

const note = fs.readFileSync(AT, "utf8");
const block = note.split(`${FENCE}widgetarium`)[1]?.split(FENCE)[0];
const board = normalizeBoard(parse(block));

console.log(`layout: ${board.layout ? Object.keys(board.layout).join(", ") : "ABSENT — the grid draws this board"}`);
if (!board.layout) process.exit(0);

const { beside, stacked } = columnsOf(board.layout, WIDTH);
console.log(`at ${WIDTH}px: beside ${beside.map((one) => `${one.name} ${Math.round(one.width)}px`).join(", ") || "none"}; stacked ${stacked.join(", ") || "none"}`);
console.log(`beside widths plus gaps: ${beside.reduce((sum, one) => sum + one.width, 0) + 8 * Math.max(0, beside.length - 1)} against a board of ${WIDTH}`);
for (const [name, region] of Object.entries(board.layout)) console.log(`  ${name}: ${region.rows.map((row) => row.map((cell) => cell.id).join(" + ")).join(" | ")}`);
