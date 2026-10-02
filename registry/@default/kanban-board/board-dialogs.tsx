import { propertiesOf } from "./properties-of";
import { ArchiveAsk } from "./archive-ask";
import { RepairIdsAsk } from "./repair-ids-ask";
import { TaskDialog } from "./task-dialog";
import type { KanbanProps } from "./types";
import type { useBoardColumns } from "./use-board-columns";
import type { useBoardReads } from "./use-board-reads";
import type { useIdRepair } from "./use-id-repair";

type BoardDialogsProps = {
	archiving: string | null;
	onArchivingChange: (name: string | null) => void;
	heldByArchiving: number;
	reading: ReturnType<typeof useBoardReads>;
	lists: ReturnType<typeof useBoardColumns>;
	repairing: ReturnType<typeof useIdRepair>;
	updateBoard: KanbanProps["updateBoard"];
	getTasks: KanbanProps["getTasks"];
	updateTask: KanbanProps["updateTask"];
	onClose: () => void;
	host: KanbanProps["host"];
	navigator: KanbanProps["navigator"];
};

export function BoardDialogs({
	archiving,
	onArchivingChange,
	heldByArchiving,
	reading,
	lists,
	repairing,
	updateBoard,
	getTasks,
	updateTask,
	onClose,
	host,
	navigator,
}: BoardDialogsProps) {
	return (
		<>
			<ArchiveAsk
				archiving={archiving}
				heldByArchiving={heldByArchiving}
				groupBy={reading.groupBy}
				onDismiss={() => onArchivingChange(null)}
				onConfirm={() => {
					lists.archive(archiving ?? "");
					onArchivingChange(null);
				}}
			/>

			<RepairIdsAsk repairing={repairing} />

			<TaskDialog
				getTasks={getTasks}
				updateTask={updateTask}
				rows={reading.rows}
				columns={lists.shownColumns}
				properties={propertiesOf(reading.record)}
				onBoard={reading.onBoard}
				onClose={onClose}
				openedRef={reading.openedRef}
				today={reading.today}
				onAddProperty={lists.canEdit ? (names: string[]) => void updateBoard({ properties: names }) : undefined}
				host={host}
				navigator={navigator}
			/>
		</>
	);
}
