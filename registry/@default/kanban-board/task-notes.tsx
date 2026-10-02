import type { RecordRef } from "widgetarium";
import { Description } from "./description";
import type { TaskDialogProps, TaskRow } from "./types";

type TaskNotesProps = {
	task: TaskRow | null;
	getTasks: TaskDialogProps["getTasks"];
	updateTask: TaskDialogProps["updateTask"];
	host: TaskDialogProps["host"];
	canEdit: boolean;
};

export function TaskNotes({ task, getTasks, updateTask, host, canEdit }: TaskNotesProps) {
	if (!task || !getTasks.get.can().can) return null;
	const render = host?.ui?.renderMarkdown;
	const writeBody = async (ref: RecordRef, patch: { body: string }) => {
		const answer = await updateTask({ ref, ...patch });
		return answer.ok ? getTasks.get(ref) : null;
	};
	return (
		<Description
			key={task.ref}
			path={task.ref}
			read={(given: { path: string }) => getTasks.get(given.path as RecordRef)}
			write={(given: { path: string }, patch: { body: string }) => writeBody(given.path as RecordRef, patch)}
			render={render}
			canPreview={Boolean(host?.can?.renderMarkdown && render)}
			canEdit={canEdit}
		/>
	);
}
