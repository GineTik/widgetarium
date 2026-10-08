import type { Dispatch } from "react";
import { isFocusable } from "./dom-nodes";
import { errorsIn } from "./form-state";
import type { FormAction, FormErrors, FormParse, FormValues } from "./form-state";

export interface SubmitAsk<V extends FormValues, T> {
	readonly parsed: () => FormParse<T>;
	readonly dispatch: Dispatch<FormAction<V>>;
	readonly elements: ReadonlyMap<string, Element>;
}

export interface SubmitAnswers<T> {
	readonly onValid: (data: T) => unknown;
	readonly onInvalid?: ((errors: FormErrors) => unknown) | undefined;
}

export async function submitParsed<V extends FormValues, T>(
	{ parsed, dispatch, elements }: SubmitAsk<V, T>,
	{ onValid, onInvalid }: SubmitAnswers<T>,
): Promise<void> {
	dispatch({ type: "submit" });
	const result = parsed();
	if (!result.success) return rejectInvalid(errorsIn(result), elements, onInvalid);
	dispatch({ type: "settle", isSubmitting: true });
	try {
		await onValid(result.data);
	} finally {
		dispatch({ type: "settle", isSubmitting: false });
	}
}

async function rejectInvalid(
	errors: FormErrors,
	elements: ReadonlyMap<string, Element>,
	onInvalid: ((errors: FormErrors) => unknown) | undefined,
): Promise<void> {
	focusFirstInvalid(elements, Object.keys(errors));
	await onInvalid?.(errors);
}

function focusFirstInvalid(elements: ReadonlyMap<string, Element>, invalid: readonly string[]): void {
	const first = [...elements].find(([name]) => invalid.includes(name))?.[1] ?? null;
	if (isFocusable(first)) first.focus();
}
