import type { Row } from "widgetarium";
import { cn } from "widgetarium/kit";
import type { Drawn, Project } from "./types";

type CellProps = { Drawn: Drawn; project: Row<Project>; isPicked: boolean; onPick: (ref: string) => void };

const PRESS_KEYS = ["Enter", " "];

export function Cell({ Drawn, project, isPicked: isOn, onPick }: CellProps) {
	const press = () => onPick(project.ref);
	return (
		<div
			className={cn("flow-project-grid-cell", isOn && "is-picked")}
			role="button"
			tabIndex={0}
			aria-pressed={isOn}
			onClick={press}
			onKeyDown={(event) => {
				if (!PRESS_KEYS.includes(event.key)) return;
				event.preventDefault();
				press();
			}}
		>
			<Drawn getProject={project} />
		</div>
	);
}
