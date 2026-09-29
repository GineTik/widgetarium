import { IconButton } from "widgetarium/kit";
import { Glyph } from "./glyph";
import type { TaskDialogProps } from "./types";

type DialogTopProps = {
	onBoard: unknown;
	taskRef: string;
	navigator?: TaskDialogProps["navigator"];
	onClose: () => void;
};

export function DialogTop({ onBoard, taskRef, navigator, onClose }: DialogTopProps) {
	return (
		<div className="otd-top">
			<span className="otd-where">
				<Glyph name="task" />
				Card
				{onBoard ? ` · ${onBoard}` : ""}
			</span>
			<div className="otd-corner">
				<IconButton
					size="s"
					label="Open the note"
					title="Open the note"
					onClick={() => navigator?.navigate?.(`/${taskRef}`)}
				>
					<Glyph name="expand" />
				</IconButton>
				<IconButton size="s" label="Close" title="Close" onClick={onClose}>
					<Glyph name="close" />
				</IconButton>
			</div>
		</div>
	);
}
