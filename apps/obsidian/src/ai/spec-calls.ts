import { BUILD_STAGES } from "@widgetarium/core/app-spec.js";
import type { BuildStage } from "@widgetarium/core/app-spec.js";
import { argumentsIn, ourCallOf } from "./tools.js";
import type { KeptCall } from "./transcript.js";

export type StageStatus = "done" | "active" | "pending";

export interface StageRow {
	readonly stage: BuildStage;
	readonly said: string;
	readonly status: StageStatus;
}

export interface BuildRun {
	readonly key: string;
	readonly app: string;
	readonly rows: readonly StageRow[];
}

export function specAppIn(call: KeptCall): string | null {
	const ours = ourCallOf(call);
	if (ours?.verb !== "spec" || !call.answered || call.failed) return null;
	return argumentsIn(ours.said)[0] ?? null;
}

export function lastSpecAppIn(calls: readonly KeptCall[]): string | null {
	return (
		calls
			.map(specAppIn)
			.filter((app): app is string => app !== null)
			.at(-1) ?? null
	);
}

export function buildRunIn(calls: readonly KeptCall[], isRunning: boolean): BuildRun | null {
	const stages = calls.flatMap(stageCallOf);
	const [first] = stages;
	if (!first) return null;
	const saidOf = new Map(stages.filter((one) => one.app === first.app).map((one) => [one.stage, one.said]));
	return { key: first.ref, app: first.app, rows: stageRowsOf(saidOf, isRunning) };
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

function stageCallOf(call: KeptCall): StageCall[] {
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
