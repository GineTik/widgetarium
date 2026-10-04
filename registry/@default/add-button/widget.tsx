import { useState } from "react";
import type { FormEvent } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	ICommand,
	IQuery,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { Button, FormFields, Icon, IconButton, isDraftComplete, valuesOfDraft } from "widgetarium/kit";
import type { FormDraft } from "widgetarium/kit";
import { FormFieldSchema, presetValues } from "@default/lib";

const NOT_ADDED = "It was not added: {reason}";
const NO_NAME = "{field} names the new note, so it cannot be empty";

const AddButton = createWidget({
	inject: {
		getLabel: IQuery.expects(z.string().default("")),
		getTitle: IQuery.expects(z.string().default("Add")),
		getFields: IQuery.expects(
			z.array(FormFieldSchema).default([{ name: "name", label: "Name", kind: "line", options: [], isRequired: true }]),
		),
		getPreset: IQuery.expects(z.record(z.string(), z.unknown()).default({})),
		getNameFrom: IQuery.expects(z.string().default("name")),
		create: ICommand.sends(z.record(z.string(), z.unknown())),
	},
	draw: ({ getLabel: label, getTitle: title, getFields, getPreset: preset, getNameFrom: nameFrom, create }) => {
		const [isOpen, setOpen] = useState(false);
		const fields = useData(getFields).data;
		const allowed = create.can();
		const reason = allowed.can ? undefined : allowed.reason;
		const trigger = label ? (
			<Button variant="accent" disabled={!allowed.can} title={reason} onClick={() => setOpen(true)}>
				<Icon name="plus" />
				{label}
			</Button>
		) : (
			<IconButton label={reason ?? title} variant="accent" disabled={!allowed.can} onClick={() => setOpen(true)}>
				<Icon name="plus" />
			</IconButton>
		);
		const add = async (values: Record<string, unknown>) => {
			const named = { ...presetValues(preset, new Date()), ...values };
			const name = String(named[nameFrom] ?? "").trim();
			if (name === "") throw new Error(NO_NAME.replace("{field}", nameFrom));
			await create({ id: crypto.randomUUID(), name, ...named });
		};
		return (
			<div className="wg-add-button">
				{trigger}
				{isOpen ? <AddDialog title={title} fields={fields} onAdd={add} onClose={() => setOpen(false)} /> : null}
			</div>
		);
	},
});

type AddDialogProps = {
	title: string;
	fields: z.output<typeof FormFieldSchema>[];
	onAdd: (values: Record<string, unknown>) => Promise<void>;
	onClose: () => void;
};

function AddDialog({ title, fields, onAdd, onClose }: AddDialogProps) {
	const [draft, setDraft] = useState<FormDraft>({});
	const [refusal, setRefusal] = useState("");
	const [isBusy, setBusy] = useState(false);
	const submit = async (event: FormEvent) => {
		event.preventDefault();
		setBusy(true);
		try {
			await onAdd(filledIn(valuesOfDraft(fields, draft)));
			onClose();
		} catch (error) {
			setRefusal(NOT_ADDED.replace("{reason}", error instanceof Error ? error.message : String(error)));
		} finally {
			setBusy(false);
		}
	};
	return (
		<Dialog isOpen onOpenChange={(open) => (open ? undefined : onClose())}>
			<DialogContent width={480}>
				<DialogClose />
				<form className="wg-add-button-form" onSubmit={submit}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<FormFields fields={fields} draft={draft} onChange={(name, value) => setDraft({ ...draft, [name]: value })} />
					{refusal ? <p className="wg-add-button-refused">{refusal}</p> : null}
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" variant="accent" isLoading={isBusy} disabled={!isDraftComplete(fields, draft)}>
							Add
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function filledIn(values: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(values).filter(([, value]) => !isEmpty(value)));
}

function isEmpty(value: unknown): boolean {
	return value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

export const metadata = defineMetadata(AddButton, {
	title: "Add button",
	description: "A button that opens a form and adds one record to a list another widget draws.",
	keywords: ["add", "new", "create", "plus", "button", "form", "dialog", "record"],
	preview: { size: { w: 2, h: 1 }, props: { getLabel: { value: "Add word" } } },
	props: {
		getLabel: {
			label: "Label",
			hint: "Empty draws a plus alone; write a label when what is added is not obvious from where it stands.",
		},
		getTitle: { label: "Form title", hint: "Heads the form, and names the plus for a screen reader." },
		getFields: {
			label: "Fields",
			hint: "One row per field the form asks for: name, label, kind (line, text, number, choice, lines), options, isRequired.",
		},
		getPreset: { label: "Preset", hint: "Values every new record starts with. $today becomes today's date." },
		getNameFrom: { label: "Note name from", hint: "The field whose value names the new note." },
		create: { label: "Add the record", hint: "Bind it to @core/rows-create aimed at the list, and switch it on." },
	},
});

export const layout = defineLayout({
	role: "composer",
	size: { preferredWidth: 240, preferredHeight: "auto" },
});

export default AddButton;
