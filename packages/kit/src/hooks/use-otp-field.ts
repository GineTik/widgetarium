import { useState } from "react";
import type { ChangeEvent, ClipboardEvent, FocusEvent } from "react";
import type { OtpSlot } from "../components/input-otp-context";
import { useControllableState } from "./use-controllable-state";

export interface OtpFieldAsk {
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onChange?: ((value: string) => void) | undefined;
	readonly onComplete?: ((value: string) => void) | undefined;
	readonly pasteTransformer?: ((pasted: string) => string) | undefined;
	readonly maxLength: number;
	readonly pattern?: string | undefined;
}

export interface OtpInputProps {
	readonly value: string;
	readonly maxLength: number;
	readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	readonly onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
	readonly onFocus: (event: FocusEvent<HTMLInputElement>) => void;
	readonly onBlur: () => void;
}

export interface OtpField {
	readonly slots: readonly OtpSlot[];
	readonly inputProps: OtpInputProps;
}

export function useOtpField(ask: OtpFieldAsk): OtpField {
	const { maxLength, pattern } = ask;
	const [value, setValue] = useControllableState({
		prop: ask.value,
		defaultProp: ask.defaultValue ?? "",
		onChange: ask.onChange,
	});
	const [isFocused, setFocused] = useState(false);
	const accept = (typed: string): void => {
		const next = typed.slice(0, maxLength);
		if (!fitsPattern(next, pattern)) return;
		setValue(next);
		if (next.length === maxLength && next !== value) ask.onComplete?.(next);
	};
	const activeAt = Math.min(value.length, maxLength - 1);
	return {
		slots: Array.from({ length: maxLength }, (_, at) => slotOf(value[at] ?? null, isFocused && at === activeAt)),
		inputProps: {
			value,
			maxLength,
			onChange: (event) => accept(event.currentTarget.value),
			onPaste: (event) => {
				if (!ask.pasteTransformer) return;
				event.preventDefault();
				accept(ask.pasteTransformer(event.clipboardData.getData("text/plain")));
			},
			onFocus: (event) => {
				setFocused(true);
				event.currentTarget.setSelectionRange(value.length, value.length);
			},
			onBlur: () => setFocused(false),
		},
	};
}

function fitsPattern(typed: string, pattern: string | undefined): boolean {
	return typed === "" || pattern === undefined || new RegExp(pattern).test(typed);
}

function slotOf(char: string | null, isActive: boolean): OtpSlot {
	return { char, isActive, hasFakeCaret: isActive && char === null };
}
