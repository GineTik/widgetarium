import { createElement as h, useId } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useRegistersPanel } from "../hooks/use-registers-panel";
import { PANEL_ID } from "../hooks/use-resizable-group";
import { cn } from "../utils/cn";
import { WHOLE, percentOf } from "../utils/resizable";
import type { PanelSize } from "../utils/resizable";
import { useResizable } from "./resizable-context";

export interface ResizablePanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "id"> {
	readonly id?: string | undefined;
	readonly defaultSize?: PanelSize | undefined;
	readonly minSize?: PanelSize | undefined;
	readonly maxSize?: PanelSize | undefined;
}

export function ResizablePanel({
	id,
	defaultSize,
	minSize,
	maxSize,
	className,
	style,
	...rest
}: ResizablePanelProps): ReactElement {
	const group = useResizable();
	const ownId = useId();
	const panelId = id ?? ownId;
	const asked = { defaultSize: percentOf(defaultSize), min: percentOf(minSize) ?? 0, max: percentOf(maxSize) ?? WHOLE };
	useRegistersPanel(group, panelId, asked);
	const size = group.sizes[panelId] ?? asked.defaultSize;
	return (
		<div
			data-slot="resizable-panel"
			{...rest}
			id={panelId}
			{...{ [PANEL_ID]: panelId }}
			data-size={size === undefined ? undefined : size.toFixed(1)}
			className={cn("wg-kit-resizable-panel", className)}
			style={{ ...style, flex: size === undefined ? "1 1 0px" : `${size} 1 0px` }}
		/>
	);
}
