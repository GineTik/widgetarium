export function present<T>(value: T | null | undefined, what: string): T {
	if (value === null || value === undefined) throw new TypeError(`${what} is missing`);
	return value;
}

export function jsonIn(id: string): unknown {
	return JSON.parse(present(document.getElementById(id), `#${id}`).textContent ?? "");
}

export function elementAt(selector: string, scope: ParentNode = document): HTMLElement | null {
	const found = scope.querySelector(selector);
	return found instanceof HTMLElement ? found : null;
}

export function elementsAt(selector: string, scope: ParentNode = document): HTMLElement[] {
	return [...scope.querySelectorAll(selector)].filter((node): node is HTMLElement => node instanceof HTMLElement);
}

export function textOf(node: Node | null | undefined): string | undefined {
	return node?.textContent?.trim();
}

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFileMap(value: unknown): value is Readonly<Record<string, string>> {
	return isRecord(value) && Object.values(value).every((held) => typeof held === "string");
}

export interface JsonRow {
	readonly path: string;
	readonly [field: string]: unknown;
}

export function isJsonRow(value: unknown): value is JsonRow {
	return isRecord(value) && typeof value["path"] === "string";
}

export function rowsIn(value: unknown): JsonRow[] {
	return Array.isArray(value) ? value.filter(isJsonRow) : [];
}

function stackOrSelf(part: unknown): unknown {
	if (typeof part !== "object" || part === null || !("stack" in part)) return part;
	return part.stack ?? part;
}

export function recordErrors(into: string[]): void {
	const was = console.error;
	console.error = (...parts: unknown[]) => {
		into.push(parts.map((part) => String(stackOrSelf(part))).join(" "));
		was(...parts);
	};
}

export function recordWarnings(into: string[]): void {
	const was = console.warn;
	console.warn = (...parts: unknown[]) => {
		into.push(parts.map((part) => String(part)).join(" "));
		was(...parts);
	};
}

export function stackOf(failure: unknown): string {
	if (!failure) return String(failure);
	if (typeof failure !== "object" || !("stack" in failure)) return String(undefined);
	return String(failure.stack);
}
