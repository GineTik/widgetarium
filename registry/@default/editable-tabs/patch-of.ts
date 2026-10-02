import { RECORD_NAME } from "./tab-fields";

export function patchOf(field: string, value: unknown): Record<string, unknown> {
	return field === RECORD_NAME ? { [field]: value } : { props: { [field]: value } };
}
