import { createElement as h } from "react";
import type { ReactPortal } from "react";
import { createPortal } from "react-dom";
import { TOAST_DURATION_MS, TOAST_VISIBLE } from "../constants/overlays";
import { useToasterStack } from "../hooks/use-toaster-stack";
import { portalLayer } from "../utils/portal-layer";
import { ToastList } from "./toast-list";

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
	duration = TOAST_DURATION_MS,
	visibleToasts = TOAST_VISIBLE,
	...look
}: ToasterProps): ReactPortal {
	const toaster = useToasterStack({ durationMs: duration, visibleCount: visibleToasts });
	return createPortal(
		<section aria-label={REGION_LABEL} aria-live="polite" className="wg-kit-toaster-region">
			<ToastList {...look} toaster={toaster} />
		</section>,
		portalLayer(),
	);
}
