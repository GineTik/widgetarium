import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useHandleDrag } from "../hooks/use-handle-drag";
import type { HandleDrag } from "../hooks/use-handle-drag";
import { useHandleNeighbours } from "../hooks/use-handle-neighbours";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { useResizable } from "./resizable-context";

export interface ResizableHandleProps extends HTMLAttributes<HTMLDivElement> {
	readonly withHandle?: boolean | undefined;
	readonly disabled?: boolean | undefined;
}

const GRIP_PX = 12;

export function ResizableHandle({
	withHandle = false,
	disabled = false,
	className,
	...rest
}: ResizableHandleProps): ReactElement {
	const group = useResizable();
	const { handleRef, neighbours } = useHandleNeighbours();
	const drag = useHandleDrag(group);
	const before = neighbours ? group.limitsOf(neighbours.before) : null;
	return (
		<div
			ref={handleRef}
			role="separator"
			tabIndex={disabled ? undefined : 0}
			data-slot="resizable-handle"
			{...rest}
			aria-orientation={group.orientation === "vertical" ? "horizontal" : "vertical"}
			aria-controls={neighbours?.before}
			aria-valuenow={neighbours ? Math.round(group.sizes[neighbours.before] ?? 0) : undefined}
			aria-valuemin={before?.min}
			aria-valuemax={before?.max}
			aria-disabled={disabled || undefined}
			data-panel-group-direction={group.orientation}
			className={cn("wg-kit-resizable-handle", className)}
			{...(disabled ? {} : withCallerHandlers(drag, rest))}
		>
			{withHandle ? (
				<div className="wg-kit-resizable-grip">
					<Icon name="grip-vertical" size={GRIP_PX} />
				</div>
			) : null}
		</div>
	);
}

function withCallerHandlers(drag: HandleDrag, caller: HTMLAttributes<HTMLElement>): HandleDrag {
	return {
		onPointerDown: (event) => {
			caller.onPointerDown?.(event);
			drag.onPointerDown(event);
		},
		onPointerMove: (event) => {
			caller.onPointerMove?.(event);
			drag.onPointerMove(event);
		},
		onPointerUp: (event) => {
			caller.onPointerUp?.(event);
			drag.onPointerUp(event);
		},
		onPointerCancel: (event) => {
			caller.onPointerCancel?.(event);
			drag.onPointerCancel(event);
		},
		onKeyDown: (event) => {
			caller.onKeyDown?.(event);
			drag.onKeyDown(event);
		},
	};
}
