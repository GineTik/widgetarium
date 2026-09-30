import { ADAPTIVE, ALWAYS, APART, COLUMN, DRAWER, ROW } from "./tree.js";
import type { BoardNode, BoxNode, Collapse, LeafNode, PlaceFlags } from "./tree.js";
import { isObject } from "./engine/is-object.js";
import { isKnownRole } from "./surface-roles.js";
import { isBoxDirection, isCollapseKind, isCollapseToggle, isSurfaceSide, surfaceWordOf } from "./node-words.js";

export type RawFields = Readonly<Record<string, unknown>>;

type BoxFlags = Omit<BoxNode, "dir" | "of">;

type SlotFlags = Pick<PlaceFlags, "name" | "hidden" | "surface" | "side">;

export interface RawBox extends RawFields {
	readonly of: readonly unknown[];
}

export function isRawBox(input: unknown): input is RawBox {
	return isObject(input) && Array.isArray(input["of"]);
}

export function normalizeBox(input: RawBox): BoxNode {
	const of = input.of.map(normalizeNode).filter((node): node is BoardNode => node !== null);
	const { dir } = input;
	return { dir: isBoxDirection(dir) ? dir : COLUMN, of, ...boxFlags(input) };
}

export function normalizeLeaf(input: unknown): LeafNode | null {
	const fields: RawFields = isObject(input) ? input : {};
	const id = typeof input === "string" ? input : fields["id"];
	if (typeof id !== "string" || id === "") return null;
	const ratio = positiveNumber(fields["ratio"]);
	return { id, ratio: ratio ?? 1, ...slotFlags(fields) };
}

export function rowNode(cells: readonly BoardNode[]): BoardNode {
	const [only] = cells;
	return cells.length === 1 && only ? only : { dir: ROW, of: cells };
}

export function boxFlags(input: RawFields): BoxFlags {
	const width = positiveNumber(input["width"]);
	const measure = positiveNumber(input["measure"]);
	const ratio = positiveNumber(input["ratio"]);
	const collapse = collapseFrom(input);
	const { trigger, id, role, purpose } = input;
	return {
		...(ratio ? { ratio } : {}),
		...(width ? { width } : {}),
		...(measure ? { measure } : {}),
		...(input["keep"] === true ? { keep: true } : {}),
		...(collapse ? { collapse } : {}),
		...(collapse?.toggle === ALWAYS && (input["folded"] === true || input["collapsed"] === true)
			? { folded: true }
			: {}),
		...(typeof trigger === "string" && trigger.includes("/") ? { trigger } : {}),
		...(input["scroll"] === true ? { scroll: true } : {}),
		...(typeof id === "string" && id !== "" ? { id } : {}),
		...(input["strip"] === false ? { strip: false } : {}),
		...(isKnownRole(role) ? { role } : {}),
		...(typeof purpose === "string" && purpose.trim() !== "" ? { purpose: purpose.trim() } : {}),
		...slotFlags(input),
	};
}

export function slotFlags(input: object): SlotFlags {
	const fields: RawFields = { ...input };
	const { name } = fields;
	return {
		...(typeof name === "string" && name !== "" ? { name } : {}),
		...(fields["hidden"] === true ? { hidden: true } : {}),
		...surfaceFields(fields),
	};
}

function surfaceFields(input: RawFields): Pick<PlaceFlags, "surface" | "side"> {
	const surface = surfaceWordOf(input["surface"]);
	if (!surface) return {};
	const { side } = input;
	return { surface, ...(surface === APART && isSurfaceSide(side) ? { side } : {}) };
}

function positiveNumber(given: unknown): number | null {
	const value = Number(given);
	return Number.isFinite(value) && value > 0 ? value : null;
}

function collapseFrom(input: RawFields): Collapse | null {
	const given = collapseSaid(input["collapse"]);
	const into = isCollapseKind(given["into"]) ? given["into"] : null;
	const toggle = isCollapseToggle(given["toggle"]) ? given["toggle"] : null;
	if (input["foldable"] === true) return { into: into ?? DRAWER, toggle: toggle ?? ALWAYS };
	return into ? { into, toggle: toggle ?? ADAPTIVE } : null;
}

function collapseSaid(said: unknown): RawFields {
	if (typeof said === "string") return { into: said };
	return isObject(said) ? said : {};
}

function normalizeNode(input: unknown): BoardNode | null {
	return isRawBox(input) ? normalizeBox(input) : normalizeLeaf(input);
}
