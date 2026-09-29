import type { TaskRow } from "./types";

export const RADIO = "radio";
export const PEOPLE = "people";

export function valuesFor(rows: TaskRow[], prop: string): string[] {
	const seen = new Set<string>();
	for (const row of rows) {
		const held = row.props?.[prop];
		for (const value of Array.isArray(held) ? held : [held]) {
			if (value !== undefined && value !== null && value !== "") seen.add(String(value));
		}
	}
	return [...seen].sort();
}
