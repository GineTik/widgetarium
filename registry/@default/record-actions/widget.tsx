import { useState } from "react";
import {
	ConfirmDialog,
	ICommand,
	IQuery,
	RecordRefSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { FormFieldSchema } from "@default/lib";
import { ActionButtons } from "./action-buttons";
import { EditDialog } from "./edit-dialog";
import { EDIT } from "./labels";

const DELETE_ASKED = "Delete “{title}”?";
const DELETE_SAID = "The note moves to the trash.";
const NOT_DONE = "That did not work: {reason}";

const RecordSchema = z.record(z.string(), z.unknown());

type Field = z.output<typeof FormFieldSchema>;

const RecordActions = createWidget({
	inject: {
		getRows: IQuery.expects(z.array(RecordSchema)),
		getPicked: IQuery.expects(z.unknown().default(null)),
		getRecord: IQuery.expects(RecordSchema.nullable().default(null)),
		getFields: IQuery.expects(z.array(FormFieldSchema).default([])),
		getNoun: IQuery.expects(z.string().default("record")),
		getTitleField: IQuery.expects(z.string().default("name")),
		update: ICommand.sends(RecordSchema.and(z.object({ ref: RecordRefSchema }))),
		remove: ICommand.sends(z.object({ ref: RecordRefSchema })),
	},
	draw: ({ getRecord: record, getFields, getNoun: noun, getTitleField: titleField, update, remove }) => {
		const fields = useData(getFields).data;
		const writes = writesOn(record, { canEdit: update.can().can && fields.length > 0, canDelete: remove.can().can });
		if (!record || !writes) return null;
		return (
			<Actions
				noun={noun}
				title={String(record[titleField] ?? noun)}
				fields={fields}
				record={record}
				onSave={writes.canEdit ? (values) => update({ ...values, ref: writes.ref }) : null}
				onDelete={writes.canDelete ? () => remove({ ref: writes.ref }) : null}
			/>
		);
	},
});

type Allowed = { canEdit: boolean; canDelete: boolean };

function writesOn(record: Readonly<Record<string, unknown>> | null, allowed: Allowed) {
	const ref = RecordRefSchema.safeParse(record?.ref);
	if (!ref.success || (!allowed.canEdit && !allowed.canDelete)) return null;
	return { ...allowed, ref: ref.data };
}

type ActionsProps = {
	noun: string;
	title: string;
	fields: Field[];
	record: Readonly<Record<string, unknown>>;
	onSave: ((values: Record<string, unknown>) => Promise<unknown>) | null;
	onDelete: (() => Promise<unknown>) | null;
};

function Actions({ noun, title, fields, record, onSave, onDelete }: ActionsProps) {
	const [asked, setAsked] = useState<"edit" | "delete" | null>(null);
	const [refusal, setRefusal] = useState("");
	const run = async (write: () => Promise<unknown>) => {
		try {
			await write();
			setAsked(null);
			setRefusal("");
		} catch (error) {
			setRefusal(NOT_DONE.replace("{reason}", error instanceof Error ? error.message : String(error)));
		}
	};
	return (
		<div className="wg-record-actions">
			<ActionButtons noun={noun} canEdit={onSave !== null} canDelete={onDelete !== null} onAsk={setAsked} />
			{asked === "edit" && onSave ? (
				<EditDialog
					key={String(record["ref"])}
					refusal={refusal}
					title={EDIT.replace("{noun}", noun)}
					fields={fields}
					record={record}
					onSave={(values) => run(() => onSave(values))}
					onClose={() => setAsked(null)}
				/>
			) : null}
			<ConfirmDialog
				isOpen={asked === "delete"}
				title={DELETE_ASKED.replace("{title}", title)}
				description={DELETE_SAID}
				confirmLabel="Delete"
				variant="danger"
				onConfirm={() => void (onDelete ? run(onDelete) : undefined)}
				onOpenChange={(open) => setAsked(open ? "delete" : null)}
			/>
			{refusal ? <p className="wg-record-actions-refused">{refusal}</p> : null}
		</div>
	);
}

export const metadata = defineMetadata(RecordActions, {
	title: "Record actions",
	description: "An edit button and a menu holding delete, for the one record another widget has open.",
	keywords: ["edit", "delete", "remove", "actions", "menu", "record", "toolbar"],
	preview: { size: { w: 2, h: 1 } },
	props: {
		getRows: { label: "Records", hint: "The list the open record belongs to; edits and deletes are written here." },
		getPicked: { label: "Open record", hint: "Bind it to the selection of the widget that opens records." },
		getRecord: {
			label: "Record",
			hint: "The record the open one names.",
			source: {
				implementation: "@core/selected-row",
				fields: { rows: "getRows", picked: "getPicked", whenNothingPicked: "none" },
			},
		},
		getFields: {
			label: "Fields",
			hint: "What the edit form asks for: name, label, kind (line, text, number, choice, lines), options, isRequired. Empty hides edit.",
		},
		getNoun: { label: "Called", hint: "What one record is called: Edit word, Delete word." },
		getTitleField: { label: "Title field", hint: "The field the delete question names the record by." },
		update: { label: "Save an edit", source: { implementation: "@core/rows-update", fields: { target: "getRows" } } },
		remove: {
			label: "Delete the record",
			source: { implementation: "@core/rows-remove", fields: { target: "getRows" } },
		},
	},
});

export const layout = defineLayout({
	role: "control",
	size: { preferredWidth: 120, preferredHeight: "auto" },
});

export default RecordActions;
