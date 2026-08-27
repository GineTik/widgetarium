import { CLASSES } from "./paths.js";

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

// reading order is kept; anything that collides is pushed down, like gridstack's "list"
export function packPlaces(places, movedId) {
	const ordered = [...places].sort((first, second) => first.y - second.y || first.x - second.x);
	const settled = [];
	const moved = places.find((place) => place.id === movedId);
	if (moved) settled.push(moved);

	for (const place of ordered) {
		if (place.id === movedId) continue;
		let y = place.y;
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

export function columnsOf(className) {
	return CLASSES.find((entry) => entry.name === className)?.columns ?? 12;
}

// a first draft for an empty class, so nobody has to lay out three boards by hand
export function generatePlaces(places, fromClass, toClass) {
	const factor = columnsOf(toClass) / columnsOf(fromClass);
	const columns = columnsOf(toClass);
	const scaled = places.map((place) => ({
		id: place.id,
		x: Math.round(place.x * factor),
		y: place.y,
		w: Math.max(1, Math.min(columns, Math.round(place.w * factor))),
		h: place.h,
	}));
	return packPlaces(scaled.map((place) => clampPlace(place, columns)));
}
