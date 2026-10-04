import { isObject } from "@widgetarium/core/engine/is-object.js";
import { isPlainObject } from "./stream.js";
import type { Held } from "./stream.js";

export interface KeptCall {
	readonly ref: string;
	readonly name: string;
	readonly input: Held;
	readonly output: string;
	readonly answered: boolean;
	readonly failed: boolean;
	readonly at: number;
	readonly answeredAt?: number;
}

export interface KeptTurn {
	readonly role: "user" | "agent";
	readonly text: string;
	readonly calls: KeptCall[];
}

const OUTPUT_KEPT = 2000;
const TRANSCRIPT_KEPT_BYTES = 262144;

// TRADE-OFF: the oldest turns go rather than the longest, because a conversation read back out of order reads as somebody else's
export function turnsToKeep(turns: unknown): KeptTurn[] {
	let kept = withOldestAnswersEmptied((Array.isArray(turns) ? turns : []).map(turnToKeep));
	while (kept.length > 1 && JSON.stringify(kept).length > TRANSCRIPT_KEPT_BYTES) kept = kept.slice(1);
	return kept;
}

export function sessionToKeep(held: unknown): string | null {
	return typeof held === "string" && held !== "" ? held : null;
}

const wordsIn = (held: unknown): string => (typeof held === "string" ? held : "");
const momentIn = (held: unknown): number => (typeof held === "number" && Number.isFinite(held) ? held : 0);

function callToKeep(given: unknown): KeptCall {
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

function turnToKeep(given: unknown): KeptTurn {
	const turn = isObject(given) ? given : {};
	const calls = turn["calls"];
	return {
		role: turn["role"] === "user" ? "user" : "agent",
		text: wordsIn(turn["text"]),
		calls: Array.isArray(calls) ? calls.map(callToKeep) : [],
	};
}

function withOldestAnswersEmptied(turns: KeptTurn[]): KeptTurn[] {
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
