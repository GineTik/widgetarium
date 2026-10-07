import type { ToolStage } from "../constants/chat";
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

export function readChatParts<P extends ChatPartLike>(parts: readonly P[]): readonly ChatPartRead[] {
	const results = toolResultsOf(parts);
	return parts.flatMap((part, at) => {
		const read = isRecord(part) ? partRead(part, String(at), results) : null;
		return read ? [read] : [];
	});
}

function partRead(fields: Fields, at: string, results: Results): ChatPartRead | null {
	const type = stringIn(fields, "type") ?? "";
	if (type === "text") return wordsRead("text", fields, at);
	if (type === "reasoning" || type === "thinking") return wordsRead("reasoning", fields, at);
	if (type === "tool-call") return tanstackToolRead(fields, at, results);
	if (type === "dynamic-tool") return aiSdkToolRead(fields, at, stringIn(fields, "toolName") ?? "tool");
	if (type.startsWith("tool-") && type !== "tool-result") return aiSdkToolRead(fields, at, type.slice("tool-".length));
	if (type === "file") return fileRead(fields, at);
	if (TANSTACK_MEDIA.includes(type)) return mediaRead(fields, at, type);
	if (type === "source-url" || type === "source-document") return sourceRead(fields, at);
	return null;
}

function wordsRead(kind: "text" | "reasoning", fields: Fields, key: string): ChatPartRead {
	const text = stringIn(fields, "text") ?? stringIn(fields, "content") ?? "";
	return { kind, key, text, isStreaming: fields["state"] === "streaming" };
}

function aiSdkToolRead(fields: Fields, at: string, name: string): ToolPartRead {
	const stage = AI_SDK_STAGES[stringIn(fields, "state") ?? ""] ?? "running";
	return {
		kind: "tool",
		key: stringIn(fields, "toolCallId") ?? at,
		name,
		stage,
		input: fields["input"],
		output: fields["output"],
		error: stringIn(fields, "errorText"),
	};
}

function tanstackToolRead(fields: Fields, at: string, results: Results): ToolPartRead {
	const id = stringIn(fields, "id");
	const result = id === null ? undefined : results.get(id);
	return {
		kind: "tool",
		key: id ?? at,
		name: stringIn(fields, "name") ?? "tool",
		stage: tanstackStageOf(fields, result),
		input: fields["input"] ?? parsedArguments(stringIn(fields, "arguments")),
		output: fields["output"] ?? result?.["content"],
		error: result ? stringIn(result, "error") : null,
	};
}

function tanstackStageOf(call: Fields, result: Fields | undefined): ToolStage {
	if (result) return TANSTACK_RESULT_STAGES[stringIn(result, "state") ?? ""] ?? "running";
	const approval = call["approval"];
	if (isRecord(approval) && approval["approved"] === false) return "denied";
	if (call["state"] === "approval-requested") return "approval";
	return call["output"] === undefined ? "running" : "done";
}

function fileRead(fields: Fields, key: string): FilePartRead {
	return {
		kind: "file",
		key,
		url: stringIn(fields, "url"),
		mediaType: stringIn(fields, "mediaType") ?? "",
		title: stringIn(fields, "filename"),
		isSource: false,
	};
}

function mediaRead(fields: Fields, key: string, type: string): FilePartRead {
	const source = isRecord(fields["source"]) ? fields["source"] : {};
	const mediaType = stringIn(source, "mimeType") ?? type;
	return { kind: "file", key, url: sourceUrlOf(source, mediaType), mediaType, title: null, isSource: false };
}

function sourceRead(fields: Fields, at: string): FilePartRead {
	const url = stringIn(fields, "url");
	return {
		kind: "file",
		key: stringIn(fields, "sourceId") ?? at,
		url,
		mediaType: stringIn(fields, "mediaType") ?? "",
		title: stringIn(fields, "title") ?? stringIn(fields, "filename") ?? url,
		isSource: true,
	};
}

function sourceUrlOf(source: Fields, mediaType: string): string | null {
	const value = stringIn(source, "value");
	if (value === null) return null;
	if (source["type"] === "url") return value;
	if (source["type"] === "data") return `data:${mediaType};base64,${value}`;
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

function parsedArguments(text: string | null): unknown {
	if (text === null || text.trim() === "") return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function stringIn(fields: Fields, name: string): string | null {
	const value = fields[name];
	return typeof value === "string" ? value : null;
}
