const { HOST_GATEWAYS, hostGatewayFor, resolveHostGateway } =
	await import("../packages/core/src/engine/host-gateways.js");
const { createGatewayRefs, createViewCells } = await import("../packages/core/src/gateway/refs.ts");
const { arrayGateway, soloGateway } = await import("../packages/core/src/gateway/create.ts");
const { defineGatewayMetadata } = await import("../packages/core/src/gateway/implementation-metadata.ts");
const { IValueGateway, z } = await import("../packages/core/src/gateway/declared.ts");

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

check(
	"every gateway the host offers is a class under an interface, named for what it is",
	HOST_GATEWAYS.filter((entry) => !entry.id.startsWith("@core/stat-")).map((entry) => [
		entry.id,
		entry.implementation.name,
		entry.kind,
	]),
	[
		["@core/typed-value", "TypedValueGateway", "value"],
		["@core/typed-rows", "TypedRowsGateway", "collection"],
		["@core/screen-state", "ScreenStateGateway", "value"],
		["@core/file", "FileGateway", "value"],
		["@core/folder", "FolderGateway", "collection"],
		["@core/from-tile-value", "FromTileValueGateway", "value"],
		["@core/from-tile-rows", "FromTileRowsGateway", "collection"],
		["@core/selected-row", "SelectedRowGateway", "value"],
		["@core/selection", "SelectionGateway", "value"],
	],
);
check(
	"statistics are one gateway per algorithm, each named for it",
	HOST_GATEWAYS.filter((entry) => entry.id.startsWith("@core/stat-"))
		.map((entry) => entry.implementation.name)
		.slice(0, 3),
	["CountGateway", "SumGateway", "AverageGateway"],
);

check(
	"defineGatewayMetadata refuses a class that extends no gateway interface",
	refusal(() => defineGatewayMetadata(class Loose {}, { id: "x", title: "X", fields: z.object({}) })),
	"Loose extends no gateway interface — extend IValueGateway, IListGateway or ICrudGateway, with or without .of()",
);
check(
	"and takes its kind from the interface it extends",
	defineGatewayMetadata(class Local extends IValueGateway {}, { id: "x", title: "X", fields: z.object({}) }).kind,
	"value",
);

const value = { kind: "value" };
const rows = { kind: "collection" };
check(
	"a tile written before names its gateway through the shape it holds",
	[
		hostGatewayFor(value, { from: "typed", value: 3 })?.id,
		hostGatewayFor(value, { ref: "t1/selection" })?.id,
		hostGatewayFor(rows, { path: "Tasks" })?.id,
		hostGatewayFor(value, { from: "stat", path: "Log", algorithm: "sum" })?.id,
		hostGatewayFor({ kind: "value", default: { from: "memory", value: false } }, {})?.id,
	],
	["@core/typed-value", "@core/from-tile-value", "@core/folder", "@core/stat-sum", "@core/screen-state"],
);
check(
	"a tile written now names it outright",
	hostGatewayFor(value, { implementation: "@core/selected-row", fields: {} })?.id,
	"@core/selected-row",
);

const { sourcesFor } = await import("../packages/core/src/engine/host-gateways.js");
check(
	"a prop that writes rows is offered only sources that can write them",
	sourcesFor({ kind: "collection", writes: ["list", "get", "update"] }).map((entry) => entry.id),
	["@core/typed-rows", "@core/folder", "@core/from-tile-rows"],
);
check(
	"a number is offered the statistics, a line is not",
	[
		sourcesFor({ kind: "value", type: "number" }).some((entry) => entry.id === "@core/stat-sum"),
		sourcesFor({ kind: "value", type: "line" }).some((entry) => entry.id === "@core/stat-sum"),
	],
	[true, false],
);

const refs = createGatewayRefs();
const cellFor = createViewCells();
const written = [];
const boards = arrayGateway(
	[
		{ ref: "b1", name: "Home" },
		{ ref: "b2", name: "Work" },
	],
	{ update: (patch) => written.push(patch) },
	"host-test/boards",
);
const selection = soloGateway(null, {}, "host-test/selection");
refs.put("t1/boards", boards);
refs.put("t1/selection", selection);

const contextFor = (fields) => ({
	name: "board",
	spec: { kind: "value", writes: ["get", "update"] },
	tile: { id: "t2", props: { board: { implementation: "@core/selected-row", fields } } },
	refs,
	cellFor,
});

const nothingPicked = resolveHostGateway(contextFor({ rows: "t1/boards", picked: "t1/selection" }));
check(
	"the selected row falls back to the first row while nothing is picked",
	(await nothingPicked.get())?.name,
	"Home",
);

const pickedWork = resolveHostGateway(
	contextFor({ rows: "t1/boards", picked: "t1/selection", whenNothingPicked: "none" }),
);
check("and to nothing when told so", await pickedWork.get(), null);

refs.put("t1/selection", soloGateway("i1", {}, "host-test/selection-i1"));
check("it answers the row the other tile picked", (await nothingPicked.get())?.name, "Work");

await nothingPicked.update({ name: "Office" });
check("and a write lands on that row of the list", written, [{ ref: "i1", data: { name: "Office" } }]);

check(
	"a gateway the host does not offer is refused by name",
	refusal(() =>
		resolveHostGateway({
			...contextFor({}),
			tile: { id: "t3", props: { board: { implementation: "@core/nowhere" } } },
		}),
	),
	'prop "board" names the gateway "@core/nowhere", which this host does not offer',
);

const boundTo = (implementation, fields) =>
	refusal(() =>
		resolveHostGateway({ ...contextFor({}), tile: { id: "t4", props: { board: { implementation, fields } } } }),
	);
check(
	'a gateway reading another tile refuses a missing or malformed ref rather than reading the ref "undefined"',
	[
		boundTo("@core/from-tile-value", {}),
		boundTo("@core/from-tile-rows", { ref: "t1" }),
		boundTo("@core/selected-row", { picked: "t1/selection" }),
		boundTo("@core/selection", { rows: 7 }),
	],
	[
		'FromTileValueGateway needs "ref" to name a prop of another tile, written tile/prop; it holds nothing',
		'FromTileRowsGateway needs "ref" to name a prop of another tile, written tile/prop; it holds "t1"',
		'SelectedRowGateway needs "rows" to name a prop of another tile, written tile/prop; it holds nothing',
		'SelectionGateway needs "rows" to name a prop of another tile, written tile/prop; it holds 7',
	],
);

console.log(`\n${failed === 0 ? "host gateways: clean" : `host gateways: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
