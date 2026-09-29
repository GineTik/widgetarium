import { useEffect, useState } from "react";
import { IValueGateway, canDo, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Field, Icon } from "widgetarium/kit";

const SearchInput = createWidget({
	inject: {
		value: IValueGateway.of(z.string().default("")).pick("get", "update"),
		placeholder: IValueGateway.of(z.string().default("Search")).pick("get"),
	},
	draw: ({ value, placeholder }) => {
		const [draft, setDraft] = useDraftOf(value.value);
		const canWrite = canDo(value.update);

		const write = (typed: string) => {
			setDraft(typed);
			if (canWrite) value.update(typed);
		};

		return (
			<div className="wg-search-input">
				<Field
					block
					icon={<Icon name="search" />}
					placeholder={placeholder}
					value={draft}
					readOnly={!canWrite}
					onInput={(event: { target: HTMLInputElement }) => write(event.target.value)}
				/>
			</div>
		);
	},
});

export const metadata = defineMetadata(SearchInput, {
	title: "Search input",
	description: "A search field whose text is a value other widgets can read.",
	keywords: ["search", "input", "query", "filter", "find", "field", "text"],
	preview: { size: { w: 6, h: 1 }, props: { placeholder: { value: "Search widgets" } } },
	props: {
		value: { label: "Query", hint: "What is typed. Bind another widget to it and it filters as you type." },
		placeholder: { hint: "Shown while nothing is typed." },
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
