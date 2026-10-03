import { LAYOUTS } from "./layout-bases.js";
import type { LayoutBase } from "./layout-bases.js";
import type { BaseBox, BaseNode, BaseText } from "./layout-regions.js";
import type { BoardNode, BoxNode, LeafNode } from "./tree.js";
import { isObject } from "./engine/is-object.js";
import { TYPED_VALUE } from "./gateway/props.js";

export { LAYOUTS };
export type { LayoutBase };

export const HEADING_WIDGET = "@default/text-line";

export const LAYOUT_NAMES: readonly string[] = Object.keys(LAYOUTS);

interface TypedValue {
	readonly implementation: typeof TYPED_VALUE;
	readonly fields: { readonly value: unknown };
}

interface SkeletonTile {
	readonly id: string;
	readonly widget: string;
	readonly props: Readonly<Record<"text" | "tone" | "heading", TypedValue>>;
}

interface SkeletonBoard {
	readonly v: 2;
	readonly tiles: readonly SkeletonTile[];
	readonly mode: "expanded";
	readonly base: string;
	readonly layout: BoxNode;
}

interface SectionRow {
	readonly name: string;
	readonly role: string | null;
	readonly purpose: string | null;
}

interface Minting {
	at: number;
	readonly tiles: SkeletonTile[];
}

export function layoutNamed(said: unknown): LayoutBase | null {
	const name = String(said ?? "").trim();
	return LAYOUT_NAMES.includes(name) ? (LAYOUTS[name] ?? null) : null;
}

export function skeletonOf<Board>(name: unknown, asBoard: (raw: SkeletonBoard) => Board): Board | null {
	const held = layoutNamed(name);
	if (!held) return null;
	const minting: Minting = { at: 0, tiles: [] };
	const layout = placeBox(structuredClone(held.layout), minting);
	return asBoard({ v: 2, tiles: minting.tiles, mode: "expanded", base: String(name), layout });
}

export function sectionsOf(node: BaseNode | null | undefined, found: SectionRow[] = []): SectionRow[] {
	if (!node || isText(node)) return found;
	for (const child of node.of) {
		if (!isText(child) && child.heading) found.push(sectionRow(child, child.heading));
		sectionsOf(child, found);
	}
	return found;
}

export function emptyColumnsOf(root: unknown): number[] {
	return childrenOf(root).flatMap((column, at) => (childrenOf(column).length === 0 ? [at] : []));
}

export function baseMismatch(name: unknown, root: unknown): string | null {
	const held = layoutNamed(name);
	if (!held) return `${String(name)} is not a base; the ones a screen starts from are ${LAYOUT_NAMES.join(", ")}.`;
	const asked = held.layout.of;
	const standing = childrenOf(root);
	if (standing.length !== asked.length)
		return `the board says ${String(name)}, which cuts the page into ${asked.length} regions, and this one has ${standing.length}`;
	const wrong = asked.flatMap((region, at) => miscast(region, standing[at], at));
	return wrong.length > 0 ? `the board says ${String(name)}, but ${wrong.join("; ")}` : null;
}

function isText(node: BaseNode): node is BaseText {
	return "text" in node;
}

function childrenOf(node: unknown): readonly unknown[] {
	const of = isObject(node) ? node["of"] : null;
	return Array.isArray(of) ? of : [];
}

function sectionRow(child: BaseBox, heading: string): SectionRow {
	return { name: heading, role: child.role ?? null, purpose: child.purpose ?? null };
}

function miscast(asked: BaseNode, standing: unknown, at: number): string[] {
	const askedRole = isText(asked) ? undefined : asked.role;
	const standingRole = isObject(standing) ? standing["role"] : undefined;
	if (standingRole === askedRole) return [];
	return [`region ${at} should hold ${String(askedRole)} and holds ${String(standingRole ?? "nothing declared")}`];
}

function placeNode(node: BaseNode, minting: Minting): BoardNode {
	return isText(node) ? mintText(node, minting) : placeBox(node, minting);
}

function placeBox(node: BaseBox, minting: Minting): BoxNode {
	const { heading, ...box } = node;
	return { ...box, of: node.of.map((child) => placeNode(child, minting)) };
}

function typedValueOf(value: unknown): TypedValue {
	return { implementation: TYPED_VALUE, fields: { value } };
}

function mintText(node: BaseText, minting: Minting): LeafNode {
	const id = `t${minting.at}`;
	minting.at += 1;
	minting.tiles.push({
		id,
		widget: HEADING_WIDGET,
		props: {
			text: typedValueOf(node.text),
			tone: typedValueOf(node.tone),
			heading: typedValueOf(node.level),
		},
	});
	return { id, ...(node.surface ? { surface: node.surface } : {}) };
}
