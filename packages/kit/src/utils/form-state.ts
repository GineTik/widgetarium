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

export interface ShownAsk {
	readonly name: string;
	readonly mode: FormMode;
	readonly submitCount: number;
	readonly changed: ReadonlySet<string>;
	readonly touched: ReadonlySet<string>;
}

export function issuesByField(issues: readonly FormIssue[]): FormErrors {
	const errors: Record<string, FieldErrorEntry> = {};
	for (const issue of issues) {
		const name = String(issue.path[0] ?? "");
		if (!(name in errors)) errors[name] = { message: issue.message, type: "schema" };
	}
	return errors;
}

export function schemaErrorsOf<T>(schema: FormSchema<T> | undefined, values: FormValues): FormErrors {
	if (!schema) return {};
	const parsed = schema.safeParse(values);
	return parsed.success ? {} : issuesByField(parsed.error.issues);
}

export function isErrorShown({ name, mode, submitCount, changed, touched }: ShownAsk): boolean {
	if (submitCount > 0) return true;
	if (mode === "onChange") return changed.has(name);
	return (mode === "onBlur" || mode === "onTouched") && touched.has(name);
}

export function valueOfChange(change: unknown): unknown {
	if (!isRecord(change) || !isRecord(change["target"])) return change;
	const target = change["target"];
	if (target["type"] === "checkbox") return target["checked"];
	return "value" in target ? target["value"] : change;
}

export function isDirtyAgainst(values: FormValues, defaults: FormValues): boolean {
	return Object.keys({ ...values, ...defaults }).some((name) => isFieldDirty(values, defaults, name));
}

export function isFieldDirty(values: FormValues, defaults: FormValues, name: string): boolean {
	return !Object.is(values[name], defaults[name]);
}

export function valuesAs<V>(values: FormValues): V {
	// TRADE-OFF: a change event carries no field type; the values are the caller's defaults and what its controls wrote
	return values as V;
}
