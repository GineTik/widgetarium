import { createElement as h } from "react";
import { z } from "zod";
import { Button, Icon } from "@widgetarium/kit";
import { defineLayout, defineMetadata } from "@widgetarium/core/gateway/declared.js";
import { ICommand, IQuery } from "@widgetarium/core/gateway/queries.js";
import { createWidget } from "@widgetarium/core/widget-api.js";
import { useRefusal } from "../use-refusal.js";

const AiButton = createWidget({
	inject: {
		getIsOpen: IQuery.output(z.boolean().default(false)),
		toggleAssistant: ICommand,
	},
	draw: ({ getIsOpen: isOpen, toggleAssistant }) => {
		const { refusal, isAnsweredOk } = useRefusal();
		return (
			<Button
				variant={isOpen ? "accent" : "ghost"}
				size="icon-sm"
				aria-label="AI assistant"
				aria-pressed={isOpen}
				aria-disabled={refusal !== null}
				title={refusal ?? undefined}
				onClick={() => void isAnsweredOk(toggleAssistant())}
			>
				<Icon name="sparkles" />
			</Button>
		);
	},
});

export const metadata = defineMetadata(AiButton, {
	title: "AI button",
	description: "The corner button that opens the AI sidebar beside the app.",
	keywords: ["ai", "assistant", "sidebar", "studio", "corner"],
	props: {
		getIsOpen: { label: "Sidebar open", hint: "Pressed while the sidebar stands beside the app." },
		toggleAssistant: { label: "Open the AI sidebar", hint: "Opens or closes the assistant beside the app." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 34, preferredHeight: 34 } });

export default AiButton;
