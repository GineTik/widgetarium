import { APART, GROUP, isBox, isPainted, NO_SURFACE } from "./tree.js";
import { readingOfProp, wrapOf, WRAP_EACH } from "./reading.js";
import { SAID_AS, slotSurfaceSaid } from "@widgetarium/kit/plates";

export {
	MAX_SURFACE_DEPTH,
	SLOT_SURFACES,
	mayWearInside,
	platesWithin,
	misnested,
	tooDeep,
	plateRefusal,
	slotSurfaceSaid,
} from "@widgetarium/kit/plates";

export const LAYOUT_ROLE = "layout";

export const ROLES = [
	LAYOUT_ROLE,
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
	[LAYOUT_ROLE]: [],
	navigation: [APART],
	indicator: [GROUP],
	indicators: [GROUP],
	collection: [GROUP],
	detail: [GROUP],
	composer: [GROUP],
	control: [],
	media: [],
	text: [],
};

export function isKnownRole(role) {
	return ROLES.includes(role);
}

export const EARNED_BY_PEERS = "peers";
export const EARNED_BY_LIST = "list";

const STANDS_ALONE =
	"{one} stands alone: a plate is earned by a repeat — the same thing beside it again, or a list of the same things it holds";

export function kindOfNode(node, widgetOf) {
	if (!isBox(node)) return widgetOf(node.id) ?? `tile:${node.id}`;
	return `${node.role ?? ""}:${node.dir}:[${node.of.map((one) => kindOfNode(one, widgetOf)).join(",")}]`;
}

function holdsRepeat(nodes, widgetOf) {
	const kinds = nodes.map((one) => kindOfNode(one, widgetOf));
	return new Set(kinds).size < kinds.length;
}

export function repeatEarning(node, siblings, widgetOf) {
	const kind = kindOfNode(node, widgetOf);
	if (siblings.some((one) => one !== node && kindOfNode(one, widgetOf) === kind)) return EARNED_BY_PEERS;
	if (isBox(node) && holdsRepeat(node.of, widgetOf)) return EARNED_BY_LIST;
	return null;
}

export function unearnedPlate(node, siblings, widgetOf) {
	if (!isPainted(node)) return null;
	const earned = repeatEarning(node, siblings, widgetOf);
	if (earned === EARNED_BY_PEERS || (earned === EARNED_BY_LIST && node.surface === GROUP)) return null;
	return { law: "R", reason: STANDS_ALONE.replace("{one}", SAID_AS[node.surface]) };
}

export function slotSurfaceOf(spec, held, card) {
	const picked = slotSurfaceSaid(held?.surface);
	if (picked) return picked;
	return slotSurfaceSaid(spec?.surface) ?? wornByReading(card);
}

// TRADE-OFF: only when one collection prop stands alone, because a slot never says which prop it draws and two would be a guess
function wornByReading(card) {
	const collections = Object.values(card?.props ?? {}).filter((prop) => prop?.kind === "collection");
	if (collections.length !== 1) return NO_SURFACE;
	return wrapOf(readingOfProp(collections[0])) === WRAP_EACH ? GROUP : NO_SURFACE;
}
