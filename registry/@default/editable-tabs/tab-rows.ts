import { fieldOf, textOf, type RecordRef } from "widgetarium";
import { ARCHIVED_AT, RECORD_ID } from "./tab-fields";

export type TabRow = { ref: RecordRef; label: string; value: string; isArchived: boolean };

export function tabRowsOf(listed: readonly { ref: RecordRef }[], label: string, value: string): TabRow[] {
	return listed.map((held) => {
		const drawn = textOf(held, label);
		return {
			ref: held.ref,
			label: drawn,
			value: identityOf(held, value, drawn),
			isArchived: Boolean(fieldOf(held, ARCHIVED_AT)),
		};
	});
}

function identityOf(held: unknown, field: string, label: string): string {
	return textOf(held, field) || textOf(held, RECORD_ID) || label;
}
