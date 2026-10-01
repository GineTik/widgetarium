import type { BoardNode, BoxNode } from "../packages/core/src/tree.js";
import type { TileWidget } from "../packages/core/src/surface-laws.js";

const { withDefaultSurfaces, surfacesWritten } = await import("../packages/core/src/surface-default.js");

const ROLE_OF: Readonly<Record<string, string>> = {
	"@x/list": "collection",
	"@x/stat": "indicator",
	"@x/title": "text",
	"@x/one": "detail",
};
const roleOf = (widget: string | null | undefined): string | null => ROLE_OF[widget ?? ""] ?? null;

const tiles: readonly TileWidget[] = [
	{ id: "t", widget: "@x/title" },
	{ id: "a", widget: "@x/list" },
	{ id: "b", widget: "@x/list" },
	{ id: "s", widget: "@x/stat" },
	{ id: "s2", widget: "@x/stat" },
	{ id: "d", widget: "@x/one" },
];

const region = (of: readonly BoardNode[], extra: Partial<BoxNode> = {}): BoxNode => ({
	dir: "row",
	of: [{ dir: "column", keep: true, role: "collection", purpose: "The band", ...extra, of }],
});

const SHAPES: Readonly<Record<string, BoxNode>> = {
	"a bare leaf, straight in the region": region([{ id: "a" }]),
	"a leaf wrapped in a box of its own": region([
		{ dir: "column", role: "collection", purpose: "What is running", of: [{ id: "a" }] },
	]),
	"a heading beside the leaf, in one box": region([
		{ dir: "column", role: "collection", purpose: "What is running", of: [{ id: "t" }, { id: "a" }] },
	]),
	"two collections in one box": region([
		{ dir: "column", role: "collection", purpose: "What is running", of: [{ id: "a" }, { id: "b" }] },
	]),
	"two indicators in one box": region([
		{ dir: "column", role: "indicators", purpose: "How it is going", of: [{ id: "s" }, { id: "s2" }] },
	]),
	"three bands, each its own box, one widget each": region([
		{ dir: "column", role: "collection", purpose: "Projects", of: [{ id: "a" }] },
		{ dir: "column", role: "collection", purpose: "In flight", of: [{ id: "b" }] },
		{ dir: "column", role: "indicators", purpose: "Activity", of: [{ id: "s" }] },
	]),
	"three bands, each holding a heading and a widget": region([
		{ dir: "column", role: "collection", purpose: "Projects", of: [{ id: "t" }, { id: "a" }] },
		{ dir: "column", role: "collection", purpose: "In flight", of: [{ id: "t" }, { id: "b" }] },
		{ dir: "column", role: "indicators", purpose: "Activity", of: [{ id: "t" }, { id: "s" }] },
	]),
	"a band of two widgets beside a band of one": region([
		{ dir: "column", role: "indicators", purpose: "Activity", of: [{ id: "s" }, { id: "s2" }] },
		{ dir: "column", role: "collection", purpose: "In flight", of: [{ id: "a" }] },
	]),
};

for (const [name, layout] of Object.entries(SHAPES)) {
	const laid = withDefaultSurfaces({ layout, tiles, roleOf });
	const written = surfacesWritten(laid);
	console.log(`\n${name}`);
	console.log(`  wrote ${JSON.stringify(written)}`);
}

console.log("");
