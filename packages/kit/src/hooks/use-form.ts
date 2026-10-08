import { useReducer, useRef } from "react";
import type { Dispatch } from "react";
import {
	errorsIn,
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
import { submitParsed } from "../utils/form-submit";
import type { SubmitAsk } from "../utils/form-submit";
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

type FieldAccess<V extends FormValues, T> = Pick<UseFormReturn<V, T>, "field" | "register" | "getFieldState">;

type ValueAccess<V extends FormValues, T> = Pick<UseFormReturn<V, T>, "getValues" | "watch" | "setValue" | "reset">;

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
	const [store, dispatch] = useReducer(formReducer<V>, ask.defaultValues, storeOf);
	const elements = useRef(new Map<string, Element>());
	const parsed = useParseCache(parse, ask.schema, store.values);
	const errors = visibleErrorsOf(parsed, ask.mode ?? "onSubmit", store);
	return formOf({ store, dispatch, errors, elements: elements.current }, parsed);
}

function formOf<V extends FormValues, T>(parts: FormParts<V>, parsed: () => FormParse<T>): UseFormReturn<V, T> {
	const form: UseFormReturn<V, T> = {
		get control() {
			return form;
		},
		formState: formStateOf(parts, parsed),
		...fieldAccessOf(parts),
		...valueAccessOf(parts),
		handleSubmit: createSubmitter({ parsed, dispatch: parts.dispatch, elements: parts.elements }),
	};
	return form;
}

function formStateOf<V extends FormValues, T>({ store, errors }: FormParts<V>, parsed: () => FormParse<T>): FormState {
	return {
		errors,
		get isValid() {
			return parsed().success;
		},
		isDirty: isDirtyAgainst(store.values, store.defaults),
		isSubmitted: store.submitCount > 0,
		isSubmitting: store.isSubmitting,
		submitCount: store.submitCount,
	};
}

function fieldAccessOf<V extends FormValues, T>(parts: FormParts<V>): FieldAccess<V, T> {
	const getFieldState = (name: string): FieldState => fieldStateOf(parts, name);
	const register = <K extends keyof V & string>(name: K): FieldBinding<V, K> => bindingOf(parts, name);
	return { field: (name) => ({ field: register(name), fieldState: getFieldState(name) }), register, getFieldState };
}

function valueAccessOf<V extends FormValues, T>({ store, dispatch }: FormParts<V>): ValueAccess<V, T> {
	return {
		getValues: () => store.values,
		watch: (name) => store.values[name],
		setValue: (name, value) => writeField(dispatch, name, value),
		reset: (values) => dispatch({ type: "reset", values }),
	};
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

function visibleErrorsOf<V extends FormValues, T>(
	parsed: () => FormParse<T>,
	mode: FormMode,
	store: FormStore<V>,
): FormErrors {
	if (store.submitCount === 0 && mode === "onSubmit") return {};
	const errors = errorsIn(parsed());
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
		onChange: (change) => changeField(parts, name, change),
		onBlur: () => dispatch({ type: "touch", name }),
		ref: (element) => {
			if (element) elements.set(name, element);
		},
	};
}

function changeField<V extends FormValues, K extends keyof V & string>(
	{ store, dispatch }: FormParts<V>,
	name: K,
	change: unknown,
): void {
	const write = fieldWriteOf(change, store.values[name]);
	if (!write) return warnOnce(`the field ${name} refused a change that is not of its default's kind`);
	writeField(dispatch, name, write.value);
}

function writeField<V extends FormValues, K extends keyof V & string>(
	dispatch: Dispatch<FormAction<V>>,
	name: K,
	value: V[K],
): void {
	dispatch({ type: "change", name, write: (values) => withField(values, name, value) });
}

function createSubmitter<V extends FormValues, T>(ask: SubmitAsk<V, T>): UseFormReturn<V, T>["handleSubmit"] {
	return (onValid, onInvalid) => async (event) => {
		event?.preventDefault?.();
		await submitParsed(ask, { onValid, onInvalid });
	};
}
