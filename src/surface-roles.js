import { APART, GROUP, isPainted, NO_SURFACE, OBJECT, SURFACES, SURFACE_WAS } from "./tree.js";
import { readingOfProp, wrapOf, WRAP_EACH } from "./reading.js";

export const MAX_SURFACE_DEPTH = 2;

export const ROLES = [
	"navigation",
	"indicator",
	"indicators",
	"collection",
	"detail",
	"composer",
	"control",
	"media",
	"text",
];

export const DEFAULT_STYLE = {
	navigation: [APART],
	indicator: [GROUP],
	indicators: [GROUP],
	collection: [GROUP],
	detail: [GROUP],
	composer: [OBJECT, GROUP],
	control: [],
	media: [],
	text: [],
};

const ALLOWED_INSIDE = {
	[NO_SURFACE]: [GROUP, OBJECT, APART],
	[APART]: [GROUP, OBJECT, APART],
	[GROUP]: [GROUP, APART],
	[OBJECT]: [GROUP, APART],
};

export const SLOT_SURFACES = [GROUP, OBJECT, NO_SURFACE];

export function isKnownRole(role) {
	return ROLES.includes(role);
}

export function mayWearInside(parentSurface, surface) {
	return ALLOWED_INSIDE[parentSurface].includes(surface);
}

const NOT_INSIDE = "{one} may not stand inside {other}";
const SAID_AS = { group: "a group", object: "an object", item: "an item", apart: "a divider", none: "the page" };

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

export function slotSurfaceOf(spec, held, card) {
	const picked = worn(held?.surface);
	if (picked) return picked;
	return worn(spec?.surface) ?? wornByReading(card);
}

function worn(said) {
	const surface = SURFACE_WAS[said] ?? said;
	return SLOT_SURFACES.includes(surface) ? surface : null;
}

// TRADE-OFF: only when one collection prop stands alone, because a slot never says which prop it draws and two would be a guess
function wornByReading(card) {
	const collections = Object.values(card?.props ?? {}).filter((prop) => prop?.kind === "collection");
	if (collections.length !== 1) return NO_SURFACE;
	return wrapOf(readingOfProp(collections[0])) === WRAP_EACH ? GROUP : NO_SURFACE;
}
