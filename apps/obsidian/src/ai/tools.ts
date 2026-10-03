import { isObject } from "@widgetarium/core/engine/is-object.js";

export interface CallSeen {
	readonly name?: unknown;
	readonly input?: unknown;
}

export interface AnswerableCall {
	readonly ref: string;
	readonly answered: boolean;
	readonly failed: boolean;
}

export interface CallResult {
	readonly ref: string;
	readonly output: string;
	readonly failed: boolean;
	readonly at?: number;
}

export interface OurCall {
	readonly verb: string;
	readonly said: string;
}

const GLYPH_FOR_TOOL: Readonly<Record<string, string>> = {
	Bash: "terminal",
	BashOutput: "terminal",
	Read: "folder",
	NotebookRead: "folder",
	Write: "pencil",
	Edit: "pencil",
	NotebookEdit: "pencil",
	Glob: "search",
	Grep: "search",
	WebFetch: "link",
	WebSearch: "link",
	Task: "widget",
	TodoWrite: "check",
	SlashCommand: "menu",
};

const HINT_FIELDS = ["command", "file_path", "path", "pattern", "query", "url", "description", "prompt"];
const LONGEST_HINT = 120;

export const OUR_NAME = "Widgetarium";
const OUR_TOOL_CALL = /widgets\.mjs\s+([a-z][a-z-]*)([\s\S]*)$/;
const ARGUMENT = /"([^"]*)"|'([^']*)'|((?:\\.|[^\s"'])+)/g;

export function glyphForTool(name: unknown): string {
	return (typeof name === "string" ? GLYPH_FOR_TOOL[name] : undefined) ?? "widget";
}

export function ourCallIn(command: unknown): OurCall | null {
	const found = String(command ?? "").match(OUR_TOOL_CALL);
	if (!found) return null;
	return { verb: found[1] ?? "", said: (found[2] ?? "").trim() };
}

export function argumentsIn(said: string): string[] {
	return [...said.matchAll(ARGUMENT)].map((found) => found[1] ?? found[2] ?? (found[3] ?? "").replace(/\\(.)/g, "$1"));
}

export const ourCallOf = (call: CallSeen | null | undefined): OurCall | null =>
	call?.name === "Bash" ? ourCallIn(inputOf(call)["command"]) : null;

export function glyphOf(call: CallSeen | null | undefined): string {
	return ourCallOf(call) ? "widget" : glyphForTool(call?.name);
}

// TRADE-OFF: the model's own description is taken as written, because a title we compose here would be a second opinion about work we did not do
export function titleOf(call: CallSeen | null | undefined): string {
	const ours = ourCallOf(call);
	if (ours) return `${OUR_NAME} · ${ours.verb}`;
	const described = inputOf(call)["description"];
	if (typeof described === "string" && described.trim() !== "") return described.trim();
	return String(call?.name ?? "");
}

export function hintOf(call: CallSeen | null | undefined): string {
	const ours = ourCallOf(call);
	if (ours) return ours.said;
	const input = inputOf(call);
	for (const field of HINT_FIELDS) {
		const held = input[field];
		if (typeof held !== "string" || held.trim() === "") continue;
		return clipLine(held, LONGEST_HINT);
	}
	return "";
}

export function withResult<Call extends AnswerableCall>(calls: Call[], result: CallResult): Call[] {
	let landed = false;
	const held = calls.map((call) => {
		if (call.ref !== result.ref || call.answered) return call;
		landed = true;
		return { ...call, answered: true, output: result.output, failed: result.failed, answeredAt: result.at ?? 0 };
	});
	return landed ? held : calls;
}

export function failuresIn(calls: readonly AnswerableCall[]): number {
	return calls.filter((call) => call.failed).length;
}

export function glyphsOf(calls: readonly CallSeen[], most: number): string[] {
	const seen = new Set<string>();
	const held: string[] = [];
	for (const call of calls) {
		const glyph = glyphOf(call);
		if (seen.has(glyph)) continue;
		seen.add(glyph);
		held.push(glyph);
		if (held.length === most) break;
	}
	return held;
}

export function clipLine(text: unknown, longest: number): string {
	const line = (
		String(text ?? "")
			.trim()
			.split("\n")[0] ?? ""
	).trim();
	return line.length > longest ? `${line.slice(0, longest)}…` : line;
}

function inputOf(call: CallSeen | null | undefined): Readonly<Record<string, unknown>> {
	const input = call?.input;
	return isObject(input) ? input : {};
}
