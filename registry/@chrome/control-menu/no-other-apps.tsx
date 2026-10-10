import { Button, EmptyState } from "widgetarium/kit";

export function NoOtherApps({ onCreate }: { readonly onCreate: () => void }) {
	return (
		<EmptyState
			title="No other apps yet"
			text="Every app you build appears here."
			isCompact
			action={<Button onClick={onCreate}>New app</Button>}
		/>
	);
}
