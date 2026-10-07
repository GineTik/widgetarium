import { createElement as h } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactElement } from "react";
import { useCarouselTrack } from "../hooks/use-carousel-track";
import { useDragScroll } from "../hooks/use-drag-scroll";
import type { CarouselApi, CarouselOptions, CarouselOrientation } from "../utils/carousel";
import { cn } from "../utils/cn";
import { CarouselContext } from "./carousel-context";
import type { CarouselState } from "./carousel-context";
import { useDirection } from "./direction-context";

export { CarouselContent } from "./carousel-content";
export { CarouselItem } from "./carousel-item";
export { CarouselNext } from "./carousel-next";
export { CarouselPrevious } from "./carousel-previous";
export { useCarousel } from "./carousel-context";

export interface CarouselProps extends HTMLAttributes<HTMLDivElement> {
	readonly orientation?: CarouselOrientation | undefined;
	readonly opts?: CarouselOptions | undefined;
	readonly setApi?: ((api: CarouselApi) => void) | undefined;
}

export function Carousel({
	orientation = "horizontal",
	opts = {},
	setApi,
	className,
	...rest
}: CarouselProps): ReactElement {
	const { viewportRef, api, view } = useCarouselTrack({ orientation, opts, setApi });
	const drag = useDragScroll(api, orientation);
	const isMoving = view.count > 1;
	const carousel: CarouselState = {
		api,
		viewportRef,
		orientation,
		drag,
		canScrollPrev: isMoving && (Boolean(opts.loop) || view.selected > 0),
		canScrollNext: isMoving && (Boolean(opts.loop) || view.selected < view.count - 1),
		scrollPrev: api.scrollPrev,
		scrollNext: api.scrollNext,
	};
	const isRtl = useDirection() === "rtl";
	return (
		<CarouselContext.Provider value={carousel}>
			<div
				role="region"
				aria-roledescription="carousel"
				data-slot="carousel"
				data-orientation={orientation}
				{...rest}
				className={cn("wg-kit-carousel", orientation === "vertical" && "is-vertical", className)}
				onKeyDownCapture={(event) => {
					rest.onKeyDownCapture?.(event);
					stepsByKey(event, carousel, isRtl);
				}}
			/>
		</CarouselContext.Provider>
	);
}

function stepsByKey(event: KeyboardEvent, carousel: CarouselState, isRtl: boolean): void {
	const [back, forth] = stepKeysOf(carousel.orientation, isRtl);
	if (event.key !== back && event.key !== forth) return;
	event.preventDefault();
	if (event.key === back) carousel.scrollPrev();
	else carousel.scrollNext();
}

function stepKeysOf(orientation: CarouselOrientation, isRtl: boolean): readonly [string, string] {
	if (orientation === "vertical") return ["ArrowUp", "ArrowDown"];
	if (isRtl) return ["ArrowRight", "ArrowLeft"];
	return ["ArrowLeft", "ArrowRight"];
}
