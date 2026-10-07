import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { variants } from "../utils/cn";
import type { ClassOf } from "../utils/cn";
import { renderedChildren } from "../utils/render-prop";
import { Slot } from "./slot";

export { MarkerContent, MarkerIcon } from "./marker-parts";

export type MarkerVariant = "default" | "border" | "separator";

export interface MarkerProps extends HTMLAttributes<HTMLDivElement> {
	readonly variant?: MarkerVariant | undefined;
	readonly asChild?: boolean | undefined;
	readonly render?: ReactElement | undefined;
}

const MARKER_VARIANTS = {
	variant: { default: "", border: "is-border", separator: "is-separator" },
} as const;

export const markerVariants: ClassOf<typeof MARKER_VARIANTS> = variants("wg-kit-marker", MARKER_VARIANTS, {
	variant: "default",
});

export function Marker({
	variant = "default",
	asChild = false,
	render,
	className,
	children,
	...rest
}: MarkerProps): ReactElement {
	const Comp = asChild || render !== undefined ? Slot : "div";
	return (
		<Comp data-slot="marker" data-variant={variant} {...rest} className={markerVariants({ variant, className })}>
			{renderedChildren(render, children)}
		</Comp>
	);
}
