import fs from "node:fs";
import * as fileSystem from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	checkProject,
	discoverProject,
	formatFindings,
	nodeProjectFiles,
	projectConfigJsonSchema,
	readProjectConfig,
	type ProjectConfig,
	type ProjectFiles,
} from "../packages/core/src/project/index.js";
import { vaultProjectFiles, type ProjectAdapter } from "../apps/obsidian/src/project-files-vault.js";

type FixtureFiles = Readonly<Record<string, string>>;

const PROJECT_FOLDER = "shop";
const BOARD = JSON.stringify({ v: 2, layout: { dir: "column", of: [] } });
const WIDGET = "export default function Widget() { return null; }\n";

const FIXTURE: FixtureFiles = {
	"widgetarium.json": JSON.stringify({ name: "shop", paths: { widgets: "src/ui/widgets" } }),
	"src/ui/widgets/billing/plan-list/widget.tsx": WIDGET,
	"src/ui/widgets/billing/plan-list/plan-row.tsx": WIDGET,
	"src/ui/widgets/orders/order-board/widget.tsx": WIDGET,
	"src/ui/widgets/orders/order-board/parts/card.tsx": WIDGET,
	"src/ui/widgets/orders/order-board/parts/nested/widget.tsx": WIDGET,
	"src/ui/widgets/summary/widget.ts": "export default {};\n",
	"src/ui/widgets/summary/build/widget.js": "export default {};\n",
	"src/ui/widgets/node_modules/stray/widget.tsx": WIDGET,
	"src/ui/widgets/.drafts/draft/widget.tsx": WIDGET,
	"src/widgets/ignored/widget.tsx": WIDGET,
	"src/shared/kit/components/button.tsx": WIDGET,
	"src/shared/kit/charts/bar-chart.tsx": WIDGET,
	"src/shared/kit/plates.ts": "export const plates = 1;\n",
	"src/shared/kit/index.ts": 'export * from "./plates";\n',
	"src/shared/kit/utils/cn.ts": "export const cn = 1;\n",
	"src/shared/kit/hooks/use-open.ts": "export const useOpen = 1;\n",
	"src/shared/kit/constants/tones.ts": "export const tones = 1;\n",
	"src/shared/kit/components/button.test.tsx": WIDGET,
	"src/shared/kit/kit.d.ts": "export {};\n",
	"src/logic/orders/orders-query.ts": [
		"export class OrdersQuery extends IQuery.input(OrdersInputSchema).output(OrderPageSchema) {}",
		"class SaveOrderCommand extends ICommand.input(OrderSchema) {}",
		"export { SaveOrderCommand };",
		"export class ArchiveOrderCommand extends ICommand {}",
		"export class OrderFormatter {}",
		"class HiddenQuery extends IQuery.output(OrderSchema) {}",
	].join("\n"),
	"src/shared/sources/notes/notes-query.ts": "export default class NotesQuery extends IQuery.output(NoteSchema) {}\n",
	"src/shared/schemas/order.ts": [
		"export const OrderSchema = z.object({});",
		"export const ORDER_LIMIT = 3;",
		"const LineSchema = z.object({});",
		"export { LineSchema };",
	].join("\n"),
	"src/shared/schemas/index.ts": 'export { OrderSchema } from "./order";\n',
	"src/app/routes/board.json": BOARD,
	"src/app/routes/orders/board.json": BOARD,
	"src/app/routes/orders/layout.board.json": BOARD,
	"src/app/routes/orders/[id]/board.json": BOARD,
	"src/app/routes/settings/index/board.json": BOARD,
};

const EXPECTED_MAP = {
	widgets: [
		{ name: "plan-list", path: "src/ui/widgets/billing/plan-list" },
		{ name: "order-board", path: "src/ui/widgets/orders/order-board" },
		{ name: "summary", path: "src/ui/widgets/summary" },
	],
	kit: [
		{ name: "bar-chart", path: "src/shared/kit/charts/bar-chart.tsx" },
		{ name: "button", path: "src/shared/kit/components/button.tsx" },
		{ name: "plates", path: "src/shared/kit/plates.ts" },
	],
	handlers: [
		{ name: "OrdersQuery", path: "src/logic/orders/orders-query.ts" },
		{ name: "SaveOrderCommand", path: "src/logic/orders/orders-query.ts" },
		{ name: "ArchiveOrderCommand", path: "src/logic/orders/orders-query.ts" },
		{ name: "NotesQuery", path: "src/shared/sources/notes/notes-query.ts" },
	],
	schemas: [
		{ name: "OrderSchema", path: "src/shared/schemas/order.ts" },
		{ name: "LineSchema", path: "src/shared/schemas/order.ts" },
	],
	routes: [
		{ path: "/", file: "src/app/routes/board.json", params: [], layout: null },
		{
			path: "/orders",
			file: "src/app/routes/orders/board.json",
			params: [],
			layout: "src/app/routes/orders/layout.board.json",
		},
		{ path: "/orders/:id", file: "src/app/routes/orders/[id]/board.json", params: ["id"], layout: null },
		{ path: "/settings", file: "src/app/routes/settings/index/board.json", params: [], layout: null },
	],
	refused: [],
};

let failed = 0;
let checks = 0;

const check = (name: string, got: unknown, want: unknown): void => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`}`,
	);
};

const vault = fs.mkdtempSync(path.join(os.tmpdir(), "wg-project-"));
const project = path.join(vault, PROJECT_FOLDER);
const files = nodeProjectFiles(project, fileSystem);
process.on("exit", () => fs.rmSync(vault, { recursive: true, force: true }));

writeFixture(FIXTURE);
fs.symlinkSync("..", path.join(project, "src/ui/widgets/orders/loop"));

const config = await configOf(files);
check("widgetarium.json fills every unnamed path from the handbook", config.paths, {
	routes: "src/app/routes",
	widgets: "src/ui/widgets",
	logic: "src/logic",
	schemas: "src/shared/schemas",
	sources: "src/shared/sources",
	kit: "src/shared/kit",
	libs: "src/shared/libs",
	docs: "docs",
	references: "docs/references",
});
check("the aliases follow the configured paths", config.aliases["@widgets"], "src/ui/widgets");
check("the project map is exactly what the folders hold", await discoverProject(files, config), EXPECTED_MAP);
check(
	"a vault adapter finds the same map as Node",
	await discoverProject(vaultProjectFiles(adapterOver(nodeProjectFiles(vault, fileSystem)), PROJECT_FOLDER), config),
	EXPECTED_MAP,
);
check("a clean project has no findings", await checkProject(files), []);
check("the JSON schema names the project's name as required", projectConfigJsonSchema()["required"], ["name"]);

await withFiles(
	{
		"src/ui/widgets/archive/plan-list/widget.tsx": WIDGET,
		"src/shared/kit/forms/button.tsx": WIDGET,
		"src/logic/notes/notes-query.ts": "export class NotesQuery extends IQuery.output(NoteSchema) {}\n",
		"src/shared/schemas/order-copy.ts": "export const OrderSchema = z.object({});\n",
	},
	async () =>
		check(
			"every duplicate name is one finding naming every path",
			formatFindings(await checkProject(files)),
			[
				'src/ui/widgets/archive/plan-list: widget id "plan-list" is declared 2 times: src/ui/widgets/archive/plan-list, src/ui/widgets/billing/plan-list',
				'src/shared/kit/components/button.tsx: kit item "button" is declared 2 times: src/shared/kit/components/button.tsx, src/shared/kit/forms/button.tsx',
				'src/logic/notes/notes-query.ts: handler "NotesQuery" is declared 2 times: src/logic/notes/notes-query.ts, src/shared/sources/notes/notes-query.ts',
				'src/shared/schemas/order-copy.ts: schema "OrderSchema" is declared 2 times: src/shared/schemas/order-copy.ts, src/shared/schemas/order.ts',
			].join("\n"),
		),
);

await withFiles({ "src/ui/widgets/legacy/widget.jsx": WIDGET }, async () =>
	check("a JavaScript-only widget is refused with the rename", await checkProject(files), [
		{
			path: "src/ui/widgets/legacy",
			message:
				'src/ui/widgets/legacy/widget.jsx is JavaScript, and a widget is written in TypeScript. Rename it to widget.tsx — JavaScript is valid TypeScript, so the rename alone is enough to build it: mv "src/ui/widgets/legacy/widget.jsx" "src/ui/widgets/legacy/widget.tsx"',
		},
	]),
);

await withFiles({ "src/app/routes/orders/[id]/board.json": "{ v: 2" }, async () =>
	check(
		"a route board that is not JSON is named",
		(await checkProject(files)).map(({ path: at }) => at),
		["src/app/routes/orders/[id]/board.json"],
	),
);

await withFiles({ "widgetarium.json": JSON.stringify({ name: "shop", paths: { widgets: 3 } }) }, async () =>
	check(
		"a config refusal names the exact zod path",
		formatFindings(await checkProject(files)),
		"widgetarium.json: paths.widgets: Invalid input: expected string, received number",
	),
);

await withFiles({ "src/app/routes/settings/board.json": BOARD }, async () =>
	check(
		"two folders naming one route are a duplicate",
		formatFindings(await checkProject(files)),
		'src/app/routes/settings/board.json: route "/settings" is declared 2 times: src/app/routes/settings/board.json, src/app/routes/settings/index/board.json',
	),
);

await withFiles(
	{
		"widgetarium.json": JSON.stringify({
			name: "shop",
			paths: { widgets: "src/ui/widgets", sources: "src/logic/orders" },
			aliases: { "@ui": "src/ui" },
		}),
		"src/logic/orders/queryable.ts": "export class Lookalike extends IQueryable {}\n",
	},
	async () => {
		const overlapping = await configOf(files);
		check("an alias of the project's own joins the defaults", overlapping.aliases, {
			"@kit": "src/shared/kit",
			"@schemas": "src/shared/schemas",
			"@libs": "src/shared/libs",
			"@logic": "src/logic",
			"@widgets": "src/ui/widgets",
			"@ui": "src/ui",
		});
		check(
			"overlapping roots read a file once, and IQueryable is no handler",
			(await discoverProject(files, overlapping)).handlers.map(({ name }) => name),
			["OrdersQuery", "SaveOrderCommand", "ArchiveOrderCommand"],
		);
		check("overlapping roots report no duplicate", await checkProject(files), []);
	},
);

await withFiles({ "widgetarium.json": JSON.stringify({ name: "shop", paths: { kit: "../outside" } }) }, async () =>
	check(
		"a path leaving the project is refused",
		formatFindings(await checkProject(files)),
		'widgetarium.json: paths.kit: must be relative to the project root with "/" between folders: no leading or trailing "/", no "." or "..", no "\\"',
	),
);

fs.rmSync(path.join(project, "widgetarium.json"));
check("a missing config is a refusal naming the fix", await checkProject(files), [
	{
		path: "widgetarium.json",
		message: 'missing at the project root; create widgetarium.json holding {"name": "<app>"}, every path has a default',
	},
]);

console.log(`\n${checks - failed}/${checks} project discovery checks pass`);
process.exit(failed > 0 ? 1 : 0);

function writeFixture(fixture: FixtureFiles): void {
	for (const [at, text] of Object.entries(fixture)) {
		fs.mkdirSync(path.dirname(path.join(project, at)), { recursive: true });
		fs.writeFileSync(path.join(project, at), text);
	}
}

async function withFiles(added: FixtureFiles, run: () => Promise<void>): Promise<void> {
	const kept = Object.keys(added).filter((at) => fs.existsSync(path.join(project, at)));
	writeFixture(added);
	await run();
	for (const at of Object.keys(added)) fs.rmSync(path.join(project, at));
	writeFixture(Object.fromEntries(kept.map((at) => [at, FIXTURE[at] ?? ""])));
}

async function configOf(projectFiles: ProjectFiles): Promise<ProjectConfig> {
	const reading = await readProjectConfig(projectFiles);
	if ("refusal" in reading) throw new Error(reading.refusal);
	return reading.config;
}

function adapterOver(vaultFiles: ProjectFiles): ProjectAdapter {
	return {
		list: async (at) => {
			const listed = await vaultFiles.list(at);
			return { files: [...listed.files], folders: [...listed.folders] };
		},
		read: async (at) => {
			const text = await vaultFiles.read(at);
			if (text === null) throw new Error(`${at} does not exist`);
			return text;
		},
		stat: async (at) => {
			if ((await vaultFiles.read(at)) !== null) return { type: "file", ctime: 0, mtime: 0, size: 0 };
			return (await vaultFiles.exists(at)) ? { type: "folder", ctime: 0, mtime: 0, size: 0 } : null;
		},
	};
}
