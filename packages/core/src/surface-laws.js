import { colorOf } from "./color-math.js";
import {
	depthReason,
	measuredTileOf,
	presetColour,
	standsOutReason,
	tileReasons,
	WHITE,
} from "./surface-tile-reasons.js";
import {
	DEFAULT_STYLE,
	isKnownRole,
	EARNED_BY_LIST,
	mayWearInside,
	plateRefusal,
	platesWithin,
	repeatEarning,
	unearnedPlate,
} from "./surface-roles.js";
import {
	APART,
	allEdges,
	edgesOfChild,
	GROUP,
	isBox,
	isDividedByDefault,
	isPainted,
	leavesOf,
	nodeAt,
	NO_SURFACE,
	REGION_PAD_PX,
	regionSurfaceOf,
	replaceAt,
	ROW,
	SIDES,
	withoutSurface,
	SURFACE_PAD_PX,
	SURFACES,
	pathKey,
	TEXT_ROLE,
} from "./tree.js";

const FILLS_ITS_PARENT = 0.88;
const REGION_CHILD_DEPTH = 2;

export function widgetOfTiles(tiles) {
	const widgets = new Map(tiles.map((tile) => [tile.id, tile.widget]));
	return (id) => widgets.get(id);
}

export function surfaceVerdicts({ layout, tiles, measured, roleOf = () => null }) {
	const walk = {
		widgetOf: widgetOfTiles(tiles),
		roleOf,
		measured: measured ?? null,
		page: colorOf(measured?.page) ?? WHITE,
		verdicts: [],
	};
	layout.of.forEach((region, at) => walkRegion(walk, layout, at, walk.page));
	return { verdicts: walk.verdicts, nesting: nestingFindings(layout, walk.widgetOf) };
}

export function surfaceChoicesAt(layout, path, widgetOf = NO_WIDGETS) {
	const already = wrongNow(layout, widgetOf);
	const side = nodeAt(layout, path)?.side;
	return SURFACES.map((surface) => ({
		surface,
		refusal: introducedFinding(layout, path, { surface, side }, { already, widgetOf }),
	}));
}

// TRADE-OFF: the check lives inside the write, so no caller may decide and write separately — it costs a second walk of the tree the picker already walked
export function wearSurfaceAt(layout, path, surface, side, widgetOf = NO_WIDGETS) {
	const node = nodeAt(layout, path);
	if (!node) return { layout, refusal: { reason: NOTHING_THERE } };
	const already = wrongNow(layout, widgetOf);
	const refusal = introducedFinding(layout, path, { surface, side }, { already, widgetOf });
	if (refusal) return { layout, refusal };
	return { layout: replaceAt(layout, path, withSurface(node, surface, side)), refusal: null };
}

const NOTHING_THERE = "nothing stands there any more, so its surface was left alone";

// TRADE-OFF: a law's letter is the agent's vocabulary, not a person's, so the reason says itself and the letter stays on the finding for the CLI
export function saidRefusal(refusal) {
	return `${refusal.reason.charAt(0).toUpperCase()}${refusal.reason.slice(1)}.`;
}

export function nestingFindings(layout, widgetOf = NO_WIDGETS) {
	const findings = [];
	layout.of.forEach((region, at) => {
		if (!isBox(region)) return;
		const { surface } = regionSurfaceOf(layout, at);
		const isRegionPainted = isPainted({ surface });
		const above = { surface: isRegionPainted ? surface : NO_SURFACE, levels: isRegionPainted ? 1 : 0 };
		region.of.forEach((child, index) =>
			visitNesting(findings, { node: child, siblings: region.of, path: [at, index] }, { above, widgetOf }),
		);
	});
	return findings;
}

function visitNesting(findings, { node, siblings, path }, { above, widgetOf }) {
	const surface = node.surface ?? NO_SURFACE;
	const refusal = plateRefusal(above, surface) ?? unearnedPlate(node, siblings, widgetOf);
	if (refusal) findings.push({ path, ...refusal });
	if (!isBox(node)) return;
	const inside = { surface: isPainted(node) ? surface : above.surface, levels: platesWithin(above, surface) };
	node.of.forEach((child, at) =>
		visitNesting(findings, { node: child, siblings: node.of, path: [...path, at] }, { above: inside, widgetOf }),
	);
}

function walkRegion(walk, layout, at, page) {
	const { surface } = regionSurfaceOf(layout, at);
	walk.verdicts.push(regionVerdict(layout, at, surface));
	if (!isBox(layout.of[at])) return;
	const isRegionPainted = isPainted({ surface });
	walkBox(walk, layout.of[at], [at], {
		edges: allEdges(isRegionPainted ? SURFACE_PAD_PX : REGION_PAD_PX),
		under: isRegionPainted ? presetColour(walk.measured, { under: page, underSurface: NO_SURFACE }) : page,
		underSurface: isRegionPainted ? surface : NO_SURFACE,
		levels: isRegionPainted ? 1 : 0,
	});
}

function regionVerdict(layout, at, surface) {
	const region = layout.of[at];
	const now = region?.surface ?? `${surface} (the default)`;
	if (region?.keep)
		return {
			path: [at],
			kind: "region",
			now,
			advised: NO_SURFACE,
			law: "D1",
			reason: "the kept column is the content the panes are divided from",
		};
	if (isDividedByDefault(region))
		return {
			path: [at],
			kind: "region",
			now,
			advised: APART,
			law: "D1",
			reason: "a sidebar beside the kept column is a pane, and a pane is divided, not carded",
		};
	return {
		path: [at],
		kind: "region",
		now,
		advised: NO_SURFACE,
		law: "1",
		reason: "nothing asks this region for a surface",
	};
}

function walkBox(walk, box, path, where) {
	box.of.forEach((child, at) => {
		const here = [...path, at];
		const inside = { ...where, edges: edgesOfChild(box, where.edges, at), path: here };
		const verdict = verdictFor(walk, box, inside, { at, path: here });
		walk.verdicts.push(verdict);
		if (isBox(child)) walkBox(walk, child, verdict.path, whereUnder(inside, verdict));
	});
}

function verdictFor(walk, box, where, { at, path }) {
	const child = box.of[at];
	const role = roleOfNode(walk, child);
	return {
		path,
		kind: isBox(child) ? "box" : "leaf",
		role,
		...(child.purpose ? { purpose: child.purpose } : {}),
		now: child.surface ?? NO_SURFACE,
		...decideVerdict(walk, box, where, { at, role }),
	};
}

function whereUnder(where, verdict) {
	if (!isPainted({ surface: verdict.advised })) return where;
	return {
		...where,
		under: verdict.colour,
		underSurface: verdict.advised,
		levels: where.levels + 1,
		platedAt: verdict.path,
	};
}

const nothing = (law, reason) => ({ advised: NO_SURFACE, law, reason, candidates: [] });

function decideVerdict(walk, box, where, { at, role }) {
	const child = box.of[at];
	const missing = missingDeclaration(walk, child, role);
	if (missing) return nothing("R1", missing);
	if (role === TEXT_ROLE) return nothing("R2", headingReading(where.path, at));
	if (DEFAULT_STYLE[role].length === 0)
		return nothing("R2", `a ${role} wears no surface of its own; it stands in the group it serves`);
	if (role === "navigation") return navigationVerdict(box, at, where.edges);
	if (box.of.length === 1) return nothing("2", "it stands alone in its box, and the box already sets it apart");
	return judgePlacement(walk, box, child, role, where);
}

function judgePlacement(walk, box, child, role, where) {
	const earned = repeatEarning(child, box.of, walk.widgetOf);
	if (!earned) return nothing("R", "it stands alone, and only a repeat earns a plate: a heading and the step group it");
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
	if (filling) return nothing("P3", filling);
	const worn = earned === EARNED_BY_LIST ? [GROUP] : DEFAULT_STYLE[role];
	const offered = worn.filter((surface) => mayWearInside(where.underSurface, surface));
	if (offered.length === 0)
		return nothing(
			"N",
			`a ${role} wears ${worn.join(" or ")}, and none of them may stand inside a ${where.underSurface}`,
		);
	return chooseCardSurface(walk, child, where, offered);
}

function headingReading(path, at) {
	const wears = "text wears no surface of its own";
	if (at > 0) return `${wears}, and standing after something it titles nothing: a heading comes first in its box`;
	if (path.length === REGION_CHILD_DEPTH)
		return `${wears}, and first in a region it reads as the section title, so every plate begins after it`;
	return `${wears}, and first in a box inside a region it reads as that group's title, so it stands on the group's own plate`;
}

function fillsItsPlate(walk, where) {
	const share = shareOfItsPlate(walk.measured?.extents, where);
	if (share < FILLS_ITS_PARENT) return null;
	return `it fills ${Math.round(share * 100)}% of the plate around it, and a plate that fills its plate is an edge drawn twice`;
}

function shareOfItsPlate(extents, where) {
	if (!extents || !where.platedAt) return 0;
	const mine = extents[pathKey(where.path)];
	const around = extents[pathKey(where.platedAt)];
	if (!mine || !around || around.w <= 0 || around.h <= 0) return 0;
	return Math.min(mine.w / around.w, mine.h / around.h);
}

function peersOf(walk, box, role) {
	return box.of.filter((one) => roleOfNode(walk, one) === role).length;
}

function roleOfNode(walk, node) {
	if (isBox(node)) return isKnownRole(node.role) ? node.role : null;
	const role = walk.roleOf(walk.widgetOf(node.id));
	return isKnownRole(role) ? role : null;
}

function missingDeclaration(walk, node, role) {
	if (!isBox(node) && role) return null;
	if (!isBox(node)) return unknownRoleSaid(walk.roleOf(walk.widgetOf(node.id)));
	if (!role) return "a group that names no role cannot be judged: write its role and its purpose";
	return node.purpose ? null : "a group that names no purpose cannot be judged: write the question it answers";
}

function unknownRoleSaid(declared) {
	if (typeof declared !== "string")
		return "its widget declares no role in its manifest, so nothing can be said about it";
	return `its widget declares the role "${declared}", which is not one this plugin knows, so nothing can be said about it`;
}

function navigationVerdict(box, at, edges) {
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

function chooseCardSurface(walk, child, where, offered) {
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

function judgeSurface(walk, child, surface, where) {
	if (!walk.measured)
		return {
			surface,
			passes: true,
			reasons: ["+ the tree's own laws let it stand; the colours are judged once the board has been drawn"],
		};
	const colour = presetColour(walk.measured, where);
	const tiles = leavesOf(child).map((leaf) => ({
		id: leaf.id,
		measured: measuredTileOf(walk.measured.tiles?.[leaf.id]),
	}));
	const reasons = [
		depthReason(tiles, where.levels),
		standsOutReason(colour, where.under),
		...tiles.flatMap((tile) => tileReasons(tile, colour, walk.page)),
	];
	return { surface, colour, passes: reasons.every((one) => one.startsWith("+")), reasons };
}

const NO_WIDGETS = () => null;

function introducedFinding(layout, path, worn, { already, widgetOf }) {
	const node = nodeAt(layout, path);
	if (!node) return null;
	const would = replaceAt(layout, path, withSurface(node, worn.surface, worn.side));
	return nestingFindings(would, widgetOf).find((one) => !already.has(identityOf(one))) ?? null;
}

function wrongNow(layout, widgetOf) {
	return new Set(nestingFindings(layout, widgetOf).map(identityOf));
}

const identityOf = (finding) => `${finding.path.join("/")}:${finding.law}:${finding.reason}`;

function withSurface(node, surface, side) {
	const bare = withoutSurface(node);
	if (surface === NO_SURFACE) return bare;
	return { ...bare, surface, ...(surface === APART && SIDES.includes(side) ? { side } : {}) };
}
