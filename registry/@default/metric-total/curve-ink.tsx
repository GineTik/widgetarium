import { rounded } from "./numbers";
import type { ChartBox, Spot } from "./types";

export function CurveInk({ spots, box, ids }: { spots: Spot[]; box: ChartBox; ids: string }) {
	if (spots.length < 2) return null;
	const line = pathThrough(spots);
	return (
		<>
			<path d={areaUnder(line, box)} fill={`url(#${ids}-under)`} />
			<path className="mt3-line" d={line} vectorEffect="non-scaling-stroke" />
		</>
	);
}

function stepsOf(spots: readonly Spot[]): number[] {
	const steps: number[] = [];
	for (let at = 1; at < spots.length; at += 1) {
		const here = spots[at] as Spot;
		const before = spots[at - 1] as Spot;
		steps.push((here.y - before.y) / Math.max(here.x - before.x, 0.0001));
	}
	return steps;
}

function slopeAt(steps: readonly number[], at: number): number {
	const before = steps[at - 1];
	const after = steps[at];
	if (before === undefined) return after ?? 0;
	if (after === undefined) return before;
	if (before * after <= 0) return 0;
	return (2 * before * after) / (before + after);
}

function pathThrough(spots: readonly Spot[]): string {
	const first = spots[0];
	if (!first) return "";
	const steps = stepsOf(spots);
	let written = `M${rounded(first.x)} ${rounded(first.y)}`;
	for (let at = 1; at < spots.length; at += 1) {
		const here = spots[at] as Spot;
		const before = spots[at - 1] as Spot;
		const third = (here.x - before.x) / 3;
		const out = rounded(before.y + slopeAt(steps, at - 1) * third);
		const into = rounded(here.y - slopeAt(steps, at) * third);
		written += ` C${rounded(before.x + third)} ${out} ${rounded(here.x - third)} ${into} ${rounded(here.x)} ${rounded(here.y)}`;
	}
	return written;
}

function areaUnder(line: string, box: ChartBox): string {
	return `${line} L${box.width} ${box.height} L0 ${box.height} Z`;
}
