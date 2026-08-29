import { createWidget, WidgetRoot } from "widgetarium";
import { Button, Icon, Popover, PopoverItem } from "widgetarium/kit";
import { useState } from "preact/hooks";

const STYLE = `
/* CONTEXT: the widget root is a column flex — without this the trigger stretches full width */
.orbi-view-tabs { align-items: flex-start; }

/* CONTEXT: the kit's chevron points right; a dropdown caret points down, and up while open */
.ovt-pick .ovt-caret { transform: rotate(90deg); transition: transform var(--orbi-press) var(--orbi-ease); }
.ovt-pick.is-open .ovt-caret { transform: rotate(-90deg); }

.ovt-item-mark { margin-left: auto; opacity: 0; }
.ovt-item.is-on .ovt-item-mark { opacity: 1; }
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
		<Button class={`ovt-pick${open ? " is-open" : ""}`} aria-label="Change view">
			{selected}
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
						class={`ovt-item${view === selected ? " is-on" : ""}`}
						checked={view === selected}
						onClick={choose(view)}
					>
						{view}
						<Icon name="tick" size={15} class="ovt-item-mark" />
					</PopoverItem>
				))}
			</Popover>
		</WidgetRoot>
	);
});
