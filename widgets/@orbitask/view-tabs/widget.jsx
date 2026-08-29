import { createWidget, WidgetRoot } from "widgetarium";
import { Button, ButtonLabel, Icon, Popover, PopoverItem } from "widgetarium/kit";
import { useState } from "preact/hooks";

const STYLE = `
/* CONTEXT: the kit's chevron points right; a dropdown caret points down, and up while open */
.orbi-view-tabs .ovt-pick .ovt-caret { transform: rotate(90deg); transition: transform var(--orbi-press) var(--orbi-ease); }
.orbi-view-tabs .ovt-pick.is-open .ovt-caret { transform: rotate(-90deg); }

`;

function toList(value) {
	if (Array.isArray(value)) return value;
	return String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

// CONTEXT: the view is presentation, not a filter — its own key, so two widgets may draw the same tasks differently.
export default createWidget(function OrbiTaskViewTabs({ settings, context }) {
	// CONTEXT: the group that holds the views publishes the live list; the setting is the fallback
	const views = toList(context?.get("views") || settings.views);
	const selected = context?.get("view") ?? settings.activeView ?? views[0];
	const [open, setOpen] = useState(false);

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
