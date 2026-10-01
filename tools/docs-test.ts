import fs from "node:fs";
import { JSDOM } from "jsdom";
import { parse as parseYaml } from "yaml";
import { z } from "../packages/core/src/gateway/declared.ts";
import type { CatalogueProps } from "../packages/core/src/catalogue.js";
import { byId, found } from "./dom-find.ts";
import { fieldIn, itemsIn } from "./held-fields.ts";
import { present } from "./page-dom.ts";
import { standIn } from "./stand-in.ts";

const ExampleBoardSchema = z.looseObject({
	tiles: z.array(
		z.looseObject({ id: z.string(), widget: z.string(), props: z.record(z.string(), z.unknown()).optional() }),
	),
	layout: z.unknown(),
});

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	KeyboardEvent: dom.window.KeyboardEvent,
	MouseEvent: dom.window.MouseEvent,
	PointerEvent: Reflect.get(dom.window, "PointerEvent"),
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
});
class InertResizeObserver {
	observe(): void {}
	disconnect(): void {}
}
Object.assign(globalThis, { ResizeObserver: InertResizeObserver });
Object.assign(dom.window, { ResizeObserver: InertResizeObserver });
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { Catalogue } = await import("../packages/core/src/catalogue.js");
const { DOC_PAGES, pageAfter, pagesMatching } = await import("../packages/core/src/docs.js");
const { SURFACES } = await import("../packages/core/src/tree.js");
const { ROLES } = await import("../packages/core/src/surface-roles.js");
const { lintBoard } = await import("../packages/core/src/board-lint.js");

let failed = 0;
function check(name: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}
const settle = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 30));

const FILE_OF = (page: { readonly id: string }): string => `docs/catalogue/${page.id}.md`;

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
check("the last page has nothing after it", pageAfter(DOC_PAGES[DOC_PAGES.length - 1]?.id ?? ""), null);
check(
	"and every earlier one does",
	DOC_PAGES.slice(0, -1)
		.filter((page) => !pageAfter(page.id))
		.map((page) => page.id),
	[],
);

const publish = present(
	DOC_PAGES.find((page) => page.id === "publish-your-widget"),
	"the publishing page",
);
check(
	"the page about publishing carries the letter as its action",
	Boolean(publish.action?.href.startsWith("mailto:")),
	true,
);
const letter = decodeURIComponent(publish.action?.href.split("body=")[1] ?? "");
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

type CatalogueHost = NonNullable<CatalogueProps["host"]>;

const rendered: string[] = [];
const host = standIn<CatalogueHost>(
	{
		can: { renderMarkdown: true },
		ui: {
			renderMarkdown(element: HTMLElement, markdown: string) {
				rendered.push(markdown);
				element.textContent = markdown;
				return () => {};
			},
		},
	},
	["can", "ui"],
	"markdown host",
);

const definition = (id: string, title: string): ReturnType<CatalogueProps["registry"]["list"]>[number] => ({
	manifest: { id, title, defaultSize: { w: 3, h: 2 }, keywords: ["tabs"] },
	component: () => h("div", null, title),
});
const registry: CatalogueProps["registry"] = {
	list: () => [definition("@default/task-card", "Task card")],
	get: () => null,
};

const panel = byId(dom.window.document, "host");
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

const all = (selector: string): Element[] => [...panel.querySelectorAll(selector)];
const press = (node: Element | undefined): boolean =>
	present(node, "the pressed node").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
const labelled = (selector: string): (string | null | undefined)[] =>
	all(selector).map((node) => node.querySelector(".wg-kit-row-label")?.textContent);

check("the catalogue offers both doors into the docs", labelled(".wg-cat-open-docs"), [
	"Add your own widget",
	"Documentation",
]);
check("and draws no page until one is pressed", all(".wg-doc").length, 0);

press(all(".wg-cat-open-docs")[0]);
await settle();

check("pressing one opens its page", all(".wg-doc").length, 1);
check("rendered through the host, so it looks like a note", rendered, [DOC_PAGES[0]?.body]);
check(
	"the sidebar becomes the contents",
	labelled(".wg-cat-page"),
	DOC_PAGES.map((page) => page.title),
);
check(
	"with the open one marked",
	all(".wg-cat-page")
		.filter((node) => node.getAttribute("aria-current") === "true")
		.map((node) => node.querySelector(".wg-kit-row-label")?.textContent),
	[DOC_PAGES[0]?.title],
);
check("the widgets are not drawn behind it", all(".wg-cat-tile").length, 0);
check("nor are the filters, which narrow nothing here", all(".wg-cat-facet").length, 0);
check(
	"and the page says which file it came from",
	found(panel, ".wg-doc-source").textContent,
	`docs/catalogue/${DOC_PAGES[0]?.id}.md`,
);

press(found(panel, ".wg-doc-next"));
await settle();
check("Next opens the page after it", rendered[rendered.length - 1], DOC_PAGES[1]?.body);
check(
	"which carries the letter as a link",
	found(panel, ".wg-doc-action").getAttribute("href")?.startsWith("mailto:"),
	true,
);
check("and nothing follows the last page", panel.querySelector(".wg-doc-next"), null);

press(found(panel, ".wg-cat-back"));
await settle();
check("Back to widgets draws the widgets again", all(".wg-cat-tile").length, 1);
check("and the docs are put away", all(".wg-doc").length, 0);

const plain = standIn<CatalogueHost>({ can: { renderMarkdown: false }, ui: {} }, ["can", "ui"], "plain host");
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
	DOC_PAGES[0]?.body,
);

render(null, panel);

const CHAT_BRIEF = fs.readFileSync("docs/ai/chat-brief.md", "utf8");
const BOARD = fs.readFileSync("docs/ai/board.md", "utf8");
const SURFACES_PAGE = fs.readFileSync("docs/ai/surfaces.md", "utf8");
const EXAMPLES = fs.readFileSync("docs/ai/examples.md", "utf8");

const includesWord = (words: readonly string[], said: string): boolean => words.includes(said);

const named = (text: string, word: string): boolean => new RegExp("`" + word + "`").test(text);

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
	[...EXAMPLES.matchAll(/surface: ([a-z]+)/g)]
		.map((match) => match[1] ?? "")
		.filter((said) => !includesWord(SURFACES, said)),
	[],
);
check(
	"and every role an example declares is one the engine knows",
	[...EXAMPLES.matchAll(/role: ([a-z]+)/g)].map((match) => match[1] ?? "").filter((said) => !includesWord(ROLES, said)),
	[],
);

type ExampleBoard = z.infer<typeof ExampleBoardSchema>;

const boardsIn = (text: string): ExampleBoard[] =>
	[...text.matchAll(/```widgetarium\n([\s\S]*?)```/g)].map((match) =>
		ExampleBoardSchema.parse(parseYaml(match[1] ?? "")),
	);

const cardOf = (id: string): unknown => JSON.parse(fs.readFileSync(`registry/${id}/manifest.generated.json`, "utf8"));
const declaresProp = (id: string, name: string | undefined): boolean =>
	Object.hasOwn(Object(fieldIn(cardOf(id), "props") ?? {}), name ?? "");
const leavesIn = (node: unknown): string[] => {
	const of = fieldIn(node, "of");
	const id = fieldIn(node, "id");
	if (of) return itemsIn(of).flatMap(leavesIn);
	return id ? [String(id)] : [];
};

const boards = boardsIn(EXAMPLES);
check("the examples page holds whole boards", boards.length >= 3, true);
check(
	"every widget an example names is one this repo ships",
	boards.flatMap((board) => board.tiles.map((tile) => tile.widget)).filter((id) => !fs.existsSync(`registry/${id}`)),
	[],
);
check(
	"every prop an example binds is one its widget declares",
	boards.flatMap((board) =>
		board.tiles.flatMap((tile) =>
			Object.keys(tile.props ?? {})
				.filter((name) => !declaresProp(tile.widget, name))
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
				.filter((bound) => fieldIn(bound, "from") === "ref")
				.map((bound) => fieldIn(bound, "ref"))
				.filter((ref) => {
					const [said, prop] = String(ref).split("/");
					const target = board.tiles.find((one) => one.id === said);
					return !target || !declaresProp(target.widget, prop);
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

function roleIn(card: unknown): string | null {
	const role = fieldIn(card, "role");
	return typeof role === "string" ? role : null;
}

const CARDS_ON_DISK = fs
	.readdirSync("registry")
	.filter((scope) => scope.startsWith("@"))
	.flatMap((scope) =>
		fs
			.readdirSync(`registry/${scope}`)
			.filter((name) => fs.existsSync(`registry/${scope}/${name}/manifest.generated.json`))
			.map((name) => ({
				id: `${scope}/${name}`,
				role: roleIn(JSON.parse(fs.readFileSync(`registry/${scope}/${name}/manifest.generated.json`, "utf8"))),
			})),
	);

const roleOf = (widget: unknown): string | null => CARDS_ON_DISK.find((card) => card.id === widget)?.role ?? null;
const linted = boards.flatMap((board, at) =>
	lintBoard(board, roleOf).map((one) => `Example ${at + 1} ${one.path.join("/") || "root"}: ${one.message}`),
);
check("every example passes the linter the agent must pass", linted, []);

const RESTATED_IN_THE_CHAT_BRIEF: readonly (readonly [string, string, string, string])[] = [
	["the spacing steps", "16px one box down, 8px deeper", SURFACES_PAGE, "16px one box down, 8px deeper"],
	["a board of typed tiles", "is a mock-up, not a screen", BOARD, "is a mock-up, not a screen"],
	["the vault binding", "from: vault", BOARD, "from: vault"],
	["the ref binding", "from: ref", BOARD, "from: ref"],
	["the lint command", "lint <note> --text", BOARD, "lint"],
];

const unwrapped = (text: string): string => text.replace(/\s+/g, " ");

for (const [what, said, owner, ownersWords] of RESTATED_IN_THE_CHAT_BRIEF) {
	check(`${what}: the chat brief a talking model holds still says it`, unwrapped(CHAT_BRIEF).includes(said), true);
	check(`${what}: and the handbook page that owns it still does`, unwrapped(owner).includes(ownersWords), true);
}

console.log(failed === 0 ? "\ndocs: clean" : `\ndocs: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
