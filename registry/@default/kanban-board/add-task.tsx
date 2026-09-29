import { Icon } from "widgetarium/kit";
import { NameEntryActions } from "./name-entry-actions";
import { useNameEntry } from "./use-name-entry";

// TRADE-OFF: the same shape as AddList, not the same component — a task is named inside its column
export function AddTask({ onAdd }: { onAdd: (title: string) => void }) {
	const entry = useNameEntry(onAdd);
	return entry.isOpen ? (
		<div className="ok-add-task-open">
			<input className="ok-task-name" placeholder="Enter task name..." {...entry.fieldProps} />
			<NameEntryActions onCancel={entry.close} onConfirm={entry.confirm} />
		</div>
	) : (
		<button type="button" className="ok-add-task" onClick={entry.open}>
			<Icon name="plus" size={16} />
			<span>Add new task</span>
		</button>
	);
}
