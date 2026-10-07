import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

const DASH_PX = 16;

export function InputOTPSeparator({ className, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement {
	return (
		<div role="separator" data-slot="input-otp-separator" {...rest} className={cn("wg-kit-otp-separator", className)}>
			<Icon name="minus" size={DASH_PX} />
		</div>
	);
}
