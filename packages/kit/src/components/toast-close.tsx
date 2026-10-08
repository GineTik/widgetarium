import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { TOAST_QUEUE } from "../utils/toast-queue";
import type { ToastId } from "../utils/toast-queue";
import { IconButton } from "./icon-button";

export interface ToastCloseProps {
	readonly id: ToastId;
}

const CLOSE_LABEL = "Close";

export function ToastClose({ id }: ToastCloseProps): ReactElement {
	return (
		<IconButton
			variant="ghost"
			size="s"
			label={CLOSE_LABEL}
			className="wg-kit-toast-close"
			onClick={() => TOAST_QUEUE.dismiss(id)}
		>
			<Icon name="x" />
		</IconButton>
	);
}
