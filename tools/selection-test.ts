import { ancestorsOf, parentsOf, pickedHit } from "../apps/obsidian/src/design-selection.ts";
import type { Hit } from "../apps/obsidian/src/design-selection.ts";

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const leaf = (mark: string) => ({
	mark,
	kind: "widget" as const,
	name: mark,
	repeats: 1,
	isHeld: false,
	scope: "",
	children: [],
});
const layers = [
	{
		mark: "root",
		kind: "group" as const,
		name: "Group",
		repeats: 1,
		isHeld: false,
		scope: "",
		children: [
			{
				mark: "page",
				kind: "column" as const,
				name: "Page",
				repeats: 1,
				isHeld: false,
				scope: "",
				children: [
					{
						mark: "reach",
						kind: "column" as const,
						name: "Reach out",
						repeats: 1,
						isHeld: false,
						scope: "",
						children: [leaf("reach-list"), leaf("reach-button")],
					},
					{
						mark: "follow",
						kind: "column" as const,
						name: "Follow up",
						repeats: 1,
						isHeld: false,
						scope: "",
						children: [leaf("follow-list")],
					},
				],
			},
		],
	},
];
const parents = parentsOf(layers);
const box = { x: 0, y: 0, width: 1, height: 1 };
const hit = (mark: string, siblings: number): Hit => ({ mark, box, radius: 0, siblings });
const underReachList = [hit("root", 1), hit("page", 1), hit("reach", 2), hit("reach-list", 2)];
const underFollowList = [hit("root", 1), hit("page", 1), hit("follow", 2), hit("follow-list", 1)];

check(
	"with nothing picked a press picks the first level that branches, skipping lone wrappers",
	pickedHit(underReachList, parents, null, "level")?.mark,
	"reach",
);
check("a press inside what is picked keeps it", pickedHit(underReachList, parents, "reach", "level")?.mark, "reach");
check(
	"a double press goes one level deeper",
	pickedHit(underReachList, parents, "reach", "deeper")?.mark,
	"reach-list",
);
check(
	"a press on a sibling of what is picked stays at that level",
	pickedHit(underFollowList, parents, "reach-list", "level")?.mark,
	"follow",
);
const underReachButton = [hit("root", 1), hit("page", 1), hit("reach", 2), hit("reach-button", 2)];
check(
	"a press on a sibling inside the same group picks that sibling, not the group",
	pickedHit(underReachButton, parents, "reach-list", "level")?.mark,
	"reach-button",
);
check(
	"a press with the command key picks the deepest part",
	pickedHit(underReachList, parents, null, "deepest")?.mark,
	"reach-list",
);
check("a press on nothing picks nothing", pickedHit([], parents, "reach", "level"), null);
check(
	"every parent of a pick is known, so the tree can unfold to it",
	[...ancestorsOf(parents, "follow-list")],
	["follow", "page", "root"],
);

console.log(`\n${failed === 0 ? "selection: clean" : `selection: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
