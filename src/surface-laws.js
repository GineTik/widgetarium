import { colorOf, contrastOf, lightnessOf, over } from "./color-math.js";
import {
	DEFAULT_STYLE,
	isKnownRole,
	MAX_SURFACE_DEPTH,
	mayWearInside,
	plateRefusal,
	platesWithin,
} from "./surface-roles.js";
import {
	APART,
	allEdges,
	edgesOfChild,
	isBox,
	isDividedByDefault,
	isPainted,
	leavesOf,
	nodeAt,
	NO_SURFACE,
	OBJECT,
	REGION_PAD_PX,
	regionSurfaceOf,
	replacedAt,
	ROW,
	SIDES,
	withoutSurface,
	SURFACE_PAD_PX,
	SURFACES,
	pathKey,
	TEXT_ROLE,
} from "./tree.js";

const LIGHTNESS_STEP = 2;
const TEXT_CONTRAST = 4.5;
const FAINT_TEXT_KEEPS = 0.85;
const FILLS_ITS_PARENT = 0.88;
const REGION_CHILD_DEPTH = 2;

export function surfaceVerdicts({ layout, tiles, measured, roleOf = () => null }) {
	const walk = {
		widgetOf: new Map(tiles.map((tile) => [tile.id, tile.widget])),
		roleOf,
		measured: measured ?? null,
		page: colorOf(measured?.page) ?? WHITE,
		verdicts: [],
	};
	layout.of.forEach((region, at) => walkRegion(walk, layout, at, walk.page));
	return { verdicts: walk.verdicts, nesting: nestingFindings(layout) };
}

export function surfaceChoicesAt(layout, path) {
	const already = wrongNow(layout);
	const side = nodeAt(layout, path)?.side;
	return SURFACES.map((surface) => ({ surface, refusal: introducedFinding(layout, path, { surface, side }, already) }));
}

// TRADE-OFF: the check lives inside the write, so no caller may decide and write separately — it costs a second walk of the tree the picker already walked
export function wornSurfaceAt(layout, path, surface, side) {
	const node = nodeAt(layout, path);
	if (!node) return { layout, refusal: { reason: NOTHING_THERE } };
	const refusal = introducedFinding(layout, path, { surface, side }, wrongNow(layout));
	if (refusal) return { layout, refusal };
	return { layout: replacedAt(layout, path, surfaced(node, surface, side)), refusal: null };
}

function introducedFinding(layout, path, worn, already) {
	const node = nodeAt(layout, path);
	if (!node) return null;
	const would = replacedAt(layout, path, surfaced(node, worn.surface, worn.side));
	return nestingFindings(would).find((one) => !already.has(identityOf(one))) ?? null;
}

function wrongNow(layout) {
	return new Set(nestingFindings(layout).map(identityOf));
}

const identityOf = (finding) => `${finding.path.join("/")}:${finding.law}:${finding.reason}`;

const NOTHING_THERE = "nothing stands there any more, so its surface was left alone";

// TRADE-OFF: a law's letter is the agent's vocabulary, not a person's, so the reason says itself and the letter stays on the finding for the CLI
export function saidRefusal(refusal) {
	return `${refusal.reason.charAt(0).toUpperCase()}${refusal.reason.slice(1)}.`;
}

function surfaced(node, surface, side) {
	const bare = withoutSurface(node);
	if (surface === NO_SURFACE) return bare;
	return { ...bare, surface, ...(surface === APART && SIDES.includes(side) ? { side } : {}) };
}

export function nestingFindings(layout) {
	const findings = [];
	layout.of.forEach((region, at) => {
		if (!isBox(region)) return;
		const { surface } = regionSurfaceOf(layout, at);
		const isRegionPainted = isPainted({ surface });
		const above = { surface: isRegionPainted ? surface : NO_SURFACE, levels: isRegionPainted ? 1 : 0 };
		region.of.forEach((child, index) => visitNesting(findings, child, [at, index], above));
	});
	return findings;
}

function visitNesting(findings, node, path, above) {
	const surface = node.surface ?? NO_SURFACE;
	const levels = platesWithin(above, surface);
	findings.push(
		...[plateRefusal(above, surface), crowded(node, surface)].filter(Boolean).map((one) => ({ path, ...one })),
	);
	if (!isBox(node)) return;
	const inside = { surface: isPainted(node) ? surface : above.surface, levels };
	node.of.forEach((child, at) => visitNesting(findings, child, [...path, at], inside));
}

function crowded(node, surface) {
	if (!isBox(node) || !isPainted(node) || node.of.length < 2 || !node.of.every(isPainted)) return null;
	return {
		law: "N2",
		reason: `every child of this ${surface} wears a plate of its own: keep the plate around them or the plates on them, never both`,
	};
}

function walkRegion(walk, layout, at, page) {
	const { surface } = regionSurfaceOf(layout, at);
	walk.verdicts.push(regionVerdict(layout, at, surface));
	if (!isBox(layout.of[at])) return;
	const isRegionPainted = isPainted({ surface });
	walkBox(walk, layout.of[at], [at], {
		edges: allEdges(isRegionPainted ? SURFACE_PAD_PX : REGION_PAD_PX),
		under: isRegionPainted ? presetColour(walk.measured, surface, page) : page,
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
		...decided(walk, box, where, { at, role }),
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

function decided(walk, box, where, { at, role }) {
	const child = box.of[at];
	const missing = missingDeclaration(walk, child, role);
	if (missing) return nothing("R1", missing);
	if (role === TEXT_ROLE) return nothing("R2", headingReading(where.path, at));
	if (DEFAULT_STYLE[role].length === 0)
		return nothing("R2", `a ${role} wears no surface of its own; it stands in the group it serves`);
	if (role === "navigation") return navigationVerdict(box, at, where.edges);
	if (box.of.length === 1) return nothing("2", "it stands alone in its box, and the box already sets it apart");
	return placed(walk, box, child, role, where);
}

function placed(walk, box, child, role, where) {
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
	if (inside && box.of.every((one) => wouldBePlated(walk, one)))
		return nothing(
			"P2",
			"every child here would wear a plate, and plates say nothing when nothing beside them is bare",
		);
	const filling = fillsItsPlate(walk, where);
	if (filling) return nothing("P3", filling);
	const worn = DEFAULT_STYLE[role];
	const offered = worn.filter((surface) => mayWearInside(where.underSurface, surface));
	if (offered.length === 0)
		return nothing(
			"N",
			`a ${role} wears ${worn.join(" or ")}, and none of them may stand inside a ${where.underSurface}`,
		);
	return carded(walk, child, where, offered);
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

function wouldBePlated(walk, node) {
	const role = roleOfNode(walk, node);
	return role !== null && DEFAULT_STYLE[role].length > 0;
}

function roleOfNode(walk, node) {
	if (isBox(node)) return isKnownRole(node.role) ? node.role : null;
	const role = walk.roleOf(walk.widgetOf.get(node.id));
	return isKnownRole(role) ? role : null;
}

function missingDeclaration(walk, node, role) {
	if (!isBox(node) && role) return null;
	if (!isBox(node)) return unknownRoleSaid(walk.roleOf(walk.widgetOf.get(node.id)));
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

function carded(walk, child, where, offered) {
	const candidates = offered.map((surface) => judged(walk, child, surface, where));
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

function judged(walk, child, surface, where) {
	if (!walk.measured)
		return {
			surface,
			passes: true,
			reasons: ["+ the tree's own laws let it stand; the colours are judged once the board has been drawn"],
		};
	const colour = presetColour(walk.measured, surface, where.under);
	const tiles = leavesOf(child).map((leaf) => ({
		id: leaf.id,
		measured: measuredTileOf(walk.measured.tiles?.[leaf.id]),
	}));
	const reasons = [
		depthReason(tiles, where.levels),
		standsOutReason(walk.measured, surface, colour, where.under),
		...tiles.flatMap((tile) => tileReasons(tile, colour, walk.page)),
	];
	return { surface, colour, passes: reasons.every((one) => one.startsWith("+")), reasons };
}

function depthReason(tiles, levels) {
	const unmeasured = tiles.filter((tile) => !tile.measured).map((tile) => tile.id);
	if (unmeasured.length > 0) return `- ${unmeasured.join(", ")} not measured yet, so its depth is unknown (law 10)`;
	const deepest = Math.max(0, ...tiles.map((tile) => tile.measured.depth));
	const total = levels + 1 + deepest;
	if (total > MAX_SURFACE_DEPTH)
		return `- ${total} containers deep: ${levels} surface(s) above, this one, ${deepest} inside the widgets (law 5 allows ${MAX_SURFACE_DEPTH})`;
	return `+ ${total} of ${MAX_SURFACE_DEPTH} containers deep (law 5)`;
}

function standsOutReason(measured, surface, colour, under) {
	if (surface === OBJECT) {
		const edge = colorOf(measured.presets?.edge);
		const step = edge ? stepBetween(over(edge, colour), colour) : 0;
		return step >= LIGHTNESS_STEP
			? `+ its edge is ${round(step)} from its own fill (law 6)`
			: `- its edge is only ${round(step)} from its own fill, under ${LIGHTNESS_STEP} (law 6)`;
	}
	const step = stepBetween(colour, under);
	return step >= LIGHTNESS_STEP
		? `+ ${round(step)} from what it stands on (law 6)`
		: `- only ${round(step)} from what it stands on, under ${LIGHTNESS_STEP} (law 6)`;
}

function textShortfall(ink, surface, page) {
	const onSurface = contrastOf(over(ink, surface), surface);
	const onPage = contrastOf(over(ink, page), page);
	const floor = onPage >= TEXT_CONTRAST ? TEXT_CONTRAST : onPage * FAINT_TEXT_KEEPS;
	return onSurface < floor ? { onSurface, floor } : null;
}

function tileReasons({ id, measured }, colour, page) {
	if (!measured) return [];
	const fills = measured.fills
		.map((fill) => ({ ...fill, step: stepBetween(over(colorOf(fill.color) ?? WHITE, colour), colour) }))
		.filter((fill) => fill.step < LIGHTNESS_STEP)
		.map((fill) => `- ${id} holds a ${fill.kind} only ${round(fill.step)} from this surface (law 7)`);
	const texts = measured.texts
		.map((text) => textShortfall(colorOf(text) ?? WHITE, colour, page))
		.filter(Boolean)
		.map(
			(short) =>
				`- ${id} has text at ${round(short.onSurface)}:1 on this surface, under the ${round(short.floor)}:1 it must keep (law 8)`,
		);
	if (fills.length === 0 && texts.length === 0)
		return [`+ ${id}: its fills stand apart and its text reads (laws 7, 8)`];
	return [...fills, ...texts];
}

function presetColour(measured, surface, under) {
	const token = surface === OBJECT ? measured?.presets?.raise : measured?.presets?.fill;
	return over(colorOf(token) ?? WHITE, under);
}

function measuredTileOf(raw) {
	if (!Number.isFinite(raw?.depth)) return null;
	const fills = Array.isArray(raw.fills)
		? raw.fills
				.filter((fill) => colorOf(fill?.color))
				.map((fill) => ({ kind: fill.kind ?? fill.role, color: fill.color }))
		: [];
	const texts = Array.isArray(raw.texts) ? raw.texts.filter((text) => colorOf(text)) : [];
	return { depth: raw.depth, fills, texts };
}

const WHITE = { r: 1, g: 1, b: 1, a: 1 };

function round(value) {
	return Math.round(value * 10) / 10;
}

function stepBetween(one, other) {
	return Math.abs(lightnessOf(one) - lightnessOf(other));
}
