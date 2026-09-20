import { render } from "../src/engine/render.js";
import { arrayGateway, soloGateway } from "../src/gateway/create";
import { createViewCells } from "../src/gateway/refs.js";
import KanbanBoard from "../widgets/@default/kanban-board/widget.tsx";

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
	},
};

const opened = createViewCells()("dialog/opened");
opened.update(task.path);
const selection = soloGateway("Widgetarium", {}, "dialog-fit-board");
const boards = arrayGateway([], {}, "dialog-fit-boards");

const tasks = arrayGateway(
	[{ ref: task.path, value: task }],
	{
		update: async () => null,
		get: async () => ({ ref: task.path, value: { ...task, body: "A description with wide things in it." } }),
	},
	"dialog-fit-tasks",
);

// CONTEXT: a stand-in for Obsidian's renderer — the wide blocks are what this page measures
const WIDE_CODE =
	"const aLineOfCodeFarWiderThanTheColumnItSitsIn = somethingElseEntirelyTooLongToFit(1, 2, 3, 4, 5, 6);";
const host = {
	can: { renderMarkdown: true },
	ui: {
		renderMarkdown: (element) => {
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
		},
	},
};

render(
	<KanbanBoard
		board={soloGateway(
			{ columns: [{ name: "To Do" }, { name: "Doing" }, { name: "Done" }] },
			{ update: () => null },
			"dialog-fit-record",
		)}
		groupBy={soloGateway("status", {}, "dialog-fit-group")}
		slots={{}}
		tasks={tasks}
		boards={boards}
		selection={selection}
		opened={opened}
		host={host}
	/>,
	document.querySelector(".wg-root"),
);

const box = (node) => {
	const rect = node.getBoundingClientRect();
	return {
		left: Math.round(rect.left),
		right: Math.round(rect.right),
		top: Math.round(rect.top),
		bottom: Math.round(rect.bottom),
		width: Math.round(rect.width),
		height: Math.round(rect.height),
	};
};

function measure() {
	const dialog = document.querySelector(".orbi-task-dialog");
	if (!dialog) return { failure: "the dialog never rendered" };
	const left = dialog.querySelector(".otd-left");
	const plate = dialog.querySelector(".otd-props");
	const row = [...dialog.querySelectorAll(".otd-row")].find(
		(node) => node.querySelector(".wg-kit-row-label").textContent.trim() === "Priority",
	);
	const style = getComputedStyle(plate);
	const code = dialog.querySelector(".otd-md pre");
	const table = dialog.querySelector(".otd-md table");
	const diagram = dialog.querySelector(".otd-md .mermaid");
	// CONTEXT: a null here reads as a crash three lines later, naming nothing
	const missing = Object.entries({ left, plate, row, code, table, diagram })
		.filter(([, node]) => !node)
		.map(([name]) => name);
	if (missing.length) return { failure: `never rendered: ${missing.join(", ")}` };
	// CONTEXT: a box with overflow visible reports the same scrollWidth and scrolls nothing
	const scroller = (node) => ({
		...box(node),
		clipped: getComputedStyle(node).overflowX !== "visible",
		scrolls: getComputedStyle(node).overflowX !== "visible" && node.scrollWidth > node.clientWidth + 1,
		spill: Math.round(
			Math.max(...[...node.querySelectorAll("*"), node].map((child) => child.getBoundingClientRect().right)),
		),
	});
	return {
		code: scroller(code.querySelector("code")),
		codeBlock: box(code),
		copy: box(code.querySelector(".otd-copy")),
		codePadRight: Math.round(parseFloat(getComputedStyle(code.querySelector("code")).paddingRight)),
		table: scroller(table),
		diagram: scroller(diagram),
		wideRight: Math.round(
			Math.max(...[...dialog.querySelectorAll(".otd-md *")].map((node) => node.getBoundingClientRect().right)),
		),
		md: box(dialog.querySelector(".otd-md")),
		window: window.innerWidth,
		dialog: box(dialog),
		left: box(left),
		plate: box(plate),
		// CONTEXT: offsetWidth ignores transforms; getBoundingClientRect does not
		dialogLaidOut: dialog.offsetWidth,
		plateLaidOut: plate.offsetWidth,
		dialogPainted: (() => {
			const seen = getComputedStyle(dialog);
			return `${seen.transform} ${seen.scale} ${seen.translate} ${seen.opacity}`;
		})(),
		plateRadius: style.borderTopLeftRadius,
		plateFill: style.backgroundColor,
		// CONTEXT: the properties block IS the kit sidebar — a Plate around it was the block spelled twice
		plateIsSidebar: plate.classList.contains("wg-kit-side"),
		plateWraps: Boolean(plate.querySelector(".wg-kit-side") || plate.closest(".wg-kit-plate")),
		plateCast: style.boxShadow
			.split(/,(?![^(]*\))/)
			.map((part) => part.trim())
			.filter((part) => !part.includes("inset")),
		plateLift: style.boxShadow,
		// A SCROLL BOX CUTS ITS CHILDREN'S SHADOWS AT ITS OWN EDGE. Every ancestor that clips is
		// listed with the room it leaves the block on each side.
		// MEASURED IN THE SCROLLED CONTENT, not in what happens to be on screen: a block below
		// the fold is out of view, which is not the same thing as having its shadow cut.
		// EACH BOX CLIPS THE ONE UNDER IT — the innermost holds the block and owes it the room the
		// lift paints into; every one further out only has to hold that box whole.
		plateClips: (() => {
			let held = plate.getBoundingClientRect();
			let holds = "the block";
			const found = [];
			for (let node = plate.parentElement; node; node = node.parentElement) {
				const seen = getComputedStyle(node);
				if (seen.overflowX === "visible" && seen.overflowY === "visible") continue;
				const clip = node.getBoundingClientRect();
				const border = (side) => parseFloat(seen[`border${side}Width`]) || 0;
				const left = held.left - clip.left - border("Left") + node.scrollLeft;
				const top = held.top - clip.top - border("Top") + node.scrollTop;
				found.push({
					name: String(node.className || node.tagName)
						.split(" ")
						.pop(),
					holds,
					left: Math.round(left),
					top: Math.round(top),
					right: Math.round(node.scrollWidth - left - held.width),
					bottom: Math.round(node.scrollHeight - top - held.height),
				});
				held = clip;
				holds = found[found.length - 1].name;
			}
			return found;
		})(),
		row: box(row),
		// CONTEXT: the row is the kit's now — it opens with an icon cell, then the name, then the
		// value cell, so the gutters are measured against those and not against the old blob
		// A PRESSED ROW MUST BE TOLD APART FROM WHAT IT LIES ON. The panel is white now, so a
		// lighter fill has nowhere to go — the separation has to be an edge, and this reads the
		// rule itself rather than waiting for a person to notice white on white.
		openRow: (() => {
			row.classList.add("is-open");
			const painted = getComputedStyle(row, "::before");
			const seen = { fill: painted.backgroundColor, edge: painted.boxShadow };
			row.classList.remove("is-open");
			return seen;
		})(),
		plateFillNow: getComputedStyle(plate).backgroundColor,
		rowLead: box(row.querySelector(".wg-kit-side-icon")),
		rowName: box(row.querySelector(".wg-kit-row-label")),
		rowValue: box(row.querySelector(".wg-kit-side-value")),
		pageScrollWidth: document.documentElement.scrollWidth,
		pageClientWidth: document.documentElement.clientWidth,
	};
}

// CONTEXT: the portal mounts in an effect, and rAF under a virtual time budget is not a clock
function report(tries) {
	let payload;
	try {
		payload = measure();
	} catch (failure) {
		payload = { failure: String(failure && failure.message) };
	}
	if (payload.failure && tries > 0) {
		setTimeout(() => report(tries - 1), 16);
		return;
	}
	document.getElementById("wg-measure").textContent = JSON.stringify(payload);
}

report(60);
