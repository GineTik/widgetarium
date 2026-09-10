import { createWidget, textOf, useData, WidgetRoot } from "widgetarium";
import { Button, ButtonLabel, Icon, Popover, PopoverItem } from "widgetarium/kit";
import { useState } from "react";

const LABEL = "label";
const VALUE = "value";
const RECORD_NAME = "name";

const NO_GROUP = "No view group on this board — one holds the views and swaps between them. This puts the board's views inside a new group.";

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

export default createWidget(function OrbiTaskViewTabs({ options, selection, foldIntoGroup }: any) {
	const listed = useData(options.list);
	const chosen = useData(selection.get).data;
	const [isOpen, setOpen] = useState(false);

	const rows: Option[] = listed.rows.map(({ ref, value: held }: { ref: string; value: Held }) => optionOf(ref, held));
	const active = rows.find((row) => row.value === chosen) ?? rows[0] ?? null;

	if (!listed.isLoading && rows.length === 0) {
		return (
			<WidgetRoot defaultRounded="none" className="orbi orbi-view-tabs" defaultBackgroundType="none">
				<style>{STYLE}</style>
				<Button block className="ovt-deaf" title={NO_GROUP} onClick={() => foldIntoGroup?.()}>
					<Icon name="plus" size={15} />
					<ButtonLabel>Add a view group</ButtonLabel>
				</Button>
			</WidgetRoot>
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
		<WidgetRoot defaultRounded="none" className="orbi orbi-view-tabs" defaultBackgroundType="none">
			<style>{STYLE}</style>
			<Popover trigger={trigger} isOpen={isOpen} onOpenChange={setOpen}>
				{rows.map((row) => (
					<PopoverItem key={row.ref} checked={row.ref === active?.ref} onClick={choose(row)}>
						{row.label}
					</PopoverItem>
				))}
			</Popover>
		</WidgetRoot>
	);
});
