import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "Event"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { ENGINE_SCOPE } = await import("./.mjs-cache/registry.mjs");
const { arrayGateway, soloGateway } = await import("./.mjs-cache/gateway/create.mjs");
const { useData } = await import("./.mjs-cache/gateway/use-data.mjs");
const { declarationIn, manifestOfModule } = await import("./.mjs-cache/gateway/declared.mjs");
const manifestOf = (props, metadata, layout) =>
	manifestOfModule({ default: { declared: defineProps(props) }, metadata, layout });

const {
	createWidget,
	IBaseGateway,
	ICrudGateway,
	IListGateway,
	IValueGateway,
	defineLayout,
	defineMetadata,
	defineProps,
	z,
} = ENGINE_SCOPE.api;

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

const TaskSchema = z.object({ title: z.string(), done: z.boolean().optional() });

class TasksInMemoryGateway extends ICrudGateway.of(TaskSchema).pick("list", "get", "update") {
	constructor(rows) {
		super();
		this.rows = rows;
		this.reads = 0;
	}

	list() {
		this.reads += 1;
		return { rows: this.rows, total: this.rows.length };
	}

	get(ref) {
		return this.rows.find((row) => row.ref === ref) ?? null;
	}

	update({ ref, data }) {
		this.rows = this.rows.map((row) => (row.ref === ref ? { ...row, ...data } : row));
		return this.rows.find((row) => row.ref === ref) ?? null;
	}
}

const props = defineProps({
	heading: IValueGateway.of(z.string().default("To do")).pick("get"),
	count: IValueGateway.of(z.number().default(0)).pick("get"),
	query: IValueGateway.of(z.string().default("")).pick("get", "update"),
	tasks: ICrudGateway.of(TaskSchema).pick("list", "update"),
});

const drawn = [];
const Probe = createWidget({
	inject: props,
	draw: (given) => {
		const rows = useData(given.tasks.list).data;
		drawn.push({
			heading: given.heading,
			count: given.count,
			query: typeof given.query === "object" ? given.query.value : "not a pair",
			canUpdateQuery: typeof given.query?.update === "function",
			titles: rows.map((row) => row.title),
			updates: given.tasks.update,
		});
		return h("b", null, given.heading);
	},
});

const host = document.getElementById("host");
const last = () => drawn[drawn.length - 1];

render(h(Probe, {}), host);
check("a prop nobody gave is drawn as its schema's default", last().heading, "To do");
check("and a list nobody gave is drawn empty", last().titles, []);

render(h(Probe, { heading: "Today", count: 3, tasks: [{ title: "Write" }, { title: "Ship" }] }), host);
check("a plain value is drawn as that value", last().heading, "Today");
check("a number is drawn as a number", last().count, 3);
check("a plain array reads through the list verb", last().titles, ["Write", "Ship"]);

render(h(Probe, { heading: soloGateway("From a gateway", {}, "declared-test/heading") }), host);
check("a gateway given instead of a value is read through its get", last().heading, "From a gateway");

render(h(Probe, { count: "three" }), host);
check("a value that does not fit is not replaced by the default: only a missing one is", last().count, "three");

check("a value that picked update is drawn with its value", last().query, "");
check("and with the verb that writes it", last().canUpdateQuery, true);

const inMemory = new TasksInMemoryGateway([{ ref: "a", title: "Write", done: false }]);
render(h(Probe, { tasks: inMemory }), host);
await new Promise((settle) => setTimeout(settle, 0));
check("an implementation given as a prop is read through its own list", last().titles, ["Write"]);
const readsBeforeTheWrite = inMemory.reads;
await last().updates({ ref: "a", data: { title: "Written" } });
await new Promise((settle) => setTimeout(settle, 0));
check(
	"and a write through it re-reads the list on screen",
	[inMemory.reads > readsBeforeTheWrite, last().titles],
	[true, ["Written"]],
);

let listedRows = null;
const Rows = createWidget({
	inject: { tasks: IListGateway.of(TaskSchema) },
	draw: ({ tasks }) => {
		listedRows = useData(tasks.list);
		return null;
	},
});
render(
	h(Rows, {
		tasks: new TasksInMemoryGateway([
			{ ref: "a", title: "Write", extra: "kept out" },
			{ ref: "b", title: 5 },
		]),
	}),
	host,
);
await new Promise((settle) => setTimeout(settle, 0));
check(
	"rows reach the widget as its gateway answers them: parsing is the gateway's, through context.parse",
	listedRows.data.map((row) => row.ref),
	["a", "b"],
);
check("and useData answers no refused list", "refused" in listedRows, false);

class BatchedTasks extends TasksInMemoryGateway {
	constructor(rows) {
		super(rows);
		this.calls = [];
	}

	create(data) {
		this.calls.push("create");
		return { ...data, ref: data.title };
	}

	createMany(rows) {
		this.calls.push("createMany");
		return { done: rows.map((row) => ({ ...row, ref: row.title })), failed: [] };
	}
}
let batched = null;
const Batched = createWidget({
	inject: { tasks: ICrudGateway.of(TaskSchema).pick("create") },
	draw: ({ tasks }) => {
		batched = tasks;
		return null;
	},
});
const batchedStore = new BatchedTasks([]);
render(h(Batched, { tasks: batchedStore }), host);
await batched.createMany([{ title: "One" }, { title: "Two" }]);
check("an implementation's own createMany is used instead of one create per row", batchedStore.calls, ["createMany"]);
check(
	"and the rows it is handed are held to the schema first",
	await batched.createMany([{ title: 5 }]).then(
		() => "accepted",
		(failure) => failure.message.includes("refused a create"),
	),
	true,
);

class IBoardsGateway extends ICrudGateway {}
const boardsDeclared = IBoardsGateway.of(TaskSchema).pick("update");
check(
	"an interface extending one of the three inherits of() from IBaseGateway, with its kind",
	[
		boardsDeclared.prototype instanceof IBoardsGateway,
		declarationIn(boardsDeclared).kind,
		declarationIn(boardsDeclared).writes,
	],
	[true, "collection", ["update"]],
);
check(
	"IBaseGateway.of() alone declares nothing",
	refusal(() => IBaseGateway.of(TaskSchema))?.startsWith("IBaseGateway.of() declares nothing"),
	true,
);
check(
	"defineProps refuses a class that does not extend IBaseGateway",
	refusal(() => defineProps({ tasks: class Tasks {} })),
	'prop "tasks" is a class that does not extend IBaseGateway, so it declares no gateway',
);

const NewTaskSchema = z.object({ title: z.string().min(1) });
const shaped = ICrudGateway.of({ create: NewTaskSchema, other: TaskSchema }).pick("get", "create", "update");
check(
	"of() takes a schema per verb, other standing for every verb not named, and pick passes over reads",
	[
		declarationIn(shaped).schema === TaskSchema,
		declarationIn(shaped).create === NewTaskSchema,
		declarationIn(shaped).writes,
	],
	[true, true, ["create", "update"]],
);
check(
	"of() refuses a key that is not a verb it reads",
	refusal(() => ICrudGateway.of({ read: TaskSchema, delete: TaskSchema })),
	'of() names "delete", which is not a schema it reads — it takes read, create, update and other',
);
check(
	"and a map naming no schema to read with",
	refusal(() => ICrudGateway.of({ create: NewTaskSchema })),
	"of() names no schema for reading — give read, or other for every verb not named",
);

let shapedTasks = null;
const Shaped = createWidget({
	inject: { tasks: shaped },
	draw: ({ tasks }) => {
		shapedTasks = tasks;
		return null;
	},
});
const shapedStore = new TasksInMemoryGateway([{ ref: "a", title: "Write" }]);
shapedStore.create = (data) => ({ ...data, ref: "made" });
render(h(Shaped, { tasks: shapedStore }), host);
const createRefusal = await shapedTasks.create({ title: "" }).then(
	() => null,
	(failure) => failure.message,
);
check(
	"a create its own schema refuses never reaches the implementation",
	createRefusal?.startsWith('prop "tasks" refused a create its schema does not accept'),
	true,
);
check("while one it accepts does", (await shapedTasks.create({ title: "Plan" }))?.ref, "made");
const updateRefusal = await shapedTasks.update({ ref: "a", data: { done: "yes" } }).then(
	() => null,
	(failure) => failure.message,
);
check("an update is held to a part of its schema", updateRefusal?.includes("done"), true);
check("and a partial one passes", (await shapedTasks.update({ ref: "a", data: { done: true } }))?.done, true);

check(
	"an implementation declared as a prop is refused: a widget declares the interface",
	refusal(() => defineProps({ tasks: TasksInMemoryGateway }))?.startsWith(
		'prop "tasks" is TasksInMemoryGateway, an implementation',
	),
	true,
);

const written = [];
const failingOn = (ref) => ref === "broken";
const rowsHeld = arrayGateway(
	[{ ref: "a", title: "Write" }],
	{
		get: (ref) => (ref === "a" ? { ref, title: "Write" } : null),
		create: (data) => {
			written.push(["create", data.title]);
			return { ref: data.title, ...data };
		},
		update: (patch) => {
			if (failingOn(patch.ref)) throw new Error("cannot write broken");
			written.push(["update", patch.ref]);
			return patch;
		},
		remove: (ref) => written.push(["remove", ref]),
	},
	"declared-test/many",
);
let many = null;
const Many = createWidget({
	inject: { tasks: ICrudGateway.of(TaskSchema) },
	draw: ({ tasks }) => {
		many = tasks;
		return null;
	},
});
render(h(Many, { tasks: rowsHeld }), host);
const createdMany = await many.createMany([{ title: "One" }, { title: "Two" }]);
check(
	"createMany creates every row through create",
	createdMany.done.map((row) => row.ref),
	["One", "Two"],
);
const updatedMany = await many.updateMany([
	{ ref: "a", data: { done: true } },
	{ ref: "broken", data: { done: true } },
]);
check(
	"updateMany answers which rows were written and which failed, without stopping at the first",
	[updatedMany.done.length, updatedMany.failed.map((held) => [held.input.ref, held.failure.message])],
	[1, [["broken", "cannot write broken"]]],
);
written.length = 0;
await many.upsert({ ref: "a", data: { title: "Again" } });
await many.upsert({ ref: "missing", data: { title: "Fresh" } });
check("upsert updates a row that exists and creates one that does not", written, [
	["update", "a"],
	["create", "Fresh"],
]);
await many.removeMany(["a"]);
check("removeMany removes through remove", written.at(-1), ["remove", "a"]);
check("a derived verb is allowed exactly when the verb under it is", many.createMany.can(), many.create.can());

const TitleSchema = z.string();
check(
	"a value picking nothing gives every verb of its interface",
	[declarationIn(IValueGateway.of(TitleSchema)).reads, declarationIn(IValueGateway.of(TitleSchema)).writes],
	[["get"], ["update", "remove"]],
);
check(
	"a list picking nothing only reads",
	[declarationIn(IListGateway.of(TaskSchema)).reads, declarationIn(IListGateway.of(TaskSchema)).writes],
	[["list", "get"], []],
);
check(
	"a crud picking nothing reads and writes everything",
	[declarationIn(ICrudGateway.of(TaskSchema)).reads, declarationIn(ICrudGateway.of(TaskSchema)).writes],
	[
		["list", "get"],
		["create", "update", "remove"],
	],
);
check(
	"a crud picking a write gets that write and no read",
	[
		declarationIn(ICrudGateway.of(TaskSchema).pick("update")).reads,
		declarationIn(ICrudGateway.of(TaskSchema).pick("update")).writes,
	],
	[[], ["update"]],
);

let pickedValues = null;
const PickedValues = createWidget({
	inject: {
		readAndWritten: IValueGateway.of(z.string().default("kept")).pick("get", "update"),
		readOnly: IValueGateway.of(z.string().default("kept")).pick("get"),
		writtenOnly: IValueGateway.of(z.string().default("kept")).pick("update"),
	},
	draw: (given) => {
		pickedValues = given;
		return null;
	},
});
render(h(PickedValues, {}), host);
check(
	"a value picking get and update draws its value beside the write",
	[pickedValues.readAndWritten?.value, typeof pickedValues.readAndWritten?.update],
	["kept", "function"],
);
check("a value picking only get draws the plain value", pickedValues.readOnly, "kept");
check(
	"a value picking only update draws the write and no value",
	[typeof pickedValues.writtenOnly?.update, "value" in (pickedValues.writtenOnly ?? {})],
	["function", false],
);

check(
	"pick refuses a verb the kind never writes",
	refusal(() => IValueGateway.of(z.string().default("")).pick("create")),
	'pick() names "create", which a value does not write — it writes update, remove',
);

check(
	"metadata describing a prop the widget does not declare is refused",
	refusal(() =>
		manifestOf(
			{ heading: props.heading },
			{ title: "Probe", description: "", props: { headline: { label: "Headline" } } },
			{ size: { preferredWidth: 320, preferredHeight: "auto" } },
		),
	),
	'metadata describes prop "headline", which props do not declare',
);

check(
	"a value whose schema has no default is refused like any prop without one",
	refusal(() =>
		manifestOf(
			{ heading: IValueGateway.of(z.string()) },
			{ title: "Probe", description: "" },
			{
				size: { preferredWidth: 320, preferredHeight: "auto" },
			},
		),
	)?.includes('prop "heading" declares no default'),
	true,
);

check(
	"a default naming a vault path is refused, however it is declared",
	refusal(() =>
		manifestOf(
			{ source: IValueGateway.of(z.object({ path: z.string() }).default({ path: "Journal" })) },
			{ title: "Probe", description: "" },
			{ size: { preferredWidth: 320, preferredHeight: "auto" } },
		),
	)?.includes('prop "source" defaults to a vault path'),
	true,
);

check(
	"defineProps refuses an entry that is not a declared gateway where it is written",
	refusal(() => defineProps({ heading: props.heading, placeholder: "Search" })),
	'prop "placeholder" is not a gateway declared with IValueGateway.of, IListGateway.of, ICrudGateway.of, ISlot.of, IMounts.of or one the host hands over (IHost, INavigator, …)',
);
check("and hands back the very props it was given", defineProps(props) === props, true);
check(
	"defineMetadata refuses a description of a prop the widget does not declare",
	refusal(() => defineMetadata(props, { title: "Probe", description: "", props: { headline: { label: "Headline" } } })),
	'metadata describes prop "headline", which props do not declare',
);
check(
	"defineLayout refuses a layout with no preferred size",
	refusal(() => defineLayout({ role: "control", size: { preferredWidth: 0, preferredHeight: "auto" } }))?.includes(
		"size names no preferredWidth",
	),
	true,
);

const failing = { ...soloGateway("unused", {}, "declared-test/failing") };
failing.get = Object.assign(() => Promise.reject(new Error("the note is gone")), {
	can: () => ({ can: true }),
	meta: { ...failing.get.meta, readNow: undefined, gatewayId: "declared-test/failing" },
});
const NotRead = createWidget({ inject: { heading: props.heading }, draw: () => h("b", { className: "drew" }, "drew") });
render(h(NotRead, { heading: failing }), host);
await new Promise((settle) => setTimeout(settle, 20));
render(h(NotRead, { heading: failing }), host);
check(
	"a value its gateway could not read shows which prop and why, instead of drawing on a default",
	[Boolean(host.querySelector(".drew")), host.querySelector(".wg-error code")?.textContent],
	[false, "heading: the note is gone"],
);

const Clock = createWidget({ draw: () => h("b", null, "12:00") });
check("a widget with no props is still the new form, not a legacy one", Boolean(Clock.declared), true);
check(
	"and its metadata and layout still reach the manifest",
	(() => {
		const clock = manifestOfModule({
			default: Clock,
			metadata: { title: "Clock", description: "The time." },
			layout: { role: "indicator", size: { preferredWidth: 120, preferredHeight: "auto" } },
		});
		return [clock.title, clock.role, Object.keys(clock.props)];
	})(),
	["Clock", "indicator", []],
);
check(
	"metadata describing a name every object inherits is refused like any stray",
	refusal(() => defineMetadata(props, { title: "Probe", description: "", props: { toString: { label: "Text" } } })),
	'metadata describes prop "toString", which props do not declare',
);
check(
	"metadata whose props is null is read as describing none",
	manifestOf(
		{ heading: props.heading },
		{ title: "Probe", description: "", props: null },
		{
			size: { preferredWidth: 320, preferredHeight: "auto" },
		},
	).props.heading.label,
	"Heading",
);
check(
	"defineLayout refuses a step that names no width it starts below",
	refusal(() =>
		defineLayout({
			size: { preferredWidth: 320, preferredHeight: "auto", at: [{ belowPx: 0, preferredWidth: "full" }] },
		}),
	)?.includes("size.at[0]"),
	true,
);

const manifest = manifestOf(
	{ tags: IListGateway.of(z.string(), { default: ["a"] }), query: props.query, tasks: props.tasks },
	{ title: "Probe", description: "A probe", props: { query: { label: "Search for" } } },
	{ role: "control", size: { preferredWidth: 320, preferredHeight: "auto" } },
);
check(
	"a list is a collection that only reads",
	[manifest.props.tags.kind, manifest.props.tags.writes],
	["collection", ["list", "get"]],
);
check("a list default travels as rows", manifest.props.tags.default, { rows: ["a"] });
check("a picked value asks for exactly what it picked", manifest.props.query.writes, ["get", "update"]);
check("the label comes from metadata", manifest.props.query.label, "Search for");
check("a narrowed crud asks for the verbs it kept", manifest.props.tasks.writes, ["list", "get", "update"]);
check("the layout reaches the manifest", [manifest.role, manifest.size.preferredWidth], ["control", 320]);

console.log(`\n${failed === 0 ? "declared props: clean" : `declared props: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
