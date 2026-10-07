import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useResizableGroup } from "../hooks/use-resizable-group";
import { cn } from "../utils/cn";
import { ResizableContext } from "./resizable-context";
import type { ResizableOrientation } from "./resizable-context";

export interface ResizablePanelGroupProps extends HTMLAttributes<HTMLDivElement> {
	readonly direction?: ResizableOrientation | undefined;
	readonly orientation?: ResizableOrientation | undefined;
	readonly onLayout?: ((sizes: number[]) => void) | undefined;
}

export function ResizablePanelGroup({
	direction,
	orientation,
	onLayout,
	className,
	...rest
}: ResizablePanelGroupProps): ReactElement {
	const laid = orientation ?? direction ?? "horizontal";
	const { groupRef, group, isDragging } = useResizableGroup({ orientation: laid, onLayout });
	return (
		<ResizableContext.Provider value={group}>
			<div
				data-slot="resizable-panel-group"
				{...rest}
				ref={groupRef}
				aria-orientation={laid}
				data-panel-group-direction={laid}
				data-dragging={isDragging ? "" : undefined}
				className={cn("wg-kit-resizable", laid === "vertical" && "is-vertical", className)}
			/>
		</ResizableContext.Provider>
	);
}
