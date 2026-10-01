import { IValueGateway, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Icon, IconButton } from "widgetarium/kit";

const CSS = `
.wg-toggle { display: flex; align-items: center; justify-content: flex-start; }
`;

const ToggleWidget = createWidget({
	inject: {
		open: IValueGateway.of(z.boolean().default(false)).pick("get", "update"),
		icon: IValueGateway.of(z.string().default("menu")).pick("get"),
		label: IValueGateway.of(z.string().default("Open the panel")).pick("get"),
	},
	draw: ({ open, icon, label }) => {
		const isOpen = open.value === true;

		return (
			<div className="wg-toggle">
				<style>{CSS}</style>
				<IconButton
					variant="raised"
					size="l"
					label={label || "Open the panel"}
					aria-pressed={isOpen}
					onClick={() => open.update(!isOpen)}
				>
					<Icon name={icon || "menu"} size={22} />
				</IconButton>
			</div>
		);
	},
});

export const metadata = defineMetadata(ToggleWidget, {
	title: "Toggle",
	description: "A button that opens a box which collapsed because the screen is too narrow for it.",
	keywords: ["toggle", "button", "menu", "drawer", "sheet", "sidebar", "open", "collapse", "trigger", "hamburger"],
	props: {
		open: {
			keep: "screen",
			label: "Open",
			hint: "Whether the box this opens is open. A box names it as its trigger, and reads it.",
		},
		icon: {
			label: "Icon",
			hint: "The icon drawn on the button, picked off the grid: the kit's own glyphs and all of Lucide.",
			control: "icon",
		},
		label: {
			label: "Label",
			hint: "What a screen reader says the button does.",
		},
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 240, preferredHeight: "auto" } });

export default ToggleWidget;
