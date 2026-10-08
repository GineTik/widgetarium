import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface ToastTextProps {
	readonly title: ReactNode;
	readonly description?: ReactNode;
}

export function ToastText({ title, description }: ToastTextProps): ReactElement {
	return (
		<div className="wg-kit-toast-text">
			<div className="wg-kit-toast-title">{title}</div>
			{description ? <div className="wg-kit-toast-description">{description}</div> : null}
		</div>
	);
}
