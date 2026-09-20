import { buildMirror } from "./mirror.mjs";
import { fakeVault } from "./fake-vault.mjs";

buildMirror();
const { generationOf, widgetKeyOf, widgetRef } = await import("./.mjs-cache/engine/widget-ref.mjs");
const { compatibility, movedTileProps, propChanges } = await import("./.mjs-cache/engine/compatibility.mjs");
const { defineManifest, defineProp, migration } = await import("./.mjs-cache/gateway/manifest.mjs");
const { cardOf, RECORD_FILE } = await import("./.mjs-cache/engine/catalogue-index.mjs");
const { createInstaller } = await import("./.mjs-cache/installer.mjs");
const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const COMMIT = "9f1c2e4b7a0d3c5e8f6a1b2c4d7e9f0a3b5c6d8e";
const NEXT = "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b";

check(
	"a commit ref names the widget and the commit",
	[widgetKeyOf(`@core/tabs@${COMMIT}`), generationOf(`@core/tabs@${COMMIT}`)],
	["@core/tabs", COMMIT],
);
check("a local generation is a number", [widgetKeyOf("@you/mine@3"), generationOf("@you/mine@3")], ["@you/mine", "3"]);
check(
	"a bare id has no generation, and its scope is not taken for one",
	[widgetKeyOf("@core/tabs"), generationOf("@core/tabs")],
	["@core/tabs", null],
);
check("a ref is written back the way it is read", widgetRef("@core/tabs", COMMIT), `@core/tabs@${COMMIT}`);

const declared = {
	tabs: defineProp()({ label: "Tabs", default: [] }),
	label: defineProp()({ label: "Label", default: "name" }),
};
const base = defineManifest({ title: "Tabs", description: "Tabs.", props: declared });
const withProps = (props, extra = {}) =>
	defineManifest({ title: base.title, description: base.description, ...extra, props });
const verdictFor = (next) => compatibility(base, next);

check(
	"a label change is compatible",
	verdictFor(withProps({ ...declared, label: defineProp()({ label: "Label field", default: "name" }) })).isCompatible,
	true,
);
check(
	"a new prop with a default is compatible",
	verdictFor(withProps({ ...declared, icon: defineProp()({ label: "Icon", control: "icon", default: "menu" }) }))
		.isCompatible,
	true,
);
check(
	"a rename carrying was is compatible",
	verdictFor(
		withProps({ tabs: declared.tabs, field: defineProp()({ label: "Label", aka: ["label"], default: "name" }) }),
	).isCompatible,
	true,
);
check(
	"a new verb is compatible and named",
	propChanges(
		base.props,
		defineManifest({
			title: "Tabs",
			description: "Tabs.",
			props: { ...declared, tabs: defineProp()({ label: "Tabs", default: [], writes: ["update"] }) },
		}).props,
	).find((change) => change.kind === "writes")?.verbs,
	["update"],
);

const defaultChanged = verdictFor(
	withProps({ ...declared, label: defineProp()({ label: "Label", default: "title" }) }),
);
check(
	"a changed default breaks, and moves tiles with no migration",
	[defaultChanged.isCompatible, defaultChanged.canMoveTiles],
	[false, true],
);

const removed = verdictFor(withProps({ tabs: declared.tabs }));
check("a removed prop breaks and strands tiles", [removed.isCompatible, removed.canMoveTiles], [false, false]);

const renamedBare = verdictFor(
	withProps({ tabs: declared.tabs, field: defineProp()({ label: "Label", default: "name" }) }),
);
check(
	"a rename without was is a removal",
	renamedBare.breaking.map((change) => change.kind),
	["removed"],
);

const reshaped = withProps(
	{ tabs: declared.tabs, label: defineProp()({ label: "Label", default: 0 }) },
	{
		migrate: [
			migration({
				from: { tabs: declared.tabs, label: declared.label },
				run: (old) => ({ label: { from: "typed", value: String(old.label?.value ?? "").length } }),
			}),
		],
	},
);
const reshapedVerdict = verdictFor(reshaped);
check("a changed type breaks", reshapedVerdict.isCompatible, false);
check("and a migration from the old props lets tiles move", reshapedVerdict.canMoveTiles, true);
check(
	"moving runs the migration over the tile's own config",
	movedTileProps({ label: { from: "typed", value: "title" } }, reshapedVerdict).label,
	{ from: "typed", value: 5 },
);

const renamedVerdict = verdictFor(
	withProps({ tabs: declared.tabs, field: defineProp()({ label: "Label", aka: ["label"], default: "name" }) }),
);
check(
	"moving carries a renamed prop onto its new name",
	movedTileProps({ label: { from: "typed", value: "x" } }, renamedVerdict),
	{ field: { from: "typed", value: "x" } },
);

const card = (manifest) => JSON.stringify(cardOf(manifest, 1));
const SOURCE = "export default () => null;";
const served = (commit, manifest) => ({
	[`https://raw.githubusercontent.com/acme/widgets/${commit}/widgets/@demo/tabs/${RECORD_FILE}`]: card(manifest),
	[`https://raw.githubusercontent.com/acme/widgets/${commit}/widgets/@demo/tabs/widget.jsx`]: SOURCE,
});
const network = (routes) => ({
	fetchJson: async (url) => {
		if (!(url in routes)) throw new Error(`404 ${url}`);
		return routes[url];
	},
	fetchText: async (url) => {
		if (!(url in routes)) throw new Error(`404 ${url}`);
		return routes[url];
	},
});
const offer = (ref) => ({
	origin: "https://github.com/acme/widgets",
	manifest: {
		id: "@demo/tabs",
		repository: "https://github.com/acme/widgets",
		ref,
		path: "widgets/@demo/tabs",
		files: [RECORD_FILE, "widget.jsx"],
	},
});

const routes = {
	"https://api.github.com/repos/acme/widgets/commits/main": { sha: COMMIT },
	[`https://api.github.com/repos/acme/widgets/commits/${COMMIT}`]: { sha: COMMIT },
	...served(COMMIT, base),
};
const vault = fakeVault();
const installer = createInstaller({ adapter: vault, ...network(routes) });
const first = await installer.install(offer("main"));
check(
	"a first install lands under the plain id",
	[first.ok, first.id, first.isNewGeneration],
	[true, "@demo/tabs", false],
);
check(
	"and the lock remembers the commit as this generation's own",
	(await installer.lock()).widgets["@demo/tabs"].commits,
	[COMMIT],
);

routes["https://api.github.com/repos/acme/widgets/commits/main"] = { sha: NEXT };
routes[`https://api.github.com/repos/acme/widgets/commits/${NEXT}`] = { sha: NEXT };
Object.assign(
	routes,
	served(NEXT, withProps({ ...declared, label: defineProp()({ label: "Label field", default: "name" }) })),
);
const compatibleUpdate = await installer.install(offer("main"));
check(
	"a compatible update replaces the files in place",
	[compatibleUpdate.id, compatibleUpdate.isNewGeneration],
	["@demo/tabs", false],
);
check("and the generation absorbs the new commit", (await installer.lock()).widgets["@demo/tabs"].commits, [
	COMMIT,
	NEXT,
]);

const BREAK = "2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c";
routes["https://api.github.com/repos/acme/widgets/commits/main"] = { sha: BREAK };
Object.assign(routes, served(BREAK, withProps({ tabs: declared.tabs })));
const breakingUpdate = await installer.install(offer("main"));
check(
	"an incompatible update is installed beside the old one",
	[breakingUpdate.id, breakingUpdate.isNewGeneration],
	[`@demo/tabs@${BREAK}`, true],
);
check("into a folder of its own", vault.files.has(`.widgetarium/widgets/@demo/tabs@${BREAK}/widget.jsx`), true);
check("while the old generation keeps its files", vault.files.has(".widgetarium/widgets/@demo/tabs/widget.jsx"), true);

const shared = await installer.installAt(`@demo/tabs@${COMMIT}`, [offer("main")]);
check(
	"a commit a note names that the vault already holds compatibly writes no files",
	[shared.ok, shared.id, shared.isNewGeneration],
	[true, "@demo/tabs", false],
);

const registry = new WidgetRegistry({ vault: { adapter: vault } });
await registry.load();
check(
	"a tile naming the first commit resolves to the generation that absorbed it",
	registry.resolveId(`@demo/tabs@${COMMIT}`),
	"@demo/tabs",
);
check(
	"a tile naming the breaking commit resolves to its own folder",
	registry.resolveId(`@demo/tabs@${BREAK}`),
	`@demo/tabs@${BREAK}`,
);
check(
	"a tile naming a commit nobody installed resolves to nothing",
	registry.get("@demo/tabs@3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d"),
	null,
);
check("generations are listed oldest first", registry.generationsOf("@demo/tabs"), [
	"@demo/tabs",
	`@demo/tabs@${BREAK}`,
]);
check(
	"a new tile is written with the commit its generation began at",
	registry.tileRefOf("@demo/tabs"),
	`@demo/tabs@${COMMIT}`,
);

const { readRegistry } = await import("./.mjs-cache/engine/registry-file.mjs");
const { INSTALL_PENDING } = await import("./.mjs-cache/engine/widget-lock.mjs");

const scoped = readRegistry(
	JSON.stringify({
		registry: 1,
		scope: "@demo",
		deprecated: { movedTo: "https://github.com/acme/next" },
		widgets: [{ name: "tabs", path: "widgets/@demo/tabs" }],
	}),
	"registry",
);
check(
	"a registry naming its scope names every row by it",
	scoped.rows.map((row) => row.id),
	["@demo/tabs"],
);
check("and says where it moved", scoped.movedTo, "https://github.com/acme/next");

const lyingCard = withProps({ ...declared, extra: defineProp()({ label: "Extra", default: "" }) });
const checkedVault = fakeVault();
const checked = createInstaller({
	adapter: checkedVault,
	...network({ ...routes, "https://api.github.com/repos/acme/widgets/commits/main": { sha: COMMIT } }),
	declaredIn: async () => lyingCard,
});
const mismatched = await checked.install(offer("main"));
check(
	"a card that says something the code does not is refused",
	mismatched.failure,
	"@demo/tabs's card says one thing about props and its code another, so it was not installed",
);
check("and nothing reached the vault", checkedVault.files.size, 0);

const brokenVault = fakeVault();
const originalWrite = brokenVault.write;
brokenVault.write = async function (path, text) {
	if (path.endsWith("widget.jsx")) throw new Error("the disk filled up");
	return originalWrite.call(this, path, text);
};
const breaking = createInstaller({
	adapter: brokenVault,
	...network({ ...routes, "https://api.github.com/repos/acme/widgets/commits/main": { sha: COMMIT } }),
});
const interrupted = await breaking.install(offer("main")).then(
	() => "finished",
	(failure) => String(failure.message),
);
check("an install that dies halfway throws", interrupted, "the disk filled up");
check(
	"and leaves its intent in the lock, not a finished install",
	(await breaking.lock()).widgets["@demo/tabs"]?.state,
	INSTALL_PENDING,
);
brokenVault.files.set(".widgetarium/widgets/@demo/tabs/widget.jsx", SOURCE);
const unfinished = new WidgetRegistry({ vault: { adapter: brokenVault } });
await unfinished.load();
check(
	"a registry refuses to run a widget whose install did not finish",
	String(unfinished.get("@demo/tabs")?.error?.message ?? ""),
	"@demo/tabs did not finish installing, so it is not run — install it again from the catalogue",
);

console.log(failed === 0 ? "generations: all passed" : `generations: ${failed} failed`);
if (failed > 0) process.exit(1);
