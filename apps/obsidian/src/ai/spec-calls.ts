import { BUILD_STAGES } from "@widgetarium/core/app-spec.js";
import type { BuildStage } from "@widgetarium/core/app-spec.js";
import { argumentsIn, ourCallOf } from "./tools.js";
import type { AssistantCall, AssistantTurn } from "@widgetarium/core/engine/assistant-port.js";
import { buildKeyOf } from "@widgetarium/core/engine/assistant-cards.js";
import type { BuildRun, InstallRow, ItemStatus, StageRow } from "@widgetarium/core/engine/assistant-cards.js";

const ASKED_FOR_APP = "{said}: {app}";

export function askedForApp(said: string, app: string): string {
	return ASKED_FOR_APP.replace("{said}", said).replace("{app}", app);
}

export function isAskedBy(text: string, said: string): boolean {
	const asked = text.trim();
	return asked === said || appAskedFor(asked, said) !== null;
}

export function installsIn(calls: readonly AssistantCall[]): InstallRow[] {
	return calls.flatMap((call) => {
		const ours = ourCallOf(call);
		const widget = ours?.verb === "install" ? argumentsIn(ours.said)[0] : undefined;
		if (!widget) return [];
		const status: ItemStatus = !call.answered ? "active" : call.failed ? "failed" : "done";
		return [{ key: call.ref, widget, status }];
	});
}

export function specAppIn(call: AssistantCall): string | null {
	const ours = ourCallOf(call);
	if (ours?.verb !== "spec" || !call.answered || call.failed) return null;
	return argumentsIn(ours.said)[0] ?? null;
}

export function designAppIn(call: AssistantCall): string | null {
	const ours = ourCallOf(call);
	if (ours?.verb !== "design" || !call.answered || call.failed) return null;
	return argumentsIn(ours.said)[0] ?? null;
}

export function lastDesignAppIn(calls: readonly AssistantCall[]): string | null {
	return (
		calls
			.map(designAppIn)
			.filter((app): app is string => app !== null)
			.at(-1) ?? null
	);
}

export function lastSpecAppIn(calls: readonly AssistantCall[]): string | null {
	return (
		calls
			.map(specAppIn)
			.filter((app): app is string => app !== null)
			.at(-1) ?? null
	);
}

export function buildRunIn(
	calls: readonly AssistantCall[],
	isRunning: boolean,
	startedFor: string | null = null,
): BuildRun | null {
	const stages = calls.flatMap(stageCallOf);
	const app = startedFor ?? stages[0]?.app;
	if (!app) return null;
	const saidOf = new Map(stages.filter((one) => one.app === app).map((one) => [one.stage, one.said]));
	return { key: buildKeyOf(app), app, rows: stageRowsOf(saidOf, isRunning) };
}

export interface BuildSpan {
	readonly startAt: number;
	readonly endAt: number;
}

export function buildSpanOf(turns: readonly AssistantTurn[], at: number, buildSaid: string): BuildSpan | null {
	for (let startAt = at; startAt > 0; startAt -= 1) {
		if (buildStartedIn(turns, startAt, buildSaid) === null) continue;
		const nextAsk = turns.findIndex(
			(turn, index) => index > startAt && turn.role === "user" && isAskedBy(turn.text, buildSaid),
		);
		const endAt = nextAsk < 0 ? turns.length - 1 : nextAsk - 1;
		return at <= endAt ? { startAt, endAt } : null;
	}
	return null;
}

export function buildStartedIn(turns: readonly AssistantTurn[], at: number, buildSaid: string): string | null {
	const asked = turns[at - 1];
	if (turns[at]?.role !== "agent" || asked?.role !== "user" || !isAskedBy(asked.text, buildSaid)) return null;
	return (
		appAskedFor(asked.text.trim(), buildSaid) ?? lastSpecAppIn(turns.slice(0, at - 1).flatMap((turn) => turn.calls))
	);
}

function stageRowsOf(saidOf: ReadonlyMap<BuildStage, string>, isRunning: boolean): StageRow[] {
	const activeAt = isRunning ? BUILD_STAGES.findIndex((stage) => !saidOf.has(stage)) : -1;
	return BUILD_STAGES.map((stage, at) => ({
		stage,
		said: saidOf.get(stage) ?? "",
		status: saidOf.has(stage) ? "done" : at === activeAt ? "active" : "pending",
	}));
}

interface StageCall {
	readonly ref: string;
	readonly app: string;
	readonly stage: BuildStage;
	readonly said: string;
}

function stageCallOf(call: AssistantCall): StageCall[] {
	const ours = ourCallOf(call);
	if (ours?.verb !== "stage" || !call.answered || call.failed) return [];
	const words = argumentsIn(ours.said);
	const [app, stage] = words;
	const known = BUILD_STAGES.find((one) => one === stage);
	if (!app || !known) return [];
	return [{ ref: call.ref, app, stage: known, said: saidIn(words) }];
}

function saidIn(words: readonly string[]): string {
	const saidAt = words.indexOf("--said");
	return saidAt >= 0 ? (words[saidAt + 1] ?? "") : "";
}

function appAskedFor(asked: string, said: string): string | null {
	const opening = askedForApp(said, "");
	if (!asked.startsWith(opening)) return null;
	return asked.slice(opening.length).trim() || null;
}
