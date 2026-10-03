import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Button, Icon } from "widgetarium/kit";

const FILTERS = "Filters";
const COUNTED_ONE = "{count} widget";
const COUNTED = "{count} widgets";
const CLEAR_ALL = "Clear all";

const FilterBar = createWidget({
	inject: {
		getView: IQuery.expects(z.string().nullable().default(null)),
		getHiddenInView: IQuery.expects(z.string().default("")),
		getIsOpen: IQuery.expects(z.boolean().default(false)),
		setIsOpen: ICommand.sends(z.boolean()),
		getShown: IQuery.expects(z.number().default(0)),
		getNarrowed: IQuery.expects(z.number().default(0)),
		clearFilters: ICommand.sends(z.unknown()),
	},
	draw: ({
		getView: view,
		getHiddenInView: hiddenInView,
		getIsOpen: isOpen,
		setIsOpen,
		getShown: shown,
		getNarrowed: narrowed,
		clearFilters,
	}) => {
		if (view !== null && view === hiddenInView) return null;
		return (
			<div>
				<div className="wg-catalogue-bar">
					<Button
						size="s"
						className={narrowed > 0 ? "wg-catalogue-bar-filters is-on" : "wg-catalogue-bar-filters"}
						aria-expanded={isOpen}
						onClick={() => void setIsOpen(!isOpen)}
					>
						<Icon name="filter" size={15} />
						<span>{FILTERS}</span>
						{narrowed > 0 ? <span className="wg-catalogue-bar-badge">{narrowed}</span> : null}
					</Button>
					<span className="wg-catalogue-bar-count">
						{(shown === 1 ? COUNTED_ONE : COUNTED).replace("{count}", String(shown))}
					</span>
					{narrowed > 0 ? (
						<Button size="s" variant="plain" className="wg-catalogue-bar-clear" onClick={() => void clearFilters(null)}>
							{CLEAR_ALL}
						</Button>
					) : null}
				</div>
			</div>
		);
	},
});

export const metadata = defineMetadata(FilterBar, {
	title: "Filter bar",
	description: "A Filters button, how many widgets are shown, and Clear all while any filter is on.",
	keywords: ["filters", "toggle", "count", "clear", "catalogue", "bar"],
	preview: { size: { w: 4, h: 1 }, props: { getShown: { value: 12 }, getNarrowed: { value: 1 } } },
	props: {
		getView: { label: "Shown view", hint: "Bind a view box's selection." },
		getHiddenInView: {
			label: "Hidden in view",
			hint: "While this view is shown the bar draws nothing; empty shows it always.",
		},
		getIsOpen: {
			aka: ["open"],
			label: "Filters open",
			keep: "screen",
			hint: "Whether the filters are open.",
		},
		setIsOpen: {
			label: "Open or close the filters",
			source: { implementation: "@core/value-set", fields: { target: "getIsOpen" } },
		},
		getShown: { aka: ["getCounts"], label: "Widgets shown", hint: "How many widgets the filters leave." },
		getNarrowed: { label: "Filters on", hint: "How many filters are on." },
		clearFilters: { label: "Clear the filters", hint: "Turns every filter off." },
	},
});

export const layout = defineLayout({
	role: "control",
	size: { preferredWidth: "full", preferredHeight: "auto", stackBelowPx: 180 },
});

export default FilterBar;
