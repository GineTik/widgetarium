import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { standIn } from "./stand-in.ts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { SourceDisk } from "../packages/core/src/engine/source-disk.js";
import type { InstallerAdapter } from "../packages/core/src/installer-context.js";
import type { BlockContext } from "../apps/obsidian/src/draw-block.js";

const dom = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
});

const { BLOCK_FORMAT, WIDGET_API, MIN_WIDGET_API, blockFormatOf, blockRefusal, widgetApiOf, apiRefusal } =
	await import("../packages/core/src/version.js");
const { normalizeBoard, serializeBoard } = await import("../packages/core/src/model.js");
const { WidgetRegistry } = await import("../packages/core/src/registry.js");
const { createInstaller } = await import("../packages/core/src/installer.js");

let failed = 0;
let checks = 0;
const pathIn = (value: unknown, ...keys: readonly string[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);

type VersionedBlock = NonNullable<Parameters<typeof blockFormatOf>[0]>;
const block = (fields: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => fields;

const check = (name: string, got: unknown, want: unknown): void => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
};

check("a block with no v is format 1", blockFormatOf(block({ tiles: [] })), 1);
check("a bare array is format 1", blockFormatOf(standIn<VersionedBlock>([{ id: "a" }], [], "block")), 1);
check("a declared v is what it says", blockFormatOf(block({ v: 2, tiles: [] })), 2);

check("a block with no v is read", blockRefusal(block({ tiles: [] })), null);
check("a block at this format is read", blockRefusal(block({ v: BLOCK_FORMAT, tiles: [] })), null);
check(
	"a newer block is refused, and names both numbers",
	blockRefusal(block({ v: BLOCK_FORMAT + 1, tiles: [] })),
	`Widgetarium: this board was written in format ${BLOCK_FORMAT + 1}, and this plugin reads up to ${BLOCK_FORMAT}. Update Widgetarium to open it — nothing was changed.`,
);
check(
	"a v that is not a number is refused",
	blockRefusal(block({ v: "two", tiles: [] })),
	'Widgetarium: this board declares format "two", which is not a version number.',
);
check(
	"a v below the first format is refused",
	blockRefusal(block({ v: 0, tiles: [] })),
	"Widgetarium: this board declares format 0, and board formats start at 1.",
);
check(
	"a negative v is refused",
	blockRefusal(block({ v: -1, tiles: [] })),
	'Widgetarium: this board declares format "-1", which is not a version number.',
);
check(
	"a fractional v is refused",
	blockRefusal(block({ v: 1.5, tiles: [] })),
	'Widgetarium: this board declares format "1.5", which is not a version number.',
);

const board = normalizeBoard({
	tiles: [{ id: "a", widget: "@demo/clock" }],
	layouts: { 12: [{ id: "a", x: 0, y: 0, w: 3, h: 2 }] },
});
check("every write stamps the format", serializeBoard(board).v, BLOCK_FORMAT);
check("and what was just written is readable", blockRefusal(serializeBoard(board)), null);
check(
	"a board round-trips through its own stamp",
	normalizeBoard(serializeBoard(board)).tiles.map((tile) => tile.id),
	["a"],
);

check("a manifest with no api is api 1", widgetApiOf({ id: "@demo/clock" }), 1);
check("a declared api is what it says", widgetApiOf({ id: "@demo/clock", api: 3 }), 3);

check("a manifest with no api mounts", apiRefusal({ id: "@demo/clock" }), null);
check("a manifest at this api mounts", apiRefusal({ id: "@demo/clock", api: WIDGET_API }), null);
check(
	"a widget above the range is refused, named, with both numbers",
	apiRefusal({ id: "@demo/clock", api: WIDGET_API + 1 }),
	`@demo/clock needs widget API ${WIDGET_API + 1}, and this Widgetarium provides ${WIDGET_API}.`,
);
check(
	"a widget below the range is refused, named, with both numbers",
	apiRefusal({ id: "@demo/clock", api: MIN_WIDGET_API - 1 }),
	`@demo/clock was built for widget API ${MIN_WIDGET_API - 1}, and this Widgetarium no longer runs anything below ${MIN_WIDGET_API}.`,
);
check(
	"an api that is not a number is refused",
	apiRefusal({ id: "@demo/clock", api: "1.0" }),
	'@demo/clock declares widget API "1.0", which is not a version number.',
);
check(
	"a negative api is refused",
	apiRefusal({ id: "@demo/clock", api: -1 }),
	'@demo/clock declares widget API "-1", which is not a version number.',
);
check(
	"a fractional api is refused",
	apiRefusal({ id: "@demo/clock", api: 1.5 }),
	'@demo/clock declares widget API "1.5", which is not a version number.',
);

interface ShippedManifest {
	readonly at: string;
	readonly manifest: { readonly id?: string; readonly api?: unknown };
}

const isManifest = (value: unknown): value is ShippedManifest["manifest"] =>
	isObject(value) && (value["id"] === undefined || typeof value["id"] === "string");

const shipped: ShippedManifest[] = [];
for (const scope of fs.readdirSync("registry", { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
	for (const folder of fs
		.readdirSync(path.join("registry", scope.name), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())) {
		const at = path.join("registry", scope.name, folder.name, "manifest.generated.json");
		const manifest: unknown = fs.existsSync(at) ? JSON.parse(fs.readFileSync(at, "utf8")) : null;
		if (isManifest(manifest)) shipped.push({ at, manifest });
	}
}
check("there are widgets to check", shipped.length > 0, true);
check(
	"every shipped widget declares an api",
	shipped.filter((entry) => entry.manifest.api === undefined).map((entry) => entry.at),
	[],
);
check(
	"and every shipped widget runs on this plugin",
	shipped.filter((entry) => apiRefusal(entry.manifest)).map((entry) => entry.at),
	[],
);

const ROOT = ".widgetarium/widgets";
const WIDGET = `import { createWidget, defineLayout } from "widgetarium";
export const layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });
export default createWidget({ draw: () => h("b", null, "drawn") });
`;

function vaultOf(files: Readonly<Record<string, string>>) {
	return {
		vault: {
			adapter: {
				async exists(at: string): Promise<boolean> {
					return Object.hasOwn(files, at) || Object.keys(files).some((key) => key.startsWith(`${at}/`));
				},
				async list(at: string) {
					const folders = new Set<string>();
					const found: string[] = [];
					for (const key of Object.keys(files)) {
						if (!key.startsWith(`${at}/`)) continue;
						const rest = key.slice(at.length + 1);
						const cut = rest.indexOf("/");
						if (cut === -1) found.push(key);
						else folders.add(`${at}/${rest.slice(0, cut)}`);
					}
					return { files: found, folders: [...folders] };
				},
				async read(at: string): Promise<string> {
					return files[at] ?? "";
				},
			},
		},
	};
}

const filesFor = (manifest: Readonly<Record<string, unknown>>): Record<string, string> => ({
	[`${ROOT}/@demo/probe/manifest.generated.json`]: JSON.stringify(manifest),
	[`${ROOT}/@demo/probe/widget.tsx`]: WIDGET,
});

{
	const registry = new WidgetRegistry(vaultOf(filesFor({ id: "@demo/probe", title: "Probe", api: WIDGET_API })));
	await registry.load();
	const entry = registry.get("@demo/probe");
	check("a widget inside the range mounts", Boolean(entry?.component), true);
	check("and carries no refusal", entry?.error ?? null, null);
}

{
	const registry = new WidgetRegistry(
		vaultOf(filesFor({ id: "@demo/probe", title: "Probe", api: WIDGET_API + 1, was: "@demo/older" })),
	);
	await registry.load();
	const entry = registry.get("@demo/probe");
	check("a widget outside the range does not mount", entry?.component ?? null, null);
	check(
		"the tile is handed the refusal, named, with both numbers",
		String(pathIn(entry?.error, "message") ?? ""),
		`@demo/probe needs widget API ${WIDGET_API + 1}, and this Widgetarium provides ${WIDGET_API}.`,
	);
	check("its manifest survives, so the tile can still name it", entry?.manifest["title"], "Probe");
	check(
		"and its old id still resolves to the refusal, not to nothing",
		registry.get("@demo/older")?.manifest.id,
		"@demo/probe",
	);
}

function fakeVault() {
	const files = new Map<string, string>();
	return {
		files,
		exists: async (at: string): Promise<boolean> =>
			files.has(at) || [...files.keys()].some((held) => held.startsWith(`${at}/`)),
		read: async (at: string): Promise<string> => files.get(at) ?? "",
		write: async (at: string, text: string): Promise<void> => {
			files.set(at, text);
		},
		mkdir: async (): Promise<void> => {},
	};
}

const ADAPTER_MEMBERS: readonly (keyof InstallerAdapter & string)[] = ["exists", "read", "write", "mkdir"];

const COMMIT = "https://api.github.com/repos/acme/widgets/commits/main";
const RAW = "https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock";
const served: Readonly<Record<string, unknown>> = {
	[COMMIT]: { sha: "abc1234567" },
	[`${RAW}/manifest.generated.json`]: JSON.stringify({ id: "@demo/clock", title: "Clock", api: WIDGET_API + 1 }),
	[`${RAW}/widget.tsx`]: WIDGET,
};
const offer = {
	manifest: {
		id: "@demo/clock",
		repository: "https://github.com/acme/widgets",
		ref: "main",
		path: "widgets/@demo/clock",
		files: ["manifest.generated.json", "widget.tsx"],
	},
};

{
	const vault = fakeVault();
	const installer = createInstaller({
		adapter: standIn<InstallerAdapter>(vault, ADAPTER_MEMBERS, "installer adapter"),
		fetchJson: async (url: string) => served[url],
		fetchText: async (url: string) => String(served[url]),
	});
	const refused = await installer.install(offer);
	check("a fetched widget outside the range is not installed", refused.ok, false);
	check(
		"and the refusal names the widget and both numbers",
		refused.failure,
		`@demo/clock needs widget API ${WIDGET_API + 1}, and this Widgetarium provides ${WIDGET_API}.`,
	);
	check("and nothing of it reached the vault", vault.files.size, 0);
}

{
	const vault = fakeVault();
	const disk: SourceDisk = {
		exists: async (at) => at === "/dev/widgets" || at.startsWith("/dev/widgets/@demo/clock"),
		read: async (at) =>
			at.endsWith(".json") ? JSON.stringify({ id: "@demo/clock", title: "Clock", api: WIDGET_API + 1 }) : WIDGET,
		folders: async (at) => (at === "/dev/widgets" ? ["/dev/widgets/@demo"] : ["/dev/widgets/@demo/clock"]),
	};
	const installer = createInstaller({
		adapter: standIn<InstallerAdapter>(vault, ADAPTER_MEMBERS, "installer adapter"),
		fetchJson: async () => null,
		fetchText: async () => "",
		disk,
	});
	const found = await installer.discover({ path: "/dev/widgets" });
	const first = found[0];
	if (!first) throw new Error("the folder offered no widget");
	const refused = await installer.install(first);
	check("a folder widget outside the range is not copied in", refused.ok, false);
	check(
		"and says so with the widget and both numbers",
		refused.failure,
		`@demo/clock needs widget API ${WIDGET_API + 1}, and this Widgetarium provides ${WIDGET_API}.`,
	);
	check("and nothing of it reached the vault", vault.files.size, 0);
}

const { default: WidgetariumPlugin, drawable } = await import("../apps/obsidian/src/main.js");

const offered = (api: unknown) =>
	drawable({ manifest: { id: "@demo/clock", api }, sources: { "widget.tsx": WIDGET }, path: "@demo/clock" });
check("an offer inside the range is drawn on its card", Boolean(pathIn(offered(WIDGET_API), "component")), true);
check("an offer outside it is never built", pathIn(offered(WIDGET_API + 1), "component") ?? null, null);
check(
	"and the card is handed the refusal, named, with both numbers",
	String(pathIn(offered(WIDGET_API + 1), "error", "message") ?? ""),
	`@demo/clock needs widget API ${WIDGET_API + 1}, and this Widgetarium provides ${WIDGET_API}.`,
);

function bareWidgetariumPlugin(): InstanceType<typeof WidgetariumPlugin> {
	const built: unknown = Reflect.construct(WidgetariumPlugin, []);
	if (!(built instanceof WidgetariumPlugin)) throw new Error("the plugin class built something else");
	return built;
}

function renderedBlock(source: string): { said: unknown[]; mounts: unknown[][] } {
	const plugin = bareWidgetariumPlugin();
	const said: unknown[] = [];
	const mounts: unknown[][] = [];
	Object.assign(plugin, {
		registry: { resolveId: (id: string) => id },
		mounts: new Map(),
		isScreen: () => false,
		mount: (...given: unknown[]) => {
			mounts.push(given);
			return {};
		},
	});
	const element = standIn<HTMLElement>(
		{ createEl: (_tag: string, options?: { readonly text?: string }) => said.push(options?.text ?? "") },
		["createEl"],
		"element",
	);
	const context = standIn<BlockContext>(
		{ sourcePath: "Note.md", getSectionInfo: () => null },
		["sourcePath", "getSectionInfo"],
		"block context",
	);
	plugin.drawBlock(source, element, context);
	return { said, mounts };
}

const readable = renderedBlock("v: 1\ntiles:\n  - id: a\n    widget: '@demo/clock'\nlayouts: {}\n");
check("a block this plugin can read is mounted", readable.mounts.length, 1);
check("and nothing is printed over it", readable.said, []);

const newer = renderedBlock("v: 99\ntiles:\n  - id: a\n    widget: '@demo/clock'\nlayouts: {}\n");
check("a block from a newer plugin is never mounted", newer.mounts.length, 0);
check("and the note says why, with both numbers", newer.said, [
	`Widgetarium: this board was written in format 99, and this plugin reads up to ${BLOCK_FORMAT}. Update Widgetarium to open it — nothing was changed.`,
]);

console.log(failed ? `\nversion gate: ${failed} of ${checks} failed` : `\nversion gate: clean, ${checks} checks`);
process.exit(failed ? 1 : 0);
