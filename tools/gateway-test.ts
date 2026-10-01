import esbuild from "esbuild";
import { TEXT_LOADERS } from "../apps/obsidian/build.mts";
import { fieldAt, fieldIn, itemsIn } from "./held-fields.ts";
import { present } from "./page-dom.ts";
import { standIn } from "./stand-in.ts";
import { callAsUntypedSource } from "./untyped-source.ts";
import type { ActionMeta } from "../packages/core/src/gateway/create.ts";
import type { FieldType } from "../packages/core/src/gateway/fields.ts";
import type { FileHost } from "../packages/core/src/gateway/obsidian.ts";

type GatewayBundle = typeof import("../packages/core/src/gateway/create.ts") &
	typeof import("../packages/core/src/gateway/refs.ts") &
	typeof import("../packages/core/src/gateway/cache.ts") &
	typeof import("../packages/core/src/gateway/props.ts") &
	typeof import("../packages/core/src/gateway/narrow.ts") &
	typeof import("../packages/core/src/gateway/match.ts") &
	typeof import("../packages/core/src/gateway/fields.ts") &
	typeof import("../packages/core/src/gateway/operators.ts") &
	typeof import("../packages/core/src/gateway/obsidian.ts");

const built = await esbuild.build({
	stdin: {
		contents: `export * from "./packages/core/src/gateway/create"; export * from "./packages/core/src/gateway/refs"; export * from "./packages/core/src/gateway/cache"; export * from "./packages/core/src/gateway/props.js"; export * from "./packages/core/src/gateway/narrow"; export * from "./packages/core/src/gateway/match"; export * from "./packages/core/src/gateway/fields"; export * from "./packages/core/src/gateway/operators"; export * from "./packages/core/src/gateway/obsidian.js";`,
		resolveDir: process.cwd(),
		loader: "js",
	},
	bundle: true,
	loader: TEXT_LOADERS,
	write: false,
	format: "esm",
	platform: "neutral",
	logLevel: "silent",
});
const bundled: object = await import(
	`data:text/javascript;base64,${Buffer.from(present(built.outputFiles[0], "the gateway bundle").text).toString("base64")}`
);
const gateway = standIn<GatewayBundle>(
	bundled,
	[
		"arrayGateway",
		"hardcodeCollection",
		"hardcodeValue",
		"createGatewayCache",
		"normalizeWhere",
		"narrow",
		"fieldsOf",
		"conditionsFor",
		"rowFor",
		"conditionById",
		"conditionOfRow",
		"valueGateway",
		"collectionGateway",
		"createPickedGateway",
		"createGatewayRefs",
		"refCollection",
		"fileGateway",
		"noteFieldOf",
	],
	"gateway bundle",
);

let failed = 0;
function check(name: string, ok: unknown, detail: unknown = ""): void {
	if (ok) {
		console.log(`ok   ${name}`);
		return;
	}
	failed += 1;
	console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const tick = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0));

function isActionMeta(held: unknown): held is ActionMeta {
	return typeof fieldIn(held, "gatewayId") === "string" && typeof fieldIn(held, "subscribe") === "function";
}

function metaOf(verb: unknown): ActionMeta {
	const meta = fieldIn(verb, "meta");
	if (!isActionMeta(meta)) throw new TypeError("this verb carries no meta");
	return meta;
}

const nthOf = (held: unknown, at: number): unknown => itemsIn(held)[at];
const messageOf = (failure: unknown): string => String(failure instanceof Error ? failure.message : undefined);

{
	const tasks = gateway.arrayGateway(["To Do", "Doing"], {}, "tasks");
	const listed = await tasks.list();
	check(
		"array: lists wrapped rows",
		listed.total === 2 && listed.rows[0]?.ref === "i0" && fieldIn(listed.rows[0], "value") === "To Do",
	);
	check("array: unimplemented create refuses", tasks.create.can().can === false);
	const refused = await callAsUntypedSource(tasks.create, "x").then(
		() => null,
		(failure: unknown) => failure,
	);
	check(
		"array: refused create rejects with the reason",
		refused instanceof Error && refused.message.includes("create"),
	);
}

{
	let heard = 0;
	const made: unknown[] = [];
	const tasks = gateway.arrayGateway(
		() => made,
		{
			create: (draft: unknown) => {
				made.push(draft);
				return { ...Object(draft), ref: `i${made.length - 1}` };
			},
		},
		"tasks2",
	);
	tasks.subscribe(() => {
		heard += 1;
	});
	check("array: implemented create answers can", tasks.create.can().can === true);
	await callAsUntypedSource(tasks.create, "Done");
	check("array: a mutation notifies subscribers", heard === 1);
	check("array: list sees the handler's write", (await tasks.list()).total === 1);
	await tasks.list();
	check("array: a read notifies nobody", heard === 1);
}

{
	let stored: unknown = [];
	const behind = gateway.hardcodeCollection({
		id: "behind",
		readValue: () => [],
		mutateValue: (step) => {
			stored = step(stored);
		},
	});
	await behind.create("first");
	await behind.create("second");
	check("hardcode: batched creates land through the mutator, not the read", itemsIn(stored).length === 2);
}

{
	let stored: unknown = [];
	const columns = gateway.hardcodeCollection({
		id: "cols",
		readValue: () => stored,
		mutateValue: (step) => {
			stored = step(stored);
		},
	});
	await columns.create("Test");
	await columns.create("Test");
	check(
		"hardcode: create mints distinct refs",
		itemsIn(stored).length === 2 && fieldIn(nthOf(stored, 0), "id") !== fieldIn(nthOf(stored, 1), "id"),
	);
	const rows = (await columns.list()).rows;
	const first = present(rows[0], "the first column");
	const second = present(rows[1], "the second column");
	await columns.update({ ref: first.ref, data: "Renamed" });
	check(
		"hardcode: update by ref survives duplicate values",
		fieldIn(nthOf(stored, 0), "value") === "Renamed" && fieldIn(nthOf(stored, 1), "value") === "Test",
	);
	await columns.update({ ref: second.ref, data: { props: { title: "Kept" } } });
	await columns.update({ ref: second.ref, data: { props: { hidden: true } } });
	check(
		"hardcode: an object update patches instead of replacing",
		fieldAt(nthOf(stored, 1), "value", "title") === "Kept" && fieldAt(nthOf(stored, 1), "value", "hidden") === true,
	);
	check(
		"hardcode: a patched field lands on the row itself, where a typed list is read",
		fieldAt(nthOf(stored, 1), "value", "props") === undefined,
	);
	await columns.remove(second.ref);
	check(
		"hardcode: remove by ref drops one row",
		itemsIn(stored).length === 1 && fieldIn(nthOf(stored, 0), "value") === "Renamed",
	);
}

{
	let stored: unknown = [{ label: "Kanban" }, { label: "Archived columns" }];
	const options = gateway.hardcodeCollection({
		id: "options",
		readValue: () => stored,
		mutateValue: (step) => {
			stored = step(stored);
		},
	});
	const rows = (await options.list()).rows;
	await options.update({ ref: present(rows[1], "the second option").ref, data: { props: { isSelected: false } } });
	await options.update({ ref: present(rows[0], "the first option").ref, data: { props: { isSelected: true } } });
	check(
		"hardcode: a write leaves alone the ref of the row it did not name",
		fieldAt(nthOf(stored, 0), "value", "isSelected") === true &&
			fieldAt(nthOf(stored, 1), "value", "isSelected") === false,
	);
}

{
	const cache = gateway.createGatewayCache();
	let pulls = 0;
	const tasks = gateway.arrayGateway(
		() => {
			pulls += 1;
			return ["a"];
		},
		{},
		"cached",
	);
	const meta = metaOf(tasks.list);
	let woke = 0;
	const stop = cache.subscribe(
		meta,
		undefined,
		() => tasks.list(),
		() => {
			woke += 1;
		},
	);
	await tick();
	check("cache: subscribing fetches once", pulls === 1 && woke === 1);
	const first = cache.read(meta, undefined);
	check("cache: a snapshot is ready data", first.status === "ready" && fieldIn(first.data, "total") === 1);
	check("cache: an unchanged snapshot keeps its reference", cache.read(meta, undefined) === first);

	const other = gateway.arrayGateway(["b"], {}, "other");
	let otherWoke = 0;
	const stopOther = cache.subscribe(
		metaOf(other.list),
		undefined,
		() => other.list(),
		() => {
			otherWoke += 1;
		},
	);
	await tick();
	cache.invalidate("cached");
	await tick();
	check("cache: invalidation refetches its own gateway", pulls === 2 && woke === 2);
	check("cache: invalidation leaves other gateways alone", otherWoke === 1);
	stop();
	stopOther();
}

{
	const live: unknown[] = [];
	const tasks = gateway.arrayGateway(
		() => live.slice(),
		{
			create: (draft: unknown) => {
				live.push(draft);
			},
		},
		"live",
	);
	const cache = gateway.createGatewayCache();
	const meta = metaOf(tasks.list);
	let woke = 0;
	cache.subscribe(
		meta,
		undefined,
		() => tasks.list(),
		() => {
			woke += 1;
		},
	);
	await tick();
	await callAsUntypedSource(tasks.create, "fresh");
	await tick();
	const seen = cache.read(meta, undefined);
	check(
		"cache: a gateway mutation invalidates through subscribe",
		seen.status === "ready" && fieldIn(seen.data, "total") === 1,
	);
}

{
	const where = gateway.normalizeWhere(
		{ board: "Widgetarium", status: { in: ["To Do"] }, due: { gt: "a", lt: "b" }, empty: "" },
		"tile/tasks",
	);
	check(
		"normalize: a bare value is shorthand for is",
		JSON.stringify(where[0]) === JSON.stringify({ prop: "board", op: "is", value: "Widgetarium", by: "tile/tasks" }),
	);
	check("normalize: an operator map keeps its operator", where[1]?.op === "in" && Array.isArray(where[1]?.value));
	check("normalize: two operators on one prop are two rows", where.filter((row) => row.prop === "due").length === 2);
	check(
		"normalize: an unset value is no clause at all",
		where.every((row) => row.prop !== "empty"),
	);
	check(
		"normalize: every row says where it came from",
		where.every((row) => row.by === "tile/tasks"),
	);
	check("normalize: a bare list is an in", gateway.normalizeWhere({ tags: ["a", "b"] })[0]?.op === "in");
}

{
	const rows = [
		{ name: "One", props: { board: "A", order: 2 } },
		{ name: "Two", props: { board: "B", order: 1 } },
		{ name: "Three", props: { board: "A", order: 10 } },
	];
	const tasks = gateway.arrayGateway(rows, {}, "queried");
	const filtered = await tasks.list({ where: [{ prop: "board", op: "is", value: "A" }] });
	check(
		"query: where narrows the rows a typed list answers",
		filtered.total === 2 && filtered.rows.every((row) => row.props.board === "A"),
	);
	const sorted = await tasks.list({ sort: [{ prop: "order", dir: "asc" }] });
	check("query: sort orders numbers as numbers", sorted.rows.map((row) => row.props.order).join(",") === "1,2,10");
	const descending = await tasks.list({ sort: [{ prop: "order", dir: "desc" }] });
	check("query: desc reverses it", descending.rows.map((row) => row.props.order).join(",") === "10,2,1");
	const limited = await tasks.list({ where: [{ prop: "board", op: "is", value: "A" }], limit: 1 });
	check("query: total counts what matched, not what was returned", limited.rows.length === 1 && limited.total === 2);
}

{
	const rows = [
		{ name: "One", props: { board: "A" } },
		{ name: "Two", props: { board: "B" } },
	];
	const tasks = gateway.arrayGateway(rows, { update: () => null }, "narrowable");
	const onA = gateway.narrow(tasks, { board: "A" });
	const onB = gateway.narrow(tasks, { board: "B" });
	check("narrow: two narrowings of one folder are two ids", onA.id !== onB.id && onA.id !== tasks.id);
	check("narrow: each answers its own rows", (await onA.list()).total === 1 && (await onB.list()).total === 1);
	check("narrow: and they are not the same row", (await onA.list()).rows[0]?.name === "One");
	check(
		"narrow: a second narrowing at the call site still applies",
		(await onA.list({ where: [{ prop: "name", op: "is", value: "Two" }] })).total === 0,
	);
	check("narrow: nothing to narrow by is the base itself", gateway.narrow(tasks, { board: "" }) === tasks);
	check("narrow: a write the base allows is offered", onA.update.can().can === true);
	check("narrow: a write the base refuses stays refused", onA.create.can().can === false);
	check(
		"narrow: useData reads the wrapper through meta",
		typeof fieldAt(onA.list, "meta", "gatewayId") === "string" && fieldAt(onA.list, "meta", "gatewayId") === onA.id,
	);
}

{
	const live: unknown[] = [{ name: "One", props: { board: "A" } }];
	const tasks = gateway.arrayGateway(
		() => live.slice(),
		{
			create: (draft: unknown) => {
				live.push(draft);
			},
		},
		"shared-store",
	);
	const onA = gateway.narrow(tasks, { board: "A" });
	const onB = gateway.narrow(tasks, { board: "B" });
	const cache = gateway.createGatewayCache();
	let woke = 0;
	cache.subscribe(
		metaOf(onB.list),
		undefined,
		() => onB.list(),
		() => {
			woke += 1;
		},
	);
	await tick();
	await callAsUntypedSource(onA.create, { name: "Two", props: { board: "B" } });
	await tick();
	check(
		"narrow: a write through one wrapper redraws the other",
		fieldIn(cache.read(metaOf(onB.list), undefined).data, "total") === 1,
	);
}

{
	const records = [
		{ props: { title: "One", status: "Doing", order: 1, due: "2026-09-01", tags: ["a", "b"], done: false } },
		{ props: { title: "Two", status: "Done", order: 2, due: "2026-09-02", tags: ["b"], done: true } },
	];
	const found = gateway.fieldsOf(records);
	const typeOf = (prop: string): FieldType | undefined => found.find((field) => field.prop === prop)?.type;
	const valuesOf = (prop: string): string | undefined => found.find((field) => field.prop === prop)?.values.join(",");
	check(
		"fields: every property the notes carry is offered, in one order",
		found.map((field) => field.prop).join(",") === "done,due,order,status,tags,title",
		found.map((field) => field.prop).join(","),
	);
	check("fields: a property holding days is a date", typeOf("due") === "date", typeOf("due"));
	check("fields: one holding numbers is a number", typeOf("order") === "number", typeOf("order"));
	check("fields: one holding a list is a list", typeOf("tags") === "list", typeOf("tags"));
	check("fields: one holding true and false is a boolean", typeOf("done") === "boolean", typeOf("done"));
	check("fields: the values it holds come back deduplicated", valuesOf("tags") === "a,b", valuesOf("tags"));
	check(
		"fields: a record with no props of its own is read flat",
		gateway
			.fieldsOf([{ status: "To Do" }])
			.map((field) => field.prop)
			.join(",") === "status",
	);

	const said = (type: FieldType): string =>
		gateway
			.conditionsFor(type)
			.map((kind) => kind.label)
			.join(", ");
	check(
		"operators: text is compared the way text is",
		said("text") === "is, is not, contains, is empty, is not empty",
		said("text"),
	);
	check(
		"operators: a number is compared by size, never by containing",
		said("number") === "is, is not, is greater than, is less than, is empty, is not empty",
		said("number"),
	);
	check(
		"operators: a list is asked what it has",
		said("list") === "has any of, has none of, is empty, is not empty",
		said("list"),
	);
	check(
		"operators: a boolean is only ticked or not",
		said("boolean") === "is checked, is not checked",
		said("boolean"),
	);

	const written = (type: FieldType, id: string, value: unknown): string =>
		JSON.stringify(gateway.rowFor("status", present(gateway.conditionById(type, id), `the ${id} condition`), value));
	check(
		"operators: a condition that needs no value carries the value itself",
		written("text", "empty", "ignored") === '{"prop":"status","op":"exists","value":false}',
		written("text", "empty", "ignored"),
	);
	check(
		"operators: and one that needs a value takes the one given",
		written("text", "isNot", "Done") === '{"prop":"status","op":"ne","value":"Done"}',
		written("text", "isNot", "Done"),
	);
	check(
		"operators: a written row is read back as the condition that wrote it",
		gateway.conditionOfRow("text", { prop: "status", op: "exists", value: false })?.id === "empty",
	);
	check(
		"operators: the two that share an operator are told apart by their value",
		gateway.conditionOfRow("text", { prop: "status", op: "exists", value: true })?.id === "filled",
	);
}

{
	const cache = gateway.createGatewayCache();
	const held = gateway.hardcodeValue({ id: "typed", readValue: () => 14, mutateValue: () => {} });
	const first = cache.read(metaOf(held.get), undefined);
	check(
		"first frame: a value kept in the tile is ready before anything subscribes",
		first.status === "ready" && first.data === 14,
		JSON.stringify(first),
	);

	const rows = gateway.hardcodeCollection({
		id: "typed-rows",
		readValue: () => ["To Do", "Doing"],
		mutateValue: () => {},
	});
	const listed = cache.read(metaOf(rows.list), undefined);
	check(
		"first frame: and so is a list kept in the tile",
		listed.status === "ready" && fieldIn(listed.data, "total") === 2,
		JSON.stringify(listed),
	);

	const away = gateway.valueGateway({ id: "away", handlers: { get: async () => 14 } });
	check(
		"first frame: a source that has to go and look is still loading",
		cache.read(metaOf(away.get), undefined).status === "loading",
	);
}

{
	interface Named {
		readonly name: string;
	}
	interface Picking {
		readonly all: readonly Named[];
		readonly chosen: string;
		readonly canWriteRows: boolean;
		readonly inTile?: ReturnType<typeof gateway.valueGateway>;
	}
	const board: Named = { name: "Marketing" };
	const rowsOf = (all: readonly Named[]): { rows: (Named & { ref: string })[]; total: number } => ({
		rows: all.map((value, at) => ({ ...value, ref: `r${at}` })),
		total: all.length,
	});
	const written: unknown[] = [];
	const pickedOver = ({ all, chosen, canWriteRows, inTile }: Picking): ReturnType<typeof gateway.createPickedGateway> =>
		gateway.createPickedGateway({
			id: "board/board",
			chosen: gateway.valueGateway({ id: "chosen", handlers: { get: async () => chosen } }),
			collection: gateway.collectionGateway({
				id: "boards",
				handlers: {
					list: async () => rowsOf(all),
					...(canWriteRows ? { update: async (given: unknown) => written.push(given) } : {}),
				},
			}),
			fieldName: "name",
			isFallbackToFirst: false,
			...(inTile ? { inTile } : {}),
		});

	const named = pickedOver({ all: [board], chosen: "Marketing", canWriteRows: true });
	check("a picked row says it can be written", named.update.can().can === true);
	await named.update({ columns: ["To Do"] });
	check(
		"and the write lands on the row the selection names",
		fieldIn(written.at(-1), "ref") === "r0",
		JSON.stringify(written.at(-1)),
	);

	const lost = pickedOver({ all: [board], chosen: "A board that left", canWriteRows: true });
	check(
		"a selection naming no row still reports it can be written, because a row is writable",
		lost.update.can().can === true,
	);
	const refusal = await lost.update({ columns: [] }).then(
		() => null,
		(failure: unknown) => messageOf(failure),
	);
	check(
		"but the write itself refuses out loud instead of answering nothing",
		Boolean(refusal),
		JSON.stringify(refusal),
	);
	check("naming what it could not write to", refusal?.includes("Neither"), JSON.stringify(refusal));

	const kept: unknown[] = [];
	const inTile = gateway.valueGateway({
		id: "in-tile",
		handlers: { get: async () => ({ columns: [] }), update: async (given: unknown) => kept.push(given) },
	});
	const beside = pickedOver({ all: [board], chosen: "A board that left", canWriteRows: true, inTile });
	check("a tile behind the selection does not make a missing row writable", beside.update.can().can === true);
	const said = await beside.update({ columns: ["Blocked"] }).then(
		() => null,
		(failure: unknown) => messageOf(failure),
	);
	check("the write refuses rather than quietly writing into the tile instead", Boolean(said), JSON.stringify(said));
	check(
		"and says the collection is not empty, so the tile is not what a write means here",
		said?.includes("not empty"),
		JSON.stringify(said),
	);
	check("with nothing written anywhere", kept.length === 0 && written.length === 1, JSON.stringify({ kept, written }));

	const alone = pickedOver({ all: [], chosen: "Anything", canWriteRows: true, inTile });
	await alone.update({ columns: ["To Do"] });
	check(
		"but an empty collection does mean the tile, and the write lands there",
		kept.length === 1,
		JSON.stringify(kept),
	);

	const refs = gateway.createGatewayRefs();
	const later = gateway.createPickedGateway({
		id: "board/late",
		chosen: gateway.valueGateway({ id: "chosen", handlers: { get: async () => "Marketing" } }),
		collection: gateway.refCollection(refs, "boards/rows"),
		fieldName: "name",
		isFallbackToFirst: false,
	});
	check("a pick over a ref nothing has published yet says it cannot be written", later.update.can().can === false);
	refs.put(
		"boards/rows",
		gateway.collectionGateway({
			id: "published",
			handlers: { list: async () => rowsOf([board]), update: async (given: unknown) => written.push(given) },
		}),
	);
	check("and the same gateway can be written the moment the ref arrives", later.update.can().can === true);
	await later.update({ columns: ["Doing"] });
	check(
		"with the write landing on the row, not nowhere",
		fieldIn(written.at(-1), "ref") === "r0",
		JSON.stringify(written.at(-1)),
	);

	const malformed = gateway.createGatewayRefs();
	const overRef = gateway.refCollection(malformed, "boards/rows");
	callAsUntypedSource(malformed.put.bind(malformed), "boards/rows", {
		id: "hand-rolled",
		kind: "collection",
		subscribe: () => () => {},
		update: "not a verb",
	});
	check("a published gateway whose verb is not callable is refused, not trusted", overRef.update.can().can === false);
	const said2 = await callAsUntypedSource(overRef.update, { ref: "r0", data: {} }).then(
		() => null,
		(failure: unknown) => messageOf(failure),
	);
	check(
		"and calling it anyway says nothing is published there",
		said2?.includes("Nothing is published"),
		JSON.stringify(said2),
	);

	const bare = gateway.createGatewayRefs();
	const overBare = gateway.refCollection(bare, "boards/rows");
	callAsUntypedSource(bare.put.bind(bare), "boards/rows", {
		id: "bare",
		kind: "collection",
		subscribe: () => () => {},
		update: () => undefined,
	});
	const asked = ((): unknown => {
		try {
			return overBare.update.can();
		} catch (failure) {
			return { threw: messageOf(failure) };
		}
	})();
	check(
		"a verb that is a function but answers no can() is refused rather than asked",
		fieldIn(asked, "can") === false,
		JSON.stringify(asked),
	);

	const nowhere = pickedOver({ all: [board], chosen: "Marketing", canWriteRows: false });
	check(
		"with neither a writable row nor a tile behind it, it says so before it is pressed",
		nowhere.update.can().can === false,
	);
	const nowhereCan = nowhere.update.can();
	check(
		"and says why",
		(nowhereCan.can ? undefined : nowhereCan.reason)?.includes("Neither"),
		JSON.stringify(nowhere.update.can()),
	);
}

{
	const record = { path: "Habits.md", name: "Habits", props: { status: "active", goal: "12" }, content: "# Habits" };
	let written: unknown = null;
	const host = standIn<FileHost>(
		{
			file: () => ({
				canUpdate: true,
				get: async () => record,
				update: async (next: unknown) => ((written = next), true),
			}),
		},
		["file"],
		"file host",
	);
	const read = async (field?: string, type = "text"): Promise<ReturnType<typeof gateway.fileGateway>> =>
		gateway.fileGateway({ host, path: "Habits.md", part: { field, type }, requested: ["get", "update"] });
	check(
		"file field: a number prop gets a number, not the string the note holds",
		(await (await read("goal", "number")).get()) === 12,
	);
	check(
		"file field: a typed value with no field reads the content",
		gateway.noteFieldOf({ kind: "value", type: "text" }, {}) === "content",
	);
	check(
		"file field: an untyped value with no field still reads the whole note",
		gateway.noteFieldOf({ kind: "value" }, {}) === undefined,
	);
	check("file field: no field answers with the whole note", (await (await read()).get()) === record);
	check("file field: content answers with the body", (await (await read("content")).get()) === "# Habits");
	check("file field: name answers with the name, not the path", (await (await read("name")).get()) === "Habits");
	check("file field: a property answers with its value", (await (await read("status")).get()) === "active");
	check("file field: a property the note lacks answers with null", (await (await read("missing")).get()) === null);
	check(
		"file field: two fields of one note are two cache entries",
		(await read("status")).id !== (await read("name")).id,
	);
	const body = await read("content");
	await body.update("# Rewritten");
	check("file field: content writes the body", written === "# Rewritten");
	check("file field: a property refuses a write it cannot make", (await read("status")).update.can().can === false);
}

if (failed > 0) {
	console.error(`gateway gate: ${failed} failed`);
	process.exit(1);
}

const { pageOf } = await import("../packages/core/src/gateway/match.ts");
const many = Array.from({ length: 250 }, (_, at) => at);
checkEqual("a list with no limit stops at a hundred rows", pageOf(many).length, 100);
checkEqual("an asked limit is honoured above it", pageOf(many, { limit: 200 }).length, 200);
checkEqual("an asked limit is honoured below it", pageOf(many, { limit: 5 }).length, 5);
checkEqual("an offset still counts from where it was asked", pageOf(many, { offset: 240 })[0], 240);
checkEqual("and the tail is shorter than a page when the rows run out", pageOf(many, { offset: 240 }).length, 10);

function checkEqual(name: string, got: unknown, want: unknown): void {
	check(name, got === want, `got ${String(got)}, want ${String(want)}`);
}

console.log("gateway gate: clean");
