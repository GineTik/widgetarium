import { projectedDrop } from "../apps/obsidian/src/layer-drag.ts";
import type { DragRow } from "../apps/obsidian/src/layer-drag.ts";

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const ROW = 26;
const INDENT = 14;
const marks: [string, number, boolean?, boolean?, string?][] = [
	["group", 0, true, false, "outer"],
	["page", 1, true],
	["reach", 2, true],
	["reach-button", 3, false, true],
	["reach-list", 3],
	["follow", 2, true],
	["follow-button", 3, false, true],
	["follow-list", 3],
	["everyone", 2, true],
	["grid", 3],
];
const rows: DragRow[] = marks.map(([mark, depth, canHold = false, isHeld = false, scope = "inner"], at) => ({
	mark,
	depth,
	top: at * ROW,
	height: ROW,
	canHold,
	isHeld,
	scope,
}));
const at = (mark: string): number => rows.findIndex((one) => one.mark === mark);
const middleOf = (mark: string): number => at(mark) * ROW + ROW / 2;
const drop = (mark: string, y: number, shownAt: number | null = null, dx = 0) =>
	projectedDrop(rows, mark, { y, dx }, shownAt, INDENT);

check("a lifted row put down where it was moves nothing", drop("follow-list", middleOf("follow-list"))?.isStill, true);
const up = drop("follow-list", middleOf("reach-list") - 1);
check(
	"the pointer above the middle of a row puts the drop before it",
	[up?.parent, up?.before],
	["reach", "reach-list"],
);
check("and the slot opens exactly where that row stood", up?.slotTop, at("reach-list") * ROW);
const below = drop("follow-list", middleOf("reach-list") + 1);
check("the pointer below the middle puts it after", [below?.parent, below?.before], ["reach", null]);
const shownUp = up?.at ?? null;
const stays = drop("follow-list", middleOf("reach-list") + 1, shownUp);
check(
	"a row that slid away answers at its new place, so one pixel back does not flip it: no jitter",
	[stays?.parent, stays?.before],
	["reach", "reach-list"],
);
check(
	"it flips back only once the pointer crosses the middle of where that row now stands",
	drop("follow-list", middleOf("reach-list") + ROW + 1, shownUp)?.before ?? null,
	null,
);
const inside = drop("follow-list", middleOf("grid") - 1);
check(
	"onto the first child of a group it goes inside that group",
	[inside?.parent, inside?.before],
	["everyone", "grid"],
);
const group = drop("reach", middleOf("grid"));
check("a group carries its children with it", group?.block, ["reach", "reach-button", "reach-list"]);
check(
	"a row held by a prop is never the one to stand before",
	drop("grid", middleOf("follow-button") - 1)?.before !== "follow-button",
	true,
);
check(
	"nothing lands in a group another function draws",
	drop("grid", middleOf("page") - 1, null, -10 * INDENT)?.parent ?? null,
	null,
);

console.log(`\n${failed === 0 ? "layer drag: clean" : `layer drag: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
