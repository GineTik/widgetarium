import { clippedLine, ourCallOf } from "./tools.js";

export const TASK_PROGRESS = "@default/task-progress";

const BUILDING = "Building {title}";
const BUILT = "Built {title}";
const WRITING = "Writing the widget";
const CHECKING = "Checking the widget";
const PLACING = "Placing it on the board";
const LINTING = "Checking the board";
const CLEAN = "No problems found";
const LONGEST_HINT = 100;
const WRITING_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const NOTE_FILE = /\.md$/;
const TITLE_OPTION = /--title\s+(?:"([^"]*)"|'([^']*)'|(\S+))/;

export function buildsIn(calls, isRunning) {
	const started = startedBuilds(calls ?? []);
	return started.map((build, at) => buildOf(build, isRunning && at === started.length - 1));
}

export function startIn(call) {
	if (ourVerbOf(call) !== "start") return null;
	const said = ourSaidOf(call);
	const id = firstWordOf(said);
	if (id === "") return null;
	return { id, title: titleIn(said) || titleFromId(id) };
}

function startedBuilds(calls) {
	const started = [];
	for (const call of calls) {
		const opened = startIn(call);
		if (opened) started.push({ ...opened, ref: call.ref, at: Number(call.at ?? 0), owned: [] });
		const current = started[started.length - 1];
		if (!current) continue;
		const at = STEPS.findIndex((step) => step.owns(call, current.id));
		if (at >= 0) current.owned.push({ step: at, call });
	}
	return started;
}

function buildOf(build, isLive) {
	const steps = stepsOf(build, isLive);
	const isClean = !isLive && steps.every((step) => step.status === "done");
	return {
		key: build.ref,
		widget: build.id,
		title: (isClean ? BUILT : BUILDING).replace("{title}", build.title),
		steps,
		isLive,
		startedAt: build.at,
		endedAt: isLive || build.at === 0 ? 0 : endOf(build),
	};
}

function titleIn(said) {
	const named = said.match(TITLE_OPTION);
	return (named?.[1] ?? named?.[2] ?? named?.[3] ?? "").trim();
}

const STEPS = [
	{
		label: WRITING,
		owns: (call, id) => writesInto(call, id) || startIn(call)?.id === id,
		hint: (call, id) => (call.failed ? firstLineOf(call.output) : writesInto(call, id) ? widgetFileOf(call, id) : id),
	},
	{
		label: CHECKING,
		owns: (call, id) => ourVerbOf(call) === "check" && firstWordOf(ourSaidOf(call)) === id,
		hint: checkHint,
	},
	{
		label: PLACING,
		owns: (call, id) => NOTE_FILE.test(writtenPathOf(call)) && !writesInto(call, id),
		hint: (call) => (call.failed ? firstLineOf(call.output) : noteNameOf(call)),
	},
	{
		label: LINTING,
		owns: (call) => ourVerbOf(call) === "lint",
		hint: (call) => (call.failed ? firstLineOf(call.output) : call.answered ? CLEAN : "lint"),
	},
];

function stepsOf(build, isLive) {
	const latest = build.owned[build.owned.length - 1]?.call ?? null;
	return STEPS.map((step, at) => {
		const last = build.owned.filter((owned) => owned.step === at).pop()?.call ?? null;
		const status = statusOf(last, last === latest, isLive);
		const hint = last ? step.hint(last, build.id) : "";
		return { label: step.label, status, hint };
	});
}

function statusOf(last, isLatest, isLive) {
	if (!last) return "pending";
	if (last.answered && last.failed) return "failed";
	if (isLive && isLatest) return "active";
	return last.answered ? "done" : "failed";
}

function endOf(build) {
	const last = build.owned[build.owned.length - 1]?.call;
	return Number(last?.answeredAt ?? last?.at ?? 0);
}

function checkHint(call) {
	if (call.failed) return firstLineOf(call.output);
	return call.answered ? CLEAN : `check ${firstWordOf(ourSaidOf(call))}`;
}

function titleFromId(id) {
	const name = id.slice(id.lastIndexOf("/") + 1).replace(/-/g, " ");
	return name === "" ? id : `${name[0].toUpperCase()}${name.slice(1)}`;
}

function widgetFileOf(call, id) {
	const path = writtenPathOf(call);
	return path.slice(path.indexOf(`/${id}/`) + 1);
}

function noteNameOf(call) {
	const path = writtenPathOf(call);
	return path.slice(path.lastIndexOf("/") + 1).replace(NOTE_FILE, "");
}

function firstLineOf(output) {
	return clippedLine(output, LONGEST_HINT);
}

function writesInto(call, id) {
	return writtenPathOf(call).includes(`/${id}/`);
}

function writtenPathOf(call) {
	if (!WRITING_TOOLS.has(call?.name)) return "";
	const input = call.input ?? {};
	return String(input.file_path ?? input.path ?? "");
}

function ourVerbOf(call) {
	return ourCallOf(call)?.verb ?? null;
}

function ourSaidOf(call) {
	return ourCallOf(call)?.said ?? "";
}

function firstWordOf(said) {
	return said.split(/\s+/)[0]?.replace(/^["']|["']$/g, "") ?? "";
}
