import fs from "node:fs";
import { parse } from "yaml";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");
const { columnsOf, isBox, keptAt, laid, sideOf, GAP_PX, REGION_PAD_PX } = await import("./.mjs-cache/tree.mjs");

const FENCE = String.fromCharCode(96, 96, 96);
const AT = process.argv[2];
const WIDTH = Number(process.argv[3] ?? 1400);

const note = fs.readFileSync(AT, "utf8");
const block = note.split(`${FENCE}widgetarium`)[1]?.split(FENCE)[0];
const board = normalizeBoard(parse(block));
const root = board.layout;
const keep = keptAt(root);
const nameOf = (at) => (at === keep ? "main" : sideOf(root, at));
const ask = () => ({});

const drawn = (node, depth) => {
	const pad = "  ".repeat(depth);
	if (!isBox(node)) return `${pad}${node.id}${node.height ? ` ${node.height}px` : ""} · ${Math.round(node.width)}px`;
	const said = `${pad}${node.dir}${node.isStacked ? " (stacked)" : ""} · ${Math.round(node.width)}px`;
	return [said, ...node.of.map((child) => drawn(child, depth + 1))].join("\n");
};

const { beside, floating, hidden, alone } = columnsOf(root, WIDTH);
const said = (at) => `${nameOf(at)}[${at}]`;
console.log(`layout: ${root.of.length} regions, ${beside.length} beside`);
console.log(
	`at ${WIDTH}px: beside ${beside.map((one) => `${said(one.at)} ${Math.round(one.width)}px`).join(", ") || "none"}; ` +
		`floating ${floating.map(said).join(", ") || "none"}; hidden ${hidden.map(said).join(", ") || "none"}; ` +
		`alone ${alone.map(said).join(", ") || "none"}`,
);
for (const column of beside) {
	console.log(`  ${said(column.at)}`);
	console.log(drawn(laid(root.of[column.at], column.width - REGION_PAD_PX * 2, { ask, gap: GAP_PX, path: [column.at] }), 2));
}
