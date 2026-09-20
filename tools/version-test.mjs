import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

buildMirror();

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const { BLOCK_FORMAT, WIDGET_API, MIN_WIDGET_API, blockFormatOf, blockRefusal, widgetApiOf, apiRefusal } =
	await import("./.mjs-cache/version.mjs");
const { normalizeBoard, serializeBoard } = await import("./.mjs-cache/model.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");
const { createInstaller } = await import("./.mjs-cache/installer.mjs");

let failed = 0;
let checks = 0;
const check = (name, got, want) => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
};

check("a block with no v is format 1", blockFormatOf({ tiles: [] }), 1);
check("a bare array is format 1", blockFormatOf([{ id: "a" }]), 1);
check("a declared v is what it says", blockFormatOf({ v: 2, tiles: [] }), 2);

check("a block with no v is read", blockRefusal({ tiles: [] }), null);
check("a block at this format is read", blockRefusal({ v: BLOCK_FORMAT, tiles: [] }), null);
check(
	"a newer block is refused, and names both numbers",
	blockRefusal({ v: BLOCK_FORMAT + 1, tiles: [] }),
	`Widgetarium: this board was written in format ${BLOCK_FORMAT + 1}, and this plugin reads up to ${BLOCK_FORMAT}. Update Widgetarium to open it — nothing was changed.`,
);
check(
	"a v that is not a number is refused",
	blockRefusal({ v: "two", tiles: [] }),
	'Widgetarium: this board declares format "two", which is not a version number.',
);
check(
	"a v below the first format is refused",
	blockRefusal({ v: 0, tiles: [] }),
	"Widgetarium: this board declares format 0, and board formats start at 1.",
);
check(
	"a negative v is refused",
	blockRefusal({ v: -1, tiles: [] }),
	'Widgetarium: this board declares format "-1", which is not a version number.',
);
check(
	"a fractional v is refused",
	blockRefusal({ v: 1.5, tiles: [] }),
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

const shipped = [];
for (const scope of fs.readdirSync("widgets", { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
	for (const folder of fs
		.readdirSync(path.join("widgets", scope.name), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())) {
		const at = path.join("widgets", scope.name, folder.name, "manifest.generated.json");
		if (fs.existsSync(at)) shipped.push({ at, manifest: JSON.parse(fs.readFileSync(at, "utf8")) });
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
const WIDGET = `import { createWidget } from "widgetarium";
export default createWidget(function Probe() {
	return h("b", null, "drawn");
});
`;

function vaultOf(files) {
	return {
		vault: {
			adapter: {
				async exists(at) {
					return Object.hasOwn(files, at) || Object.keys(files).some((key) => key.startsWith(`${at}/`));
				},
				async list(at) {
					const folders = new Set();
					const found = [];
					for (const key of Object.keys(files)) {
						if (!key.startsWith(`${at}/`)) continue;
						const rest = key.slice(at.length + 1);
						const cut = rest.indexOf("/");
						if (cut === -1) found.push(key);
						else folders.add(`${at}/${rest.slice(0, cut)}`);
					}
					return { files: found, folders: [...folders] };
				},
				async read(at) {
					return files[at];
				},
			},
		},
	};
}

const filesFor = (manifest) => ({
	[`${ROOT}/@demo/probe/manifest.json`]: JSON.stringify(manifest),
	[`${ROOT}/@demo/probe/widget.jsx`]: WIDGET,
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
		String(entry?.error?.message ?? ""),
		`@demo/probe needs widget API ${WIDGET_API + 1}, and this Widgetarium provides ${WIDGET_API}.`,
	);
	check("its manifest survives, so the tile can still name it", entry?.manifest?.title, "Probe");
	check(
		"and its old id still resolves to the refusal, not to nothing",
		registry.get("@demo/older")?.manifest?.id,
		"@demo/probe",
	);
}

function fakeVault() {
	const files = new Map();
	return {
		files,
		exists: async (at) => files.has(at) || [...files.keys()].some((held) => held.startsWith(`${at}/`)),
		read: async (at) => files.get(at),
		write: async (at, text) => {
			files.set(at, text);
		},
		mkdir: async () => {},
	};
}

const COMMIT = "https://api.github.com/repos/acme/widgets/commits/main";
const RAW = "https://raw.githubusercontent.com/acme/widgets/abc1234567/widgets/@demo/clock";
const served = {
	[COMMIT]: { sha: "abc1234567" },
	[`${RAW}/manifest.json`]: JSON.stringify({ id: "@demo/clock", title: "Clock", api: WIDGET_API + 1 }),
	[`${RAW}/widget.jsx`]: WIDGET,
};
const offer = {
	manifest: {
		id: "@demo/clock",
		repository: "https://github.com/acme/widgets",
		ref: "main",
		path: "widgets/@demo/clock",
		files: ["manifest.json", "widget.jsx"],
	},
};

{
	const vault = fakeVault();
	const installer = createInstaller({
		adapter: vault,
		fetchJson: async (url) => served[url],
		fetchText: async (url) => served[url],
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
	const disk = {
		exists: async (at) => at === "/dev/widgets" || at.startsWith("/dev/widgets/@demo/clock"),
		read: async (at) =>
			at.endsWith(".json") ? JSON.stringify({ id: "@demo/clock", title: "Clock", api: WIDGET_API + 1 }) : WIDGET,
		folders: async (at) => (at === "/dev/widgets" ? ["/dev/widgets/@demo"] : ["/dev/widgets/@demo/clock"]),
	};
	const installer = createInstaller({ adapter: vault, fetchJson: async () => null, fetchText: async () => null, disk });
	const found = await installer.discover({ path: "/dev/widgets" });
	const refused = await installer.install(found[0]);
	check("a folder widget outside the range is not copied in", refused.ok, false);
	check(
		"and says so with the widget and both numbers",
		refused.failure,
		`@demo/clock needs widget API ${WIDGET_API + 1}, and this Widgetarium provides ${WIDGET_API}.`,
	);
	check("and nothing of it reached the vault", vault.files.size, 0);
}

const { default: WidgetariumPlugin, drawable } = await import("./.mjs-cache/main.mjs");

const offered = (api) =>
	drawable({ manifest: { id: "@demo/clock", api }, code: WIDGET, path: "@demo/clock/widget.jsx" });
check("an offer inside the range is drawn on its card", Boolean(offered(WIDGET_API).component), true);
check("an offer outside it is never built", offered(WIDGET_API + 1).component ?? null, null);
check(
	"and the card is handed the refusal, named, with both numbers",
	String(offered(WIDGET_API + 1).error?.message ?? ""),
	`@demo/clock needs widget API ${WIDGET_API + 1}, and this Widgetarium provides ${WIDGET_API}.`,
);

function renderedBlock(source) {
	const plugin = new WidgetariumPlugin();
	const said = [];
	const mounts = [];
	plugin.registry = { resolveId: (id) => id };
	plugin.mounts = new Map();
	plugin.isScreen = () => false;
	plugin.mount = (...given) => {
		mounts.push(given);
		return {};
	};
	const element = { createEl: (tag, options) => said.push(options?.text ?? "") };
	plugin.renderBlock(source, element, { sourcePath: "Note.md", getSectionInfo: () => null });
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
