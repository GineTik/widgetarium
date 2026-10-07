import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { Button } from "./button";
import type { ButtonProps } from "./button";
import { useCarousel } from "./carousel-context";

export interface CarouselStepProps extends ButtonProps {
	readonly way: "previous" | "next";
}

const STEP_ICON_PX = 18;

export function CarouselStep({
	way,
	variant = "outline",
	size = "icon",
	className,
	children,
	...rest
}: CarouselStepProps): ReactElement {
	const carousel = useCarousel();
	const isNext = way === "next";
	return (
		<Button
			data-slot={`carousel-${way}`}
			variant={variant}
			size={size}
			{...rest}
			disabled={!(isNext ? carousel.canScrollNext : carousel.canScrollPrev) || rest.disabled}
			className={cn("wg-kit-carousel-step", `is-${way}`, className)}
			onClick={(event: MouseEvent<HTMLButtonElement>) => {
				rest.onClick?.(event);
				if (isNext) carousel.scrollNext();
				else carousel.scrollPrev();
			}}
		>
			{children ?? <Icon name={isNext ? "arrow-right" : "arrow-left"} size={STEP_ICON_PX} />}
			<span className="wg-kit-sr-only">{isNext ? "Next slide" : "Previous slide"}</span>
		</Button>
	);
}
