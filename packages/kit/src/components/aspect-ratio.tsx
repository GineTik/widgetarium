import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import type { StyleProp } from "../utils/token-style";

export interface AspectRatioProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
	readonly ratio?: number | undefined;
	readonly style?: StyleProp | undefined;
}

export function AspectRatio({ ratio = 1, className, style, ...rest }: AspectRatioProps): ReactElement {
	return (
		<div
			data-slot="aspect-ratio"
			{...rest}
			className={cn("wg-kit-aspect", className)}
			style={{ ...style, aspectRatio: String(ratio) }}
		/>
	);
}
