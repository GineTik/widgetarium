import { leavesOf } from "./tree-nodes.js";

export function floorOf(node, ask) {
	return widest(declaredPx(node, ask, "minPx"));
}

export function widthsOf(row, inner) {
	const total = row.reduce((sum, cell) => sum + (cell.ratio ?? 1), 0);
	return row.map((cell) => (inner * (cell.ratio ?? 1)) / total);
}

export function growsOf(row) {
	return widthsOf(row, 1);
}

export function preferredSizeAt(preferred, regionPx) {
	if (!preferred) return {};
	const stepsThatApply = (preferred.at ?? [])
		.filter((step) => typeof regionPx === "number" && regionPx < step.belowPx)
		.sort((one, other) => other.belowPx - one.belowPx);
	return stepsThatApply.reduce(
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

export const limitsOf = (declared) => ({ minPx: declared.minPx ?? 0 });

const widest = (all) => all.reduce((most, one) => Math.max(most, one), 0);

const declaredPx = (node, ask, field) => leavesOf(node).map((leaf) => ask(leaf.id)[field] ?? 0);
