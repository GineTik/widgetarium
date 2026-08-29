// THE FLOOR, checked the only way a floor can be: not with the cases I thought of, but with a
// thousand I did not. Five functions had an opinion about x, and between them a tile reached
// column 47 of a 17-column board and the page flew off the screen. Every example test I wrote
// passed while that was true — because I only ever wrote the examples I had already imagined.
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { arrange } = await import("./.mjs-cache/layout.mjs");

// a deterministic generator: a failing seed is reproducible, which a random one is not
function seeded(seed) {
	let state = seed;
	return (limit) => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return state % limit;
	};
}

let failed = 0;
const report = (label, detail) => {
	failed += 1;
	console.log(`!!  ${label} — ${detail}`);
};

function escaped(places, columns) {
	return places.find((place) => place.x < 0 || place.y < 0 || place.w < 1 || place.x + place.w > columns);
}

function overlapping(places) {
	for (const a of places) {
		for (const b of places) {
			if (a === b) continue;
			if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return [a, b];
		}
	}
	return null;
}

const RUNS = 1000;
let checked = 0;

for (let run = 0; run < RUNS; run += 1) {
	const next = seeded(run + 1);
	const columns = 3 + next(28);
	const count = 1 + next(7);

	const places = [];
	for (let index = 0; index < count; index += 1) {
		places.push({
			id: `t${index}`,
			x: next(columns),
			y: next(6),
			w: 1 + next(columns),
			h: 1 + next(5),
		});
	}

	const movedId = `t${next(count)}`;
	const dragged = places.map((place) => (place.id === movedId ? { ...place, w: 1 + next(columns + 4) } : place));

	for (const [what, result] of [
		["settle", arrange(dragged, columns, { movedId })],
		["settle without a moved tile", arrange(dragged, columns)],
		["read", arrange(dragged, columns, { reading: true })],
		["derive", arrange(places, Math.max(3, 1 + next(30)), { scaleFrom: Math.max(3, columns) })],
	]) {
		checked += 1;
		if (what === "read") continue;
		const away = escaped(result, what === "derive" ? Math.max(...result.map((p) => p.x + p.w), columns) : columns);
		if (away && what !== "derive") {
			report(`run ${run}: ${what} put a tile off the board`, `${away.id} at x${away.x} w${away.w} of ${columns}`);
			break;
		}
		const clash = overlapping(result);
		if (clash) {
			report(`run ${run}: ${what} left two tiles on the same cell`, `${clash[0].id} and ${clash[1].id}`);
			break;
		}
		if (result.length !== dragged.length) {
			report(`run ${run}: ${what} lost a tile`, `${dragged.length} in, ${result.length} out`);
			break;
		}
	}

	if (failed > 3) break;
}

console.log(failed ? `\n${failed} failed` : `\nno tile escaped and none overlapped, across ${checked} settles`);
process.exit(failed ? 1 : 0);
