import { registeredQueries } from "../packages/core/src/engine/packs.ts";
import { hostGatewayFor, resolveHostGateway, sourcesFor } from "../packages/core/src/engine/host-gateways.js";
import { createGatewayRefs, createViewCells } from "../packages/core/src/gateway/refs.ts";
import { arrayGateway, soloGateway } from "../packages/core/src/gateway/create.ts";
import { defineGatewayMetadata } from "../packages/core/src/gateway/implementation-metadata.ts";
import { IValueGateway, z } from "../packages/core/src/gateway/declared.ts";
import type { HostGatewayContext } from "../packages/core/src/engine/host-context.ts";
import type { Patch } from "../packages/core/src/gateway/contract.ts";
import { collectionOf, updateOf, valueGatewayOf } from "./gateway-kinds.ts";
import { fieldIn } from "./held-fields.ts";
import { createRowSlot } from "./vault-fixture.ts";

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

function refusal(run: () => void): string | null {
	try {
		run();
		return null;
	} catch (failure) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

check(
	"every gateway the host offers is a class under an interface, named for what it is",
	registeredQueries()
		.filter(
			(entry) =>
				!entry.id.startsWith("@stats/") &&
				!entry.id.startsWith("@git/") &&
				!entry.id.startsWith("@catalogue/") &&
				!entry.id.startsWith("@core/fetch") &&
				!["@obsidian/tag", "@obsidian/search"].includes(entry.id),
		)
		.map((entry) => [entry.id, entry.implementation.name, entry.kind]),
	[
		["@core/typed-value", "TypedValueQuery", "value"],
		["@core/typed-rows", "TypedRowsQuery", "collection"],
		["@core/screen-state", "ScreenStateQuery", "value"],
		["@core/from-tile-value", "FromTileValueQuery", "value"],
		["@core/from-tile-rows", "FromTileRowsQuery", "collection"],
		["@core/selected-row", "SelectedRowQuery", "value"],
		["@core/selection", "SelectionQuery", "value"],
		["@obsidian/file", "FileQuery", "value"],
		["@obsidian/folder", "FolderQuery", "collection"],
	],
);
check(
	"statistics are one gateway per algorithm, each named for it",
	registeredQueries()
		.filter((entry) => entry.id.startsWith("@stats/"))
		.map((entry) => entry.implementation.name)
		.slice(0, 3),
	["CountQuery", "SumQuery", "AverageQuery"],
);

check(
	"defineGatewayMetadata refuses a class that extends no gateway interface",
	refusal(() =>
		defineGatewayMetadata(
			class Loose {
				constructor(readonly fields: object) {}
			},
			{ id: "x", title: "X", resource: "This board", fields: z.object({}) },
		),
	),
	"Loose extends no gateway interface — extend IQuery.returns, IQuery.returnsAny, ICommand.takes, IValueGateway, IListGateway or ICrudGateway",
);
check(
	"and takes its kind from the interface it extends",
	defineGatewayMetadata(
		class Local extends IValueGateway {
			constructor(readonly fields: object) {
				super();
			}
			get(): null {
				return null;
			}
		},
		{ id: "x", title: "X", resource: "This board", fields: z.object({}) },
	).kind,
	"value",
);

const value = { kind: "value" };
const rows = { kind: "collection" };
check(
	"a prop bound to nothing reads from what its declaration says",
	[
		hostGatewayFor({ kind: "value", default: { value: 3 } }, {})?.id,
		hostGatewayFor({ kind: "collection", default: { rows: [] } }, {})?.id,
		hostGatewayFor({ kind: "value", default: { from: "memory", value: false } }, {})?.id,
		hostGatewayFor(value, {})?.id,
		hostGatewayFor(rows, {})?.id,
		hostGatewayFor({ kind: "value", source: { implementation: "@core/selected-row", fields: {} } }, {})?.id,
	],
	[
		"@core/typed-value",
		"@core/typed-rows",
		"@core/screen-state",
		"@obsidian/file",
		"@obsidian/folder",
		"@core/selected-row",
	],
);
check(
	"a binding names its implementation outright, and nothing else names one",
	[
		hostGatewayFor(value, { implementation: "@core/from-tile-value", fields: { ref: "t1/selection" } })?.id,
		hostGatewayFor(value, { implementation: "@stats/sum", fields: { path: "Log" } })?.id,
		hostGatewayFor(value, { implementation: "@core/selected-row", fields: {} })?.id,
		hostGatewayFor(value, { implementation: "@core/stat-sum" })?.id ?? null,
	],
	["@core/from-tile-value", "@stats/sum", "@core/selected-row", null],
);

check(
	"a prop that writes rows is offered only sources that can write them",
	sourcesFor({ kind: "collection", writes: ["list", "get", "update"] }).map((entry) => entry.id),
	["@core/typed-rows", "@core/from-tile-rows", "@obsidian/folder"],
);
check(
	"a number is offered the statistics, a line is not",
	[
		sourcesFor({ kind: "value", type: "number" }).some((entry) => entry.id === "@stats/sum"),
		sourcesFor({ kind: "value", type: "line" }).some((entry) => entry.id === "@stats/sum"),
	],
	[true, false],
);

const refs = createGatewayRefs();
const cellFor = createViewCells();
const written: Patch<unknown>[] = [];
const boards = arrayGateway(
	[
		{ ref: "b1", name: "Home" },
		{ ref: "b2", name: "Work" },
	],
	{ update: (patch: Patch<unknown>) => written.push(patch) },
	"host-test/boards",
);
const selection = soloGateway(null, {}, "host-test/selection");
refs.put("t1/boards", boards);
refs.put("t1/selection", selection);

const contextFor = (fields: Readonly<Record<string, string>>): HostGatewayContext => ({
	name: "board",
	spec: { kind: "value", writes: ["get", "update"] },
	tile: { id: "t2", props: { board: { implementation: "@core/selected-row", fields } } },
	refs,
	cellFor,
	host: { slot: () => createRowSlot([]) },
	propsRef: { current: {} },
	patchProp: () => {},
});

const nothingPicked = valueGatewayOf(resolveHostGateway(contextFor({ rows: "t1/boards", picked: "t1/selection" })));
check(
	"the selected row falls back to the first row while nothing is picked",
	fieldIn(await nothingPicked.get(), "name"),
	"Home",
);

const pickedWork = valueGatewayOf(
	resolveHostGateway(contextFor({ rows: "t1/boards", picked: "t1/selection", whenNothingPicked: "none" })),
);
check("and to nothing when told so", await pickedWork.get(), null);

refs.put("t1/selection", soloGateway("i1", {}, "host-test/selection-i1"));
check("it answers the row the other tile picked", fieldIn(await nothingPicked.get(), "name"), "Work");

await updateOf(nothingPicked)({ name: "Office" });
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

const boundTo = (implementation: string, fields: Readonly<Record<string, unknown>>): string | null =>
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
		'FromTileValueQuery needs "ref" to name a prop of another tile, written tile/prop; it holds nothing',
		'FromTileRowsQuery needs "ref" to name a prop of another tile, written tile/prop; it holds "t1"',
		'SelectedRowQuery needs "rows" to name a prop of another tile, written tile/prop; it holds nothing',
		'SelectionQuery needs "rows" to name a prop of another tile, written tile/prop; it holds 7',
	],
);

const readOnlyNote = valueGatewayOf(
	resolveHostGateway({
		...contextFor({}),
		spec: { kind: "value", type: "text", writes: ["get", "update"] },
		tile: {
			id: "t5",
			props: { board: { implementation: "@obsidian/file", fields: { path: "Note.md" }, allow: ["get", "update"] } },
		},
		host: {
			slot: () => createRowSlot([]),
			file: () => ({ canUpdate: false, get: async () => ({ path: "Note.md", content: "kept" }), update: () => true }),
		},
	}),
);
check(
	"a note its host cannot write answers can() no for update, though the person switched it on",
	readOnlyNote.update.can().can,
	false,
);
check("and still reads its body", await readOnlyNote.get(), "kept");

let keptRows: unknown = [];
const typedRows = collectionOf(
	resolveHostGateway({
		...contextFor({}),
		name: "tasks",
		spec: { kind: "collection", writes: ["list", "create"] },
		schema: z.object({ title: z.string() }),
		tile: { id: "t6", props: { tasks: { implementation: "@core/typed-rows", fields: { rows: [] } } } },
		propsRef: { current: { tasks: { implementation: "@core/typed-rows", fields: { rows: keptRows } } } },
		patchProp: (_name, step) => {
			keptRows = fieldIn(
				fieldIn(step({ implementation: "@core/typed-rows", fields: { rows: keptRows } }), "fields"),
				"rows",
			);
		},
	}),
);
let heard = 0;
const stopHearing = typedRows.subscribe(() => {
	heard += 1;
});
await typedRows.create({ title: "Water plants" });
stopHearing();
check("one write is announced once, not once per layer it passes through", heard, 1);

console.log(`\n${failed === 0 ? "host gateways: clean" : `host gateways: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
