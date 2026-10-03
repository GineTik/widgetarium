import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Button } from "widgetarium/kit";

const CLEAR_ALL = "Clear all";

const SheetHead = createWidget({
	inject: {
		getTitle: IQuery.expects(z.string().default("Filters")),
		getNarrowed: IQuery.expects(z.number().default(0)),
		clearFilters: ICommand.sends(z.unknown()),
	},
	draw: ({ getTitle: title, getNarrowed: narrowed, clearFilters }) => (
		<div>
			<div className="wg-catalogue-sheet-head">
				<h2 className="wg-catalogue-sheet-title">{title}</h2>
				{narrowed > 0 ? (
					<Button size="s" variant="plain" onClick={() => void clearFilters(null)}>
						{CLEAR_ALL}
					</Button>
				) : null}
			</div>
		</div>
	),
});

export const metadata = defineMetadata(SheetHead, {
	title: "Sheet head",
	description: "The title above the filters, with Clear all while any filter is on.",
	keywords: ["filters", "sheet", "title", "clear", "catalogue"],
	preview: { size: { w: 4, h: 1 }, props: { getNarrowed: { value: 1 } } },
	props: {
		getTitle: { aka: ["title"], label: "Title" },
		getNarrowed: { aka: ["getCounts"], label: "Filters on", hint: "How many filters are on." },
		clearFilters: { label: "Clear the filters", hint: "Turns every filter off." },
	},
});

export const layout = defineLayout({ role: "layout", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default SheetHead;
