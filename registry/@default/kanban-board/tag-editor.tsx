import { Button, Field } from "widgetarium/kit";
import type { FormEvent } from "react";
import { TonePicker } from "./tone-picker";

type TagEditorProps = {
	name: string;
	picked: string;
	onName: (name: string) => void;
	onPick: (tone: string) => void;
	onCancel: () => void;
	onSave: () => void;
};

export function TagEditor({ name, picked, onName, onPick, onCancel, onSave }: TagEditorProps) {
	return (
		<>
			<div className="otd-pop-field" onKeyDown={(event) => event.key === "Enter" && onSave()}>
				<Field
					block
					size="s"
					placeholder="Name it"
					value={name}
					onInput={(event: FormEvent<HTMLInputElement>) => onName(event.currentTarget.value)}
				/>
			</div>
			<TonePicker picked={picked} onPick={onPick} />
			<div className="otd-pop-actions">
				<Button size="s" variant="neutral" onClick={onCancel}>
					Cancel
				</Button>
				<Button size="s" variant="accent" block onClick={onSave}>
					Save
				</Button>
			</div>
		</>
	);
}
