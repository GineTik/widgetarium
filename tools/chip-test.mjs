// A tile too narrow to be itself draws a chip, and the chip grows from where it sits into a
// panel over its neighbours — Priority+ for what happens, container transform for how.
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { isTooNarrow, openedBox, wantedBox } = await import("./.mjs-cache/chip.mjs");

let failed = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};

const KANBAN = { collapseBelowPx: 260, defaultSize: { w: 13, h: 8 }, title: "Kanban" };

check("a roomy tile is itself", isTooNarrow(600, KANBAN), false);
check("a squeezed one is a chip", isTooNarrow(180, KANBAN), true);
check("exactly at the threshold it is still itself", isTooNarrow(260, KANBAN), false);
check("a widget that never collapses says so by saying nothing", isTooNarrow(10, { defaultSize: { w: 2, h: 2 } }), false);
check("an unmeasured tile is not a chip", isTooNarrow(0, KANBAN), false);

const board = { width: 1000, height: 800 };

// opening from the left wall grows to the RIGHT, because there is nowhere else to go
const atWall = openedBox({ left: 0, top: 0, width: 60, height: 60 }, wantedBox(KANBAN, board), board);
check("a chip against the wall stays on the board", [atWall.left >= 8, atWall.top >= 8], [true, true]);
check("and opens away from it", atWall.left + atWall.width <= board.width - 8, true);

// one in the middle opens both ways, centred on itself
const middle = { left: 480, top: 380, width: 60, height: 60 };
const opened = openedBox(middle, wantedBox(KANBAN, board), board);
const chipCentre = middle.left + middle.width / 2;
check("a chip in the middle opens around itself", Math.abs(opened.left + opened.width / 2 - chipCentre) < 1, true);

// REGRESSION: the panel must never be bigger than the board, or it opens off the edge
const tiny = { width: 300, height: 200 };
const cramped = openedBox({ left: 10, top: 10, width: 40, height: 40 }, wantedBox(KANBAN, tiny), tiny);
check("on a small board the panel fits the board", [cramped.width <= tiny.width, cramped.height <= tiny.height], [true, true]);
check("and still sits inside it", [cramped.left >= 0, cramped.top >= 0], [true, true]);
check("with its right edge on the board", cramped.left + cramped.width <= tiny.width, true);

// the opened panel is wide enough to stop being a chip — otherwise opening changes nothing
const wanted = wantedBox(KANBAN, board);
check("an opened panel clears its own chip threshold", wanted.width > KANBAN.collapseBelowPx, true);

console.log(failed ? `\n${failed} failed` : "\na narrow tile becomes a chip, and the chip opens where it stands");
process.exit(failed ? 1 : 0);
