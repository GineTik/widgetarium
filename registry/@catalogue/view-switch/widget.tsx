import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, useData, z } from "widgetarium";
import { Segmented } from "widgetarium/kit";

const ViewSchema = z.looseObject({ name: z.string().optional(), hidden: z.boolean().optional() });

type ViewRow = z.infer<typeof ViewSchema>;

function viewNamesOf(rows: readonly ViewRow[]): string[] {
	return rows.flatMap((row) => (row.hidden || !row.name ? [] : [row.name]));
}

const ViewSwitch = createWidget({
	inject: {
		getViews: IQuery.expects(z.array(ViewSchema).default([])),
		getView: IQuery.expects(z.string().nullable().default(null)),
		setView: ICommand.sends(z.string()),
	},
	draw: ({ getViews, getView: picked, setView }) => {
		const viewNames = viewNamesOf(useData(getViews).data);
		// TRADE-OFF: the first view stands in for no pick here, repeating the box; its published selection should answer the shown view
		const shownView = picked !== null && viewNames.includes(picked) ? picked : (viewNames[0] ?? "");
		if (viewNames.length < 2) return null;
		return (
			<div>
				<Segmented
					className="wg-catalogue-views"
					items={viewNames.map((name) => ({ value: name, label: name }))}
					value={shownView}
					onChange={(name) => void setView(name)}
				/>
			</div>
		);
	},
});

export const metadata = defineMetadata(ViewSwitch, {
	title: "View switch",
	description: "The views a view box holds as one full-width switch.",
	keywords: ["views", "tabs", "switch", "segmented", "catalogue"],
	preview: { size: { w: 4, h: 1 }, props: { getViews: { rows: [{ name: "Widgets" }, { name: "Templates" }] } } },
	props: {
		getViews: { label: "Views", hint: "Bind a view box's holds and the switch offers its views." },
		getView: { label: "Shown view", hint: "Bind the same view box's selection and the two move together." },
		setView: {
			label: "Show a view",
			source: { implementation: "@core/value-set", fields: { target: "getView" } },
		},
	},
});

export const layout = defineLayout({
	role: "navigation",
	size: { preferredWidth: "full", preferredHeight: "auto", stackBelowPx: 240 },
});

export default ViewSwitch;
