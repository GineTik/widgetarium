import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export function CarouselItem({ className, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement {
	return (
		<div
			role="group"
			aria-roledescription="slide"
			data-slot="carousel-item"
			{...rest}
			className={cn("wg-kit-carousel-item", className)}
		/>
	);
}
