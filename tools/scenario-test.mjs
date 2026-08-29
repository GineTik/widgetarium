// One test per scenario in docs/arrange-scenarios.md, in the same order and with the same
// numbers. If a scenario changes, this file changes with it; if this file passes, the document
// is true. The old tests grew case by case around whatever had just broken, and between them
// they never described the behaviour anybody actually wanted.
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { arrange } = await import("./.mjs-cache/layout.mjs");

let failed = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};

const span = (places) => places.map((place) => `${place.id} ${place.x}-${place.x + place.w}@${place.y}`);
const byId = (places) => [...places].sort((a, b) => a.id.localeCompare(b.id));
const overlapping = (places) =>
	places.some((a) =>
		places.some((b) => a !== b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h),
	);
const escaped = (places, columns) => places.some((p) => p.x < 0 || p.x + p.w > columns || p.w < 1);

// ── 1. widening into a neighbour, with room ──────────────────────────────────────────────
{
	const row = [
		{ id: "a", x: 0, y: 0, w: 3, h: 1 },
		{ id: "b", x: 3, y: 0, w: 3, h: 1 },
		{ id: "c", x: 6, y: 0, w: 3, h: 1 },
	];
	const after = arrange([{ ...row[0], w: 5 }, row[1], row[2]], 12, { movedId: "a" });
	check("1 · the held tile keeps the width it was given", after.find((p) => p.id === "a").w, 5);
	check("1 · the neighbour steps aside, it does not drop", after.find((p) => p.id === "b").y, 0);
	check("1 · and the push cascades past it", span(byId(after)), ["a 0-5@0", "b 5-8@0", "c 8-11@0"]);
}

// ── 2. widening into a full row ──────────────────────────────────────────────────────────
{
	const full = [
		{ id: "a", x: 0, y: 0, w: 3, h: 1 },
		{ id: "b", x: 3, y: 0, w: 3, h: 1 },
		{ id: "c", x: 6, y: 0, w: 3, h: 1 },
		{ id: "d", x: 9, y: 0, w: 3, h: 1 },
	];
	const after = arrange([{ ...full[0], w: 4 }, ...full.slice(1)], 12, { movedId: "a" });
	check("2 · nobody dropped", after.every((p) => p.y === 0), true);
	check("2 · the held tile kept its width", after.find((p) => p.id === "a").w, 4);
	check("2 · the row still ends at the board edge", Math.max(...after.map((p) => p.x + p.w)), 12);
	check("2 · a neighbour gave the column, not the held tile", after.find((p) => p.id === "b").w, 2);
	check("2 · and nothing overlaps", overlapping(after), false);
}

// ── 3. widening the last tile pushes LEFT ────────────────────────────────────────────────
{
	const full = [
		{ id: "a", x: 0, y: 0, w: 3, h: 1 },
		{ id: "b", x: 3, y: 0, w: 3, h: 1 },
		{ id: "c", x: 6, y: 0, w: 3, h: 1 },
		{ id: "d", x: 9, y: 0, w: 3, h: 1 },
	];
	const after = arrange([...full.slice(0, 3), { id: "d", x: 7, y: 0, w: 5, h: 1 }], 12, { movedId: "d" });
	check("3 · the held tile is where the person put it", span([after.find((p) => p.id === "d")]), ["d 7-12@0"]);
	check("3 · everyone stayed on the row", after.every((p) => p.y === 0), true);
	check("3 · the neighbour moved LEFT, not down", after.find((p) => p.id === "c").x < 6, true);
	check("3 · the row still starts at the left edge", Math.min(...after.map((p) => p.x)), 0);
	check("3 · nothing overlaps", overlapping(after), false);
}

// ── 4. a tall tile beside short ones ─────────────────────────────────────────────────────
{
	const board = [
		{ id: "s", x: 0, y: 0, w: 2, h: 3 },
		{ id: "t", x: 2, y: 0, w: 10, h: 1 },
		{ id: "u", x: 2, y: 1, w: 10, h: 1 },
		{ id: "v", x: 2, y: 2, w: 10, h: 1 },
	];
	const after = arrange([{ ...board[0], w: 4 }, ...board.slice(1)], 12, { movedId: "s" });
	check("4 · every row the tall tile spans stepped aside", byId(after).filter((p) => p.id !== "s").map((p) => p.x), [4, 4, 4]);
	check("4 · and every one of them stayed on its own row", byId(after).filter((p) => p.id !== "s").map((p) => p.y), [0, 1, 2]);
	check("4 · nothing overlaps", overlapping(after), false);
	check("4 · nothing left the board", escaped(after, 12), false);
}

// ── 5. nowhere to go at all ──────────────────────────────────────────────────────────────
{
	const tight = [
		{ id: "a", x: 0, y: 0, w: 2, h: 1 },
		{ id: "b", x: 2, y: 0, w: 2, h: 1 },
	];
	const after = arrange([{ ...tight[0], w: 4 }, tight[1]], 4, { movedId: "a" });
	check("5 · the held tile took the whole board", after.find((p) => p.id === "a").w, 4);
	check("5 · the other dropped a row, because there is nowhere else", after.find((p) => p.id === "b").y, 1);
	check("5 · and it is still on the board", escaped(after, 4), false);
}

// ── 6. reading a layout back ─────────────────────────────────────────────────────────────
{
	const arranged = [
		{ id: "a", x: 0, y: 0, w: 3, h: 1 },
		{ id: "b", x: 3, y: 0, w: 3, h: 1 },
		{ id: "c", x: 6, y: 0, w: 3, h: 1 },
	];
	const once = arrange(arranged, 12, { reading: true });
	check("6 · reading returns the arrangement unchanged", span(byId(once)), span(byId(arranged)));
	check("6 · and reading it again changes nothing", span(byId(arrange(once, 12, { reading: true }))), span(byId(once)));
}

// ── 7. the screen changes width ──────────────────────────────────────────────────────────
{
	const wide = [
		{ id: "s", x: 0, y: 0, w: 4, h: 1 },
		{ id: "t", x: 4, y: 0, w: 16, h: 1 },
	];
	const after = arrange(wide, 10, { scaleFrom: 20 });
	check("7 · both scaled with the board", span(byId(after)), ["s 0-2@0", "t 2-10@0"]);
	check("7 · and neither dropped", after.every((p) => p.y === 0), true);
}

console.log(failed ? `\n${failed} failed` : "\nevery scenario behaves as written");
process.exit(failed ? 1 : 0);
