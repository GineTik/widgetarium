import { APART, GROUP, NO_SURFACE, OBJECT, SURFACE_WAS } from "./tree.js";
import { readingOfProp, wrapOf, WRAP_EACH } from "./reading.js";

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
