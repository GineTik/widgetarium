import { mayWearInside, plateRefusal, platesWithin, unearnedPlate } from "./surface-roles.js";
import type { LawRefusal, WidgetOf } from "./surface-roles.js";
import {
	APART,
	GROUP,
	isBox,
	nodeAt,
	NO_SURFACE,
	regionSurfaceOf,
	replaceAt,
	SURFACES,
	withoutSurface,
} from "./tree.js";
import type { BoardNode, BoxNode, NodePath, SurfaceWord } from "./tree.js";
import { isSurfaceSide, isSurfaceWord } from "./node-words.js";

export interface NestingFinding extends LawRefusal {
	readonly path: NodePath;
}

export interface SurfaceRefusal {
	readonly reason: string;
	readonly law?: string;
	readonly path?: NodePath;
}

export interface SurfaceChoice {
	readonly surface: string;
	readonly refusal: NestingFinding | null;
}

export interface WornSurface {
	readonly layout: BoxNode;
	readonly refusal: SurfaceRefusal | null;
}

export interface PlatesAbove {
	readonly surface: SurfaceWord;
	readonly levels: number;
}

export const NO_WIDGETS: WidgetOf = () => null;

const NOTHING_THERE = "nothing stands there any more, so its surface was left alone";

export function surfaceChoicesAt(layout: BoxNode, path: NodePath, widgetOf: WidgetOf = NO_WIDGETS): SurfaceChoice[] {
	const already = wrongNow(layout, widgetOf);
	const side = nodeAt(layout, path)?.side;
	return SURFACES.map((surface) => ({
		surface,
		refusal: introducedFinding(layout, path, { surface, side }, { already, widgetOf }),
	}));
}

// TRADE-OFF: the check lives inside the write, so no caller may decide and write separately — it costs a second walk of the tree the picker already walked
export function wearSurfaceAt(
	layout: BoxNode,
	path: NodePath,
	surface: string,
	side: unknown,
	widgetOf: WidgetOf = NO_WIDGETS,
): WornSurface {
	const node = nodeAt(layout, path);
	if (!node) return { layout, refusal: { reason: NOTHING_THERE } };
	const already = wrongNow(layout, widgetOf);
	const refusal = introducedFinding(layout, path, { surface, side }, { already, widgetOf });
	if (refusal || !isSurfaceWord(surface)) return { layout, refusal };
	return { layout: boxAfter(layout, path, withSurface(node, surface, side)), refusal: null };
}

// TRADE-OFF: a law's letter is the agent's vocabulary, not a person's, so the reason says itself and the letter stays on the finding for the CLI
export function saidRefusal(refusal: { readonly reason: string }): string {
	return `${refusal.reason.charAt(0).toUpperCase()}${refusal.reason.slice(1)}.`;
}

export function nestingFindings(layout: BoxNode, widgetOf: WidgetOf = NO_WIDGETS): NestingFinding[] {
	const findings: NestingFinding[] = [];
	layout.of.forEach((region, at) => {
		if (!isBox(region)) return;
		const { surface } = regionSurfaceOf(layout, at);
		const isRegionPainted = surface === GROUP;
		const above: PlatesAbove = { surface: isRegionPainted ? surface : NO_SURFACE, levels: isRegionPainted ? 1 : 0 };
		region.of.forEach((child, index) =>
			visitNesting(findings, { node: child, siblings: region.of, path: [at, index] }, { above, widgetOf }),
		);
	});
	return findings;
}

export function mayStandInside(parentSurface: SurfaceWord, surface: SurfaceWord): boolean {
	return mayWearInside(parentSurface, surface);
}

interface NestingVisit {
	readonly node: BoardNode;
	readonly siblings: readonly BoardNode[];
	readonly path: NodePath;
}

interface NestingContext {
	readonly above: PlatesAbove;
	readonly widgetOf: WidgetOf;
}

interface Worn {
	readonly surface: string;
	readonly side: unknown;
}

interface Already {
	readonly already: ReadonlySet<string>;
	readonly widgetOf: WidgetOf;
}

function visitNesting(
	findings: NestingFinding[],
	{ node, siblings, path }: NestingVisit,
	{ above, widgetOf }: NestingContext,
): void {
	const surface = node.surface ?? NO_SURFACE;
	const refusal = plateRefusalOf(above, surface) ?? unearnedPlate(node, siblings, widgetOf);
	if (refusal) findings.push({ path, ...refusal });
	if (!isBox(node)) return;
	const inside: PlatesAbove = {
		surface: surface === GROUP ? surface : above.surface,
		levels: platesWithinOf(above, surface),
	};
	node.of.forEach((child, at) =>
		visitNesting(findings, { node: child, siblings: node.of, path: [...path, at] }, { above: inside, widgetOf }),
	);
}

function plateRefusalOf(above: PlatesAbove | null, surface: string): LawRefusal | null {
	return plateRefusal(above, surface);
}

function platesWithinOf(above: PlatesAbove, surface: SurfaceWord): number {
	return platesWithin(above, surface);
}

function introducedFinding(
	layout: BoxNode,
	path: NodePath,
	worn: Worn,
	{ already, widgetOf }: Already,
): NestingFinding | null {
	const node = nodeAt(layout, path);
	if (!node) return null;
	if (!isSurfaceWord(worn.surface)) return refusedWord(path, worn.surface);
	const would = boxAfter(layout, path, withSurface(node, worn.surface, worn.side));
	return nestingFindings(would, widgetOf).find((one) => !already.has(identityOf(one))) ?? null;
}

function refusedWord(path: NodePath, surface: string): NestingFinding | null {
	const refusal = plateRefusalOf(null, surface);
	return refusal ? { path, ...refusal } : null;
}

function wrongNow(layout: BoxNode, widgetOf: WidgetOf): Set<string> {
	return new Set(nestingFindings(layout, widgetOf).map(identityOf));
}

const identityOf = (finding: NestingFinding): string => `${finding.path.join("/")}:${finding.law}:${finding.reason}`;

function boxAfter(layout: BoxNode, path: NodePath, node: BoardNode): BoxNode {
	const replaced = replaceAt(layout, path, node);
	return isBox(replaced) ? replaced : layout;
}

function withSurface(node: BoardNode, surface: SurfaceWord, side: unknown): BoardNode {
	const bare = withoutSurface(node);
	if (surface === NO_SURFACE) return bare;
	return { ...bare, surface, ...(surface === APART && isSurfaceSide(side) ? { side } : {}) };
}
