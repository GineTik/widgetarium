import { blurOnEnterRestoreOnEscape } from "./blur-on-enter";
import { keyFor } from "./task-fields";
import type { TaskRow } from "./types";

type TaskTitleProps = {
	task: TaskRow | null;
	props: Record<string, unknown>;
	canUpdate: boolean;
	onWrite: (key: string, value: unknown) => void;
};

export function TaskTitle({ task, props, canUpdate, onWrite }: TaskTitleProps) {
	const shown = String(props.title ?? task?.name ?? "");

	const rename = (title: string | null) => {
		const wanted = String(title ?? "").trim();
		if (!task || wanted === "" || wanted === (props.title ?? task.name)) return;
		onWrite(keyFor(props, "title"), wanted);
	};

	return (
		<h2
			className="otd-title"
			contentEditable={canUpdate ? "true" : undefined}
			suppressContentEditableWarning
			onKeyDown={blurOnEnterRestoreOnEscape(shown)}
			onBlur={(event) => rename(event.currentTarget.textContent)}
		>
			{shown}
		</h2>
	);
}
