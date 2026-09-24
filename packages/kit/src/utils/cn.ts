import { extendTailwindMerge } from "tailwind-merge";
import { THEME_SCALES } from "../constants/theme-scales";

const mergedClasses = extendTailwindMerge({ extend: { theme: THEME_SCALES } });

export function cn(...parts) {
	return mergedClasses(parts.flat(Infinity).filter(Boolean).join(" "));
}

export function variants(base, groups, fallback = {}) {
	return (props: Record<string, unknown> = {}) => {
		const chosen = Object.keys(groups).map((name) => groups[name][String(props[name] ?? fallback[name])]);
		return cn(base, chosen, props.className);
	};
}
