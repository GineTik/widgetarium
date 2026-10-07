import { createContext, useContext } from "react";
import type { Context, RefObject } from "react";
import type { DragScroll } from "../hooks/use-drag-scroll";
import type { CarouselApi, CarouselOrientation } from "../utils/carousel";

export interface CarouselState {
	readonly api: CarouselApi;
	readonly viewportRef: RefObject<HTMLDivElement | null>;
	readonly orientation: CarouselOrientation;
	readonly drag: DragScroll;
	readonly canScrollPrev: boolean;
	readonly canScrollNext: boolean;
	readonly scrollPrev: () => void;
	readonly scrollNext: () => void;
}

export const CarouselContext: Context<CarouselState | null> = createContext<CarouselState | null>(null);

export function useCarousel(): CarouselState {
	const carousel = useContext(CarouselContext);
	if (!carousel) throw new Error("useCarousel must be used within a <Carousel />");
	return carousel;
}
