import { COLUMN } from "@widgetarium/kit/plates";
import type { APART, GROUP, NO_SURFACE, ROW } from "@widgetarium/kit/plates";
import { SWAP } from "./tree-constants.js";
import type { COLLAPSES, TOGGLES } from "./tree-constants.js";
import type { TabRow } from "./tab-rows.js";
import type { WidgetSize } from "./gateway/manifest.js";

export type NodePath = readonly number[];

export type Axis = typeof ROW | typeof COLUMN;

export type BoxDirection = Axis | typeof SWAP;

export type SurfaceWord = typeof GROUP | typeof APART | typeof NO_SURFACE;

export type SurfaceSide = "start" | "end";

export type CollapseKind = (typeof COLLAPSES)[number];

export type CollapseToggle = (typeof TOGGLES)[number];

export interface Collapse {
	readonly into: CollapseKind;
	readonly toggle: CollapseToggle;
}

export interface PlaceFlags {
	readonly ratio?: number;
	readonly name?: string;
	readonly hidden?: boolean;
	readonly surface?: SurfaceWord;
	readonly side?: SurfaceSide;
}

export interface LeafNode extends PlaceFlags {
	readonly id: string;
}

export interface BoxNode extends PlaceFlags {
	readonly dir: BoxDirection;
	readonly of: readonly BoardNode[];
	readonly width?: number;
	readonly measure?: number;
	readonly keep?: boolean;
	readonly collapse?: Collapse;
	readonly folded?: boolean;
	readonly trigger?: string;
	readonly scroll?: boolean;
	readonly id?: string;
	readonly strip?: boolean;
	readonly role?: string;
	readonly purpose?: string;
}

export type BoardNode = LeafNode | BoxNode;

interface LeafPlace {
	readonly id: string;
	readonly path: NodePath;
}

interface SwapPlace {
	readonly path: NodePath;
	readonly box: BoxNode;
}

export type EdgeSide = "top" | "bottom" | "left" | "right";

export type PreferredSize = Pick<WidgetSize, "preferredWidth" | "preferredHeight" | "keepsRatio" | "at">;

interface LeafFacts {
	readonly minPx?: number;
	readonly preferred?: PreferredSize | null;
	readonly widget?: string | undefined;
	readonly role?: string | undefined;
	readonly insets?: Partial<Record<EdgeSide, number>> | undefined;
}

export type AskLeaf = (id: string) => LeafFacts;

export type HeldNode = BoardNode | null | undefined;

const DECLARED_KEYS: readonly (keyof BoxNode)[] = [
	"keep",
	"folded",
	"collapse",
	"trigger",
	"width",
	"scroll",
	"name",
	"id",
	"surface",
	"role",
	"purpose",
];

const GAP: LeafNode = { id: "" };

export function byPath<Picked>(root: HTMLElement, pick: (node: HTMLElement) => Picked): Record<string, Picked> {
	const marked = [root, ...root.querySelectorAll<HTMLElement>("[data-path]")];
	return Object.fromEntries(
		marked.flatMap((node) => {
			const path = node.dataset["path"];
			return typeof path === "string" && path !== "" ? [[path, pick(node)] as const] : [];
		}),
	);
}

export function isBox(node: HeldNode): node is BoxNode {
	return typeof node === "object" && node !== null && "of" in node && Array.isArray(node.of);
}

export function isLeaf(node: HeldNode): node is LeafNode {
	if (isBox(node)) return false;
	return typeof node?.id === "string" && node.id !== "";
}

export function isGap(node: HeldNode): boolean {
	return node === GAP;
}

export function nodeAt(root: BoardNode, path: NodePath): BoardNode | null {
	let node: BoardNode | undefined = root;
	for (const step of path) {
		if (!isBox(node)) return null;
		node = node.of[step];
	}
	return node ?? null;
}

export function leavesOf(root: HeldNode, path: NodePath = []): LeafPlace[] {
	if (isLeaf(root)) return [{ id: root.id, path }];
	if (!isBox(root)) return [];
	return root.of.flatMap((child, at) => leavesOf(child, [...path, at]));
}

export function pathOfLeaf(root: HeldNode, id: string): NodePath | null {
	return leavesOf(root).find((leaf) => leaf.id === id)?.path ?? null;
}

export function replaceAt<Root extends BoardNode, Put extends BoardNode>(
	root: Root,
	path: NodePath,
	node: Put,
): Root | Put {
	const [step, ...rest] = path;
	if (step === undefined) return node;
	if (!isBox(root) || !root.of[step]) return root;
	return { ...root, of: root.of.map((child, at) => (at === step ? replaceAt(child, rest, node) : child)) };
}

// TRADE-OFF: a path that names no box answers null rather than the tree it was given — a caller that mistook the refusal for a result once handed back a tree whose carried tile had already been taken out of it
export function insertAt(root: BoxNode, path: NodePath, at: number, node: BoardNode): BoxNode | null {
	const box = nodeAt(root, path);
	if (!isBox(box)) return null;
	const held = Math.min(Math.max(at, 0), box.of.length);
	return replaceAt(root, path, { ...box, of: [...box.of.slice(0, held), node, ...box.of.slice(held)] });
}

export function withGapAt(root: BoxNode, path: NodePath): BoxNode {
	const blanked = replaceAt(root, path, GAP);
	return isBox(blanked) ? blanked : root;
}

export function prune(root: BoxNode): BoxNode {
	return { ...root, of: prunedChildrenOf(root) };
}

export function withoutLeaf(root: BoxNode, id: string): BoxNode {
	const path = pathOfLeaf(root, id);
	return path === null ? root : prune(withGapAt(root, path));
}

export const pathKey = (path: NodePath): string => path.join("/");

export function withWidth(root: BoxNode, path: NodePath, width: number): BoxNode {
	const node = nodeAt(root, path);
	return isBox(node) ? replaceAt(root, path, { ...node, width }) : root;
}

interface TabbedNode {
	readonly name?: string | null | undefined;
	readonly hidden?: boolean | undefined;
}

export const slotOf = (child: TabbedNode): TabRow => ({
	name: child.name ?? "",
	...(child.hidden ? { hidden: true } : {}),
});

export function holdsOf(box: { readonly of: readonly TabbedNode[] }): TabRow[] {
	return box.of.map(slotOf);
}

export function shownIn(rows: readonly TabRow[], chosen: string | null | undefined): string | null {
	const open = rows.filter((row) => !row.hidden);
	const held = open.find((row) => row.name === chosen) ?? open[0] ?? null;
	return held?.name ?? null;
}

export function swapBoxes(root: HeldNode, path: NodePath = []): SwapPlace[] {
	if (!isBox(root)) return [];
	const within = root.of.flatMap((child, at) => swapBoxes(child, [...path, at]));
	return root.dir === SWAP ? [{ path, box: root }, ...within] : within;
}

export function withHolds(root: BoxNode, path: NodePath, rows: readonly TabRow[]): BoxNode {
	const box = nodeAt(root, path);
	if (!isBox(box)) return root;
	return replaceAt(root, path, { ...box, of: rows.map((row) => viewFor(box, row)) });
}

function prunedChildrenOf(box: BoxNode): BoardNode[] {
	return box.of.map(prunedChild).filter(isSurviving);
}

function prunedChild(node: BoardNode): BoardNode {
	if (!isBox(node)) return node;
	const of = prunedChildrenOf(node);
	const settled = { ...node, of };
	const [only] = of;
	if (of.length !== 1 || only === undefined || isDeclared(node)) return settled;
	return collapseInto(settled, only);
}

function isDeclared(node: BoxNode): boolean {
	return DECLARED_KEYS.some((key) => node[key] !== undefined);
}

function collapseInto(box: BoxNode, child: BoardNode): BoardNode {
	return { ...child, ratio: box.ratio ?? child.ratio ?? 1 };
}

function isSurviving(node: BoardNode): boolean {
	if (isGap(node)) return false;
	if (!isBox(node)) return isLeaf(node);
	return node.of.length > 0 || isDeclared(node);
}

const emptyView = (name: string): BoxNode => ({ dir: COLUMN, of: [], name });

function viewFor(box: BoxNode, row: TabRow): BoardNode {
	const found = box.of.find((child) => child.name === (row.was ?? row.name));
	const { hidden, ...kept } = found ?? emptyView(row.name);
	return { ...kept, name: row.name, ...(row.hidden ? { hidden: true } : {}) };
}
