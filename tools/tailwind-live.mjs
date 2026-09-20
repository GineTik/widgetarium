import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";
import { fakeVault } from "./fake-vault.mjs";

buildMirror();

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const { createInstaller } = await import("./.mjs-cache/installer.mjs");
const { WIDGETS_DIR } = await import("./.mjs-cache/paths.mjs");
const { builtSheetPath } = await import("./.mjs-cache/engine/widget-build.mjs");

let failed = 0;
let checks = 0;
function check(name, got, want) {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const INSTALLED = `${WIDGETS_DIR}/@demo/clock`;

const SOURCE = `import { createWidget } from "widgetarium";
export default createWidget(function Clock() {
	return <b className="text-3xl bg-brand hover:opacity-50">tick</b>;
});
`;

const SHEET = `@import "tailwindcss";
@import "../tokens.css";

.clock { color: var(--wg-kit-accent); }
`;

const TOKENS = `:root { --wg-kit-accent: oklch(0.72 0.11 221.19); }
@theme { --color-brand: var(--wg-kit-accent); }
`;

const onMachineOver = (files) => ({
	exists: async (at) => files.has(at) || [...files.keys()].some((held) => held.startsWith(`${at}/`)),
	read: async (at) => files.get(at),
	folders: async (at) => {
		const under = `${at}/`;
		const held = new Set();
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
	fetchJson: (url) => fetch(url).then((answer) => answer.json()),
	fetchText: (url) => fetch(url).then((answer) => answer.text()),
});

const started = Date.now();
const offered = await installer.discover({ path: "/repo/widgets" });
const done = await installer.install(offered[0]);
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
check("and the build records which compiler made it", lock.builds["@demo/clock"].compiler, compiler);
check("and it is not loaded to draw the widget", lock.widgets["@demo/clock"].files.hasOwnProperty(compiler), false);

console.log(
	`\n${failed === 0 ? `tailwind against the real package: clean (${checks} checks, ${Date.now() - started}ms)` : `tailwind against the real package: ${failed} failed`}`,
);
process.exit(failed === 0 ? 0 : 1);
