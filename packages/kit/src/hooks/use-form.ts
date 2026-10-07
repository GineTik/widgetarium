import { useRef, useState } from "react";
import { isFocusable } from "../utils/dom-nodes";
import {
	isDirtyAgainst,
	isErrorShown,
	isFieldDirty,
	issuesByField,
	schemaErrorsOf,
	valueOfChange,
	valuesAs,
} from "../utils/form-state";
import type { FieldErrorEntry, FormErrors, FormMode, FormSchema, FormValues } from "../utils/form-state";
import { useFormMarks } from "./use-form-marks";
import type { FormMarks } from "./use-form-marks";

export interface FormAsk<V extends FormValues, T> {
	readonly defaultValues: V;
	readonly schema?: FormSchema<T> | undefined;
	readonly mode?: FormMode | undefined;
}

export interface FieldState {
	readonly invalid: boolean;
	readonly error?: FieldErrorEntry | undefined;
	readonly isTouched: boolean;
	readonly isDirty: boolean;
}

export interface FieldBinding<V, K extends keyof V> {
	readonly name: K;
	readonly value: V[K];
	readonly onChange: (change: unknown) => void;
	readonly onBlur: () => void;
	readonly ref: (element: Element | null) => void;
}

export interface FormState {
	readonly errors: FormErrors;
	readonly isValid: boolean;
	readonly isDirty: boolean;
	readonly isSubmitted: boolean;
	readonly isSubmitting: boolean;
	readonly submitCount: number;
}

export interface SubmitEventLike {
	readonly preventDefault?: (() => void) | undefined;
}

export type SubmitHandler = (event?: SubmitEventLike) => Promise<void>;

export interface UseFormReturn<V extends FormValues, T> {
	readonly control: UseFormReturn<V, T>;
	readonly formState: FormState;
	readonly field: <K extends keyof V & string>(name: K) => { field: FieldBinding<V, K>; fieldState: FieldState };
	readonly register: <K extends keyof V & string>(name: K) => FieldBinding<V, K>;
	readonly getFieldState: (name: keyof V & string) => FieldState;
	readonly getValues: () => V;
	readonly watch: <K extends keyof V & string>(name: K) => V[K];
	readonly setValue: <K extends keyof V & string>(name: K, value: V[K]) => void;
	readonly handleSubmit: (onValid: (data: T) => unknown, onInvalid?: (errors: FormErrors) => unknown) => SubmitHandler;
	readonly reset: (values?: V) => void;
}

interface SubmitAsk<T> {
	readonly schema: FormSchema<T> | undefined;
	readonly values: FormValues;
	readonly marks: FormMarks;
	readonly elements: ReadonlyMap<string, Element>;
	readonly setSubmitting: (isSubmitting: boolean) => void;
}

export function useForm<V extends FormValues, T = V>(ask: FormAsk<V, T>): UseFormReturn<V, T> {
	const { defaultValues, schema, mode = "onSubmit" } = ask;
	const [defaults, setDefaults] = useState<FormValues>(defaultValues);
	const [values, setValues] = useState<FormValues>(defaultValues);
	const [isSubmitting, setSubmitting] = useState(false);
	const marks = useFormMarks();
	const elements = useRef(new Map<string, Element>());
	const allErrors = schemaErrorsOf(schema, values);
	const errors = filterShownErrors(allErrors, mode, marks);
	const getFieldState = (name: string): FieldState => ({
		invalid: errors[name] !== undefined,
		error: errors[name],
		isTouched: marks.touched.has(name),
		isDirty: isFieldDirty(values, defaults, name),
	});
	const change = (name: string, value: unknown): void => {
		setValues((held) => ({ ...held, [name]: value }));
		marks.markChanged(name);
	};
	const register = <K extends keyof V & string>(name: K): FieldBinding<V, K> => ({
		name,
		value: valuesAs<V>(values)[name],
		onChange: (next) => change(name, valueOfChange(next)),
		onBlur: () => marks.markTouched(name),
		ref: (element) => {
			if (element) elements.current.set(name, element);
		},
	});
	const form: UseFormReturn<V, T> = {
		get control() {
			return form;
		},
		formState: {
			errors,
			isValid: Object.keys(allErrors).length === 0,
			isDirty: isDirtyAgainst(values, defaults),
			isSubmitted: marks.submitCount > 0,
			isSubmitting,
			submitCount: marks.submitCount,
		},
		field: (name) => ({ field: register(name), fieldState: getFieldState(name) }),
		register,
		getFieldState,
		getValues: () => valuesAs<V>(values),
		watch: (name) => valuesAs<V>(values)[name],
		setValue: change,
		handleSubmit: createSubmitter({ schema, values, marks, elements: elements.current, setSubmitting }),
		reset: (next) => {
			if (next) setDefaults(next);
			setValues(next ?? defaults);
			marks.clear();
		},
	};
	return form;
}

function filterShownErrors(errors: FormErrors, mode: FormMode, marks: FormMarks): FormErrors {
	return Object.fromEntries(Object.entries(errors).filter(([name]) => isErrorShown({ name, mode, ...marks })));
}

function createSubmitter<T>(ask: SubmitAsk<T>): UseFormReturn<FormValues, T>["handleSubmit"] {
	return (onValid, onInvalid) => async (event) => {
		event?.preventDefault?.();
		ask.marks.markSubmitted();
		const parsed = ask.schema
			? ask.schema.safeParse(ask.values)
			: { success: true as const, data: valuesAs<T>(ask.values) };
		if (!parsed.success) {
			const errors = issuesByField(parsed.error.issues);
			focusFirstInvalid(ask.elements, Object.keys(errors));
			await onInvalid?.(errors);
			return;
		}
		ask.setSubmitting(true);
		try {
			await onValid(parsed.data);
		} finally {
			ask.setSubmitting(false);
		}
	};
}

function focusFirstInvalid(elements: ReadonlyMap<string, Element>, invalid: readonly string[]): void {
	const first = [...elements].find(([name]) => invalid.includes(name))?.[1] ?? null;
	if (isFocusable(first)) first.focus();
}
