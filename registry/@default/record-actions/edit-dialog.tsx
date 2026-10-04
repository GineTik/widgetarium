import { useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, z } from "widgetarium";
import { Button, FormFields, changedValues, draftOfRecord, isDraftComplete } from "widgetarium/kit";
import type { FormDraft } from "widgetarium/kit";
import { FormFieldSchema } from "@default/lib";

type Field = z.output<typeof FormFieldSchema>;

type EditDialogProps = {
	refusal: string;
	title: string;
	fields: Field[];
	record: Readonly<Record<string, unknown>>;
	onSave: (values: Record<string, unknown>) => Promise<void>;
	onClose: () => void;
};

export function EditDialog({ refusal, title, fields, record, onSave, onClose }: EditDialogProps) {
	const [before] = useState<FormDraft>(() => draftOfRecord(fields, record));
	const [draft, setDraft] = useState<FormDraft>(before);
	const submit = (event: FormEvent) => {
		event.preventDefault();
		void onSave(changedValues(fields, before, draft));
	};
	return (
		<Dialog isOpen onOpenChange={(open) => (open ? undefined : onClose())}>
			<DialogContent width={520}>
				<DialogClose />
				<form className="wg-record-actions-form" onSubmit={submit}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<FormFields fields={fields} draft={draft} onChange={(name, value) => setDraft({ ...draft, [name]: value })} />
					{refusal ? <p className="wg-record-actions-refused">{refusal}</p> : null}
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" variant="accent" disabled={!isDraftComplete(fields, draft)}>
							Save
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
