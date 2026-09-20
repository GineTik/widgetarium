import esbuild from "esbuild";
import { TEXT_LOADERS } from "../build.mjs";

const built = await esbuild.build({
	stdin: {
		contents: `export * from "./src/gateway/create"; export * from "./src/gateway/refs"; export * from "./src/gateway/cache"; export * from "./src/gateway/props.js"; export * from "./src/gateway/narrow"; export * from "./src/gateway/match"; export * from "./src/gateway/fields"; export * from "./src/gateway/operators"; export * from "./src/gateway/obsidian.js";`,
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
const gateway = await import(
	`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`
);

let failed = 0;
function check(name, ok, detail = "") {
	if (ok) {
		console.log(`ok   ${name}`);
		return;
	}
	failed += 1;
	console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

{
	const tasks = gateway.arrayGateway(["To Do", "Doing"], {}, "tasks");
	const listed = await tasks.list();
	check(
		"array: lists wrapped rows",
		listed.total === 2 && listed.rows[0].ref === "i0" && listed.rows[0].value === "To Do",
	);
	check("array: unimplemented create refuses", tasks.create.can().can === false);
	const refused = await tasks.create("x").then(
		() => null,
		(failure) => failure,
	);
	check(
		"array: refused create rejects with the reason",
		refused instanceof Error && refused.message.includes("create"),
	);
}

{
	let heard = 0;
	const made = [];
	const tasks = gateway.arrayGateway(
		() => made,
		{
			create: (draft) => {
				made.push(draft);
				return { ...draft, ref: `i${made.length - 1}` };
			},
		},
		"tasks2",
	);
	tasks.subscribe(() => {
		heard += 1;
	});
	check("array: implemented create answers can", tasks.create.can().can === true);
	await tasks.create("Done");
	check("array: a mutation notifies subscribers", heard === 1);
	check("array: list sees the handler's write", (await tasks.list()).total === 1);
	await tasks.list();
	check("array: a read notifies nobody", heard === 1);
}

{
	// CONTEXT: readValue is frozen at the start — only a mutator reading the store as it stands lands both writes
	let stored = [];
	const behind = gateway.hardcodeCollection({
		id: "behind",
		readValue: () => [],
		mutateValue: (step) => {
			stored = step(stored);
		},
	});
	await behind.create("first");
	await behind.create("second");
	check("hardcode: batched creates land through the mutator, not the read", stored.length === 2);
}

{
	let stored = [];
	const columns = gateway.hardcodeCollection({
		id: "cols",
		readValue: () => stored,
		mutateValue: (step) => {
			stored = step(stored);
		},
	});
	await columns.create("Test");
	await columns.create("Test");
	check("hardcode: create mints distinct refs", stored.length === 2 && stored[0].id !== stored[1].id);
	const rows = (await columns.list()).rows;
	await columns.update({ ref: rows[0].ref, data: "Renamed" });
	check(
		"hardcode: update by ref survives duplicate values",
		stored[0].value === "Renamed" && stored[1].value === "Test",
	);
	await columns.update({ ref: rows[1].ref, data: { props: { title: "Kept" } } });
	await columns.update({ ref: rows[1].ref, data: { props: { hidden: true } } });
	check(
		"hardcode: an object update patches instead of replacing",
		stored[1].value.title === "Kept" && stored[1].value.hidden === true,
	);
	check(
		"hardcode: a patched field lands on the row itself, where a typed list is read",
		stored[1].value.props === undefined,
	);
	await columns.remove(rows[1].ref);
	check("hardcode: remove by ref drops one row", stored.length === 1 && stored[0].value === "Renamed");
}

{
	let stored = [{ label: "Kanban" }, { label: "Archived columns" }];
	const options = gateway.hardcodeCollection({
		id: "options",
		readValue: () => stored,
		mutateValue: (step) => {
			stored = step(stored);
		},
	});
	const rows = (await options.list()).rows;
	await options.update({ ref: rows[1].ref, data: { props: { isSelected: false } } });
	await options.update({ ref: rows[0].ref, data: { props: { isSelected: true } } });
	check(
		"hardcode: a write leaves alone the ref of the row it did not name",
		stored[0].value.isSelected === true && stored[1].value.isSelected === false,
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
	const meta = tasks.list.meta;
	let woke = 0;
	const stop = cache.subscribe(
		meta,
		undefined,
		(input) => tasks.list(input),
		() => {
			woke += 1;
		},
	);
	await tick();
	check("cache: subscribing fetches once", pulls === 1 && woke === 1);
	const first = cache.read(meta, undefined);
	check("cache: a snapshot is ready data", first.status === "ready" && first.data.total === 1);
	check("cache: an unchanged snapshot keeps its reference", cache.read(meta, undefined) === first);

	const other = gateway.arrayGateway(["b"], {}, "other");
	let otherWoke = 0;
	const stopOther = cache.subscribe(
		other.list.meta,
		undefined,
		(input) => other.list(input),
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
	const live = [];
	const tasks = gateway.arrayGateway(
		() => live.slice(),
		{
			create: (draft) => {
				live.push(draft);
			},
		},
		"live",
	);
	const cache = gateway.createGatewayCache();
	const meta = tasks.list.meta;
	let woke = 0;
	cache.subscribe(
		meta,
		undefined,
		(input) => tasks.list(input),
		() => {
			woke += 1;
		},
	);
	await tick();
	await tasks.create("fresh");
	await tick();
	const seen = cache.read(meta, undefined);
	check("cache: a gateway mutation invalidates through subscribe", seen.status === "ready" && seen.data.total === 1);
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
	check("normalize: an operator map keeps its operator", where[1].op === "in" && Array.isArray(where[1].value));
	check("normalize: two operators on one prop are two rows", where.filter((row) => row.prop === "due").length === 2);
	check(
		"normalize: an unset value is no clause at all",
		where.every((row) => row.prop !== "empty"),
	);
	check(
		"normalize: every row says where it came from",
		where.every((row) => row.by === "tile/tasks"),
	);
	check("normalize: a bare list is an in", gateway.normalizeWhere({ tags: ["a", "b"] })[0].op === "in");
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
	const onA = gateway.narrowed(tasks, { board: "A" });
	const onB = gateway.narrowed(tasks, { board: "B" });
	check("narrow: two narrowings of one folder are two ids", onA.id !== onB.id && onA.id !== tasks.id);
	check("narrow: each answers its own rows", (await onA.list()).total === 1 && (await onB.list()).total === 1);
	check("narrow: and they are not the same row", (await onA.list()).rows[0].name === "One");
	check(
		"narrow: a second narrowing at the call site still applies",
		(await onA.list({ where: [{ prop: "name", op: "is", value: "Two" }] })).total === 0,
	);
	check("narrow: nothing to narrow by is the base itself", gateway.narrowed(tasks, { board: "" }) === tasks);
	check("narrow: a write the base allows is offered", onA.update.can().can === true);
	check("narrow: a write the base refuses stays refused", onA.create.can().can === false);
	check(
		"narrow: useData reads the wrapper through meta",
		typeof onA.list.meta?.gatewayId === "string" && onA.list.meta.gatewayId === onA.id,
	);
}

{
	const live = [{ name: "One", props: { board: "A" } }];
	const tasks = gateway.arrayGateway(
		() => live.slice(),
		{
			create: (draft) => {
				live.push(draft);
			},
		},
		"shared-store",
	);
	const onA = gateway.narrowed(tasks, { board: "A" });
	const onB = gateway.narrowed(tasks, { board: "B" });
	const cache = gateway.createGatewayCache();
	let woke = 0;
	cache.subscribe(
		onB.list.meta,
		undefined,
		(input) => onB.list(input),
		() => {
			woke += 1;
		},
	);
	await tick();
	await onA.create({ name: "Two", props: { board: "B" } });
	await tick();
	check("narrow: a write through one wrapper redraws the other", cache.read(onB.list.meta, undefined).data.total === 1);
}

{
	const records = [
		{ props: { title: "One", status: "Doing", order: 1, due: "2026-09-01", tags: ["a", "b"], done: false } },
		{ props: { title: "Two", status: "Done", order: 2, due: "2026-09-02", tags: ["b"], done: true } },
	];
	const found = gateway.fieldsOf(records);
	const typeOf = (prop) => found.find((field) => field.prop === prop)?.type;
	const valuesOf = (prop) => found.find((field) => field.prop === prop)?.values.join(",");
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

	const said = (type) =>
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

	const written = (type, id, value) => JSON.stringify(gateway.rowFor("status", gateway.conditionById(type, id), value));
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
	const first = cache.read(held.get.meta, undefined);
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
	const listed = cache.read(rows.list.meta, undefined);
	check(
		"first frame: and so is a list kept in the tile",
		listed.status === "ready" && listed.data?.total === 2,
		JSON.stringify(listed),
	);

	const away = gateway.valueGateway({ id: "away", handlers: { get: async () => 14 } });
	check(
		"first frame: a source that has to go and look is still loading",
		cache.read(away.get.meta, undefined).status === "loading",
	);
}

{
	const board = { name: "Marketing" };
	const rowsOf = (all) => ({ rows: all.map((value, at) => ({ ...value, ref: `r${at}` })), total: all.length });
	const written = [];
	const pickedOver = ({ all, chosen, canWriteRows, inTile }) =>
		gateway.pickedGateway({
			id: "board/board",
			chosen: gateway.valueGateway({ id: "chosen", handlers: { get: async () => chosen } }),
			collection: gateway.collectionGateway({
				id: "boards",
				handlers: {
					list: async () => rowsOf(all),
					...(canWriteRows ? { update: async (given) => written.push(given) } : {}),
				},
			}),
			fieldName: "name",
			isFallbackToFirst: false,
			inTile,
		});

	const named = pickedOver({ all: [board], chosen: "Marketing", canWriteRows: true });
	check("a picked row says it can be written", named.update.can().can === true);
	await named.update({ columns: ["To Do"] });
	check(
		"and the write lands on the row the selection names",
		written.at(-1)?.ref === "r0",
		JSON.stringify(written.at(-1)),
	);

	const lost = pickedOver({ all: [board], chosen: "A board that left", canWriteRows: true });
	check(
		"a selection naming no row still reports it can be written, because a row is writable",
		lost.update.can().can === true,
	);
	const refusal = await lost.update({ columns: [] }).then(
		() => null,
		(failure) => String(failure.message),
	);
	check(
		"but the write itself refuses out loud instead of answering nothing",
		Boolean(refusal),
		JSON.stringify(refusal),
	);
	check("naming what it could not write to", refusal?.includes("Neither"), JSON.stringify(refusal));

	const kept = [];
	const inTile = gateway.valueGateway({
		id: "in-tile",
		handlers: { get: async () => ({ columns: [] }), update: async (given) => kept.push(given) },
	});
	const beside = pickedOver({ all: [board], chosen: "A board that left", canWriteRows: true, inTile });
	check("a tile behind the selection does not make a missing row writable", beside.update.can().can === true);
	const said = await beside.update({ columns: ["Blocked"] }).then(
		() => null,
		(failure) => String(failure.message),
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
	const later = gateway.pickedGateway({
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
			handlers: { list: async () => rowsOf([board]), update: async (given) => written.push(given) },
		}),
	);
	check("and the same gateway can be written the moment the ref arrives", later.update.can().can === true);
	await later.update({ columns: ["Doing"] });
	check("with the write landing on the row, not nowhere", written.at(-1)?.ref === "r0", JSON.stringify(written.at(-1)));

	const malformed = gateway.createGatewayRefs();
	const overRef = gateway.refCollection(malformed, "boards/rows");
	malformed.put("boards/rows", {
		id: "hand-rolled",
		kind: "collection",
		subscribe: () => () => {},
		update: "not a verb",
	});
	check("a published gateway whose verb is not callable is refused, not trusted", overRef.update.can().can === false);
	const said2 = await overRef.update({ ref: "r0", data: {} }).then(
		() => null,
		(failure) => String(failure.message),
	);
	check(
		"and calling it anyway says nothing is published there",
		said2?.includes("Nothing is published"),
		JSON.stringify(said2),
	);

	const bare = gateway.createGatewayRefs();
	const overBare = gateway.refCollection(bare, "boards/rows");
	bare.put("boards/rows", { id: "bare", kind: "collection", subscribe: () => () => {}, update: () => undefined });
	const asked = (() => {
		try {
			return overBare.update.can();
		} catch (failure) {
			return { threw: String(failure.message) };
		}
	})();
	check(
		"a verb that is a function but answers no can() is refused rather than asked",
		asked.can === false,
		JSON.stringify(asked),
	);

	const nowhere = pickedOver({ all: [board], chosen: "Marketing", canWriteRows: false });
	check(
		"with neither a writable row nor a tile behind it, it says so before it is pressed",
		nowhere.update.can().can === false,
	);
	check("and says why", nowhere.update.can().reason?.includes("Neither"), JSON.stringify(nowhere.update.can()));
}

{
	const record = { path: "Habits.md", name: "Habits", props: { status: "active", goal: "12" }, content: "# Habits" };
	let written = null;
	const host = {
		file: () => ({ canUpdate: true, get: async () => record, update: async (next) => ((written = next), true) }),
	};
	const read = async (field, type = "text") =>
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

const { pageOf } = await import("./.mjs-cache/gateway/match.mjs");
const many = Array.from({ length: 250 }, (_, at) => at);
check("a list with no limit stops at a hundred rows", pageOf(many).length, 100);
check("an asked limit is honoured above it", pageOf(many, { limit: 200 }).length, 200);
check("an asked limit is honoured below it", pageOf(many, { limit: 5 }).length, 5);
check("an offset still counts from where it was asked", pageOf(many, { offset: 240 })[0], 240);
check("and the tail is shorter than a page when the rows run out", pageOf(many, { offset: 240 }).length, 10);

console.log("gateway gate: clean");
