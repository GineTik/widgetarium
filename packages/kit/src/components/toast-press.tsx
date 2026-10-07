import { createElement as h } from "react";
import type { ReactElement } from "react";
import { TOAST_QUEUE } from "../utils/toast-queue";
import type { ToastButton, ToastId } from "../utils/toast-queue";
import { Button } from "./button";

export interface ToastPressProps {
	readonly button: ToastButton;
	readonly id: ToastId;
	readonly variant: "ghost" | "default";
}

export function ToastPress({ button, id, variant }: ToastPressProps): ReactElement {
	return (
		<Button
			size="sm"
			variant={variant}
			className="wg-kit-toast-button"
			onClick={(event) => {
				button.onClick(event);
				if (!event.defaultPrevented) TOAST_QUEUE.dismiss(id);
			}}
		>
			{button.label}
		</Button>
	);
}
