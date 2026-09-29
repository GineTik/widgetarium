import { Button } from "widgetarium/kit";

export function NameEntryActions({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
	return (
		<div className="ok-add-list-actions">
			<Button className="ok-cancel" size="s" onClick={onCancel}>
				Cancel
			</Button>
			<Button className="ok-confirm" size="s" variant="accent" onClick={onConfirm}>
				Add
			</Button>
		</div>
	);
}
