const { ICrudGateway, IListGateway, IValueGateway, defineLayout, defineMigrations, defineProps, manifestOfModule, z } =
	await import("../packages/core/src/gateway/declared.ts");
const { migrationFrom } = await import("../packages/core/src/engine/compatibility.js");

let failures = 0;

function check(said, held, wanted) {
	const same = JSON.stringify(held) === JSON.stringify(wanted);
	if (!same) failures += 1;
	console.log(
		`${same ? "ok  " : "not ok"} ${said}${same ? "" : `\n      held ${JSON.stringify(held)}\n      want ${JSON.stringify(wanted)}`}`,
	);
}

function refusal(said, run, part) {
	let message = null;
	try {
		run();
	} catch (failure) {
		message = failure.message;
	}
	const refused = message !== null && message.includes(part);
	if (!refused) failures += 1;
	console.log(`${refused ? "ok  " : "not ok"} ${said}${refused ? "" : `\n      held ${message}`}`);
}

const FULL_WIDTH = { size: { preferredWidth: "full", preferredHeight: "auto" } };

const manifestWith = (props, described = {}, layout = FULL_WIDTH) =>
	manifestOfModule({
		default: { declared: defineProps(props) },
		metadata: { title: "Probe", description: "x", props: described },
		layout,
	});

const Entry = z.looseObject({
	done: z
		.boolean()
		.optional()
		.meta({ aka: ["complete"] }),
	title: z.string().optional(),
});

const made = manifestWith(
	{
		heading: IValueGateway.of(z.string().default("To do")).pick("get"),
		pageSize: IValueGateway.of(z.number().default(10)).pick("get"),
		archivedAt: IValueGateway.of(z.string().default("")).pick("get"),
		open: IValueGateway.of(z.boolean().default(false)).pick("get", "update"),
		wide: IValueGateway.of(z.boolean().default(false)).pick("get"),
		note: IValueGateway.of(z.string().default("")).pick("get"),
		face: IValueGateway.of(z.string().default("")).pick("get"),
		entries: ICrudGateway.of(Entry).pick("create", "update"),
		current: IValueGateway.of(z.unknown()).pick("get"),
		board: IValueGateway.of(z.unknown()).pick("get"),
	},
	{
		current: { source: { implementation: "@core/selection", fields: { rows: "entries", whenNothingPicked: "first" } } },
		board: {
			source: {
				implementation: "@core/selected-row",
				fields: { rows: "entries", picked: "current", whenNothingPicked: "first" },
			},
		},
		open: { keep: "screen" },
		pageSize: { design: true },
		note: { control: "text" },
		face: { control: "emoji" },
		entries: { describes: { title: "Name" } },
	},
);

check("a list gateway is a collection", made.props.entries.kind, "collection");
check("a value gateway is a value", made.props.heading.kind, "value");
check("a string draws a line", made.props.heading.control, "line");
check("a number draws a number", made.props.pageSize.control, "number");
check("a boolean draws a switch", made.props.wide.control, "boolean");
check("a kept value is memory", made.props.open.control, "memory");
check("a written control wins", made.props.note.control, "text");
check("an emoji is stored as a line", made.props.face.type, "line");
check("a selection source is a pick", made.props.current.control, "pick");
check("a selected-row source is the row", made.props.board.control, "row");
check("a label is read off the key", made.props.pageSize.label, "Page size");
check("a two-word key is spaced", made.props.archivedAt.label, "Archived at");
check("reads are never declared", made.props.entries.writes, ["list", "get", "create", "update"]);
check("a value reads with get", made.props.heading.writes, ["get"]);
check("a written value keeps its update", made.props.open.writes, ["get", "update"]);
check("a list default is stored under rows", made.props.entries.default, { rows: [] });
check("a value default comes from the schema and is stored under value", made.props.heading.default, {
	value: "To do",
});
check("a kept value says where it lives", made.props.open.default, { from: "memory", value: false });
check("a described field is an object", made.props.entries.describes.title, { label: "Name" });
check("design stays where metadata put it", made.props.pageSize.design, true);
check("the card carries no writes of its own", made.writes, undefined);

refusal(
	"a prop that is not a declared gateway is refused",
	() => manifestWith({ notes: { default: [] } }),
	'prop "notes" is not a gateway declared with',
);
refusal(
	"a default naming a path is refused",
	() => manifestWith({ notes: IValueGateway.of(z.unknown().default({ path: "Tasks" })).pick("get") }),
	"defaults to a vault path",
);
refusal(
	"a default whose rows name a path is refused too",
	() => manifestWith({ notes: IListGateway.of(z.unknown(), { default: [{ path: "Tasks/one.md" }] }) }),
	"defaults to a vault path",
);
refusal(
	"a path nested inside a default is refused too",
	() =>
		manifestWith({ notes: IValueGateway.of(z.unknown().default({ change: { path: "Tasks/one.md" } })).pick("get") }),
	"defaults to a vault path",
);
refusal(
	"a default object naming ref is refused, not only rows",
	() => manifestWith({ notes: IValueGateway.of(z.unknown().default({ ref: "abc", title: "One" })).pick("get") }),
	"data carrying ref",
);
refusal(
	"a value whose schema has no default is refused",
	() => manifestWith({ notes: IValueGateway.of(z.string()).pick("get") }),
	"declares no default",
);
refusal(
	"a described ref is refused",
	() => manifestWith({ notes: IListGateway.of(z.unknown()) }, { notes: { describes: { ref: "Address" } } }),
	"ref is the engine's name",
);
refusal(
	"a default row carrying a ref is refused",
	() => manifestWith({ notes: IListGateway.of(z.unknown(), { default: [{ ref: "r1", name: "One" }] }) }),
	"minted by the engine",
);
refusal(
	"a prop reading another that is not declared is refused",
	() =>
		manifestWith(
			{ current: IValueGateway.of(z.unknown()).pick("get") },
			{ current: { source: { implementation: "@core/selection", fields: { rows: "entries" } } } },
		),
	'prop "current" starts from a source whose rows is "entries", which props do not declare',
);
refusal(
	"options on a value's of() are refused",
	() => manifestWith({ current: IValueGateway.of(z.unknown(), { of: "entries" }).pick("get") }),
	"of() takes no options for a value",
);

refusal(
	"a module naming no preferred size is refused",
	() => manifestWith({}, {}, null),
	"size names no preferredWidth",
);
refusal(
	"and so is a step that names no region width, or no size",
	() =>
		defineLayout({
			size: {
				preferredWidth: 420,
				preferredHeight: "auto",
				at: [{ belowPx: 0, preferredWidth: "full" }, { belowPx: 400 }],
			},
		}),
	"size.at[0] needs a belowPx above 0 and a preferredWidth or preferredHeight of the same kinds; size.at[1]",
);
check(
	"while a preferred size with its steps passes",
	manifestWith(
		{},
		{},
		{
			size: {
				preferredWidth: 420,
				preferredHeight: 420,
				keepsRatio: true,
				at: [{ belowPx: 520, preferredWidth: "full" }],
			},
		},
	).size.keepsRatio,
	true,
);

const withImplementationVerb = manifestWith({ notes: ICrudGateway.of(Entry).pick("create", "replace") });
check("a verb an implementation supplies joins the writes", withImplementationVerb.props.notes.writes, [
	"list",
	"get",
	"create",
	"replace",
]);

const oldProps = { label: IValueGateway.of(z.string().default("")).pick("get") };
const migrations = defineMigrations([
	{ from: oldProps, run: (old) => ({ label: { from: "typed", value: String(old.label?.value ?? "").length } }) },
]);
const migrated = manifestOfModule({
	default: { declared: defineProps({ label: IValueGateway.of(z.number().default(0)).pick("get") }) },
	metadata: { title: "Probe", description: "x" },
	layout: FULL_WIDTH,
	migrations,
});
const oldManifest = manifestWith(oldProps);
check(
	"a migration declared beside the widget is found from the props a tile was made with",
	migrationFrom(migrated, oldManifest.props)?.run({ label: { value: "title" } }),
	{ label: { from: "typed", value: 5 } },
);
check(
	"and not from props it does not name",
	migrationFrom(migrated, manifestWith({ other: IValueGateway.of(z.string().default("")).pick("get") }).props),
	null,
);
refusal(
	"a migration naming no props it migrates from is refused",
	() => defineMigrations([{ from: {}, run: () => ({}) }]),
	"migration 1 names no props it migrates from",
);
refusal(
	"and so is one whose old props are not declared gateways",
	() => defineMigrations([{ from: { label: { default: "" } }, run: () => ({}) }]),
	'prop "label" is not a gateway declared with',
);

console.log(failures === 0 ? "manifest: every check passed" : `manifest: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
