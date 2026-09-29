import { LAYOUTS } from "./layout-bases.js";

export { LAYOUTS };

export const HEADING_WIDGET = "@default/text-line";

export const LAYOUT_NAMES = Object.keys(LAYOUTS);

export function layoutNamed(said) {
	const name = String(said ?? "").trim();
	return Object.hasOwn(LAYOUTS, name) ? LAYOUTS[name] : null;
}

export function skeletonOf(name, asBoard) {
	const held = layoutNamed(name);
	if (!held) return null;
	const minting = { at: 0, tiles: [] };
	const layout = placeNode(structuredClone(held.layout), minting);
	return asBoard({ v: 2, tiles: minting.tiles, mode: "expanded", base: name, layout });
}

export function sectionsOf(node, found = []) {
	for (const child of node?.of ?? []) {
		if (child.heading) found.push(sectionRow(child));
		sectionsOf(child, found);
	}
	return found;
}

export function textPlacesOf(node, found = []) {
	for (const child of node?.of ?? []) {
		if (child.text !== undefined) found.push(child);
		textPlacesOf(child, found);
	}
	return found;
}

export function emptyColumnsOf(root) {
	return (root?.of ?? []).flatMap((column, at) => ((column?.of ?? []).length === 0 ? [at] : []));
}

export function baseMismatch(name, root) {
	const held = layoutNamed(name);
	if (!held) return `${name} is not a base; the ones a screen starts from are ${LAYOUT_NAMES.join(", ")}.`;
	const asked = held.layout.of;
	const standing = root?.of ?? [];
	if (standing.length !== asked.length)
		return `the board says ${name}, which cuts the page into ${asked.length} regions, and this one has ${standing.length}`;
	const wrong = asked.flatMap((region, at) => miscast(region, standing[at], at));
	return wrong.length > 0 ? `the board says ${name}, but ${wrong.join("; ")}` : null;
}

function sectionRow(child) {
	return { name: child.heading, role: child.role ?? null, purpose: child.purpose ?? null };
}

function miscast(asked, standing, at) {
	if (standing?.role === asked.role) return [];
	return [`region ${at} should hold ${asked.role} and holds ${standing?.role ?? "nothing declared"}`];
}

function placeNode(node, minting) {
	if (node.text !== undefined) return mintText(node, minting);
	const { heading, ...box } = node;
	return { ...box, of: node.of.map((child) => placeNode(child, minting)) };
}

function mintText(node, minting) {
	const id = `t${minting.at}`;
	minting.at += 1;
	minting.tiles.push({
		id,
		widget: HEADING_WIDGET,
		props: {
			text: { from: "typed", value: node.text },
			tone: { from: "typed", value: node.tone ?? "value" },
			heading: { from: "typed", value: node.level ?? 0 },
		},
	});
	return { id, ...(node.surface ? { surface: node.surface } : {}) };
}
