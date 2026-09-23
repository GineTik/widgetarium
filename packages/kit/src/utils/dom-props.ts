import type { LooseProps } from "../types";

const KIT_PROPS = ["variant", "size", "tone", "block", "selected", "pressable", "mode", "surface", "lift"];

export function domPropsOf({ asChild, className, children, ...rest }: LooseProps) {
	for (const name of KIT_PROPS) delete rest[name];
	return rest;
}
