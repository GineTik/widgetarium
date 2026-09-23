import { createWidget, defineManifest, defineProp, textOf, useData } from "widgetarium";
import { Button, ButtonLabel, Icon, Popover, PopoverItem } from "widgetarium/kit";
import { useState } from "react";

const LABEL = "label";
const VALUE = "value";
const RECORD_NAME = "name";

const NO_GROUP =
	"No view group on this board — one holds the views and swaps between them. This puts the board's views inside a new group.";

const STYLE = `
.orbi-view-tabs .ovt-pick .ovt-caret { transform: rotate(90deg); transition: transform var(--orbi-press) var(--orbi-ease); }
.orbi-view-tabs .ovt-pick.is-open .ovt-caret { transform: rotate(-90deg); }

.orbi-view-tabs .ovt-deaf { margin: auto 0; }
.orbi-view-tabs .ovt-deaf .wg-kit-btn-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

type Held = Record<string, unknown> & { props?: Record<string, unknown> };
type Option = { ref: string; label: string; value: string };

function optionOf(ref: string, held: Held): Option {
	const label = textOf(held, LABEL) || textOf(held, RECORD_NAME);
	return { ref, label, value: textOf(held, VALUE) || label };
}

export const manifest = defineManifest({
	title: "View tabs",
	description: "A row of tabs that picks which view a view group draws.",
	keywords: ["view", "views", "tabs", "switch", "kanban", "table", "picker", "navigation", "bar", "modes", "layout"],
	role: "control",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 90, stackBelowPx: 120 },
	preview: { size: { w: 3, h: 1 }, shot: { of: "693919284" } },
	props: {
		options: defineProp<Held[]>()({
			label: "Options",
			hint: "Every option is a record. Bind a view group and it offers the views it holds.",
			wants: "@default/view-group/holds",
			default: [
				{ label: "Kanban", value: "Kanban" },
				{ label: "Archived columns", value: "Archived columns" },
			],
			describes: { label: { label: "Label", type: "text", required: true }, value: { label: "Value", type: "text" } },
		}),
		selection: defineProp<string>()({
			label: "Picked option",
			hint: "Which option is picked. Bind the view group's own box and the two move together.",
			of: "options",
			field: "value",
			fallback: "first",
			wants: "@default/view-group/selection",
			writes: ["update"],
		}),
	},
});

export default createWidget(manifest, ({ options, selection, foldIntoGroup }) => {
	const listed = useData(options.list);
	const chosen = useData(selection.get).data;
	const [isOpen, setOpen] = useState(false);

	const rows: Option[] = listed.data.map((held) => optionOf(held.ref, held));
	const active = rows.find((row) => row.value === chosen) ?? rows[0] ?? null;

	if (!listed.isLoading && rows.length === 0) {
		return (
			<div className="orbi orbi-view-tabs">
				<style>{STYLE}</style>
				<Button block className="ovt-deaf" title={NO_GROUP} onClick={() => foldIntoGroup?.()}>
					<Icon name="plus" size={15} />
					<ButtonLabel>Add a view group</ButtonLabel>
				</Button>
			</div>
		);
	}

	const trigger = (
		<Button block className={`ovt-pick${isOpen ? " is-open" : ""}`} aria-label="Change view">
			<ButtonLabel>{active?.label ?? ""}</ButtonLabel>
			<Icon name="chevron" size={15} className="ovt-caret" />
		</Button>
	);

	const choose = (picked: Option) => () => {
		setOpen(false);
		selection.update(picked.ref);
	};

	return (
		<div className="orbi orbi-view-tabs">
			<style>{STYLE}</style>
			<Popover trigger={trigger} isOpen={isOpen} onOpenChange={setOpen}>
				{rows.map((row) => (
					<PopoverItem key={row.ref} checked={row.ref === active?.ref} onClick={choose(row)}>
						{row.label}
					</PopoverItem>
				))}
			</Popover>
		</div>
	);
});
