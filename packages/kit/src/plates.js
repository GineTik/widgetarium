export const ROW = "row";
export const COLUMN = "column";

export const GROUP = "group";
export const APART = "apart";
export const NO_SURFACE = "none";
export const SURFACES = [GROUP, APART, NO_SURFACE];
export const SURFACE_WAS = { fill: GROUP, outline: GROUP, object: GROUP, raise: GROUP, item: GROUP, divider: APART };
export const SIDES = ["start", "end"];

export const isPainted = (node) => node?.surface === GROUP;

export const MAX_SURFACE_DEPTH = 2;

const ALLOWED_INSIDE = {
	[NO_SURFACE]: [GROUP, APART],
	[APART]: [GROUP, APART],
	[GROUP]: [GROUP, APART],
};

export const SLOT_SURFACES = [GROUP, NO_SURFACE];

export function mayWearInside(parentSurface, surface) {
	return ALLOWED_INSIDE[parentSurface].includes(surface);
}

const NOT_INSIDE = "{one} may not stand inside {other}";
export const SAID_AS = { group: "a group", item: "an item", apart: "a divider", none: "the page" };

export function platesWithin(above, surface) {
	return above.levels + (isPainted({ surface }) ? 1 : 0);
}

export function misnested(surface, above) {
	if (surface === NO_SURFACE || mayWearInside(above.surface, surface)) return null;
	return { law: "N", reason: NOT_INSIDE.replace("{one}", SAID_AS[surface]).replace("{other}", SAID_AS[above.surface]) };
}

export function tooDeep(levels) {
	if (levels <= MAX_SURFACE_DEPTH) return null;
	return { law: "5", reason: `${levels} surfaces deep counted from the region, over ${MAX_SURFACE_DEPTH}` };
}

export function plateRefusal(above, surface) {
	if (!SURFACES.includes(surface)) return { law: "S", reason: `${surface} is no surface: ${SURFACES.join(", ")}` };
	if (surface === NO_SURFACE) return null;
	return misnested(surface, above) ?? tooDeep(platesWithin(above, surface));
}

export function slotSurfaceSaid(said) {
	const surface = SURFACE_WAS[said] ?? said;
	return SLOT_SURFACES.includes(surface) ? surface : null;
}
