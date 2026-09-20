import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import { Icon, IconButton } from "widgetarium/kit";

const CSS = `
.wg-toggle { display: flex; align-items: center; justify-content: flex-start; }
`;

export const manifest = defineManifest({
	title: "Toggle",
	description: "A button that opens a box which collapsed because the screen is too narrow for it.",
	keywords: ["toggle", "button", "menu", "drawer", "sheet", "sidebar", "open", "collapse", "trigger", "hamburger"],
	role: "control",
	size: { tallestPx: 48 },
	props: {
		open: defineProp<boolean>()({
			label: "Open",
			hint: "Whether the box this opens is open. A box names it as its trigger, and reads it.",
			keep: "screen",
			default: false,
			writes: ["update"],
		}),
		icon: defineProp<string>()({
			label: "Icon",
			hint: "The icon drawn on the button, picked off the grid: the kit's own glyphs and all of Lucide.",
			control: "icon",
			default: "menu",
		}),
		label: defineProp<string>()({
			label: "Label",
			hint: "What a screen reader says the button does.",
			default: "Open the panel",
		}),
	},
});

export default createWidget(manifest, ({ open, icon, label }) => {
	const isOpen = useData(open.get).data === true;
	const glyph = String(useData(icon.get).data ?? "") || "menu";
	const said = String(useData(label.get).data ?? "") || "Open the panel";

	return (
		<div className="wg-toggle">
			<style>{CSS}</style>
			<IconButton
				variant="raised"
				size="l"
				label={said}
				aria-pressed={String(isOpen)}
				onClick={() => open.update(!isOpen)}
			>
				<Icon name={glyph} size={22} />
			</IconButton>
		</div>
	);
});
