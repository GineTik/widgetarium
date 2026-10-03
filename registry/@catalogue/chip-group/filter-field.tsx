import { useEffect, useState } from "react";
import type { CommandAnswer } from "widgetarium";
import { Field, Icon } from "widgetarium/kit";

interface FilterFieldProps {
	readonly placeholder: string;
	readonly held: string;
	readonly write: (typed: string) => Promise<CommandAnswer>;
}

export function FilterField({ placeholder, held, write }: FilterFieldProps) {
	const [draft, setDraft] = useDraftOf(held);
	return (
		<Field
			block
			size="s"
			icon={<Icon name="search" size={14} />}
			placeholder={placeholder}
			value={draft}
			onInput={(event) => {
				setDraft(event.currentTarget.value);
				void write(event.currentTarget.value);
			}}
		/>
	);
}

// TRADE-OFF: a draft beside the gateway, so an async write never moves the caret mid-word
function useDraftOf(held: string) {
	const [draft, setDraft] = useState(held);
	useEffect(() => setDraft(held), [held]);
	return [draft, setDraft] as const;
}
