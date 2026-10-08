import type { ToolStage } from "../constants/chat";
import { dataUrlOf, fileUrlOf, linkUrlOf, mediaTypeOf } from "./chat-urls";
import { isRecord } from "./is-record";

export interface ChatPartLike {
	readonly type: string;
}

export type ChatPartRead =
	| { readonly kind: "text"; readonly key: string; readonly text: string; readonly isStreaming: boolean }
	| { readonly kind: "reasoning"; readonly key: string; readonly text: string; readonly isStreaming: boolean }
	| ToolPartRead
	| FilePartRead;

export interface ToolPartRead {
	readonly kind: "tool";
	readonly key: string;
	readonly name: string;
	readonly stage: ToolStage;
	readonly input: unknown;
	readonly isInputRaw: boolean;
	readonly output: unknown;
	readonly error: string | null;
}

export interface FilePartRead {
	readonly kind: "file";
	readonly key: string;
	readonly url: string | null;
	readonly mediaType: string;
	readonly title: string | null;
	readonly isSource: boolean;
}

type Fields = Readonly<Record<string, unknown>>;

type Results = ReadonlyMap<string, Fields>;

const AI_SDK_STAGES: Readonly<Record<string, ToolStage>> = {
	"input-streaming": "running",
	"input-available": "running",
	"approval-requested": "approval",
	"approval-responded": "running",
	"output-available": "done",
	"output-error": "error",
	"output-denied": "denied",
};

const TANSTACK_RESULT_STAGES: Readonly<Record<string, ToolStage>> = {
	streaming: "running",
	complete: "done",
	error: "error",
};

const TANSTACK_MEDIA = ["image", "audio", "video", "document"];

const DRAWN_ELSEWHERE = ["step-start", "tool-result"];

const DATA_PART_PREFIX = "data-";

const AI_SDK_TOOL_PREFIX = "tool-";

const WARNED_TYPES = new Set<string>();

interface PartAt {
	readonly fields: Fields;
	readonly at: string;
	readonly results: Results;
	readonly type: string;
}

type PartReader = (part: PartAt) => ChatPartRead;

const PART_READERS: ReadonlyMap<string, PartReader> = new Map<string, PartReader>([
	["text", ({ fields, at }) => readWords("text", fields, at)],
	["reasoning", ({ fields, at }) => readWords("reasoning", fields, at)],
	["thinking", ({ fields, at }) => readWords("reasoning", fields, at)],
	["tool-call", ({ fields, at, results }) => readTanstackTool(fields, at, results)],
	["dynamic-tool", ({ fields, at }) => readAiSdkTool(fields, at, stringIn(fields, "toolName") ?? "tool")],
	["file", ({ fields, at }) => readFile(fields, at)],
	...TANSTACK_MEDIA.map((media): [string, PartReader] => [
		media,
		({ fields, at, type }) => readMedia(fields, at, type),
	]),
	["source-url", ({ fields, at }) => readSource(fields, at)],
	["source-document", ({ fields, at }) => readSource(fields, at)],
]);

interface ParsedArguments {
	readonly value: unknown;
	readonly isRaw: boolean;
}

export function readChatParts<P extends ChatPartLike>(parts: readonly P[]): readonly ChatPartRead[] {
	const results = toolResultsOf(parts);
	return parts.flatMap((part, at) => {
		const read = isRecord(part) ? readPart(part, String(at), results) : null;
		return read ? [read] : [];
	});
}

function readPart(fields: Fields, at: string, results: Results): ChatPartRead | null {
	const type = stringIn(fields, "type") ?? "";
	if (isDrawnElsewhere(type)) return null;
	const reader = PART_READERS.get(type);
	if (reader) return reader({ fields, at, results, type });
	if (isAiSdkToolPart(type, fields)) return readAiSdkTool(fields, at, type.slice(AI_SDK_TOOL_PREFIX.length));
	warnUnknownPartOnce(type);
	return null;
}

function isAiSdkToolPart(type: string, fields: Fields): boolean {
	if (!type.startsWith(AI_SDK_TOOL_PREFIX)) return false;
	return stringIn(fields, "toolCallId") !== null;
}

function isDrawnElsewhere(type: string): boolean {
	return DRAWN_ELSEWHERE.includes(type) || type.startsWith(DATA_PART_PREFIX);
}

function warnUnknownPartOnce(type: string): void {
	if (WARNED_TYPES.has(type)) return;
	WARNED_TYPES.add(type);
	console.warn(`readChatParts: a part of type "${type}" is not one the kit reads, so it draws nothing`);
}

function readWords(kind: "text" | "reasoning", fields: Fields, key: string): ChatPartRead {
	const text = stringIn(fields, "text") ?? stringIn(fields, "content") ?? "";
	return { kind, key, text, isStreaming: fields["state"] === "streaming" };
}

function readAiSdkTool(fields: Fields, at: string, name: string): ToolPartRead {
	const stage = AI_SDK_STAGES[stringIn(fields, "state") ?? ""] ?? "running";
	return {
		kind: "tool",
		key: stringIn(fields, "toolCallId") ?? at,
		name,
		stage,
		input: fields["input"],
		isInputRaw: false,
		output: fields["output"],
		error: stringIn(fields, "errorText"),
	};
}

function readTanstackTool(fields: Fields, at: string, results: Results): ToolPartRead {
	const id = stringIn(fields, "id");
	const result = id === null ? undefined : results.get(id);
	const input = argumentsOf(fields);
	return {
		kind: "tool",
		key: id ?? at,
		name: stringIn(fields, "name") ?? "tool",
		stage: tanstackStageOf(fields, result),
		input: input.value,
		isInputRaw: input.isRaw,
		output: fields["output"] ?? result?.["content"],
		error: result ? stringIn(result, "error") : null,
	};
}

function tanstackStageOf(call: Fields, result: Fields | undefined): ToolStage {
	if (result) return resultStageOf(result);
	const approval = call["approval"];
	if (isRecord(approval) && approval["approved"] === false) return "denied";
	if (call["state"] === "approval-requested") return "approval";
	if (call["output"] === undefined) return "running";
	return "done";
}

function resultStageOf(result: Fields): ToolStage {
	return TANSTACK_RESULT_STAGES[stringIn(result, "state") ?? ""] ?? "running";
}

function readFile(fields: Fields, key: string): FilePartRead {
	return {
		kind: "file",
		key,
		url: fileUrlOf(stringIn(fields, "url")),
		mediaType: mediaTypeOf(stringIn(fields, "mediaType")) ?? "",
		title: stringIn(fields, "filename"),
		isSource: false,
	};
}

function readMedia(fields: Fields, key: string, type: string): FilePartRead {
	const source = sourceOf(fields);
	const mediaType = mediaTypeOf(stringIn(source, "mimeType"));
	return {
		kind: "file",
		key,
		url: sourceUrlOf(source, mediaType),
		mediaType: mediaType ?? type,
		title: null,
		isSource: false,
	};
}

function readSource(fields: Fields, at: string): FilePartRead {
	const url = linkUrlOf(stringIn(fields, "url"));
	return {
		kind: "file",
		key: stringIn(fields, "sourceId") ?? at,
		url,
		mediaType: mediaTypeOf(stringIn(fields, "mediaType")) ?? "",
		title: stringIn(fields, "title") ?? stringIn(fields, "filename") ?? url,
		isSource: true,
	};
}

function sourceOf(fields: Fields): Fields {
	const source = fields["source"];
	if (isRecord(source)) return source;
	return {};
}

function sourceUrlOf(source: Fields, mediaType: string | null): string | null {
	const value = stringIn(source, "value");
	if (value === null) return null;
	if (source["type"] === "url") return fileUrlOf(value);
	if (source["type"] === "data") return dataUrlOf(mediaType, value);
	return null;
}

function toolResultsOf(parts: readonly ChatPartLike[]): Results {
	const results = new Map<string, Fields>();
	for (const part of parts) {
		if (!isRecord(part) || part["type"] !== "tool-result") continue;
		const id = stringIn(part, "toolCallId");
		if (id !== null) results.set(id, part);
	}
	return results;
}

function argumentsOf(fields: Fields): ParsedArguments {
	if (fields["input"] !== undefined) return { value: fields["input"], isRaw: false };
	const text = stringIn(fields, "arguments");
	if (text === null || text.trim() === "") return { value: undefined, isRaw: false };
	try {
		return { value: JSON.parse(text), isRaw: false };
	} catch {
		return { value: text, isRaw: true };
	}
}

function stringIn(fields: Fields, name: string): string | null {
	const value = fields[name];
	return typeof value === "string" ? value : null;
}
