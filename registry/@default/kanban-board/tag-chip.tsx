import { Pill, Popover } from "widgetarium/kit";
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { TagEditor } from "./tag-editor";

type TagChipProps = {
	tag: string;
	tone: string;
	held: boolean;
	onGrab: (event: ReactPointerEvent<HTMLButtonElement>) => void;
	onSave: (name: string, tone: string) => void;
};

export function TagChip({ tag, tone, held, onGrab, onSave }: TagChipProps) {
	const [isOpen, setOpen] = useState(false);
	const [name, setName] = useState(tag);
	const [picked, setPicked] = useState(tone);

	const show = (next: boolean) => {
		setOpen(next);
		if (!next) return;
		setName(tag);
		setPicked(tone);
	};

	const save = () => {
		setOpen(false);
		onSave(String(name).trim(), picked);
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={show}
			trigger={
				<Pill tone={tone} asChild>
					<button
						type="button"
						className={`otd-tag${held ? " is-held" : ""}`}
						title={`Edit ${tag}`}
						onPointerDown={onGrab}
					>
						{`#${tag}`}
					</button>
				</Pill>
			}
		>
			<TagEditor
				name={name}
				picked={picked}
				onName={setName}
				onPick={setPicked}
				onCancel={() => setOpen(false)}
				onSave={save}
			/>
		</Popover>
	);
}
