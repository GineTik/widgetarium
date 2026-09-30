import { isObject } from "@widgetarium/core/engine/is-object.js";

export type Held = Readonly<Record<string, unknown>>;

export type Phase = "thinking" | "tools" | "writing";

export interface ToolCall {
	readonly ref: string;
	readonly name: string;
	readonly input: Held;
}

export interface ToolResult {
	readonly ref: string;
	readonly output: string;
	readonly failed: boolean;
}

export type StreamPart =
	| { readonly session: string }
	| { readonly phase: Phase }
	| { readonly spentMore: number }
	| { readonly spent: number }
	| { readonly text: string }
	| { readonly call: ToolCall }
	| { readonly result: ToolResult }
	| { readonly failure: string };

export type Emit = (part: StreamPart) => void;

export type LineReader = (line: string, emit: Emit) => void;

export interface LineSplitter {
	push(chunk: string): void;
	end(): void;
}

const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const CARRIAGE = /\r(?!\n)/g;
const SPINNER = /^[\s|/\\_.·•-]*$/;

const PHASE_OF_BLOCK: Readonly<Record<string, Phase>> = {
	thinking: "thinking",
	redacted_thinking: "thinking",
	tool_use: "tools",
	text: "writing",
};

const READERS: Readonly<Record<string, () => LineReader>> = {
	"claude-stream": createClaudeStream,
	"ollama-stream": createOllamaStream,
	text: createLooseText,
};

export function plainText(line: string): string {
	return line.replace(ANSI, "").replace(CARRIAGE, "");
}

export const isPlainObject = (held: unknown): held is Held => isObject(held) && !Array.isArray(held);

export const READER_NAMES = Object.keys(READERS);

export function readerNamed(name: string): LineReader {
	return (READERS[name] ?? createLooseText)();
}

export function createLineSplitter(onLine: (line: string) => void): LineSplitter {
	let held = "";
	return {
		push(chunk) {
			held += chunk;
			const lines = held.split("\n");
			held = lines.pop() ?? "";
			for (const line of lines) onLine(line);
		},
		end() {
			if (held !== "") onLine(held);
			held = "";
		},
	};
}

function jsonIn(line: string): Held | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith("{")) return null;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return isObject(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function objectAt(held: Held | null | undefined, key: string): Held | null {
	const inner = held?.[key];
	return isObject(inner) ? inner : null;
}

function spokenTokensIn(usage: Held | null): number | null {
	const spoken = usage?.["output_tokens"];
	return typeof spoken === "number" && Number.isFinite(spoken) ? spoken : null;
}

function partsOf(event: Held): unknown[] {
	const content = objectAt(event, "message")?.["content"];
	return Array.isArray(content) ? content : [];
}

function resultText(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter(isPlainObject)
		.map((part) => (part["type"] === "text" && typeof part["text"] === "string" ? part["text"] : null))
		.filter((text): text is string => text !== null)
		.join("\n");
}

function textDeltaIn(event: Held): string | null {
	if (event["type"] !== "stream_event") return null;
	const inner = objectAt(event, "event");
	const delta = objectAt(inner, "delta");
	if (inner?.["type"] !== "content_block_delta" || delta?.["type"] !== "text_delta") return null;
	const text = delta["text"];
	return typeof text === "string" ? text : null;
}

interface ClaudeStreamState {
	streamed: boolean;
	said: boolean;
	turned: boolean;
}

// TRADE-OFF: a block arrives whole after its own deltas, so once one delta lands the block's text is dropped rather than shown twice
function createClaudeStream(): LineReader {
	const state: ClaudeStreamState = { streamed: false, said: false, turned: false };
	return (line, emit) => {
		const event = jsonIn(line);
		if (!event) return;
		emitSignals(event, state, emit);

		const delta = textDeltaIn(event);
		if (delta !== null) {
			emitDelta(delta, state, emit);
			return;
		}
		if (event["type"] === "assistant") {
			emitAssistantParts(event, state, emit);
			return;
		}
		if (event["type"] === "user") {
			emitToolResults(event, emit);
			return;
		}
		if (event["type"] !== "result") return;
		if (event["is_error"] === true)
			emit({ failure: String(event["result"] ?? event["subtype"] ?? "the agent reported an error") });
	};
}

function emitSignals(event: Held, state: ClaudeStreamState, emit: Emit): void {
	const session = event["session_id"];
	if (typeof session === "string" && session !== "") emit({ session });

	const inner = event["type"] === "stream_event" ? objectAt(event, "event") : null;
	// TRADE-OFF: the break waits for the next word rather than landing on the boundary, because most turns of a long run speak no text at all and would each leave a blank line behind
	if (inner?.["type"] === "message_start" && state.said) state.turned = true;

	if (inner?.["type"] === "content_block_start") {
		const blockType = objectAt(inner, "content_block")?.["type"];
		const phase = typeof blockType === "string" ? PHASE_OF_BLOCK[blockType] : undefined;
		if (phase) emit({ phase });
	}
	// TRADE-OFF: each turn reports its own total, so the turns are added up rather than read as one running number
	if (inner?.["type"] === "message_delta") {
		const spoken = spokenTokensIn(objectAt(inner, "usage"));
		if (spoken !== null) emit({ spentMore: spoken });
	}
	if (event["type"] === "result") {
		const spoken = spokenTokensIn(objectAt(event, "usage"));
		if (spoken !== null) emit({ spent: spoken });
	}
}

function emitDelta(delta: string, state: ClaudeStreamState, emit: Emit): void {
	state.streamed = true;
	if (delta === "") return;
	if (state.turned) emit({ text: "\n\n" });
	state.turned = false;
	state.said = true;
	emit({ text: delta });
}

function emitAssistantParts(event: Held, state: ClaudeStreamState, emit: Emit): void {
	for (const part of partsOf(event).filter(isPlainObject)) {
		const text = part["text"];
		if (part["type"] === "text" && text && !state.streamed) {
			if (state.said) emit({ text: "\n\n" });
			state.turned = false;
			state.said = true;
			emit({ text: String(text) });
		}
		const name = part["name"];
		if (part["type"] === "tool_use" && name) {
			const input = part["input"];
			emit({
				call: { ref: String(part["id"] ?? ""), name: String(name), input: isPlainObject(input) ? input : {} },
			});
		}
	}
}

function emitToolResults(event: Held, emit: Emit): void {
	for (const part of partsOf(event).filter(isPlainObject)) {
		if (part["type"] !== "tool_result") continue;
		emit({
			result: {
				ref: String(part["tool_use_id"] ?? ""),
				output: resultText(part["content"]),
				failed: part["is_error"] === true,
			},
		});
	}
}

function createOllamaStream(): LineReader {
	return (line, emit) => {
		const event = jsonIn(line);
		if (!event) return;
		const failure = event["error"];
		if (typeof failure === "string") emit({ failure });
		const said = objectAt(event, "message")?.["content"];
		if (typeof said === "string" && said !== "") emit({ text: said });
		const spent = event["eval_count"];
		if (typeof spent === "number" && Number.isFinite(spent)) emit({ spent });
	};
}

function createLooseText(): LineReader {
	return (line, emit) => {
		const said = plainText(line);
		if (said.trim() === "" || SPINNER.test(said)) return;
		emit({ text: `${said}\n` });
	};
}
