import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Icon, IconButton } from "widgetarium/kit";

const CSS = `
.wg-toggle { display: flex; align-items: center; justify-content: flex-start; }
`;

const ToggleWidget = createWidget({
	inject: {
		getIsOpen: IQuery.expects(z.boolean().default(false)),
		setIsOpen: ICommand.sends(z.boolean()),
		getIcon: IQuery.expects(z.string().default("menu")),
		getLabel: IQuery.expects(z.string().default("Open the panel")),
	},
	draw: ({ getIsOpen: isOpen, setIsOpen, getIcon: icon, getLabel: label }) => {
		return (
			<div className="wg-toggle">
				<style>{CSS}</style>
				<IconButton
					variant="raised"
					size="l"
					label={label || "Open the panel"}
					aria-pressed={isOpen}
					onClick={() => void setIsOpen(!isOpen)}
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
		getIsOpen: {
			aka: ["open"],
			keep: "screen",
			label: "Open",
			hint: "Whether the box this opens is open. A box names it as its trigger, and reads it.",
		},
		setIsOpen: {
			label: "Open or shut the box",
			source: { implementation: "@core/value-set", fields: { target: "getIsOpen" } },
		},
		getIcon: {
			aka: ["icon"],
			label: "Icon",
			hint: "The icon drawn on the button, picked off the grid: the kit's own glyphs and all of Lucide.",
			control: "icon",
		},
		getLabel: {
			aka: ["label"],
			label: "Label",
			hint: "What a screen reader says the button does.",
		},
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 240, preferredHeight: "auto" } });

export default ToggleWidget;
