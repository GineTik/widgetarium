import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	BUILD_STAGES,
	SPEC_FOLDER,
	isBuildStage,
	readSpec,
	specPathOf,
	specSummaryOf,
} from "@widgetarium/core/app-spec.js";
import type { AppSpec, BuildStage } from "@widgetarium/core/app-spec.js";
import type { Told } from "./shape-command.js";

export interface StageSaid {
	readonly app: string;
	readonly stage: BuildStage;
	readonly said: string;
}

const NO_APP = 'Name the app, as its spec folder is named: spec "Vocabulary".';
const NO_SPEC = "There is no spec at {path}. Write it first; docs/ai/spec.md in the handbook has the shape.";
const SPEC_REFUSED = "The spec at {path} does not fit: {why}";
const NO_STAGE = `Name the stage you finished: one of ${BUILD_STAGES.join(", ")}.`;
const OTHER_CASE = 'The spec folder is named "{real}", not "{asked}"; the card finds it only by its exact name.';
const NO_SAID = 'Say in one line what the stage made: --said "Words and reviews, 54 notes"';

export async function specOfApp(vault: string, app: unknown): Promise<Told<AppSpec>> {
	if (typeof app !== "string" || app.trim() === "") return { refusal: NO_APP };
	const asked = app.trim();
	const otherCase = await refuseOtherCase(vault, asked);
	if (otherCase) return { refusal: otherCase };
	const path = specPathOf(asked);
	const text = await readFile(join(vault, path), "utf8").catch(() => null);
	if (text === null) return { refusal: NO_SPEC.replace("{path}", path) };
	const read = readSpec(text);
	if (read.refusal !== undefined)
		return { refusal: SPEC_REFUSED.replace("{path}", path).replace("{why}", read.refusal) };
	return { value: read.spec, text: specSummaryOf(read.spec) };
}

export async function stageOfApp(vault: string, app: unknown, stage: unknown, said: unknown): Promise<Told<StageSaid>> {
	const spec = await specOfApp(vault, app);
	if (spec.refusal !== undefined) return spec;
	if (!isBuildStage(stage)) return { refusal: NO_STAGE };
	if (typeof said !== "string" || said.trim() === "") return { refusal: NO_SAID };
	const value = { app: spec.value.app, stage, said: said.trim() };
	return { value, text: `${value.app}: ${stage} done — ${value.said}` };
}

async function refuseOtherCase(vault: string, asked: string): Promise<string | null> {
	const folders = await readdir(join(vault, SPEC_FOLDER)).catch(() => []);
	const real = folders.find((name) => name.toLowerCase() === asked.toLowerCase());
	if (real === undefined || real === asked) return null;
	return OTHER_CASE.replace("{real}", real).replace("{asked}", asked);
}
