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

interface AcceptAsk {
	readonly ask: OtpFieldAsk;
	readonly value: string;
	readonly setValue: (next: string) => void;
}

interface InputAsk {
	readonly value: string;
	readonly maxLength: number;
	readonly accept: (typed: string) => void;
	readonly setFocused: (isFocused: boolean) => void;
	readonly pasteTransformer: OtpFieldAsk["pasteTransformer"];
}

type PasteAsk = Pick<InputAsk, "accept" | "pasteTransformer">;

export function useOtpField(ask: OtpFieldAsk): OtpField {
	const [value, setValue] = useControllableState({
		prop: ask.value,
		defaultProp: ask.defaultValue ?? "",
		onChange: ask.onChange,
	});
	const [isFocused, setFocused] = useState(false);
	const accept = (typed: string): void => acceptTyped({ ask, value, setValue }, typed);
	const { maxLength, pasteTransformer } = ask;
	return {
		slots: slotsOf(value, maxLength, isFocused),
		inputProps: inputPropsOf({ value, maxLength, accept, setFocused, pasteTransformer }),
	};
}

function acceptTyped({ ask, value, setValue }: AcceptAsk, typed: string): void {
	const next = typed.slice(0, ask.maxLength);
	if (!fitsPattern(next, ask.pattern)) return;
	setValue(next);
	if (next.length === ask.maxLength && next !== value) ask.onComplete?.(next);
}

function slotsOf(value: string, maxLength: number, isFocused: boolean): OtpSlot[] {
	const activeAt = Math.min(value.length, maxLength - 1);
	return Array.from({ length: maxLength }, (_, at) => slotOf(value[at] ?? null, isFocused && at === activeAt));
}

function inputPropsOf({ value, maxLength, accept, setFocused, pasteTransformer }: InputAsk): OtpInputProps {
	return {
		value,
		maxLength,
		onChange: (event) => accept(event.currentTarget.value),
		onPaste: (event) => pasteTransformed(event, { accept, pasteTransformer }),
		onFocus: (event) => {
			setFocused(true);
			event.currentTarget.setSelectionRange(value.length, value.length);
		},
		onBlur: () => setFocused(false),
	};
}

function pasteTransformed(event: ClipboardEvent<HTMLInputElement>, { accept, pasteTransformer }: PasteAsk): void {
	if (!pasteTransformer) return;
	event.preventDefault();
	accept(pasteTransformer(event.clipboardData.getData("text/plain")));
}

function fitsPattern(typed: string, pattern: string | undefined): boolean {
	return typed === "" || pattern === undefined || new RegExp(pattern).test(typed);
}

function slotOf(char: string | null, isActive: boolean): OtpSlot {
	return { char, isActive, hasFakeCaret: isActive && char === null };
}
