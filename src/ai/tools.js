const GLYPH_FOR_TOOL = {
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

export function glyphForTool(name) {
	return GLYPH_FOR_TOOL[name] ?? "widget";
}

export function ourCallIn(command) {
	const found = String(command ?? "").match(OUR_TOOL_CALL);
	if (!found) return null;
	return { verb: found[1], said: found[2].trim() };
}

const ourCallOf = (call) => (call?.name === "Bash" ? ourCallIn(call?.input?.command) : null);

export function glyphOf(call) {
	return ourCallOf(call) ? "widget" : glyphForTool(call?.name);
}

// TRADE-OFF: the model's own description is taken as written, because a title we compose here would be a second opinion about work we did not do
export function titleOf(call) {
	const ours = ourCallOf(call);
	if (ours) return `${OUR_NAME} \u00b7 ${ours.verb}`;
	const described = call?.input?.description;
	if (typeof described === "string" && described.trim() !== "") return described.trim();
	return call?.name ?? "";
}

export function hintOf(call) {
	const ours = ourCallOf(call);
	if (ours) return ours.said;
	for (const field of HINT_FIELDS) {
		const held = call?.input?.[field];
		if (typeof held !== "string" || held.trim() === "") continue;
		const firstLine = held.trim().split("\n")[0];
		return firstLine.length > LONGEST_HINT ? `${firstLine.slice(0, LONGEST_HINT)}…` : firstLine;
	}
	return "";
}

export function withResult(calls, result) {
	let landed = false;
	const held = calls.map((call) => {
		if (call.ref !== result.ref || call.answered) return call;
		landed = true;
		return { ...call, answered: true, output: result.output, failed: result.failed };
	});
	return landed ? held : calls;
}

export function failuresIn(calls) {
	return calls.filter((call) => call.failed).length;
}

export function glyphsOf(calls, most) {
	const seen = new Set();
	const held = [];
	for (const call of calls) {
		const glyph = glyphOf(call);
		if (seen.has(glyph)) continue;
		seen.add(glyph);
		held.push(glyph);
		if (held.length === most) break;
	}
	return held;
}
