import { createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import { useScrollThumb } from "../hooks/use-scroll-thumb";
import { cn } from "../utils/cn";
import type { ScrollAxis } from "../utils/scroll-thumb";

export interface ScrollThumbBarProps {
	readonly axis: ScrollAxis;
	readonly viewportRef: RefObject<HTMLElement | null>;
}

export function ScrollThumbBar({ axis, viewportRef }: ScrollThumbBarProps): ReactElement {
	const { barRef, thumb, isDragging, onThumbDown, onThumbMove, onThumbUp } = useScrollThumb(viewportRef, axis);
	const isVertical = axis === "vertical";
	return (
		<div
			ref={barRef}
			data-slot="scroll-area-scrollbar"
			data-orientation={axis}
			data-state={thumb.isNeeded ? "visible" : "hidden"}
			data-dragging={isDragging ? "" : undefined}
			aria-hidden="true"
			className={cn("wg-kit-scrollbar", isVertical ? "is-vertical" : "is-horizontal")}
		>
			<div
				data-slot="scroll-area-thumb"
				className="wg-kit-scroll-thumb"
				style={{
					[isVertical ? "height" : "width"]: `${thumb.size}px`,
					transform: isVertical ? `translateY(${thumb.offset}px)` : `translateX(${thumb.offset}px)`,
				}}
				onPointerDown={onThumbDown}
				onPointerMove={onThumbMove}
				onPointerUp={onThumbUp}
				onPointerCancel={onThumbUp}
			/>
		</div>
	);
}
