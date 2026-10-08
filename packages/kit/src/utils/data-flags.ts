import type { DataAttributes } from "./data-attributes";

export function dataFlagsOf(flags: Readonly<Record<string, boolean>>): DataAttributes {
	return Object.fromEntries(Object.entries(flags).map(([name, isOn]) => [`data-${name}`, isOn ? "" : undefined]));
}
