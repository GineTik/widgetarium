import { useEffect, useState } from "react";
import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Field, Icon } from "widgetarium/kit";

const SearchInput = createWidget({
	inject: {
		getValue: IQuery.expects(z.string().default("")),
		setValue: ICommand.sends(z.string()),
		getPlaceholder: IQuery.expects(z.string().default("Search")),
	},
	draw: ({ getValue: value, setValue, getPlaceholder: placeholder }) => {
		const [draft, setDraft] = useDraftOf(value);
		const canWrite = setValue.can().can;

		const write = (typed: string) => {
			setDraft(typed);
			if (canWrite) void setValue(typed);
		};

		return (
			<div className="wg-search-input">
				<Field
					block
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

export const metadata = defineMetadata(SearchInput, {
	title: "Search input",
	description: "A search field whose text is a value other widgets can read.",
	keywords: ["search", "input", "query", "filter", "find", "field", "text"],
	preview: { size: { w: 6, h: 1 }, props: { getPlaceholder: { value: "Search widgets" } } },
	props: {
		getValue: {
			aka: ["value"],
			label: "Query",
			hint: "What is typed. Bind another widget to it and it filters as you type.",
		},
		setValue: {
			label: "Type the query",
			source: { implementation: "@core/value-set", fields: { target: "getValue" } },
		},
		getPlaceholder: { aka: ["placeholder"], hint: "Shown while nothing is typed." },
	},
});

export const layout = defineLayout({
	role: "control",
	size: { preferredWidth: 480, preferredHeight: "auto", at: [{ belowPx: 560, preferredWidth: "full" }] },
});

export default SearchInput;

// TRADE-OFF: a draft beside the gateway, so an async write never moves the caret mid-word
function useDraftOf(held: string) {
	const [draft, setDraft] = useState(held);
	useEffect(() => setDraft(held), [held]);
	return [draft, setDraft] as const;
}
