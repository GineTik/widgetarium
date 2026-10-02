import "./packs-registered.ts";
import { createElement as h } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { arrayGateway, soloGateway } from "../packages/core/src/gateway/create";
import { createViewCells } from "../packages/core/src/gateway/refs.js";
import { PAGE_HOST } from "./page-harness.ts";
import KanbanBoard from "../registry/@default/kanban-board/widget.tsx";

const task = {
	path: "Orbitask/Tasks/replace-the-three-task-widgets.md",
	name: "Replace the three task widgets with one dialog",
	props: {
		title: "Replace the three task widgets with one dialog",
		status: "Doing",
		priority: "P1",
		approval: "Review",
		progress: 65,
		assignees: ["Denis Sevcuk", "Maria Kovalenko"],
		tags: ["orbitask", "widget"],
		board: "Widgetarium",
	},
};

const opened = createViewCells()("dialog/opened");
void opened.update(task.path);
const selection = soloGateway("Widgetarium", {}, "dialog-fit-board");

const tasks = arrayGateway(
	[{ ref: task.path, value: task }],
	{
		update: async () => null,
		get: async () => ({ ref: task.path, value: { ...task, body: "A description with wide things in it." } }),
	},
	"dialog-fit-tasks",
);

const WIDE_CODE =
	"const aLineOfCodeFarWiderThanTheColumnItSitsIn = somethingElseEntirelyTooLongToFit(1, 2, 3, 4, 5, 6);";

function renderWideMarkdown(element: HTMLElement): () => void {
	element.textContent = "";
	element.insertAdjacentHTML(
		"beforeend",
		`<p>A paragraph before it.</p>
				 <pre><code>${WIDE_CODE}</code></pre>
				 <table><thead><tr>${"<th>a column header</th>".repeat(9)}</tr></thead>
				 <tbody><tr>${"<td>a cell</td>".repeat(9)}</tr></tbody></table>
				 <div class="mermaid"><svg width="1400" height="80"></svg></div>`,
	);
	return () => {};
}

const HOST_RENDERING_WIDE_MARKDOWN = {
	...PAGE_HOST,
	can: { ...PAGE_HOST.can, renderMarkdown: true },
	ui: { ...PAGE_HOST.ui, renderMarkdown: renderWideMarkdown },
};

const root = document.querySelector(".wg-root");
if (root)
	render(
		<KanbanBoard
			getBoard={soloGateway(
				{ columns: [{ name: "To Do" }, { name: "Doing" }, { name: "Done" }] },
				{ update: () => null },
				"dialog-fit-record",
			)}
			getGroupBy={soloGateway("status", {}, "dialog-fit-group")}
			getTasks={tasks}
			getBoards={[]}
			getSelection={selection}
			getOpened={opened}
			host={HOST_RENDERING_WIDE_MARKDOWN}
		/>,
		root,
	);

interface Box {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
	readonly width: number;
	readonly height: number;
}

function box(node: Element): Box {
	const rect = node.getBoundingClientRect();
	return {
		left: Math.round(rect.left),
		right: Math.round(rect.right),
		top: Math.round(rect.top),
		bottom: Math.round(rect.bottom),
		width: Math.round(rect.width),
		height: Math.round(rect.height),
	};
}

function required(node: Element | null | undefined, name: string): Element {
	if (!node) throw new Error(`never rendered: ${name}`);
	return node;
}

// TRADE-OFF: a box with overflow visible reports the same scrollWidth and scrolls nothing
interface Scroll extends Box {
	readonly clipped: boolean;
	readonly scrolls: boolean;
	readonly spill: number;
}

function scroller(node: Element): Scroll {
	return {
		...box(node),
		clipped: getComputedStyle(node).overflowX !== "visible",
		scrolls: getComputedStyle(node).overflowX !== "visible" && node.scrollWidth > node.clientWidth + 1,
		spill: Math.round(
			Math.max(...[...node.querySelectorAll("*"), node].map((child) => child.getBoundingClientRect().right)),
		),
	};
}

interface ClipFound {
	readonly name: string;
	readonly holds: string;
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

// TRADE-OFF: measured in the scrolled content, each clipping box owing the one inside it room for its lift
function clipsAround(plate: Element): ClipFound[] {
	let held = plate.getBoundingClientRect();
	let holds = "the block";
	const found: ClipFound[] = [];
	for (let node = plate.parentElement; node; node = node.parentElement) {
		const seen = getComputedStyle(node);
		if (seen.overflowX === "visible" && seen.overflowY === "visible") continue;
		const clip = node.getBoundingClientRect();
		const left = held.left - clip.left - (parseFloat(seen.borderLeftWidth) || 0) + node.scrollLeft;
		const top = held.top - clip.top - (parseFloat(seen.borderTopWidth) || 0) + node.scrollTop;
		const name =
			String(node.className || node.tagName)
				.split(" ")
				.pop() ?? "";
		found.push({
			name,
			holds,
			left: Math.round(left),
			top: Math.round(top),
			right: Math.round(node.scrollWidth - left - held.width),
			bottom: Math.round(node.scrollHeight - top - held.height),
		});
		held = clip;
		holds = name;
	}
	return found;
}

function openRowPaint(row: Element): Readonly<Record<string, string>> {
	row.classList.add("is-open");
	const painted = getComputedStyle(row, "::before");
	const seen = { fill: painted.backgroundColor, edge: painted.boxShadow };
	row.classList.remove("is-open");
	return seen;
}

function measure(): Readonly<Record<string, unknown>> {
	const dialog = document.querySelector(".orbi-task-dialog");
	if (!dialog) return { failure: "the dialog never rendered" };
	const found = {
		left: dialog.querySelector(".otd-left"),
		plate: dialog.querySelector(".otd-props"),
		row: [...dialog.querySelectorAll(".otd-row")].find(
			(node) => node.querySelector(".wg-kit-row-label")?.textContent?.trim() === "Priority",
		),
		code: dialog.querySelector(".otd-md pre"),
		table: dialog.querySelector(".otd-md table"),
		diagram: dialog.querySelector(".otd-md .mermaid"),
	};
	const missing = Object.entries(found)
		.filter(([, node]) => !node)
		.map(([name]) => name);
	if (missing.length) return { failure: `never rendered: ${missing.join(", ")}` };
	const left = required(found.left, "left");
	const plate = required(found.plate, "plate");
	const row = required(found.row, "row");
	const code = required(found.code, "code");
	const codeText = required(code.querySelector("code"), "code text");
	const style = getComputedStyle(plate);
	return {
		code: scroller(codeText),
		codeBlock: box(code),
		copy: box(required(code.querySelector(".otd-copy"), "copy")),
		codePadRight: Math.round(parseFloat(getComputedStyle(codeText).paddingRight)),
		table: scroller(required(found.table, "table")),
		diagram: scroller(required(found.diagram, "diagram")),
		wideRight: Math.round(
			Math.max(...[...dialog.querySelectorAll(".otd-md *")].map((node) => node.getBoundingClientRect().right)),
		),
		md: box(required(dialog.querySelector(".otd-md"), "md")),
		window: window.innerWidth,
		dialog: box(dialog),
		left: box(left),
		plate: box(plate),
		dialogLaidOut: dialog instanceof HTMLElement ? dialog.offsetWidth : undefined,
		plateLaidOut: plate instanceof HTMLElement ? plate.offsetWidth : undefined,
		dialogPainted: paintedTransformOf(dialog),
		plateRadius: style.borderTopLeftRadius,
		plateFill: style.backgroundColor,
		plateIsSidebar: plate.classList.contains("wg-kit-side"),
		plateWraps: Boolean(plate.querySelector(".wg-kit-side") || plate.closest(".wg-kit-plate")),
		plateCast: style.boxShadow
			.split(/,(?![^(]*\))/)
			.map((part) => part.trim())
			.filter((part) => !part.includes("inset")),
		plateLift: style.boxShadow,
		plateClips: clipsAround(plate),
		row: box(row),
		openRow: openRowPaint(row),
		plateFillNow: getComputedStyle(plate).backgroundColor,
		rowLead: box(required(row.querySelector(".wg-kit-side-icon"), "row icon")),
		rowName: box(required(row.querySelector(".wg-kit-row-label"), "row label")),
		rowValue: box(required(row.querySelector(".wg-kit-side-value"), "row value")),
		pageScrollWidth: document.documentElement.scrollWidth,
		pageClientWidth: document.documentElement.clientWidth,
	};
}

function paintedTransformOf(node: Element): string {
	const seen = getComputedStyle(node);
	return `${seen.transform} ${seen.scale} ${seen.translate} ${seen.opacity}`;
}

const failureOf = (failure: unknown): string => String(failure instanceof Error ? failure.message : undefined);

// TRADE-OFF: the portal mounts in an effect, and rAF under a virtual time budget is not a clock
function report(tries: number): void {
	let payload: Readonly<Record<string, unknown>>;
	try {
		payload = measure();
	} catch (failure) {
		payload = { failure: failureOf(failure) };
	}
	if (payload["failure"] && tries > 0) {
		setTimeout(() => report(tries - 1), 16);
		return;
	}
	const said = document.getElementById("wg-measure");
	if (said) said.textContent = JSON.stringify(payload);
}

report(60);
