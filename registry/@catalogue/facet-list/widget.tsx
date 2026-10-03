import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, pickedValue, useData, z } from "widgetarium";
import { List } from "widgetarium/kit";
import { FacetRow } from "./facet-row";
import { FilterField } from "./filter-field";
import { FacetSchema } from "./types";

const SHOWN_AT_MOST = 50;

const FacetList = createWidget({
	inject: {
		getHeading: IQuery.expects(z.string().default("")),
		getRows: IQuery.expects(z.array(FacetSchema).default([])),
		getSelection: IQuery.expects(z.unknown()),
		select: ICommand.sends(z.unknown()),
		getFilter: IQuery.expects(z.string().default("")),
		setFilter: ICommand.sends(z.string()),
		getFilterPlaceholder: IQuery.expects(z.string().default("")),
	},
	draw: ({
		getHeading: heading,
		getRows,
		getSelection,
		select,
		getFilter: filter,
		setFilter,
		getFilterPlaceholder,
	}) => {
		const listed = useData(getRows, { offset: 0, limit: SHOWN_AT_MOST });
		const picked = pickedValue(getSelection);
		const canFilter = getFilterPlaceholder !== "" && setFilter.can().can;
		return (
			<div className="wg-catalogue-facets">
				{heading ? <span className="wg-catalogue-facets-label">{heading}</span> : null}
				{canFilter ? <FilterField placeholder={getFilterPlaceholder} held={filter} write={setFilter} /> : null}
				<List>
					{listed.data.map((facet) => (
						<FacetRow key={facet.ref} facet={facet} picked={picked} select={select} />
					))}
				</List>
			</div>
		);
	},
});

export const metadata = defineMetadata(FacetList, {
	title: "Facet list",
	description: "Choices with a count beside each: press one to pick it, press it again to let it go.",
	keywords: ["filter", "facet", "choices", "packs", "pages", "counts", "sidebar", "list", "pick"],
	preview: {
		size: { w: 3, h: 3 },
		props: {
			getHeading: { value: "Show" },
			getRows: {
				rows: [
					{ name: "all", label: "All widgets", count: 54, icon: "layout-grid" },
					{ name: "installed", label: "Installed", count: 47, icon: "check" },
					{ name: "update", label: "Update ready", count: 3, icon: "refresh-cw", tone: "warning" },
				],
			},
		},
	},
	props: {
		getHeading: { aka: ["heading"], label: "Heading", hint: "The small label above the list." },
		getRows: {
			aka: ["rows"],
			label: "Choices",
			hint: "The choices to show, each with an optional count or icon.",
			describes: {
				name: { label: "Name", type: "line" },
				label: { label: "Label", type: "line" },
				count: { label: "Count", type: "number" },
			},
		},
		getSelection: {
			aka: ["selection"],
			label: "Picked choice",
			hint: "The choice that is picked.",
			source: { implementation: "@core/selection", fields: { rows: "getRows", field: "name" } },
		},
		select: {
			label: "Pick a choice",
			source: { implementation: "@core/value-set", fields: { target: "getSelection" } },
		},
		getFilter: { label: "Search in the list", keep: "screen", hint: "Text that narrows the list." },
		setFilter: {
			label: "Type the search",
			source: { implementation: "@core/value-set", fields: { target: "getFilter" } },
		},
		getFilterPlaceholder: { label: "Search placeholder", hint: "Leave it empty to hide the search field." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default FacetList;
