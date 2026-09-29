const { resolveHostGateway } = await import("../packages/core/src/engine/host-gateways.js");
const { createGatewayRefs, createViewCells } = await import("../packages/core/src/gateway/refs.ts");
const { arrayGateway, soloGateway } = await import("../packages/core/src/gateway/create.ts");
const { problemsOf } = await import("../packages/core/src/gateway/problems.ts");
const { ICrudGateway, IValueGateway, defineProps, manifestOfModule, z } =
	await import("../packages/core/src/gateway/declared.ts");
const { createDeclaredWidget } = await import("../packages/core/src/declared-widget.js");

let failed = 0;
function check(what, got, wanted) {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

function refusal(run) {
	try {
		run();
		return null;
	} catch (failure) {
		return String(failure?.message ?? failure);
	}
}

const refs = createGatewayRefs();
const cellFor = createViewCells();
const TaskSchema = z.object({ title: z.string(), done: z.boolean().optional() });

let tasks = [
	{ ref: "a", path: "Tasks/a.md", title: "Water plants" },
	{ ref: "b", path: "Tasks/b.md", title: 7 },
];
const source = arrayGateway(() => tasks, {}, "problems-test/tasks");
refs.put("t1/tasks", source);
refs.put("t1/count", soloGateway("many", {}, "problems-test/count"));

const context = (name, implementation, ref, schema) => ({
	name,
	spec: { kind: implementation.endsWith("value") ? "value" : "collection", writes: [] },
	schema,
	tile: { id: "t2", props: { [name]: { implementation, fields: { ref } } } },
	refs,
	cellFor,
});

const listed = resolveHostGateway(context("tasks", "@core/from-tile-rows", "t1/tasks", TaskSchema));
const problems = problemsOf(refs);

check(
	"a built-in gateway hands over only the rows the widget's schema accepts",
	(await listed.list()).rows.map((row) => row.title),
	["Water plants"],
);
check(
	"and reports the row it left out under the name a person knows it by",
	problems
		.of("t2/tasks")
		.map((problem) => [problem.label, problem.ref, problem.issues.map((issue) => issue.path.join("."))]),
	[["Tasks/b.md", (await source.list()).rows[1].ref, ["title"]]],
);

tasks = [
	{ ref: "a", path: "Tasks/a.md", title: "Water plants" },
	{ ref: "b", path: "Tasks/b.md", title: "Pay rent" },
];
check(
	"a row fixed at its source comes back",
	(await listed.list()).rows.map((row) => row.title),
	["Water plants", "Pay rent"],
);
await Promise.resolve();
check("and its problem is gone", problems.of("t2/tasks"), []);

tasks = [
	{ ref: "a", path: "Tasks/same.md", title: 1 },
	{ ref: "b", path: "Tasks/same.md", title: 2 },
];
await listed.list();
check("two rows sharing a name are left out as two", problems.of("t2/tasks").length, 2);
tasks = [{ ref: "c", path: "Tasks/c.md", title: "Plan" }];
await listed.list();
check("a whole read forgets the rows its source no longer holds", problems.of("t2/tasks"), []);

const counted = resolveHostGateway(context("count", "@core/from-tile-value", "t1/count", z.number()));
check("a value its schema refuses is answered as missing", await counted.get(), null);
check(
	"and reported, never drawn as a default in silence",
	problems.of("t2/count").map((problem) => problem.issues.length),
	[1],
);

const LAYOUT = { role: "indicator", size: { preferredWidth: "full", preferredHeight: "auto" } };
const DayNoteSchema = z.object({
	date: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["created", "day"] }),
	done: z
		.number()
		.meta({ aka: ["kept"] })
		.optional(),
});
const days = { days: ICrudGateway.of(DayNoteSchema) };
const described = manifestOfModule({
	default: createDeclaredWidget(defineProps(days), () => null),
	metadata: { title: "Days", props: { days: { describes: { done: { label: "Kept", type: "number" } } } } },
	layout: LAYOUT,
});
check(
	"other names come from the schema, whichever wrapper carries them",
	Object.fromEntries(Object.entries(described.props.days.describes).map(([field, held]) => [field, held.aka])),
	{ done: ["kept"], date: ["created", "day"] },
);
check("and sit beside what metadata still says of the field", described.props.days.describes.done.label, "Kept");
const FaceSchema = z.object({
	tone: z
		.string()
		.optional()
		.meta({ aka: ["mood"] }),
});
const wrapped = manifestOfModule({
	default: createDeclaredWidget(
		defineProps({ face: IValueGateway.of(FaceSchema.default({})).pick("get") }),
		() => null,
	),
	metadata: { title: "Face" },
	layout: LAYOUT,
});
check("an object schema under a default still names its fields' other names", wrapped.props.face.describes?.tone?.aka, [
	"mood",
]);
check(
	"metadata naming aka is refused with the schema line that replaces it",
	refusal(() =>
		manifestOfModule({
			default: createDeclaredWidget(defineProps(days), () => null),
			metadata: { title: "Days", props: { days: { describes: { done: { aka: ["kept"] } } } } },
			layout: LAYOUT,
		}),
	),
	'prop "days" names aka for field "done" in metadata; other names belong to the schema: add .meta({ aka: [...] }) to the schema of done',
);

const { createWidget } = await import("../packages/core/src/widget-api.js");
check(
	"createWidget takes what it injects and how it draws",
	Object.keys(
		createWidget({ inject: { title: IValueGateway.of(z.string().default("Habit")).pick("get") }, draw: () => null })
			.declared,
	),
	["title"],
);
check(
	"and names the new form when handed the old one",
	refusal(() => createWidget(defineProps({}), () => null)),
	"createWidget takes what the widget injects and the function that draws it: createWidget({ inject: { ... }, draw: (props) => ... })",
);

console.log(`\n${failed === 0 ? "problems: clean" : `problems: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
