const OVERSHOOT = 1.15;

const LIGHT_FROM: readonly [number, number] = [-0.6, -0.8];

const LIT_SHARE = 0.2;

export interface ShapeLightSpot {
	readonly shineX: number;
	readonly shineY: number;
	readonly shineRadius: number;
	readonly bodyX: number;
	readonly bodyY: number;
	readonly bodyRadius: number;
}

export function lightSpotOf(points: readonly number[]): ShapeLightSpot {
	const count = Math.floor(points.length / 2);
	const xs = Array.from({ length: count }, (_, index) => points[index * 2] ?? 0);
	const ys = Array.from({ length: count }, (_, index) => points[index * 2 + 1] ?? 0);
	const centreX = xs.reduce((sum, x) => sum + x, 0) / Math.max(count, 1);
	const centreY = ys.reduce((sum, y) => sum + y, 0) / Math.max(count, 1);
	const reach = xs
		.map((x, index) => (x - centreX) * LIGHT_FROM[0] + ((ys[index] ?? 0) - centreY) * LIGHT_FROM[1])
		.sort((a, b) => b - a);
	const lit = reach.slice(0, Math.max(1, Math.round(count * LIT_SHARE)));
	const toward = Math.max(0, lit.reduce((sum, one) => sum + one, 0) / lit.length);
	const farthest = Math.max(...xs.map((x, index) => Math.hypot(x - centreX, (ys[index] ?? 0) - centreY)));
	return {
		shineX: centreX + LIGHT_FROM[0] * toward * 0.55,
		shineY: centreY + LIGHT_FROM[1] * toward * 0.55,
		shineRadius: toward * 0.62,
		bodyX: centreX + LIGHT_FROM[0] * toward * 0.4,
		bodyY: centreY + LIGHT_FROM[1] * toward * 0.4,
		bodyRadius: farthest * 1.55,
	};
}

export function pointsIn(drawn: string): number[] {
	return drawn.split(/[ ,]/).map(Number);
}

export function mixedPoints(from: readonly number[], to: readonly number[], share: number): number[] {
	return to.map((end, index) => {
		const start = from[index] ?? end;
		return start + (end - start) * share;
	});
}

export function springOf(progress: number): number {
	const rest = progress - 1;
	return 1 + (OVERSHOOT + 1) * rest ** 3 + OVERSHOOT * rest ** 2;
}

export function outlineOf(points: readonly number[]): string {
	const count = points.length / 2;
	const at = (index: number): readonly [number, number] => {
		const wrapped = ((index % count) + count) % count;
		return [points[wrapped * 2] ?? 0, points[wrapped * 2 + 1] ?? 0];
	};
	const [startX, startY] = at(0);
	const curves = Array.from({ length: count }, (_, index) =>
		curveTo(at(index - 1), at(index), at(index + 1), at(index + 2)),
	);
	return `M${round(startX)} ${round(startY)}${curves.join("")}Z`;
}

function curveTo(
	before: readonly [number, number],
	from: readonly [number, number],
	to: readonly [number, number],
	after: readonly [number, number],
): string {
	const first = [from[0] + (to[0] - before[0]) / 6, from[1] + (to[1] - before[1]) / 6];
	const second = [to[0] - (after[0] - from[0]) / 6, to[1] - (after[1] - from[1]) / 6];
	return `C${round(first[0] ?? 0)} ${round(first[1] ?? 0)} ${round(second[0] ?? 0)} ${round(second[1] ?? 0)} ${round(to[0])} ${round(to[1])}`;
}

function round(value: number): string {
	return value.toFixed(4);
}
