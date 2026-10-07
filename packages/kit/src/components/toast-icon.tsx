import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "../icons/icon";
import type { ToastType } from "../utils/toast-queue";
import { Spinner } from "./spinner";

export interface ToastIconProps {
	readonly type: ToastType;
	readonly icon?: ReactNode;
}

const ICON_OF: Readonly<Record<ToastType, string | null>> = {
	default: null,
	success: "circle-check",
	error: "circle-x",
	warning: "triangle-alert",
	info: "info",
	loading: null,
};

const ICON_PX = 20;

export function ToastIcon({ type, icon }: ToastIconProps): ReactElement | null {
	const name = ICON_OF[type];
	if (icon === undefined && type === "loading") return <Spinner className="wg-kit-toast-icon" />;
	if (icon === undefined && name === null) return null;
	return (
		<span className="wg-kit-toast-icon">
			{name !== null && icon === undefined ? <Icon name={name} size={ICON_PX} /> : icon}
		</span>
	);
}
