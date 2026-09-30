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
import type { SlotSurfaceName, SurfaceName } from "../constants/surfaces";
import { isOneOf } from "./is-one-of";

export interface PlateLevel {
	readonly surface: SurfaceName;
	readonly levels: number;
}

export interface PlateRefusal {
	readonly law: string;
	readonly reason: string;
}

export interface SurfaceHolder {
	readonly surface?: unknown;
}

export const isPainted = (node: SurfaceHolder | null | undefined): boolean => node?.surface === GROUP;

const ALLOWED_INSIDE: Readonly<Record<SurfaceName, readonly SurfaceName[]>> = {
	[NO_SURFACE]: [GROUP, APART],
	[APART]: [GROUP, APART],
	[GROUP]: [GROUP, APART],
};

export function mayWearInside(parentSurface: SurfaceName, surface: SurfaceName): boolean {
	return ALLOWED_INSIDE[parentSurface].includes(surface);
}

const NOT_INSIDE = "{one} may not stand inside {other}";

export function platesWithin(above: PlateLevel, surface: unknown): number {
	return above.levels + (isPainted({ surface }) ? 1 : 0);
}

export function misnested(surface: SurfaceName, above: PlateLevel): PlateRefusal | null {
	if (surface === NO_SURFACE || mayWearInside(above.surface, surface)) return null;
	return { law: "N", reason: NOT_INSIDE.replace("{one}", SAID_AS[surface]).replace("{other}", SAID_AS[above.surface]) };
}

export function tooDeep(levels: number): PlateRefusal | null {
	if (levels <= MAX_SURFACE_DEPTH) return null;
	return { law: "5", reason: `${levels} surfaces deep counted from the region, over ${MAX_SURFACE_DEPTH}` };
}

export function plateRefusal(above: PlateLevel, surface: unknown): PlateRefusal | null {
	if (!isOneOf(SURFACES, surface)) return notASurface(surface);
	return surfaceRefusal(above, surface);
}

export function surfaceRefusal(above: PlateLevel, surface: SurfaceName): PlateRefusal | null {
	if (surface === NO_SURFACE) return null;
	return misnested(surface, above) ?? tooDeep(platesWithin(above, surface));
}

export function notASurface(said: unknown): PlateRefusal {
	return { law: "S", reason: `${String(said)} is no surface: ${SURFACES.join(", ")}` };
}

export function readSlotSurface(said: unknown): SlotSurfaceName | null {
	const surface = surfaceSaidNow(said);
	return isOneOf(SLOT_SURFACES, surface) ? surface : null;
}

export function surfaceSaidNow(said: unknown): unknown {
	if (typeof said !== "string" || !Object.hasOwn(SURFACE_WAS, said)) return said;
	return SURFACE_WAS[said];
}
