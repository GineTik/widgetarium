import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isSafeAppName } from "@widgetarium/core/app-design.js";
import { DESIGN_SYSTEM_PATH, appDesignSystemPathOf, rulesInForce } from "@widgetarium/core/design-rules.js";
import type { DesignRule } from "@widgetarium/core/design-rules.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { MEASURED_RULES } from "@widgetarium/core/page-measure.js";
import type { MeasuredFinding } from "@widgetarium/core/page-measure.js";
import { shotOfDesign } from "./shot-command.js";
import type { Told } from "./shape-command.js";

const NO_APP = 'Name the app whose design to check, for example: rules "Weekly review"';
const NO_RULES = "There is no design system at {path}: nothing to check against.";
const SAID = `{measured}

Judge the rest against the picture {picture}: answer each id with yes or no and, for a no, what you redraw. Redraw until every measured rule passes and every answer is yes, and only then run \`design {app}\`.
{from}
{judged}

Held by the kit, so not asked: {kit}`;
const FROM_APP = "Rules from {path} replace or add to the vault's.";
const MEASURED_PASSED = "Measured on the canvas, all pass: {ids}";
const MEASURED_FAILED = "Measured on the canvas, failing — fix each:\n{failed}\nPassing: {ids}";
const NOT_MEASURED = "The canvas was not measured ({why}); judge the measured rules by eye too.";
const NO_PICTURE = "from `shot --design {app}`";

export async function rulesOfApp(vault: string, app: string | undefined): Promise<Told<DesignRule[]>> {
	if (!app || !isSafeAppName(app)) return { refusal: NO_APP };
	const vaultText = await readFile(join(vault, DESIGN_SYSTEM_PATH), "utf8").catch(() => null);
	const appText = await readFile(join(vault, appDesignSystemPathOf(app)), "utf8").catch(() => null);
	const rules = rulesInForce(vaultText, appText);
	if (rules.length === 0) return { refusal: NO_RULES.replace("{path}", DESIGN_SYSTEM_PATH) };
	const measuring = await measuredCanvas(app);
	const isMeasured = (rule: DesignRule): boolean => measuring.findings !== null && isMeasuredRule(rule);
	const said = SAID.replace("{measured}", measuredSaid(rules.filter(isMeasuredRule), measuring))
		.replace("{picture}", measuring.picture ?? NO_PICTURE.replace("{app}", app))
		.replaceAll("{app}", app)
		.replace("{from}", appText === null ? "" : FROM_APP.replace("{path}", appDesignSystemPathOf(app)))
		.replace("{judged}", linesOf(rules.filter((rule) => rule.check !== "kit" && !isMeasured(rule))))
		.replace(
			"{kit}",
			rules
				.filter((rule) => rule.check === "kit")
				.map((rule) => rule.id)
				.join(", ") || "none",
		);
	return { value: rules, text: said };
}

interface Measuring {
	readonly findings: readonly MeasuredFinding[] | null;
	readonly picture: string | null;
	readonly why: string;
}

async function measuredCanvas(app: string): Promise<Measuring> {
	const shot = await shotOfDesign(app);
	if (!shot.path) return { findings: null, picture: null, why: shot.refusal ?? "" };
	const text = await readFile(shot.path.replace(/\.png$/, ".measured.json"), "utf8").catch(() => null);
	const findings = text === null ? null : findingsIn(JSON.parse(text));
	return { findings, picture: shot.path, why: findings === null ? "Obsidian wrote no measurement" : "" };
}

function measuredSaid(measured: readonly DesignRule[], { findings, why }: Measuring): string {
	if (findings === null) return NOT_MEASURED.replace("{why}", why);
	const failing = new Set(findings.map((one) => one.rule));
	const ids =
		measured
			.filter((rule) => !failing.has(rule.id))
			.map((rule) => rule.id)
			.join(", ") || "none";
	const failed = findings
		.filter((one) => measured.some((rule) => rule.id === one.rule))
		.map((one) => `${one.rule} · ${one.frame} — ${one.said}`);
	if (failed.length === 0) return MEASURED_PASSED.replace("{ids}", ids);
	return MEASURED_FAILED.replace("{failed}", failed.join("\n")).replace("{ids}", ids);
}

function isMeasuredRule(rule: DesignRule): boolean {
	return rule.check === "measured" && MEASURED_RULES.some((id) => id === rule.id);
}

function linesOf(rules: readonly DesignRule[]): string {
	return rules.map((rule) => `${rule.id} — ${rule.text}`).join("\n");
}

function findingsIn(held: unknown): MeasuredFinding[] {
	if (!Array.isArray(held)) return [];
	return held.filter(isMeasuredFinding);
}

function isMeasuredFinding(held: unknown): held is MeasuredFinding {
	return (
		isObject(held) &&
		typeof held["rule"] === "string" &&
		typeof held["frame"] === "string" &&
		typeof held["said"] === "string"
	);
}
