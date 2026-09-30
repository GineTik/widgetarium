import { APART, GROUP, isBox, NO_SURFACE } from "./tree.js";
import type { BoardNode, SurfaceWord } from "./tree.js";
import { readingOfProp, wrapOf, WRAP_EACH } from "./reading.js";
import type { ReadProp } from "./reading.js";
import { SAID_AS, readSlotSurface } from "@widgetarium/kit/plates";

export {
	MAX_SURFACE_DEPTH,
	SLOT_SURFACES,
	mayWearInside,
	platesWithin,
	misnested,
	tooDeep,
	plateRefusal,
	readSlotSurface,
} from "@widgetarium/kit/plates";

export interface LawRefusal {
	readonly law: string;
	readonly reason: string;
}

export type SlotSurface = typeof GROUP | typeof NO_SURFACE;

export type WidgetOf = (id: string) => string | null | undefined;

export interface SurfaceSaid {
	readonly surface?: unknown;
}

interface SlotCard {
	readonly props?: Readonly<Record<string, ReadProp | null | undefined>> | null;
}

const LAYOUT_ROLE = "layout";

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
] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_STYLE: Readonly<Record<Role, readonly SurfaceWord[]>> = {
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

export function isKnownRole(role: unknown): role is Role {
	return ROLES.some((known) => known === role);
}

const EARNED_BY_PEERS = "peers";
export const EARNED_BY_LIST = "list";

type Earning = typeof EARNED_BY_PEERS | typeof EARNED_BY_LIST;

const STANDS_ALONE =
	"{one} stands alone: a plate is earned by a repeat — the same thing beside it again, or a list of the same things it holds";

export function slotSurfaceNamed(said: unknown): SlotSurface | null {
	const surface: unknown = readSlotSurface(said);
	return surface === GROUP || surface === NO_SURFACE ? surface : null;
}

export function repeatEarning(node: BoardNode, siblings: readonly BoardNode[], widgetOf: WidgetOf): Earning | null {
	const kind = kindOfNode(node, widgetOf);
	if (siblings.some((one) => one !== node && kindOfNode(one, widgetOf) === kind)) return EARNED_BY_PEERS;
	if (isBox(node) && holdsRepeat(node.of, widgetOf)) return EARNED_BY_LIST;
	return null;
}

export function unearnedPlate(node: BoardNode, siblings: readonly BoardNode[], widgetOf: WidgetOf): LawRefusal | null {
	if (node.surface !== GROUP) return null;
	if (repeatEarning(node, siblings, widgetOf) !== null) return null;
	return { law: "R", reason: STANDS_ALONE.replace("{one}", SAID_AS[node.surface]) };
}

export function slotSurfaceOf(
	spec: SurfaceSaid | null | undefined,
	held: SurfaceSaid | null | undefined,
	card?: SlotCard | null,
): SlotSurface {
	return slotSurfaceNamed(held?.surface) ?? slotSurfaceNamed(spec?.surface) ?? wornByReading(card);
}

// TRADE-OFF: only when one collection prop stands alone, because a slot never says which prop it draws and two would be a guess
function wornByReading(card: SlotCard | null | undefined): SlotSurface {
	const collections = Object.values(card?.props ?? {}).filter((prop) => prop?.kind === "collection");
	const [only] = collections;
	if (collections.length !== 1) return NO_SURFACE;
	return wrapOf(readingOfProp(only)) === WRAP_EACH ? GROUP : NO_SURFACE;
}

function holdsRepeat(nodes: readonly BoardNode[], widgetOf: WidgetOf): boolean {
	const kinds = nodes.map((one) => kindOfNode(one, widgetOf));
	return new Set(kinds).size < kinds.length;
}

function kindOfNode(node: BoardNode, widgetOf: WidgetOf): string {
	if (!isBox(node)) return widgetOf(node.id) ?? `tile:${node.id}`;
	return `${node.role ?? ""}:${node.dir}:[${node.of.map((one) => kindOfNode(one, widgetOf)).join(",")}]`;
}
