import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ToasterStack } from "../hooks/use-toaster-stack";
import { cn } from "../utils/cn";
import type { TokenStyle } from "../utils/token-style";
import { ToastItem } from "./toast-item";
import type { ToasterPosition, ToasterProps } from "./toaster";

export interface ToastListProps extends Omit<ToasterProps, "duration" | "visibleToasts"> {
	readonly toaster: ToasterStack;
}

type ToasterLook = Pick<ToasterProps, "position" | "expand" | "richColors">;

interface ToasterMarks {
	readonly "data-position": ToasterPosition;
	readonly "data-expanded": boolean;
	readonly "data-rich-colors": boolean;
}

interface HoverHandlers {
	readonly onPointerEnter: () => void;
	readonly onPointerLeave: () => void;
}

export function ToastList({ closeButton = false, className, toaster, ...look }: ToastListProps): ReactElement {
	return (
		<ol
			data-slot="toaster"
			{...toasterMarks(look, toaster.isHovered)}
			className={cn("wg-kit-toaster", className)}
			style={frontHeightStyle(toaster.stack.frontHeightPx)}
			{...hoverHandlersOf(toaster.setHovered)}
		>
			{toaster.stack.items.map(({ record, spot }) => (
				<ToastItem
					key={record.id}
					record={record}
					spot={spot}
					closeButton={closeButton}
					onHeight={toaster.reportHeight}
				/>
			))}
		</ol>
	);
}

function toasterMarks(
	{ position = "bottom-right", expand = false, richColors = false }: ToasterLook,
	isHovered: boolean,
): ToasterMarks {
	return { "data-position": position, "data-expanded": expand || isHovered, "data-rich-colors": richColors };
}

function hoverHandlersOf(setHovered: (isHovered: boolean) => void): HoverHandlers {
	return { onPointerEnter: () => setHovered(true), onPointerLeave: () => setHovered(false) };
}

function frontHeightStyle(heightPx: number): TokenStyle {
	return { "--wg-kit-toast-front-height": `${heightPx}px` };
}
