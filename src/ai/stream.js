const ANSI = /\[[0-9;?]*[ -/]*[@-~]/g;
const CARRIAGE = /\r(?!\n)/g;
const SPINNER = /^[\s|/\\_.·•-]*$/;

export function plainText(line) {
	return line.replace(ANSI, "").replace(CARRIAGE, "");
}

function jsonIn(line) {
	const trimmed = line.trim();
	if (!trimmed.startsWith("{")) return null;
	try {
		return JSON.parse(trimmed);
	} catch {
		return null;
	}
}

export const isPlainObject = (held) => typeof held === "object" && held !== null && !Array.isArray(held);

const PHASE_OF_BLOCK = { thinking: "thinking", redacted_thinking: "thinking", tool_use: "tools", text: "writing" };

const spokenTokensIn = (usage) => (Number.isFinite(usage?.output_tokens) ? usage.output_tokens : null);

const partsOf = (event) => (Array.isArray(event.message?.content) ? event.message.content : []);

function resultText(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((part) => part?.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("\n");
}

function textDeltaIn(event) {
	if (event.type !== "stream_event") return null;
	const inner = event.event;
	if (inner?.type !== "content_block_delta" || inner.delta?.type !== "text_delta") return null;
	return typeof inner.delta.text === "string" ? inner.delta.text : null;
}

// TRADE-OFF: a block arrives whole after its own deltas, so once one delta lands the block's text is dropped rather than shown twice
function createClaudeStream() {
	let streamed = false;
	let said = false;
	let turned = false;
	return (line, emit) => {
		const event = jsonIn(line);
		if (!event) return;
		if (typeof event.session_id === "string" && event.session_id !== "") emit({ session: event.session_id });

		// TRADE-OFF: the break waits for the next word rather than landing on the boundary, because most turns of a long run speak no text at all and would each leave a blank line behind
		if (event.type === "stream_event" && event.event?.type === "message_start" && said) turned = true;

		const inner = event.type === "stream_event" ? event.event : null;
		if (inner?.type === "content_block_start") {
			const phase = PHASE_OF_BLOCK[inner.content_block?.type];
			if (phase) emit({ phase });
		}
		// TRADE-OFF: each turn reports its own total, so the turns are added up rather than read as one running number
		if (inner?.type === "message_delta") {
			const spoken = spokenTokensIn(inner.usage);
			if (spoken !== null) emit({ spentMore: spoken });
		}
		if (event.type === "result") {
			const spoken = spokenTokensIn(event.usage);
			if (spoken !== null) emit({ spent: spoken });
		}

		const delta = textDeltaIn(event);
		if (delta !== null) {
			streamed = true;
			if (delta !== "") {
				if (turned) emit({ text: "\n\n" });
				turned = false;
				said = true;
				emit({ text: delta });
			}
			return;
		}

		if (event.type === "assistant") {
			for (const part of partsOf(event)) {
				if (part?.type === "text" && part.text && !streamed) {
					if (said) emit({ text: "\n\n" });
					turned = false;
					said = true;
					emit({ text: part.text });
				}
				if (part?.type === "tool_use" && part.name)
					emit({
						call: { ref: String(part.id ?? ""), name: part.name, input: isPlainObject(part.input) ? part.input : {} },
					});
			}
			return;
		}

		if (event.type === "user") {
			for (const part of partsOf(event)) {
				if (part?.type !== "tool_result") continue;
				emit({
					result: {
						ref: String(part.tool_use_id ?? ""),
						output: resultText(part.content),
						failed: part.is_error === true,
					},
				});
			}
			return;
		}

		if (event.type !== "result") return;
		if (event.is_error === true)
			emit({ failure: String(event.result ?? event.subtype ?? "the agent reported an error") });
	};
}

function createOllamaStream() {
	return (line, emit) => {
		const event = jsonIn(line);
		if (!event) return;
		if (typeof event.error === "string") emit({ failure: event.error });
		const said = event.message?.content;
		if (typeof said === "string" && said !== "") emit({ text: said });
		if (Number.isFinite(event.eval_count)) emit({ spent: event.eval_count });
	};
}

function createLooseText() {
	return (line, emit) => {
		const said = plainText(line);
		if (said.trim() === "" || SPINNER.test(said)) return;
		emit({ text: `${said}\n` });
	};
}

const READERS = {
	"claude-stream": createClaudeStream,
	"ollama-stream": createOllamaStream,
	text: createLooseText,
};

export const READER_NAMES = Object.keys(READERS);

export function readerNamed(name) {
	return (READERS[name] ?? READERS.text)();
}

export function createLineSplitter(onLine) {
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
