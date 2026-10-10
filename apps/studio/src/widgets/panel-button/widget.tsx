import { createElement as h } from "react";
import { z } from "zod";
import { Button, Icon } from "@widgetarium/kit";
import { defineLayout, defineMetadata } from "@widgetarium/core/gateway/declared.js";
import { ICommand, IQuery } from "@widgetarium/core/gateway/queries.js";
import { createWidget } from "@widgetarium/core/widget-api.js";
import { useRefusal } from "../use-refusal.js";

const PanelButton = createWidget({
	inject: {
		getLabel: IQuery.output(z.string().default("Panel")),
		getIcon: IQuery.output(z.string().default("panel-right")),
		getIsOpen: IQuery.output(z.boolean().default(false)),
		togglePanel: ICommand,
	},
	draw: ({ getLabel: label, getIcon: icon, getIsOpen: isOpen, togglePanel }) => {
		const { refusal, isAnsweredOk } = useRefusal();
		return (
			<Button
				variant={isOpen ? "accent" : "ghost"}
				size="icon-sm"
				aria-label={label}
				aria-pressed={isOpen}
				aria-disabled={refusal !== null}
				title={refusal ?? label}
				onClick={() => void isAnsweredOk(togglePanel())}
			>
				<Icon name={icon} />
			</Button>
		);
	},
});

export const metadata = defineMetadata(PanelButton, {
	title: "Panel button",
	description: "A corner button that opens one panel beside the app, the AI assistant or the widget catalogue.",
	keywords: ["ai", "assistant", "catalogue", "widgets", "panel", "sidebar", "studio", "corner"],
	props: {
		getLabel: { label: "Label", hint: "What the button says to a screen reader and on hover." },
		getIcon: { label: "Icon", hint: "The kit icon the button draws." },
		getIsOpen: { label: "Panel open", hint: "Pressed while its panel stands beside the app." },
		togglePanel: { label: "Open the panel", hint: "Opens or closes the panel beside the app." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 34, preferredHeight: 34 } });

export default PanelButton;
