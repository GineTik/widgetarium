import { buildMirror } from "./mirror.mjs";

buildMirror();

const { withDefaultSurfaces, surfacesWritten } = await import("./.mjs-cache/surface-default.mjs");
const { surfaceVerdicts } = await import("./.mjs-cache/surface-laws.mjs");

const ROLE_OF = {
	"@flow/project-nav": "navigation",
	"@flow/project-grid": "collection",
	"@flow/in-flight": "collection",
	"@flow/session-list": "collection",
	"@flow/bug-list": "collection",
	"@flow/session-tail": "collection",
	"@default/heatmap": "indicator",
	"@default/metric-total": "indicator",
	"@media/library-nav": "navigation",
	"@media/album-grid": "collection",
	"@media/group-grid": "collection",
	"@media/track-list": "collection",
	"@media/queue": "collection",
};
const roleOf = (widget) => ROLE_OF[widget] ?? null;

const SCREENS = {
	Home: {
		tiles: [
			{ id: "nav", widget: "@flow/project-nav" },
			{ id: "pro", widget: "@flow/project-grid" },
			{ id: "fly", widget: "@flow/in-flight" },
			{ id: "heat", widget: "@default/heatmap" },
			{ id: "stats", widget: "@default/metric-total" },
		],
		drawn: {
			nav: "apart",
			pro: "none — three white cards on the page",
			fly: "group, with white item rows",
			heat: "group",
			stats: "none — two white cards on the page",
		},
		layout: () => ({
			dir: "row",
			of: [
				{
					dir: "column",
					role: "navigation",
					purpose: "Every board and every project",
					collapse: { into: "drawer", toggle: "adaptive" },
					of: [{ id: "nav" }],
				},
				{
					dir: "column",
					keep: true,
					of: [
						{ id: "pro" },
						{ id: "fly" },
						{
							dir: "row",
							of: [
								{ id: "heat", ratio: 3 },
								{ id: "stats", ratio: 1 },
							],
						},
					],
				},
			],
		}),
	},

	Sessions: {
		tiles: [
			{ id: "nav", widget: "@flow/project-nav" },
			{ id: "run", widget: "@flow/session-list" },
			{ id: "bugs", widget: "@flow/bug-list" },
			{ id: "tail", widget: "@flow/session-tail" },
		],
		drawn: {
			nav: "apart",
			run: "group, with white item rows",
			bugs: "none — white outlined cards in a column",
			tail: "apart, with a grey plate inside it",
		},
		layout: () => ({
			dir: "row",
			of: [
				{
					dir: "column",
					role: "navigation",
					purpose: "Every board and every project",
					collapse: { into: "drawer", toggle: "adaptive" },
					of: [{ id: "nav" }],
				},
				{ dir: "column", keep: true, of: [{ id: "run" }, { id: "bugs" }] },
				{
					dir: "column",
					role: "detail",
					purpose: "What the selected session is doing",
					collapse: { into: "sheet", toggle: "adaptive" },
					of: [{ id: "tail" }],
				},
			],
		}),
	},

	Music: {
		tiles: [
			{ id: "nav", widget: "@media/library-nav" },
			{ id: "albums", widget: "@media/album-grid" },
			{ id: "groups", widget: "@media/group-grid" },
			{ id: "tracks", widget: "@media/track-list" },
			{ id: "queue", widget: "@media/queue" },
		],
		drawn: {
			nav: "apart",
			albums: "none — covers with no container at all",
			groups: "none — white outlined cards in a row",
			tracks: "group, with item rows",
			queue: "apart, rows bare",
		},
		layout: () => ({
			dir: "row",
			of: [
				{
					dir: "column",
					role: "navigation",
					purpose: "The library and its groups",
					collapse: { into: "drawer", toggle: "adaptive" },
					of: [{ id: "nav" }],
				},
				{ dir: "column", keep: true, of: [{ id: "albums" }, { id: "groups" }, { id: "tracks" }] },
				{
					dir: "column",
					role: "collection",
					purpose: "What plays next",
					collapse: { into: "sheet", toggle: "adaptive" },
					of: [{ id: "queue" }],
				},
			],
		}),
	},
};

function tileAt(layout, path) {
	let node = layout;
	for (const step of path) node = node.of[step];
	return node;
}

function idsByPath(layout, path = [], into = {}) {
	if (!layout.of) {
		into[path.join("/")] = layout.id;
		return into;
	}
	layout.of.forEach((child, at) => idsByPath(child, [...path, at], into));
	return into;
}

function boxPathOfTile(layout, id) {
	const found = Object.entries(idsByPath(layout)).find(([, held]) => held === id);
	if (!found) return null;
	const steps = found[0].split("/").map(Number);
	return steps.slice(0, -1).join("/");
}

const runs = [];
for (let n = 0; n < 10; n += 1) {
	const round = {};
	for (const [name, screen] of Object.entries(SCREENS)) {
		round[name] = surfacesWritten(withDefaultSurfaces({ layout: screen.layout(), tiles: screen.tiles, roleOf }));
	}
	runs.push(JSON.stringify(round));
}

const stable = runs.every((one) => one === runs[0]);
console.log(`\n=== determinism: ten runs of the same three trees ===`);
console.log(stable ? "OK   all ten runs identical" : "!!   the runs differ");

for (const [name, screen] of Object.entries(SCREENS)) {
	const layout = screen.layout();
	const laid = withDefaultSurfaces({ layout, tiles: screen.tiles, roleOf });
	const written = surfacesWritten(laid);
	const { verdicts } = surfaceVerdicts({ layout: laid, tiles: screen.tiles, measured: null, roleOf });

	console.log(`\n=== ${name} ===`);
	console.log(`what the algorithm wrote: ${JSON.stringify(written)}`);

	const leafPathOf = (id) => {
		const found = Object.entries(idsByPath(laid)).find(([, held]) => held === id);
		return found ? found[0] : null;
	};

	for (const [id, drawn] of Object.entries(screen.drawn)) {
		const boxPath = boxPathOfTile(laid, id);
		const written_ = written[boxPath] ?? "none";
		const onLeaf = verdicts.find((one) => one.path.join("/") === leafPathOf(id));
		const onBox = verdicts.find((one) => one.path.join("/") === boxPath);
		const advised = onLeaf?.advised ?? onBox?.advised ?? "none";
		console.log(
			`  ${id.padEnd(7)} written: ${String(written_).padEnd(6)} advised: ${String(advised).padEnd(6)} drawn: ${drawn}`,
		);
		const why = (onLeaf ?? onBox)?.reasons ?? [];
		if (why.length) console.log(`      ${why.join(" / ")}`);
	}
}

console.log("");
