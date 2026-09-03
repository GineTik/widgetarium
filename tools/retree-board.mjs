import fs from "node:fs";

const FENCE = String.fromCharCode(96, 96, 96);
const AT = process.argv[2];

const TREE = `layout:
  - [{ id: boards, ratio: 10 }, { id: wotn7a5, ratio: 5 }, { id: wynttpz, ratio: 4 }]
  - [{ id: ws8oddg, height: 640 }]
  - [{ id: w222pgx, height: 360 }]
  - [{ id: wwb96xo, ratio: 3 }, { id: wim9yep, ratio: 4, height: 180 }]
  - [{ id: wgwlg82, height: 180 }]
`;

const note = fs.readFileSync(AT, "utf8");
const opened = note.indexOf(`${FENCE}widgetarium`);
const closed = note.indexOf(FENCE, opened + FENCE.length + "widgetarium".length);
if (opened < 0 || closed < 0) {
	console.error(`retree: ${AT} carries no widgetarium block`);
	process.exit(1);
}

const block = note.slice(opened + FENCE.length + "widgetarium".length, closed);
if (block.includes("\nlayout:\n")) {
	console.error("retree: this board already carries a layout");
	process.exit(1);
}

const atLayouts = block.indexOf("\nlayouts:");
if (atLayouts < 0) {
	console.error("retree: this board carries no layouts to sit beside");
	process.exit(1);
}

const rewritten = `${block.slice(0, atLayouts + 1)}${TREE}${block.slice(atLayouts + 1)}`;
fs.writeFileSync(AT, note.slice(0, opened + FENCE.length + "widgetarium".length) + rewritten + note.slice(closed), "utf8");
console.log(`retree: ${AT} now carries a layout of 5 rows, and keeps its 16 old layouts underneath`);
