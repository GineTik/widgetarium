import type { KeyboardEvent } from "react";
import { textOf } from "./text-of";
import type { Drawn, FileFace, FileRow } from "./types";

type PickedRowProps = { row: FileRow; Drawn: Drawn; isPicked: boolean; onPick: (() => void) | null };

export function PickedRow({ row, Drawn, isPicked, onPick }: PickedRowProps) {
	const marks = ["ffl-pick", onPick ? "is-pressable" : "", isPicked ? "is-picked" : ""].filter(Boolean).join(" ");
	return (
		<div className={marks} {...pressablePropsOf(isPicked, onPick)}>
			<Drawn getFile={faceOf(row)} />
		</div>
	);
}

function faceOf(row: FileRow): FileFace {
	return {
		filePath: textOf(row.path) ?? textOf(row.name),
		added: (row.added as number | string | null | undefined) ?? null,
		removed: (row.removed as number | string | null | undefined) ?? null,
		change: textOf(row.change),
		from: textOf(row.from),
	};
}

function pressKeys(act: () => void) {
	return (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		act();
	};
}

function pressablePropsOf(isPicked: boolean, onPick: (() => void) | null) {
	if (!onPick) return {};
	return { role: "button", tabIndex: 0, "aria-pressed": isPicked, onClick: onPick, onKeyDown: pressKeys(onPick) };
}
