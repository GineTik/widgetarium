import fs from "node:fs";
import { parse } from "yaml";
import type { LaidNode } from "../packages/core/src/tree.js";

const { normalizeBoard } = await import("../packages/core/src/model.js");
const { columnsOf, keptAt, layNode, sideOf, REGION_PAD_PX } = await import("../packages/core/src/tree.js");

const FENCE = String.fromCharCode(96, 96, 96);
const AT = process.argv[2] ?? "";
const WIDTH = Number(process.argv[3] ?? 1400);

const note = fs.readFileSync(AT, "utf8");
const block = note.split(`${FENCE}widgetarium`)[1]?.split(FENCE)[0];
const parsedBlock: unknown = parse(block ?? "");
const board = normalizeBoard(parsedBlock);
const root = board.layout;
const keep = keptAt(root);
const nameOf = (at: number): string => (at === keep ? "main" : sideOf(root, at));
const ask = (): Record<string, never> => ({});

const drawn = (node: LaidNode, depth: number): string => {
	const pad = "  ".repeat(depth);
	if (node.kind === "collapsed") return `${pad}collapsed into ${node.into}`;
	if (node.kind === "leaf") return `${pad}${node.id} · ${Math.round(node.width)}px`;
	const said = `${pad}${node.dir}${node.isStacked ? " (stacked)" : ""} · ${Math.round(node.width)}px`;
	return [said, ...node.of.map((child) => drawn(child, depth + 1))].join("\n");
};

const { beside, floating, hidden, alone } = columnsOf(root, WIDTH);
const said = (at: number): string => `${nameOf(at)}[${at}]`;
console.log(`layout: ${root.of.length} regions, ${beside.length} beside`);
console.log(
	`at ${WIDTH}px: beside ${beside.map((one) => `${said(one.at)} ${Math.round(one.width)}px`).join(", ") || "none"}; ` +
		`floating ${floating.map(said).join(", ") || "none"}; hidden ${hidden.map(said).join(", ") || "none"}; ` +
		`alone ${alone.map(said).join(", ") || "none"}`,
);
for (const column of beside) {
	const region = root.of[column.at];
	if (!region) continue;
	console.log(`  ${said(column.at)}`);
	console.log(drawn(layNode(region, column.width - REGION_PAD_PX * 2, { ask, path: [column.at] }), 2));
}
