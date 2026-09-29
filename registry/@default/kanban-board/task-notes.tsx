import type { RecordRef } from "widgetarium";
import { Description } from "./description";
import type { TaskDialogProps, TaskRow } from "./types";

type TaskNotesProps = {
	task: TaskRow | null;
	tasks: TaskDialogProps["tasks"];
	host: TaskDialogProps["host"];
	canEdit: boolean;
};

export function TaskNotes({ task, tasks, host, canEdit }: TaskNotesProps) {
	if (!task || !tasks.get.can().can) return null;
	const render = host?.ui?.renderMarkdown;
	return (
		<Description
			key={task.ref}
			path={task.ref}
			read={(given: { path: string }) => tasks.get(given.path as RecordRef).then((row) => row ?? null)}
			write={(given: { path: string }, patch: { body: string }) =>
				tasks.update({ ref: given.path as RecordRef, data: patch }).then((row) => row ?? null)
			}
			render={render}
			canPreview={Boolean(host?.can?.renderMarkdown && render)}
			canEdit={canEdit}
		/>
	);
}
