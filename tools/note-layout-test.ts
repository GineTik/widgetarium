import { placedNotes } from "../packages/widgetarium/src/studio/design/note-layout.ts";
import type { NoteBox, PlacedNote } from "../packages/widgetarium/src/studio/design/note-layout.ts";

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const PICTURE = 540;
const GAP = 16;

function crossingsOf(notes: readonly NoteBox[], placed: readonly PlacedNote[]): number {
	let crossings = 0;
	for (let a = 0; a < notes.length; a += 1)
		for (let b = a + 1; b < notes.length; b += 1) {
			const one = placed[a];
			const two = placed[b];
			if (!one || !two || one.side !== two.side) continue;
			const pointsGoDown = (notes[a]?.at?.[1] ?? 1) < (notes[b]?.at?.[1] ?? 1);
			if (pointsGoDown !== one.top < two.top) crossings += 1;
		}
	return crossings;
}

function overlapsOf(notes: readonly NoteBox[], placed: readonly PlacedNote[]): number {
	let overlaps = 0;
	for (let a = 0; a < notes.length; a += 1)
		for (let b = a + 1; b < notes.length; b += 1) {
			const one = placed[a];
			const two = placed[b];
			if (!one || !two || one.side !== two.side) continue;
			const [upper, lower] = one.top < two.top ? [a, b] : [b, a];
			const upperBottom = (placed[upper]?.top ?? 0) + (notes[upper]?.height ?? 0);
			if (upperBottom + GAP > (placed[lower]?.top ?? 0) + 0.5) overlaps += 1;
		}
	return overlaps;
}

const written: NoteBox[] = [
	{ at: [0.62, 0.7], height: 90 },
	{ at: [0.7, 0.1], height: 90 },
	{ at: [0.55, 0.4], height: 120 },
	{ at: [0.2, 0.9], height: 90 },
	{ at: [0.3, 0.2], height: 90 },
];
const placed = placedNotes(written, PICTURE, GAP);
check("notes written out of order still draw no crossing lines on a side", crossingsOf(written, placed), 0);
check("and never overlap each other", overlapsOf(written, placed), 0);
check("a note stands on the side of its point", [placed[3]?.side, placed[1]?.side], ["left", "right"]);
check(
	"a lone note stands level with its point",
	placedNotes([{ at: [0.8, 0.5], height: 100 }], PICTURE, GAP)[0]?.top,
	PICTURE * 0.5 - 50,
);

const crowded: NoteBox[] = Array.from({ length: 6 }, (_, at) => ({ at: [0.9, 0.95 - at * 0.01], height: 80 }));
const crowdedPlaced = placedNotes(crowded, PICTURE, GAP);
check(
	"six notes all pointing at the right edge are split between both sides",
	new Set(crowdedPlaced.map((one) => one.side)).size,
	2,
);
check("crowded notes near the bottom still never overlap", overlapsOf(crowded, crowdedPlaced), 0);
check("nor cross", crossingsOf(crowded, crowdedPlaced), 0);

console.log(`\n${failed === 0 ? "note layout: clean" : `note layout: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
