import { createWidget, WidgetRoot } from "widgetarium";
import { Button, ButtonLabel, Icon, Popover, PopoverItem } from "widgetarium/kit";
import { useEffect, useState } from "preact/hooks";

const STYLE = `
/* CONTEXT: the kit's chevron points right; a dropdown caret points down, and up while open */
.orbi-view-tabs .ovt-pick .ovt-caret { transform: rotate(90deg); transition: transform var(--orbi-press) var(--orbi-ease); }
.orbi-view-tabs .ovt-pick.is-open .ovt-caret { transform: rotate(-90deg); }

/* CONTEXT: one row high and often narrow, so the label truncates and the sign stays */
.orbi-view-tabs .ovt-deaf { margin: auto 0; }
.orbi-view-tabs .ovt-deaf .wg-kit-btn-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

function toList(value) {
	if (Array.isArray(value)) return value;
	return String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

// CONTEXT: the view is presentation, not a filter — its own key, so two widgets may draw the same tasks differently.
export default createWidget(function OrbiTaskViewTabs({ settings, context, board, configureBoard }) {
	// CONTEXT: the group that holds the views publishes the live list; the setting is the fallback
	const views = toList(context?.get("views") || settings.views);
	const selected = context?.get("view") ?? settings.activeView ?? views[0];
	const [open, setOpen] = useState(false);
	// CONTEXT: the setting was read for the label and published to nobody, so the group drew another view
	useEffect(() => {
		context?.set("view", selected);
	}, [context, selected]);

	// CONTEXT: only a view group draws a view, so with none on the board the picker steers nobody
	if (!(board?.consumes?.includes("view") ?? true)) {
		return (
			<WidgetRoot defaultRounded="none" className="orbi orbi-view-tabs" defaultBackgroundType="none">
				<style>{STYLE}</style>
				<Button
					block
					class="ovt-deaf"
					title="No view group on this board — one holds the views and swaps between them. This puts the board's views inside a new group."
					onClick={() => configureBoard?.({ holder: "view" })}
				>
					<Icon name="plus" size={15} />
					<ButtonLabel>Add a view group</ButtonLabel>
				</Button>
			</WidgetRoot>
		);
	}

	const trigger = (
		<Button block class={`ovt-pick${open ? " is-open" : ""}`} aria-label="Change view">
			<ButtonLabel>{selected}</ButtonLabel>
			<Icon name="chevron" size={15} class="ovt-caret" />
		</Button>
	);

	// CONTEXT: the panel sits inside the anchor, so a press on an item never reaches the trigger
	const choose = (view) => () => {
		setOpen(false);
		context?.set("view", view);
	};

	return (
		<WidgetRoot defaultRounded="none" className="orbi orbi-view-tabs" defaultBackgroundType="none">
			<style>{STYLE}</style>
			<Popover trigger={trigger} open={open} onOpenChange={setOpen}>
				{views.map((view) => (
					<PopoverItem
						key={view}
						checked={view === selected}
						onClick={choose(view)}
					>
						{view}
					</PopoverItem>
				))}
			</Popover>
		</WidgetRoot>
	);
});
