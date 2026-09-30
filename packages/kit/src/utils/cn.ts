import { extendTailwindMerge } from "tailwind-merge";
import type { ClassNameValue } from "tailwind-merge";
import { THEME_SCALES } from "../constants/theme-scales";

export type { ClassNameValue };

export type VariantGroups = Readonly<Record<string, Readonly<Record<string, string>>>>;

export type VariantFallback<G extends VariantGroups> = { readonly [K in keyof G]?: keyof G[K] & string };

export type VariantChoice<G extends VariantGroups> = {
	readonly [K in keyof G]?: (keyof G[K] & string) | boolean | null | undefined;
} & { readonly className?: ClassNameValue };

export type ClassOf<G extends VariantGroups> = (props?: VariantChoice<G>) => string;

const mergedClasses = extendTailwindMerge({ extend: { theme: THEME_SCALES } });

export function cn(...parts: ClassNameValue[]): string {
	return mergedClasses(...parts);
}

export function variants<G extends VariantGroups>(
	base: ClassNameValue,
	groups: G,
	fallback: VariantFallback<G> = {},
): ClassOf<G> {
	return (props = {}) => cn(base, chosenClasses(groups, props, fallback), props.className);
}

function chosenClasses(
	groups: VariantGroups,
	said: Readonly<Record<string, unknown>>,
	fallback: Readonly<Record<string, unknown>>,
): (string | undefined)[] {
	return Object.entries(groups).map(([name, words]) => words[String(said[name] ?? fallback[name])]);
}
