export interface NoteBox {
	readonly at: readonly [number, number] | undefined;
	readonly height: number;
}

export type NoteSide = "left" | "right";

export interface PlacedNote {
	readonly side: NoteSide;
	readonly top: number;
}

const MIDDLE = 0.5;
const UNPOINTED: readonly [number, number] = [1, 1];

export function placedNotes(notes: readonly NoteBox[], pictureHeight: number, gap: number): PlacedNote[] {
	const sides = balancedSides(notes);
	const placed: PlacedNote[] = notes.map((_, at) => ({ side: sides[at] ?? "right", top: 0 }));
	for (const side of ["left", "right"] as const) {
		const onSide = notes.map((_, at) => at).filter((at) => sides[at] === side);
		const ordered = onSide.sort((a, b) => pointOf(notes[a])[1] - pointOf(notes[b])[1]);
		const tops = stackedTops(
			ordered.map((at) => notes[at] ?? { at: undefined, height: 0 }),
			pictureHeight,
			gap,
		);
		ordered.forEach((at, order) => {
			placed[at] = { side, top: tops[order] ?? 0 };
		});
	}
	return placed;
}

function balancedSides(notes: readonly NoteBox[]): NoteSide[] {
	const sides: NoteSide[] = notes.map((note) => (pointOf(note)[0] < MIDDLE ? "left" : "right"));
	for (;;) {
		const left = sides.filter((side) => side === "left").length;
		const heavier: NoteSide = left > sides.length - left ? "left" : "right";
		if (Math.abs(2 * left - sides.length) <= 1) return sides;
		const nearest = sides
			.map((side, at) => ({ side, at, off: Math.abs(pointOf(notes[at])[0] - MIDDLE) }))
			.filter((one) => one.side === heavier)
			.sort((a, b) => a.off - b.off)[0];
		if (!nearest) return sides;
		sides[nearest.at] = heavier === "left" ? "right" : "left";
	}
}

function stackedTops(notes: readonly NoteBox[], pictureHeight: number, gap: number): number[] {
	const wanted = notes.map((note) => pointOf(note)[1] * pictureHeight - note.height / 2);
	const tops = pushedDown(notes, wanted, gap);
	const last = notes.length - 1;
	const overflow = (tops[last] ?? 0) + (notes[last]?.height ?? 0) - pictureHeight;
	if (overflow <= 0) return tops;
	return pushedDown(notes, pushedUp(notes, tops, pictureHeight, gap), gap);
}

function pushedDown(notes: readonly NoteBox[], wanted: readonly number[], gap: number): number[] {
	const tops: number[] = [];
	for (let at = 0; at < notes.length; at += 1) {
		const above = at === 0 ? 0 : (tops[at - 1] ?? 0) + (notes[at - 1]?.height ?? 0) + gap;
		tops.push(Math.max(wanted[at] ?? 0, above, 0));
	}
	return tops;
}

function pushedUp(notes: readonly NoteBox[], tops: readonly number[], bottom: number, gap: number): number[] {
	const raised = [...tops];
	let limit = bottom;
	for (let at = notes.length - 1; at >= 0; at -= 1) {
		const height = notes[at]?.height ?? 0;
		raised[at] = Math.max(0, Math.min(raised[at] ?? 0, limit - height));
		limit = (raised[at] ?? 0) - gap;
	}
	return raised;
}

function pointOf(note: NoteBox | undefined): readonly [number, number] {
	return note?.at ?? UNPOINTED;
}
