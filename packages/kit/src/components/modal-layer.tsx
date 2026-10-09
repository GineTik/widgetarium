import { Fragment, createElement as h } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import type { StyleProp } from "../utils/token-style";
import { createPortal } from "react-dom";
import { useModalLayer } from "../hooks/use-modal-layer";
import { cn } from "../utils/cn";
import { composeRefs } from "./slot";
import { useDialog } from "./dialog-context";
import { ModalIdsContext } from "./modal-ids-context";
import { dataStateOf } from "./popover-context";

export type ModalKind = "dialog" | "sheet" | "drawer" | "alert-dialog";

export type ModalSide = "top" | "right" | "bottom" | "left";

export interface ModalDismissal {
	readonly byScrim: boolean;
	readonly byEscape: boolean;
}

export const DISMISSED_ANYWHERE: ModalDismissal = { byScrim: true, byEscape: true };

export const DISMISSED_BY_ESCAPE: ModalDismissal = { byScrim: false, byEscape: true };

export interface ModalLayerProps extends HTMLAttributes<HTMLDivElement> {
	readonly kind: ModalKind;
	readonly side?: ModalSide | undefined;
	readonly dismissal: ModalDismissal;
	readonly scrimStyle?: StyleProp | undefined;
	readonly panelRef?: Ref<HTMLDivElement> | undefined;
}

export function ModalLayer({
	kind,
	side,
	dismissal,
	scrimStyle,
	panelRef: outerRef,
	...rest
}: ModalLayerProps): ReactElement {
	const { isOpen, setOpen } = useDialog();
	const modal = useModalLayer(isOpen, () => dismissal.byEscape && setOpen(false));
	const state = dataStateOf(isOpen);
	const layer = (
		<ModalIdsContext.Provider value={modal.ids}>
			<div className={cn("wg-kit-modal-layer", modal.isScoped && "is-scoped")} data-state={state}>
				<div
					className="wg-kit-modal-scrim"
					data-slot={`${kind}-overlay`}
					data-state={state}
					style={scrimStyle}
					onPointerDown={(event) => dismissal.byScrim && event.target === event.currentTarget && setOpen(false)}
				/>
				<div
					role={kind === "alert-dialog" ? "alertdialog" : "dialog"}
					aria-modal="true"
					aria-labelledby={modal.ids.titleId}
					aria-describedby={modal.ids.descriptionId}
					tabIndex={-1}
					{...rest}
					ref={composeRefs(modal.panelRef, outerRef)}
					data-slot={`${kind}-content`}
					data-state={state}
					data-side={side}
					className={cn("wg-kit-modal", `is-${kind}`, rest.className)}
				/>
			</div>
		</ModalIdsContext.Provider>
	);
	return (
		<>
			<span ref={modal.anchorRef} hidden />
			{modal.isMounted && modal.layer ? createPortal(layer, modal.layer) : null}
		</>
	);
}
