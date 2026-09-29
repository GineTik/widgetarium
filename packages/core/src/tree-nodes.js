import { COLUMN } from "@widgetarium/kit/plates";
import { SWAP } from "./tree-constants.js";

export function byPath(root, pick) {
	return Object.fromEntries(
		[root, ...root.querySelectorAll("[data-path]")]
			.filter((node) => typeof node.dataset?.path === "string" && node.dataset.path !== "")
			.map((node) => [node.dataset.path, pick(node)]),
	);
}

export function isBox(node) {
	return Array.isArray(node?.of);
}

export function isLeaf(node) {
	if (isBox(node)) return false;
	return typeof node?.id === "string" && node.id !== "";
}

const DECLARED_KEYS = [
	"keep",
	"foldable",
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

export function nodeAt(root, path) {
	let node = root;
	for (const step of path) {
		if (!isBox(node)) return null;
		node = node.of[step];
	}
	return node ?? null;
}

export function leavesOf(root, path = []) {
	if (isLeaf(root)) return [{ id: root.id, path }];
	if (!isBox(root)) return [];
	return root.of.flatMap((child, at) => leavesOf(child, [...path, at]));
}

export function pathOfLeaf(root, id) {
	return leavesOf(root).find((leaf) => leaf.id === id)?.path ?? null;
}

export function replaceAt(root, path, node) {
	if (path.length === 0) return node;
	const [step, ...rest] = path;
	if (!isBox(root) || !root.of[step]) return root;
	return { ...root, of: root.of.map((child, at) => (at === step ? replaceAt(child, rest, node) : child)) };
}

// TRADE-OFF: a path that names no box answers null rather than the tree it was given — a caller that mistook the refusal for a result once handed back a tree whose carried tile had already been taken out of it
export function insertAt(root, path, at, node) {
	const box = nodeAt(root, path);
	if (!isBox(box)) return null;
	const held = Math.min(Math.max(at, 0), box.of.length);
	return replaceAt(root, path, { ...box, of: [...box.of.slice(0, held), node, ...box.of.slice(held)] });
}

export const GONE = { gone: true };

export function prune(node, isRoot = true) {
	if (!isBox(node)) return node;
	const of = node.of.map((child) => prune(child, false)).filter(isSurviving);
	const settled = { ...node, of };
	if (isRoot || of.length !== 1 || isDeclared(node)) return settled;
	return collapseInto(settled, of[0]);
}

export function withoutLeaf(root, id) {
	const path = pathOfLeaf(root, id);
	return path === null ? root : prune(replaceAt(root, path, GONE));
}

export const pathKey = (path) => path.join("/");

export function withWidth(root, path, width) {
	const node = nodeAt(root, path);
	return node ? replaceAt(root, path, { ...node, width }) : root;
}

export const slotOf = (child) => ({ name: child.name ?? "", ...(child.hidden ? { hidden: true } : {}) });

export function holdsOf(box) {
	return box.of.map(slotOf);
}

export function shownIn(rows, chosen) {
	const open = rows.filter((row) => !row.hidden);
	const held = open.find((row) => row.name === chosen) ?? open[0] ?? null;
	return held?.name ?? null;
}

export function swapBoxes(root, path = []) {
	if (!isBox(root)) return [];
	const within = root.of.flatMap((child, at) => swapBoxes(child, [...path, at]));
	return root.dir === SWAP ? [{ path, box: root }, ...within] : within;
}

export function withHolds(root, path, rows) {
	const box = nodeAt(root, path);
	if (!isBox(box)) return root;
	return replaceAt(root, path, { ...box, of: rows.map((row) => viewFor(box, row)) });
}

function isDeclared(node) {
	return DECLARED_KEYS.some((key) => node?.[key] !== undefined);
}

function collapseInto(box, child) {
	return { ...child, ratio: box.ratio ?? child.ratio ?? 1 };
}

function isSurviving(node) {
	if (node?.gone) return false;
	if (!isBox(node)) return isLeaf(node);
	return node.of.length > 0 || isDeclared(node);
}

const emptyView = (name) => ({ dir: COLUMN, of: [], name });

function viewFor(box, row) {
	const found = box.of.find((child) => child.name === (row.was ?? row.name));
	const { hidden, ...kept } = found ?? emptyView(row.name);
	return { ...kept, name: row.name, ...(row.hidden ? { hidden: true } : {}) };
}
