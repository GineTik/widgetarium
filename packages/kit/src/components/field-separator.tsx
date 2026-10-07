import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export function FieldSeparator({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement {
	return (
		<div
			data-slot="field-separator"
			data-content={children ? "" : undefined}
			{...rest}
			className={cn("wg-kit-form-separator", className)}
		>
			{children ? <span className="wg-kit-form-separator-text">{children}</span> : null}
		</div>
	);
}
