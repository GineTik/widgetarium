import { addWidget } from "./add.ts";
import type { AddProject, WantedPackage } from "./add.ts";
import { rangesAgree } from "./version-range.ts";
import { createWidgetSource } from "../packages/core/src/engine/widget-source.js";
import type { SourceDisk } from "../packages/core/src/engine/widget-source.js";
import { textIn } from "./held-fields.ts";

let failed = 0;
let checks = 0;
function check(name: string, got: unknown, want: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const ENGINE = { name: "widgetarium", range: "^0.1.0" };
const CATALOGUE = "/repo/widgets";

const CLOCK_SOURCE = `import { IValueGateway, createWidget, defineLayout, z } from "widgetarium";
import { useState } from "react";

export const layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });
export default createWidget({
	inject: { face: IValueGateway.of(z.string().default("")).pick("get") },
	draw: ({ face }) => {
		const [ticking] = useState(true);
		return <b   data-odd="  spacing  kept  ">{face}{String(ticking)}</b>;
	},
});
`;
const bareSource = (word: string): string =>
	`import { createWidget, defineLayout } from "widgetarium";\nexport const layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });\nexport default createWidget({ draw: () => <b>${word}</b> });\n`;

const shelf = new Map([
	[`${CATALOGUE}/@demo/lib.js`, "export const shared = 1;\n"],
	[
		`${CATALOGUE}/@demo/clock/manifest.generated.json`,
		JSON.stringify({
			id: "@demo/clock",
			title: "Clock",
			dependencies: { react: "^19.2.8" },
			widgetDependencies: ["@demo/face"],
		}),
	],
	[`${CATALOGUE}/@demo/clock/widget.tsx`, CLOCK_SOURCE],
	[`${CATALOGUE}/@demo/clock/widget.css`, ".clock { color: red; }\n"],
	[
		`${CATALOGUE}/@demo/face/manifest.generated.json`,
		JSON.stringify({ id: "@demo/face", title: "Face", slots: { hand: { default: "@demo/hand" } } }),
	],
	[`${CATALOGUE}/@demo/face/widget.tsx`, bareSource("face")],
	[
		`${CATALOGUE}/@demo/hand/manifest.generated.json`,
		JSON.stringify({ id: "@demo/hand", title: "Hand", dependencies: { "@dnd-kit/core": "^6.3.1" } }),
	],
	[`${CATALOGUE}/@demo/hand/widget.tsx`, bareSource("hand")],
	[
		`${CATALOGUE}/@demo/greedy/manifest.generated.json`,
		JSON.stringify({
			id: "@demo/greedy",
			title: "Greedy",
			dependencies: { react: "^18.3.1" },
			widgetDependencies: ["@demo/clock"],
		}),
	],
	[`${CATALOGUE}/@demo/greedy/widget.tsx`, bareSource("greedy")],
]);

const onMachineOver = (files: ReadonlyMap<string, string>): SourceDisk => ({
	exists: async (at) => files.has(at) || [...files.keys()].some((held) => held.startsWith(`${at}/`)),
	read: async (at) => textIn(files.get(at), at),
	folders: async (at) => {
		const under = `${at}/`;
		const held = new Set<string>();
		for (const each of files.keys()) {
			if (!each.startsWith(under)) continue;
			const rest = each.slice(under.length);
			if (rest.includes("/")) held.add(under + rest.slice(0, rest.indexOf("/")));
		}
		return [...held];
	},
});

const noNetwork = async (): Promise<never> => {
	throw new Error("no network");
};

const fromTheShelf = createWidgetSource({ fetchJson: noNetwork, fetchText: noNetwork, disk: onMachineOver(shelf) });
const offered = await fromTheShelf.offersFrom({ path: CATALOGUE });

interface HeldProject extends AddProject {
	readonly written: Map<string, string>;
	readonly installs: string[];
}

function projectHolding(declares: AddProject["declares"]): HeldProject {
	const written = new Map<string, string>();
	const installs: string[] = [];
	return {
		written,
		installs,
		folder: "/app/src/widgets",
		declares,
		write: async (at, text) => {
			written.set(at, text);
		},
		install: async (packages: readonly WantedPackage[]) => {
			installs.push(...packages.map((held) => `${held.name}@${held.range}`));
			return { ok: true, failure: null };
		},
	};
}

const adding = (project: AddProject, wanted = "@demo/clock"): ReturnType<typeof addWidget> =>
	addWidget({ wanted, offers: offered, filesOf: (entry) => fromTheShelf.filesOf(entry), project, engine: ENGINE });

check(
	"the folder catalogue offers every widget in it, with no network anywhere near it",
	offered.map((entry) => entry.manifest["id"]).sort(),
	["@demo/clock", "@demo/face", "@demo/greedy", "@demo/hand"],
);

const older = projectHolding({ react: "^18.3.1" });
const refused = await adding(older);
check("a project whose react is outside the widget's range is refused", refused.ok, false);
check(
	"and the refusal names both ranges, and whose they are",
	refused.failure,
	"this project holds react at ^18.3.1 and @demo/clock needs ^19.2.8, so nothing was added. Raise the project, keep the older widget, or rewrite the widget against what is installed.",
);
check("and not one file was written", [...older.written.keys()], []);
check("and not one package was installed", older.installs, []);

const disagreeing = projectHolding({ react: "^19.2.8" });
const clashing = await adding(disagreeing, "@demo/greedy");
check(
	"two widgets that cannot hold one version of a package stop as hard",
	clashing.failure,
	"@demo/greedy needs react at ^18.3.1 and @demo/clock needs it at ^19.2.8, so nothing was added.",
);
check(
	"and that one changes nothing either",
	[[...disagreeing.written.keys()].length, disagreeing.installs.length],
	[0, 0],
);

const rangePairs: readonly (readonly [string, string, boolean])[] = [
	["^18.3.1", "^19.2.8", false],
	["^19.0.0", "^19.2.8", true],
	["~19.1.0", "^19.2.8", false],
	["~19.2.0", "^19.2.8", true],
	[">=18", "^19.2.8", true],
	["18.x || 19.x", "^19.2.8", true],
	["*", "^19.2.8", true],
	["19.2.8", "^19.2.8", true],
	["<19", "^19.2.8", false],
];
check(
	"a range is read as the versions it admits, not as its spelling",
	rangePairs.map(([one, other]) => rangesAgree(one, other)),
	rangePairs.map(([, , agree]) => agree),
);

const project = projectHolding({ react: "^19.0.0" });
const added = await adding(project);
check("adding a widget lands it", [added.ok, added.failure], [true, null]);
check("and everything it is built from, as deep as that goes", added.added, [
	"@demo/clock",
	"@demo/face",
	"@demo/hand",
]);
check("each into a folder of its own under the project's widgets", [...project.written.keys()].sort(), [
	"/app/src/widgets/@demo/clock/widget.css",
	"/app/src/widgets/@demo/clock/widget.tsx",
	"/app/src/widgets/@demo/face/widget.tsx",
	"/app/src/widgets/@demo/hand/widget.tsx",
	"/app/src/widgets/@demo/lib.js",
]);
check(
	"the catalogue's own card is not part of what the project gets",
	[...project.written.keys()].some((at) => at.endsWith("manifest.generated.json")),
	false,
);

check(
	"the source lands byte for byte as it was served",
	project.written.get("/app/src/widgets/@demo/clock/widget.tsx"),
	CLOCK_SOURCE,
);
check(
	"and so does the sheet beside it",
	project.written.get("/app/src/widgets/@demo/clock/widget.css"),
	".clock { color: red; }\n",
);

check(
	"what the project already holds at an agreeing range is left alone",
	project.installs.includes("react@^19.2.8"),
	false,
);
check("what it does not hold is installed into the root, the engine included", project.installs, [
	"widgetarium@^0.1.0",
	"@dnd-kit/core@^6.3.1",
]);

const bare = projectHolding(null);
const nowhere = await adding(bare);
check(
	"a folder with no package.json is refused",
	nowhere.failure,
	"this folder holds no package.json, and a widget's dependencies have nowhere to go without one.",
);
check("and nothing is written into it", [[...bare.written.keys()].length, bare.installs.length], [0, 0]);

const unknown = await adding(projectHolding({}), "@demo/nothing");
check(
	"a widget the catalogue does not offer is named, not guessed at",
	unknown.failure,
	'the catalogue offers no widget called "@demo/nothing".',
);

const REPOSITORY = "https://github.com/acme/widgets";
const raw = "https://raw.githubusercontent.com/acme/widgets/abc1234567";
const PUBLISHED_HAND = JSON.stringify({
	id: "@demo/hand",
	title: "Hand",
	dependencies: { "@dnd-kit/core": "^6.3.1" },
	files: ["manifest.generated.json", "widget.tsx"],
});
const SERVED: Readonly<Record<string, unknown>> = {
	"https://api.github.com/repos/acme/widgets/commits/main": { sha: "abc1234567" },
	"https://api.github.com/repos/acme/widgets/git/trees/abc1234567?recursive=1": {
		tree: [{ path: "widgets/@demo/hand/manifest.generated.json" }],
	},
	[`${raw}/widgets/@demo/hand/manifest.generated.json`]: PUBLISHED_HAND,
	[`${raw}/widgets/@demo/hand/widget.tsx`]: shelf.get(`${CATALOGUE}/@demo/hand/widget.tsx`),
};
const served = (url: string): unknown => {
	if (!(url in SERVED)) throw new Error(`404 ${url}`);
	return SERVED[url];
};
const fromTheRepository = createWidgetSource({
	fetchJson: async (url) => served(url),
	fetchText: async (url) => textIn(served(url), url),
	disk: null,
});
const remote = projectHolding({ "@dnd-kit/core": "^6.3.1" });
const fetched = await addWidget({
	wanted: "@demo/hand",
	offers: await fromTheRepository.offersFrom({ repository: REPOSITORY, ref: "main", path: "widgets" }),
	filesOf: (entry) => fromTheRepository.filesOf(entry),
	project: remote,
	engine: ENGINE,
});
check("a widget fetched from a repository lands the same way", [fetched.ok, fetched.added], [true, ["@demo/hand"]]);
check(
	"with the same source the repository served",
	remote.written.get("/app/src/widgets/@demo/hand/widget.tsx"),
	shelf.get(`${CATALOGUE}/@demo/hand/widget.tsx`),
);

console.log(`\n${failed === 0 ? `add: clean (${checks} checks)` : `add: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
