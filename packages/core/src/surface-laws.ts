import type { Rgba } from "./color-math.js";
import { isObject } from "./engine/is-object.js";
import {
	colorIn,
	depthReason,
	measuredReadOf,
	measuredTileOf,
	presetColour,
	standsOutReason,
	tileReasons,
	WHITE,
} from "./surface-tile-reasons.js";
import type { MeasuredRead } from "./surface-tile-reasons.js";
import { DEFAULT_STYLE, isKnownRole, EARNED_BY_LIST, repeatEarning } from "./surface-roles.js";
import type { Role, WidgetOf } from "./surface-roles.js";
import { mayStandInside, nestingFindings } from "./surface-nesting.js";
import type { NestingFinding } from "./surface-nesting.js";
import {
	APART,
	allEdges,
	edgesOfChild,
	GROUP,
	isBox,
	isDividedByDefault,
	leavesOf,
	NO_SURFACE,
	REGION_PAD_PX,
	regionSurfaceOf,
	ROW,
	SURFACE_PAD_PX,
	pathKey,
	TEXT_ROLE,
} from "./tree.js";
import type { BoardNode, BoxNode, Edges, NodePath, SurfaceSide, SurfaceWord } from "./tree.js";

export {
	mayStandInside,
	nestingFindings,
	NO_WIDGETS,
	saidRefusal,
	surfaceChoicesAt,
	wearSurfaceAt,
} from "./surface-nesting.js";
export type { NestingFinding, PlatesAbove, SurfaceChoice, SurfaceRefusal, WornSurface } from "./surface-nesting.js";

export type RoleOf = (widget: string | null | undefined) => unknown;

export interface TileWidget {
	readonly id: string;
	readonly widget?: string | undefined;
}

interface VerdictAsk {
	readonly layout: BoxNode;
	readonly tiles: readonly TileWidget[];
	readonly measured: unknown;
	readonly roleOf?: RoleOf;
}

interface Candidate {
	readonly surface: SurfaceWord;
	readonly passes: boolean;
	readonly reasons: readonly string[];
	readonly colour?: Rgba;
}

interface Judgement {
	readonly advised: SurfaceWord;
	readonly law: string;
	readonly reason: string;
	readonly candidates: readonly Candidate[];
	readonly colour?: Rgba | undefined;
	readonly side?: SurfaceSide;
}

interface Verdict extends Omit<Judgement, "candidates"> {
	readonly path: NodePath;
	readonly kind: "region" | "box" | "leaf";
	readonly now: string;
	readonly role?: Role | null;
	readonly purpose?: string;
	readonly candidates?: readonly Candidate[];
}

interface SurfaceReport {
	readonly verdicts: readonly Verdict[];
	readonly nesting: readonly NestingFinding[];
}

const FILLS_ITS_PARENT = 0.88;
const REGION_CHILD_DEPTH = 2;

export function widgetOfTiles(tiles: readonly TileWidget[]): WidgetOf {
	const widgets = new Map(tiles.map((tile) => [tile.id, tile.widget] as const));
	return (id) => widgets.get(id);
}

export function surfaceVerdicts({ layout, tiles, measured, roleOf = () => null }: VerdictAsk): SurfaceReport {
	const read = measuredReadOf(measured);
	const walk: Walk = {
		widgetOf: widgetOfTiles(tiles),
		roleOf,
		measured: read,
		page: colorIn(read?.page) ?? WHITE,
		verdicts: [],
	};
	layout.of.forEach((region, at) => walkRegion(walk, layout, region, at));
	return { verdicts: walk.verdicts, nesting: nestingFindings(layout, walk.widgetOf) };
}

interface Walk {
	readonly widgetOf: WidgetOf;
	readonly roleOf: RoleOf;
	readonly measured: MeasuredRead | null;
	readonly page: Rgba;
	readonly verdicts: Verdict[];
}

interface Where {
	readonly edges: Edges;
	readonly under: Rgba;
	readonly underSurface: SurfaceWord;
	readonly levels: number;
	readonly platedAt?: NodePath;
}

interface WhereAt extends Where {
	readonly path: NodePath;
}

function walkRegion(walk: Walk, layout: BoxNode, region: BoardNode, at: number): void {
	const { surface } = regionSurfaceOf(layout, at);
	walk.verdicts.push(regionVerdict(region, at, surface));
	if (!isBox(region)) return;
	const isRegionPainted = surface === GROUP;
	walkBox(walk, region, [at], {
		edges: allEdges(isRegionPainted ? SURFACE_PAD_PX : REGION_PAD_PX),
		under: isRegionPainted ? presetColour(walk.measured, { under: walk.page, underSurface: NO_SURFACE }) : walk.page,
		underSurface: isRegionPainted ? surface : NO_SURFACE,
		levels: isRegionPainted ? 1 : 0,
	});
}

function regionVerdict(region: BoardNode, at: number, surface: SurfaceWord): Verdict {
	const said = { path: [at], kind: "region", now: region.surface ?? `${surface} (the default)` } as const;
	if (isBox(region) && region.keep)
		return {
			...said,
			advised: NO_SURFACE,
			law: "D1",
			reason: "the kept column is the content the panes are divided from",
		};
	if (isDividedByDefault(region))
		return {
			...said,
			advised: APART,
			law: "D1",
			reason: "a sidebar beside the kept column is a pane, and a pane is divided, not carded",
		};
	return { ...said, advised: NO_SURFACE, law: "1", reason: "nothing asks this region for a surface" };
}

function walkBox(walk: Walk, box: BoxNode, path: NodePath, where: Where): void {
	box.of.forEach((child, at) => {
		const here = [...path, at];
		const inside: WhereAt = { ...where, edges: edgesOfChild(box, where.edges, at), path: here };
		const verdict = verdictFor(walk, box, inside, { child, at });
		walk.verdicts.push(verdict);
		if (isBox(child)) walkBox(walk, child, verdict.path, whereUnder(inside, verdict));
	});
}

interface ChildAt {
	readonly child: BoardNode;
	readonly at: number;
}

function verdictFor(walk: Walk, box: BoxNode, where: WhereAt, { child, at }: ChildAt): Verdict {
	const role = roleOfNode(walk, child);
	return {
		path: where.path,
		kind: isBox(child) ? "box" : "leaf",
		role,
		...(isBox(child) && child.purpose ? { purpose: child.purpose } : {}),
		now: child.surface ?? NO_SURFACE,
		...decideVerdict(walk, box, where, { child, at, role }),
	};
}

function whereUnder(where: WhereAt, verdict: Verdict): Where {
	if (verdict.advised !== GROUP) return where;
	return {
		...where,
		under: verdict.colour ?? where.under,
		underSurface: verdict.advised,
		levels: where.levels + 1,
		platedAt: verdict.path,
	};
}

const nothing = (law: string, reason: string): Judgement => ({ advised: NO_SURFACE, law, reason, candidates: [] });

interface Deciding extends ChildAt {
	readonly role: Role | null;
}

function decideVerdict(walk: Walk, box: BoxNode, where: WhereAt, { child, at, role }: Deciding): Judgement {
	if (role === null) return nothing("R1", missingRoleSaid(walk, child));
	if (isBox(child) && !child.purpose)
		return nothing("R1", "a group that names no purpose cannot be judged: write the question it answers");
	if (role === TEXT_ROLE) return nothing("R2", headingReading(where.path, at));
	if (DEFAULT_STYLE[role].length === 0)
		return nothing("R2", `a ${role} wears no surface of its own; it stands in the group it serves`);
	if (role === "navigation") return navigationVerdict(box, at, where.edges);
	if (box.of.length === 1) return nothing("2", "it stands alone in its box, and the box already sets it apart");
	return judgePlacement(walk, box, where, { child, role });
}

interface Placing {
	readonly child: BoardNode;
	readonly role: Role;
}

function judgePlacement(walk: Walk, box: BoxNode, where: WhereAt, { child, role }: Placing): Judgement {
	const earned = repeatEarning(child, box.of, walk.widgetOf);
	if (!earned) return nothing("R", "it stands alone, and only a repeat earns a plate: a heading and the step group it");
	const refused = placementRefusal(walk, box, where, { child, role });
	if (refused) return refused;
	const worn: readonly SurfaceWord[] = earned === EARNED_BY_LIST ? [GROUP] : DEFAULT_STYLE[role];
	const offered = worn.filter((surface) => mayStandInside(where.underSurface, surface));
	if (offered.length === 0)
		return nothing(
			"N",
			`a ${role} wears ${worn.join(" or ")}, and none of them may stand inside a ${where.underSurface}`,
		);
	return chooseCardSurface(walk, child, where, offered);
}

function placementRefusal(walk: Walk, box: BoxNode, where: WhereAt, { child, role }: Placing): Judgement | null {
	if (role === "collection" && where.underSurface !== NO_SURFACE)
		return nothing("R3", "a collection inside a group that already has an edge needs none of its own");
	if (!isBox(child) && role !== "composer" && where.underSurface !== NO_SURFACE)
		return nothing("R4", "a single widget inside a plate is content of that plate and wears none of its own");
	const inside = where.underSurface !== NO_SURFACE && role !== "composer";
	if (inside && peersOf(walk, box, role) < 2)
		return nothing(
			"P1",
			`the only ${role} in this group wears no plate of its own: a heading and the step already say it`,
		);
	const filling = fillsItsPlate(walk, where);
	return filling ? nothing("P3", filling) : null;
}

function headingReading(path: NodePath, at: number): string {
	const wears = "text wears no surface of its own";
	if (at > 0) return `${wears}, and standing after something it titles nothing: a heading comes first in its box`;
	if (path.length === REGION_CHILD_DEPTH)
		return `${wears}, and first in a region it reads as the section title, so every plate begins after it`;
	return `${wears}, and first in a box inside a region it reads as that group's title, so it stands on the group's own plate`;
}

function fillsItsPlate(walk: Walk, where: WhereAt): string | null {
	const share = shareOfItsPlate(walk.measured?.extents, where);
	if (share < FILLS_ITS_PARENT) return null;
	return `it fills ${Math.round(share * 100)}% of the plate around it, and a plate that fills its plate is an edge drawn twice`;
}

function shareOfItsPlate(extents: MeasuredRead["extents"], where: WhereAt): number {
	if (!extents || !where.platedAt) return 0;
	const mine = extentIn(extents[pathKey(where.path)]);
	const around = extentIn(extents[pathKey(where.platedAt)]);
	if (!mine || !around || around.w <= 0 || around.h <= 0) return 0;
	return Math.min(mine.w / around.w, mine.h / around.h);
}

function extentIn(raw: unknown): { readonly w: number; readonly h: number } | null {
	if (!isObject(raw)) return null;
	const { w, h } = raw;
	return typeof w === "number" && typeof h === "number" ? { w, h } : null;
}

function peersOf(walk: Walk, box: BoxNode, role: Role): number {
	return box.of.filter((one) => roleOfNode(walk, one) === role).length;
}

function roleOfNode(walk: Walk, node: BoardNode): Role | null {
	if (isBox(node)) return isKnownRole(node.role) ? node.role : null;
	const role = walk.roleOf(walk.widgetOf(node.id));
	return isKnownRole(role) ? role : null;
}

function missingRoleSaid(walk: Walk, node: BoardNode): string {
	if (isBox(node)) return "a group that names no role cannot be judged: write its role and its purpose";
	return unknownRoleSaid(walk.roleOf(walk.widgetOf(node.id)));
}

function unknownRoleSaid(declared: unknown): string {
	if (typeof declared !== "string")
		return "its widget declares no role in its manifest, so nothing can be said about it";
	return `its widget declares the role "${declared}", which is not one this plugin knows, so nothing can be said about it`;
}

function navigationVerdict(box: BoxNode, at: number, edges: Edges): Judgement {
	const isAtEdge = at === 0 || at === box.of.length - 1;
	if (box.dir !== ROW || box.of.length === 1 || !isAtEdge || edges.top === null || edges.bottom === null)
		return nothing(
			"D2",
			"navigation that is not a pane at the edge of a row, reaching both ends of its surface, is spaced rather than divided",
		);
	return {
		advised: APART,
		side: at === 0 ? "end" : "start",
		law: "D2",
		reason: "navigation is a pane, and a pane is divided from what it steers",
		candidates: [],
	};
}

function chooseCardSurface(walk: Walk, child: BoardNode, where: WhereAt, offered: readonly SurfaceWord[]): Judgement {
	const candidates = offered.map((surface) => judgeSurface(walk, child, surface, where));
	const chosen = candidates.find((one) => one.passes);
	if (!chosen) return { ...nothing("10", "no surface passed every law, so it stands without one"), candidates };
	return {
		advised: chosen.surface,
		colour: chosen.colour,
		law: "9",
		reason: "the first surface its role offers that passed every law",
		candidates,
	};
}

function judgeSurface(walk: Walk, child: BoardNode, surface: SurfaceWord, where: WhereAt): Candidate {
	if (!walk.measured)
		return {
			surface,
			passes: true,
			reasons: ["+ the tree's own laws let it stand; the colours are judged once the board has been drawn"],
		};
	const colour = presetColour(walk.measured, where);
	const tiles = leavesOf(child).map((leaf) => ({
		id: leaf.id,
		measured: measuredTileOf(walk.measured?.tiles?.[leaf.id]),
	}));
	const reasons = [
		depthReason(tiles, where.levels),
		standsOutReason(colour, where.under),
		...tiles.flatMap((tile) => tileReasons(tile, colour, walk.page)),
	];
	return { surface, colour, passes: reasons.every((one) => one.startsWith("+")), reasons };
}
