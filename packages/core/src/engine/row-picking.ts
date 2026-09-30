export interface PickingFields {
	readonly whenNothingPicked?: unknown;
	readonly fieldFrom?: string | null;
	readonly field?: string | null;
}

type ReadField = (named: string) => unknown;

type FieldName = string | (() => unknown) | null;

export interface RowPicking {
	readonly fieldName: FieldName;
	readonly isFallbackToFirst: boolean;
}

export function selectionPicking(fields: PickingFields, readField: ReadField): RowPicking {
	return { fieldName: fieldNamed(fields, readField), isFallbackToFirst: fields.whenNothingPicked === "first" };
}

export function selectedRowPicking(fields: PickingFields, readField: ReadField): RowPicking {
	return { fieldName: fieldNamed(fields, readField) ?? "ref", isFallbackToFirst: fields.whenNothingPicked !== "none" };
}

function fieldNamed(fields: PickingFields, readField: ReadField): FieldName {
	const from = fields.fieldFrom;
	if (from) return () => readField(from);
	return fields.field ?? null;
}
