import { useReducer, useRef } from "react";
import type { Dispatch } from "react";
import { isFocusable } from "../utils/dom-nodes";
import {
	fieldErrorsOf,
	fieldWriteOf,
	formReducer,
	isDirtyAgainst,
	isErrorShown,
	isFieldDirty,
	storeOf,
	withField,
} from "../utils/form-state";
import type {
	FieldErrorEntry,
	FormAction,
	FormErrors,
	FormMode,
	FormParse,
	FormSchema,
	FormStore,
	FormValues,
} from "../utils/form-state";
import { warnOnce } from "../utils/surface";

export interface CheckedFormAsk<V extends FormValues, T> {
	readonly defaultValues: V;
	readonly schema: FormSchema<T>;
	readonly mode?: FormMode | undefined;
}

export interface UncheckedFormAsk<V extends FormValues> {
	readonly defaultValues: V;
	readonly schema?: undefined;
	readonly mode?: FormMode | undefined;
}

export type FormAsk<V extends FormValues, T> = CheckedFormAsk<V, T> | UncheckedFormAsk<V>;

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

type ValuesParser<V, T> = (values: V) => FormParse<T>;

interface ParseCache<V, T> {
	readonly values: V;
	readonly schema: unknown;
	readonly parsed: FormParse<T>;
}

interface SubmitAsk<V extends FormValues, T> {
	readonly parsed: () => FormParse<T>;
	readonly dispatch: Dispatch<FormAction<V>>;
	readonly elements: ReadonlyMap<string, Element>;
}

interface FormParts<V extends FormValues> {
	readonly store: FormStore<V>;
	readonly dispatch: Dispatch<FormAction<V>>;
	readonly errors: FormErrors;
	readonly elements: Map<string, Element>;
}

export function useForm<V extends FormValues, T>(ask: CheckedFormAsk<V, T>): UseFormReturn<V, T>;
export function useForm<V extends FormValues>(ask: UncheckedFormAsk<V>): UseFormReturn<V, V>;
export function useForm<V extends FormValues, T>(ask: FormAsk<V, T>): UseFormReturn<V, T | V> {
	const parse: ValuesParser<V, T | V> = ask.schema ? parserOf(ask.schema) : acceptValues;
	return useFormParsedBy(ask, parse);
}

function useFormParsedBy<V extends FormValues, T>(
	ask: FormAsk<V, unknown>,
	parse: ValuesParser<V, T>,
): UseFormReturn<V, T> {
	const mode = ask.mode ?? "onSubmit";
	const [store, dispatch] = useReducer(formReducer<V>, ask.defaultValues, storeOf);
	const elements = useRef(new Map<string, Element>());
	const parsed = useParseCache(parse, ask.schema, store.values);
	const errors = store.submitCount > 0 || mode !== "onSubmit" ? shownErrorsOf(errorsIn(parsed()), mode, store) : {};
	const parts: FormParts<V> = { store, dispatch, errors, elements: elements.current };
	const getFieldState = (name: string): FieldState => fieldStateOf(parts, name);
	const register = <K extends keyof V & string>(name: K): FieldBinding<V, K> => bindingOf(parts, name);
	const form: UseFormReturn<V, T> = {
		get control() {
			return form;
		},
		formState: {
			errors,
			get isValid() {
				return parsed().success;
			},
			isDirty: isDirtyAgainst(store.values, store.defaults),
			isSubmitted: store.submitCount > 0,
			isSubmitting: store.isSubmitting,
			submitCount: store.submitCount,
		},
		field: (name) => ({ field: register(name), fieldState: getFieldState(name) }),
		register,
		getFieldState,
		getValues: () => store.values,
		watch: (name) => store.values[name],
		setValue: (name, value) => writeField(dispatch, name, value),
		handleSubmit: createSubmitter({ parsed, dispatch, elements: elements.current }),
		reset: (values) => dispatch({ type: "reset", values }),
	};
	return form;
}

function useParseCache<V, T>(parse: ValuesParser<V, T>, schema: unknown, values: V): () => FormParse<T> {
	const cache = useRef<ParseCache<V, T> | null>(null);
	return () => {
		const held = cache.current;
		if (held && held.values === values && held.schema === schema) return held.parsed;
		const parsed = parse(values);
		cache.current = { values, schema, parsed };
		return parsed;
	};
}

function parserOf<V, T>(schema: FormSchema<T>): ValuesParser<V, T> {
	return (values) => schema.safeParse(values);
}

function acceptValues<V>(values: V): FormParse<V> {
	return { success: true, data: values };
}

function errorsIn<T>(parsed: FormParse<T>): FormErrors {
	return parsed.success ? {} : fieldErrorsOf(parsed.error.issues);
}

function shownErrorsOf<V extends FormValues>(errors: FormErrors, mode: FormMode, store: FormStore<V>): FormErrors {
	return Object.fromEntries(Object.entries(errors).filter(([name]) => isErrorShown({ name, mode, store })));
}

function fieldStateOf<V extends FormValues>({ store, errors }: FormParts<V>, name: string): FieldState {
	return {
		invalid: errors[name] !== undefined,
		error: errors[name],
		isTouched: store.touched.has(name),
		isDirty: isFieldDirty(store.values, store.defaults, name),
	};
}

function bindingOf<V extends FormValues, K extends keyof V & string>(parts: FormParts<V>, name: K): FieldBinding<V, K> {
	const { store, dispatch, elements } = parts;
	return {
		name,
		value: store.values[name],
		onChange: (change) => {
			const write = fieldWriteOf(change, store.values[name]);
			if (!write) return warnOnce(`the field ${name} refused a change that is not of its default's kind`);
			writeField(dispatch, name, write.value);
		},
		onBlur: () => dispatch({ type: "touch", name }),
		ref: (element) => {
			if (element) elements.set(name, element);
		},
	};
}

function writeField<V extends FormValues, K extends keyof V & string>(
	dispatch: Dispatch<FormAction<V>>,
	name: K,
	value: V[K],
): void {
	dispatch({ type: "change", name, write: (values) => withField(values, name, value) });
}

function createSubmitter<V extends FormValues, T>({
	parsed,
	dispatch,
	elements,
}: SubmitAsk<V, T>): UseFormReturn<V, T>["handleSubmit"] {
	return (onValid, onInvalid) => async (event) => {
		event?.preventDefault?.();
		dispatch({ type: "submit" });
		const result = parsed();
		if (!result.success) return rejectInvalid(errorsIn(result), elements, onInvalid);
		dispatch({ type: "settle", isSubmitting: true });
		try {
			await onValid(result.data);
		} finally {
			dispatch({ type: "settle", isSubmitting: false });
		}
	};
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
