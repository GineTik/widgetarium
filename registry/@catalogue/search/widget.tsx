import { useEffect, useState } from "react";
import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Field, Icon } from "widgetarium/kit";

const CatalogueSearch = createWidget({
	inject: {
		getValue: IQuery.expects(z.string().default("")),
		setValue: ICommand.sends(z.string()),
		getPlaceholder: IQuery.expects(z.string().default("Search widgets")),
	},
	draw: ({ getValue: value, setValue, getPlaceholder: placeholder }) => {
		const [draft, setDraft] = useDraftOf(value);
		const canWrite = setValue.can().can;
		const write = (typed: string) => {
			setDraft(typed);
			if (canWrite) void setValue(typed);
		};
		return (
			<div>
				<Field
					block
					className="wg-catalogue-search"
					icon={<Icon name="search" />}
					placeholder={placeholder}
					value={draft}
					readOnly={!canWrite}
					onInput={(event) => write(event.currentTarget.value)}
				/>
			</div>
		);
	},
});

export const metadata = defineMetadata(CatalogueSearch, {
	title: "Catalogue search",
	description: "The catalogue's search field: what you type narrows the list under it.",
	keywords: ["search", "catalogue", "find", "filter", "query", "field"],
	preview: { size: { w: 4, h: 1 } },
	props: {
		getValue: {
			aka: ["value"],
			label: "Query",
			keep: "screen",
			hint: "What is typed in the field.",
		},
		setValue: {
			label: "Type the query",
			source: { implementation: "@core/value-set", fields: { target: "getValue" } },
		},
		getPlaceholder: { aka: ["placeholder"], label: "Placeholder", hint: "Shown while nothing is typed." },
	},
});

export const layout = defineLayout({
	role: "control",
	size: { preferredWidth: "full", preferredHeight: "auto", stackBelowPx: 240 },
});

export default CatalogueSearch;

// TRADE-OFF: a draft beside the gateway, so an async write never moves the caret mid-word
function useDraftOf(held: string) {
	const [draft, setDraft] = useState(held);
	useEffect(() => setDraft(held), [held]);
	return [draft, setDraft] as const;
}
