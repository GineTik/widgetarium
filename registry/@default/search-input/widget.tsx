import { useEffect, useState } from "react";
import { canDo, createWidget, defineManifest, defineProp, useData } from "widgetarium";
import { Field, Icon } from "widgetarium/kit";

export const manifest = defineManifest({
	title: "Search input",
	description: "A search field whose text is a value other widgets can read.",
	keywords: ["search", "input", "query", "filter", "find", "field", "text"],
	role: "control",
	size: { preferredWidth: 480, preferredHeight: "auto", at: [{ belowPx: 560, preferredWidth: "full" }] },
	preview: { size: { w: 6, h: 1 }, props: { placeholder: { value: "Search widgets" } } },
	props: {
		value: defineProp<string>()({
			label: "Query",
			hint: "What is typed. Bind another widget to it and it filters as you type.",
			default: "",
			writes: ["update"],
		}),
		placeholder: defineProp<string>()({
			label: "Placeholder",
			hint: "Shown while nothing is typed.",
			default: "Search",
		}),
	},
});

export default createWidget(manifest, ({ value, placeholder }) => {
	const placeholderText = String(useData(placeholder.get).data ?? "");
	const [draft, setDraft] = useDraftOf(String(useData(value.get).data ?? ""));
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
				placeholder={placeholderText}
				value={draft}
				readOnly={!canWrite}
				onInput={(event: { target: HTMLInputElement }) => write(event.target.value)}
			/>
		</div>
	);
});

// TRADE-OFF: a draft beside the gateway, so an async write never moves the caret mid-word
function useDraftOf(held: string) {
	const [draft, setDraft] = useState(held);
	useEffect(() => setDraft(held), [held]);
	return [draft, setDraft] as const;
}
