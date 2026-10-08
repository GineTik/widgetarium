import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { useOtpState } from "./input-otp-context";

export interface InputOTPSlotProps extends HTMLAttributes<HTMLDivElement> {
	readonly index: number;
}

export function InputOTPSlot({ index, className, ...rest }: InputOTPSlotProps): ReactElement {
	const slot = useOtpState().slots[index];
	return (
		<div
			data-slot="input-otp-slot"
			data-active={slot?.isActive ? "true" : undefined}
			data-filled={slot?.char ? "" : undefined}
			{...rest}
			className={cn("wg-kit-otp-slot", className)}
		>
			{slot?.char}
			{slot?.hasFakeCaret ? <span className="wg-kit-otp-caret" /> : null}
		</div>
	);
}
