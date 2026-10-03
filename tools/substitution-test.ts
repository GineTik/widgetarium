// Text becomes a widget, and the text is still there underneath. Proved on the fixture vault
// with the real registry, because a substitution that draws a stand-in proves nothing.
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { TEXT_LOADERS } from "../apps/obsidian/build.mts";
import type { App } from "obsidian";
import type { HostPlugin } from "../apps/obsidian/src/host.ts";
import type { Rule } from "../apps/obsidian/src/substitution.ts";
import type { NavigationTarget } from "../packages/core/src/gateway/host.ts";
import { found, foundAs } from "./dom-find.ts";
import { isRecord, present } from "./page-dom.ts";
import { standIn } from "./stand-in.ts";

const VAULT = process.env["WG_VAULT"] ?? "tools/fixture";

// CONTEXT: jsdom overwrites globalThis.Event, and node's own WebSocket rejects a foreign one
const NODE_EVENT = globalThis.Event;

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
const jsdomPointerEvent: unknown = dom.window["PointerEvent"];
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
	PointerEvent: jsdomPointerEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
});
class InertResizeObserver {
	observe(): void {}
	disconnect(): void {}
}
Object.assign(globalThis, { ResizeObserver: InertResizeObserver });
Object.assign(dom.window, { ResizeObserver: InertResizeObserver });
// CONTEXT: the catalogue draws nothing at zero width, and jsdom lays nothing out
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1280 });

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { CATALOGUE_REQUESTS } = await import("../packages/core/src/engine/catalogue-requests.js");
const { matchLines, normalizeRule, normalizeRules, newRule, ruleError, activeRules } =
	await import("../apps/obsidian/src/substitution.js");
const { sampleFromPattern } = await import("../apps/obsidian/src/regex-sample.js");
const { substituteIn, passageHere } = await import("../apps/obsidian/src/inline-render.js");
const { SubstitutionDialog } = await import("../apps/obsidian/src/substitution-dialog.js");
const { defaultSample, triggerLabel } = await import("../apps/obsidian/src/substitution-say.js");
const { WidgetRegistry, boardWidgets, inlineWidgets } = await import("../packages/core/src/registry.js");
const { createHost, bindNote } = await import("../apps/obsidian/src/host.js");
const { typeOf } = await import("../packages/core/src/engine/record-type.js");
const { readLink } = await import("../packages/core/src/engine/link.js");
const { findLines, replaceLines } = await import("../packages/core/src/engine/text-span.js");
const { TFile, TFolder, MarkdownRenderer } = await import("./loader/obsidian-stub.mts");
const { passageReader } = await import("../apps/obsidian/src/inline-render.js");
const { readTarget, UNREADABLE } = await import("../packages/core/src/engine/read-file.js");
const { previewReader } = await import("../packages/core/src/preview.js");

let failed = 0;
// CONTEXT: preact commits a state change on a microtask, so a press is read one tick later
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

function check(name: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const adapter = {
	exists: async (p: string) => fs.existsSync(path.join(VAULT, p)),
	list: async (p: string) => {
		const names = fs.readdirSync(path.join(VAULT, p));
		const kind = (name: string) => {
			try {
				return fs.statSync(path.join(VAULT, p, name));
			} catch {
				return null;
			}
		};
		return {
			folders: names.filter((name) => kind(name)?.isDirectory()).map((name) => `${p}/${name}`),
			files: names.filter((name) => kind(name)?.isFile()).map((name) => `${p}/${name}`),
		};
	},
	read: async (p: string) => fs.readFileSync(path.join(VAULT, p), "utf8"),
	stat: async () => ({ mtime: 1, size: 1 }),
};

const registry = new WidgetRegistry({ vault: { adapter } });
await registry.load();

const INLINE_ONLY = new Set(["@default/code-block", "@default/note", "@default/note-link", "@default/reminder"]);

// ── the rules themselves ─────────────────────────────────────────────────────────────────
function firstRule(rules: Rule[]): Rule {
	return present(rules[0], "the normalized rule");
}
const line = firstRule(
	normalizeRules([{ id: "r1", name: "Reminder", mode: "line", open: "!", widget: "@default/reminder" }]),
);
const wrapped = firstRule(
	normalizeRules([{ id: "r2", name: "Note", mode: "wrapped", open: ":::", close: ":::", widget: "@default/note" }]),
);
const expression = firstRule(
	normalizeRules([
		{ id: "r3", name: "Time", mode: "regex", pattern: "^@(\\d{1,2}:\\d{2})\\s+(.+)$", widget: "@default/reminder" },
	]),
);

check(
	"a widget that declares itself inline is offered for text",
	inlineWidgets(registry.list())
		.map((entry) => entry.manifest.id)
		.sort(),
	[...INLINE_ONLY].sort(),
);
check(
	"and one that claims no tile size is never offered for a board",
	boardWidgets(registry.list()).some((entry) => INLINE_ONLY.has(entry.manifest.id)),
	false,
);
check(
	"a widget that claims both would be offered in both",
	boardWidgets([{ manifest: { id: "x", inline: true, defaultSize: { w: 2, h: 1 } } }]).length,
	1,
);
check(
	"what makes a widget inline is the declaration, not the folder it sits in",
	inlineWidgets([{ manifest: { id: "@task/quote", inline: true } }, { manifest: { id: "@inline/impostor" } }]).map(
		(entry) => entry.manifest.id,
	),
	["@task/quote"],
);
check(
	"a broken widget keeps its place in the board catalogue",
	boardWidgets([{ manifest: { id: "broken" }, error: new Error("x") }]).length,
	1,
);

check(
	"a line trigger takes the rest of its line",
	matchLines(["! call Olena"], [line]).map((span) => span.content),
	["call Olena"],
);
check("a line without the trigger is left alone", matchLines(["call Olena"], [line]).length, 0);
check(
	"only the triggered line is taken",
	matchLines(["plain", "! call", "plain"], [line]).map((span) => [span.from, span.to]),
	[[1, 1]],
);

check(
	"a capsule takes what is between its markers",
	matchLines([":::", "one", "two", ":::"], [wrapped]).map((span) => span.content),
	["one\ntwo"],
);
check(
	"a capsule spans from opener to closer",
	matchLines([":::", "one", ":::"], [wrapped]).map((span) => [span.from, span.to]),
	[[0, 2]],
);
check("an unclosed capsule matches nothing", matchLines([":::", "one"], [wrapped]).length, 0);

check(
	"an expression hands over its first group",
	matchLines(["@14:30 standup"], [expression]).map((span) => span.content),
	["14:30"],
);
check(
	"an expression with no group hands over the whole match",
	matchLines(["x9x"], normalizeRules([{ mode: "regex", pattern: "\\d", widget: "@default/reminder" }])).map(
		(span) => span.content,
	),
	["9"],
);
check("a line the expression does not match is left alone", matchLines(["at 14:30 standup"], [expression]).length, 0);

check("a rule with no widget is refused", ruleError({ ...line, widget: "" }), "Pick a widget");
check("a rule with no trigger is refused", ruleError({ ...line, open: "" }), "Write a trigger");
check("a capsule with no closer is refused", ruleError({ ...wrapped, close: "" }), "Write a closing trigger");
check(
	"an unreadable expression is refused",
	ruleError({ ...expression, pattern: "(((" }),
	"That expression cannot be read",
);
check("a refused rule never substitutes", matchLines(["! call"], [{ ...line, widget: "" }]).length, 0);
check("a draft never substitutes", matchLines(["! call"], [{ ...line, draft: true }]).length, 0);
check("a rule switched off never substitutes", matchLines(["! call"], [{ ...line, enabled: false }]).length, 0);
check(
	"only usable rules are active",
	activeRules([line, { ...wrapped, draft: true }]).map((rule) => rule.id),
	["r1"],
);

const both = [line, firstRule(normalizeRules([{ id: "r9", mode: "line", open: "!", widget: "@default/note" }]))];
check(
	"the first rule listed wins a line two rules claim",
	matchLines(["! call"], both).map((span) => span.rule.id),
	["r1"],
);

check("a new rule is born a draft", newRule([]).draft, true);
check("a new rule takes an id nobody holds", newRule(normalizeRules([{ id: "sub-1" }])).id, "sub-2");

// ── the generated example ────────────────────────────────────────────────────────────────
check(
	"an expression becomes a line a person can read",
	sampleFromPattern("^@(\\d{1,2}:\\d{2})\\s+(.+)$"),
	"@11:11 text",
);
check(
	"a generated line really matches its own expression",
	new RegExp("^@(\\d{1,2}:\\d{2})\\s+(.+)$").test(String(sampleFromPattern("^@(\\d{1,2}:\\d{2})\\s+(.+)$"))),
	true,
);
check("an alternation takes its first branch", sampleFromPattern("^\\[(x| )\\]\\s(.+)$"), "[x] text");
check("an unreadable expression generates nothing", sampleFromPattern("((("), null);
check("the capsule sample carries both markers", defaultSample(wrapped, undefined).split("\n").at(-1), ":::");
check(
	"the example is a line the chosen widget can draw",
	defaultSample(normalizeRule({ mode: "line", open: "!code" }), registry.get("@default/code-block")),
	"!code main.py",
);
check(
	"and a widget offering no sample still gets one",
	defaultSample(line, registry.get("@default/reminder")).startsWith("! "),
	true,
);
check("the sidebar names a capsule by both its ends", triggerLabel(wrapped), "::: … :::");

// ── the note, substituted ────────────────────────────────────────────────────────────────
function noteWith(html: string): HTMLElement {
	const element = dom.window.document.createElement("div");
	element.innerHTML = html;
	found(dom.window.document, "#host").replaceChildren(element);
	return element;
}

const children: unknown[] = [];
const NOTE = "Orbitask/Board.md";
const SOURCE = ["intro", "! call Olena before Friday", "outro"].join("\n");
interface VaultPath {
	readonly path: string;
}
interface HeldFile {
	readonly file: VaultPath;
	text: string;
}
const files = new Map<string, HeldFile>();
function heldAt(path: string): HeldFile {
	return present(files.get(path), path);
}
function fakeFile(path: string, text: string) {
	const file = Object.assign(new TFile(), {
		path,
		basename: (path.split("/").pop() ?? "").replace(/\.md$/, ""),
		stat: { ctime: 0, mtime: 0, size: text.length },
	});
	files.set(path, { file, text });
	return file;
}
function fakeFolder(path: string) {
	const folder = Object.assign(new TFolder(), { path });
	files.set(path, { file: folder, text: "" });
	return folder;
}
fakeFile(NOTE, SOURCE);
fakeFile("Orbitask/Plain/Notes.md", "");
fakeFolder("Orbitask/Tasks");
const PYTHON = Array.from({ length: 45 }, (_, at) => `print(${at + 1})`).join("\n");
fakeFile("Orbitask/main.py", PYTHON);
fakeFile("Orbitask/notes.conf", "listen 8080\n");
// CONTEXT: three backticks and four, so the longest run a fence must clear is four
fakeFile("Orbitask/fence.md", ["a fenced sample:", "```", "code", "```", "````", "outer", "````"].join("\n"));
fakeFile("Orbitask/photo.png", "not really a picture");
fakeFile("Orbitask/blob.dat", `plain enough${String.fromCharCode(0)}then not`);
fakeFile("Orbitask/huge.log", "x".repeat(300 * 1024));
fakeFile("Orbitask/Code.md", "!code main.py");

const opened: string[] = [];
const leavesAsked: unknown[] = [];
const fakeApp = {
	vault: {
		getAbstractFileByPath: (path: string) => files.get(path)?.file ?? null,
		read: async (file: VaultPath) => heldAt(file.path).text,
		cachedRead: async (file: VaultPath) => heldAt(file.path).text,
		modify: async (file: VaultPath, text: string) => {
			heldAt(file.path).text = text;
		},
		process: async (file: VaultPath, change: (text: string) => string) => {
			heldAt(file.path).text = change(heldAt(file.path).text);
		},
	},
	metadataCache: {
		getFileCache: () => ({ frontmatter: { board: "Marketing" }, embeds: [] }),
		getFirstLinkpathDest: (target: string) =>
			files.get(`Orbitask/${target}`)?.file ?? files.get(`Orbitask/${target}.md`)?.file ?? null,
	},
	workspace: {
		getLeaf: (kind: unknown) => {
			leavesAsked.push(kind);
			return { openFile: (file: VaultPath) => opened.push(file.path) };
		},
	},
};
const app = standIn<App>(fakeApp, ["vault", "metadataCache", "workspace"], "app");
const host = bindNote(
	createHost(app, standIn<HostPlugin>({ addChild() {}, removeChild() {} }, ["addChild", "removeChild"], "plugin")),
	NOTE,
);
const context = {
	sourcePath: NOTE,
	addChild: (child: unknown) => children.push(child),
	getSectionInfo: () => ({ text: SOURCE, lineStart: 0, lineEnd: 2 }),
};
const substitute = (element: HTMLElement, rules: readonly Rule[]) =>
	substituteIn({ element, context, rules, registry, app, host });

const one = noteWith("<p>! call Olena before Friday</p>");
check("a whole paragraph that matches is replaced", substitute(one, [line]), 1);
check(
	"the paragraph itself is gone, not wrapped around the widget",
	one.querySelectorAll("p.wgi-note-line, p").length,
	0,
);
check("the widget the rule names is what got drawn", one.querySelectorAll(".wgi-reminder").length, 1);
check(
	"the widget was handed the text after the trigger",
	found(one, ".wgi-reminder-text").textContent,
	"call Olena before Friday",
);

// CONTEXT: Obsidian hands the paragraph itself as often as a wrapper around it
const bare = foundAs(noteWith("<p>! call Olena before Friday</p>"), "p", dom.window.HTMLElement);
check("a paragraph handed in directly is substituted too", substitute(bare, [line]), 1);
check("the widget lands inside the element the processor was handed", bare.querySelectorAll(".wgi-reminder").length, 1);
check("which is still where Obsidian put it, not replaced out of the note", bare.isConnected, true);

const mixed = noteWith("<p>before<br>! call Olena<br>after</p>");
check("one line inside a paragraph is replaced", substitute(mixed, [line]), 1);
const kept = [...found(mixed, "p").childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent);
check("the lines around it stay, in the order they were written", kept, ["before", "after"]);
check("and the widget sits between them", mixed.querySelectorAll("p .wgi-reminder").length, 1);

const capsule = noteWith("<p>:::<br>one<br>two<br>:::</p>");
check("a capsule inside one paragraph is replaced", substitute(capsule, [wrapped]), 1);
check(
	"every line between the markers reaches the widget",
	[...capsule.querySelectorAll(".wgi-note-line")].map((node) => node.textContent),
	["one", "two"],
);

const fenced = noteWith("<pre><code>! call Olena</code></pre>");
check("a trigger inside a code block is not a trigger", substitute(fenced, [line]), 0);

const quoted = noteWith("<p><code>! call Olena</code> is how you write it</p>");
check("a trigger a person quoted as code does not fire", substitute(quoted, [line]), 0);
check(
	"and the quoted line is left exactly as it was",
	found(quoted, "p").textContent,
	"! call Olena is how you write it",
);

const boarded = noteWith('<div class="wg-mount"><p>! call Olena</p></div>');
check("a trigger inside a board is left to the board", substitute(boarded, [line]), 0);

const missing = noteWith("<p>! call Olena</p>");
substitute(missing, [{ ...line, widget: "@inline/nothing" }]);
check(
	"a rule naming a widget nobody installed still shows the text",
	missing.querySelector(".wg-inline-raw")?.textContent,
	"! call Olena",
);
check("and says why there is no widget", missing.querySelector(".wg-inline-why")?.textContent, "widget not installed");

// CONTEXT: every kit rule and --wg-kit-* token is hung on these scopes, so a host outside them is unpainted
const styleSheet = fs.readFileSync("apps/obsidian/styles.css", "utf8");
const kitScopes = [
	...new Set(
		[...styleSheet.matchAll(/:is\(([^)]*)\)\s+\.wg-kit-/g)].flatMap((found) =>
			(found[1] ?? "").split(",").map((one) => one.trim()),
		),
	),
];
check("the kit hangs its rules on scopes, not on the page", kitScopes, [".wg-root", ".wg-portal"]);

const painted = noteWith("<p>! call Olena before Friday</p>");
substitute(painted, [line]);
const inlineHost = found(painted, ".wg-inline-host");
check(
	"an inline host carries one of those scopes itself",
	kitScopes.filter((scope) => inlineHost.matches(scope)),
	[".wg-root"],
);
const toggle = inlineHost.querySelector(".wg-kit-icon");
check("its toggle is a kit control", Boolean(toggle), true);
check(
	"and it stands where the kit's own selector reaches it",
	kitScopes.some((scope) => Boolean(present(toggle, ".wg-kit-icon").closest(scope))),
	true,
);

// CONTEXT: the scope that carries the kit also lays out a board, toolbar band and all
const boardScope = /\n\.wg-root,[\s\S]*?\n\}/.exec(styleSheet)?.[0] ?? "";
check("the board scope reserves a band for its own toolbar", /\n\tpadding-top:/.test(boardScope), true);
check(
	"and a host in a note, which has no toolbar, takes that band back",
	/\.wg-inline-host\.wg-root\s*\{[^}]*padding-top:\s*0/.test(styleSheet),
	true,
);

const { setTracing, tracing, traceSub } = await import("../packages/core/src/trace.js");
const SUB_TAG = "[widgetarium:sub]";

function logged<T>(on: boolean, work: () => T): { answer: T; lines: string[] } {
	const said: string[] = [];
	const real = console.log;
	console.log = (...parts: unknown[]) =>
		said.push(parts.map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join(" "));
	setTracing(on);
	try {
		return { answer: work(), lines: said.filter((entry) => entry.startsWith(SUB_TAG)) };
	} finally {
		setTracing(false);
		console.log = real;
	}
}

interface TraceDetail {
	readonly drawn?: unknown;
	readonly seen?: unknown;
	readonly matched?: unknown;
	readonly tested?: unknown;
	readonly why?: unknown;
	readonly rules?: unknown;
	readonly resolved?: unknown;
	readonly host?: unknown;
}
const countOf = (lines: readonly string[], what: string) =>
	lines.filter((entry) => entry.startsWith(`${SUB_TAG} ${what} {`)).length;
const detailOf = (lines: readonly string[], what: string): TraceDetail => {
	const told = lines.find((entry) => entry.startsWith(`${SUB_TAG} ${what} {`));
	const detail: unknown = told ? JSON.parse(told.slice(`${SUB_TAG} ${what} `.length)) : {};
	return isRecord(detail) ? detail : {};
};

check("nobody is logged at unless they ask", tracing(), false);

const quietNote = noteWith("<p>! call Olena before Friday</p>");
const quiet = logged(false, () => substitute(quietNote, [line]));
const quietHtml = quietNote.innerHTML;
const loudNote = noteWith("<p>! call Olena before Friday</p>");
const loud = logged(true, () => substitute(loudNote, [line]));
check("with the log off the console hears nothing at all", quiet.lines.length, 0);
// CONTEXT: React's useId counts per root, so the id differs between two mounts of one tree
const normalizeIds = (html: string) => html.replace(/_r_[0-9a-z]+_/g, "_id_");
check(
	"and with it on the same run draws exactly the same thing",
	normalizeIds(loudNote.innerHTML),
	normalizeIds(quietHtml),
);
check("and answers the same count either way", [quiet.answer, loud.answer], [1, 1]);

const emptyNote = noteWith("<p>nothing to see here</p>");
const nothing = logged(true, () => substitute(emptyNote, [line]));
check("a run that draws nothing still says it started", countOf(nothing.lines, "process"), 1);
check("and still says how it ended", countOf(nothing.lines, "process done"), 1);
check(
	"and the ending is honest about the nothing",
	[nothing.answer, detailOf(nothing.lines, "process done").drawn],
	[0, 0],
);
check("while still owning up to the block it did look at", detailOf(nothing.lines, "process done").seen, 1);
check("a block it looked at and passed over reports no match", detailOf(nothing.lines, "block considered").matched, []);
check("and carries the line it tested", detailOf(nothing.lines, "block considered").tested, ["nothing to see here"]);

const rulelessNote = noteWith("<p>! call Olena</p>");
const ruleless = logged(true, () => substitute(rulelessNote, []));
check("a run that never started says so in its own result", detailOf(ruleless.lines, "process done").why, "no rules");
check("and it counted the rules it was handed", detailOf(ruleless.lines, "process").rules, 0);

const manyNote = noteWith("<p>! one<br>plain<br>! two</p>");
const many = logged(true, () => substitute(manyNote, [line]));
check(
	"the count it answers is the number of hosts it really built",
	many.answer,
	manyNote.querySelectorAll(".wg-inline-host").length,
);
check(
	"and the closing line carries that same number",
	detailOf(many.lines, "process done").drawn,
	manyNote.querySelectorAll(".wg-inline-host").length,
);
check("one intent line per host", countOf(many.lines, "substitute"), 2);
check("and one outcome line per host", countOf(many.lines, "substituted"), 2);
check("the outcome says the widget was found", detailOf(many.lines, "substituted").resolved, true);
check("and names the host it made", detailOf(many.lines, "substituted").host, "div.wg-inline-host.wg-root");

const uninstalledNote = noteWith("<p>! call Olena</p>");
const uninstalled = logged(true, () => substitute(uninstalledNote, [{ ...line, widget: "@inline/nothing" }]));
check(
	"a widget nobody installed is reported missing, not silently",
	detailOf(uninstalled.lines, "substituted").resolved,
	false,
);

const guardedNote = noteWith('<div class="wg-mount"><p>! call Olena</p></div>');
const guarded = logged(true, () => substitute(guardedNote, [line]));
check(
	"a skipped block names the guard that caught it",
	detailOf(guarded.lines, "block skipped").why,
	"inside .wg-mount",
);
check("and a guarded run sees no blocks at all", detailOf(guarded.lines, "process done").seen, 0);

const longNote = noteWith(`<p>! ${"x".repeat(200)}</p>`);
const long = logged(true, () => substitute(longNote, [line]));
check("a long line is cut short before it is logged", long.lines.join("").includes("x".repeat(200)), false);

const survived = logged(true, () => {
	traceSub("a detail that cannot be built", () => {
		throw new Error("nope");
	});
	return "the caller lived";
});
check("a log that throws never reaches the caller", survived.answer, "the caller lived");

// ── back to plain text ───────────────────────────────────────────────────────────────────
function textIn(node: Element | null | undefined, what: string): string {
	return present(node, what).textContent ?? "";
}
function disabledOf(node: Element): unknown {
	return "disabled" in node ? node.disabled : undefined;
}
const tap = async (node: Element | null | undefined) => {
	node?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await settle();
};
const openMenu = (root: ParentNode) => tap(root.querySelector(".wg-inline-more"));

const collapsible = noteWith("<p>! call Olena before Friday</p>");
substitute(collapsible, [line]);
await openMenu(collapsible);
const entries = [...collapsible.querySelectorAll(".wg-kit-pop-item")];
check("the corner control opens a menu of exactly two entries", entries.length, 2);
check("the first is the playground", textIn(entries[0], "the first entry").startsWith("Settings"), true);
check(
	"and it is honestly disabled, because a passage is not a board tile",
	disabledOf(present(entries[0], "the first entry")),
	true,
);
check("the second is what the toggle used to do", entries[1]?.textContent ?? null, "Show the source");
await tap(entries[0]);
check("pressing the disabled one changes nothing", collapsible.querySelectorAll(".wgi-reminder").length, 1);
await tap(entries[1]);
check(
	"pressing the source entry brings the source line back",
	collapsible.querySelector(".wg-inline-raw")?.textContent,
	"! call Olena before Friday",
);
check("and the widget is gone while the text is showing", collapsible.querySelectorAll(".wgi-reminder").length, 0);
await openMenu(collapsible);
check(
	"and the entry now offers the way back",
	collapsible.querySelector(".wg-inline-source")?.textContent ?? null,
	"Show the widget",
);
await tap(collapsible.querySelector(".wg-inline-source"));
check("pressing it again brings the widget back", collapsible.querySelectorAll(".wgi-reminder").length, 1);

const capsuleText = noteWith("<p>:::<br>one<br>:::</p>");
substitute(capsuleText, [wrapped]);
await openMenu(capsuleText);
await tap(capsuleText.querySelector(".wg-inline-source"));
check(
	"a capsule comes back with its markers, not just its middle",
	capsuleText.querySelector(".wg-inline-raw")?.textContent ?? null,
	":::\none\n:::",
);

// ── the Obsidian API, which is the whole point of an inline widget ───────────────────────
check("a rooted link is read against the root", readLink("/Folder/Note"), { rooted: true, path: "Folder/Note" });
check("a bare link is read as relative", readLink("Note"), { rooted: false, path: "Note" });
check("a link of nothing is not a link", readLink("   "), null);
check("a root with no path is not a link", readLink("/"), null);

check("the navigator finds a note by a relative link", host.navigator.resolve("Board"), NOTE);
check("and by a rooted one, extension or not", host.navigator.resolve("/Orbitask/Board"), NOTE);
check("a link to nothing resolves to nothing", host.navigator.resolve("/Nowhere"), null);
check("navigating opens the note", host.navigator.navigate("/Orbitask/Board") && opened.at(-1), NOTE);
check("navigating nowhere refuses instead of opening something else", host.navigator.navigate("/Nowhere"), false);
check(
	"a plain navigation replaces the tab it is in",
	[host.navigator.navigate("/Orbitask/Board"), leavesAsked.at(-1)],
	[true, false],
);
check(
	"a blank target opens a new tab",
	host.navigator.navigate("/Orbitask/Board", { target: "blank" }) && leavesAsked.at(-1),
	"tab",
);
check(
	"a target nobody knows is refused, not guessed",
	host.navigator.navigate(
		"/Orbitask/Board",
		standIn<{ target?: NavigationTarget }>({ target: "_top" }, ["target"], "navigation options"),
	),
	false,
);

const linked = noteWith("<p>-> Board</p>");
substitute(linked, normalizeRules([{ mode: "line", open: "->", widget: "@default/note-link" }]));
check("a widget asks the navigator whether a note exists", found(linked, ".wgi-link-state").textContent, "open");
found(linked, ".wgi-link").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("and asks it to open one", opened.at(-1), NOTE);

const unknown = noteWith("<p>-> Nowhere</p>");
substitute(unknown, normalizeRules([{ mode: "line", open: "->", widget: "@default/note-link" }]));
check(
	"a note that is not there says so instead of pretending",
	found(unknown, ".wgi-link-state").textContent,
	"not in this vault",
);

// ── here: one record, no list, and it can write itself back ──────────────────────────────
check("a board widget stands in an entry", present(host.here, "here").of, "entry");
check("an entry carries no body until it is fetched", present(host.here, "here").content, null);
check(
	"and fetching one brings the body with it",
	present(await present(host.here, "here").get(), "the entry").content,
	SOURCE,
);
check(
	"an entry knows what kind of thing it is",
	present(await present(host.here, "here").get(), "the entry").type,
	"markdown",
);

const passage = passageHere({
	app,
	sourcePath: NOTE,
	rawLines: ["! call Olena before Friday"],
	rule: line,
	content: "call Olena before Friday",
	section: { text: SOURCE, lineStart: 0, lineEnd: 2 },
});
check("an inline widget stands in a passage", passage.of, "passage");
check("a passage carries its text straight away", passage.content, "call Olena before Friday");
check("a passage can be written back", passage.canUpdate, true);
check(
	"writing it puts the trigger back on",
	(await passage.update("call Olena on Monday")) && heldAt(NOTE).text.split("\n")[1],
	"! call Olena on Monday",
);
check(
	"and leaves the lines around it alone",
	heldAt(NOTE)
		.text.split("\n")
		.filter((_row, at) => at !== 1),
	["intro", "outro"],
);

const fromExpression = passageHere({
	app,
	sourcePath: NOTE,
	rawLines: ["@14:30 standup"],
	rule: expression,
	content: "14:30",
	section: { text: "@14:30 standup", lineStart: 0, lineEnd: 0 },
});
check("a passage an expression matched cannot be written back", fromExpression.canUpdate, false);
check("and refuses rather than guessing how to spell the trigger", await fromExpression.update("15:00"), false);

const unlocatable = passageHere({
	app,
	sourcePath: NOTE,
	rawLines: ["! not in this note"],
	rule: line,
	content: "x",
	section: { text: SOURCE, lineStart: 0, lineEnd: 2 },
});
check("a passage nobody can find is not written", unlocatable.canUpdate, false);

check("lines found once report where", findLines(["a", "b", "c"], ["b"]), 1);
check("lines found twice report nowhere", findLines(["a", "b", "a"], ["a"]), -1);
check("lines found nowhere report nowhere", findLines(["a"], ["z"]), -1);
check("a run is matched whole, not line by line", findLines(["a", "b", "c"], ["b", "c"]), 1);
check("replacing a run keeps what surrounds it", replaceLines(["a", "b", "c"], 1, 1, ["x", "y"]), ["a", "x", "y", "c"]);

// ── a file becomes a code block ──────────────────────────────────────────────────────────
const TICKS = "```";
const codeRule = firstRule(
	normalizeRules([{ id: "r4", name: "Code", mode: "line", open: "!code", widget: "@default/code-block" }]),
);
// CONTEXT: a widget that reads a file paints a frame after the read lands, not with it
const paint = async () => {
	for (let frame = 0; frame < 3; frame += 1) await settle();
};
const press = async (node: Element) => {
	node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
	await paint();
};

const failureOf = (target: ReturnType<typeof readTarget>) => (target.ok ? undefined : target.failure);
const linkOf = (target: ReturnType<typeof readTarget>) => (target.ok ? target.link : undefined);
check(
	"a walk out of the vault is refused before anything is opened",
	failureOf(readTarget("../../etc/passwd")),
	"../../etc/passwd is outside the vault",
);
check("and so is a home directory", readTarget("~/Documents/keys.txt").ok, false);
check("and so is a drive letter", readTarget("C:/Windows/system.ini").ok, false);
check("nothing named is nothing to read", readTarget("   ").ok, false);
check("an ordinary link passes, trimmed", linkOf(readTarget("  main.py  ")), "main.py");

check("the reader hands over what the file holds", (await host.reader.read("main.py")).text.split("\n")[0], "print(1)");
check("and says where it read it", (await host.reader.read("main.py")).path, "Orbitask/main.py");
check(
	"a file that is not there is refused, never empty",
	(await host.reader.read("gone.py")).failure,
	"gone.py is not in this vault",
);
check(
	"a folder is refused as a folder",
	(await host.reader.read("/Orbitask/Tasks")).failure,
	"Orbitask/Tasks is a folder, not a file",
);
check("a file over the cap is refused", (await host.reader.read("huge.log", { maxBytes: 1024 })).ok, false);
check(
	"and the refusal names the number",
	/over the 1 KB limit/.test(String((await host.reader.read("huge.log", { maxBytes: 1024 })).failure)),
	true,
);
check("a refused read still carries a text, so nobody reads undefined", (await host.reader.read("gone.py")).text, "");
check("a host with nothing to read still answers", (await UNREADABLE.read("main.py")).ok, false);

const scoped = passageReader(host.reader, "!code main.py");
check("a widget may read the file its own passage names", (await scoped.read("main.py")).ok, true);
check(
	"and may not read one nobody wrote there",
	(await scoped.read("Plain/Notes.md")).failure,
	"Plain/Notes.md is not named here",
);
check(
	"a preview reads only the files its manifest declares",
	(await previewReader(present(registry.get("@default/code-block"), "@default/code-block").manifest).read("main.py"))
		.ok,
	true,
);
check(
	"and refuses anything else, so browsing cannot open a vault",
	(await previewReader({}).read("main.py")).ok,
	false,
);

const shownCode = noteWith("<p>!code main.py</p>");
substitute(shownCode, [codeRule]);
await paint();
const drawn = () => shownCode.querySelector(".wgc-body pre code")?.textContent.trim() ?? "";
check("the file is drawn as a code block", drawn().startsWith("print(1)"), true);
check("thirty lines to begin with, which is the manifest's number", drawn().split("\n").length, 30);
check(
	"and the rest is offered rather than hidden",
	shownCode.querySelector(".wgc-left")?.textContent ?? "",
	"15 lines left",
);
check(
	"the extension chose the language",
	String(MarkdownRenderer.calls.at(-1)?.markdown ?? "").split("\n")[0],
	`${TICKS}python`,
);
const more = shownCode.querySelector(".wgc-more button");
check("a control offers the rest, thirty at a time", more?.textContent, "Show 30 more");
if (more) await press(more);
check("one press adds thirty more", drawn().split("\n").length, 45);
check("and with nothing left the control goes", shownCode.querySelector(".wgc-more"), null);

const fencey = noteWith("<p>!code fence.md</p>");
substitute(fencey, [codeRule]);
await paint();
const wrapped2 = String(MarkdownRenderer.calls.at(-1)?.markdown ?? "");
check("a file holding backticks is wrapped in a longer fence", wrapped2.split("\n")[0], `${TICKS}\u0060\u0060markdown`);
check("and the fence closes with the same run", wrapped2.endsWith(`\n${TICKS}\u0060\u0060`), true);
check("markdown is not excluded — someone wants to see the source", fencey.querySelectorAll(".wgc-body").length, 1);

const binary = noteWith("<p>!code photo.png</p>");
substitute(binary, [codeRule]);
await paint();
check(
	"a picture is refused by its extension",
	binary.querySelector(".wgc-why")?.textContent ?? "",
	"a .png file is not text",
);
check("and nothing of it was drawn", binary.querySelectorAll(".wgc-body").length, 0);

const disguised = noteWith("<p>!code blob.dat</p>");
substitute(disguised, [codeRule]);
await paint();
check(
	"a binary nobody deny-listed is caught by its bytes",
	/reads as binary/.test(disguised.querySelector(".wgc-why")?.textContent ?? ""),
	true,
);

const absent = noteWith("<p>!code gone.py</p>");
substitute(absent, [codeRule]);
await paint();
check(
	"a file that is not there says so instead of drawing nothing",
	absent.querySelector(".wgc-why")?.textContent ?? "",
	"gone.py is not in this vault",
);

const oversize = noteWith("<p>!code huge.log</p>");
substitute(oversize, [codeRule]);
await paint();
check(
	"a file over the manifest's cap refuses, naming it",
	/over the 256 KB limit/.test(oversize.querySelector(".wgc-why")?.textContent ?? ""),
	true,
);

const custom = noteWith("<p>!code notes.conf</p>");
substitute(custom, [codeRule]);
await paint();
check(
	"an extension nobody mapped falls through to itself",
	custom.querySelector(".wgc-lang")?.textContent.trim() ?? "",
	"conf",
);
await press(found(custom, ".wgc-lang"));
const needle = custom.querySelector(".wg-kit-pop-search-field input");
check("the language list is searchable", Boolean(needle), true);
if (!(needle instanceof dom.window.HTMLInputElement)) throw new Error("the language search is not an input");
needle.value = "zigzag";
needle.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
await paint();
const offer = [...custom.querySelectorAll(".wg-kit-pop-item")].find((node) =>
	(node.textContent ?? "").includes("Use custom language"),
);
check("a language nobody listed is offered anyway", Boolean(offer), true);
await press(present(offer, "the custom language offer"));
check(
	"and it reaches the fence exactly as typed",
	String(MarkdownRenderer.calls.at(-1)?.markdown ?? "").split("\n")[0],
	`${TICKS}zigzag`,
);
check(
	"a custom language is used and forgotten, never added to the list",
	[...custom.querySelectorAll(".wg-kit-pop-item")].filter((node) => (node.textContent ?? "").trim() === "zigzag")
		.length,
	0,
);

const wroteLanguage = passageHere({
	app,
	sourcePath: "Orbitask/Code.md",
	rawLines: ["!code main.py"],
	rule: codeRule,
	content: "main.py",
	section: { text: "!code main.py", lineStart: 0, lineEnd: 0 },
});
check(
	"a picked language is written back into the line",
	(await wroteLanguage.update("main.py | zig")) && heldAt("Orbitask/Code.md").text,
	"!code main.py | zig",
);

const sheet = fs.readFileSync("apps/obsidian/styles.css", "utf8");
const codeSheet = shownCode.querySelector(".wgc-code style")?.textContent ?? "";
const ruleOf = (css: string, selector: string) => new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
const valueOf = (css: string, selector: string, property: string) =>
	new RegExp(`${property}\\s*:\\s*([^;]+)`).exec(ruleOf(css, selector))?.[1]?.trim() ?? "";

check(
	"the container draws no border of its own",
	/box-shadow|border(?!-radius)/.test(ruleOf(codeSheet, ".wgc-code") || "box-shadow"),
	false,
);

const theirCopy = shownCode.querySelector(".wgc-body pre .copy-code-button");
check("Obsidian's own renderer puts a copy button in the block it drew", Boolean(theirCopy), true);
check(
	"and the widget hides it, so ours is the only copy control",
	theirCopy && window.getComputedStyle(theirCopy).display,
	"none",
);

const controls: (Element | null)[] = [...shownCode.querySelectorAll(".wgc-bar button")].filter(
	(node) => !node.closest(".wg-kit-pop"),
);
controls.push(shownCode.querySelector(".wg-inline-more"));
check("three controls, and no fourth", controls.length, 3);
check(
	"every one of them is the kit's glass button",
	controls.every(
		(node) =>
			node?.classList.contains("wg-kit-glass") &&
			(node.classList.contains("wg-kit-btn") || node.classList.contains("wg-kit-icon")),
	),
	true,
);
check("the language is the one that says a word", textIn(controls[0], "the language control").trim(), "python");
check("copy is an icon, not the word", textIn(controls[1], "the copy control").trim(), "");
check("which still says what it does", present(controls[1], "the copy control").getAttribute("aria-label"), "Copy");
check(
	"the third is three dots, and says so",
	[
		present(controls[2], "the menu control").getAttribute("aria-label"),
		present(controls[2], "the menu control").querySelectorAll("circle").length,
	],
	["More", 3],
);
// CONTEXT: the menu is the note's own, drawn at the top right — the row must end before its box
const reserved = parseInt(valueOf(codeSheet, ".wgc-bar", "padding").split(/\s+/)[1] ?? "", 10);
const menuBox =
	parseInt(valueOf(sheet, ".wg-inline > span.wg-inline-at", "right"), 10) +
	parseInt(valueOf(sheet, ".wg-inline > span.wg-inline-at", "width"), 10);
check(
	"the menu is taken out of the flow and put in the corner",
	valueOf(sheet, ".wg-inline > span.wg-inline-at", "position"),
	"absolute",
);
check("the row reserves the menu's box, so the three read as one group", reserved >= menuBox, true);

// CONTEXT: every one of the three wears the same reveal class, so one law covers all three
const shy = [...shownCode.querySelectorAll(".wg-inline-shy")];
check("the controls are carried by one shy element each, never a rule per control", shy.length, 2);
check(
	"the bar of two is one of them",
	shy.some((node) => node.classList.contains("wgc-bar")),
	true,
);
check(
	"and the corner menu is the other",
	shy.some((node) => node.classList.contains("wg-inline-at")),
	true,
);
check("the widget no longer forces the corner control open", /wg-inline-(toggle|more|shy)/.test(codeSheet), false);
check(
	"the fade is declared once, on the shy class itself",
	/opacity:\s*0;[\s\S]*?transition:\s*opacity/.test(ruleOf(sheet, ".wg-inline-shy")),
	true,
);

const listRule = ruleOf(sheet, ".wg-kit-pop-list");
check(
	"the popover list is capped and scrolls",
	/max-height/.test(listRule) && /overflow-y:\s*auto/.test(listRule),
	true,
);
check("at ten rows", Number(/--wg-kit-pop-rows,\s*(\d+)/.exec(listRule)?.[1]), 10);

await press(found(custom, ".wgc-lang"));
const list = custom.querySelector(".wg-kit-pop-list");
check("and the list sits in a box that can carry the edges", Boolean(list?.closest(".wg-kit-pop-scroll")), true);
// CONTEXT: jsdom lays nothing out, so the metrics a scroll reports are handed over here
const scrolledTo = async (top: number) => {
	const scrolled = present(list, ".wg-kit-pop-list");
	for (const [name, value] of [
		["scrollTop", top],
		["clientHeight", 340],
		["scrollHeight", 1600],
	] as const) {
		Object.defineProperty(scrolled, name, { configurable: true, value });
	}
	scrolled.dispatchEvent(new dom.window.Event("scroll", { bubbles: true }));
	await paint();
	return [...custom.querySelectorAll(".wg-kit-pop-edge")].map((node) =>
		node.classList.contains("is-up") ? "up" : "down",
	);
};
check("at the top, one chevron says there is more below", await scrolledTo(0), ["down"]);
check("in the middle, both ends say so", await scrolledTo(700), ["up", "down"]);
check("at the end, only what is above is left", await scrolledTo(1260), ["up"]);

// ── what kind of thing a record is ───────────────────────────────────────────────────────
check("a note is markdown", typeOf("Folder/Note.md"), "markdown");
check("a drawing is not just another note", typeOf("Folder/Sketch.excalidraw.md"), "excalidraw");
check("every picture format answers the same", ["a.png", "b.JPG", "c.webp", "d.svg"].map(typeOf), [
	"image",
	"image",
	"image",
	"image",
]);
check("a format nobody listed answers with itself", typeOf("a.docx"), "docx");
check("something with no extension is a folder", typeOf("Folder"), "folder");

// ── the dialog ───────────────────────────────────────────────────────────────────────────
const panel = dom.window.document.createElement("div");
dom.window.document.body.appendChild(panel);
let held: Rule[] = [line, wrapped];
const draw = (): void =>
	render(
		h(SubstitutionDialog, {
			rules: held,
			registry,
			host,
			onChange: (next) => {
				held = next;
				draw();
			},
			onClose: () => {},
		}),
		panel,
	);
draw();
// CONTEXT: the dialog portals itself onto <body> from an effect, so it lands one tick later
await settle();

const at = (selector: string) => dom.window.document.querySelector(selector);
const the = (selector: string) => found(dom.window.document, selector);
const words = (selector: string) => the(selector).textContent ?? "";
const all = (selector: string) => [...dom.window.document.querySelectorAll(selector)];

const nameOn = (row: Element | null) =>
	present(found(present(row, "a rule row"), ".wg-kit-row-label").childNodes[0], "the row label").textContent;

check("the sidebar lists every rule", all(".wg-sub-item").map(nameOn), ["Reminder", "Note"]);
check(
	"the list sits on the left and the rule being written takes the room",
	[...the(".wg-sub").children].map((node) =>
		node.classList.contains("wg-sub-list") ? "wg-sub-list" : node.className.split(" ")[0],
	),
	["wg-sub-list", "wg-sub-main"],
);
check("the rules are rows of the kit's sidebar", all(".wg-sub-item.wg-kit-side-row").length, 2);
check(
	"and each is a real button, so a keyboard reaches it",
	all(".wg-sub-item").map((node) => node.tagName),
	["BUTTON", "BUTTON"],
);
check(
	"held in one group, the way every sidebar holds its values",
	all(".wg-sub-list .wg-kit-side-list .wg-sub-item").length,
	2,
);
check(
	"New is a row at the foot of the list, not a press beside the window's close",
	Boolean(at(".wg-sub-side-foot .wg-sub-new")),
	true,
);
check("and nothing floats over the block's own corner", all(".wg-sub-list .wg-kit-icon").length, 0);
check("the title sits inside the sidebar block", Boolean(at(".wg-sub-list.wg-kit-side > .wg-sub-side-head")), true);
check("under a line saying what a substitution is", Boolean(at(".wg-sub-side-head .wg-sub-side-lead")), true);
check("and the rules are the one group under it", all(".wg-sub-list .wg-sub-rules .wg-sub-item").length, 2);
check(
	"every row carries the trigger it answers to",
	all(".wg-sub-item .wg-sub-trg").map((node) => node.textContent),
	["!", "::: … :::"],
);
check("the first rule is the one open", nameOn(at(".wg-sub-item.is-selected")), "Reminder");
check("its sentence is the one for its mode", words(".wg-sub-words").startsWith("When a line starts with"), true);
check("the chosen widget is named on the button", words(".wg-sub-pick").includes("Reminder"), true);
check(
	"the sample shows the rule working",
	at(".wg-sub-out .wgi-reminder-text")?.textContent,
	"call Olena before Friday",
);
check(
	"the last stage is the line you write, the turn, and what it draws",
	[...the(".wg-sub-example").children].map((node) => node.className),
	["wg-sub-sample", "wg-sub-arrow", "wg-sub-out"],
);
check("so the editor says only the three stage names", all(".wg-sub-editor .wg-sub-step-name").length, 3);
check(
	"and every stage keeps its content in one block of its own",
	all(".wg-sub-step").map((node) => [...node.children].map((kid) => kid.className).join("+")),
	["wg-sub-step-label+wg-sub-step-body", "wg-sub-step-label+wg-sub-step-body", "wg-sub-step-label+wg-sub-step-body"],
);

const steps = all(".wg-sub-steps > .wg-sub-step");
check("the editor is three stages, one after another", steps.length, 3);
check(
	"each is numbered in the order it is read",
	steps.map((node) => node.querySelector(".wg-sub-step-no")?.textContent),
	["1", "2", "3"],
);
check(
	"and named for what it asks",
	steps.map((node) => node.querySelector(".wg-sub-step-name")?.textContent),
	["How it matches", "The rule", "The result"],
);
check(
	"each name carries the line that says what the stage wants",
	steps.every((node) => (node.querySelector(".wg-sub-step-hint")?.textContent ?? "").length > 0),
	true,
);
check(
	"the modes are the first stage",
	Boolean(present(steps[0], "the modes stage").querySelector(".wg-sub-tabs")),
	true,
);
check(
	"the sentence is the second",
	Boolean(present(steps[1], "the sentence stage").querySelector(".wg-sub-words")),
	true,
);
check(
	"what it draws is the third",
	Boolean(present(steps[2], "the result stage").querySelector(".wg-sub-example")),
	true,
);
check(
	"the head is not one of them",
	steps.some((node) => node.querySelector(".wg-sub-name")),
	false,
);
check("and it stands outside the column that scrolls", Boolean(at(".wg-sub-editor > .wg-sub-head")), true);

check("no status dot rides the rows", all(".wg-sub-dot").length, 0);
check("nor a tile where one sat", all(".wg-sub-item .wg-kit-side-icon").length, 0);
check("an enabled rule reads at full strength", all(".wg-sub-item.is-disabled").length, 0);
check(
	"a running rule is not marked in the list, because nothing is wrong with it",
	all(".wg-sub-item.is-selected .wg-sub-mark").length,
	0,
);
check("a saved rule offers nothing to save", disabledOf(the(".wg-sub-save")), true);
check("so the head spends no accent on it", all(".wg-sub-head .wg-kit-btn.is-accent").length, 0);
check("Delete is not painted with the accent", all(".wg-sub-head .wg-kit-btn.is-plain").length, 0);
check("it is the neutral one beside Save", the(".wg-sub-delete").textContent, "Delete");
check("the switch is not left bare — it is a named group", at(".wg-sub-power")?.textContent, "Enabled");
check("and the group is the kit's own solid plate", at(".wg-sub-power")?.classList.contains("wg-kit-card"), true);
check("with the switch inside it", Boolean(at(".wg-sub-power .wg-kit-switch")), true);
check(
	"the status reads as a pill, not as a line of chrome text",
	at(".wg-sub-state")?.classList.contains("wg-kit-pill"),
	true,
);
check("a rule that is running says so", the(".wg-sub-state").textContent, "Live");

the(".wg-sub-head .wg-kit-switch").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("switching a rule off is answered in the list", present(held[0], "the first rule").enabled, false);
check(
	"by the row itself, not by a marker on it",
	the(".wg-sub-item.is-selected").classList.contains("is-disabled"),
	true,
);
check("and only that row", all(".wg-sub-item.is-disabled").length, 1);
check("a flipped switch leaves an unsaved edit, and the head says that", the(".wg-sub-state").textContent, "Draft");
check(
	"now there is something to save, and Save is the one accent in the head",
	all(".wg-sub-head .wg-kit-btn.is-accent").map((node) => node.textContent),
	["Save"],
);
check("the list carries the same word", the(".wg-sub-item.is-selected .wg-sub-mark").textContent, "Draft");
the(".wg-sub-save").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("saved, the head says the rule is switched off", the(".wg-sub-state").textContent, "Off");
check("and Save goes quiet again", disabledOf(the(".wg-sub-save")), true);
the(".wg-sub-head .wg-kit-switch").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("switching it back on brings the row back", all(".wg-sub-item.is-disabled").length, 0);
the(".wg-sub-save").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("and saved again it is running", the(".wg-sub-state").textContent, "Live");

present(all(".wg-sub-item")[1], "the second rule row").dispatchEvent(
	new dom.window.MouseEvent("click", { bubbles: true }),
);
await settle();
check("picking another rule opens it", nameOn(at(".wg-sub-item.is-selected")), "Note");
check("and its sentence changes with it", words(".wg-sub-words").startsWith("When a block opens with"), true);
check("a capsule sentence names both ends", words(".wg-sub-words").includes("and closes with"), true);

const tabs = all(".wg-sub-tabs button");
check(
	"there are three modes to choose from",
	tabs.map((node) => node.textContent),
	["Line", "Wrapped", "Regex"],
);
present(tabs[2], "the regex tab").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("switching to regex rewrites the sentence", words(".wg-sub-words").startsWith("When a line matches"), true);
check("a rule with no expression yet says what is missing", at(".wg-sub-error")?.textContent, "Write an expression");
check("and cannot be saved while it is missing", disabledOf(the(".wg-sub-save")), true);
check("nor is the accent spent on a press that would be refused", all(".wg-sub-head .wg-kit-btn.is-accent").length, 0);
check("and the head says it is not running either", the(".wg-sub-state").textContent, "Not valid");

check("changing anything marks the rule a draft", present(held[1], "the second rule").draft, true);
check(
	"a rule that cannot run is flagged in the list",
	at(".wg-sub-item.is-selected .wg-sub-mark")?.textContent,
	"Not valid",
);
check("and a draft does not reach a note", matchLines([":::", "one", ":::"], held).length, 0);

present(tabs[1], "the wrapped tab").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
the(".wg-sub-save").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("saving clears the draft", present(held[1], "the second rule").draft, false);
check("and the rule reaches notes again", matchLines([":::", "one", ":::"], held).length, 1);

present(all(".wg-sub-item")[0], "the first rule row").dispatchEvent(
	new dom.window.MouseEvent("click", { bubbles: true }),
);
await settle();
the(".wg-sub-pick").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
const asked = CATALOGUE_REQUESTS.current();
check(
	"choosing a widget asks the sidebar catalogue for one that stands in text",
	[asked?.mode, asked?.kind],
	["text", "inline"],
);
check(
	"and the substitutions window steps aside while it is asked",
	Boolean(dom.window.document.body.querySelector(".wg-sub-over.is-aside")),
	true,
);
CATALOGUE_REQUESTS.answer("@default/note");
await settle();
check("picking one writes it into the rule", present(held[0], "the first rule").widget, "@default/note");
check("and the window comes back", Boolean(dom.window.document.body.querySelector(".wg-sub-over.is-aside")), false);

const before = held.length;
the(".wg-sub-new").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settle();
check("New adds a rule", held.length, before + 1);
check("and opens it", nameOn(at(".wg-sub-item.is-selected")), "Untitled");

render(null, panel);

type Answered = Readonly<Record<string, unknown>>;
function recordOf(value: unknown, what: string): Answered {
	if (!isRecord(value)) throw new TypeError(`${what} is not an object`);
	return value;
}
function listOf(value: unknown, what: string): unknown[] {
	if (!Array.isArray(value)) throw new TypeError(`${what} is not a list`);
	const held: unknown[] = value;
	return held;
}
function pairOf(value: unknown): readonly [number, number] {
	const [first, second] = listOf(value, "a pair");
	if (typeof first !== "number" || typeof second !== "number") throw new TypeError("a pair is not two numbers");
	return [first, second];
}
function failureText(details: unknown): string | undefined {
	if (!isRecord(details)) return undefined;
	const exception = details["exception"];
	const told = (isRecord(exception) ? exception["description"] : undefined) ?? details["text"];
	return told === undefined ? undefined : String(told);
}
interface CdpPage {
	readonly type: string;
	readonly webSocketDebuggerUrl: string;
}
function isCdpPage(entry: unknown): entry is CdpPage {
	return (
		isRecord(entry) &&
		entry["type"] === "page" &&
		typeof entry["webSocketDebuggerUrl"] === "string" &&
		entry["webSocketDebuggerUrl"] !== ""
	);
}

{
	const { execFileSync } = await import("node:child_process");
	const { mkdtempSync, readdirSync, statSync, writeFileSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const esbuild = (await import("esbuild")).default;
	const { WIDGETS_DIR } = await import("../packages/core/src/paths.js");

	const CANDIDATES = [
		process.env["WG_CHROME"],
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Chromium.app/Contents/MacOS/Chromium",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium",
	].filter((candidate): candidate is string => Boolean(candidate));
	const browser = CANDIDATES.find((candidate) => {
		try {
			execFileSync(candidate, ["--version"], { stdio: "ignore" });
			return true;
		} catch {
			return false;
		}
	});
	if (!browser) {
		console.error("substitution gate: no Chrome found — set WG_CHROME to a Chromium binary");
		process.exit(1);
	}

	const collect = (from: string, into: Record<string, string>, prefix: string): Record<string, string> => {
		for (const name of readdirSync(from)) {
			const full = path.join(from, name);
			const key = `${prefix}/${name}`;
			if (statSync(full).isDirectory()) collect(full, into, key);
			else if (/\.(json|tsx|ts|jsx|js|css|md)$/.test(name)) into[key] = fs.readFileSync(full, "utf8");
		}
		return into;
	};

	const built = await esbuild.build({
		entryPoints: ["tools/substitution-page.tsx"],
		bundle: true,
		loader: TEXT_LOADERS,
		write: false,
		format: "iife",
		platform: "browser",
		target: "es2020",
		jsxFactory: "h",
		jsxFragment: "Fragment",
		inject: ["tools/fill-inject.ts"],
		alias: {
			widgetarium: "./tools/fill-shim.ts",
			"widgetarium/kit": "./packages/kit/src/index.ts",
			obsidian: "./tools/obsidian-shim.ts",
		},
		logLevel: "warning",
	});

	const probe = `setTimeout(() => {
		const box = (node) => node.getBoundingClientRect();
		const seen = (selector) => document.querySelector(selector);
		const every = (selector) => [...document.querySelectorAll(selector)];
		const style = (node, pseudo) => getComputedStyle(node, pseudo ?? null);
		const clear = (a, b) => ({ left: Math.round(a.left - b.left), right: Math.round(b.right - a.right), top: Math.round(a.top - b.top), bottom: Math.round(b.bottom - a.bottom) });
		const block = seen(".wg-sub-list");
		const dialog = seen(".wg-sub-dialog");
		const steps = every(".wg-sub-step");
		const rows = every(".wg-sub-item");
		const newRow = seen(".wg-sub-new");
		const head = seen(".wg-sub-head");
		const save = seen(".wg-sub-save");
		const badge = seen(".wg-sub-step-no");
		const label = seen(".wg-sub-step-label");
		const bodyFirst = seen(".wg-sub-step-body > *");
		const sample = seen(".wg-sub-sample");
		const arrow = seen(".wg-sub-arrow");
		const out = seen(".wg-sub-out");
		const sheet = seen(".wg-sub-sheet");
		const room = seen(".wg-sub");
		const dimmed = seen(".wg-sub-item.is-disabled");
		const lit = seen(".wg-sub-item:not(.is-disabled)");
		const air = block ? clear(box(block), box(dialog)) : null;
		const parts = head ? [...head.children].filter((node) => box(node).width > 0) : [];
		const inkProbe = document.createElement("span");
		inkProbe.style.color = "var(--interactive-accent)";
		document.body.appendChild(inkProbe);
		const accentInk = style(inkProbe).color;
		inkProbe.remove();
		document.getElementById("wg-measure").textContent = JSON.stringify({
			hasSide: Boolean(seen(".wg-sub-side")),
			hasOpen: Boolean(seen(".wg-sub-open")),
			air,
			leastAir: air ? Math.min(air.left, air.right, air.top, air.bottom) : null,
			blockPad: block ? style(block).paddingTop : null,
			blockRadius: block ? style(block).borderTopLeftRadius : null,
			blockFill: block ? style(block).backgroundColor : null,
			blockShadow: block ? style(block).boxShadow : null,
			dialogFill: style(dialog).backgroundColor,
			rows: rows.length,
			adjacentRows: every(".wg-sub-item + .wg-sub-item").length,
			divider: rows[1] ? style(rows[1], "::after").content : null,
			overlay: style(seen(".wg-dialog-overlay")).backgroundColor,
			newUnderRows: newRow && rows.length ? Math.round(box(newRow).top - box(rows[rows.length - 1]).bottom) : null,
			steps: steps.length,
			stepGaps: steps.slice(1).map((node, at) => Math.round(box(node).top - box(steps[at]).bottom)),
			stepFill: steps[0] ? style(steps[0]).backgroundColor : null,
			stepShadow: steps[0] ? style(steps[0]).boxShadow : null,
			stepRadius: steps[0] ? style(steps[0]).borderTopLeftRadius : null,
			badgeBox: badge ? [Math.round(box(badge).width), Math.round(box(badge).height)] : null,
			badgeRadius: badge ? style(badge).borderTopLeftRadius : null,
			badgeFill: badge ? style(badge).backgroundColor : null,
			badgeInk: badge ? style(badge).color : null,
			accentInk,
			hang: badge && label ? Math.round(box(badge).width + parseFloat(style(label).columnGap)) : null,
			indent: bodyFirst && label ? Math.round(box(bodyFirst).left - box(label).left) : null,
			headParts: parts.map((node) => node.className.split(" ")[0]),
			headCentres: parts.map((node) => Math.round((box(node).top + box(node).bottom) / 2)),
			controlHeights: [seen(".wg-sub-name"), seen(".wg-sub-power"), seen(".wg-sub-delete"), save].filter(Boolean).map((node) => Math.round(box(node).height)),
			saveDisabled: save ? save.disabled : null,
			saveFill: save ? style(save, "::before").backgroundColor : null,
			neutralFill: seen(".wg-sub-delete") ? style(seen(".wg-sub-delete"), "::before").backgroundColor : null,
			stepsScroll: seen(".wg-sub-steps") ? style(seen(".wg-sub-steps")).overflowY : null,
			headInScroll: Boolean(seen(".wg-sub-steps .wg-sub-head")),
			sampleFill: sample ? style(sample).backgroundColor : null,
			outFill: out ? style(out).backgroundColor : null,
			noteFill: style(document.body).getPropertyValue("--background-primary"),
			arrowBetween: sample && out && arrow ? box(sample).bottom <= box(arrow).top + 1 && box(arrow).bottom <= box(out).top + 1 : null,
			closeClear: save ? Math.round(box(seen(".wg-dialog-close")).left - box(save).right) : null,
			sheetSpill: sheet && room ? Math.round(box(sheet).width - box(room).width) : null,
			sheetAtFoot: sheet && room ? Math.round(box(room).bottom - box(sheet).bottom) : null,
			dimmedRow: dimmed ? Number(style(dimmed).opacity) : null,
			litRow: lit ? Number(style(lit).opacity) : null,
			dots: every(".wg-sub-dot").length,
		});
	}, 1500);`;

	const work = mkdtempSync(path.join(tmpdir(), "wg-sub-look-"));
	const file = path.join(work, "look.html");
	writeFileSync(
		file,
		`<!doctype html><html><head><meta charset="utf-8"><style>${fs.readFileSync("apps/obsidian/styles.css", "utf8")}</style>` +
			`<style>body { margin: 0; --background-primary: #fff; --background-secondary: #f6f6f6; --background-modifier-border: #e4e4e4;` +
			` --background-modifier-hover: rgba(0,0,0,0.05); --text-normal: #222; --text-muted: #707070; --text-faint: #a0a0a0;` +
			` --text-on-accent: #fff; --text-error: #c0392b; --text-success: #1f8a4c; --interactive-accent: #6d4ee0;` +
			` font-family: -apple-system, "Segoe UI", sans-serif; background: var(--background-secondary); }</style>` +
			`</head><body class="wg-root"><div id="host"></div><script id="wg-measure" type="application/json"></script>` +
			`<script>window.__FILES__=${JSON.stringify(collect("registry", {}, WIDGETS_DIR))};</script>` +
			`<script>${present(built.outputFiles?.[0], "the substitution page bundle").text}</script><script>${probe}</script></body></html>`,
	);

	const lookAt = (query: string, width: number, height: number) => {
		const dumped = execFileSync(
			browser,
			[
				"--headless",
				"--disable-gpu",
				"--no-sandbox",
				"--hide-scrollbars",
				`--window-size=${width},${height}`,
				"--virtual-time-budget=9000",
				"--dump-dom",
				`file://${file}${query}`,
			],
			{
				encoding: "utf8",
				maxBuffer: 96 * 1024 * 1024,
				stdio: ["ignore", "pipe", process.env["WG_DEBUG"] ? "inherit" : "ignore"],
			},
		);
		const raw = dumped.match(/<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
		if (!raw) {
			console.error(`substitution gate: the page never reported at ${width}px — file://${file}${query}`);
			process.exit(1);
		}
		const measured: unknown = JSON.parse(raw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
		return recordOf(measured, "the measures");
	};

	const wide = lookAt("", 1280, 860);
	const narrow = lookAt("?case=live&open=list", 430, 900);
	if (process.env["WG_DEBUG"]) console.log(JSON.stringify({ wide, narrow }, null, 1));

	console.log(
		`\n   the block: air ${JSON.stringify(wide["air"])} · padding ${wide["blockPad"]} · radius ${wide["blockRadius"]} · ${wide["blockFill"]}`,
	);
	check("the block never reaches the window's own edge", Number(wide["leastAir"]) >= 8, true);
	check("it pads itself like every other sidebar", wide["blockPad"], "8px");
	check("carries the plate's corner", wide["blockRadius"], "14px");
	check("carries no edge of its own", /inset/.test(String(wide["blockShadow"])), false);
	check(
		"and is told apart by a cast that reaches past it",
		wide["blockShadow"] !== "none" && /\dpx/.test(String(wide["blockShadow"])),
		true,
	);
	check("and is a surface rather than a hole", /^rgba\(0, 0, 0, 0\)$/.test(String(wide["blockFill"])), false);
	check("its rows are adjacent, so a divider could be drawn", wide["adjacentRows"], Number(wide["rows"]) - 1);
	check("and none is", wide["divider"], "none");
	check(
		"the scrim behind it is light",
		Number(/[\d.]+\)$/.exec(String(wide["overlay"]))?.[0].slice(0, -1) ?? 1) <= 0.3,
		true,
	);
	console.log(`   New sits ${wide["newUnderRows"]}px under the last rule, at the foot of the block`);
	check("New is the last thing in the list, under every rule", Number(wide["newUnderRows"]) > 0, true);

	console.log(
		`\n   the three stages: gaps ${JSON.stringify(wide["stepGaps"])} · ${wide["stepFill"]} on the window's ${wide["dialogFill"]} · corner ${wide["stepRadius"]}`,
	);
	check("the page is three stages deep", wide["steps"], 3);
	check("held apart by air, the same amount every time", new Set(listOf(wide["stepGaps"], "stepGaps")).size, 1);
	check("and it is air you can see", Number(listOf(wide["stepGaps"], "stepGaps")[0]) >= 8, true);
	check("a stage is a surface, not a hole in the window", /^rgba\(0, 0, 0, 0\)$/.test(String(wide["stepFill"])), false);
	check(
		"told apart from the window by a fill or an edge",
		wide["stepFill"] !== wide["dialogFill"] || /inset/.test(String(wide["stepShadow"])),
		true,
	);
	check("and cornered, because it is a card", parseFloat(String(wide["stepRadius"])) >= 12, true);

	console.log(
		`   the number: ${JSON.stringify(wide["badgeBox"])} radius ${wide["badgeRadius"]} on ${wide["badgeFill"]}, ink ${wide["badgeInk"]} against the accent ${wide["accentInk"]}`,
	);
	check(
		"the number rides a shape of its own",
		listOf(wide["badgeBox"], "badgeBox")[0],
		listOf(wide["badgeBox"], "badgeBox")[1],
	);
	check(
		"a round one",
		parseFloat(String(wide["badgeRadius"])) >= Number(listOf(wide["badgeBox"], "badgeBox")[0]) / 2,
		true,
	);
	check("filled, not left as bare type", /^rgba\(0, 0, 0, 0\)$/.test(String(wide["badgeFill"])), false);
	check("and it is the accent that is spent on it", wide["badgeInk"], wide["accentInk"]);
	console.log(`   the stage's content starts ${wide["indent"]}px in, against a ${wide["hang"]}px shape and gap`);
	check("a stage's content starts under its name, past the number's own column", wide["indent"], wide["hang"]);

	console.log(
		`\n   the head: ${listOf(wide["headParts"], "headParts").join(" · ")} · heights ${JSON.stringify(wide["controlHeights"])}`,
	);
	check("what the rule is comes first, what you may do to it second", wide["headParts"], [
		"wg-sub-ident",
		"wg-sub-acts",
	]);
	check("both stand on one line", new Set(listOf(wide["headCentres"], "headCentres")).size, 1);
	check(
		"and the controls are one size, so they read as a row",
		new Set(listOf(wide["controlHeights"], "controlHeights")).size,
		1,
	);
	check("the head holds still while the stages scroll", wide["stepsScroll"], "auto");
	check("so Save is reachable from anywhere in the rule", wide["headInScroll"], false);
	console.log(
		`   Save on a saved rule: disabled ${wide["saveDisabled"]} · ${wide["saveFill"]} against the neutral ${wide["neutralFill"]}`,
	);
	check("a saved rule offers nothing to save", wide["saveDisabled"], true);
	check(
		"and Save is not painted with the accent while it refuses a press",
		wide["saveFill"] === wide["accentInk"],
		false,
	);
	check("it is the grey every neutral control carries", wide["saveFill"], wide["neutralFill"]);
	console.log(`   the window's close clears Save by ${wide["closeClear"]}px`);
	check("the close stands clear of the head's own controls", Number(wide["closeClear"]) >= 0, true);

	console.log(`\n   the result: written on ${wide["sampleFill"]}, drawn on ${wide["outFill"]}`);
	check("what you write and what it draws are two surfaces", wide["sampleFill"] === wide["outFill"], false);
	check("and the turn between them is drawn", wide["arrowBetween"], true);

	console.log(`   the list: lit ${wide["litRow"]} · dimmed ${wide["dimmedRow"]} · dots ${wide["dots"]}`);
	check("no dot is left in the list", wide["dots"], 0);
	check("a live rule is at full strength", wide["litRow"], 1);
	check("a switched-off one is turned down", Number(wide["dimmedRow"]) < Number(wide["litRow"]), true);
	check("far enough down to be seen across the list", Number(wide["dimmedRow"]) <= 0.6, true);

	console.log(
		`\n   on a phone: sidebar ${narrow["hasSide"]} · a press to open the list ${narrow["hasOpen"]} · head parts ${JSON.stringify(narrow["headCentres"])}`,
	);
	check("a phone is too narrow for a column beside the rule, so none is drawn", narrow["hasSide"], false);
	check("the list is a press instead", narrow["hasOpen"], true);
	check(
		"and the head stacks rather than running off the screen",
		listOf(narrow["headCentres"], "headCentres").length > 1 &&
			new Set(listOf(narrow["headCentres"], "headCentres")).size,
		2,
	);
	console.log(`   the sheet: ${narrow["sheetSpill"]}px wider than the room, ${narrow["sheetAtFoot"]}px off its foot`);
	check("the list comes up as a sheet on the room's full width", narrow["sheetSpill"], 0);
	check("resting on its foot", narrow["sheetAtFoot"], 0);
	check("and it is the same block the sidebar draws, padded the same way", narrow["blockPad"], wide["blockPad"]);
	check("wearing the window's own corner where it meets the screen", narrow["blockRadius"], "16px");
	check("the stages lose the number's column, because a phone has no room to spare", narrow["indent"], 0);
}

// TRADE-OFF: a live browser over --dump-dom — virtual time never ticks the animation clock
{
	const { execFileSync, spawn } = await import("node:child_process");
	const { mkdtempSync, writeFileSync, readFileSync, existsSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const nodePath = (await import("node:path")).default;
	const esbuild = (await import("esbuild")).default;

	const browser = [
		process.env["WG_CHROME"],
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Chromium.app/Contents/MacOS/Chromium",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium",
	]
		.filter((candidate): candidate is string => Boolean(candidate))
		.find((candidate) => {
			try {
				execFileSync(candidate, ["--version"], { stdio: "ignore" });
				return true;
			} catch {
				return false;
			}
		});
	if (!browser) {
		console.error("inline gate: no Chrome found — set WG_CHROME to a Chromium binary");
		process.exit(1);
	}

	const built = await esbuild.build({
		entryPoints: ["tools/inline-page.tsx"],
		bundle: true,
		write: false,
		format: "iife",
		platform: "browser",
		target: "es2020",
		jsxFactory: "h",
		jsxFragment: "Fragment",
		inject: ["tools/fill-inject.ts"],
		alias: {
			widgetarium: "./tools/fill-shim.ts",
			"widgetarium/kit": "./packages/kit/src/index.ts",
			obsidian: "./tools/obsidian-shim.ts",
		},
		loader: { ...TEXT_LOADERS, ".json": "json" },
		logLevel: "warning",
	});

	// CONTEXT: copied off Obsidian 1.13.7 app.css — the read-mode rules a substituted host inherits
	const OBSIDIAN = `
	:root {
		--background-primary: #ffffff; --background-primary-alt: #f2f2f2; --background-secondary: #f6f6f6;
		--background-modifier-border: #e4e4e4; --background-modifier-hover: rgba(0,0,0,0.05);
		--text-normal: #222222; --text-muted: #707070; --text-faint: #a0a0a0; --text-on-accent: #fff;
		--text-error: #c0392b; --text-success: #1f8a4c; --interactive-accent: #6d4ee0;
		--font-interface: -apple-system, sans-serif; --font-monospace: ui-monospace, monospace;
		--font-text-size: 16px; --line-height-normal: 1.5; --radius-s: 4px;
		--size-4-2: 8px; --size-4-3: 12px; --size-4-4: 16px;
		--font-smaller: 0.875em; --font-ui-small: 13px; --font-ui-smaller: 12px;
		--code-white-space: pre-wrap; --code-border-width: 0px; --code-border-color: var(--background-modifier-border);
		--code-radius: var(--radius-s); --code-size: var(--font-smaller); --code-background: var(--background-primary-alt);
		--code-normal: var(--text-normal);
	}
	body { margin: 0; font-family: var(--font-interface); font-size: var(--font-text-size); line-height: var(--line-height-normal); }
	.markdown-rendered pre {
		position: relative; padding: var(--size-4-3) var(--size-4-4); min-height: 38px;
		background-color: var(--code-background); border-radius: var(--code-radius);
		white-space: var(--code-white-space); border: var(--code-border-width) solid var(--code-border-color);
		overflow-x: auto;
	}
	.markdown-rendered pre code { border: none; padding: 0; background-color: transparent; }
	.markdown-rendered code {
		color: var(--code-normal); font-family: var(--font-monospace); background-color: var(--code-background);
		border-radius: var(--code-radius); font-size: var(--code-size); padding: 0.15em 0.3em;
		border: var(--code-border-width) solid var(--code-border-color);
	}
	.markdown-rendered button.copy-code-button { position: absolute; top: 0; inset-inline-end: 0; margin: 6px; padding: 6px 8px; }
	.markdown-rendered pre:not(:hover) > button.copy-code-button { display: none; }
	`;

	const work = mkdtempSync(nodePath.join(tmpdir(), "wg-inline-"));
	const file = nodePath.join(work, "inline.html");
	writeFileSync(
		file,
		`<!doctype html><html><head><meta charset="utf-8">` +
			`<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style><style>${OBSIDIAN}</style>` +
			`<style>#note { width: 640px; padding: 24px; }</style></head>` +
			`<body><button id="before">before</button>` +
			`<div class="markdown-preview-view markdown-rendered" id="note"></div>` +
			`<script>${present(built.outputFiles?.[0], "the inline page bundle").text}</script></body></html>`,
	);

	const profile = mkdtempSync(nodePath.join(tmpdir(), "wg-cdp-"));
	const chrome = spawn(
		browser,
		[
			"--headless=new",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--no-first-run",
			"--no-default-browser-check",
			"--window-size=900,800",
			`--user-data-dir=${profile}`,
			"--remote-debugging-port=0",
			`file://${file}`,
		],
		{ stdio: ["ignore", "pipe", "pipe"] },
	);

	const rest = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
	const portFile = nodePath.join(profile, "DevToolsActivePort");
	let port: number | null = null;
	for (let tries = 0; tries < 200 && port === null; tries += 1) {
		await rest(50);
		if (existsSync(portFile)) port = Number(readFileSync(portFile, "utf8").split("\n")[0]) || null;
	}
	let page: CdpPage | null | undefined = null;
	for (let tries = 0; tries < 100 && !page; tries += 1) {
		await rest(50);
		try {
			const listed: unknown = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
			page = listOf(listed, "the page list").find(isCdpPage);
		} catch {}
	}
	if (!page) {
		chrome.kill();
		console.error(`inline gate: Chrome never opened the page — file://${file}`);
		process.exit(1);
	}

	globalThis.Event = NODE_EVENT;
	const socket = new WebSocket(page.webSocketDebuggerUrl);
	await new Promise((resolve, reject) => {
		socket.onopen = resolve;
		socket.onerror = reject;
	});
	let call = 0;
	const waiting = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
	socket.onmessage = (event) => {
		const message: unknown = JSON.parse(String(event.data));
		if (!isRecord(message)) return;
		const id = message["id"];
		if (typeof id !== "number" || !id) return;
		const waiter = waiting.get(id);
		if (!waiter) return;
		waiting.delete(id);
		if (message["error"]) waiter.reject(new Error(JSON.stringify(message["error"])));
		else waiter.resolve(message["result"]);
	};
	const send = (method: string, params: object = {}) =>
		new Promise<unknown>((resolve, reject) => {
			call += 1;
			waiting.set(call, { resolve, reject });
			socket.send(JSON.stringify({ id: call, method, params }));
		});
	const ask = async (expression: string, awaitPromise = true): Promise<unknown> => {
		const answer = recordOf(
			await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise }),
			"an evaluation",
		);
		if (answer["exceptionDetails"]) throw new Error(failureText(answer["exceptionDetails"]));
		return recordOf(answer["result"], "an evaluation result")["value"];
	};
	const moveTo = (x: number, y: number) => send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
	const clickAt = async (x: number, y: number) => {
		await moveTo(x, y);
		await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
		await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
		await rest(150);
	};
	const pressTab = async () => {
		for (const type of ["rawKeyDown", "keyUp"]) {
			await send("Input.dispatchKeyEvent", {
				type,
				windowsVirtualKeyCode: 9,
				nativeVirtualKeyCode: 9,
				key: "Tab",
				code: "Tab",
			});
		}
		await rest(60);
	};
	const opacities = async () =>
		recordOf(
			await ask(`({
		bar: getComputedStyle(document.querySelector(".wgc-bar")).opacity,
		menu: getComputedStyle(document.querySelector(".wg-inline-at")).opacity,
	})`),
			"the opacities",
		);
	const centreOf = async (selector: string) =>
		pairOf(
			await ask(`(() => {
		const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
		return [Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2)];
	})()`),
		);

	let painted = false;
	for (let tries = 0; tries < 60 && !painted; tries += 1) {
		await rest(100);
		painted =
			(await ask(
				`Boolean(document.querySelector(".wgc-body pre code") && document.querySelector(".wg-inline-more"))`,
			)) === true;
	}
	if (!painted) {
		socket.close();
		chrome.kill();
		console.error(`inline gate: the widget never painted — file://${file}`);
		process.exit(1);
	}

	const drawn = recordOf(
		await ask(`(() => {
		const pre = document.querySelector(".wgc-body pre");
		const code = pre.querySelector("code");
		const bar = document.querySelector(".wgc-bar");
		const range = document.createRange();
		range.setStart(code.firstChild, 0);
		range.setEnd(code.firstChild, 9);
		const line = range.getClientRects()[0];
		return {
			firstWords: code.textContent.slice(0, 10),
			startsWithNewline: code.textContent.startsWith("\\n"),
			gapAboveFirstLine: +(line.top - bar.getBoundingClientRect().bottom).toFixed(2),
			indent: +(line.left - bar.getBoundingClientRect().left).toFixed(2),
		};
	})()`),
		"the first line",
	);
	console.log(
		`   the first line: "${drawn["firstWords"]}" · ${drawn["gapAboveFirstLine"]}px under the row · indented ${drawn["indent"]}px`,
	);
	check("the file's own first line is the block's first line", drawn["startsWithNewline"], false);
	// CONTEXT: 4px is the inline box's half-leading, which no padding can take away
	check("and it sits at the top of the block, not a line down", Number(drawn["gapAboveFirstLine"]) <= 5, true);
	check("aligned with the row above it, not indented past it", Number(drawn["indent"]) <= 15, true);

	const asleep = await opacities();
	console.log(`   at rest: bar ${asleep["bar"]} · menu ${asleep["menu"]}`);
	check("at rest every control is transparent", [asleep["bar"], asleep["menu"]], ["0", "0"]);

	await ask(
		`(() => {
		window.__samples = [];
		const bar = document.querySelector(".wgc-bar");
		const from = performance.now();
		const tick = () => {
			window.__samples.push([parseFloat(getComputedStyle(bar).opacity), bar.getAnimations().length]);
			if (performance.now() - from < 300) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	})()`,
		false,
	);
	const middle = await centreOf(".wgc-code");
	await moveTo(middle[0], middle[1]);
	await rest(600);
	const samples = listOf(await ask("window.__samples"), "the samples").map(pairOf);
	const midFlight = samples.filter(([value]) => value > 0.02 && value < 0.98);
	const awake = await opacities();
	console.log(
		`   hovered: bar ${awake["bar"]} · menu ${awake["menu"]} · ${midFlight.length} frames caught between the two`,
	);
	check("hovering the block brings every control up", [awake["bar"], awake["menu"]], ["1", "1"]);
	// CONTEXT: an instant change has no frame between 0 and 1 and no animation to find
	check("and it fades, rather than appearing", midFlight.length >= 3, true);
	check(
		"driven by a transition the browser is really running",
		samples.some(([value, running]) => running > 0 && value < 0.98),
		true,
	);

	await moveTo(5, 5);
	await rest(400);
	const gone = await opacities();
	check("taking the pointer away puts them back down", [gone["bar"], gone["menu"]], ["0", "0"]);

	await ask(`document.getElementById("before").focus()`);
	const walk: Answered[] = [];
	for (let step = 0; step < 3; step += 1) {
		await pressTab();
		walk.push(
			recordOf(
				await ask(`(() => {
			const node = document.activeElement;
			return { what: node.className, opacity: getComputedStyle(document.querySelector(".wg-inline-at")).opacity };
		})()`),
				"the focused control",
			),
		);
	}
	console.log(`   Tab reaches: ${walk.map((stop) => String(stop["what"]).split(" ")[0]).join(" → ")}`);
	check(
		"Tab walks into the controls without a pointer",
		walk.map((stop) => /wgc-lang|wg-kit-icon|wg-inline-more/.test(String(stop["what"]))),
		[true, true, true],
	);
	check(
		"and the three-dot menu is one of them",
		walk.some((stop) => /wg-inline-more/.test(String(stop["what"]))),
		true,
	);
	check(
		"a control the keyboard has reached is a control that can be seen",
		present(walk.at(-1), "the last stop")["opacity"],
		"1",
	);

	await ask(`document.activeElement.blur()`);
	await rest(300);
	await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
	await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
	await rest(400);
	const touched = recordOf(
		await ask(`({
		bar: getComputedStyle(document.querySelector(".wgc-bar")).opacity,
		menu: getComputedStyle(document.querySelector(".wg-inline-at")).opacity,
		noHover: window.matchMedia("(hover: none)").matches,
	})`),
		"the touch reading",
	);
	console.log(`   on a finger: (hover: none) ${touched["noHover"]} · bar ${touched["bar"]} · menu ${touched["menu"]}`);
	check("a phone really answers (hover: none), or the next line proves nothing", touched["noHover"], true);
	check(
		"and there the controls never hide, because nothing can hover them out",
		[touched["bar"], touched["menu"]],
		["1", "1"],
	);
	await send("Emulation.clearDeviceMetricsOverride");
	await send("Emulation.setTouchEmulationEnabled", { enabled: false });
	await rest(300);

	const dots = await centreOf(".wg-inline-more");
	await clickAt(dots[0], dots[1]);
	await rest(300);
	const opened = recordOf(
		await ask(`(() => {
		const items = [...document.querySelectorAll(".wg-kit-pop.is-open .wg-kit-pop-item")];
		return { entries: items.map((node) => node.textContent), disabled: items.map((node) => node.disabled) };
	})()`),
		"the menu",
	);
	const openedEntries = listOf(opened["entries"], "the menu entries");
	const openedDisabled = listOf(opened["disabled"], "the disabled marks");
	console.log(
		`   the menu: ${openedEntries.map((text, at) => `${text}${openedDisabled[at] ? " (off)" : ""}`).join(" · ")}`,
	);
	check("the three dots open a menu of exactly two entries", openedEntries.length, 2);
	check(
		"the first is the playground, and it is off",
		[String(present(openedEntries[0], "the first entry")).startsWith("Settings"), openedDisabled[0]],
		[true, true],
	);
	check("the second says what it does", openedEntries[1], "Show the source");

	const settingsAt = await centreOf(".wg-inline-settings");
	await clickAt(settingsAt[0], settingsAt[1]);
	check(
		"pressing the one that is off leaves the widget alone",
		await ask(`Boolean(document.querySelector(".wgc-code"))`),
		true,
	);

	if (!(await ask(`Boolean(document.querySelector(".wg-kit-pop.is-open"))`))) {
		const again = await centreOf(".wg-inline-more");
		await clickAt(again[0], again[1]);
		await rest(300);
	}
	const sourceAt = await centreOf(".wg-kit-pop.is-open .wg-inline-source");
	await clickAt(sourceAt[0], sourceAt[1]);
	await rest(200);
	const revealed = recordOf(
		await ask(`({
		raw: document.querySelector(".wg-inline-raw")?.textContent ?? null,
		widget: Boolean(document.querySelector(".wgc-code")),
	})`),
		"the revealed source",
	);
	check("and pressing it shows the raw text the rule captured", revealed["raw"], "!code main.py");
	check("with the widget stood down while it does", revealed["widget"], false);

	socket.close();
	chrome.kill();
}

console.log(failed === 0 ? "\nsubstitution: clean" : `\nsubstitution: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
