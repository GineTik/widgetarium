import { JSDOM } from "jsdom";
import {
	declarationIn,
	manifestOfModule,
	IBaseGateway,
	ICrudGateway,
	IListGateway,
	IValueGateway,
	defineLayout,
	defineMetadata,
	defineProps,
	z,
} from "../packages/core/src/gateway/declared.ts";
import { byId } from "./dom-find.ts";
import type { DeclaredProps, DrawnProps, WidgetLayout } from "../packages/core/src/gateway/declared-types.ts";
import type { CreatedWidget } from "../packages/core/src/widget-api.js";
import { fieldIn } from "./held-fields.ts";
import { present } from "./page-dom.ts";
import { callAsUntypedSource, constructAsUntypedSource } from "./untyped-source.ts";
import type { Patch, RecordRef, Row, RowsResult } from "../packages/core/src/gateway/contract.ts";
import { rowOf } from "../packages/core/src/gateway/create.ts";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	Event: dom.window.Event,
});

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { arrayGateway, soloGateway } = await import("../packages/core/src/gateway/create.ts");
const { useData } = await import("../packages/core/src/gateway/use-data.ts");
const { createWidget } = await import("../packages/core/src/widget-api.js");

type ModuleParts = Parameters<typeof manifestOfModule>[0];

const manifestOf = (
	props: Parameters<typeof defineProps>[0],
	metadata: ModuleParts["metadata"],
	layout: ModuleParts["layout"],
): NonNullable<ReturnType<typeof manifestOfModule>> =>
	present(
		manifestOfModule({
			default: { declared: defineProps(props) },
			...(metadata ? { metadata } : {}),
			...(layout ? { layout } : {}),
		}),
		"the probe manifest",
	);

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

function refusal(run: () => unknown): string | null {
	try {
		run();
		return null;
	} catch (failure) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

const messageOf = (failure: unknown): string => (failure instanceof Error ? failure.message : String(failure));
const settleOnce = (): Promise<unknown> => new Promise((settle) => setTimeout(settle, 0));
const refOf = (address: string): RecordRef => rowOf({}, address).ref;

const TaskSchema = z.object({ title: z.string(), done: z.boolean().optional() });
type Task = z.infer<typeof TaskSchema>;

class TasksInMemoryGateway extends ICrudGateway.of(TaskSchema).pick("list", "get", "update") {
	reads = 0;

	constructor(public rows: Row<Task>[]) {
		super();
	}

	list(): RowsResult<Task> {
		this.reads += 1;
		return { rows: this.rows, total: this.rows.length };
	}

	get(ref: RecordRef): Row<Task> | null {
		return this.rows.find((row) => row.ref === ref) ?? null;
	}

	update({ ref, data }: Patch<Task>): Row<Task> | null {
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

interface Drawn {
	readonly heading: unknown;
	readonly count: unknown;
	readonly query: unknown;
	readonly canUpdateQuery: boolean;
	readonly titles: unknown[];
	readonly updates: (patch: Patch<Task>) => Promise<unknown>;
}

const drawn: Drawn[] = [];
const Probe = createWidget({
	inject: props,
	draw: (given) => {
		const rows = useData(given.tasks.list).data;
		drawn.push({
			heading: given.heading,
			count: given.count,
			query: typeof given.query === "object" ? given.query.value : "not a pair",
			canUpdateQuery: typeof given.query?.update === "function",
			titles: (rows ?? []).map((row) => row.title),
			updates: given.tasks.update,
		});
		return h("b", null, given.heading);
	},
});

const host = byId(document, "host");
const last = (): Drawn => present(drawn[drawn.length - 1], "a drawn probe");

render(h(Probe, {}), host);
check("a prop nobody gave is drawn as its schema's default", last().heading, "To do");
check("and a list nobody gave is drawn empty", last().titles, []);

render(h(Probe, { heading: "Today", count: 3, tasks: [{ title: "Write" }, { title: "Ship" }] }), host);
check("a plain value is drawn as that value", last().heading, "Today");
check("a number is drawn as a number", last().count, 3);
check("a plain array reads through the list verb", last().titles, ["Write", "Ship"]);

render(h(Probe, { heading: soloGateway("From a gateway", {}, "declared-test/heading") }), host);
check("a gateway given instead of a value is read through its get", last().heading, "From a gateway");

render(callAsUntypedSource(h, Probe, { count: "three" }), host);
check("a value that does not fit is not replaced by the default: only a missing one is", last().count, "three");

check("a value that picked update is drawn with its value", last().query, "");
check("and with the verb that writes it", last().canUpdateQuery, true);

const inMemory = new TasksInMemoryGateway([rowOf({ title: "Write", done: false }, "a")]);
render(h(Probe, { tasks: inMemory }), host);
await settleOnce();
check("an implementation given as a prop is read through its own list", last().titles, ["Write"]);
const readsBeforeTheWrite = inMemory.reads;
await last().updates({ ref: refOf("a"), data: { title: "Written" } });
await settleOnce();
check(
	"and a write through it re-reads the list on screen",
	[inMemory.reads > readsBeforeTheWrite, last().titles],
	[true, ["Written"]],
);

const listedRows: { held: ReturnType<typeof useData<void, RowsResult<Task>>> | null } = { held: null };
const Rows = createWidget({
	inject: { tasks: IListGateway.of(TaskSchema) },
	draw: ({ tasks }) => {
		listedRows.held = useData(tasks.list);
		return null;
	},
});
render(
	h(Rows, {
		tasks: constructAsUntypedSource(TasksInMemoryGateway, [
			{ ref: "a", title: "Write", extra: "kept out" },
			{ ref: "b", title: 5 },
		]),
	}),
	host,
);
await settleOnce();
const listed = present(listedRows.held, "the listed rows");
check(
	"rows reach the widget as its gateway answers them: parsing is the gateway's, through context.parse",
	(listed.data ?? []).map((row) => row.ref),
	["a", "b"],
);
check("and useData answers no refused list", "refused" in listed, false);

class BatchedTasks extends TasksInMemoryGateway {
	readonly calls: string[] = [];

	create(data: Partial<Task>): Row<Task> {
		this.calls.push("create");
		return rowOf<Task>(data, String(data.title));
	}

	createMany(rows: readonly Partial<Task>[]): { done: Row<Task>[]; failed: never[] } {
		this.calls.push("createMany");
		return { done: rows.map((row) => rowOf<Task>(row, String(row.title))), failed: [] };
	}
}

function caught<P extends DeclaredProps>(
	declared: P,
): { readonly widget: CreatedWidget<P>; read: () => DrawnProps<P> } {
	const held: { drawn?: DrawnProps<P> } = {};
	const widget = createWidget({
		inject: declared,
		draw: (drawnProps) => {
			held.drawn = drawnProps;
			return null;
		},
	});
	return { widget, read: () => present(held.drawn, "the drawn props") };
}

const batched = caught(defineProps({ tasks: ICrudGateway.of(TaskSchema).pick("create") }));
const batchedStore = new BatchedTasks([]);
render(h(batched.widget, { tasks: batchedStore }), host);
await batched.read().tasks.createMany([{ title: "One" }, { title: "Two" }]);
check("an implementation's own createMany is used instead of one create per row", batchedStore.calls, ["createMany"]);
const batchedTasks = batched.read().tasks;
check(
	"and the rows it is handed are held to the schema first",
	await callAsUntypedSource(batchedTasks.createMany.bind(batchedTasks), [{ title: 5 }]).then(
		() => "accepted",
		(failure: unknown) => messageOf(failure).includes("refused a create"),
	),
	true,
);

abstract class IBoardsGateway extends ICrudGateway {}
const boardsDeclared = IBoardsGateway.of(TaskSchema).pick("update");
check(
	"an interface extending one of the three inherits of() from IBaseGateway, with its kind",
	[
		boardsDeclared.prototype instanceof IBoardsGateway,
		declarationIn(boardsDeclared)?.kind,
		declarationIn(boardsDeclared)?.writes,
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
	refusal(() => callAsUntypedSource(defineProps, { tasks: class Tasks {} })),
	'prop "tasks" is a class that does not extend IBaseGateway, so it declares no gateway',
);

const NewTaskSchema = z.object({ title: z.string().min(1) });
const shaped = ICrudGateway.of({ create: NewTaskSchema, other: TaskSchema }).pick("get", "create", "update");
check(
	"of() takes a schema per verb, other standing for every verb not named, and pick passes over reads",
	[
		declarationIn(shaped)?.schema === TaskSchema,
		fieldIn(declarationIn(shaped), "create") === NewTaskSchema,
		declarationIn(shaped)?.writes,
	],
	[true, true, ["create", "update"]],
);
check(
	"of() refuses a key that is not a verb it reads",
	refusal(() => callAsUntypedSource(ICrudGateway.of.bind(ICrudGateway), { read: TaskSchema, delete: TaskSchema })),
	'of() names "delete", which is not a schema it reads — it takes read, create, update and other',
);
check(
	"and a map naming no schema to read with",
	refusal(() => callAsUntypedSource(ICrudGateway.of.bind(ICrudGateway), { create: NewTaskSchema })),
	"of() names no schema for reading — give read, or other for every verb not named",
);

const shapedCaught = caught(defineProps({ tasks: shaped }));
const shapedStore = Object.assign(new TasksInMemoryGateway([rowOf<Task>({ title: "Write" }, "a")]), {
	create: (data: Partial<Task>) => rowOf<Task>(data, "made"),
});
render(h(shapedCaught.widget, { tasks: shapedStore }), host);
const shapedTasks = shapedCaught.read().tasks;
const createRefusal = await shapedTasks.create({ title: "" }).then(
	() => null,
	(failure: unknown) => messageOf(failure),
);
check(
	"a create its own schema refuses never reaches the implementation",
	createRefusal?.startsWith('prop "tasks" refused a create its schema does not accept'),
	true,
);
check("while one it accepts does", (await shapedTasks.create({ title: "Plan" }))?.ref, "made");
const updateRefusal = await callAsUntypedSource(shapedTasks.update.bind(shapedTasks), {
	ref: "a",
	data: { done: "yes" },
}).then(
	() => null,
	(failure: unknown) => messageOf(failure),
);
check("an update is held to a part of its schema", updateRefusal?.includes("done"), true);
check("and a partial one passes", (await shapedTasks.update({ ref: refOf("a"), data: { done: true } }))?.done, true);

check(
	"an implementation declared as a prop is refused: a widget declares the interface",
	refusal(() => callAsUntypedSource(defineProps, { tasks: TasksInMemoryGateway }))?.startsWith(
		'prop "tasks" is TasksInMemoryGateway, an implementation',
	),
	true,
);

const written: unknown[][] = [];
const failingOn = (ref: unknown): boolean => ref === "broken";
const rowsHeld = arrayGateway(
	[{ ref: "a", title: "Write" }],
	{
		get: (ref: RecordRef) => (ref === "a" ? { ref, title: "Write" } : null),
		create: (data: Partial<Task>) => {
			written.push(["create", data.title]);
			return { ref: data.title, ...data };
		},
		update: (patch: Patch<Task>) => {
			if (failingOn(patch.ref)) throw new Error("cannot write broken");
			written.push(["update", patch.ref]);
			return patch;
		},
		remove: (ref: RecordRef) => written.push(["remove", ref]),
	},
	"declared-test/many",
);
const manyCaught = caught(defineProps({ tasks: ICrudGateway.of(TaskSchema) }));
render(h(manyCaught.widget, { tasks: rowsHeld }), host);
const many = manyCaught.read().tasks;
const createdMany = await many.createMany([{ title: "One" }, { title: "Two" }]);
check(
	"createMany creates every row through create",
	createdMany.done.map((row) => row?.ref),
	["One", "Two"],
);
const updatedMany = await many.updateMany([
	{ ref: refOf("a"), data: { done: true } },
	{ ref: refOf("broken"), data: { done: true } },
]);
check(
	"updateMany answers which rows were written and which failed, without stopping at the first",
	[updatedMany.done.length, updatedMany.failed.map((held) => [held.input.ref, messageOf(held.failure)])],
	[1, [["broken", "cannot write broken"]]],
);
written.length = 0;
await many.upsert({ ref: refOf("a"), data: { title: "Again" } });
await many.upsert({ ref: refOf("missing"), data: { title: "Fresh" } });
check("upsert updates a row that exists and creates one that does not", written, [
	["update", "a"],
	["create", "Fresh"],
]);
await many.removeMany([refOf("a")]);
check("removeMany removes through remove", written.at(-1), ["remove", "a"]);
check("a derived verb is allowed exactly when the verb under it is", many.createMany.can(), many.create.can());

const TitleSchema = z.string();
check(
	"a value picking nothing gives every verb of its interface",
	[declarationIn(IValueGateway.of(TitleSchema))?.reads, declarationIn(IValueGateway.of(TitleSchema))?.writes],
	[["get"], ["update", "remove"]],
);
check(
	"a list picking nothing only reads",
	[declarationIn(IListGateway.of(TaskSchema))?.reads, declarationIn(IListGateway.of(TaskSchema))?.writes],
	[["list", "get"], []],
);
check(
	"a crud picking nothing reads and writes everything",
	[declarationIn(ICrudGateway.of(TaskSchema))?.reads, declarationIn(ICrudGateway.of(TaskSchema))?.writes],
	[
		["list", "get"],
		["create", "update", "remove"],
	],
);
check(
	"a crud picking a write gets that write and no read",
	[
		declarationIn(ICrudGateway.of(TaskSchema).pick("update"))?.reads,
		declarationIn(ICrudGateway.of(TaskSchema).pick("update"))?.writes,
	],
	[[], ["update"]],
);

const pickedCaught = caught(
	defineProps({
		readAndWritten: IValueGateway.of(z.string().default("kept")).pick("get", "update"),
		readOnly: IValueGateway.of(z.string().default("kept")).pick("get"),
		writtenOnly: IValueGateway.of(z.string().default("kept")).pick("update"),
	}),
);
render(h(pickedCaught.widget, {}), host);
const pickedValues = pickedCaught.read();
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
	refusal(() => {
		const declaredValue = IValueGateway.of(z.string().default(""));
		return callAsUntypedSource(declaredValue.pick.bind(declaredValue), "create");
	}),
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
	refusal(() => callAsUntypedSource(defineProps, { heading: props.heading, placeholder: "Search" })),
	'prop "placeholder" is not a gateway declared with IValueGateway.of, IListGateway.of, ICrudGateway.of, ISlot.of, IMounts.of or one the host hands over (IHost, INavigator, …)',
);
check("and hands back the very props it was given", defineProps(props) === props, true);
check(
	"defineMetadata refuses a description of a prop the widget does not declare",
	refusal(() =>
		callAsUntypedSource(defineMetadata, props, {
			title: "Probe",
			description: "",
			props: { headline: { label: "Headline" } },
		}),
	),
	'metadata describes prop "headline", which props do not declare',
);
check(
	"defineLayout refuses a layout with no preferred size",
	refusal(() => defineLayout({ role: "control", size: { preferredWidth: 0, preferredHeight: "auto" } }))?.includes(
		"size names no preferredWidth",
	),
	true,
);

const failingSolo = soloGateway("unused", {}, "declared-test/failing");
const failing = {
	...failingSolo,
	get: Object.assign(() => Promise.reject(new Error("the note is gone")), {
		can: () => ({ can: true }),
		meta: { ...Object(fieldIn(failingSolo.get, "meta")), readNow: undefined, gatewayId: "declared-test/failing" },
	}),
};
const NotRead = createWidget({ inject: { heading: props.heading }, draw: () => h("b", { className: "drew" }, "drew") });
render(callAsUntypedSource(h, NotRead, { heading: failing }), host);
await new Promise((settle) => setTimeout(settle, 20));
render(callAsUntypedSource(h, NotRead, { heading: failing }), host);
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
		const clock = present(
			manifestOfModule({
				default: Clock,
				metadata: { title: "Clock", description: "The time." },
				layout: { role: "indicator", size: { preferredWidth: 120, preferredHeight: "auto" } },
			}),
			"the clock manifest",
		);
		return [clock.title, clock.role, Object.keys(clock.props)];
	})(),
	["Clock", "indicator", []],
);
check(
	"metadata describing a name every object inherits is refused like any stray",
	refusal(() =>
		callAsUntypedSource(defineMetadata, props, {
			title: "Probe",
			description: "",
			props: { toString: { label: "Text" } },
		}),
	),
	'metadata describes prop "toString", which props do not declare',
);
check(
	"metadata whose props is null is read as describing none",
	callAsUntypedSource(
		manifestOf,
		{ heading: props.heading },
		{ title: "Probe", description: "", props: null },
		{
			size: { preferredWidth: 320, preferredHeight: "auto" },
		},
	).props["heading"]?.label,
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
	[manifest.props["tags"]?.kind, manifest.props["tags"]?.writes],
	["collection", ["list", "get"]],
);
check("a list default travels as rows", manifest.props["tags"]?.default, { rows: ["a"] });
check("a picked value asks for exactly what it picked", manifest.props["query"]?.writes, ["get", "update"]);
check("the label comes from metadata", manifest.props["query"]?.label, "Search for");
check("a narrowed crud asks for the verbs it kept", manifest.props["tasks"]?.writes, ["list", "get", "update"]);
check("the layout reaches the manifest", [manifest.role, manifest.size?.preferredWidth], ["control", 320]);

const KindSchema = z.enum(["area", "bar"]).default("area");
const SIZE: WidgetLayout = { size: { preferredWidth: 320, preferredHeight: "auto" } };
check(
	"an enum behind a default offers its values as the options",
	manifestOf({ kind: IValueGateway.of(KindSchema).pick("get") }, { title: "Probe", description: "" }, SIZE).props[
		"kind"
	]?.options,
	[
		{ value: "area", label: "area" },
		{ value: "bar", label: "bar" },
	],
);
check(
	"options listed beside an enum must name exactly its values",
	refusal(() =>
		callAsUntypedSource(
			manifestOf,
			{ kind: IValueGateway.of(KindSchema).pick("get") },
			{
				title: "Probe",
				description: "",
				props: {
					kind: {
						label: "Kind",
						options: [
							{ value: "area", label: "An area" },
							{ value: "pie", label: "A pie" },
						],
					},
				},
			},
			SIZE,
		),
	),
	'prop "kind" lists the options ["area","pie"] beside a schema whose values are ["area","bar"]; the options must name exactly the values of the enum',
);

console.log(`\n${failed === 0 ? "declared props: clean" : `declared props: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
