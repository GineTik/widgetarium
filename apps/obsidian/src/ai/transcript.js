import { isPlainObject } from "./stream.js";

const OUTPUT_KEPT = 2000;
const TRANSCRIPT_KEPT_BYTES = 262144;

const wordsIn = (held) => (typeof held === "string" ? held : "");
const momentIn = (held) => (Number.isFinite(held) ? held : 0);

function keptCall(call) {
	return {
		ref: wordsIn(call?.ref),
		name: wordsIn(call?.name),
		input: isPlainObject(call?.input) ? call.input : {},
		output: wordsIn(call?.output).slice(0, OUTPUT_KEPT),
		answered: call?.answered === true,
		failed: call?.failed === true,
		at: momentIn(call?.at),
		answeredAt: momentIn(call?.answeredAt),
	};
}

function keptTurn(turn) {
	return {
		role: turn?.role === "user" ? "user" : "agent",
		text: wordsIn(turn?.text),
		calls: Array.isArray(turn?.calls) ? turn.calls.map(keptCall) : [],
	};
}

// TRADE-OFF: the oldest turns go rather than the longest, because a conversation read back out of order reads as somebody else's
export function keptTurns(turns) {
	let kept = (Array.isArray(turns) ? turns : []).map(keptTurn);
	while (kept.length > 1 && JSON.stringify(kept).length > TRANSCRIPT_KEPT_BYTES) kept = kept.slice(1);
	return kept;
}

export function keptSession(held) {
	return typeof held === "string" && held !== "" ? held : null;
}
