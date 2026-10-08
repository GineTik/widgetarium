import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { JSDOM } from "jsdom";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf, THEMES } from "./harness.ts";

const dom = new JSDOM('<!doctype html><body><div id="host"></div></body>', { pretendToBeVisual: true });
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
	MouseEvent: dom.window.MouseEvent,
	KeyboardEvent: dom.window.KeyboardEvent,
});

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.ts");
const kit = await import("../packages/kit/src/index.ts");

let failed = 0;
let checks = 0;
function check(name: string, got: unknown, want: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

const host = document.getElementById("host");
if (!host) throw new Error("kit chat test: no #host");
const drawn = host;

function one(selector: string): HTMLElement {
	const found = drawn.querySelector(selector);
	if (!(found instanceof dom.window.HTMLElement)) throw new Error(`nothing drawn matches ${selector}`);
	return found;
}
function all(selector: string): HTMLElement[] {
	return Array.from(drawn.querySelectorAll(selector)).filter((node) => node instanceof dom.window.HTMLElement);
}
const settled = (): Promise<void> => new Promise((done) => setTimeout(done, 0));
async function press(target: Element, key: string): Promise<void> {
	target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
	await settled();
}
async function tap(target: HTMLElement): Promise<void> {
	target.click();
	await settled();
}
async function typeInto(input: HTMLInputElement, text: string): Promise<void> {
	const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")?.set;
	setter?.call(input, text);
	input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await settled();
}
function inputIn(selector: string): HTMLInputElement {
	const found = drawn.querySelector(selector);
	if (!(found instanceof dom.window.HTMLInputElement)) throw new Error(`no input matches ${selector}`);
	return found;
}

{
	const parts = kit.readChatParts([
		{ type: "step-start" },
		{ type: "reasoning", text: "Look first.", state: "streaming" },
		{ type: "tool-searchVault", toolCallId: "a", state: "output-error", input: { q: 1 }, errorText: "No vault" },
		{ type: "dynamic-tool", toolName: "lookup", toolCallId: "b", state: "approval-requested", input: {} },
		{ type: "file", mediaType: "image/png", url: "https://x/y.png", filename: "y.png" },
		{ type: "source-url", sourceId: "s", url: "https://docs", title: "Docs" },
		{ type: "data-weather", data: {} },
		{ type: "text", text: "Done.", state: "done" },
	]);
	check(
		"AI SDK PARTS READ AS TEXT, REASONING, TOOLS AND FILES, AND STEP AND DATA PARTS DRAW NOTHING",
		parts.map((part) => (part.kind === "tool" ? `${part.kind}:${part.name}:${part.stage}` : part.kind)),
		["reasoning", "tool:searchVault:error", "tool:lookup:approval", "file", "file", "text"],
	);
	const tanstack = kit.readChatParts([
		{ type: "thinking", content: "Hmm." },
		{ type: "tool-call", id: "c", name: "readNote", arguments: '{"path":"a.md"}', state: "input-complete" },
		{ type: "tool-result", toolCallId: "c", content: "200 words", state: "complete" },
		{
			type: "tool-call",
			id: "d",
			name: "deleteNote",
			arguments: "{}",
			state: "approval-responded",
			approval: { id: "x", needsApproval: true, approved: false },
		},
		{ type: "image", source: { type: "data", value: "AAAA", mimeType: "image/png" } },
		{ type: "text", content: "Read it." },
	]);
	check(
		"TANSTACK PARTS FOLD A RESULT INTO ITS CALL, A DENIED APPROVAL IS DENIED, A DATA IMAGE BECOMES A URL",
		tanstack.map((part) => {
			if (part.kind === "tool")
				return `${part.name}:${part.stage}:${JSON.stringify(part.input)}:${String(part.output)}`;
			if (part.kind === "file") return part.url;
			return `${part.kind}:${part.text}`;
		}),
		[
			"reasoning:Hmm.",
			'readNote:done:{"path":"a.md"}:200 words',
			"deleteNote:denied:{}:undefined",
			"data:image/png;base64,AAAA",
			"text:Read it.",
		],
	);
}

{
	const warned: unknown[] = [];
	const warn = console.warn;
	console.warn = (...said: unknown[]) => warned.push(said[0]);
	const unsafe = kit.readChatParts([
		{ type: "file", mediaType: "image/png", url: "javascript:alert(1)" },
		{ type: "file", mediaType: "text/html", url: "data:text/html;base64,PHNjcmlwdD4=" },
		{ type: "file", mediaType: "image/png", url: "data:image/png;base64,AAAA" },
		{ type: "file", mediaType: "image/svg+xml", url: "data:image/svg+xml;base64,PHN2Zz4=" },
		{ type: "source-url", sourceId: "j", url: "javascript:alert(1)", title: "Bad" },
		{ type: "image", source: { type: "data", value: "PHNjcmlwdD4=", mimeType: "text/html" } },
		{ type: "tool-approval-request", approvalId: "x" },
		{ type: "widget-card" },
		{ type: "widget-card" },
		{ type: "tool-call", id: "r", name: "raw", arguments: "{not json" },
		{ type: "tool-call", id: "p", name: "parsed", arguments: '{"a":1}' },
	]);
	console.warn = warn;
	check(
		"A FILE OR SOURCE URL IS KEPT ONLY WHEN IT IS HTTP(S) OR A DATA URL OF A DRAWN MEDIA TYPE",
		unsafe.map((part) => (part.kind === "file" ? part.url : part.kind)),
		[null, null, "data:image/png;base64,AAAA", null, null, null, "tool", "tool"],
	);
	check("A TOOL- PART THAT IS NOT A CALL IS NOT READ AS ONE, AND AN UNKNOWN TYPE WARNS ONCE", warned.map(String), [
		'readChatParts: a part of type "tool-approval-request" is not one the kit reads, so it draws nothing',
		'readChatParts: a part of type "widget-card" is not one the kit reads, so it draws nothing',
	]);
	check(
		"TOOL ARGUMENTS THAT ARE NOT JSON ARE MARKED RAW, PARSED ONES ARE NOT",
		unsafe.map((part) => (part.kind === "tool" ? `${part.name}:${String(part.isInputRaw)}` : "")).filter(Boolean),
		["raw:true", "parsed:false"],
	);
	const circular: { self?: unknown; big: bigint } = { big: 12n };
	circular.self = circular;
	render(
		h(kit.MessageTool, {
			name: "loop",
			stage: "done",
			input: circular,
			isInputRaw: false,
			output: "x".repeat(5000),
		}),
		drawn,
	);
	const [shownInput = "", shownOutput = ""] = all("[data-slot=message-tool] pre").map((pre) => pre.textContent ?? "");
	check(
		"A TOOL VALUE THAT POINTS AT ITSELF OR HOLDS A BIGINT IS DRAWN, AND A LONG ONE IS CUT",
		[shownInput.includes('"self": "[Circular]"'), shownInput.includes('"big": "12n"'), shownOutput.length],
		[true, true, 4002],
	);
	const rawCall = [{ type: "tool-call", id: "r", name: "raw", arguments: "{not json" }];
	render(h(kit.MessageParts, { parts: rawCall }), drawn);
	check(
		"RAW TOOL INPUT IS LABELLED AS NOT JSON",
		one("[data-slot=message-tool] .wg-kit-message-tool-label").textContent,
		"Input, not valid JSON",
	);
	render(null, drawn);
}

{
	render(
		h(
			kit.Message,
			{ align: "end" },
			h(kit.MessageContent, null, h(kit.Bubble, null, h(kit.BubbleContent, null, "Hi"))),
		),
		drawn,
	);
	check("A BUBBLE IN AN END-ALIGNED MESSAGE STANDS AT THE END", one("[data-slot=bubble]").dataset["align"], "end");
	check(
		"THE DEFAULT BUBBLE IS A PLATE WEARING THE SOLID BRAND TONE",
		["wg-kit-surface", "wg-kit-tone", "is-accent", "is-solid"].every((name) =>
			one("[data-slot=bubble-content]").classList.contains(name),
		),
		true,
	);
	render(
		h(kit.Bubble, { variant: "outline" }, h(kit.BubbleContent, { render: h("a", { href: "#x" }) }, "Open")),
		drawn,
	);
	const linked = one("[data-slot=bubble-content]");
	check("RENDER MAKES THE BUBBLE A REAL LINK CARRYING ITS TEXT", [linked.localName, linked.textContent], ["a", "Open"]);
	check("AN OUTLINE BUBBLE LAYS NO PLATE", linked.hasAttribute("data-surface"), false);
	render(
		h(
			kit.Attachment,
			{ state: "uploading" },
			h(kit.AttachmentMedia, null, "M"),
			h(kit.AttachmentTrigger, { render: h("a", { href: "#f" }), "aria-label": "Open f" }),
		),
		drawn,
	);
	check(
		"AN UPLOADING ATTACHMENT IS BUSY AND SPINS IN ITS MEDIA",
		[
			one("[data-slot=attachment]").getAttribute("aria-busy"),
			all("[data-slot=attachment-media] [data-slot=spinner]").length,
		],
		["true", 1],
	);
	check("ITS TRIGGER RENDERS AS THE ELEMENT IT WAS GIVEN", one("[data-slot=attachment-trigger]").localName, "a");
	render(h(kit.Attachment, { state: "error" }, "x"), drawn);
	check("A FAILED ATTACHMENT WEARS THE ERROR TONE", one("[data-slot=attachment]").classList.contains("is-err"), true);
	const toolParts = [
		{ type: "tool-search", toolCallId: "t", state: "output-available", input: { q: "x" }, output: { n: 2 } },
	];
	render(h(kit.MessageParts, { parts: toolParts }), drawn);
	check("A TOOL PART DRAWS ITS NAME AND STAGE", one("[data-slot=message-tool] summary").textContent, "searchDone");
	render(null, drawn);
}

{
	const sent: string[] = [];
	const told: string[] = [];
	const choice = (value: string) => h(kit.QuestionnaireChoice, { key: value, value }, value);
	render(
		h(
			kit.Questionnaire,
			{
				shortcuts: "letters",
				onItemChange: (item: string) => told.push(item),
				onSubmit: (event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
					event.preventDefault();
					const form = new dom.window.FormData(event.currentTarget);
					sent.push(JSON.stringify([form.getAll("pace"), form.getAll("views"), form.getAll("note")]));
				},
			},
			h(kit.QuestionnaireProgress),
			h(
				kit.QuestionnaireItem,
				{ name: "pace", required: true },
				h(kit.QuestionnaireTitle, null, "Pace?"),
				h(
					kit.QuestionnaireChoices,
					null,
					choice("live"),
					choice("hourly"),
					h(kit.QuestionnaireInput, { "aria-label": "Other" }),
				),
				h(kit.QuestionnaireError),
			),
			h(
				kit.QuestionnaireItem,
				{ name: "views", multiple: true },
				h(kit.QuestionnaireChoices, null, choice("board"), choice("list")),
			),
			h(kit.QuestionnaireItem, { name: "note", required: true }, h(kit.QuestionnaireInput, { "aria-label": "Note" })),
			h(
				kit.QuestionnaireActions,
				null,
				h(kit.QuestionnairePrevious),
				h(kit.QuestionnaireSkip),
				h(kit.QuestionnaireNext),
				h(kit.QuestionnaireSubmit),
			),
		),
		drawn,
	);
	const items = () =>
		all("[data-slot=questionnaire-item]").map((item) => `${item.hidden ? "-" : "+"}${item.dataset["status"]}`);
	const visibleSteps = () =>
		all("[data-slot^=questionnaire-]:is(button)")
			.filter((step) => !step.hidden)
			.map((step) => step.dataset["slot"]);
	check("ONE ITEM IS SHOWN AT A TIME, THE REST HIDDEN", items(), ["+unanswered", "-unanswered", "-unanswered"]);
	check("PROGRESS READS QUESTION 1 OF 3", one("[data-slot=questionnaire-progress]").textContent, "Question 1 of 3");
	check("A REQUIRED FIRST ITEM OFFERS ONLY NEXT", visibleSteps(), ["questionnaire-next"]);
	check(
		"CHOICES CARRY THEIR LETTERS",
		all("[data-slot=questionnaire-choice]")
			.slice(0, 2)
			.map((node) => node.dataset["shortcut"]),
		["A", "B"],
	);
	await press(inputIn("input[value=live]"), "Enter");
	check(
		"ENTER ON AN UNPICKED CHOICE OF A REQUIRED ITEM WAITS WITHOUT FLAGGING IT",
		[items()[0], one("[data-slot=questionnaire-item]").hasAttribute("data-invalid")],
		["+unanswered", false],
	);
	await tap(one("[data-slot=questionnaire-next]"));
	check(
		"NEXT ON AN UNANSWERED REQUIRED ITEM MARKS IT INVALID AND SHOWS THE ERROR",
		[one("[data-slot=questionnaire-item]").dataset["invalid"], one("[data-slot=questionnaire-error]").hidden],
		["", false],
	);
	check("AND FOCUSES ITS FIRST ANSWER", document.activeElement === inputIn("input[value=live]"), true);
	await press(one("form"), "b");
	check(
		"PRESSING B PICKS THE SECOND CHOICE WITHOUT MOVING ON",
		[inputIn("input[value=hourly]").checked, items()[0]],
		[true, "+answered"],
	);
	await typeInto(inputIn("input[aria-label=Other]"), "Weekly");
	check("TYPING ANOTHER ANSWER CLEARS THE PICKED ONE", inputIn("input[value=hourly]").checked, false);
	await tap(inputIn("input[value=live]"));
	check("PICKING A CHOICE CLEARS THE TYPED ONE", inputIn("input[aria-label=Other]").value, "");
	await press(inputIn("input[value=live]"), "Enter");
	check(
		"ENTER ON A PICKED CHOICE MOVES TO THE NEXT ITEM AND TELLS THE HOST",
		[items()[1], told],
		["+unanswered", ["views"]],
	);
	check("AN OPTIONAL ITEM OFFERS BACK, SKIP AND NEXT", visibleSteps(), [
		"questionnaire-previous",
		"questionnaire-skip",
		"questionnaire-next",
	]);
	await press(one("form"), "ArrowRight");
	check(
		"ARROW RIGHT WAITS WHILE THE ITEM IS UNANSWERED, WITHOUT FLAGGING IT",
		[items()[1], all("[data-slot=questionnaire-item]")[1]?.hasAttribute("data-invalid")],
		["+unanswered", false],
	);
	await tap(one("[data-slot=questionnaire-skip]"));
	check("SKIP SETTLES THE ITEM AND MOVES ON", items(), ["-answered", "-skipped", "+unanswered"]);
	check("THE LAST ITEM OFFERS SUBMIT, NOT NEXT", visibleSteps(), ["questionnaire-previous", "questionnaire-submit"]);
	await tap(one("[data-slot=questionnaire-submit]"));
	check("SUBMIT WITH A REQUIRED ITEM EMPTY SENDS NOTHING", [sent.length, items()[2]], [0, "+unanswered"]);
	await typeInto(inputIn("input[aria-label=Note]"), "Thanks");
	await press(inputIn("input[aria-label=Note]"), "Enter");
	check("ENTER IN A FILLED LAST ANSWER SUBMITS EVERY ANSWER UNDER ITS ITEM NAME", sent, ['[["live"],[],["Thanks"]]']);
	render(null, drawn);
}

{
	const statuses: string[] = [];
	render(
		h(
			kit.Questionnaire,
			null,
			h(
				kit.QuestionnaireItem,
				{ name: "seeded", onStatusChange: (status: string) => statuses.push(status) },
				h(kit.QuestionnaireChoice, { value: "yes", defaultChecked: true }, "Yes"),
				h(kit.QuestionnaireChoice, { value: "no" }, "No"),
			),
		),
		drawn,
	);
	await settled();
	check(
		"AN ITEM ANSWERED FROM ITS DEFAULTS READS AS ANSWERED AND REPORTS NO CHANGE ON MOUNT",
		[statuses, all("[data-slot=questionnaire-item]")[0]?.dataset["status"]],
		[[], "answered"],
	);
	render(null, drawn);
}

const PAGE_SIZE = { size: [480, 420] } as const;
const page = await openedChatPage();
const ask = (expression: string): Promise<unknown> =>
	page.ask(`(async () => {
	const frames = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 40))));
	const viewport = document.querySelector("[data-slot=message-scroller-viewport]");
	const button = document.querySelector("[data-slot=message-scroller-button]");
	const distance = () => Math.round(viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop);
	const offsetOf = (id) => Math.round(document.querySelector('[data-message-id="' + id + '"]').getBoundingClientRect().top - viewport.getBoundingClientRect().top);
	${expression}
})()`);

check(
	"THE SCROLLER OPENS AT THE LATEST MESSAGE WITH THE BUTTON AT REST",
	await ask(`return [distance() <= 1, button.dataset.active];`),
	[true, "false"],
);
check(
	"WHILE THE READER IS AT THE END, A GROWING LAST MESSAGE IS FOLLOWED",
	await ask(`chat.grow("r29", 240); await frames(); return distance() <= 1;`),
	true,
);
check(
	"A WHEEL UP RELEASES IT: GROWTH BELOW NO LONGER MOVES THE VIEW",
	await ask(`viewport.dispatchEvent(new WheelEvent("wheel", { deltaY: -120 })); viewport.scrollTop -= 400; await frames();
		const held = viewport.scrollTop; chat.grow("r29", 240); await frames();
		return [viewport.scrollTop === held, distance() > 300, button.dataset.active];`),
	[true, true, "true"],
);
check(
	"OLDER MESSAGES LOADED ABOVE KEEP THE ROW BEING READ IN PLACE",
	await ask(`viewport.scrollTop = 900; await frames(); const row = "r14"; const was = offsetOf(row);
		chat.prepend(12); await frames(); return Math.abs(offsetOf(row) - was) <= 1;`),
	true,
);
check(
	"THE BUTTON BRINGS THE READER TO THE END AND FOLLOWING RESUMES",
	await ask(`button.click(); await new Promise((done) => setTimeout(done, 1300)); await frames(); const reached = distance() <= 1;
		chat.grow("r29", 120); await frames(); return [reached, distance() <= 1, button.dataset.active];`),
	[true, true, "false"],
);
check(
	"A NEW ANCHORED TURN RISES TO THE TOP WITH THE PREVIOUS ROW PEEKING ABOVE IT",
	await ask(`chat.append({ id: "you", height: 40, anchor: true }); await frames();
		return [Math.abs(offsetOf("you") - 64) <= 2, chatSeen.currentAnchorId];`),
	[true, "you"],
);
check(
	"A SECOND TURN THAT FITS IN THE ROOM UNDER THE FIRST STILL RISES TO THE TOP",
	await ask(`chat.append({ id: "brief", height: 40 }); chat.append({ id: "you2", height: 40, anchor: true }); await frames();
		return Math.abs(offsetOf("you2") - 64) <= 2;`),
	true,
);
check(
	"A REPLY LONGER THAN THE ROOM UNDER THE TURN IS FOLLOWED TO ITS END",
	await ask(`chat.append({ id: "reply", height: 900 }); await frames(); return distance() <= 1;`),
	true,
);
check(
	"A JUMP TO A ROW NOT YET MOUNTED WAITS FOR IT AND LANDS ON IT",
	await ask(`const queued = chatCommands.scrollToMessage("late", { behavior: "instant" }); chat.insertAfter("r5", { id: "late" }); await frames();
		return [queued, Math.abs(offsetOf("late")) <= 1];`),
	[true, true],
);
page.close();

console.log(`\n${checks} checks, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

async function openedChatPage(): Promise<AskedPage> {
	const script = await bundleOf("tools/kit-chat-page.tsx");
	const html = `<!doctype html><html><head><meta charset="utf-8">
<style>:root { ${THEMES.light} }</style>
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>body { margin: 0; } #host { height: 300px; width: 400px; display: flex; flex-direction: column; }</style>
</head><body class="wg-root"><div id="host"></div><script>${script}</script></body></html>`;
	const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-kit-chat-")), "chat.html");
	writeFileSync(file, html);
	const opened = await paged(file, "document.querySelector('[data-message-id]') !== null", PAGE_SIZE);
	await waited(300);
	return opened;
}
