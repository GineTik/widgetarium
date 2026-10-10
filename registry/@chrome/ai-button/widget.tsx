import { useState } from "react";
import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, defineStates } from "widgetarium";
import { z } from "zod";
import { Button, Icon } from "widgetarium/kit";

const LOOKS = ["rest", "hover", "open"] as const;

type Look = (typeof LOOKS)[number];

const VARIANT_OF_LOOK = { rest: "ghost", hover: "secondary", open: "accent" } as const satisfies Readonly<
	Record<Look, string>
>;

const AiButton = createWidget({
	inject: {
		getIsShown: IQuery.output(z.boolean().default(true)),
		getLook: IQuery.output(z.enum(LOOKS).default("rest")),
		toggleAssistant: ICommand,
	},
	draw: ({ getIsShown: isShown, getLook: look, toggleAssistant }) => {
		const [isOpen, setOpen] = useState<boolean | null>(null);
		if (!isShown) return <span className="block size-9" data-name="Reserved for the AI button" aria-hidden="true" />;
		const shownLook = isOpen === null ? look : lookOf(isOpen);
		return (
			<Button
				variant={VARIANT_OF_LOOK[shownLook]}
				size="icon"
				aria-label="AI assistant"
				aria-pressed={shownLook === "open"}
				onClick={async () => {
					setOpen(shownLook !== "open");
					await toggleAssistant();
				}}
			>
				<Icon name="sparkles" />
			</Button>
		);
	},
});

function lookOf(isOpen: boolean): Look {
	return isOpen ? "open" : "rest";
}

export const metadata = defineMetadata(AiButton, {
	title: "AI button",
	description: "The corner button that opens the AI sidebar, or the empty place kept for it.",
	keywords: ["ai", "assistant", "sidebar", "agent", "chat", "chrome", "corner"],
	props: {
		getIsShown: {
			label: "Shown",
			hint: "Off keeps its place empty, so the corner never shifts for people without AI.",
		},
		getLook: {
			label: "Look",
			hint: "Rest, hovered, or pressed with the sidebar open.",
			options: [
				{ value: "rest", label: "Rest" },
				{ value: "hover", label: "Hovered" },
				{ value: "open", label: "Sidebar open" },
			],
			design: true,
		},
		toggleAssistant: { label: "Open the AI sidebar", hint: "Opens or closes the assistant beside the app." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 36, preferredHeight: 36 } });

export const states = defineStates(AiButton, {
	Rest: {},
	Hover: { getLook: "hover" },
	"Sidebar open": { getLook: "open" },
	Hidden: { getIsShown: false },
});

export default AiButton;
