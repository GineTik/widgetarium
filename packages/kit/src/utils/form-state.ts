import { isRecord } from "./is-record";

export type FormValues = Readonly<Record<string, unknown>>;

export interface FormIssue {
	readonly path: readonly PropertyKey[];
	readonly message: string;
}

export type FormParse<T> =
	| { readonly success: true; readonly data: T }
	| { readonly success: false; readonly error: { readonly issues: readonly FormIssue[] } };

export interface FormSchema<T> {
	safeParse(input: unknown): FormParse<T>;
}

export interface FieldErrorEntry {
	readonly message: string;
	readonly type?: string | undefined;
}

export type FormErrors = Readonly<Partial<Record<string, FieldErrorEntry>>>;

export type FormMode = "onSubmit" | "onChange" | "onBlur" | "onTouched";

export interface FormStore<V extends FormValues> {
	readonly values: V;
	readonly defaults: V;
	readonly touched: ReadonlySet<string>;
	readonly changed: ReadonlySet<string>;
	readonly submitCount: number;
	readonly isSubmitting: boolean;
}

export type FormAction<V extends FormValues> =
	| { readonly type: "change"; readonly name: string; readonly write: (values: V) => V }
	| { readonly type: "touch"; readonly name: string }
	| { readonly type: "submit" }
	| { readonly type: "settle"; readonly isSubmitting: boolean }
	| { readonly type: "reset"; readonly values?: V | undefined };

export interface ShownAsk<V extends FormValues> {
	readonly name: string;
	readonly mode: FormMode;
	readonly store: FormStore<V>;
}

export type FieldWrite<X> = { readonly value: X } | null;

export const ROOT_ERROR = "root";

const NOTHING: ReadonlySet<string> = new Set();

export function storeOf<V extends FormValues>(defaults: V): FormStore<V> {
	return { values: defaults, defaults, touched: NOTHING, changed: NOTHING, submitCount: 0, isSubmitting: false };
}

export function formReducer<V extends FormValues>(store: FormStore<V>, action: FormAction<V>): FormStore<V> {
	switch (action.type) {
		case "change":
			return { ...store, values: action.write(store.values), changed: withName(store.changed, action.name) };
		case "touch":
			return { ...store, touched: withName(store.touched, action.name) };
		case "submit":
			return { ...store, submitCount: store.submitCount + 1 };
		case "settle":
			return { ...store, isSubmitting: action.isSubmitting };
		case "reset":
			return storeOf(action.values ?? store.defaults);
	}
}

export function withField<V extends FormValues, K extends keyof V>(values: V, name: K, value: V[K]): V {
	return { ...values, [name]: value };
}

export function fieldErrorsOf(issues: readonly FormIssue[]): FormErrors {
	const errors: Record<string, FieldErrorEntry> = {};
	for (const issue of issues) {
		const name = issue.path.length === 0 ? ROOT_ERROR : issue.path.map(String).join(".");
		if (!Object.hasOwn(errors, name)) errors[name] = { message: issue.message, type: "schema" };
	}
	return errors;
}

export function errorsIn<T>(parsed: FormParse<T>): FormErrors {
	if (parsed.success) return {};
	return fieldErrorsOf(parsed.error.issues);
}

export function isErrorShown<V extends FormValues>({ name, mode, store }: ShownAsk<V>): boolean {
	if (store.submitCount > 0) return true;
	if (mode === "onChange") return store.changed.has(name);
	return (mode === "onBlur" || mode === "onTouched") && store.touched.has(name);
}

export function valueOfChange(change: unknown): unknown {
	if (!isRecord(change) || !isRecord(change["target"])) return change;
	const target = change["target"];
	if (target["type"] === "checkbox") return target["checked"];
	if (target["type"] === "file") return filesIn(target["files"]);
	if (target["multiple"] === true && "selectedOptions" in target) return chosenIn(target["selectedOptions"]);
	return "value" in target ? target["value"] : undefined;
}

export function fieldWriteOf<X>(change: unknown, like: X): FieldWrite<X> {
	const raw = valueOfChange(change);
	const value = typeof like === "number" && typeof raw === "string" ? numberOfText(raw) : raw;
	return isLike(value, like) ? { value } : null;
}

export function isDirtyAgainst(values: FormValues, defaults: FormValues): boolean {
	return Object.keys({ ...values, ...defaults }).some((name) => isFieldDirty(values, defaults, name));
}

export function isFieldDirty(values: FormValues, defaults: FormValues, name: string): boolean {
	return !Object.is(values[name], defaults[name]);
}

function withName(names: ReadonlySet<string>, name: string): ReadonlySet<string> {
	return names.has(name) ? names : new Set([...names, name]);
}

function isLike<X>(value: unknown, like: X): value is X {
	if (like === null || like === undefined) return value === like;
	if (like instanceof Date) return value instanceof Date;
	if (!Array.isArray(like)) return typeof value === typeof like;
	const [first] = like;
	return Array.isArray(value) && (first === undefined || value.every((one) => typeof one === typeof first));
}

function numberOfText(text: string): number {
	return text.trim() === "" ? Number.NaN : Number(text);
}

function filesIn(files: unknown): unknown[] {
	return isIterable(files) ? [...files] : [];
}

function chosenIn(options: unknown): string[] {
	if (!isIterable(options)) return [];
	return [...options].flatMap((option) =>
		isRecord(option) && typeof option["value"] === "string" ? [option["value"]] : [],
	);
}

function isIterable(value: unknown): value is Iterable<unknown> {
	return isRecord(value) && Symbol.iterator in value;
}
