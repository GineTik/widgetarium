export const FORM_FIELD_KINDS = ["line", "text", "number", "choice", "lines"] as const;

export type FormFieldKind = (typeof FORM_FIELD_KINDS)[number];

export interface FormFieldSpec {
	readonly name: string;
	readonly label: string;
	readonly kind?: FormFieldKind | undefined;
	readonly options?: readonly string[] | undefined;
	readonly isRequired?: boolean | undefined;
}

export type FormDraft = Readonly<Record<string, string>>;

export function draftOfRecord(fields: readonly FormFieldSpec[], record: Readonly<Record<string, unknown>>): FormDraft {
	return Object.fromEntries(fields.map((field) => [field.name, textOf(record[field.name])]));
}

export function valuesOfDraft(fields: readonly FormFieldSpec[], draft: FormDraft): Record<string, unknown> {
	return Object.fromEntries(fields.map((field) => [field.name, valueOf(field, draft[field.name] ?? "")]));
}

export function changedValues(
	fields: readonly FormFieldSpec[],
	before: FormDraft,
	draft: FormDraft,
): Record<string, unknown> {
	return valuesOfDraft(
		fields.filter((field) => (draft[field.name] ?? "") !== (before[field.name] ?? "")),
		draft,
	);
}

export function isDraftComplete(fields: readonly FormFieldSpec[], draft: FormDraft): boolean {
	return fields.every((field) => isFieldComplete(field, (draft[field.name] ?? "").trim()));
}

function isFieldComplete(field: FormFieldSpec, typed: string): boolean {
	if (field.kind === "number" && typed !== "" && !Number.isFinite(Number(typed))) return false;
	return !field.isRequired || typed !== "";
}

function textOf(value: unknown): string {
	if (Array.isArray(value)) return value.map(String).join("\n");
	if (value === undefined || value === null) return "";
	return String(value);
}

function valueOf(field: FormFieldSpec, typed: string): unknown {
	if (field.kind === "lines") return linesIn(typed);
	if (field.kind === "number") return typed.trim() === "" ? undefined : Number(typed);
	return typed.trim();
}

function linesIn(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}
