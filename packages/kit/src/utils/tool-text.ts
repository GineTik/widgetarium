import { TOOL_CIRCULAR_MARK, TOOL_TEXT_CUT, TOOL_TEXT_MAX_CHARS } from "../constants/chat";

type JsonReplacer = (this: unknown, key: string, value: unknown) => unknown;

export function toolTextOf(value: unknown): string {
	const text = typeof value === "string" ? value : jsonTextOf(value);
	if (text.length <= TOOL_TEXT_MAX_CHARS) return text;
	const cutAt = isHighSurrogate(text.charCodeAt(TOOL_TEXT_MAX_CHARS - 1))
		? TOOL_TEXT_MAX_CHARS - 1
		: TOOL_TEXT_MAX_CHARS;
	return `${text.slice(0, cutAt)}${TOOL_TEXT_CUT}`;
}

function isHighSurrogate(code: number): boolean {
	return code >= 0xd800 && code <= 0xdbff;
}

function jsonTextOf(value: unknown): string {
	try {
		return JSON.stringify(value, createSafeReplacer(), 2) ?? String(value);
	} catch {
		return String(value);
	}
}

function createSafeReplacer(): JsonReplacer {
	const ancestors: unknown[] = [];
	return function safeValueOf(this: unknown, _key: string, value: unknown): unknown {
		if (typeof value === "bigint") return `${value}n`;
		if (typeof value !== "object" || value === null) return value;
		while (ancestors.length > 0 && ancestors.at(-1) !== this) ancestors.pop();
		if (ancestors.includes(value)) return TOOL_CIRCULAR_MARK;
		ancestors.push(value);
		return value;
	};
}
