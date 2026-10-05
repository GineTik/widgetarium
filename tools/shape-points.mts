export const SHAPE_POINT_COUNT = 96;

const STEPS_PER_CURVE = 24;

type Point = readonly [number, number];

export function shapeTableOf(drawn: Readonly<Record<string, string>>): string {
	const outlines = Object.entries(drawn).map(
		([name, outline]) => `\t${JSON.stringify(name)}: ${JSON.stringify(outline)},`,
	);
	const points = Object.entries(drawn).map(
		([name, outline]) => `\t${JSON.stringify(name)}: ${JSON.stringify(pointsOf(outline))},`,
	);
	return [
		`export const SHAPE_VIEW_BOX = "0 0 1 1";`,
		``,
		`export const SHAPE_POINT_COUNT = ${SHAPE_POINT_COUNT};`,
		``,
		`export const SHAPE_TABLE = {\n${outlines.join("\n")}\n} as const;`,
		``,
		`export const SHAPE_POINTS: Readonly<Record<keyof typeof SHAPE_TABLE, string>> = {\n${points.join("\n")}\n};`,
		``,
	].join("\n");
}

export function pointsOf(outline: string): string {
	const traced = tracedOf(outline);
	const even = evenlySpaced(traced, SHAPE_POINT_COUNT);
	const turned = signedAreaOf(even) < 0 ? [...even].reverse() : even;
	const start = topmostIndex(turned);
	const ordered = [...turned.slice(start), ...turned.slice(0, start)];
	return ordered.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join(" ");
}

function tracedOf(outline: string): Point[] {
	const numbers = (outline.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
	const traced: Point[] = [];
	let at: Point = [numbers[0] ?? 0, numbers[1] ?? 0];
	traced.push(at);
	for (let index = 2; index + 5 < numbers.length + 0; index += 6) {
		const [x1, y1, x2, y2, x, y] = numbers.slice(index, index + 6) as [number, number, number, number, number, number];
		for (let step = 1; step <= STEPS_PER_CURVE; step += 1)
			traced.push(bezierAt(at, [x1, y1], [x2, y2], [x, y], step / STEPS_PER_CURVE));
		at = [x, y];
	}
	return traced;
}

function bezierAt(from: Point, one: Point, two: Point, to: Point, t: number): Point {
	const rest = 1 - t;
	const weights = [rest ** 3, 3 * rest ** 2 * t, 3 * rest * t ** 2, t ** 3] as const;
	return [
		weights[0] * from[0] + weights[1] * one[0] + weights[2] * two[0] + weights[3] * to[0],
		weights[0] * from[1] + weights[1] * one[1] + weights[2] * two[1] + weights[3] * to[1],
	];
}

function evenlySpaced(traced: readonly Point[], count: number): Point[] {
	const lengths = [0];
	for (let index = 1; index < traced.length; index += 1)
		lengths.push((lengths[index - 1] ?? 0) + distance(traced[index - 1], traced[index]));
	const total = lengths[lengths.length - 1] ?? 0;
	const spaced: Point[] = [];
	let segment = 1;
	for (let index = 0; index < count; index += 1) {
		const wanted = (total * index) / count;
		while (segment < lengths.length - 1 && (lengths[segment] ?? 0) < wanted) segment += 1;
		const before = lengths[segment - 1] ?? 0;
		const span = (lengths[segment] ?? before) - before || 1;
		const share = (wanted - before) / span;
		const from = traced[segment - 1] ?? [0, 0];
		const to = traced[segment] ?? from;
		spaced.push([from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share]);
	}
	return spaced;
}

function distance(from: Point | undefined, to: Point | undefined): number {
	if (!from || !to) return 0;
	return Math.hypot(to[0] - from[0], to[1] - from[1]);
}

function signedAreaOf(points: readonly Point[]): number {
	let area = 0;
	for (let index = 0; index < points.length; index += 1) {
		const [x1, y1] = points[index] ?? [0, 0];
		const [x2, y2] = points[(index + 1) % points.length] ?? [0, 0];
		area += x1 * y2 - x2 * y1;
	}
	return area;
}

function topmostIndex(points: readonly Point[]): number {
	const centreX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
	const centreY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
	let best = 0;
	let bestAngle = Number.POSITIVE_INFINITY;
	points.forEach(([x, y], index) => {
		const fromTop = Math.abs(Math.atan2(x - centreX, centreY - y));
		if (y < centreY && fromTop < bestAngle) {
			bestAngle = fromTop;
			best = index;
		}
	});
	return best;
}
