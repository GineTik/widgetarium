import { leavesOf } from "./tree-nodes.js";
import type { AskLeaf, BoardNode, PreferredSize } from "./tree-nodes.js";
import type { PreferredHeight, PreferredWidth } from "./gateway/manifest.js";

export interface WornSize {
	readonly preferredWidth?: PreferredWidth | undefined;
	readonly preferredHeight?: PreferredHeight | undefined;
	readonly keepsRatio?: boolean | undefined;
}

export interface Limits {
	readonly minPx: number;
}

interface Weighed {
	readonly ratio?: number;
}

export function floorOf(node: BoardNode, ask: AskLeaf): number {
	return widest(leavesOf(node).map((leaf) => ask(leaf.id).minPx ?? 0));
}

export function widthsOf(row: readonly Weighed[], inner: number): number[] {
	const total = row.reduce((sum, cell) => sum + (cell.ratio ?? 1), 0);
	return row.map((cell) => (inner * (cell.ratio ?? 1)) / total);
}

export function growsOf(row: readonly Weighed[]): number[] {
	return widthsOf(row, 1);
}

export function preferredSizeAt(
	preferred: PreferredSize | null | undefined,
	regionPx: number | null | undefined,
): WornSize {
	if (!preferred) return {};
	const stepsThatApply = (preferred.at ?? [])
		.filter((step) => typeof regionPx === "number" && regionPx < step.belowPx)
		.sort((one, other) => other.belowPx - one.belowPx);
	return stepsThatApply.reduce<WornSize>(
		(worn, step) => ({
			preferredWidth: step.preferredWidth ?? worn.preferredWidth,
			preferredHeight: step.preferredHeight ?? worn.preferredHeight,
			keepsRatio: worn.keepsRatio,
		}),
		{
			preferredWidth: preferred.preferredWidth,
			preferredHeight: preferred.preferredHeight,
			keepsRatio: preferred.keepsRatio === true,
		},
	);
}

export const limitsOf = (declared: { readonly minPx?: number }): Limits => ({ minPx: declared.minPx ?? 0 });

const widest = (all: readonly number[]): number => all.reduce((most, one) => Math.max(most, one), 0);
