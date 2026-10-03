import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, pickedValue, useData, z } from "widgetarium";
import { Chip } from "./chip";
import { FilterField } from "./filter-field";

const ChipSchema = z.object({ name: z.string(), label: z.string(), count: z.number().optional() });

const MORE = "+{count}";

const ChipGroup = createWidget({
	inject: {
		getHeading: IQuery.expects(z.string().default("")),
		getChips: IQuery.expects(z.array(ChipSchema).default([])),
		getShown: IQuery.expects(z.number().default(6)),
		getSelection: IQuery.expects(z.unknown()),
		select: ICommand.sends(z.unknown()),
		getFilter: IQuery.expects(z.string().default("")),
		setFilter: ICommand.sends(z.string()),
		getFilterPlaceholder: IQuery.expects(z.string().default("")),
	},
	draw: ({
		getHeading: heading,
		getChips,
		getShown: shown,
		getSelection,
		select,
		getFilter: filter,
		setFilter,
		getFilterPlaceholder,
	}) => {
		const listed = useData(getChips, { offset: 0, limit: Math.max(1, Math.round(shown)) });
		const picked = pickedValue(getSelection);
		const canFilter = getFilterPlaceholder !== "" && setFilter.can().can;
		const rest = Math.max(0, (listed.total ?? listed.data.length) - listed.data.length);
		return (
			<div className="wg-catalogue-chips">
				{heading ? <span className="wg-catalogue-chips-label">{heading}</span> : null}
				{canFilter ? <FilterField placeholder={getFilterPlaceholder} held={filter} write={setFilter} /> : null}
				<div className="wg-catalogue-chips-row">
					{listed.data.map((chip) => (
						<Chip key={chip.ref} chip={chip} picked={picked} select={select} />
					))}
					{rest > 0 ? <span className="wg-catalogue-chips-more">{MORE.replace("{count}", String(rest))}</span> : null}
				</div>
			</div>
		);
	},
});

export const metadata = defineMetadata(ChipGroup, {
	title: "Chip group",
	description: "Choices as chips: press one to pick it, press it again to let it go.",
	keywords: ["chips", "tags", "filter", "choices", "pills", "pick"],
	preview: {
		size: { w: 3, h: 1 },
		props: {
			getHeading: { value: "Tags" },
			getChips: {
				rows: [
					{ name: "habit", label: "habit" },
					{ name: "tasks", label: "tasks" },
					{ name: "chart", label: "chart" },
				],
			},
		},
	},
	props: {
		getHeading: { aka: ["heading"], label: "Heading", hint: "The small label above the chips." },
		getChips: {
			aka: ["chips"],
			label: "Chips",
			hint: "The chips to show.",
			describes: { name: { label: "Name", type: "line" }, label: { label: "Label", type: "line" } },
		},
		getShown: { label: "Chips shown", hint: "How many chips show before the rest are folded into a count." },
		getSelection: {
			aka: ["selection"],
			label: "Picked chip",
			hint: "The chip that is picked.",
			source: { implementation: "@core/selection", fields: { rows: "getChips", field: "name" } },
		},
		select: {
			label: "Pick a chip",
			source: { implementation: "@core/value-set", fields: { target: "getSelection" } },
		},
		getFilter: { label: "Search in the chips", keep: "screen", hint: "Text that narrows the chips." },
		setFilter: {
			label: "Type the search",
			source: { implementation: "@core/value-set", fields: { target: "getFilter" } },
		},
		getFilterPlaceholder: { label: "Search placeholder", hint: "Leave it empty to hide the search field." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default ChipGroup;
