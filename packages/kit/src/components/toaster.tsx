import { createElement as h, useState } from "react";
import type { ReactPortal } from "react";
import { createPortal } from "react-dom";
import { TOAST_DURATION_MS, TOAST_VISIBLE } from "../constants/overlays";
import { useToastHeights } from "../hooks/use-toast-heights";
import { useDrivesToastClock } from "../hooks/use-drives-toast-clock";
import { useToasts } from "../hooks/use-toasts";
import { cn } from "../utils/cn";
import { portalLayer } from "../utils/portal-layer";
import { stackOf } from "../utils/toast-stack";
import type { TokenStyle } from "../utils/token-style";
import { ToastItem } from "./toast-item";

export type ToasterPosition =
	"top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export interface ToasterProps {
	readonly position?: ToasterPosition | undefined;
	readonly expand?: boolean | undefined;
	readonly visibleToasts?: number | undefined;
	readonly closeButton?: boolean | undefined;
	readonly richColors?: boolean | undefined;
	readonly duration?: number | undefined;
	readonly className?: string | undefined;
}

const REGION_LABEL = "Notifications";

export function Toaster({
	position = "bottom-right",
	expand = false,
	visibleToasts = TOAST_VISIBLE,
	closeButton = false,
	richColors = false,
	duration = TOAST_DURATION_MS,
	className,
}: ToasterProps): ReactPortal {
	const records = useToasts();
	const { heights, report } = useToastHeights();
	const [isHovered, setHovered] = useState(false);
	useDrivesToastClock({ defaultDurationMs: duration, isPaused: isHovered });
	const stack = stackOf(records, heights, visibleToasts);
	return createPortal(
		<section aria-label={REGION_LABEL} aria-live="polite" className="wg-kit-toaster-region">
			<ol
				data-slot="toaster"
				data-position={position}
				data-expanded={expand || isHovered}
				data-rich-colors={richColors}
				className={cn("wg-kit-toaster", className)}
				style={frontHeightStyle(stack.frontHeightPx)}
				onPointerEnter={() => setHovered(true)}
				onPointerLeave={() => setHovered(false)}
			>
				{stack.items.map(({ record, spot }) => (
					<ToastItem key={record.id} record={record} spot={spot} closeButton={closeButton} onHeight={report} />
				))}
			</ol>
		</section>,
		portalLayer(),
	);
}

function frontHeightStyle(heightPx: number): TokenStyle {
	return { "--wg-kit-toast-front-height": `${heightPx}px` };
}
