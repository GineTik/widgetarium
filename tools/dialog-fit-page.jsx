import { render } from "preact";
import TaskDialog from "../widgets/@orbitask/task-dialog/widget.jsx";

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

// CONTEXT: the opener hands over a fresh ref per press; one press is one object
const held = { path: task.path };
const board = "Widgetarium";
const context = {
	get: (key) => (key === "task" ? held : key === "board" ? board : undefined),
	set: () => {},
};

const actions = {
	tasks: { canUpdate: true, canCreate: true, update: async () => {}, open: () => {} },
};

render(
	<TaskDialog
		settings={{ properties: "Status, Priority, Approval, Progress, Assignees, Deadline, Client", columns: "To Do, Doing, Done" }}
		data={{ tasks: { rows: [task] } }}
		actions={actions}
		context={context}
		configure={() => {}}
	/>,
	document.querySelector(".wg-root"),
);

const box = (node) => {
	const rect = node.getBoundingClientRect();
	return { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) };
};

function measure() {
	const dialog = document.querySelector(".orbi-task-dialog");
	if (!dialog) return { failure: "the dialog never rendered" };
	const left = dialog.querySelector(".otd-left");
	const plate = dialog.querySelector(".otd-props");
	const row = [...dialog.querySelectorAll(".otd-row")].find((node) => node.querySelector(".otd-name").textContent.trim() === "Priority");
	const style = getComputedStyle(plate);
	return {
		window: window.innerWidth,
		dialog: box(dialog),
		left: box(left),
		plate: box(plate),
		plateRadius: style.borderTopLeftRadius,
		plateFill: style.backgroundColor,
		row: box(row),
		rowName: box(row.querySelector(".otd-name")),
		rowValue: box(row.querySelector(".otd-value")),
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
