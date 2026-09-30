export const ROW = "row";

export const COLUMN = "column";

export const GROUP = "group";

export const APART = "apart";

export const NO_SURFACE = "none";

export type SurfaceName = typeof GROUP | typeof APART | typeof NO_SURFACE;

export type SlotSurfaceName = typeof GROUP | typeof NO_SURFACE;

export type SideName = "start" | "end";

export type AcrossName = typeof ROW | typeof COLUMN;

export const SURFACES: readonly SurfaceName[] = [GROUP, APART, NO_SURFACE];

export const SURFACE_WAS: Readonly<Record<string, SurfaceName>> = {
	fill: GROUP,
	outline: GROUP,
	object: GROUP,
	raise: GROUP,
	item: GROUP,
	divider: APART,
};

export const SIDES: readonly SideName[] = ["start", "end"];

export const MAX_SURFACE_DEPTH = 2;

export const SLOT_SURFACES: readonly SlotSurfaceName[] = [GROUP, NO_SURFACE];

export const SAID_AS: Readonly<Record<SurfaceName | "item", string>> = {
	group: "a group",
	item: "an item",
	apart: "a divider",
	none: "the page",
};
