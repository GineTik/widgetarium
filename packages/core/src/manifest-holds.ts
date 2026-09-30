import { isObject } from "./engine/is-object.js";
import type { MountSpec } from "./held-records.js";

export interface SlotSpec {
	readonly default?: string | undefined;
	readonly surface?: unknown;
	readonly gives?: Readonly<Record<string, unknown>> | undefined;
	readonly isVisible?: unknown;
}

export interface MountsSpec extends MountSpec {
	readonly label?: string | undefined;
	readonly hint?: string | undefined;
	readonly isVisible?: unknown;
}

type Specs<Spec> = Readonly<Record<string, Spec>>;

export function slotSpecsOf(manifest: unknown): Specs<SlotSpec> {
	return specsUnder(manifest, "slots", (held) => ({
		default: textAt(held, "default"),
		surface: held["surface"],
		gives: isObject(held["gives"]) ? held["gives"] : undefined,
		isVisible: held["isVisible"],
	}));
}

export function mountSpecsOf(manifest: unknown): Specs<MountsSpec> {
	return specsUnder(manifest, "mounts", (held) => ({
		...wasOf(held),
		label: textAt(held, "label"),
		hint: textAt(held, "hint"),
		default: held["default"],
		isVisible: held["isVisible"],
	}));
}

function specsUnder<Spec>(
	manifest: unknown,
	key: "slots" | "mounts",
	specOf: (held: Readonly<Record<string, unknown>>) => Spec,
): Specs<Spec> {
	const declared = isObject(manifest) ? manifest[key] : undefined;
	if (!isObject(declared)) return {};
	return Object.fromEntries(Object.entries(declared).map(([name, held]) => [name, specOf(isObject(held) ? held : {})]));
}

function textAt(held: Readonly<Record<string, unknown>>, key: string): string | undefined {
	const value = held[key];
	return typeof value === "string" ? value : undefined;
}

function wasOf(held: Readonly<Record<string, unknown>>): Pick<MountSpec, "was"> {
	const was = textAt(held, "was");
	return was === undefined ? {} : { was };
}
