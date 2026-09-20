import { surfaceVerdicts } from "../surface-laws.js";
import { boardOfNote, measuredOf } from "./board-note.mjs";

export async function surfacesOfNote(vault, at, cards) {
	const board = await boardOfNote(vault, at);
	if (board === null) return null;
	const measured = await measuredOf(vault, at);
	const roleOf = (widget) => cards.find((card) => card.id === widget)?.role ?? null;
	const report = surfaceVerdicts({ layout: board.layout, tiles: board.tiles, measured, roleOf });
	return { value: { note: at, measured: measured !== null, ...report }, text: saidSurfaces(at, measured, report) };
}

function saidSurfaces(at, measured, report) {
	const head = measured
		? `${at}, measured in the ${measured.theme} theme`
		: `${at} was never measured. Open the note in Obsidian, wait a second, and run this again.`;
	return [
		head,
		...report.verdicts.map(saidVerdict),
		...saidFindings("Nesting", report.nesting, "every surface stands where the nesting table allows it."),
	].join("\n");
}

function saidFindings(title, findings, clean) {
	if (findings.length === 0) return ["", `${title}: ${clean}`];
	return ["", `${title}:`, ...findings.map((one) => `${one.path.join("/")}. Law ${one.law}: ${one.reason}`)];
}

function saidVerdict(verdict) {
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
