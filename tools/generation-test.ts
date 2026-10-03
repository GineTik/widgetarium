import { fakeVault } from "./fake-vault.ts";
import { generationOf, widgetKeyOf, widgetRef } from "../packages/core/src/engine/widget-ref.js";
import { compatibility, moveTileProps, propChanges } from "../packages/core/src/engine/compatibility.js";
import {
	ICrudGateway,
	IListGateway,
	IValueGateway,
	declareProps,
	manifestOfModule,
	z,
} from "../packages/core/src/gateway/declared.ts";
import { cardOf, RECORD_FILE } from "../packages/core/src/engine/catalogue-index.js";
import { createInstaller } from "../packages/core/src/installer.js";
import { WidgetRegistry } from "../packages/core/src/registry.js";
import { readRegistry } from "../packages/core/src/engine/registry-file.js";
import { INSTALL_PENDING } from "../packages/core/src/engine/widget-lock.js";
import { fieldAt, fieldIn } from "./held-fields.ts";
import type { WidgetOffer } from "../packages/core/src/engine/source-offers.js";
import type { ModuleManifest } from "../packages/core/src/gateway/manifest.ts";
import type { DeclaredProps, PropMetadata, WidgetProp } from "../packages/core/src/gateway/declared-types.ts";
import type { TileProp } from "../packages/core/src/model.js";

let failed = 0;
function check(name: string, got: unknown, want: unknown): void {
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

interface HeldProp {
	readonly gateway: WidgetProp;
	readonly meta: PropMetadata<unknown> | PropMetadata<string>;
}

type Manifested = Partial<ModuleManifest> & { readonly migrate?: unknown };

const rows = (meta: PropMetadata<unknown>, writes: readonly ("update" | "create" | "remove")[] = []): HeldProp => ({
	gateway: writes.length > 0 ? ICrudGateway.of(z.unknown()).pick(...writes) : IListGateway.of(z.unknown()),
	meta,
});
const value = (meta: HeldProp["meta"], fallback: unknown): HeldProp => ({
	gateway: IValueGateway.of(z.unknown().default(fallback)).pick("get"),
	meta,
});
const gatewaysOf = (props: Readonly<Record<string, HeldProp>>): DeclaredProps =>
	Object.fromEntries(Object.entries(props).map(([name, held]) => [name, held.gateway]));
const metaOf = (props: Readonly<Record<string, HeldProp>>): Readonly<Record<string, HeldProp["meta"]>> =>
	Object.fromEntries(Object.entries(props).map(([name, held]) => [name, held.meta]));
const withProps = (
	props: Readonly<Record<string, HeldProp>>,
	extra: { readonly migrate?: unknown } = {},
): Manifested => ({
	...manifestOfModule({
		default: { declared: declareProps(gatewaysOf(props)) },
		metadata: { title: "Tabs", description: "Tabs.", props: metaOf(props) },
		layout: { size: { preferredWidth: "full", preferredHeight: "auto" } },
	}),
	...extra,
});
const declared = { tabs: rows({ label: "Tabs" }), label: value({ label: "Label" }, "name") };
const base = withProps(declared);
const verdictFor = (next: Manifested): ReturnType<typeof compatibility> => compatibility(base, next);

check(
	"a label change is compatible",
	verdictFor(withProps({ ...declared, label: value({ label: "Label field" }, "name") })).isCompatible,
	true,
);
check(
	"a new prop with a default is compatible",
	verdictFor(withProps({ ...declared, icon: value({ label: "Icon", control: "icon" }, "menu") })).isCompatible,
	true,
);
check(
	"a rename carrying was is compatible",
	verdictFor(withProps({ tabs: declared.tabs, field: value({ label: "Label", aka: ["label"] }, "name") })).isCompatible,
	true,
);
check(
	"a new verb is compatible and named",
	propChanges(base.props, withProps({ ...declared, tabs: rows({ label: "Tabs" }, ["update"]) }).props).find(
		(change) => change.kind === "writes",
	)?.verbs,
	["update"],
);

const defaultChanged = verdictFor(withProps({ ...declared, label: value({ label: "Label" }, "title") }));
check(
	"a changed default breaks, and moves tiles with no migration",
	[defaultChanged.isCompatible, defaultChanged.canMoveTiles],
	[false, true],
);

const removed = verdictFor(withProps({ tabs: declared.tabs }));
check("a removed prop breaks and strands tiles", [removed.isCompatible, removed.canMoveTiles], [false, false]);

const renamedBare = verdictFor(withProps({ tabs: declared.tabs, field: value({ label: "Label" }, "name") }));
check(
	"a rename without was is a removal",
	renamedBare.breaking.map((change) => change.kind),
	["removed"],
);

const reshaped = withProps(
	{ tabs: declared.tabs, label: value({ label: "Label" }, 0) },
	{
		migrate: [
			{
				from: { tabs: base.props?.["tabs"], label: base.props?.["label"] },
				run: (old: Readonly<Record<string, TileProp | undefined>>) => ({
					label: {
						implementation: "@core/typed-value",
						fields: { value: String(fieldIn(fieldIn(old["label"], "fields"), "value") ?? "").length },
					},
				}),
			},
		],
	},
);
const reshapedVerdict = verdictFor(reshaped);
check("a changed type breaks", reshapedVerdict.isCompatible, false);
check("and a migration from the old props lets tiles move", reshapedVerdict.canMoveTiles, true);
check(
	"moving runs the migration over the tile's own config",
	moveTileProps({ label: { implementation: "@core/typed-value", fields: { value: "title" } } }, reshapedVerdict)[
		"label"
	],
	{ implementation: "@core/typed-value", fields: { value: 5 } },
);

const renamedVerdict = verdictFor(
	withProps({ tabs: declared.tabs, field: value({ label: "Label", aka: ["label"] }, "name") }),
);
check(
	"moving carries a renamed prop onto its new name",
	moveTileProps({ label: { implementation: "@core/typed-value", fields: { value: "x" } } }, renamedVerdict),
	{ field: { implementation: "@core/typed-value", fields: { value: "x" } } },
);

const card = (manifest: Manifested): string => JSON.stringify(cardOf(manifest, 1));
const SOURCE = "export default () => null;";
const served = (commit: string, manifest: Manifested): Record<string, string> => ({
	[`https://raw.githubusercontent.com/acme/widgets/${commit}/widgets/@demo/tabs/${RECORD_FILE}`]: card(manifest),
	[`https://raw.githubusercontent.com/acme/widgets/${commit}/widgets/@demo/tabs/widget.tsx`]: SOURCE,
});
type Routes = Record<string, unknown>;

const network = (
	routes: Routes,
): { fetchJson: (url: string) => Promise<unknown>; fetchText: (url: string) => Promise<string> } => ({
	fetchJson: async (url) => {
		if (!(url in routes)) throw new Error(`404 ${url}`);
		return routes[url];
	},
	fetchText: async (url) => {
		if (!(url in routes)) throw new Error(`404 ${url}`);
		return String(routes[url]);
	},
});
const offer = (ref: string): WidgetOffer => ({
	installed: false,
	commit: "",
	origin: "https://github.com/acme/widgets",
	manifest: {
		id: "@demo/tabs",
		repository: "https://github.com/acme/widgets",
		ref,
		path: "widgets/@demo/tabs",
		files: [RECORD_FILE, "widget.tsx"],
	},
});

const routes: Routes = {
	"https://api.github.com/repos/acme/widgets/commits/main": { sha: COMMIT },
	[`https://api.github.com/repos/acme/widgets/commits/${COMMIT}`]: { sha: COMMIT },
	...served(COMMIT, base),
};
const vault = fakeVault();
const installer = createInstaller({ adapter: vault, ...network(routes) });
const first = await installer.install(offer("main"));
check(
	"a first install lands under the plain id",
	[first.ok, fieldIn(first, "id"), fieldIn(first, "isNewGeneration")],
	[true, "@demo/tabs", false],
);
check(
	"and the lock remembers the commit as this generation's own",
	fieldAt((await installer.lock()).widgets, "@demo/tabs", "commits"),
	[COMMIT],
);

routes["https://api.github.com/repos/acme/widgets/commits/main"] = { sha: NEXT };
routes[`https://api.github.com/repos/acme/widgets/commits/${NEXT}`] = { sha: NEXT };
Object.assign(routes, served(NEXT, withProps({ ...declared, label: value({ label: "Label field" }, "name") })));
const compatibleUpdate = await installer.install(offer("main"));
check(
	"a compatible update replaces the files in place",
	[fieldIn(compatibleUpdate, "id"), fieldIn(compatibleUpdate, "isNewGeneration")],
	["@demo/tabs", false],
);
check("and the generation absorbs the new commit", fieldAt((await installer.lock()).widgets, "@demo/tabs", "commits"), [
	COMMIT,
	NEXT,
]);

const BREAK = "2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c";
routes["https://api.github.com/repos/acme/widgets/commits/main"] = { sha: BREAK };
Object.assign(routes, served(BREAK, withProps({ tabs: declared.tabs })));
const breakingUpdate = await installer.install(offer("main"));
check(
	"an incompatible update is installed beside the old one",
	[fieldIn(breakingUpdate, "id"), fieldIn(breakingUpdate, "isNewGeneration")],
	[`@demo/tabs@${BREAK}`, true],
);
check("into a folder of its own", vault.files.has(`.widgetarium/widgets/@demo/tabs@${BREAK}/widget.tsx`), true);
check("while the old generation keeps its files", vault.files.has(".widgetarium/widgets/@demo/tabs/widget.tsx"), true);

const shared = await installer.installAt(`@demo/tabs@${COMMIT}`, [offer("main")]);
check(
	"a commit a note names that the vault already holds compatibly writes no files",
	[shared.ok, fieldIn(shared, "id"), fieldIn(shared, "isNewGeneration")],
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

const lyingCard = withProps({ ...declared, extra: value({ label: "Extra" }, "") });
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
brokenVault.write = async function (this: unknown, path: string, text: string): Promise<void> {
	if (path.endsWith("widget.tsx")) throw new Error("the disk filled up");
	return originalWrite.call(this, path, text);
};
const breaking = createInstaller({
	adapter: brokenVault,
	...network({ ...routes, "https://api.github.com/repos/acme/widgets/commits/main": { sha: COMMIT } }),
});
const interrupted = await breaking.install(offer("main")).then(
	() => "finished",
	(failure: unknown) => String(failure instanceof Error ? failure.message : undefined),
);
check("an install that dies halfway throws", interrupted, "the disk filled up");
check(
	"and leaves its intent in the lock, not a finished install",
	fieldAt((await breaking.lock()).widgets, "@demo/tabs", "state"),
	INSTALL_PENDING,
);
brokenVault.files.set(".widgetarium/widgets/@demo/tabs/widget.tsx", SOURCE);
const unfinished = new WidgetRegistry({ vault: { adapter: brokenVault } });
await unfinished.load();
check(
	"a registry refuses to run a widget whose install did not finish",
	String(fieldIn(unfinished.get("@demo/tabs")?.error, "message") ?? ""),
	"@demo/tabs did not finish installing, so it is not run — install it again from the catalogue",
);

console.log(failed === 0 ? "generations: all passed" : `generations: ${failed} failed`);
if (failed > 0) process.exit(1);
