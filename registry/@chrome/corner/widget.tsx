import { IQuery, ISlot, createWidget, defineLayout, defineMetadata, defineStates } from "widgetarium";
import { z } from "zod";

const Corner = createWidget({
	inject: { getSide: IQuery.output(z.enum(["left", "right"]).default("left")), items: ISlot.array() },
	draw: ({ getSide: side, items }) => (
		<div data-name="Corner">
			<div className={`flex h-[50px] w-full items-center gap-1 ${side === "right" ? "justify-end" : ""}`}>
				{items.map((Item) => (
					<Item key={Item.id} />
				))}
			</div>
		</div>
	),
});

export const metadata = defineMetadata(Corner, {
	title: "Window corner",
	description: "One top corner of an app window: the system's safe area and the app's controls on one line.",
	keywords: ["chrome", "corner", "titlebar", "safe area", "window"],
	props: {
		getSide: { label: "Side", hint: "Which top corner: the right one lines its items up against the right edge." },
		items: { label: "In this corner", hint: "From the window edge inward, or from inside out on the right." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: "full", preferredHeight: 50 } });

export const states = defineStates(Corner, {
	"macOS left": {
		items: [
			{ widget: "@chrome/safe-area", props: { getSide: "left", getPlatform: "macos", getDrawsSystemButtons: true } },
			{ widget: "@chrome/control-menu", props: {} },
		],
	},
	"macOS right": {
		getSide: "right",
		items: [
			{ widget: "@chrome/ai-button", props: {} },
			{ widget: "@chrome/safe-area", props: { getSide: "right", getPlatform: "macos" } },
		],
	},
});

export default Corner;
