type KitProp =
	| "variant"
	| "size"
	| "tone"
	| "block"
	| "selected"
	| "pressable"
	| "mode"
	| "surface"
	| "lift"
	| "shape"
	| "lines"
	| "asChild"
	| "className"
	| "children";

export type DomProps<P> = Omit<P, KitProp>;

export function domPropsOf<P extends object>(props: P & Partial<Record<KitProp, unknown>>): DomProps<P> {
	const {
		variant,
		size,
		tone,
		block,
		selected,
		pressable,
		mode,
		surface,
		lift,
		shape,
		lines,
		asChild,
		className,
		children,
		...rest
	} = props;
	return rest;
}
