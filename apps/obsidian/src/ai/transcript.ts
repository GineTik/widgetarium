import type { AssistantCall, AssistantTurn } from "@widgetarium/core/engine/assistant-port.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { isPlainObject } from "./stream.js";

const OUTPUT_KEPT = 2000;
const TRANSCRIPT_KEPT_BYTES = 262144;

// TRADE-OFF: the oldest turns go rather than the longest, because a conversation read back out of order reads as somebody else's
export function turnsToKeep(turns: unknown): AssistantTurn[] {
	let kept = withOldestAnswersEmptied((Array.isArray(turns) ? turns : []).map(turnToKeep));
	while (kept.length > 1 && JSON.stringify(kept).length > TRANSCRIPT_KEPT_BYTES) kept = kept.slice(1);
	return kept;
}

export function sessionToKeep(held: unknown): string | null {
	return typeof held === "string" && held !== "" ? held : null;
}

const wordsIn = (held: unknown): string => (typeof held === "string" ? held : "");
const momentIn = (held: unknown): number => (typeof held === "number" && Number.isFinite(held) ? held : 0);

function callToKeep(given: unknown): AssistantCall {
	const call = isObject(given) ? given : {};
	const input = call["input"];
	return {
		ref: wordsIn(call["ref"]),
		name: wordsIn(call["name"]),
		input: isPlainObject(input) ? input : {},
		output: wordsIn(call["output"]).slice(0, OUTPUT_KEPT),
		answered: call["answered"] === true,
		failed: call["failed"] === true,
		at: momentIn(call["at"]),
		answeredAt: momentIn(call["answeredAt"]),
	};
}

function turnToKeep(given: unknown): AssistantTurn {
	const turn = isObject(given) ? given : {};
	const calls = turn["calls"];
	return {
		role: turn["role"] === "user" ? "user" : "agent",
		text: wordsIn(turn["text"]),
		calls: Array.isArray(calls) ? calls.map(callToKeep) : [],
	};
}

function withOldestAnswersEmptied(turns: AssistantTurn[]): AssistantTurn[] {
	let over = JSON.stringify(turns).length - TRANSCRIPT_KEPT_BYTES;
	if (over <= 0) return turns;
	return turns.map((turn) => ({
		...turn,
		calls: turn.calls.map((call) => {
			if (over <= 0 || call.output === "") return call;
			over -= call.output.length;
			return { ...call, output: "" };
		}),
	}));
}
