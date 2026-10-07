import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { useCarousel } from "./carousel-context";

export function CarouselContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement {
	const { viewportRef, orientation, drag } = useCarousel();
	return (
		<div
			ref={viewportRef}
			data-slot="carousel-content"
			data-dragging={drag.isDragging ? "" : undefined}
			className={cn("wg-kit-carousel-viewport", orientation === "vertical" && "is-vertical")}
			onPointerDown={drag.onPointerDown}
			onPointerMove={drag.onPointerMove}
			onPointerUp={drag.onPointerUp}
			onPointerCancel={drag.onPointerUp}
			onClickCapture={drag.onClickCapture}
		>
			<div {...rest} className={cn("wg-kit-carousel-track", className)} />
		</div>
	);
}
