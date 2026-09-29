import { Popover } from "widgetarium/kit";
import { useRef, useState } from "react";
import { Glyph } from "./glyph";
import { RosterPicker } from "./roster-picker";
import { TagChip } from "./tag-chip";
import type { TagRowProps, Tones } from "./types";
import { useTagReorder } from "./use-tag-reorder";

export function TagRow({ tags, tones, roster, onWrite }: TagRowProps) {
	const [isOpen, setOpen] = useState(false);
	const listRef = useRef<HTMLDivElement | null>(null);
	const { dragged, grab } = useTagReorder(tags, tones, onWrite, listRef);
	const shown = dragged?.list ?? tags;

	const toggle = (tag: string) => {
		if (!tags.includes(tag)) return onWrite([...tags, tag], tones);
		onWrite(
			tags.filter((entry) => entry !== tag),
			withoutTone(tones, tag),
		);
	};

	const save = (was: string, name: string, tone: string) => {
		const wanted = name === "" ? was : name;
		const next = [...new Set(tags.map((entry) => (entry === was ? wanted : entry)))];
		const kept = withoutTone(tones, was);
		onWrite(next, tone === "neutral" ? kept : { ...kept, [wanted]: tone });
	};

	return (
		<div className="otd-tags" ref={listRef}>
			{shown.map((tag, at) => (
				<TagChip
					key={tag}
					tag={tag}
					tone={tones[tag] ?? "neutral"}
					held={dragged?.isDragging === true && dragged.at === at}
					onGrab={grab(at)}
					onSave={(name, tone) => save(tag, name, tone)}
				/>
			))}
			<Popover
				isOpen={isOpen}
				onOpenChange={setOpen}
				trigger={
					<button type="button" className="otd-tag-add">
						<Glyph name="plus" />
						Tag
					</button>
				}
			>
				<RosterPicker
					placeholder="Find a tag"
					roster={roster}
					isChosen={(tag) => tags.includes(tag)}
					onPick={toggle}
					label={(tag) => `#${tag}`}
					addLabel={(typed) => `#${typed}`}
				/>
			</Popover>
		</div>
	);
}

function withoutTone(tones: Tones, tag: string): Tones {
	const kept = { ...tones };
	delete kept[tag];
	return kept;
}
