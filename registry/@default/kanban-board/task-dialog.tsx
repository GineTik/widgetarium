import { Dialog, DialogContent } from "widgetarium";
import { useMemo } from "react";
import { DialogTop } from "./dialog-top";
import { PropertiesPane } from "./properties-pane";
import { TagRow } from "./tag-row";
import { keyFor, toTrimmedList } from "./task-fields";
import { TaskNotes } from "./task-notes";
import { TaskTitle } from "./task-title";
import type { TaskDialogProps, TaskProps, TaskRow, Tones } from "./types";

const STARTING_PROPERTIES = ["Status", "Priority", "Approval", "Progress", "Assignees", "Deadline"];

export function TaskDialog({
	getTasks,
	updateTask,
	rows,
	columns,
	properties,
	onBoard,
	onClose,
	openedRef,
	today,
	onAddProperty,
	host,
	navigator,
}: TaskDialogProps) {
	const canUpdate = updateTask.can().can;
	// TRADE-OFF: found in the list the board already holds — tasks.get would read the note again on every vault event
	const task = rows.find((row) => row.ref === openedRef) ?? null;
	const isOpen = Boolean(openedRef) && Boolean(task);
	const names = propertyNames(properties);
	const props: TaskProps = task?.props ?? {};
	const people = useMemo(() => [...valuesAcross(rows, "members"), ...valuesAcross(rows, "assignees")], [rows]);
	const tagRoster = useMemo(() => valuesAcross(rows, "tags"), [rows]);

	const setProperties = (patch: TaskProps) => {
		if (!canUpdate || !task) return;
		void updateTask({ ref: task.ref, props: patch });
	};

	const setProperty = (key: string, value: unknown) => setProperties({ [key]: value });

	return (
		<Dialog isOpen={isOpen} onOpenChange={(next: boolean) => !next && onClose()}>
			<DialogContent className="orbi orbi-task-dialog">
				<DialogTop onBoard={onBoard} taskRef={task?.ref ?? ""} navigator={navigator} onClose={onClose} />

				<div className="otd-body">
					<div className="otd-left">
						<TaskTitle task={task} props={props} canUpdate={canUpdate} onWrite={setProperty} />

						<TagRow
							tags={toTrimmedList(props[keyFor(props, "tags")])}
							tones={toToneMap(props[keyFor(props, "tagTones")])}
							roster={tagRoster}
							onWrite={(next, tones) =>
								setProperties({ [keyFor(props, "tags")]: next, [keyFor(props, "tagTones")]: tones })
							}
						/>

						<TaskNotes task={task} getTasks={getTasks} updateTask={updateTask} host={host} canEdit={canUpdate} />
					</div>

					<aside className="otd-right">
						<PropertiesPane
							names={names}
							props={props}
							columns={columns}
							roster={people}
							today={today}
							onWrite={setProperty}
							onAddProperty={onAddProperty}
						/>
					</aside>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function toToneMap(value: unknown): Tones {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Tones) : {};
}

function valuesAcross(rows: TaskRow[], name: string): string[] {
	const seen = new Set<string>();
	for (const row of rows) {
		for (const entry of toTrimmedList(row.props?.[keyFor(row.props, name)])) seen.add(entry);
	}
	return [...seen];
}

function propertyNames(properties: TaskDialogProps["properties"]): string[] {
	if (properties?.length) return properties;
	return STARTING_PROPERTIES;
}
