import {
	APART,
	GROUP,
	MAX_SURFACE_DEPTH,
	NO_SURFACE,
	SAID_AS,
	SLOT_SURFACES,
	SURFACES,
	SURFACE_WAS,
} from "../constants/surfaces";

export const isPainted = (node) => node?.surface === GROUP;

const ALLOWED_INSIDE = {
	[NO_SURFACE]: [GROUP, APART],
	[APART]: [GROUP, APART],
	[GROUP]: [GROUP, APART],
};

export function mayWearInside(parentSurface, surface) {
	return ALLOWED_INSIDE[parentSurface].includes(surface);
}

const NOT_INSIDE = "{one} may not stand inside {other}";

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
