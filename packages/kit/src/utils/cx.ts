import { extendTailwindMerge } from "tailwind-merge";
import { THEME_SCALES } from "../constants/theme-scales";

const mergedClasses = extendTailwindMerge({ extend: { theme: THEME_SCALES } });

export function cx(...parts) {
	return mergedClasses(parts.flat(Infinity).filter(Boolean).join(" "));
}

export function variants(base, groups, fallback = {}) {
	return (props: Record<string, any> = {}) => {
		const chosen = Object.keys(groups).map((name) => groups[name][props[name] ?? fallback[name]]);
		return cx(base, chosen, props.className);
	};
}
