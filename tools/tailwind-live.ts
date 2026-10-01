import type { SourceDisk } from "../packages/core/src/engine/source-disk.js";
import { fakeVault } from "./fake-vault.ts";
import { layJsdomGlobals } from "./jsdom-globals.ts";

layJsdomGlobals();

const { createInstaller } = await import("../packages/core/src/installer.js");
const { WIDGETS_DIR } = await import("../packages/core/src/paths.js");
const { builtSheetPath } = await import("../packages/core/src/engine/widget-build.js");

let failed = 0;
let checks = 0;
function check(name: string, got: unknown, want: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const INSTALLED = `${WIDGETS_DIR}/@demo/clock`;

const SOURCE = `import { createWidget, defineLayout } from "widgetarium";
export const layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });
export default createWidget({ draw: () => <b className="text-3xl bg-brand hover:opacity-50">tick</b> });
`;

const SHEET = `@import "tailwindcss";
@import "../tokens.css";

.clock { color: var(--wg-kit-accent); }
`;

const TOKENS = `:root { --wg-kit-accent: oklch(0.72 0.11 221.19); }
@theme { --color-brand: var(--wg-kit-accent); }
`;

const onMachineOver = (files: ReadonlyMap<string, string>): SourceDisk => ({
	exists: async (at) => files.has(at) || [...files.keys()].some((held) => held.startsWith(`${at}/`)),
	read: async (at) => files.get(at) ?? "",
	folders: async (at) => {
		const under = `${at}/`;
		const held = new Set<string>();
		for (const each of files.keys()) {
			if (!each.startsWith(under)) continue;
			const rest = each.slice(under.length);
			if (rest.includes("/")) held.add(under + rest.slice(0, rest.indexOf("/")));
		}
		return [...held];
	},
});

const shelf = fakeVault();
shelf.files.set("/repo/widgets/@demo/clock/widget.tsx", SOURCE);
shelf.files.set("/repo/widgets/@demo/clock/widget.css", SHEET);
shelf.files.set("/repo/widgets/@demo/tokens.css", TOKENS);

const installer = createInstaller({
	adapter: shelf,
	disk: onMachineOver(shelf.files),
	fetchJson: (url) => fetch(url).then((answer): Promise<unknown> => answer.json()),
	fetchText: (url) => fetch(url).then((answer) => answer.text()),
});

const started = Date.now();
const offered = await installer.discover({ path: "/repo/widgets" });
const first = offered[0];
if (!first) throw new Error("the folder source offered nothing");
const done = await installer.install(first);
check("a widget styled with tailwind installs against the real package", [done.ok, done.failure], [true, null]);

const built = String(shelf.files.get(builtSheetPath(INSTALLED)) ?? "");
console.log(`\n${built}\n`);

check("the built sheet holds the utility the widget uses", /\.text-3xl\s*\{/.test(built), true);
check("and the variant it uses", /\.hover\\:opacity-50:hover/.test(built), true);
check("and the utility built over the scope's own theme", /\.bg-brand\s*\{/.test(built), true);
check("and the widget's own rule", built.includes(".clock"), true);
check("and no utility the widget never names", /\.font-bold\s*\{/.test(built), false);

const bareElement = (built.match(/^[a-z*][^{@]*\{/gm) ?? []).filter((each) => !each.trim().startsWith("@"));
check("no rule reaches an element of the host's own", bareElement, []);
check("and no preflight marker is in it", /::before|::after|-webkit-tap-highlight/.test(built), false);

const lock = await installer.lock();
const compiler = Object.keys(lock.modules).find((key) => key.startsWith("tailwindcss@"));
check("the compiler is a module the vault holds", typeof compiler, "string");
check("and the build records which compiler made it", lock.builds["@demo/clock"]?.compiler, compiler);
const installedEntry = lock.widgets["@demo/clock"];
const installedFiles =
	installedEntry && typeof installedEntry === "object" ? Reflect.get(installedEntry, "files") : undefined;
check(
	"and it is not loaded to draw the widget",
	Boolean(installedFiles) && typeof installedFiles === "object" && Object.hasOwn(installedFiles, compiler ?? ""),
	false,
);

console.log(
	`\n${failed === 0 ? `tailwind against the real package: clean (${checks} checks, ${Date.now() - started}ms)` : `tailwind against the real package: ${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
