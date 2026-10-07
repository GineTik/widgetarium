import { createElement as h } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { dataAttributesOf } from "../utils/data-attributes";
import type { DataAttributes } from "../utils/data-attributes";
import { OVERLAY_LAYER_ATTRIBUTE } from "../hooks/use-overlay-layer";

export type ContainerWidth = 640 | 800 | 1040 | 1280 | "full";

export interface ContainerProps extends DataAttributes {
	readonly width?: ContainerWidth | undefined;
	readonly className?: string | undefined;
	readonly style?: CSSProperties | undefined;
	readonly children?: ReactNode;
}

export function Container({ width = 1040, className, style, children, ...rest }: ContainerProps): ReactElement {
	const widthSaid = width === "full" ? "none" : `${width}px`;
	return h(
		"div",
		{ className: "wg-kit-container-frame", [OVERLAY_LAYER_ATTRIBUTE]: "" },
		h(
			"div",
			{
				...dataAttributesOf(rest),
				className: cn("wg-kit-container", className),
				style: { ...style, "--wg-kit-container-width": widthSaid },
				"data-width": width,
			},
			children,
		),
	);
}
