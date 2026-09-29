import { Field, Popover } from "widgetarium/kit";
import { useState, type FormEvent } from "react";
import { anchorOf } from "./anchors";
import { Glyph } from "./glyph";

export function AddProperty({ taken, onAdd }: { taken: string[]; onAdd: (name: string) => void }) {
	const [isOpen, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const anchor = anchorOf(draft);
	const isNameTaken = taken.some((name) => name.toLowerCase() === draft.trim().toLowerCase());

	const commit = () => {
		const name = draft.trim();
		setDraft("");
		setOpen(false);
		if (name !== "" && !isNameTaken) onAdd(name);
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setOpen}
			trigger={
				<button type="button" className="otd-add">
					<Glyph name="plus" />
					Add property
				</button>
			}
		>
			<div className="otd-pop-field" onKeyDown={(event) => event.key === "Enter" && commit()}>
				<Field
					block
					size="s"
					placeholder="Name it"
					value={draft}
					onInput={(event: FormEvent<HTMLInputElement>) => setDraft(event.currentTarget.value)}
				/>
			</div>
			<span className="otd-hint">
				<Glyph name={anchor.icon} />
				{isNameTaken
					? "This board already has a property with that name"
					: "Recognised — this will be {kind}".replace("{kind}", anchor.word)}
			</span>
		</Popover>
	);
}
