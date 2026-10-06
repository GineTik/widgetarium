import { jsxElementsIn, parsedSource, withNodeMarks, NODE_MARK } from "../packages/core/src/engine/node-marks.ts";
import { movedNode } from "../packages/core/src/engine/node-moves.ts";

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const PAGE = `const PeoplePage = createWidget({
	inject: { getPeople: IQuery.expects(z.array(PersonSchema)) },
	draw: ({ getPeople: people }: { getPeople: readonly Person[] }) => (
		<Page kind="home" title="People">
			<div data-name="Main">
				<ReachOut getPeople={people} />
				<FollowUps getSteps={[]} />
			</div>
			<aside data-name="Side">
				<Birthdays getPeople={people} />
			</aside>
		</Page>
	),
});
`;

const startOf = (text: string, tag: string): number => text.indexOf(`<${tag}`);

const marked = withNodeMarks(PAGE, "widget.tsx");
check(
	"every JSX element of a page carries its place in the file",
	(marked.match(new RegExp(NODE_MARK, "g")) ?? []).length,
	6,
);
check(
	"the mark names the file and where the element starts",
	marked.includes(`<ReachOut ${NODE_MARK}="widget.tsx:${startOf(PAGE, "ReachOut")}"`),
	true,
);
check("and the marked page still parses", parsedSource(marked) !== null, true);

const intoSide = movedNode(PAGE, { from: startOf(PAGE, "ReachOut"), into: startOf(PAGE, "aside"), before: null });
const side = "source" in intoSide ? intoSide.source : "";
check(
	"a widget moved into another group stands at its end, at that group's indent",
	side.includes(`\t\t\t\t<Birthdays getPeople={people} />\n\t\t\t\t<ReachOut getPeople={people} />\n\t\t\t</aside>`),
	true,
);
check("and leaves its old group", side.includes(`<div data-name="Main">\n\t\t\t\t<FollowUps`), true);
check("and the page still parses after the move", parsedSource(side) !== null, true);

const beforeSibling = movedNode(PAGE, {
	from: startOf(PAGE, "FollowUps"),
	into: startOf(PAGE, "div"),
	before: startOf(PAGE, "ReachOut"),
});
check(
	"a widget moved before a sibling stands right above it",
	"source" in beforeSibling && beforeSibling.source.includes(`<FollowUps getSteps={[]} />\n\t\t\t\t<ReachOut`),
	true,
);
check(
	"a group cannot move into itself",
	"refusal" in movedNode(PAGE, { from: startOf(PAGE, "div"), into: startOf(PAGE, "div"), before: null }),
	true,
);
check(
	"a place that is no longer in the code is refused, never guessed",
	"refusal" in movedNode(PAGE, { from: 3, into: startOf(PAGE, "aside"), before: null }),
	true,
);
check(
	"an element count survives a move",
	jsxElementsIn(parsedSource(side) ?? { type: "File", start: 0, end: 0 }).length,
	6,
);

console.log(`\n${failed === 0 ? "node moves: clean" : `node moves: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
