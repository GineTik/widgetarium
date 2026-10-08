import { clamp } from "./clamp";

export type PanelSize = number | `${number}%`;

export interface PanelLimits {
	readonly defaultSize: number | undefined;
	readonly min: number;
	readonly max: number;
}

export type PanelSizes = Readonly<Record<string, number>>;

export interface PairStep {
	readonly before: string;
	readonly after: string;
	readonly delta: number;
}

export const WHOLE = 100;

export function panelPercentOf(size: PanelSize | undefined): number | undefined {
	if (size === undefined) return undefined;
	const value = typeof size === "number" ? size : Number.parseFloat(size);
	return Number.isFinite(value) ? value : undefined;
}

export function layPanelSizes(order: readonly string[], limits: ReadonlyMap<string, PanelLimits>): PanelSizes {
	const asked = order.map((id) => limits.get(id)?.defaultSize);
	const taken = asked.reduce<number>((sum, size) => sum + (size ?? 0), 0);
	const unsized = asked.filter((size) => size === undefined).length;
	const share = unsized > 0 ? Math.max(0, WHOLE - taken) / unsized : 0;
	return Object.fromEntries(order.map((id, at) => [id, asked[at] ?? share]));
}

export function stepPanelSizes(
	sizes: PanelSizes,
	step: PairStep,
	limits: ReadonlyMap<string, PanelLimits>,
): PanelSizes {
	const before = sizes[step.before];
	const after = sizes[step.after];
	if (before === undefined || after === undefined) return sizes;
	const pair = before + after;
	const beforeLimits = limitsOf(limits, step.before);
	const afterLimits = limitsOf(limits, step.after);
	const lowest = Math.max(beforeLimits.min, pair - afterLimits.max);
	const highest = Math.min(beforeLimits.max, pair - afterLimits.min);
	const next = clamp(before + step.delta, lowest, highest);
	if (next === before) return sizes;
	return { ...sizes, [step.before]: next, [step.after]: pair - next };
}

export function limitsOf(limits: ReadonlyMap<string, PanelLimits>, id: string): PanelLimits {
	return limits.get(id) ?? { defaultSize: undefined, min: 0, max: WHOLE };
}
