import type { z as Zod } from "zod";
import type { HostGatewayContext, HostGatewayHost } from "../packages/core/src/engine/engine-backed.js";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { HostGateway } from "../packages/core/src/engine/engine-backed.js";
import type { CollectionGateway } from "../packages/core/src/gateway/contract.js";
import type { DeclaredModule, WidgetLayout } from "../packages/core/src/gateway/declared-types.js";
import { runWidgetSource } from "./run-widget-source.ts";

const { resolveHostGateway } = await import("../packages/core/src/engine/host-gateways.js");
const { createGatewayRefs, createViewCells } = await import("../packages/core/src/gateway/refs.ts");
const { arrayGateway, soloGateway } = await import("../packages/core/src/gateway/create.ts");
const { problemsOf } = await import("../packages/core/src/gateway/problems.ts");
const { ICrudGateway, IValueGateway, defineProps, manifestOfModule, z } =
	await import("../packages/core/src/gateway/declared.ts");
const { createDeclaredWidget } = await import("../packages/core/src/declared-widget.js");

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
		return String((isObject(failure) ? failure["message"] : undefined) ?? failure);
	}
}

const pathIn = (value: unknown, ...keys: readonly string[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);

function collectionOf(gateway: HostGateway): CollectionGateway<unknown> {
	if (gateway.kind !== "collection") throw new Error(`${gateway.id} is no collection gateway`);
	return gateway;
}

function valueOf(gateway: HostGateway): Extract<HostGateway, { readonly kind: "value" }> {
	if (gateway.kind !== "value") throw new Error(`${gateway.id} is no value gateway`);
	return gateway;
}

const isDeclaring = (value: unknown): value is { readonly declared?: unknown } =>
	typeof value === "function" || isObject(value);

const isDeclaredModule = (value: unknown): value is DeclaredModule => isObject(value) && isDeclaring(value["default"]);

function declaredModuleOf(value: unknown): DeclaredModule {
	if (!isDeclaredModule(value)) throw new Error("the module declares no widget");
	return value;
}

const READS_NO_VAULT: HostGatewayHost = {
	slot: () => {
		throw new Error("the problems gate reads no vault");
	},
};

const refs = createGatewayRefs();
const cellFor = createViewCells();
const TaskSchema = z.object({ title: z.string(), done: z.boolean().optional() });

interface TaskRow {
	readonly ref: string;
	readonly path: string;
	readonly title: unknown;
}

let tasks: TaskRow[] = [
	{ ref: "a", path: "Tasks/a.md", title: "Water plants" },
	{ ref: "b", path: "Tasks/b.md", title: 7 },
];
const source = arrayGateway(() => tasks, {}, "problems-test/tasks");
refs.put("t1/tasks", source);
refs.put("t1/count", soloGateway("many", {}, "problems-test/count"));

const context = (
	name: string,
	implementation: string,
	ref: string,
	schema: Zod.ZodType | undefined,
): HostGatewayContext => ({
	name,
	spec: { kind: implementation.endsWith("value") ? "value" : "collection", writes: [] },
	schema,
	tile: { id: "t2", props: { [name]: { implementation, fields: { ref } } } },
	refs,
	cellFor,
	host: READS_NO_VAULT,
	propsRef: { current: {} },
	patchProp: () => {},
});

const listed = collectionOf(resolveHostGateway(context("tasks", "@core/from-tile-rows", "t1/tasks", TaskSchema)));
const problems = problemsOf(refs);

check(
	"a built-in gateway hands over only the rows the widget's schema accepts",
	(await listed.list()).rows.map((row) => pathIn(row, "title")),
	["Water plants"],
);
check(
	"and reports the row it left out under the name a person knows it by",
	problems
		.of("t2/tasks")
		.map((problem) => [problem.label, problem.ref, problem.issues.map((issue) => issue.path.join("."))]),
	[["Tasks/b.md", (await source.list()).rows[1]?.ref, ["title"]]],
);

tasks = [
	{ ref: "a", path: "Tasks/a.md", title: "Water plants" },
	{ ref: "b", path: "Tasks/b.md", title: "Pay rent" },
];
check(
	"a row fixed at its source comes back",
	(await listed.list()).rows.map((row) => pathIn(row, "title")),
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

const counted = valueOf(resolveHostGateway(context("count", "@core/from-tile-value", "t1/count", z.number())));
check("a value its schema refuses is answered as missing", await counted.get(), null);
check(
	"and reported, never drawn as a default in silence",
	problems.of("t2/count").map((problem) => problem.issues.length),
	[1],
);

const { JSDOM } = await import("jsdom");
const page = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, {
	window: page.window,
	document: page.window.document,
	Node: page.window.Node,
	Element: page.window.Element,
	HTMLElement: page.window.HTMLElement,
	SVGElement: page.window.SVGElement,
	getComputedStyle: page.window.getComputedStyle,
});
const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.ts");
const KindSchema = z.enum(["area", "bar"]);
const kindsDrawn: unknown[] = [];
const KindProbe = createDeclaredWidget(
	defineProps({ kind: IValueGateway.of(KindSchema.default("area")).pick("get") }),
	({ kind }) => {
		kindsDrawn.push(kind);
		return null;
	},
);
async function kindDrawnFrom(stored: string): Promise<unknown> {
	refs.put("t1/kind", soloGateway(stored, {}, `problems-test/kind-${stored}`));
	const kind = resolveHostGateway(context("kind", "@core/from-tile-value", "t1/kind", KindSchema));
	const drawnInto = document.createElement("div");
	render(h(KindProbe, { kind }), drawnInto);
	await new Promise((settle) => setTimeout(settle, 0));
	render(null, drawnInto);
	return kindsDrawn.at(-1);
}
check("an enum prop holding one of its values is drawn as that value", await kindDrawnFrom("bar"), "bar");
check("an enum prop holding a value outside the enum is drawn as its default", await kindDrawnFrom("pie"), "area");
check(
	"and the value it refused is reported beside the prop",
	problems.of("t2/kind").map((problem) => problem.issues.length),
	[1],
);

const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { propSchemaOf } = await import("../packages/core/src/surface/prop-gateway.ts");
const DRAWS_NOTHING = new Proxy({}, { get: () => () => null });
const FileRow = runWidgetSource(
	"registry/@flow/file-row/widget.tsx",
	(name) => (name === "widgetarium" ? ENGINE_SCOPE.api : DRAWS_NOTHING),
	h,
	null,
)["default"];
async function fileRowDrawnFrom(stored: Readonly<Record<string, unknown>>): Promise<unknown> {
	refs.put("t1/file", soloGateway(stored, {}, `problems-test/file-${JSON.stringify(stored)}`));
	const schema = propSchemaOf({ component: isDeclaring(FileRow) ? FileRow : null }, "file");
	return valueOf(resolveHostGateway(context("file", "@core/from-tile-value", "t1/file", schema))).get();
}
check(
	"a shipped widget's schema hands over the record it accepts",
	await fileRowDrawnFrom({ filePath: "src/tree.js", added: 3 }),
	{ filePath: "src/tree.js", added: 3 },
);
check(
	"and answers a record its schema refuses as missing",
	await fileRowDrawnFrom({ filePath: "src/tree.js", added: true }),
	null,
);
check(
	"naming the field it refused beside the prop",
	problems.of("t2/file").flatMap((problem) => problem.issues.map((issue) => issue.path.join("."))),
	["added"],
);

const LAYOUT: WidgetLayout = { role: "indicator", size: { preferredWidth: "full", preferredHeight: "auto" } };
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
// TODO: Described types describes as never, so a module describing fields is narrowed by a guard
const described = manifestOfModule(
	declaredModuleOf({
		default: createDeclaredWidget(defineProps(days), () => null),
		metadata: { title: "Days", props: { days: { describes: { done: { label: "Kept", type: "number" } } } } },
		layout: LAYOUT,
	}),
);
const describedDays = pathIn(described, "props", "days", "describes");
check(
	"other names come from the schema, whichever wrapper carries them",
	Object.fromEntries(
		Object.entries(isObject(describedDays) ? describedDays : {}).map(([field, held]) => [field, pathIn(held, "aka")]),
	),
	{ done: ["kept"], date: ["created", "day"] },
);
check("and sit beside what metadata still says of the field", pathIn(describedDays, "done", "label"), "Kept");
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
check(
	"an object schema under a default still names its fields' other names",
	pathIn(wrapped, "props", "face", "describes", "tone", "aka"),
	["mood"],
);
check(
	"metadata naming aka is refused with the schema line that replaces it",
	refusal(() =>
		manifestOfModule(
			declaredModuleOf({
				default: createDeclaredWidget(defineProps(days), () => null),
				metadata: { title: "Days", props: { days: { describes: { done: { aka: ["kept"] } } } } },
				layout: LAYOUT,
			}),
		),
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
	refusal(() => {
		Reflect.apply(createWidget, undefined, [defineProps({}), () => null]);
	}),
	"createWidget takes what the widget injects and the function that draws it: createWidget({ inject: { ... }, draw: (props) => ... })",
);

console.log(`\n${failed === 0 ? "problems: clean" : `problems: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
