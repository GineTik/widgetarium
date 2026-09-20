import fs from "node:fs";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of [
	"window",
	"document",
	"Node",
	"Element",
	"HTMLElement",
	"SVGElement",
	"getComputedStyle",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"KeyboardEvent",
	"MouseEvent",
	"PointerEvent",
	"Event",
	"MutationObserver",
]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { Catalogue } = await import("./.mjs-cache/catalogue.mjs");
const { DOC_PAGES, pageAfter, pagesMatching } = await import("./.mjs-cache/docs.mjs");
const { SURFACES } = await import("./.mjs-cache/tree.mjs");
const { ROLES } = await import("./.mjs-cache/surface-roles.mjs");
const { lintBoard } = await import("./.mjs-cache/board-lint.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

const FILE_OF = (page) => `docs/catalogue/${page.id}.md`;

check(
	"every page is a file on disk",
	DOC_PAGES.filter((page) => !fs.existsSync(FILE_OF(page))).map((page) => page.id),
	[],
);
check(
	"and what the plugin carries is what that file says",
	DOC_PAGES.filter((page) => page.body !== fs.readFileSync(FILE_OF(page), "utf8")).map((page) => page.id),
	[],
);
check(
	"a page is named by its own first heading",
	DOC_PAGES.filter((page) => !page.body.startsWith(`# ${page.title}`)).map((page) => page.id),
	[],
);
check("the last page has nothing after it", pageAfter(DOC_PAGES[DOC_PAGES.length - 1].id), null);
check(
	"and every earlier one does",
	DOC_PAGES.slice(0, -1)
		.filter((page) => !pageAfter(page.id))
		.map((page) => page.id),
	[],
);

const publish = DOC_PAGES.find((page) => page.id === "publish-your-widget");
check(
	"the page about publishing carries the letter as its action",
	Boolean(publish?.action?.href.startsWith("mailto:")),
	true,
);
const letter = decodeURIComponent(publish.action.href.split("body=")[1] ?? "");
check("which asks for the repository", letter.includes("Repository: https://github.com/"), true);
check("the licence", letter.includes("Licence: MIT"), true);
check("and the pack the author wants", letter.includes("Pack I would like:"), true);
check("the registry file is named in the page itself", publish.body.includes("widgetarium-registry.json"), true);
check("and the page says a public repository is required", publish.body.includes("public"), true);

check(
	"searching the pages narrows them by their body, not only their titles",
	pagesMatching("LICENSE.md").map((page) => page.id),
	["publish-your-widget"],
);
check("a word in neither finds no page", pagesMatching("zzqq"), []);

const rendered = [];
const host = {
	can: { renderMarkdown: true },
	ui: {
		renderMarkdown(element, markdown) {
			rendered.push(markdown);
			element.textContent = markdown;
			return () => {};
		},
	},
};

const definition = (id, title) => ({
	manifest: { id, title, defaultSize: { w: 3, h: 2 }, keywords: ["tabs"] },
	component: () => h("div", null, title),
});
const registry = { list: () => [definition("@default/task-card", "Task card")], get: () => null };

const panel = dom.window.document.getElementById("host");
render(
	h(Catalogue, {
		registry,
		host,
		mode: "browse",
		available: [],
		onPick: () => {},
		onInstall: async () => ({ ok: true }),
	}),
	panel,
);
await settle();

const all = (selector) => [...panel.querySelectorAll(selector)];
const press = (node) => node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
const labelled = (selector) => all(selector).map((node) => node.querySelector(".wg-kit-row-label").textContent);

check("the catalogue offers both doors into the docs", labelled(".wg-cat-open-docs"), [
	"Add your own widget",
	"Documentation",
]);
check("and draws no page until one is pressed", all(".wg-doc").length, 0);

press(all(".wg-cat-open-docs")[0]);
await settle();

check("pressing one opens its page", all(".wg-doc").length, 1);
check("rendered through the host, so it looks like a note", rendered, [DOC_PAGES[0].body]);
check(
	"the sidebar becomes the contents",
	labelled(".wg-cat-page"),
	DOC_PAGES.map((page) => page.title),
);
check(
	"with the open one marked",
	all(".wg-cat-page")
		.filter((node) => node.getAttribute("aria-current") === "true")
		.map((node) => node.querySelector(".wg-kit-row-label").textContent),
	[DOC_PAGES[0].title],
);
check("the widgets are not drawn behind it", all(".wg-cat-tile").length, 0);
check("nor are the filters, which narrow nothing here", all(".wg-cat-facet").length, 0);
check(
	"and the page says which file it came from",
	panel.querySelector(".wg-doc-source").textContent,
	`docs/catalogue/${DOC_PAGES[0].id}.md`,
);

press(panel.querySelector(".wg-doc-next"));
await settle();
check("Next opens the page after it", rendered[rendered.length - 1], DOC_PAGES[1].body);
check(
	"which carries the letter as a link",
	panel.querySelector(".wg-doc-action").getAttribute("href").startsWith("mailto:"),
	true,
);
check("and nothing follows the last page", panel.querySelector(".wg-doc-next"), null);

press(panel.querySelector(".wg-cat-back"));
await settle();
check("Back to widgets draws the widgets again", all(".wg-cat-tile").length, 1);
check("and the docs are put away", all(".wg-doc").length, 0);

const plain = { can: { renderMarkdown: false }, ui: {} };
render(null, panel);
render(
	h(Catalogue, {
		registry,
		host: plain,
		mode: "browse",
		available: [],
		onPick: () => {},
		onInstall: async () => ({ ok: true }),
	}),
	panel,
);
await settle();
press(all(".wg-cat-open-docs")[0]);
await settle();
check(
	"a host that cannot render markdown still hands over the words",
	panel.querySelector(".wg-doc-plain")?.textContent,
	DOC_PAGES[0].body,
);

render(null, panel);

const CHAT_BRIEF = fs.readFileSync("docs/ai/chat-brief.md", "utf8");
const BOARD = fs.readFileSync("docs/ai/board.md", "utf8");
const SURFACES_PAGE = fs.readFileSync("docs/ai/surfaces.md", "utf8");
const EXAMPLES = fs.readFileSync("docs/ai/examples.md", "utf8");

const named = (text, word) => new RegExp("`" + word + "`").test(text);

check(
	"every surface the engine holds is named on the surfaces page",
	SURFACES.filter((surface) => !named(SURFACES_PAGE, surface)),
	[],
);
check(
	"and the page names no surface the engine dropped",
	["item", "raise", "fill", "outline", "divider"].filter((gone) => named(SURFACES_PAGE, gone)),
	[],
);
check(
	"no example writes a surface the engine would refuse",
	[...EXAMPLES.matchAll(/surface: ([a-z]+)/g)].map((found) => found[1]).filter((said) => !SURFACES.includes(said)),
	[],
);
check(
	"and every role an example declares is one the engine knows",
	[...EXAMPLES.matchAll(/role: ([a-z]+)/g)].map((found) => found[1]).filter((said) => !ROLES.includes(said)),
	[],
);

const boardsIn = (text) => [...text.matchAll(/```widgetarium\n([\s\S]*?)```/g)].map((found) => parseYaml(found[1]));

const cardOf = (id) => JSON.parse(fs.readFileSync(`widgets/${id}/manifest.generated.json`, "utf8"));
const leavesIn = (node) => (node?.of ? node.of.flatMap(leavesIn) : node?.id ? [node.id] : []);

const boards = boardsIn(EXAMPLES);
check("the examples page holds whole boards", boards.length >= 3, true);
check(
	"every widget an example names is one this repo ships",
	boards.flatMap((board) => board.tiles.map((tile) => tile.widget)).filter((id) => !fs.existsSync(`widgets/${id}`)),
	[],
);
check(
	"every prop an example binds is one its widget declares",
	boards.flatMap((board) =>
		board.tiles.flatMap((tile) =>
			Object.keys(tile.props ?? {})
				.filter((name) => !Object.hasOwn(cardOf(tile.widget).props ?? {}, name))
				.map((name) => `${tile.widget} has no ${name}`),
		),
	),
	[],
);
check(
	"every ref an example writes points at a tile and a prop that exist",
	boards.flatMap((board) =>
		board.tiles.flatMap((tile) =>
			Object.values(tile.props ?? {})
				.filter((bound) => bound?.from === "ref")
				.map((bound) => bound.ref)
				.filter((ref) => {
					const [said, prop] = String(ref).split("/");
					const target = board.tiles.find((one) => one.id === said);
					return !target || !Object.hasOwn(cardOf(target.widget).props ?? {}, prop);
				}),
		),
	),
	[],
);
check(
	"every tile an example declares is placed, and every leaf names a tile",
	boards.flatMap((board) => {
		const placed = leavesIn(board.layout);
		const held = board.tiles.map((tile) => tile.id);
		return [
			...held.filter((id) => !placed.includes(id)).map((id) => `${id} is never placed`),
			...placed.filter((id) => !held.includes(id)).map((id) => `${id} stands in no tiles list`),
		];
	}),
	[],
);

const CARDS_ON_DISK = fs
	.readdirSync("widgets")
	.filter((scope) => scope.startsWith("@"))
	.flatMap((scope) =>
		fs
			.readdirSync(`widgets/${scope}`)
			.filter((name) => fs.existsSync(`widgets/${scope}/${name}/manifest.generated.json`))
			.map((name) => ({
				id: `${scope}/${name}`,
				role: JSON.parse(fs.readFileSync(`widgets/${scope}/${name}/manifest.generated.json`, "utf8")).role ?? null,
			})),
	);

const roleOf = (widget) => CARDS_ON_DISK.find((card) => card.id === widget)?.role ?? null;
const linted = boards.flatMap((board, at) =>
	lintBoard(board, roleOf).map((one) => `Example ${at + 1} ${one.path.join("/") || "root"}: ${one.message}`),
);
check("every example passes the linter the agent must pass", linted, []);

const RESTATED_IN_THE_CHAT_BRIEF = [
	["the spacing steps", "16px one box down, 8px deeper", SURFACES_PAGE, "16px one box down, 8px deeper"],
	["a board of typed tiles", "is a mock-up, not a screen", BOARD, "is a mock-up, not a screen"],
	["the vault binding", "from: vault", BOARD, "from: vault"],
	["the ref binding", "from: ref", BOARD, "from: ref"],
	["the lint command", "lint <note> --text", BOARD, "lint"],
];

const unwrapped = (text) => text.replace(/\s+/g, " ");

for (const [what, said, owner, ownersWords] of RESTATED_IN_THE_CHAT_BRIEF) {
	check(`${what}: the chat brief a talking model holds still says it`, unwrapped(CHAT_BRIEF).includes(said), true);
	check(`${what}: and the handbook page that owns it still does`, unwrapped(owner).includes(ownersWords), true);
}

console.log(failed === 0 ? "\ndocs: clean" : `\ndocs: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
