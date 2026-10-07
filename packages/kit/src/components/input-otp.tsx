import { createElement as h } from "react";
import type { InputHTMLAttributes, ReactElement, ReactNode } from "react";
import { useOtpField } from "../hooks/use-otp-field";
import { cn } from "../utils/cn";
import { OTPInputContext } from "./input-otp-context";

export { InputOTPGroup } from "./input-otp-group";
export { InputOTPSlot } from "./input-otp-slot";
export { InputOTPSeparator } from "./input-otp-separator";
export { OTPInputContext } from "./input-otp-context";
export type { InputOTPSlotProps } from "./input-otp-slot";

export interface InputOTPProps extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"value" | "defaultValue" | "onChange" | "maxLength" | "children"
> {
	readonly maxLength: number;
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onChange?: ((value: string) => void) | undefined;
	readonly onComplete?: ((value: string) => void) | undefined;
	readonly pasteTransformer?: ((pasted: string) => string) | undefined;
	readonly pattern?: string | undefined;
	readonly containerClassName?: string | undefined;
	readonly children?: ReactNode;
}

export function InputOTP({
	maxLength,
	value,
	defaultValue,
	onChange,
	onComplete,
	pasteTransformer,
	pattern,
	containerClassName,
	className,
	children,
	...rest
}: InputOTPProps): ReactElement {
	const otp = useOtpField({ value, defaultValue, onChange, onComplete, pasteTransformer, maxLength, pattern });
	return (
		<div
			data-slot="input-otp"
			data-disabled={rest.disabled ? "" : undefined}
			className={cn("wg-kit-otp", containerClassName)}
		>
			<OTPInputContext.Provider value={{ slots: otp.slots }}>{children}</OTPInputContext.Provider>
			<input
				autoComplete="one-time-code"
				inputMode="numeric"
				spellCheck={false}
				{...rest}
				{...otp.inputProps}
				className={cn("wg-kit-otp-input", className)}
			/>
		</div>
	);
}
