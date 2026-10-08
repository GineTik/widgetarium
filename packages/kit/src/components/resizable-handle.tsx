import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useHandleDrag } from "../hooks/use-handle-drag";
import type { HandleDrag, HandleNeighbours } from "../hooks/use-handle-drag";
import { useHandleNeighbours } from "../hooks/use-handle-neighbours";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { useResizable } from "./resizable-context";
import type { ResizableState } from "./resizable-context";

export interface ResizableHandleProps extends HTMLAttributes<HTMLDivElement> {
	readonly withHandle?: boolean | undefined;
	readonly disabled?: boolean | undefined;
}

type SeparatorValue = Pick<
	HTMLAttributes<HTMLDivElement>,
	"aria-controls" | "aria-valuenow" | "aria-valuemin" | "aria-valuemax"
>;

const GRIP_PX = 12;

const NO_SEPARATOR_VALUE: SeparatorValue = {
	"aria-controls": undefined,
	"aria-valuenow": undefined,
	"aria-valuemin": undefined,
	"aria-valuemax": undefined,
};

export function ResizableHandle({
	withHandle = false,
	disabled = false,
	className,
	...rest
}: ResizableHandleProps): ReactElement {
	const group = useResizable();
	const { handleRef, neighbours } = useHandleNeighbours();
	const drag = useHandleDrag(group);
	return (
		<div
			ref={handleRef}
			role="separator"
			tabIndex={disabled ? undefined : 0}
			data-slot="resizable-handle"
			{...rest}
			aria-orientation={group.orientation === "vertical" ? "horizontal" : "vertical"}
			{...separatorValueOf(group, neighbours)}
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

function separatorValueOf(group: ResizableState, neighbours: HandleNeighbours | null): SeparatorValue {
	if (!neighbours) return NO_SEPARATOR_VALUE;
	const limits = group.limitsOf(neighbours.before);
	return {
		"aria-controls": neighbours.before,
		"aria-valuenow": Math.round(group.sizes[neighbours.before] ?? 0),
		"aria-valuemin": limits.min,
		"aria-valuemax": limits.max,
	};
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
