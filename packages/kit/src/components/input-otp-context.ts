import { createContext, useContext } from "react";
import type { Context } from "react";

export interface OtpSlot {
	readonly char: string | null;
	readonly isActive: boolean;
	readonly hasFakeCaret: boolean;
}

export interface OtpState {
	readonly slots: readonly OtpSlot[];
}

export const OTPInputContext: Context<OtpState | null> = createContext<OtpState | null>(null);

export function useOtp(): OtpState {
	const otp = useContext(OTPInputContext);
	if (!otp) throw new Error("an input OTP part stands outside an InputOTP");
	return otp;
}
