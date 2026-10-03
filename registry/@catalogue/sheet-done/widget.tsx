import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Button } from "widgetarium/kit";

const SHOW = "Show {count} widgets";

const SheetDone = createWidget({
	inject: {
		getShown: IQuery.expects(z.number().default(0)),
		close: ICommand.sends(z.boolean()),
	},
	draw: ({ getShown: shown, close }) => (
		<div>
			<Button block variant="accent" size="l" onClick={() => void close(false)}>
				{SHOW.replace("{count}", String(shown))}
			</Button>
		</div>
	),
});

export const metadata = defineMetadata(SheetDone, {
	title: "Sheet done",
	description: "A button under the filters that says how many widgets they leave and closes them.",
	keywords: ["filters", "sheet", "done", "close", "catalogue"],
	preview: { size: { w: 4, h: 1 }, props: { getShown: { value: 12 } } },
	props: {
		getShown: { aka: ["getCounts"], label: "Widgets shown", hint: "How many widgets the filters leave." },
		close: { label: "Close the filters", hint: "Closes the filters when pressed." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default SheetDone;
