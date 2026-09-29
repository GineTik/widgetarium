export function selectionPicking(fields, readField) {
	return { fieldName: fieldNamed(fields, readField), isFallbackToFirst: fields.whenNothingPicked === "first" };
}

export function selectedRowPicking(fields, readField) {
	return { fieldName: fieldNamed(fields, readField) ?? "ref", isFallbackToFirst: fields.whenNothingPicked !== "none" };
}

function fieldNamed(fields, readField) {
	if (fields.fieldFrom) return () => readField(fields.fieldFrom);
	return fields.field ?? null;
}
