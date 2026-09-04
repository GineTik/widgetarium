import fs from "node:fs";

const FENCE = String.fromCharCode(96, 96, 96);
const AT = process.argv[2];

const REGIONS = `layout:
  left:
    - [{ id: w222pgx, height: 320 }]
    - [{ id: wwb96xo, height: 160 }]
  main:
    - [{ id: boards, ratio: 10, height: 80 }, { id: wotn7a5, ratio: 2, height: 80 }]
    - [{ id: ws8oddg, height: 937 }]
  right:
    - [{ id: wynttpz, height: 80 }]
    - [{ id: wim9yep, height: 200 }]
    - [{ id: wgwlg82, height: 125 }]
`;

const note = fs.readFileSync(AT, "utf8");
const opened = note.indexOf(`${FENCE}widgetarium`);
const closed = note.indexOf(FENCE, opened + FENCE.length);
if (opened < 0 || closed < 0) {
	console.error(`side: ${AT} carries no widgetarium block`);
	process.exit(1);
}

const head = note.slice(0, opened + FENCE.length + "widgetarium".length);
const block = note.slice(opened + FENCE.length + "widgetarium".length, closed);
const at = block.indexOf("\nlayout:");
const after = block.indexOf("\nlayouts:");
if (at < 0 || after < 0) {
	console.error("side: this board carries no layout to replace");
	process.exit(1);
}

fs.writeFileSync(AT, head + block.slice(0, at + 1) + REGIONS + block.slice(after + 1) + note.slice(closed), "utf8");
console.log(`side: ${AT} now names a left sidebar, a main and a right sidebar`);
