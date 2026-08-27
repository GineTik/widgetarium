
function overlaps(a, b) {
	return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function clampPlace(place, columns, minimum, maximum) {
	const widest = Math.min(maximum?.w ?? columns, columns);
	const w = Math.max(minimum?.w ?? 1, Math.min(place.w, widest));
	return {
		...place,
		w,
		h: Math.max(minimum?.h ?? 1, Math.min(place.h, maximum?.h ?? Infinity)),
		x: Math.max(0, Math.min(place.x, columns - w)),
		y: Math.max(0, place.y),
	};
}

// Gravity, in reading order. Every place falls to the highest free row, so a hole left by
// a moved or removed tile closes instead of staying as a band of empty cells nothing can
// use. The tile under the pointer settles FIRST, so it keeps the spot it was dropped on
// and the rest flows around it.
export function packPlaces(places, movedId) {
	const moved = places.find((place) => place.id === movedId);
	const rest = places
		.filter((place) => place.id !== movedId)
		.sort((first, second) => first.y - second.y || first.x - second.x);
	const settled = [];
	// The tile under the pointer is an OBSTACLE at the row it was dropped on, never pulled
	// up: gravity on the dragged tile too would snap it back to the top and make dragging
	// downwards impossible. The hole it leaves closes on the next read, which packs with
	// no moved tile and so gravities everything — reading order survives because the sort
	// is by row, and the tile now rests on whatever was above it.
	if (moved) settled.push(moved);

	for (const place of rest) {
		let y = 0;
		while (settled.some((other) => overlaps({ ...place, y }, other))) y += 1;
		settled.push(y === place.y ? place : { ...place, y });
	}
	return settled;
}

export function rowsOf(places) {
	return places.reduce((rows, place) => Math.max(rows, place.y + place.h), 0);
}

export function toPixels(place, cell, gap) {
	return {
		left: place.x * (cell + gap),
		top: place.y * (cell + gap),
		width: place.w * cell + (place.w - 1) * gap,
		height: place.h * cell + (place.h - 1) * gap,
	};
}

export function toCells(left, top, cell, gap) {
	const pitch = cell + gap;
	return { x: Math.max(0, Math.round(left / pitch)), y: Math.max(0, Math.round(top / pitch)) };
}

// derives one column count from another: scale across, keep the row, then pack
export function generatePlaces(places, fromColumns, toColumns) {
	const factor = toColumns / fromColumns;
	const columns = toColumns;
	const scaled = places.map((place) => ({
		id: place.id,
		x: Math.round(place.x * factor),
		y: place.y,
		w: Math.max(1, Math.min(columns, Math.round(place.w * factor))),
		h: place.h,
	}));
	return packPlaces(scaled.map((place) => clampPlace(place, columns)));
}
