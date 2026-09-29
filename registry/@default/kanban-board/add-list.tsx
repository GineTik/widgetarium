import { Icon, Card } from "widgetarium/kit";
import { NameEntryActions } from "./name-entry-actions";
import { useNameEntry } from "./use-name-entry";

export function AddList({ onAdd }: { onAdd: (name: string) => void }) {
	const entry = useNameEntry(onAdd);
	return entry.isOpen ? (
		<Card type="group" className="ok-add-list">
			<input className="ok-list-name" placeholder="Enter list name..." {...entry.fieldProps} />
			<NameEntryActions onCancel={entry.close} onConfirm={entry.confirm} />
		</Card>
	) : (
		<Card type="group" asChild>
			<button type="button" className="ok-add-list-rest" onClick={entry.open}>
				<Icon name="plus" size={16} />
				<span>Add List</span>
			</button>
		</Card>
	);
}
