import { isObject } from "@widgetarium/core/engine/is-object.js";
import { surfaceVerdicts } from "@widgetarium/core/surface-laws.js";
import { boardOfNote, measuredOf } from "./board-note.js";
import type { RoledCard } from "./widget-entry.js";

type SurfaceReport = ReturnType<typeof surfaceVerdicts>;
type Verdict = SurfaceReport["verdicts"][number];
type NestingFinding = SurfaceReport["nesting"][number];

export interface SurfacesAnswer {
	readonly value: SurfaceReport & { readonly note: string; readonly measured: boolean };
	readonly text: string;
}

export async function surfacesOfNote(
	vault: string,
	at: string,
	cards: readonly RoledCard[],
): Promise<SurfacesAnswer | null> {
	const board = await boardOfNote(vault, at);
	if (board === null) return null;
	const measured = await measuredOf(vault, at);
	const roleOf = (widget: unknown): string | null => cards.find((card) => card.id === widget)?.role ?? null;
	const report = surfaceVerdicts({ layout: board.layout, tiles: board.tiles, measured, roleOf });
	return { value: { note: at, measured: measured !== null, ...report }, text: saidSurfaces(at, measured, report) };
}

function saidSurfaces(at: string, measured: unknown, report: SurfaceReport): string {
	const head = measured
		? `${at}, measured in the ${String(isObject(measured) ? measured["theme"] : undefined)} theme`
		: `${at} was never measured. Open the note in Obsidian, wait a second, and run this again.`;
	return [
		head,
		...report.verdicts.map(saidVerdict),
		...saidFindings("Nesting", report.nesting, "every surface stands where the nesting table allows it."),
	].join("\n");
}

function saidFindings(title: string, findings: readonly NestingFinding[], clean: string): string[] {
	if (findings.length === 0) return ["", `${title}: ${clean}`];
	return ["", `${title}:`, ...findings.map((one) => `${one.path.join("/")}. Law ${one.law}: ${one.reason}`)];
}

function saidVerdict(verdict: Verdict): string {
	const side = verdict.side ? ` on its ${verdict.side} side` : "";
	const named =
		verdict.kind === "region" ? "" : ` [${verdict.role ?? "no role"}${verdict.purpose ? `: ${verdict.purpose}` : ""}]`;
	const head = `${verdict.path.join("/")} ${verdict.kind}${named}: now ${verdict.now}, advised ${verdict.advised}${side}. Law ${verdict.law}: ${verdict.reason}`;
	const weighed = (verdict.candidates ?? []).flatMap((one) => [
		`    ${one.surface} ${one.passes ? "passes" : "fails"}`,
		...one.reasons.map((reason) => `      ${reason}`),
	]);
	return [head, ...weighed].join("\n");
}
