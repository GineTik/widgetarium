import { isObject } from "@widgetarium/core/engine/is-object.js";
import { clipLine, ourCallOf } from "./tools.js";
import type { KeptCall } from "./transcript.js";

export type StepStatus = "pending" | "failed" | "active" | "done";

export interface BuildStep {
	readonly label: string;
	readonly status: StepStatus;
	readonly hint: string;
}

export interface Build {
	readonly key: string;
	readonly widget: string;
	readonly title: string;
	readonly steps: BuildStep[];
	readonly isLive: boolean;
	readonly startedAt: number;
	readonly endedAt: number;
}

export interface BuildStart {
	readonly id: string;
	readonly title: string;
}

interface OwnedCall {
	readonly step: number;
	readonly call: KeptCall;
}

interface StartedBuild extends BuildStart {
	readonly ref: string;
	readonly at: number;
	readonly owned: OwnedCall[];
}

interface Step {
	readonly label: string;
	readonly owns: (call: KeptCall, id: string) => boolean;
	readonly hint: (call: KeptCall, id: string) => string;
}

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

export function buildsIn(calls: readonly KeptCall[] | null | undefined, isRunning: boolean): Build[] {
	const started = startedBuilds(calls ?? []);
	return started.map((build, at) => buildOf(build, isRunning && at === started.length - 1));
}

export function startIn(call: KeptCall): BuildStart | null {
	if (ourVerbOf(call) !== "start") return null;
	const said = ourSaidOf(call);
	const id = firstWordOf(said);
	if (id === "") return null;
	return { id, title: titleIn(said) || titleFromId(id) };
}

function startedBuilds(calls: readonly KeptCall[]): StartedBuild[] {
	const started: StartedBuild[] = [];
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

function buildOf(build: StartedBuild, isLive: boolean): Build {
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

function titleIn(said: string): string {
	const named = said.match(TITLE_OPTION);
	return (named?.[1] ?? named?.[2] ?? named?.[3] ?? "").trim();
}

const STEPS: readonly Step[] = [
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

function stepsOf(build: StartedBuild, isLive: boolean): BuildStep[] {
	const latest = build.owned[build.owned.length - 1]?.call ?? null;
	return STEPS.map((step, at) => {
		const last = build.owned.filter((owned) => owned.step === at).pop()?.call ?? null;
		const status = statusOf(last, last === latest, isLive);
		const hint = last ? step.hint(last, build.id) : "";
		return { label: step.label, status, hint };
	});
}

function statusOf(last: KeptCall | null, isLatest: boolean, isLive: boolean): StepStatus {
	if (!last) return "pending";
	if (last.answered && last.failed) return "failed";
	if (isLive && isLatest) return "active";
	return last.answered ? "done" : "failed";
}

function endOf(build: StartedBuild): number {
	const last = build.owned[build.owned.length - 1]?.call;
	return Number(last?.answeredAt ?? last?.at ?? 0);
}

function checkHint(call: KeptCall): string {
	if (call.failed) return firstLineOf(call.output);
	return call.answered ? CLEAN : `check ${firstWordOf(ourSaidOf(call))}`;
}

function titleFromId(id: string): string {
	const name = id.slice(id.lastIndexOf("/") + 1).replace(/-/g, " ");
	return name === "" ? id : `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function widgetFileOf(call: KeptCall, id: string): string {
	const path = writtenPathOf(call);
	return path.slice(path.indexOf(`/${id}/`) + 1);
}

function noteNameOf(call: KeptCall): string {
	const path = writtenPathOf(call);
	return path.slice(path.lastIndexOf("/") + 1).replace(NOTE_FILE, "");
}

function firstLineOf(output: string): string {
	return clipLine(output, LONGEST_HINT);
}

function writesInto(call: KeptCall, id: string): boolean {
	return writtenPathOf(call).includes(`/${id}/`);
}

function writtenPathOf(call: KeptCall | null | undefined): string {
	if (!call || !WRITING_TOOLS.has(call.name)) return "";
	const input = isObject(call.input) ? call.input : {};
	return String(input["file_path"] ?? input["path"] ?? "");
}

function ourVerbOf(call: KeptCall): string | null {
	return ourCallOf(call)?.verb ?? null;
}

function ourSaidOf(call: KeptCall): string {
	return ourCallOf(call)?.said ?? "";
}

function firstWordOf(said: string): string {
	return said.split(/\s+/)[0]?.replace(/^["']|["']$/g, "") ?? "";
}
